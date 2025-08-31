
import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import type { Point } from '../types';

interface DrawingCanvasProps {
  onDrawingChange: (drawing: Point[][]) => void;
  drawing: Point[][];
  width?: number;
  height?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = memo(({
  onDrawingChange,
  drawing,
  width = 400,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  const redrawCanvas = useCallback(() => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#4A5568'; // gray-700
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw existing strokes
    ctx.strokeStyle = '#63B3ED'; // blue-400
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    drawing.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });

  }, [getCanvasContext, drawing, width, height]);
  
  useEffect(() => {
    redrawCanvas();
  }, [drawing, redrawCanvas]);

  const getPointInCanvas = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getPointInCanvas(e);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getPointInCanvas(e);
    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);
    
    const ctx = getCanvasContext();
    if (!ctx || newStroke.length < 2) return;

    ctx.strokeStyle = '#90CDF4'; // blue-300
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const lastPoint = newStroke[newStroke.length - 2];
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
        onDrawingChange([...drawing, currentStroke]);
    }
    setCurrentStroke([]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg cursor-crosshair"
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
