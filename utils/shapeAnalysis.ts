import { Point } from '../types';

export interface ShapeFeatures {
  type: 'circle' | 'rectangle' | 'triangle' | 'line' | 'curve' | 'zigzag' | 'spiral' | 'complex';
  direction: 'horizontal' | 'vertical' | 'diagonal' | 'mixed';
  angles: number[];
  curvature: number;
  symmetry: number;
  complexity: number;
  aspectRatio: number;
  normalizedPath: Point[];
  description: string;
}

// Calculate angle between three points
function calculateAngle(p1: Point, p2: Point, p3: Point): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// Calculate distance between two points
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Normalize points to 0-1 range while preserving aspect ratio
export function normalizePoints(points: Point[]): { normalized: Point[], aspectRatio: number } {
  if (points.length === 0) return { normalized: [], aspectRatio: 1 };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);
  const aspectRatio = width / height;
  
  const normalized = points.map(p => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale
  }));
  
  return { normalized, aspectRatio };
}

// Simplify path using Douglas-Peucker algorithm
export function simplifyPath(points: Point[], tolerance: number = 5): Point[] {
  if (points.length <= 2) return points;

  function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return distance(point, lineStart);
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const closestPoint = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
    
    return distance(point, closestPoint);
  }

  function douglasPeucker(points: Point[], start: number, end: number): number[] {
    if (end - start <= 1) return [];
    
    let maxDistance = 0;
    let maxIndex = start;
    
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDistance) {
        maxDistance = d;
        maxIndex = i;
      }
    }
    
    if (maxDistance > tolerance) {
      const left = douglasPeucker(points, start, maxIndex);
      const right = douglasPeucker(points, maxIndex, end);
      return [...left, maxIndex, ...right];
    }
    
    return [];
  }

  const keepIndices = [0, ...douglasPeucker(points, 0, points.length - 1), points.length - 1];
  return keepIndices.sort((a, b) => a - b).map(i => points[i]);
}

// Detect shape type and features
export function analyzeShape(drawing: Point[][]): ShapeFeatures {
  // Flatten all strokes into one path
  const allPoints: Point[] = drawing.flat();
  
  if (allPoints.length < 3) {
    return {
      type: 'line',
      direction: 'horizontal',
      angles: [],
      curvature: 0,
      symmetry: 0,
      complexity: 0,
      aspectRatio: 1,
      normalizedPath: allPoints,
      description: 'A simple line'
    };
  }

  // Simplify the path
  const simplified = simplifyPath(allPoints, 10);
  const { normalized, aspectRatio } = normalizePoints(simplified);

  // Calculate angles at each point
  const angles: number[] = [];
  for (let i = 1; i < simplified.length - 1; i++) {
    angles.push(calculateAngle(simplified[i-1], simplified[i], simplified[i+1]));
  }

  // Calculate features
  const avgAngle = angles.length > 0 ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
  const angleVariance = angles.length > 0 
    ? Math.sqrt(angles.reduce((sum, angle) => sum + Math.pow(angle - avgAngle, 2), 0) / angles.length)
    : 0;

  // Determine shape type based on features
  let type: ShapeFeatures['type'] = 'complex';
  let description = '';

  // Check for closed shapes
  const startEndDistance = distance(simplified[0], simplified[simplified.length - 1]);
  const totalLength = simplified.slice(1).reduce((sum, p, i) => sum + distance(simplified[i], p), 0);
  const isClosed = startEndDistance < totalLength * 0.1;

  if (isClosed && angles.length >= 2) {
    // Closed shapes
    if (angles.length === 3 && angleVariance < 20) {
      type = 'triangle';
      description = 'A triangular path';
    } else if (angles.length === 4 && angleVariance < 20 && angles.every(a => Math.abs(a - 90) < 20)) {
      type = 'rectangle';
      description = 'A rectangular or square path';
    } else if (angleVariance < 30 && angles.length > 6) {
      type = 'circle';
      description = 'A circular or oval path';
    }
  } else {
    // Open shapes
    if (angleVariance < 10 && angles.length <= 1) {
      type = 'line';
      description = 'A straight or gently curved line';
    } else if (angleVariance > 60 && angles.filter(a => a > 120).length >= 2) {
      type = 'zigzag';
      description = 'A zigzag or sharp angular path';
    } else if (isSpiral(normalized)) {
      type = 'spiral';
      description = 'A spiral or coiled path';
    } else if (angleVariance < 40) {
      type = 'curve';
      description = 'A smooth curved path';
    }
  }

  // Determine primary direction
  const dx = Math.abs(simplified[simplified.length - 1].x - simplified[0].x);
  const dy = Math.abs(simplified[simplified.length - 1].y - simplified[0].y);
  let direction: ShapeFeatures['direction'] = 'mixed';
  
  if (dx > dy * 2) direction = 'horizontal';
  else if (dy > dx * 2) direction = 'vertical';
  else if (dx > 0 && dy > 0) direction = 'diagonal';

  // Calculate curvature (0-1, where 0 is straight, 1 is very curvy)
  const curvature = Math.min(angleVariance / 180, 1);

  // Calculate complexity (based on number of significant direction changes)
  const significantAngles = angles.filter(a => a > 30).length;
  const complexity = Math.min(significantAngles / 10, 1);

  return {
    type,
    direction,
    angles: angles.map(a => Math.round(a)),
    curvature,
    symmetry: calculateSymmetry(normalized),
    complexity,
    aspectRatio,
    normalizedPath: normalized,
    description
  };
}

