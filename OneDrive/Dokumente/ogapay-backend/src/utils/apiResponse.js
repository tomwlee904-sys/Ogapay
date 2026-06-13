'use strict';

class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

function successResponse(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function errorResponse(res, message = 'Something went wrong', statusCode = 500, code = 'INTERNAL_ERROR') {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
}

function paginatedResponse(res, data, total, page, limit) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      total,
      totalPages: Math.ceil(total / (parseInt(limit) || 20)),
    },
  });
}

module.exports = { ApiError, successResponse, errorResponse, paginatedResponse };
