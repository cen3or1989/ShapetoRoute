import type { Point } from '../types';

export interface ShapeFeatures {
  // Basic properties
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  centroid: Point;
  aspectRatio: number;
  
  // Geometric features
  totalLength: number;
  corners: Point[];
  curvaturePoints: Array<{ point: Point; curvature: number }>;
  
  // Shape characteristics
  isClosed: boolean;
  complexity: number; // 0-1 scale
  symmetry: { horizontal: number; vertical: number };
  
  // Normalized representation
  normalizedPath: Point[];
  shapeSignature: string;
  detectedType: 'circle' | 'rectangle' | 'triangle' | 'line' | 'curve' | 'complex';
  confidence: number;
}

export interface ShapeValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Calculates the distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculates the angle between three points (in radians)
 */
function angle(p1: Point, p2: Point, p3: Point): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

/**
 * Calculates curvature at a point using three consecutive points
 */
function calculateCurvature(p1: Point, p2: Point, p3: Point): number {
  const a = distance(p1, p2);
  const b = distance(p2, p3);
  const c = distance(p1, p3);
  
  if (a === 0 || b === 0 || c === 0) return 0;
  
  // Use Menger curvature formula
  const area = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  return (4 * area) / (a * b * c);
}

/**
 * Detects corners in the path based on angle changes
 */
function detectCorners(path: Point[], angleThreshold: number = Math.PI / 4): Point[] {
  if (path.length < 3) return [];
  
  const corners: Point[] = [];
  
  for (let i = 1; i < path.length - 1; i++) {
    const currentAngle = angle(path[i - 1], path[i], path[i + 1]);
    if (currentAngle < Math.PI - angleThreshold) {
      corners.push(path[i]);
    }
  }
  
  return corners;
}

/**
 * Calculates the centroid of a set of points
 */
function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const sum = points.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y
  }), { x: 0, y: 0 });
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

/**
 * Normalizes a path to 0-1 coordinate space
 */
