'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require("../middleware/auth");
const { sendEmail, emailTemplates } = require("../utils/email");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// GET /admin/users — paginated user list
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 50, role, banned } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role.toUpperCase();
    if (banned === 'true') where.isBanned = true;
    if (banned === 'false') where.isBanned = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        select: { id: true, email: true, firstName: true, lastName: true, username: true, avatarUrl: true, role: true, isBanned: true, isEmailVerified: true, referralCode: true, createdAt: true,
          _count: { select: { tasksCreated: true, taskSubmissions: true, transactions: true } },
          wallets: { select: { currency: true, balance: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /admin/users/:id — user detail
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        wallets: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        kyc: true,
        workerProfile: true,
        posterProfile: true,
        _count: { select: { tasksCreated: true, taskSubmissions: true, notifications: true, referrals: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// PATCH /admin/users/:id/ban — ban user
router.patch('/users/:id/ban', async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: true } });
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
    res.json({ success: true, message: 'User banned' });
  } catch (error) {
    console.error('Admin ban error:', error);
    res.status(500).json({ success: false, error: 'Failed to ban user' });
  }
});

// PATCH /admin/users/:id/unban — unban user
router.patch('/users/:id/unban', async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: false } });
    res.json({ success: true, message: 'User unbanned' });
  } catch (error) {
    console.error('Admin unban error:', error);
    res.status(500).json({ success: false, error: 'Failed to unban user' });
  }
});

// POST /admin/users/:id/credit — manual credit
router.post('/users/:id/credit', [body('amount').isFloat({ min: 1 }), body('reason').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  try {
    const { amount, reason, currency = 'NGN' } = req.body;
    let wallet = await prisma.wallet.findFirst({ where: { userId: req.params.id, currency } });
    if (!wallet) wallet = await prisma.wallet.create({ data: { userId: req.params.id, currency, balance: 0 } });

    const balanceBefore = Number(wallet.balance);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: parseFloat(amount) } } });
    await prisma.transaction.create({
      data: { userId: req.params.id, walletId: wallet.id, amount: parseFloat(amount), currency, type: 'DEPOSIT', status: 'COMPLETED', description: `Manual credit: ${reason}`, reference: `ADMIN-CREDIT-${Date.now()}`, balanceBefore, balanceAfter: balanceBefore + parseFloat(amount) },
    });
    res.json({ success: true, message: 'Wallet credited' });
  } catch (error) {
    console.error('Admin credit error:', error);
    res.status(500).json({ success: false, error: 'Failed to credit wallet' });
  }
});

// POST /admin/users/:id/debit — manual debit
router.post('/users/:id/debit', [body('amount').isFloat({ min: 1 }), body('reason').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  try {
    const { amount, reason, currency = 'NGN' } = req.body;
    const wallet = await prisma.wallet.findFirst({ where: { userId: req.params.id, currency } });
    if (!wallet || Number(wallet.balance) < parseFloat(amount)) return res.status(400).json({ success: false, error: 'Insufficient balance' });

    const balanceBefore = Number(wallet.balance);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: parseFloat(amount) } } });
    await prisma.transaction.create({
      data: { userId: req.params.id, walletId: wallet.id, amount: parseFloat(amount), currency, type: 'WITHDRAWAL', status: 'COMPLETED', description: `Manual debit: ${reason}`, reference: `ADMIN-DEBIT-${Date.now()}`, balanceBefore, balanceAfter: balanceBefore - parseFloat(amount) },
    });
    res.json({ success: true, message: 'Wallet debited' });
  } catch (error) {
    console.error('Admin debit error:', error);
    res.status(500).json({ success: false, error: 'Failed to debit wallet' });
  }
});

// GET /admin/tasks — all tasks
router.get('/tasks', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (category) where.category = category.toUpperCase();

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        include: { poster: { select: { id: true, username: true } }, _count: { select: { submissions: true } } },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ success: true, data: tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Admin tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// PATCH /admin/tasks/:id/close — force close
router.patch('/tasks/:id/close', async (req, res) => {
  try {
    await prisma.task.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } });
    res.json({ success: true, message: 'Task closed' });
  } catch (error) {
    console.error('Admin close task error:', error);
    res.status(500).json({ success: false, error: 'Failed to close task' });
  }
});

// GET /admin/withdrawals — pending withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 50 } = req.query;
    const withdrawals = await prisma.transaction.findMany({
      where: { type: 'WITHDRAWAL', status: status.toUpperCase() },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
      include: { user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } } },
    });
    const total = await prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: status.toUpperCase() } });
    res.json({ success: true, data: withdrawals, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Admin withdrawals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// PATCH /admin/withdrawals/:id/approve
router.patch('/withdrawals/:id/approve', async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });
    await prisma.transaction.update({ where: { id: req.params.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await prisma.notification.create({
      data: { userId: txn.userId, type: 'WITHDRAWAL', title: 'Withdrawal Approved', body: `Your withdrawal of ${txn.amount} ${txn.currency} has been approved.`, data: { link: '/wallet' }, isRead: false },
    });

    // Send email notification
    try {
      const user = await prisma.user.findUnique({ where: { id: txn.userId }, select: { email: true, firstName: true, username: true } });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          ...emailTemplates.withdrawalApproved(
            user.firstName || user.username,
            txn.amount,
            txn.currency
          ),
        });
      }
    } catch (emailErr) {
      console.error('Failed to send withdrawal email:', emailErr.message);
    }

    res.json({ success: true, message: 'Withdrawal approved' });
  } catch (error) {
    console.error('Admin approve withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
  }
});

// PATCH /admin/withdrawals/:id/reject
router.patch('/withdrawals/:id/reject', async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id: req.params.id }, data: { status: 'FAILED' } });
      // Refund the wallet
      const wallet = await tx.wallet.findFirst({ where: { userId: txn.userId, currency: txn.currency } });
      if (wallet) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: txn.amount } } });
      }
    });

    await prisma.notification.create({
      data: { userId: txn.userId, type: 'WITHDRAWAL', title: 'Withdrawal Rejected', body: `Your withdrawal of ${txn.amount} ${txn.currency} was rejected. Funds have been refunded.`, data: { link: '/wallet' }, isRead: false },
    });
    res.json({ success: true, message: 'Withdrawal rejected and refunded' });
  } catch (error) {
    console.error('Admin reject withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
  }
});

// GET /admin/analytics — platform stats
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, totalTasks, totalTransactions, totalWallets, usersToday, tasksToday, recentSignups] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.task.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, username: true, firstName: true, lastName: true, createdAt: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers, totalTasks,
        totalTransactions,
        totalWalletBalance: Number(totalWallets._sum.balance || 0),
        usersToday, tasksToday,
        recentSignups,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
