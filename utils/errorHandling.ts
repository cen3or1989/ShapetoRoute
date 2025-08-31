import { LocationNotFoundError, APIError, ValidationError } from '../types/errors';
import { Point } from '../types';

export const handleGeocodeError = (geoData: any[], location: string): void => {
  if (!geoData || geoData.length === 0) {
    throw new LocationNotFoundError(location);
  }
};

export const validateDrawing = (drawing: Point[][]): void => {
  if (!drawing || drawing.length === 0) {
    throw new ValidationError('Please draw a shape first.');
  }
  
  const totalPoints = drawing.reduce((sum, stroke) => sum + stroke.length, 0);
  if (totalPoints < 5) {
    throw new ValidationError('Drawing is too simple. Please draw a more detailed shape.');
  }
};

export const validateLocation = (location: string): void => {
  if (!location || location.trim().length === 0) {
    throw new ValidationError('Please enter a location.');
  }
  
  if (location.trim().length < 3) {
    throw new ValidationError('Location name is too short.');
  }
};

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof LocationNotFoundError) {
    return error.message;
  }
  
  if (error instanceof APIError) {
    return `API Error: ${error.message}`;
  }
  
  if (error instanceof Error) {
    return `An error occurred: ${error.message}`;
  }
  
  return 'An unknown error occurred. Please try again.';
};

// Retry logic for API calls
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};