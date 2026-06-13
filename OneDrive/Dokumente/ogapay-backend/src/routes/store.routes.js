'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { createUpload, getMulterErrorMessage } = require('../middleware/upload');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── GET /store — List products ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20, sort } = req.query;
    const where = { isActive: true, status: { not: 'DRAFT' } };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };

    const [items, total] = await Promise.all([
      prisma.storeItem.findMany({
        where,
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          seller: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { purchases: true, reviews: true } },
        },
      }),
      prisma.storeItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Store list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// ─── GET /store/:id — Product detail ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.storeItem.findUnique({
      where: { id: req.params.id },
      include: {
        seller: { select: { id: true, username: true, avatarUrl: true, firstName: true } },
        _count: { select: { purchases: true, reviews: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Store detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// ─── POST /store — Create product ────────────────────────────────────
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('currency').optional().isIn(['NGN', 'USDC', 'USDT', 'ETH', 'MATIC', 'SOL']).withMessage('Invalid currency'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { name, description, price, category, currency, imageUrl, stock } = req.body;

    const item = await prisma.storeItem.create({
      data: {
        sellerId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        currency: (currency || 'NGN').toUpperCase(),
        category,
        imageUrl: imageUrl || '',
        stock: stock ? parseInt(stock) : null,
        status: 'PUBLISHED',
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Store create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// ─── PATCH /store/:id — Update own product ──────────────────────────
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.storeItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Product not found' });
    if (item.sellerId !== req.user.id) return res.status(403).json({ success: false, error: 'Only the seller can update this product' });

    const allowed = ['name', 'description', 'price', 'category', 'imageUrl', 'stock', 'status'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const updated = await prisma.storeItem.update({
      where: { id: req.params.id },
      data: update,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Store update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// ─── DELETE /store/:id — Delete own product ─────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.storeItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Product not found' });
    if (item.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await prisma.storeItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Store delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// ─── POST /store/:id/purchase — Purchase product ─────────────────────
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const item = await prisma.storeItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Product not found' });
    if (!item.isActive) return res.status(400).json({ success: false, error: 'Product is not available' });
    if (item.sellerId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot purchase your own product' });
    }

    const price = Number(item.price);

    // Check buyer's wallet
    const buyerWallet = await prisma.wallet.findFirst({
      where: { userId: req.user.id, currency: item.currency },
    });
    if (!buyerWallet || Number(buyerWallet.balance) < price) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Atomic purchase
    await prisma.$transaction(async (tx) => {
      // Deduct from buyer
      const buyerBal = Number(buyerWallet.balance);
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balance: { decrement: price } },
      });
      await tx.transaction.create({
        data: {
          userId: req.user.id,
          walletId: buyerWallet.id,
          amount: price,
          currency: item.currency,
          type: 'STORE_PURCHASE',
          status: 'COMPLETED',
          description: `Purchased "${item.name}"`,
          reference: `PURCHASE-${Date.now()}-${req.user.id.slice(0, 8)}`,
          balanceBefore: buyerBal,
          balanceAfter: buyerBal - price,
        },
      });

      // Credit seller
      if (item.sellerId) {
        let sellerWallet = await tx.wallet.findFirst({
          where: { userId: item.sellerId, currency: item.currency },
        });
        if (!sellerWallet) {
          sellerWallet = await tx.wallet.create({
            data: { userId: item.sellerId, currency: item.currency, balance: 0 },
          });
        }
        const sellerBal = Number(sellerWallet.balance);
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { balance: { increment: price } },
        });
        await tx.transaction.create({
          data: {
            userId: item.sellerId,
            walletId: sellerWallet.id,
            amount: price,
            currency: item.currency,
            type: 'TASK_PAYMENT',
            status: 'COMPLETED',
            description: `Sale of "${item.name}"`,
            reference: `SALE-${Date.now()}-${item.sellerId.slice(0, 8)}`,
            balanceBefore: sellerBal,
            balanceAfter: sellerBal + price,
          },
        });
      }

      // Create purchase record
      await tx.storePurchase.create({
        data: {
          userId: req.user.id,
          itemId: item.id,
          quantity: 1,
          totalPrice: price,
          currency: item.currency,
          status: 'COMPLETED',
        },
      });
    });

    res.json({ success: true, message: 'Purchase successful' });
  } catch (error) {
    console.error('Store purchase error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete purchase' });
  }
});

// ─── GET /store/:id/reviews — List reviews ──────────────────────────
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await prisma.storeReview.findMany({
      where: { itemId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Store reviews error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// ─── POST /store/:id/reviews — Submit review ────────────────────────
router.post('/:id/reviews', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    // Check user actually purchased this item
    const purchase = await prisma.storePurchase.findFirst({
      where: { userId: req.user.id, itemId: req.params.id, status: 'COMPLETED' },
    });
    if (!purchase) {
      return res.status(403).json({ success: false, error: 'You must purchase this item before reviewing' });
    }

    // Check not already reviewed
    const existing = await prisma.storeReview.findUnique({
      where: { itemId_userId: { itemId: req.params.id, userId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already reviewed this item' });
    }

    const review = await prisma.storeReview.create({
      data: {
        itemId: req.params.id,
        userId: req.user.id,
        rating: parseInt(req.body.rating),
        comment: req.body.comment || '',
      },
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Store review error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

module.exports = router;
