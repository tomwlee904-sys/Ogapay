'use strict';

const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /payment/initialize — initialize Paystack/Flutterwave payment
router.post('/initialize', authenticate, [
  body('amount').isFloat({ min: 50 }).withMessage('Minimum amount is 50'),
  body('currency').optional().isIn(['NGN', 'USD']).withMessage('Invalid currency'),
  body('provider').optional().isIn(['paystack', 'flutterwave']).withMessage('Invalid provider'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { amount, currency = 'NGN', provider = 'paystack' } = req.body;
    const reference = `PAY-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    let checkoutUrl = null;
    let accessCode = null;

    if (provider === 'paystack') {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) return res.status(500).json({ success: false, error: 'Payment provider not configured' });

      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: req.user.email,
        amount: Math.round(amount * 100), // kobo
        currency,
        reference,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet?payment=success`,
        metadata: { userId: req.user.id },
      }, {
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      });

      checkoutUrl = response.data?.data?.authorization_url;
      accessCode = response.data?.data?.access_code;
    } else if (provider === 'flutterwave') {
      const secret = process.env.FLUTTERWAVE_SECRET_KEY;
      if (!secret) return res.status(500).json({ success: false, error: 'Payment provider not configured' });

      const response = await axios.post('https://api.flutterwave.com/v3/payments', {
        tx_ref: reference,
        amount,
        currency,
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet?payment=success`,
        customer: { email: req.user.email, name: `${req.user.firstName} ${req.user.lastName}` },
        meta: { userId: req.user.id },
      }, {
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      });

      checkoutUrl = response.data?.data?.link;
    }

    // Create pending payment record
    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        walletId: '',
        amount: parseFloat(amount),
        currency,
        type: 'DEPOSIT',
        status: 'PENDING',
        description: `Payment via ${provider}`,
        reference,
        balanceBefore: 0,
        balanceAfter: 0,
        provider,
        externalRef: accessCode || reference,
      },
    });

    res.json({ success: true, data: { reference, checkoutUrl, accessCode } });
  } catch (error) {
    console.error('Payment initialize error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to initialize payment' });
  }
});

// GET /payment/verify/:reference — verify payment status
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    const txn = await prisma.transaction.findFirst({ where: { reference } });
    if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (txn.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // If already completed, return immediately
    if (txn.status === 'COMPLETED') {
      return res.json({ success: true, data: { status: 'COMPLETED', transaction: txn } });
    }

    // Verify with Paystack
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      try {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackSecret}` },
        });
        const status = response.data?.data?.status;
        if (status === 'success') {
          await prisma.transaction.update({
            where: { id: txn.id },
            data: { status: 'COMPLETED' },
          });
          return res.json({ success: true, data: { status: 'COMPLETED', provider: 'paystack', transaction: { ...txn, status: 'COMPLETED' } } });
        }
      } catch {}
    }

    // Verify with Flutterwave
    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (flwSecret) {
      try {
        const response = await axios.get(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
          headers: { Authorization: `Bearer ${flwSecret}` },
        });
        const status = response.data?.data?.status;
        if (status === 'successful') {
          await prisma.transaction.update({
            where: { id: txn.id },
            data: { status: 'COMPLETED' },
          });
          return res.json({ success: true, data: { status: 'COMPLETED', provider: 'flutterwave', transaction: { ...txn, status: 'COMPLETED' } } });
        }
      } catch {}
    }

    res.json({ success: true, data: { status: txn.status, transaction: txn } });
  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

// GET /payment/history — user's payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.transaction.findMany({
      where: { userId: req.user.id, type: 'DEPOSIT' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
