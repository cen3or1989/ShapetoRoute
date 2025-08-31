import React from 'react';
import { Point } from '../types';
import { analyzeShape, generateShapeDescription } from '../utils/shapeAnalysis';

interface ShapeDebugPanelProps {
  drawing: Point[][];
  show: boolean;
}

const ShapeDebugPanel: React.FC<ShapeDebugPanelProps> = ({ drawing, show }) => {
  if (!show || drawing.length === 0) return null;

  const features = analyzeShape(drawing);
  const description = generateShapeDescription(features);

  return (
    <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-95 p-4 rounded-lg shadow-lg max-w-sm z-20">
      <h3 className="text-cyan-400 font-bold mb-2">Shape Analysis Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">Type:</span>{' '}
          <span className="text-white font-semibold">{features.type}</span>
        </div>
        
        <div>
          <span className="text-gray-400">Direction:</span>{' '}
          <span className="text-white">{features.direction}</span>
        </div>
        
        <div>
          <span className="text-gray-400">Complexity:</span>{' '}
          <span className="text-white">{(features.complexity * 100).toFixed(0)}%</span>
        </div>
        
        <div>
          <span className="text-gray-400">Curvature:</span>{' '}
          <span className="text-white">{(features.curvature * 100).toFixed(0)}%</span>
        </div>
        
        <div>
          <span className="text-gray-400">Aspect Ratio:</span>{' '}
          <span className="text-white">{features.aspectRatio.toFixed(2)}</span>
        </div>
        
        {features.angles.length > 0 && (
          <div>
            <span className="text-gray-400">Key Angles:</span>{' '}
            <span className="text-white">{features.angles.slice(0, 5).join('°, ')}°</span>
            {features.angles.length > 5 && <span className="text-gray-500"> ...</span>}
          </div>
        )}
        
        <div>
          <span className="text-gray-400">Points:</span>{' '}
          <span className="text-white">{features.normalizedPath.length} (normalized)</span>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <span className="text-gray-400">Description:</span>
          <p className="text-white text-xs mt-1">{description}</p>
        </div>
      </div>
      
      <div className="mt-3">
        <canvas 
          width={150} 
          height={150} 
          className="border border-gray-600 rounded bg-gray-900"
          ref={canvas => {
            if (canvas && features.normalizedPath.length > 0) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, 150, 150);
                ctx.strokeStyle = '#06B6D4';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                features.normalizedPath.forEach((p, i) => {
                  const x = p.x * 140 + 5;
                  const y = p.y * 140 + 5;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                });
                
                ctx.stroke();
                
                // Draw start and end points
                if (features.normalizedPath.length > 0) {
                  // Start point (green)
                  ctx.fillStyle = '#10B981';
                  ctx.beginPath();
                  ctx.arc(
                    features.normalizedPath[0].x * 140 + 5,
                    features.normalizedPath[0].y * 140 + 5,
                    4, 0, 2 * Math.PI
                  );
                  ctx.fill();
                  
                  // End point (red)
                  ctx.fillStyle = '#EF4444';
                  ctx.beginPath();
                  ctx.arc(
                    features.normalizedPath[features.normalizedPath.length - 1].x * 140 + 5,
                    features.normalizedPath[features.normalizedPath.length - 1].y * 140 + 5,
                    4, 0, 2 * Math.PI
                  );
                  ctx.fill();
                }
              }
            }
          }}
        />
        <p className="text-xs text-gray-500 mt-1">Normalized shape preview</p>
      </div>
    </div>
  );
};

export default ShapeDebugPanel;