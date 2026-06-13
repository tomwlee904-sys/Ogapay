'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Note: This uses a raw query approach since Community might not exist in Prisma schema
// If the Community model exists, replace raw queries with Prisma model calls

// ─── GET /communities — List all communities ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM communities WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      paramIndex++;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex;
    const limitNum = parseInt(limit);
    const offsetNum = (parseInt(page) - 1) * limitNum;
    params.push(limitNum, offsetNum);

    const communities = await prisma.$queryRawUnsafe(query, ...params);
    
    // Get count
    let countQuery = 'SELECT COUNT(*) as count FROM communities WHERE 1=1';
    const countParams = [];
    let ci = 1;
    if (category) {
      countQuery += ` AND category = $${ci++}`;
      countParams.push(category);
    }
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...countParams);
    const total = parseInt(countResult[0]?.count || '0');

    res.json({
      success: true,
      data: communities,
      pagination: { page: parseInt(page), limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Communities list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch communities' });
  }
});

// ─── POST /communities — Create community ───────────────────────────
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { name, description, category, accentColor = '#191C6B', isPrivate = false, imageUrl } = req.body;

    // Check if communities table exists, use raw SQL
    const result = await prisma.$executeRawUnsafe(
      `INSERT INTO communities (id, name, description, category, accent_color, is_private, image_url, creator_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      require('crypto').randomUUID(), name, description, category || 'General',
      accentColor, isPrivate, imageUrl || '', req.user.id
    );

    // Also add creator as member with role OWNER
    await prisma.$executeRawUnsafe(
      `INSERT INTO community_members (id, community_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, 'OWNER', NOW())`,
      require('crypto').randomUUID(), result?.id || '', req.user.id
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Community create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create community' });
  }
});

// ─── GET /communities/mine/list — User's communities ─────────────────
router.get('/mine/list', authenticate, async (req, res) => {
  try {
    const communities = await prisma.$queryRawUnsafe(
      `SELECT c.*, cm.role as member_role
       FROM communities c
       INNER JOIN community_members cm ON cm.community_id = c.id
       WHERE cm.user_id = $1
       ORDER BY cm.joined_at DESC`,
      req.user.id
    );
    res.json({ success: true, data: communities });
  } catch (error) {
    console.error('My communities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch communities' });
  }
});

// ─── GET /communities/:id — Community detail ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const communities = await prisma.$queryRawUnsafe(
      'SELECT * FROM communities WHERE id = $1', req.params.id
    );
    if (!communities.length) return res.status(404).json({ success: false, error: 'Community not found' });
    
    const community = communities[0];
    
    // Get members count
    const members = await prisma.$queryRawUnsafe(
      'SELECT cm.*, u.username, u.avatar_url FROM community_members cm LEFT JOIN users u ON u.id = cm.user_id WHERE cm.community_id = $1 ORDER BY cm.joined_at DESC',
      req.params.id
    );

    res.json({
      success: true,
      data: {
        ...community,
        members: members || [],
        memberCount: members?.length || 0,
      },
    });
  } catch (error) {
    console.error('Community detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch community' });
  }
});

// ─── POST /communities/:id/request — Request to join ─────────────────
router.post('/:id/request', authenticate, async (req, res) => {
  try {
    const communities = await prisma.$queryRawUnsafe(
      'SELECT * FROM communities WHERE id = $1', req.params.id
    );
    if (!communities.length) return res.status(404).json({ success: false, error: 'Community not found' });

    const community = communities[0];

    // Check if already a member
    const existingMembers = await prisma.$queryRawUnsafe(
      'SELECT * FROM community_members WHERE community_id = $1 AND user_id = $2',
      req.params.id, req.user.id
    );
    if (existingMembers.length) {
      return res.status(400).json({ success: false, error: 'You are already a member of this community' });
    }

    const isPublic = !community.is_private;
    
    if (isPublic) {
      // Auto-approve for public communities
      await prisma.$executeRawUnsafe(
        `INSERT INTO community_members (id, community_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, 'MEMBER', NOW())`,
        require('crypto').randomUUID(), req.params.id, req.user.id
      );
      res.json({ success: true, message: 'Joined community', data: { status: 'APPROVED' } });
    } else {
      // Create join request for private communities
      const existingRequest = await prisma.$queryRawUnsafe(
        'SELECT * FROM community_join_requests WHERE community_id = $1 AND user_id = $2 AND status = $3',
        req.params.id, req.user.id, 'PENDING'
      );
      if (existingRequest.length) {
        return res.status(400).json({ success: false, error: 'Join request already pending' });
      }
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO community_join_requests (id, community_id, user_id, message, status, created_at)
         VALUES ($1, $2, $3, $4, 'PENDING', NOW())`,
        require('crypto').randomUUID(), req.params.id, req.user.id, req.body.message || ''
      );
      res.json({ success: true, message: 'Join request sent', data: { status: 'PENDING' } });
    }
  } catch (error) {
    console.error('Community join request error:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// ─── POST /communities/:id/posts — Create post ──────────────────────
router.post('/:id/posts', authenticate, [
  body('content').trim().notEmpty().withMessage('Content is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    // Check membership
    const members = await prisma.$queryRawUnsafe(
      'SELECT * FROM community_members WHERE community_id = $1 AND user_id = $2',
      req.params.id, req.user.id
    );
    if (!members.length) {
      return res.status(403).json({ success: false, error: 'You must be a member to post' });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO community_posts (id, community_id, user_id, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      require('crypto').randomUUID(), req.params.id, req.user.id, req.body.content
    );

    res.status(201).json({ success: true, message: 'Post created' });
  } catch (error) {
    console.error('Community post error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// ─── GET /communities/:id/posts — List posts ────────────────────────
router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await prisma.$queryRawUnsafe(
      `SELECT cp.*, u.username, u.avatar_url
       FROM community_posts cp
       LEFT JOIN users u ON u.id = cp.user_id
       WHERE cp.community_id = $1
       ORDER BY cp.created_at DESC`,
      req.params.id
    );
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Community posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

module.exports = router;
