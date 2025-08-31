export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class LocationNotFoundError extends AppError {
  constructor(location: string) {
    super(`Location not found: ${location}`, 'LOCATION_NOT_FOUND', 404);
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode?: number) {
    super(message, 'API_ERROR', statusCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}