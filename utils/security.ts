// Input sanitization utilities

export const sanitizeLocation = (location: string): string => {
  // Remove potentially harmful characters
  return location
    .trim()
    .replace(/[<>'"]/g, '')
    .substring(0, 100); // Limit length
};

export const validateApiKey = (apiKey: string | undefined): void => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  if (apiKey.length < 20) {
    throw new Error('Invalid API key format');
  }
};

export const sanitizeRouteData = (routes: any[]): any[] => {
  return routes.map(route => ({
    ...route,
    routeName: sanitizeString(route.routeName),
    description: sanitizeString(route.description),
    distance: sanitizeNumber(route.distance, 0, 1000),
    duration: sanitizeNumber(route.duration, 0, 10000),
    similarityScore: sanitizeNumber(route.similarityScore, 0, 1),
    path: sanitizePath(route.path)
  }));
};

const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.substring(0, 500).replace(/[<>]/g, '');
};

const sanitizeNumber = (num: any, min: number, max: number): number => {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

const sanitizePath = (path: any): [number, number][] => {
  if (!Array.isArray(path)) return [];
  
  return path
    .filter(point => Array.isArray(point) && point.length === 2)
    .map(point => [
      sanitizeNumber(point[0], -90, 90),   // latitude
      sanitizeNumber(point[1], -180, 180)  // longitude
    ])
    .slice(0, 1000); // Limit number of points
};