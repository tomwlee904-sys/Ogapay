'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /campaigns — list active promotional campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: { in: ['ACTIVE', 'DRAFT'] } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { campaignJoins: true } } },
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Campaigns list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

// POST /campaigns — admin only, create campaign
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty(),
  body('platform').trim().notEmpty(),
  body('budget').isFloat({ min: 0 }),
  body('duration').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { name, platform, budget, duration, targetAudience } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        userId: req.user.id, name, platform,
        budget: parseFloat(budget), duration,
        targetAudience: targetAudience || '',
        currency: 'NGN', status: 'ACTIVE',
      },
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// POST /campaigns/:id/join — user joins campaign
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    if (campaign.status !== 'ACTIVE') return res.status(400).json({ success: false, error: 'Campaign is not active' });

    // Check if already joined
    const existing = await prisma.campaignJoin.findFirst({
      where: { campaignId: req.params.id, userId: req.user.id },
    });
    if (existing) return res.status(400).json({ success: false, error: 'Already joined this campaign' });

    const join = await prisma.campaignJoin.create({
      data: { campaignId: req.params.id, userId: req.user.id },
    });
    res.status(201).json({ success: true, data: join });
  } catch (error) {
    console.error('Campaign join error:', error);
    res.status(500).json({ success: false, error: 'Failed to join campaign' });
  }
});

// GET /campaigns/:id/leaderboard — campaign-specific leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    // Aggregate earnings from tasks related to the campaign
    const earnings = await prisma.transaction.groupBy({
      by: ['userId'],
      where: { type: 'TASK_PAYMENT', status: 'COMPLETED' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 20,
    });

    const userIds = earnings.map(e => e.userId);
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, avatarUrl: true, firstName: true } })
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const leaderboard = earnings.map(e => ({
      ...userMap[e.userId],
      totalEarned: Number(e._sum.amount || 0),
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Campaign leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// PATCH /campaigns/:id/close — admin only, close campaign
router.patch('/:id/close', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });
    res.json({ success: true, message: 'Campaign closed' });
  } catch (error) {
    console.error('Campaign close error:', error);
    res.status(500).json({ success: false, error: 'Failed to close campaign' });
  }
});

module.exports = router;
