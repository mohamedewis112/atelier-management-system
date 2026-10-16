/**
 * Error Handler Middleware
 * 
 * Purpose: Centralized error handling for the Express application.
 * Catches all errors and returns consistent error responses.
 * 
 * Operation: Should be the last middleware in the chain.
 * Logs errors and returns appropriate HTTP responses.
 */

import { serverConfig } from '../config/index.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Not found handler - for unmatched routes
 */
export function notFoundHandler(req, res, next) {
  const error = new ApiError(404, 'لم يتم العثور على الصفحة المطلوبة');
  next(error);
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  // Determine status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'خطأ في الخادم الداخلي';
  let details = err.details || null;

  // Clear auth cookie on 401 Unauthorized to prevent client-server auth loops
  if (statusCode === 401) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: !serverConfig.isDevelopment,
      path: '/',
    });
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'خطأ في البيانات المدخلة';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'تكرار البيانات أو انتهاك القيد';
  } else if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    message = 'القيمة موجودة بالفعل في النظام';
  }
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'خطأ في الخادم الداخلي';
    details = null;
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export default {
  ApiError,
  notFoundHandler,
  errorHandler
};
