'use strict';

const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  // Log error
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
    body: req.body ? JSON.stringify(req.body).slice(0, 500) : null,
    userId: req.user?.id,
  });

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  // Multer file type error
  if (err.code === 'FILE_TYPE_NOT_ALLOWED') {
    return res.status(400).json({
      success: false,
      error: err.message || 'File type not allowed.',
      code: 'INVALID_FILE_TYPE',
    });
  }

  // Multer unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
      code: 'UNEXPECTED_FILE',
    });
  }

  // Express-validator errors
  if (err.type === 'validation' && err.errors) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
  }

  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Prisma known error
  if (err.code && err.code.startsWith('P')) {
    logger.error('Prisma error:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists.',
        code: 'DUPLICATE',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found.',
        code: 'NOT_FOUND',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Database error. Please try again.',
      code: 'DB_ERROR',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
      code: 'AUTH_ERROR',
    });
  }

  // Default
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

module.exports = { errorHandler };