function normalizePath(path: Point[]): Point[] {
  if (path.length === 0) return [];
  
  const minX = Math.min(...path.map(p => p.x));
  const maxX = Math.max(...path.map(p => p.x));
  const minY = Math.min(...path.map(p => p.y));
  const maxY = Math.max(...path.map(p => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Avoid division by zero
  if (width === 0 || height === 0) return path;
  
  return path.map(point => ({
    x: (point.x - minX) / width,
    y: (point.y - minY) / height
  }));
}

/**
 * Calculates shape complexity based on curvature variation and corner count
 */
function calculateComplexity(path: Point[], corners: Point[]): number {
  if (path.length < 3) return 0;
  
  // Factor 1: Number of corners relative to path length
  const cornerComplexity = Math.min(corners.length / (path.length * 0.1), 1);
  
  // Factor 2: Curvature variation
  let totalCurvature = 0;
  let curvatureVariation = 0;
  const curvatures: number[] = [];
  
  for (let i = 1; i < path.length - 1; i++) {
    const curvature = calculateCurvature(path[i - 1], path[i], path[i + 1]);
    curvatures.push(curvature);
    totalCurvature += curvature;
  }
  
  if (curvatures.length > 1) {
    const avgCurvature = totalCurvature / curvatures.length;
    curvatureVariation = curvatures.reduce((sum, c) => sum + Math.abs(c - avgCurvature), 0) / curvatures.length;
  }
  
  // Combine factors
  return Math.min((cornerComplexity + curvatureVariation) / 2, 1);
}

/**
 * Detects basic shape types
 */
function detectShapeType(normalizedPath: Point[], corners: Point[], isClosed: boolean): {
  type: 'circle' | 'rectangle' | 'triangle' | 'line' | 'curve' | 'complex';
  confidence: number;
} {
  if (normalizedPath.length < 3) {
    return { type: 'line', confidence: 0.9 };
  }
  
  // Check for circle (low corner count, high curvature, closed)
  if (isClosed && corners.length <= 2) {
    const avgDistanceFromCenter = normalizedPath.reduce((sum, point) => {
      const center = calculateCentroid(normalizedPath);
      return sum + distance(point, center);
    }, 0) / normalizedPath.length;
    
    const variance = normalizedPath.reduce((sum, point) => {
      const center = calculateCentroid(normalizedPath);
      const dist = distance(point, center);
      return sum + Math.pow(dist - avgDistanceFromCenter, 2);
    }, 0) / normalizedPath.length;
    
    if (variance < 0.01) { // Low variance = circle-like
      return { type: 'circle', confidence: 0.8 };
    }
  }
  
  // Check for rectangle (4 corners, closed, right angles)
  if (isClosed && corners.length === 4) {
    return { type: 'rectangle', confidence: 0.7 };
  }
  
  // Check for triangle (3 corners, closed)
  if (isClosed && corners.length === 3) {
    return { type: 'triangle', confidence: 0.7 };
  }
  
  // Check for simple curve (few corners, not closed)
  if (!isClosed && corners.length <= 2) {
    return { type: 'curve', confidence: 0.6 };
  }
  
  // Default to complex
  return { type: 'complex', confidence: 0.5 };
}

/**
 * Checks if a path forms a closed shape
 */
function isClosedPath(path: Point[], tolerance: number = 10): boolean {
  if (path.length < 3) return false;
  
  const start = path[0];
  const end = path[path.length - 1];
  
  return distance(start, end) <= tolerance;
}

/**
 * Calculates symmetry scores for horizontal and vertical axes
 */
function calculateSymmetry(normalizedPath: Point[]): { horizontal: number; vertical: number } {
  if (normalizedPath.length < 4) return { horizontal: 0, vertical: 0 };
  
  const centroid = calculateCentroid(normalizedPath);
  
  // Check horizontal symmetry (reflection across horizontal line through centroid)
  let horizontalMatches = 0;
  let verticalMatches = 0;
  
  for (const point of normalizedPath) {
    // Find closest point to horizontal reflection
    const reflectedY = 2 * centroid.y - point.y;
    const horizontalDistance = Math.min(...normalizedPath.map(p => 
      Math.abs(p.x - point.x) + Math.abs(p.y - reflectedY)
    ));
    
    if (horizontalDistance < 0.05) horizontalMatches++;
    
    // Find closest point to vertical reflection
    const reflectedX = 2 * centroid.x - point.x;
    const verticalDistance = Math.min(...normalizedPath.map(p => 
      Math.abs(p.x - reflectedX) + Math.abs(p.y - point.y)
    ));
    
    if (verticalDistance < 0.05) verticalMatches++;
  }
  
  return {
    horizontal: horizontalMatches / normalizedPath.length,
    vertical: verticalMatches / normalizedPath.length
  };
}

/**
 * Generates a geometric signature for the shape
 */
function generateShapeSignature(features: ShapeFeatures): string {
  const sig = [
    features.detectedType,
    features.aspectRatio.toFixed(2),
    features.corners.length.toString(),
    features.isClosed ? 'closed' : 'open',
    features.complexity.toFixed(2)
  ].join('-');
  
  return sig;
}

/**
 * Main function to analyze a drawing and extract geometric features
 */
export function analyzeShape(drawing: Point[][]): ShapeFeatures {
  // Flatten all strokes into a single path
  const allPoints = drawing.flat();
  
  if (allPoints.length < 2) {
    throw new Error('Drawing must contain at least 2 points');
  }
  
  // Calculate bounding box
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const boundingBox = { minX, maxX, minY, maxY };
  const centroid = calculateCentroid(allPoints);
  const aspectRatio = (maxX - minX) / (maxY - minY);
  
  // Normalize the path
  const normalizedPath = normalizePath(allPoints);
  
  // Detect geometric features
  const corners = detectCorners(allPoints);
  const isClosed = isClosedPath(allPoints);
  const complexity = calculateComplexity(allPoints, corners);
  const symmetry = calculateSymmetry(normalizedPath);
  
  // Calculate total length
  let totalLength = 0;
  for (let i = 1; i < allPoints.length; i++) {
    totalLength += distance(allPoints[i - 1], allPoints[i]);
  }
  
  // Calculate curvature points
  const curvaturePoints: Array<{ point: Point; curvature: number }> = [];
  for (let i = 1; i < allPoints.length - 1; i++) {
    const curvature = calculateCurvature(allPoints[i - 1], allPoints[i], allPoints[i + 1]);
    curvaturePoints.push({ point: allPoints[i], curvature });
  }
  
  // Detect shape type
  const shapeDetection = detectShapeType(normalizedPath, corners, isClosed);
  
  const features: ShapeFeatures = {
    boundingBox,
    centroid,
    aspectRatio,
    totalLength,
    corners,
    curvaturePoints,
    isClosed,
    complexity,
    symmetry,
    normalizedPath,
    shapeSignature: '', // Will be set below
    detectedType: shapeDetection.type,
    confidence: shapeDetection.confidence
  };
  
  features.shapeSignature = generateShapeSignature(features);
  
  return features;
}

/**
 * Validates if a drawing forms a meaningful shape
 */
export function validateShape(drawing: Point[][]): ShapeValidationResult {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if drawing exists
  if (drawing.length === 0) {
    issues.push('No drawing provided');
    recommendations.push('Draw a shape on the canvas');
    return { isValid: false, issues, recommendations };
  }
  
  const allPoints = drawing.flat();
  
  // Check minimum points
  if (allPoints.length < 3) {
    issues.push('Drawing has too few points');
    recommendations.push('Draw a more complete shape with at least 3 points');
  }
  
  // Check for degenerate cases
  const uniquePoints = allPoints.filter((point, index, arr) => 
    index === 0 || distance(point, arr[index - 1]) > 1
  );
  
  if (uniquePoints.length < 3) {
    issues.push('Drawing points are too close together');
    recommendations.push('Draw with more varied movements to create a distinct shape');
  }
  
  // Check bounding box size
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  if (width < 20 || height < 20) {
    issues.push('Drawing is too small');
    recommendations.push('Draw a larger shape to improve recognition accuracy');
  }
  
  // Check for extremely thin shapes
  if (width / height > 10 || height / width > 10) {
    issues.push('Shape is too thin or elongated');
    recommendations.push('Try drawing a more balanced shape for better matching');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Creates a detailed geometric description for AI processing
 */
export function createGeometricDescription(features: ShapeFeatures): string {
  const characteristics: string[] = [];
  
  // Basic shape info
  characteristics.push(`Type: ${features.detectedType} (${(features.confidence * 100).toFixed(0)}% confidence)`);
  characteristics.push(`Structure: ${features.isClosed ? 'Closed loop' : 'Open path'}`);
  characteristics.push(`Aspect Ratio: ${features.aspectRatio.toFixed(2)} (${
    features.aspectRatio > 1.5 ? 'Wide' : 
    features.aspectRatio < 0.7 ? 'Tall' : 'Balanced'
  })`);
  
  // Complexity and features
  characteristics.push(`Complexity: ${(features.complexity * 100).toFixed(0)}% (${
    features.complexity > 0.7 ? 'Complex' : 
    features.complexity > 0.3 ? 'Moderate' : 'Simple'
  })`);
  characteristics.push(`Corners: ${features.corners.length}`);
  
  // Curvature analysis
  const avgCurvature = features.curvaturePoints.length > 0 
    ? features.curvaturePoints.reduce((sum, cp) => sum + cp.curvature, 0) / features.curvaturePoints.length 
    : 0;
  characteristics.push(`Curvature: ${avgCurvature > 0.1 ? 'Curved' : 'Angular'}`);
  
  // Symmetry
  if (features.symmetry.horizontal > 0.7) characteristics.push('Horizontally symmetric');
  if (features.symmetry.vertical > 0.7) characteristics.push('Vertically symmetric');
  
  return characteristics.join('\n- ');
}

/**
 * Generates enhanced shape data for AI processing
 */
export function serializeShapeForAI(features: ShapeFeatures): string {
  return `
GEOMETRIC ANALYSIS:
- ${createGeometricDescription(features)}

NORMALIZED COORDINATES (0-1 scale, preserving shape proportions):
${features.normalizedPath.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ')}

SHAPE SIGNATURE: ${features.shapeSignature}

KEY GEOMETRIC POINTS:
- Centroid: (${features.centroid.x.toFixed(0)}, ${features.centroid.y.toFixed(0)})
- Corners: ${features.corners.map(c => `(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(', ')}
`;
}

/**
 * Validates if a route path geometrically matches the original shape
 */
export function validateRouteMatch(routePath: [number, number][], originalFeatures: ShapeFeatures): {
  geometricSimilarity: number;
  issues: string[];
} {
  if (routePath.length < 2) {
    return { geometricSimilarity: 0, issues: ['Route path is too short'] };
  }
  
  // Convert route coordinates to normalized form for comparison
  const routePoints: Point[] = routePath.map(([lat, lng]) => ({ x: lng, y: lat }));
  const normalizedRoute = normalizePath(routePoints);
  
  // Analyze route features
  const routeCorners = detectCorners(routePoints);
  const routeIsClosed = isClosedPath(routePoints, 0.001); // Smaller tolerance for geographic coordinates
  
  const issues: string[] = [];
  let similarity = 1.0;
  
  // Compare basic structure
  if (originalFeatures.isClosed !== routeIsClosed) {
    issues.push(`Shape structure mismatch: original is ${originalFeatures.isClosed ? 'closed' : 'open'}, route is ${routeIsClosed ? 'closed' : 'open'}`);
    similarity *= 0.7;
  }
  
  // Compare corner counts (allow some tolerance)
  const cornerDiff = Math.abs(originalFeatures.corners.length - routeCorners.length);
  if (cornerDiff > 2) {
    issues.push(`Corner count mismatch: original has ${originalFeatures.corners.length}, route has ${routeCorners.length}`);
    similarity *= Math.max(0.5, 1 - cornerDiff * 0.1);
  }
  
  // Compare aspect ratios
  const routeMinX = Math.min(...routePoints.map(p => p.x));
  const routeMaxX = Math.max(...routePoints.map(p => p.x));
  const routeMinY = Math.min(...routePoints.map(p => p.y));
  const routeMaxY = Math.max(...routePoints.map(p => p.y));
  const routeAspectRatio = (routeMaxX - routeMinX) / (routeMaxY - routeMinY);
  
  const aspectRatioDiff = Math.abs(originalFeatures.aspectRatio - routeAspectRatio);
  if (aspectRatioDiff > 1.0) {
    issues.push(`Aspect ratio mismatch: original ${originalFeatures.aspectRatio.toFixed(2)}, route ${routeAspectRatio.toFixed(2)}`);
    similarity *= Math.max(0.6, 1 - aspectRatioDiff * 0.2);
  }
  
  return {
    geometricSimilarity: Math.max(0, similarity),
    issues
  };
}