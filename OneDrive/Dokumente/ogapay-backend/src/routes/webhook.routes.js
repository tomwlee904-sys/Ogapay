'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All webhook routes MUST be raw body before express.json()
// This route is mounted BEFORE express.json() in index.js

// ─── POST /webhooks/paystack ────────────────────────────────────────
router.post('/paystack', async (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    
    if (secret) {
      const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
      if (hash !== signature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount / 100; // Paystack returns amount in kobo
      const currency = event.data.currency;
      const email = event.data.customer.email;

      // Check idempotency
      const existing = await prisma.transaction.findFirst({
        where: { reference, status: 'COMPLETED' },
      });
      if (existing) return res.sendStatus(200);

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.sendStatus(200); // Acknowledge but don't process

      // Process deposit atomically
      await prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findFirst({
          where: { userId: user.id, currency },
        });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: user.id, currency, balance: 0 },
          });
        }

        const balanceBefore = Number(wallet.balance);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            walletId: wallet.id,
            amount,
            currency,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            description: `Wallet funded via Paystack`,
            reference,
            balanceBefore,
            balanceAfter: balanceBefore + amount,
          },
        });
      });

      // Notify user
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT',
            title: 'Wallet Funded',
            body: `Your wallet has been funded with ${amount} ${currency}`,
            data: { link: '/wallet' },
            isRead: false,
          },
        });
      } catch {}
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.sendStatus(200); // Always 200 to prevent retries
  }
});

// ─── POST /webhooks/flutterwave ─────────────────────────────────────
router.post('/flutterwave', async (req, res) => {
  try {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY || '';
    if (secret) {
      const signature = req.headers['verif-hash'];
      if (signature !== secret) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    
    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const reference = event.data.tx_ref;
      const amount = parseFloat(event.data.amount);
      const currency = event.data.currency;
      const email = event.data.customer.email;

      const existing = await prisma.transaction.findFirst({
        where: { reference, status: 'COMPLETED' },
      });
      if (existing) return res.sendStatus(200);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.sendStatus(200);

      await prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findFirst({
          where: { userId: user.id, currency },
        });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: user.id, currency, balance: 0 },
          });
        }

        const balanceBefore = Number(wallet.balance);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            walletId: wallet.id,
            amount,
            currency,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            description: `Wallet funded via Flutterwave`,
            reference,
            balanceBefore,
            balanceAfter: balanceBefore + amount,
          },
        });
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    res.sendStatus(200);
  }
});

module.exports = router;
