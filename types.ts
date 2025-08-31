
export interface Point {
  x: number;
  y: number;
}

export type TransportationMode = 'walking' | 'cycling' | 'driving';

export interface Route {
  routeName: string;
  description: string;
  distance: number; // in kilometers
  duration: number; // in minutes
  similarityScore: number; // 0 to 1
  path: [number, number][]; // Array of [lat, lng]
}

export interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

export interface AppState {
  drawing: Point[][];
  location: string;
  mode: TransportationMode;
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  activeRouteIndex: number | null;
}
