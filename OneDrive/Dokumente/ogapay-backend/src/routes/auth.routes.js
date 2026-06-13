'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { sendEmail, emailTemplates } = require('../utils/email');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'ogapay-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── POST /auth/signup ───────────────────────────────────────────────
router.post('/signup', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('username').isAlphanumeric().trim().escape().isLength({ min: 3 }).withMessage('Username must be alphanumeric, at least 3 characters'),
  body('referralCode').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { email, password, firstName, lastName, username, referralCode } = req.body;

    // Check existing
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(409).json({ success: false, error: 'Email already registered' });

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) return res.status(409).json({ success: false, error: 'Username already taken' });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateReferralCode();

    // Find referrer
    let referredBy = null;
    if (referralCode) {
      referredBy = await prisma.user.findUnique({ where: { referralCode } });
    }

    // Create user + wallet atomically
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          username,
          referralCode: code,
          referredById: referredBy?.id || null,
          role: 'WORKER',
          isEmailVerified: false,
        },
      });

      // Create default NGN wallet
      await tx.wallet.create({
        data: { userId: newUser.id, currency: 'NGN', balance: 0 },
      });

      return newUser;
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: refreshExpires,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
      },
    });

        // Send verification email
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerify = crypto.createHash('sha256').update(verifyToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: hashedVerify, verifyTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendEmail({
      to: email,
      ...emailTemplates.verifyEmail(firstName || username, `${FRONTEND_URL}/verify-email?token=${verifyToken}`),
    }).catch(err => console.error('Failed to send verification email:', err.message));

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          referralCode: user.referralCode,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: 'Failed to create account' });
  }
});

// ─── POST /auth/login ────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (user.isBanned) return res.status(403).json({ success: false, error: 'Account has been suspended' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: refreshExpires,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role,
          referralCode: user.referralCode,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

// ─── POST /auth/logout ───────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { token: hashed } });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// ─── GET /auth/me ────────────────────────────────────────────────────
async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true, email: true, firstName: true, lastName: true, username: true,
        avatarUrl: true, role: true, referralCode: true, isEmailVerified: true,
        isBanned: true, twitter: true, telegram: true, discord: true, website: true,
        createdAt: true,
        wallets: { select: { currency: true, balance: true } },
        _count: { select: { tasksCreated: true, taskSubmissions: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ success: false, error: 'Account suspended' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// ─── POST /auth/refresh ──────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Check token exists in DB
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ success: false, error: 'Refresh token expired or revoked' });
    }

    // Generate new access token
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const accessToken = generateAccessToken(user);

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

// ─── POST /auth/forgot-password ─────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email is registered, a reset link will be sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt,
      },
    });

    // In production, send actual email here
    await sendEmail({
        to: email,
        ...emailTemplates.resetPassword(user.firstName || user.username, `${FRONTEND_URL}/reset-password?token=${resetToken}`),
      }).catch(err => console.error('Failed to send reset email:', err.message));

    res.json({ success: true, message: 'If that email is registered, a reset link will be sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// ─── POST /auth/reset-password ──────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

module.exports = router;
