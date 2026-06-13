'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /messages/conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { has: req.user.id } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// GET /messages/:conversationId
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: req.params.conversationId } });
    if (!conv || !conv.participants.includes(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /messages/:userId — send message
router.post('/:userId', authenticate, [
  body('content').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot message yourself' });
    }

    // Find or create conversation
    const participants = [req.user.id, req.params.userId].sort();
    let conversation = await prisma.conversation.findFirst({
      where: { participants: { equals: participants } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({ data: { participants } });
    }

    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: req.user.id, content: req.body.content },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: req.body.content, lastSenderId: req.user.id, updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PATCH /messages/:messageId/read
router.patch('/:messageId/read', authenticate, async (req, res) => {
  try {
    await prisma.message.update({ where: { id: req.params.messageId }, data: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error('Message read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

module.exports = router;
