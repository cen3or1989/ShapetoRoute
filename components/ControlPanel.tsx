import React from 'react';
import type { Point, Route, TransportationMode, CreativityLevel } from '../types';
import DrawingCanvas from './DrawingCanvas';
import { WalkIcon, BikeIcon, CarIcon } from './icons/TransportationIcons';
import { StrictIcon, BalancedIcon, CreativeIcon } from './icons/CreativityIcons';
import RouteResultItem from './RouteResultItem';
import Header from './Header';
import EmptyState from './EmptyState';
import LoadingIndicator from './LoadingIndicator';

interface ControlPanelProps {
  drawing: Point[][];
  setDrawing: React.Dispatch<React.SetStateAction<Point[][]>>;
  location: string;
  setLocation: (location: string) => void;
  mode: TransportationMode;
  setMode: (mode: TransportationMode) => void;
  creativity: CreativityLevel;
  setCreativity: (creativity: CreativityLevel) => void;
  onFindRoutes: () => void;
  loadingMessage: string | null;
  error: string | null;
  routes: Route[];
  activeRouteIndex: number | null;
  setActiveRouteIndex: (index: number | null) => void;
}

const Section: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
        Step {number}: <span className="text-gray-300">{title}</span>
      </h2>
      {children}
    </div>
);

const ControlPanel: React.FC<ControlPanelProps> = ({
  drawing,
  setDrawing,
  location,
  setLocation,
  mode,
  setMode,
  creativity,
  setCreativity,
  onFindRoutes,
  loadingMessage,
  error,
  routes,
  activeRouteIndex,
  setActiveRouteIndex
}) => {

  return (
    <aside className="w-[450px] h-full bg-gray-900 p-6 flex flex-col shadow-2xl z-10 overflow-y-auto">
      <Header />
      
      <div className="flex flex-col space-y-6 flex-grow">
        
        <Section number={1} title="Draw Your Route Shape">
          <DrawingCanvas onDrawingChange={setDrawing} drawing={drawing} />
        </Section>

        <Section number={2} title="Set Location">
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Paris, France"
            className="w-full bg-gray-800 border-2 border-gray-700 rounded-md px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
          />
        </Section>
        
        <Section number={3} title="Choose Transport">
            <div className="grid grid-cols-3 gap-3">
                <ModeButton selected={mode === 'walking'} onClick={() => setMode('walking')} label="Walking"><WalkIcon /></ModeButton>
                <ModeButton selected={mode === 'cycling'} onClick={() => setMode('cycling')} label="Cycling"><BikeIcon /></ModeButton>
                <ModeButton selected={mode === 'driving'} onClick={() => setMode('driving')} label="Driving"><CarIcon /></ModeButton>
            </div>
        </Section>

        <Section number={4} title="Set Creativity">
            <div className="grid grid-cols-3 gap-3">
                <ModeButton selected={creativity === 'strict'} onClick={() => setCreativity('strict')} label="Strict"><StrictIcon /></ModeButton>
                <ModeButton selected={creativity === 'balanced'} onClick={() => setCreativity('balanced')} label="Balanced"><BalancedIcon /></ModeButton>
                <ModeButton selected={creativity === 'creative'} onClick={() => setCreativity('creative')} label="Creative"><CreativeIcon /></ModeButton>
            </div>
        </Section>
        
        <div>
          <button
            onClick={onFindRoutes}
            disabled={loadingMessage !== null || drawing.length === 0}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-200 text-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
          >
            {loadingMessage ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingMessage}
              </>
            ) : '✨ Find My Route'}
          </button>
        </div>
        
        {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">{error}</div>}

        <div className="flex-grow flex flex-col min-h-0">
            <h2 className="text-lg font-bold text-gray-200 border-b border-gray-700 pb-2 mb-4">Results</h2>
            {loadingMessage && routes.length === 0 ? (
              <LoadingIndicator message={loadingMessage} />
            ) : routes.length > 0 ? (
                <div className="space-y-3 overflow-y-auto pr-2 -mr-4">
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
                <EmptyState />
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
        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 group ${
            selected 
            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10' 
            : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-700/50 text-gray-400'
        }`}
    >
        {children}
        <span className="mt-2 text-xs font-medium">{label}</span>
    </button>
);


export default ControlPanel;