'use strict';

function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

module.exports = { notFound };
