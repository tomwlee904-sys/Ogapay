'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { createUpload, getMulterErrorMessage } = require('../middleware/upload');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /kyc/status
router.get('/status', authenticate, async (req, res) => {
  try {
    const kyc = await prisma.kycVerification.findUnique({
      where: { userId: req.user.id },
      select: { status: true, submittedAt: true, verifiedAt: true, rejectionReason: true },
    });
    res.json({ success: true, data: kyc || { status: 'PENDING' } });
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KYC status' });
  }
});

// POST /kyc/submit
router.post('/submit', authenticate, (req, res, next) => {
  const upload = createUpload('kyc').fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]);
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: getMulterErrorMessage(err.code, 'kyc') });

    try {
      const { idType = 'NIN', idNumber } = req.body;
      if (!idNumber) return res.status(400).json({ success: false, error: 'ID number is required' });

      const ImageKit = require('imagekit');
      const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      });

      const uploadFile = async (file, folder) => {
        if (!file) return null;
        const result = await imagekit.upload({
          file: file.buffer, fileName: `kyc-${req.user.id}-${Date.now()}-${folder}`,
          folder: `/oga-uploads/kyc/${folder}`,
        });
        return result.url;
      };

      const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
        uploadFile(req.files?.idFront?.[0], 'id-front'),
        uploadFile(req.files?.idBack?.[0], 'id-back'),
        uploadFile(req.files?.selfie?.[0], 'selfie'),
      ]);

      const existing = await prisma.kycVerification.findUnique({ where: { userId: req.user.id } });
      if (existing) {
        await prisma.kycVerification.update({
          where: { userId: req.user.id },
          data: { idType, idNumber, idFrontUrl, idBackUrl, selfieUrl, status: 'SUBMITTED', submittedAt: new Date() },
        });
      } else {
        await prisma.kycVerification.create({
          data: { userId: req.user.id, idType, idNumber, idFrontUrl, idBackUrl, selfieUrl, status: 'SUBMITTED' },
        });
      }

      res.json({ success: true, message: 'KYC submitted for review' });
    } catch (error) {
      console.error('KYC submit error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit KYC' });
    }
  });
});

// PATCH /kyc/:userId/approve — Admin only
const { requireAdmin } = require('../middleware/auth');
router.patch('/:userId/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.kycVerification.update({
      where: { userId: req.params.userId },
      data: { status: 'APPROVED', verifiedAt: new Date() },
    });
    await prisma.notification.create({
      data: { userId: req.params.userId, type: 'KYC', title: 'KYC Approved', body: 'Your identity verification has been approved.', data: { link: '/settings' }, isRead: false },
    });
    res.json({ success: true, message: 'KYC approved' });
  } catch (error) {
    console.error('KYC approve error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve KYC' });
  }
});

// PATCH /kyc/:userId/reject — Admin only
router.patch('/:userId/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    await prisma.kycVerification.update({
      where: { userId: req.params.userId },
      data: { status: 'REJECTED', rejectionReason: reason || 'Documents did not meet requirements' },
    });
    await prisma.notification.create({
      data: { userId: req.params.userId, type: 'KYC', title: 'KYC Rejected', body: reason || 'Your KYC submission was rejected. Please resubmit with correct documents.', data: { link: '/settings' }, isRead: false },
    });
    res.json({ success: true, message: 'KYC rejected' });
  } catch (error) {
    console.error('KYC reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject KYC' });
  }
});

module.exports = router;
