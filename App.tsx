
import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import MapDisplay from './components/MapDisplay';
import ShapeDebugPanel from './components/ShapeDebugPanel';
import { Point, TransportationMode } from './types';
import { useRouteSearch } from './hooks/useRouteSearch';

const App: React.FC = () => {
  const [drawing, setDrawing] = useState<Point[][]>([]);
  const [location, setLocation] = useState<string>('San Francisco, CA');
  const [mode, setMode] = useState<TransportationMode>('walking');
  const [showDebug, setShowDebug] = useState<boolean>(false);
  
  const {
    routes,
    isLoading,
    error,
    mapCenter,
    mapZoom,
    activeRouteIndex,
    setActiveRouteIndex,
    searchRoutes,
    clearResults
  } = useRouteSearch();

  const handleFindRoutes = useCallback(async () => {
    await searchRoutes(drawing, location, mode);
  }, [drawing, location, mode, searchRoutes]);

  const handleClearDrawing = useCallback(() => {
    setDrawing([]);
    clearResults();
  }, [clearResults]);

  return (
    <div className="flex h-screen font-sans bg-gray-900 text-gray-200">
      <ControlPanel
        drawing={drawing}
        setDrawing={setDrawing}
        location={location}
        setLocation={setLocation}
        mode={mode}
        setMode={setMode}
        onFindRoutes={handleFindRoutes}
        isLoading={isLoading}
        error={error}
        routes={routes}
        activeRouteIndex={activeRouteIndex}
        setActiveRouteIndex={setActiveRouteIndex}
      />
      <main className="flex-1 h-full relative">
        <MapDisplay 
          center={mapCenter} 
          zoom={mapZoom} 
          routes={routes} 
          activeRouteIndex={activeRouteIndex}
        />
        <ShapeDebugPanel drawing={drawing} show={showDebug} />
        
        {/* Debug Toggle Button */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="absolute bottom-4 left-4 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm shadow-lg z-10"
          title="Toggle shape analysis debug panel"
        >
          {showDebug ? 'Hide' : 'Show'} Debug
        </button>
      </main>
    </div>
  );
};

export default App;
