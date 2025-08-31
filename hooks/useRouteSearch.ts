import { useState, useCallback } from 'react';
import { Point, Route, TransportationMode, GeocodingResult } from '../types';
import { findMatchingRoutes } from '../services/geminiService';
import { validateDrawing, validateLocation, handleGeocodeError, formatErrorMessage, retryWithBackoff } from '../utils/errorHandling';

interface UseRouteSearchResult {
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  activeRouteIndex: number | null;
  setActiveRouteIndex: (index: number | null) => void;
  searchRoutes: (drawing: Point[][], location: string, mode: TransportationMode) => Promise<void>;
  clearResults: () => void;
}

export const useRouteSearch = (defaultCenter: [number, number] = [37.7749, -122.4194]): UseRouteSearchResult => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);

  const searchRoutes = useCallback(async (drawing: Point[][], location: string, mode: TransportationMode) => {
    try {
      // Validate inputs
      validateDrawing(drawing);
      validateLocation(location);

      setIsLoading(true);
      setError(null);
      setRoutes([]);
      setActiveRouteIndex(null);

      // Geocode location with retry logic
      const geoData = await retryWithBackoff(async () => {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
        );
        
        if (!geoResponse.ok) {
          throw new Error(`Geocoding failed: ${geoResponse.status}`);
        }
        
        return await geoResponse.json() as GeocodingResult[];
      });
      
      handleGeocodeError(geoData, location);
      
      const { lat, lon } = geoData[0];
      setMapCenter([parseFloat(lat), parseFloat(lon)]);
      setMapZoom(14);

      // Find matching routes
      const foundRoutes = await findMatchingRoutes(drawing, location, mode);
      
      if (foundRoutes.length > 0) {
        setRoutes(foundRoutes);
      } else {
        setError('No matching routes found. Try a different shape or location.');
      }
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setRoutes([]);
    setError(null);
    setActiveRouteIndex(null);
  }, []);

  return {
    routes,
    isLoading,
    error,
    mapCenter,
    mapZoom,
    activeRouteIndex,
    setActiveRouteIndex,
    searchRoutes,
    clearResults
  };
};