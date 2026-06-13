'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// In-memory settings store (replace with DB table if settings grow)
const defaultSettings = {
  platformName: 'OgaPay',
  minWithdrawal: 100,
  maxWithdrawal: 1000000,
  supportedCurrencies: ['NGN', 'USDC', 'USDT'],
  feePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '10'),
  minTaskReward: 100,
  maxTaskWorkers: 1000,
  maintenanceMode: false,
};

let settings = { ...defaultSettings };

// GET /platform/settings — public platform settings
router.get('/settings', async (req, res) => {
  const publicSettings = {
    platformName: settings.platformName,
    minWithdrawal: settings.minWithdrawal,
    maxWithdrawal: settings.maxWithdrawal,
    supportedCurrencies: settings.supportedCurrencies,
    feePercent: settings.feePercent,
    minTaskReward: settings.minTaskReward,
    maintenanceMode: settings.maintenanceMode,
  };
  res.json({ success: true, data: publicSettings });
});

// PATCH /platform/settings — admin only, update settings
router.patch('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowed = ['platformName', 'minWithdrawal', 'maxWithdrawal', 'supportedCurrencies', 'feePercent', 'minTaskReward', 'maxTaskWorkers', 'maintenanceMode'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    }
    res.json({ success: true, message: 'Settings updated', data: settings });
  } catch (error) {
    console.error('Platform settings update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// GET /platform/health — system health status
router.get('/health', async (req, res) => {
  try {
    // Check DB connectivity
    await prisma.$queryRawUnsafe('SELECT 1');

    const dbStatus = { status: 'healthy', latency: 0 };
    const start = Date.now();
    await prisma.user.count();
    dbStatus.latency = Date.now() - start;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;
