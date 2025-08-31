
import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import MapDisplay from './components/MapDisplay';
import { Point, Route, TransportationMode } from './types';
import { findMatchingRoutes } from './services/geminiService';

const App: React.FC = () => {
  const [drawing, setDrawing] = useState<Point[][]>([]);
  const [location, setLocation] = useState<string>('San Francisco, CA');
  const [mode, setMode] = useState<TransportationMode>('walking');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);

  const handleFindRoutes = useCallback(async () => {
    if (drawing.length === 0) {
      setError('Please draw a shape first.');
      return;
    }
    if (!location) {
      setError('Please enter a location.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRoutes([]);
    setActiveRouteIndex(null);

    try {
      // Geocode location to get coordinates for map view
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
      const geoData = await geoResponse.json();
      
      if (geoData.length > 0) {
        const { lat, lon } = geoData[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setMapZoom(14);
      } else {
         setError(`Could not find location: ${location}`);
         setIsLoading(false);
         return;
      }

      const foundRoutes = await findMatchingRoutes(drawing, location, mode);
      if (foundRoutes.length > 0) {
        setRoutes(foundRoutes);
      } else {
        setError('No matching routes found. Try a different shape or location.');
      }
    } catch (err) {
      setError(err instanceof Error ? `An error occurred: ${err.message}`: 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [drawing, location, mode]);

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
