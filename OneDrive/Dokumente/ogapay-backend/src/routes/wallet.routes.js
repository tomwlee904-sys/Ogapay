'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── GET /wallet/balance ─────────────────────────────────────────────
router.get('/balance', authenticate, async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user.id, isActive: true },
      select: { currency: true, balance: true },
    });

    // Calculate pending withdrawals
    const pendingWithdrawals = await prisma.transaction.aggregate({
      where: { userId: req.user.id, type: 'WITHDRAWAL', status: 'PENDING' },
      _sum: { amount: true },
    });

    // Build legacy format for frontend
    const legacyFormat = {};
    for (const w of wallets) {
      legacyFormat[w.currency] = { available: Number(w.balance), balance: Number(w.balance) };
    }

    res.json({
      success: true,
      data: {
        wallets,
        pendingWithdrawals: Number(pendingWithdrawals._sum.amount || 0),
        ...legacyFormat,
      },
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

// ─── GET /wallet/transactions ────────────────────────────────────────
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, currency } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type.toUpperCase();
    if (currency) where.currency = currency.toUpperCase();

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page), limit: parseInt(limit), total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// ─── POST /wallet/withdraw ──────────────────────────────────────────
router.post('/withdraw', authenticate, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('currency').optional().isIn(['NGN', 'USDC', 'USDT', 'ETH', 'MATIC', 'SOL']).withMessage('Invalid currency'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { amount, currency = 'NGN', bankCode, accountNumber, accountName, walletAddress } = req.body;
    const amountNum = parseFloat(amount);

    // Check KYC
    const kyc = await prisma.kycVerification.findUnique({ where: { userId: req.user.id } });
    if (!kyc || kyc.status !== 'APPROVED') {
      return res.status(403).json({ success: false, error: 'KYC verification required before withdrawal' });
    }

    // Check balance
    const wallet = await prisma.wallet.findFirst({
      where: { userId: req.user.id, currency, isActive: true },
    });
    if (!wallet || Number(wallet.balance) < amountNum) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Check for existing pending withdrawals
    const pendingExists = await prisma.transaction.findFirst({
      where: { userId: req.user.id, type: 'WITHDRAWAL', status: 'PENDING' },
    });
    if (pendingExists) {
      return res.status(400).json({ success: false, error: 'You already have a pending withdrawal request' });
    }

    // Atomic withdrawal
    const result = await prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findFirst({
        where: { userId: req.user.id, currency },
      });
      const balanceBefore = Number(currentWallet.balance);

      await tx.wallet.update({
        where: { id: currentWallet.id },
        data: { balance: { decrement: amountNum } },
      });

      const withdrawal = await tx.transaction.create({
        data: {
          userId: req.user.id,
          walletId: currentWallet.id,
          amount: amountNum,
          currency,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          description: `Withdrawal of ${amountNum} ${currency}`,
          reference: `WITHDRAW-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          balanceBefore,
          balanceAfter: balanceBefore - amountNum,
        },
      });

      return withdrawal;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// ─── POST /wallet/fund ──────────────────────────────────────────────
router.post('/fund', authenticate, [
  body('amount').isFloat({ min: 50 }).withMessage('Minimum deposit is 50'),
  body('currency').optional().isIn(['NGN', 'USDC', 'USDT']).withMessage('Invalid currency'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { amount, currency = 'NGN' } = req.body;
    const reference = `FUND-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Save the pending transaction
    const wallet = await prisma.wallet.findFirst({
      where: { userId: req.user.id, currency },
    });
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Wallet not found for this currency' });
    }

    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        walletId: wallet.id,
        amount: parseFloat(amount),
        currency,
        type: 'DEPOSIT',
        status: 'PENDING',
        description: `Deposit of ${amount} ${currency}`,
        reference,
        balanceBefore: Number(wallet.balance),
        balanceAfter: Number(wallet.balance),
      },
    });

    // In production, initialize payment gateway here
    res.json({
      success: true,
      data: {
        reference,
        amount: parseFloat(amount),
        currency,
        paymentUrl: null, // Frontend handles payment gateway
      },
    });
  } catch (error) {
    console.error('Fund error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate deposit' });
  }
});

module.exports = router;
