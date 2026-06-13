'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [wallets, taskCounts, submissions, referralCount, recentTxns] = await Promise.all([
      prisma.wallet.findMany({ where: { userId, isActive: true }, select: { currency: true, balance: true } }),
      prisma.task.count({ where: { posterId: userId } }),
      prisma.taskSubmission.findMany({
        where: { workerId: userId },
        select: { status: true, task: { select: { reward: true, currency: true } } },
      }),
      prisma.user.count({ where: { referredById: userId } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalEarned = submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + Number(s.task?.reward || 0), 0);

    const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;

    res.json({
      success: true,
      data: {
        wallets,
        tasksPosted: taskCounts,
        totalEarned,
        tasksCompleted: approvedCount,
        pendingSubmissions: pendingCount,
        referralCount,
        recentTransactions: recentTxns,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});


// GET /dashboard/summary — alias for /dashboard/stats (backward compat)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [wallets, taskCounts, submissions, referralCount, recentTxns] = await Promise.all([
      prisma.wallet.findMany({ where: { userId, isActive: true }, select: { currency: true, balance: true } }),
      prisma.task.count({ where: { posterId: userId } }),
      prisma.taskSubmission.findMany({
        where: { workerId: userId },
        select: { status: true, task: { select: { reward: true, currency: true } } },
      }),
      prisma.user.count({ where: { referredById: userId } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalEarned = submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + Number(s.task?.reward || 0), 0);

    const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;

    res.json({
      success: true,
      data: {
        wallets,
        tasksPosted: taskCounts,
        totalEarned,
        tasksCompleted: approvedCount,
        pendingSubmissions: pendingCount,
        referralCount,
        recentTransactions: recentTxns,
        metrics: {
          submissions: submissions.length,
          approved: approvedCount,
          pending: pendingCount,
          walletConnected: wallets.length > 0,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});


module.exports = router;
