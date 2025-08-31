import type { Point } from '../types';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ShapeFeatures {
  boundingBox: BoundingBox;
  centroid: Point;
  aspectRatio: number;
  totalLength: number;
  corners: Point[];
  isClosed: boolean;
  complexity: number; // 0-1 scale
  normalizedPath: string; // SVG-like path string
  sharpTurns: number;
  straightness: number; // 0-1
  averageRadius: number; // Can be Infinity
}

/**
 * Calculates the angle between three points.
 */
function getAngle(p1: Point, p2: Point, p3: Point): number {
  const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let degrees = angle * 180 / Math.PI;
  if (degrees < 0) degrees += 360;
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const getTriangleArea = (p1: Point, p2: Point, p3: Point) => 0.5 * Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));

/**
 * The main analysis function that processes a drawing.
 */
export function analyzeShape(drawing: Point[][]): ShapeFeatures | null {
  const allPoints = drawing.flat();
  if (allPoints.length < 3) return null;

  // 1. Bounding Box and Normalization
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;

  // Avoid division by zero for straight lines
  if (width < 1 || height < 1) return null;

  const boundingBox: BoundingBox = { minX, maxX, minY, maxY, width, height };

  const normalizedDrawing = drawing.map(stroke =>
    stroke.map(point => ({
      x: (point.x - minX) / width,
      y: (point.y - minY) / height,
    }))
  );
  
  const normalizedPoints = normalizedDrawing.flat();

  // 2. Centroid
  const centroid: Point = {
    x: normalizedPoints.reduce((sum, p) => sum + p.x, 0) / normalizedPoints.length,
    y: normalizedPoints.reduce((sum, p) => sum + p.y, 0) / normalizedPoints.length,
  };

  // 3. Aspect Ratio
  const aspectRatio = width / height;

  // 4. Path Length, Corners, Sharp Turns, and Curvature
  let totalLength = 0;
  const corners: Point[] = [];
  let sharpTurns = 0;
  const radii: number[] = [];
  const cornerAngleThreshold = 135;
  const sharpTurnAngleThreshold = 90;

  normalizedDrawing.forEach(stroke => {
    for (let i = 0; i < stroke.length - 1; i++) {
      const p1 = stroke[i];
      const p2 = stroke[i + 1];
      totalLength += getDistance(p1, p2);

      // Need 3 points for angle and radius
      if (i > 0 && i < stroke.length - 1) {
        const p0 = stroke[i - 1];
        
        // Angle for corner detection
        const angle = getAngle(p0, p1, p2);
        if (angle < cornerAngleThreshold) {
          corners.push(p1);
        }
        if (angle < sharpTurnAngleThreshold) {
            sharpTurns++;
        }

        // Radius of curvature using Menger curvature
        const d_p0_p1 = getDistance(p0, p1);
        const d_p1_p2 = getDistance(p1, p2);
        const d_p0_p2 = getDistance(p0, p2);
        const area = getTriangleArea(p0, p1, p2);

        // Avoid division by zero for collinear or near-collinear points
        if (area > 1e-6 && d_p0_p1 > 1e-6 && d_p1_p2 > 1e-6 && d_p0_p2 > 1e-6) {
          const radius = (d_p0_p1 * d_p1_p2 * d_p0_p2) / (4 * area);
          radii.push(radius);
        }
      }
    }
  });
  
  const averageRadius = radii.length > 0 ? radii.reduce((a, b) => a + b, 0) / radii.length : Infinity;

  // 5. Is Closed Path & Straightness
  const startPoint = drawing[0][0];
  const lastStroke = drawing[drawing.length - 1];
  const endPoint = lastStroke[lastStroke.length - 1];
  const closeDistanceThreshold = Math.min(width, height) * 0.15; // 15% of smallest dimension
  const isClosed = getDistance(startPoint, endPoint) < closeDistanceThreshold;

  const normalizedStart = { x: (startPoint.x - minX) / width, y: (startPoint.y - minY) / height };
  const normalizedEnd = { x: (endPoint.x - minX) / width, y: (endPoint.y - minY) / height };
  const normalizedDirectDistance = getDistance(normalizedStart, normalizedEnd);
  const straightness = totalLength > 0 ? Math.min(1.0, normalizedDirectDistance / totalLength) : 0;

  // 6. Complexity Score (simple heuristic)
  const lengthFactor = Math.min(totalLength / 10, 1); // Normalize length
  const cornerFactor = Math.min(corners.length / 10, 1);
  const complexity = Math.max(0.1, Math.min(1.0, (lengthFactor + cornerFactor) / 2));
  
  // 7. Normalized Path String
  const normalizedPath = normalizedDrawing.map(stroke =>
    stroke.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ')
  ).join(' M ');

  return {
    boundingBox,
    centroid,
    aspectRatio,
    totalLength,
    corners,
    isClosed,
    complexity,
    normalizedPath,
    sharpTurns,
    straightness,
    averageRadius,
  };
}