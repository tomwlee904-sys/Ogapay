'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── GET /leaderboard — Top earners + top completers ────────────────
router.get('/', async (req, res) => {
  try {
    const { period = 'all', limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);

    // Calculate date filter based on period
    let dateFilter = '';
    if (['weekly', 'week', 'Weekly'].includes(period)) {
      dateFilter = "AND ts.submitted_at >= NOW() - INTERVAL '7 days'";
    } else if (['monthly', 'month', 'Monthly'].includes(period)) {
      dateFilter = "AND ts.submitted_at >= NOW() - INTERVAL '30 days'";
    }

    // Top earners — use raw SQL to aggregate reward from joined tasks
    const topEarners = await prisma.$queryRawUnsafe(`
      SELECT
        ts.worker_id AS "workerId",
        COALESCE(SUM(t.reward), 0) AS "totalEarned",
        COUNT(*) AS "tasksCompleted"
      FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      WHERE ts.status = 'APPROVED'
        ${dateFilter}
      GROUP BY ts.worker_id
      ORDER BY "totalEarned" DESC
      LIMIT $1
    `, limitNum);

    // Top completers
    const topCompleters = await prisma.$queryRawUnsafe(`
      SELECT
        ts.worker_id AS "workerId",
        COUNT(*) AS "tasksCompleted",
        COALESCE(SUM(t.reward), 0) AS "totalEarned"
      FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      WHERE ts.status = 'APPROVED'
        ${dateFilter}
      GROUP BY ts.worker_id
      ORDER BY "tasksCompleted" DESC
      LIMIT $1
    `, limitNum);

    // Get unique worker IDs
    const earnerIds = [...new Set([
      ...topEarners.map((e) => e.workerId),
      ...topCompleters.map((e) => e.workerId),
    ])];

    // Fetch user details
    const users = earnerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: earnerIds } },
          select: {
            id: true, username: true, firstName: true, lastName: true,
            avatarUrl: true,
            workerProfile: { select: { totalEarned: true, tasksCompleted: true } },
          },
        })
      : [];

    const userMap = {};
    users.forEach((u) => { userMap[u.id] = u; });

    const formatEntry = (raw) => ({
      id: raw.workerId,
      ...userMap[raw.workerId],
      totalEarned: Number(raw.totalEarned),
      tasksCompleted: Number(raw.tasksCompleted),
    });

    res.json({
      success: true,
      data: {
        topEarners: topEarners.map(formatEntry),
        topCompleters: topCompleters.map(formatEntry),
        period,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// ─── GET /leaderboard/me — Current user's rank and stats ────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's own stats
    const [ownStats, allEarners] = await Promise.all([
      prisma.taskSubmission.aggregate({
        where: { workerId: userId, status: 'APPROVED' },
        _count: { id: true },
      }),
      prisma.$queryRawUnsafe(`
        SELECT
          ts.worker_id AS "workerId",
          COALESCE(SUM(t.reward), 0) AS "totalEarned",
          COUNT(*) AS "tasksCompleted"
        FROM task_submissions ts
        JOIN tasks t ON t.id = ts.task_id
        WHERE ts.status = 'APPROVED'
        GROUP BY ts.worker_id
        ORDER BY "totalEarned" DESC
      `),
    ]);

    // Find current user's rank by earnings
    const userEntry = allEarners.find(e => e.workerId === userId);
    const rank = userEntry ? allEarners.indexOf(userEntry) + 1 : null;

    // Get user's worker profile for reputation score
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId },
      select: { totalEarned: true, tasksCompleted: true, reputationScore: true },
    });

    const totalEarned = Number(userEntry?.totalEarned || workerProfile?.totalEarned || 0);
    const tasksCompleted = Number(userEntry?.tasksCompleted || workerProfile?.tasksCompleted || 0);

    res.json({
      success: true,
      data: {
        rank,
        totalEarned,
        tasksCompleted,
        reputationScore: workerProfile?.reputationScore || 0,
        totalParticipants: allEarners.length,
        // Frontend expects `profile` sub-object
        profile: { totalEarned, tasksCompleted, reputationScore: workerProfile?.reputationScore || 0 },
      },
    });
  } catch (error) {
    console.error('Leaderboard/me error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your rank' });
  }
});

module.exports = router;
