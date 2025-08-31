
export interface Point {
  x: number;
  y: number;
}

export type TransportationMode = 'walking' | 'cycling' | 'driving';
export type CreativityLevel = 'strict' | 'balanced' | 'creative';

export interface Route {
  routeName: string;
  description: string;
  distance: number; // in kilometers
  duration: number; // in minutes
  similarityScore: number; // 0 to 1
  path: [number, number][]; // Array of [lat, lng]
}