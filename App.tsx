
import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import MapDisplay from './components/MapDisplay';
import { Point, TransportationMode } from './types';
import { useRouteSearch } from './hooks/useRouteSearch';

const App: React.FC = () => {
  const [drawing, setDrawing] = useState<Point[][]>([]);
  const [location, setLocation] = useState<string>('San Francisco, CA');
  const [mode, setMode] = useState<TransportationMode>('walking');
  
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
      <main className="flex-1 h-full">
        <MapDisplay 
          center={mapCenter} 
          zoom={mapZoom} 
          routes={routes} 
          activeRouteIndex={activeRouteIndex}
        />
      </main>
    </div>
  );
};

export default App;
