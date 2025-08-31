
import React, { useMemo } from 'react';
import type { Point, Route, TransportationMode } from '../types';
import DrawingCanvas from './DrawingCanvas';
import { WalkIcon, BikeIcon, CarIcon } from './icons/TransportationIcons';
import RouteResultItem from './RouteResultItem';
import { analyzeShape, validateShape, createGeometricDescription } from '../services/shapeAnalysis';

interface ControlPanelProps {
  drawing: Point[][];
  setDrawing: React.Dispatch<React.SetStateAction<Point[][]>>;
  location: string;
  setLocation: (location: string) => void;
  mode: TransportationMode;
  setMode: (mode: TransportationMode) => void;
  onFindRoutes: () => void;
  isLoading: boolean;
  error: string | null;
  routes: Route[];
  activeRouteIndex: number | null;
  setActiveRouteIndex: (index: number | null) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  drawing,
  setDrawing,
  location,
  setLocation,
  mode,
  setMode,
  onFindRoutes,
  isLoading,
  error,
  routes,
  activeRouteIndex,
  setActiveRouteIndex
}) => {

  const handleClearDrawing = () => {
    setDrawing([]);
  };

  // Analyze shape in real-time for user feedback
  const shapeAnalysis = useMemo(() => {
    const validation = validateShape(drawing);
    if (!validation.isValid) {
      return { validation, features: null };
    }
    
    try {
      const features = analyzeShape(drawing);
      return { validation, features };
    } catch (error) {
      return { 
        validation: { 
          isValid: false, 
          issues: ['Shape analysis failed'], 
          recommendations: ['Try drawing a clearer shape'] 
        }, 
        features: null 
      };
    }
  }, [drawing]);

  return (
    <aside className="w-[450px] h-full bg-gray-800 p-6 flex flex-col shadow-2xl z-10 overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Shape → Route</h1>
        <p className="text-gray-400 mt-1">Draw a shape, find a real-world route.</p>
      </header>
      
      <div className="flex flex-col space-y-6 flex-grow">
        <div>
          <label className="text-sm font-semibold text-gray-400 block mb-2">1. Draw your desired route shape</label>
          <div className="relative">
            <DrawingCanvas onDrawingChange={setDrawing} drawing={drawing} />
            <button
              onClick={handleClearDrawing}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-red-600 text-white px-3 py-1 text-xs rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
          
          {/* Shape Analysis Feedback */}
          {drawing.length > 0 && (
            <div className="mt-3 p-3 bg-gray-900 rounded-md border border-gray-600">
              <div className="text-xs font-semibold text-gray-400 mb-2">Shape Analysis</div>
              {shapeAnalysis.validation.isValid && shapeAnalysis.features ? (
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Type: <span className="text-cyan-400 font-semibold">{shapeAnalysis.features.detectedType}</span> ({(shapeAnalysis.features.confidence * 100).toFixed(0)}% confidence)</div>
                  <div>Structure: <span className="text-cyan-400">{shapeAnalysis.features.isClosed ? 'Closed loop' : 'Open path'}</span></div>
                  <div>Complexity: <span className="text-cyan-400">{(shapeAnalysis.features.complexity * 100).toFixed(0)}%</span></div>
                  <div>Corners: <span className="text-cyan-400">{shapeAnalysis.features.corners.length}</span></div>
                </div>
              ) : (
                <div className="text-xs text-yellow-400">
                  <div className="font-semibold mb-1">Issues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {shapeAnalysis.validation.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                  {shapeAnalysis.validation.recommendations.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {shapeAnalysis.validation.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-yellow-300">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="location" className="text-sm font-semibold text-gray-400 block mb-2">2. Enter a location</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Paris, France"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          />
        </div>
        
        <div>
            <label className="text-sm font-semibold text-gray-400 block mb-2">3. Choose transportation mode</label>
            <div className="grid grid-cols-3 gap-3">
                <ModeButton selected={mode === 'walking'} onClick={() => setMode('walking')} label="Walking"><WalkIcon /></ModeButton>
                <ModeButton selected={mode === 'cycling'} onClick={() => setMode('cycling')} label="Cycling"><BikeIcon /></ModeButton>
                <ModeButton selected={mode === 'driving'} onClick={() => setMode('driving')} label="Driving"><CarIcon /></ModeButton>
            </div>
        </div>

        <div>
          <button
            onClick={onFindRoutes}
            disabled={isLoading || !shapeAnalysis.validation.isValid}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all duration-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finding Routes...
              </>
            ) : 'Find Matching Route'}
          </button>
        </div>
        
        {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">{error}</div>}

        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-4">Results</h2>
            {routes.length > 0 ? (
                <div className="space-y-3">
                    {routes.map((route, index) => (
                        <RouteResultItem 
                          key={index} 
                          route={route} 
                          index={index}
                          isActive={activeRouteIndex === index}
                          onClick={() => setActiveRouteIndex(activeRouteIndex === index ? null : index)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-8">
                    { !isLoading && <p>Matching routes will appear here.</p> }
                </div>
            )}
        </div>

      </div>
    </aside>
  );
};


interface ModeButtonProps {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
    label: string;
}

const ModeButton: React.FC<ModeButtonProps> = ({ selected, onClick, children, label }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-colors ${
            selected 
            ? 'bg-cyan-800 border-cyan-500 text-white' 
            : 'bg-gray-700 border-gray-600 hover:border-gray-500 text-gray-400'
        }`}
    >
        {children}
        <span className="mt-2 text-xs font-medium">{label}</span>
    </button>
);


export default ControlPanel;
