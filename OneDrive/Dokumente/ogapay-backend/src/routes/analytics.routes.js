'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

// GET /analytics/platform — daily active users, task volume, revenue, growth
router.get('/platform', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalTasks, totalRevenue, usersToday, tasksToday, tasksThisWeek, usersThisWeek, completedTasks, pendingWithdrawals] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.transaction.aggregate({ where: { type: 'TASK_PAYMENT', status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.task.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.task.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.taskSubmission.count({ where: { status: 'APPROVED' } }),
      prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
    ]);

    // Growth rate (new users this week vs previous week)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekUsers = await prisma.user.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    });
    const growthRate = previousWeekUsers > 0 ? ((usersThisWeek - previousWeekUsers) / previousWeekUsers) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalUsers, totalTasks,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        usersToday, tasksToday,
        tasksThisWeek, usersThisWeek,
        completedSubmissions: completedTasks,
        pendingWithdrawals,
        growthRate: Math.round(growthRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Analytics platform error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /analytics/tasks — task completion rates by category
router.get('/tasks', async (req, res) => {
  try {
    const tasksByCategory = await prisma.task.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { reward: true },
    });

    const completionByCategory = await Promise.all(
      tasksByCategory.map(async (cat) => {
        const completed = await prisma.taskSubmission.count({
          where: { task: { category: cat.category }, status: 'APPROVED' },
        });
        const total = await prisma.taskSubmission.count({
          where: { task: { category: cat.category } },
        });
        return {
          category: cat.category,
          totalTasks: cat._count.id,
          totalReward: Number(cat._sum.reward || 0),
          completedSubmissions: completed,
          totalSubmissions: total,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );

    res.json({ success: true, data: completionByCategory });
  } catch (error) {
    console.error('Analytics tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task analytics' });
  }
});

// GET /analytics/users — user growth over time
router.get('/users', async (req, res) => {
  try {
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    // Get daily signups for last 30 days
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailySignups = await prisma.$queryRawUnsafe(
      "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= $1 GROUP BY DATE(created_at) ORDER BY date ASC",
      monthAgo
    );

    const totalBanned = await prisma.user.count({ where: { isBanned: true } });
    const totalVerified = await prisma.user.count({ where: { isEmailVerified: true } });

    res.json({
      success: true,
      data: {
        byRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
        dailySignups: dailySignups || [],
        totalBanned, totalVerified,
        totalUsers: usersByRole.reduce((sum, r) => sum + r._count.id, 0),
      },
    });
  } catch (error) {
    console.error('Analytics users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user analytics' });
  }
});

// GET /analytics/revenue — platform fee revenue over time
router.get('/revenue', async (req, res) => {
  try {
    // Daily revenue for last 30 days
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyRevenue = await prisma.$queryRawUnsafe(
      "SELECT DATE(created_at) as date, SUM(fee) as total_fees FROM transactions WHERE created_at >= $1 AND fee > 0 AND status = 'COMPLETED' GROUP BY DATE(created_at) ORDER BY date ASC",
      monthAgo
    );

    const totalFees = await prisma.transaction.aggregate({
      where: { status: 'COMPLETED', fee: { gt: 0 } },
      _sum: { fee: true, amount: true },
    });

    // Revenue by currency
    const byCurrency = await prisma.transaction.groupBy({
      by: ['currency'],
      where: { status: 'COMPLETED', fee: { gt: 0 } },
      _sum: { fee: true, amount: true },
    });

    res.json({
      success: true,
      data: {
        dailyRevenue: dailyRevenue || [],
        totalFees: Number(totalFees._sum.fee || 0),
        totalVolume: Number(totalFees._sum.amount || 0),
        byCurrency: byCurrency.map(c => ({ currency: c.currency, fees: Number(c._sum.fee || 0), volume: Number(c._sum.amount || 0) })),
      },
    });
  } catch (error) {
    console.error('Analytics revenue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue analytics' });
  }
});

module.exports = router;
