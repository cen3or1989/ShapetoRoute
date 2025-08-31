export const DEFAULT_MAP_CENTER: [number, number] = [37.7749, -122.4194]; // San Francisco
export const DEFAULT_MAP_ZOOM = 13;
export const DEFAULT_LOCATION = 'San Francisco, CA';

export const CANVAS_DIMENSIONS = {
  width: 400,
  height: 200,
  gridSize: 20
};

export const DRAWING_STYLES = {
  gridColor: '#4A5568',
  gridLineWidth: 0.5,
  strokeColor: '#63B3ED',
  activeStrokeColor: '#90CDF4',
  strokeWidth: 3
};

export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const GEOCODING_API_URL = 'https://nominatim.openstreetmap.org/search';

export const ROUTE_COLORS = {
  active: '#06B6D4',
  inactive: '#38BDF8'
};

export const API_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000
};