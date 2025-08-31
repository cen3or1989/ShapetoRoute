import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import MapDisplay from './components/MapDisplay';
import { Point, Route, TransportationMode, CreativityLevel } from './types';
import { findMatchingRoutes } from './services/geminiService';
import { OfflineRouteService } from './services/offlineRouteService';
import { ImprovedOfflineRouteService } from './services/improvedOfflineRouteService';

const App: React.FC = () => {
  const [drawing, setDrawing] = useState<Point[][]>([]);
  const [location, setLocation] = useState<string>('San Francisco, CA');
  const [mode, setMode] = useState<TransportationMode>('walking');
  const [creativity, setCreativity] = useState<CreativityLevel>('balanced');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [useLocal, setUseLocal] = useState<boolean>(true); // پیش‌فرض روی Local

  const handleFindRoutes = useCallback(async () => {
    const totalPoints = drawing.flat().length;
    if (totalPoints < 5) {
      setError('Please draw a more detailed shape.');
      return;
    }
    if (!location) {
      setError('Please enter a location.');
      return;
    }

    setLoadingMessage('Starting...');
    setError(null);
    setRoutes([]);
    setActiveRouteIndex(null);

    try {
      setLoadingMessage('Locating your region...');
      // Geocode location to get coordinates for map view
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
      const geoData = await geoResponse.json();
      
      if (geoData.length > 0) {
        const { lat, lon } = geoData[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setMapZoom(14);
      } else {
         setError(`Could not find location: ${location}`);
         setLoadingMessage(null);
         return;
      }
      
      let foundRoutes: Route[];
      
      if (useLocal) {
        setLoadingMessage('🚀 Advanced local algorithm is analyzing your shape...');
        foundRoutes = await ImprovedOfflineRouteService.findMatchingRoutes(drawing, location, mode, creativity);
      } else {
        setLoadingMessage('🤖 AI is finding routes...');
        foundRoutes = await findMatchingRoutes(drawing, location, mode, creativity);
      }

      if (foundRoutes.length > 0) {
        setRoutes(foundRoutes);
      } else {
        const errorMsg = useLocal 
          ? 'No matching routes found with local algorithm. Try a different shape or location.'
          : 'No matching routes found. Try a different shape, location, or creativity level.';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingMessage(null);
    }
  }, [drawing, location, mode, creativity, useLocal]);

  return (
    <div className="flex h-screen font-sans text-gray-50">
      <ControlPanel
        drawing={drawing}
        setDrawing={setDrawing}
        location={location}
        setLocation={setLocation}
        mode={mode}
        setMode={setMode}
        creativity={creativity}
        setCreativity={setCreativity}
        onFindRoutes={handleFindRoutes}
        loadingMessage={loadingMessage}
        error={error}
        routes={routes}
        activeRouteIndex={activeRouteIndex}
        setActiveRouteIndex={setActiveRouteIndex}
        useLocal={useLocal}
        setUseLocal={setUseLocal}
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