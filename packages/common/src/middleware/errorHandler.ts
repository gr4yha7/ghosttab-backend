import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../config/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    details: err instanceof AppError ? err.details : (err instanceof ZodError ? err.errors : undefined),
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      issues: err.errors,
    });
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle unexpected errors
  return sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.path} not found`);
};