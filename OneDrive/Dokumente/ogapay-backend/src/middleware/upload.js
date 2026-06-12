'use strict';

const multer = require('multer');
const path = require('path');

// ─── Allowed MIME types ───────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];

// ─── Size limits per purpose (in bytes) ──────────────────────────────
const SIZE_LIMITS = {
  avatar:    5 * 1024 * 1024,   // 5 MB
  cover:    10 * 1024 * 1024,   // 10 MB
  proof:    20 * 1024 * 1024,   // 20 MB
  store:    10 * 1024 * 1024,   // 10 MB
  community: 10 * 1024 * 1024,   // 10 MB
  kyc:       20 * 1024 * 1024,   // 20 MB
  default:   10 * 1024 * 1024,   // 10 MB
};

// ─── Custom file filter ──────────────────────────────────────────────
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeOk && !extOk) {
    const err = new Error(
      `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}. Received: ${file.mimetype}`
    );
    err.code = 'FILE_TYPE_NOT_ALLOWED';
    err.status = 400;
    return cb(err, false);
  }

  cb(null, true);
}

// ─── Factory: create a multer instance per purpose ──────────────────
function createUpload(purpose = 'default') {
  const maxSize = SIZE_LIMITS[purpose] || SIZE_LIMITS.default;

  return multer({
    storage: multer.memoryStorage(), // store in memory, forward to ImageKit
    fileFilter,
    limits: {
      fileSize: maxSize,
      files: 1, // single file per upload by default
    },
  });
}

// ─── Error messages for common multer errors ─────────────────────────
function getMulterErrorMessage(code, purpose) {
  const maxMB = ((SIZE_LIMITS[purpose] || SIZE_LIMITS.default) / (1024 * 1024)).toFixed(0);
  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return `File too large. Maximum size for ${purpose} uploads is ${maxMB} MB.`;
    case 'LIMIT_FILE_COUNT':
      return 'Too many files. Only one file allowed per upload.';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Unexpected file field name.';
    case 'FILE_TYPE_NOT_ALLOWED':
      return `File type not allowed. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}.`;
    default:
      return 'Upload failed. Please try again.';
  }
}

module.exports = { createUpload, getMulterErrorMessage, SIZE_LIMITS, ALLOWED_EXTENSIONS };
