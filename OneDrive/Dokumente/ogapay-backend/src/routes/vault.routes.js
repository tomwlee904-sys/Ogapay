'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All vault routes require admin
router.use(authenticate, requireAdmin);

// GET /vault — platform treasury balance
router.get('/', async (req, res) => {
  try {
    const vault = await prisma.wallet.findFirst({ where: { userId: 'PLATFORM' } });
    
    // Sum all platform fees collected
    const totalFees = await prisma.transaction.aggregate({
      where: { type: 'TASK_PAYMENT', status: 'COMPLETED', fee: { gt: 0 } },
      _sum: { fee: true },
    });

    // Count of fee transactions by currency
    const feeByCurrency = await prisma.transaction.groupBy({
      by: ['currency'],
      where: { type: 'TASK_PAYMENT', status: 'COMPLETED', fee: { gt: 0 } },
      _sum: { fee: true },
    });

    res.json({
      success: true,
      data: {
        balance: vault ? Number(vault.balance) : 0,
        currency: 'NGN',
        totalFeesCollected: Number(totalFees._sum.fee || 0),
        feeByCurrency: feeByCurrency.map(f => ({ currency: f.currency, total: Number(f._sum.fee || 0) })),
      },
    });
  } catch (error) {
    console.error('Vault error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vault' });
  }
});

// POST /vault/allocate — allocate funds for rewards pool
router.post('/allocate', [
  body('amount').isFloat({ min: 1 }),
  body('currency').optional().isIn(['NGN', 'USDC', 'USDT', 'ETH', 'MATIC', 'SOL']),
  body('reason').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { amount, currency = 'NGN', reason } = req.body;
    let vault = await prisma.wallet.findFirst({ where: { userId: 'PLATFORM', currency } });
    if (!vault) {
      vault = await prisma.wallet.create({ data: { userId: 'PLATFORM', currency, balance: 0 } });
    }

    const balanceBefore = Number(vault.balance);
    await prisma.wallet.update({
      where: { id: vault.id },
      data: { balance: { increment: parseFloat(amount) } },
    });
    await prisma.transaction.create({
      data: {
        userId: 'PLATFORM', walletId: vault.id, amount: parseFloat(amount), currency,
        type: 'DEPOSIT', status: 'COMPLETED',
        description: `Vault allocation: ${reason}`,
        reference: `VAULT-ALLOC-${Date.now()}`,
        balanceBefore, balanceAfter: balanceBefore + parseFloat(amount),
      },
    });

    res.json({ success: true, message: 'Funds allocated' });
  } catch (error) {
    console.error('Vault allocate error:', error);
    res.status(500).json({ success: false, error: 'Failed to allocate funds' });
  }
});

// GET /vault/transactions — all vault movements
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const transactions = await prisma.transaction.findMany({
      where: { userId: 'PLATFORM' },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });
    const total = await prisma.transaction.count({ where: { userId: 'PLATFORM' } });
    res.json({
      success: true, data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Vault transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vault transactions' });
  }
});

module.exports = router;
