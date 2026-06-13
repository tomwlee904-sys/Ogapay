'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /notifications — List notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    const total = await prisma.notification.count({ where: { userId: req.user.id } });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    // Map to include link from data field for frontend
    const mapped = notifications.map(n => ({
      ...n,
      link: n.data?.link || null,
    }));
    res.json({ success: true, data: mapped, total, unreadCount });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// PATCH /notifications/:id/read — Mark one notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });
    if (notif.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Not authorized' });

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

// PATCH /notifications/read-all — Mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Notifications mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

// GET /notifications/unread/count — Get unread count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

module.exports = router;
