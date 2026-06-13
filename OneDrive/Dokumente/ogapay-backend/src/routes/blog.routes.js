'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /blog — list published posts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const where = { status: 'PUBLISHED' };
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { author: { select: { id: true, username: true, avatarUrl: true, firstName: true } } },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      success: true, data: posts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Blog list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// GET /blog/:slug — single post
router.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, username: true, avatarUrl: true, firstName: true, lastName: true } } },
    });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    // Increment view count
    await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

    res.json({ success: true, data: { ...post, viewCount: post.viewCount + 1 } });
  } catch (error) {
    console.error('Blog detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// POST /blog — create post (admin only)
router.post('/', authenticate, requireAdmin, [
  body('title').trim().notEmpty(),
  body('content').trim().notEmpty(),
  body('category').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { title, content, category, excerpt, tags, coverImage, coverColor, status = 'DRAFT' } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

    const post = await prisma.post.create({
      data: { title, slug, content, category, excerpt: excerpt || '', tags: tags || '', coverImage, coverColor, status, authorId: req.user.id, publishedAt: status === 'PUBLISHED' ? new Date() : null },
    });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Blog create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// PATCH /blog/:id — edit post (admin only)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'content', 'category', 'excerpt', 'tags', 'coverImage', 'coverColor', 'status'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.status === 'PUBLISHED') update.publishedAt = new Date();

    const post = await prisma.post.update({ where: { id: req.params.id }, data: update });
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Blog update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// DELETE /blog/:id — delete post (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Blog delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

module.exports = router;
