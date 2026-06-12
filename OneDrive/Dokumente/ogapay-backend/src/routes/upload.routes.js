'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createUpload, getMulterErrorMessage } = require('../middleware/upload');
const { getAuthParameters } = require('../config/imagekit');
const { ApiError } = require('../utils/apiResponse');

// ─── Upload to ImageKit ──────────────────────────────────────────────
async function uploadToImageKit(buffer, fileName, folder) {
  const ImageKit = require('imagekit');
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  const result = await imagekit.upload({
    file: buffer,
    fileName: `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    folder: folder || '/oga-uploads',
    useUniqueFileName: true,
  });

  return result.url;
}

// ─── POST /uploads/store — Store product images ────────────────────
router.post('/store', authenticate, (req, res, next) => {
  const upload = createUpload('store').single('file');
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: getMulterErrorMessage(err.code, 'store'),
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }
    try {
      const url = await uploadToImageKit(req.file.buffer, req.file.originalname, '/oga-uploads/store');
      res.json({ success: true, data: { url } });
    } catch (uploadErr) {
      console.error('ImageKit upload error:', uploadErr);
      res.status(500).json({ success: false, message: 'Failed to upload image.' });
    }
  });
});

// ─── POST /uploads/proof — Task submission proof files ──────────
router.post('/proof', authenticate, (req, res, next) => {
  const upload = createUpload('proof').single('file');
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: getMulterErrorMessage(err.code, 'proof'),
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }
    try {
      const url = await uploadToImageKit(req.file.buffer, req.file.originalname, '/oga-uploads/proofs');
      res.json({ success: true, data: { url } });
    } catch (uploadErr) {
      console.error('ImageKit upload error:', uploadErr);
      res.status(500).json({ success: false, message: 'Failed to upload proof.' });
    }
  });
});

// ─── POST /uploads/community — Community cover images ─────────────
router.post('/community', authenticate, (req, res, next) => {
  const upload = createUpload('community').single('cover');
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: getMulterErrorMessage(err.code, 'community'),
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }
    try {
      const url = await uploadToImageKit(req.file.buffer, req.file.originalname, '/oga-uploads/community');
      res.json({ success: true, data: { url } });
    } catch (uploadErr) {
      console.error('ImageKit upload error:', uploadErr);
      res.status(500).json({ success: false, message: 'Failed to upload image.' });
    }
  });
});

// ─── POST /uploads/kyc — KYC document uploads ─────────────────────
router.post('/kyc', authenticate, (req, res, next) => {
  const upload = createUpload('kyc').single('file');
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: getMulterErrorMessage(err.code, 'kyc'),
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }
    try {
      const url = await uploadToImageKit(req.file.buffer, req.file.originalname, '/oga-uploads/kyc');
      res.json({ success: true, data: { url } });
    } catch (uploadErr) {
      console.error('ImageKit upload error:', uploadErr);
      res.status(500).json({ success: false, message: 'Failed to upload document.' });
    }
  });
});

module.exports = router;
