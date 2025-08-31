import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import MapDisplay from './components/MapDisplay';
import { Point, Route, TransportationMode, CreativityLevel } from './types';
import { findMatchingRoutes } from './services/geminiService';

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
      
      setLoadingMessage('AI is finding routes...');
      const foundRoutes = await findMatchingRoutes(drawing, location, mode, creativity);

      if (foundRoutes.length > 0) {
        setRoutes(foundRoutes);
      } else {
        setError('No matching routes found. Try a different shape, location, or creativity level.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingMessage(null);
    }
  }, [drawing, location, mode, creativity]);

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