// Check if shape is a spiral
function isSpiral(points: Point[]): boolean {
  if (points.length < 10) return false;
  
  const center = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length
  };
  
  const distances = points.map(p => distance(p, center));
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] > distances[i-1]) increasing++;
    else if (distances[i] < distances[i-1]) decreasing++;
  }
  
  // Spiral if distance consistently increases or decreases
  return (increasing > distances.length * 0.7) || (decreasing > distances.length * 0.7);
}

// Calculate symmetry score (0-1)
function calculateSymmetry(points: Point[]): number {
  if (points.length < 4) return 0;
  
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  
  let symmetryScore = 0;
  for (let i = 0; i < Math.floor(points.length / 2); i++) {
    const p1 = points[i];
    const p2 = points[points.length - 1 - i];
    
    const mirroredX = 2 * centerX - p1.x;
    const diff = Math.abs(mirroredX - p2.x) + Math.abs(p1.y - p2.y);
    symmetryScore += 1 - Math.min(diff, 1);
  }
  
  return symmetryScore / Math.floor(points.length / 2);
}

// Generate natural language description of the shape
export function generateShapeDescription(features: ShapeFeatures): string {
  const { type, direction, angles, curvature, complexity, aspectRatio } = features;
  
  let description = features.description + '. ';
  
  // Add directional info
  if (direction !== 'mixed') {
    description += `The path runs primarily ${direction}. `;
  }
  
  // Add shape characteristics
  if (type === 'zigzag') {
    const sharpTurns = angles.filter(a => a > 90).length;
    description += `It has ${sharpTurns} sharp turns`;
    if (sharpTurns > 0) {
      const avgSharpAngle = Math.round(angles.filter(a => a > 90).reduce((a, b) => a + b, 0) / sharpTurns);
      description += ` averaging ${avgSharpAngle}°`;
    }
    description += '. ';
  } else if (type === 'curve' && curvature > 0.3) {
    description += `It curves ${curvature > 0.6 ? 'sharply' : 'gently'}. `;
  }
  
  // Add aspect ratio info
  if (aspectRatio > 2) {
    description += 'The shape is elongated horizontally. ';
  } else if (aspectRatio < 0.5) {
    description += 'The shape is elongated vertically. ';
  }
  
  // Add complexity info
  if (complexity > 0.7) {
    description += 'It has a complex pattern with multiple direction changes.';
  } else if (complexity < 0.3 && type !== 'line') {
    description += 'It follows a simple, smooth pattern.';
  }
  
  return description;
}