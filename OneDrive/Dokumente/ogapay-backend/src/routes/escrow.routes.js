'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /escrow/hold — lock reward amount from poster's wallet
router.post('/hold', authenticate, [
  body('taskId').notEmpty().withMessage('Task ID is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { taskId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.posterId !== req.user.id) return res.status(403).json({ success: false, error: 'Only the task creator can escrow' });
    if (task.escrowed) return res.status(400).json({ success: false, error: 'Already escrowed' });

    const amount = Number(task.reward);

    // Check poster's wallet
    const wallet = await prisma.wallet.findFirst({
      where: { userId: req.user.id, currency: task.currency },
    });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance to escrow' });
    }

    await prisma.$transaction(async (tx) => {
      // Lock funds by decrementing available balance and incrementing locked
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lockedBalance: { increment: amount },
        },
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          escrowed: true,
          escrowTxId: `ESCROW-${Date.now()}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: req.user.id,
          walletId: wallet.id,
          amount,
          currency: task.currency,
          type: 'TASK_PAYMENT',
          status: 'COMPLETED',
          description: `Escrowed funds for task "${task.title}"`,
          reference: `ESCROW-${taskId}-${Date.now()}`,
          balanceBefore: Number(wallet.balance),
          balanceAfter: Number(wallet.balance) - amount,
        },
      });
    });

    res.json({ success: true, message: 'Funds escrowed', data: { taskId, amount } });
  } catch (error) {
    console.error('Escrow hold error:', error);
    res.status(500).json({ success: false, error: 'Failed to escrow funds' });
  }
});

// POST /escrow/release/:taskId — release held funds to worker on approval
router.post('/release/:taskId', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { submissions: { where: { status: 'APPROVED' }, take: 1 } },
    });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (!task.escrowed) return res.status(400).json({ success: false, error: 'Task is not escrowed' });
    if (task.posterId !== req.user.id) return res.status(403).json({ success: false, error: 'Only the task creator can release' });

    const approvedSubmission = task.submissions[0];
    if (!approvedSubmission) return res.status(400).json({ success: false, error: 'No approved submission found' });

    const amount = Number(task.reward);
    const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    const feeAmount = (amount * PLATFORM_FEE_PERCENT) / 100;
    const workerAmount = amount - feeAmount;

    await prisma.$transaction(async (tx) => {
      // Release from poster's locked balance
      const posterWallet = await tx.wallet.findFirst({
        where: { userId: task.posterId, currency: task.currency },
      });
      if (posterWallet) {
        await tx.wallet.update({
          where: { id: posterWallet.id },
          data: { lockedBalance: { decrement: amount } },
        });
      }

      // Credit worker
      let workerWallet = await tx.wallet.findFirst({
        where: { userId: approvedSubmission.workerId, currency: task.currency },
      });
      if (!workerWallet) {
        workerWallet = await tx.wallet.create({
          data: { userId: approvedSubmission.workerId, currency: task.currency, balance: 0 },
        });
      }
      const workerBalBefore = Number(workerWallet.balance);
      await tx.wallet.update({
        where: { id: workerWallet.id },
        data: { balance: { increment: workerAmount } },
      });

      // Record platform fee
      if (feeAmount > 0) {
        let vaultWallet = await tx.wallet.findFirst({ where: { userId: 'PLATFORM', currency: task.currency } });
        if (!vaultWallet) {
          vaultWallet = await tx.wallet.create({
            data: { userId: 'PLATFORM', currency: task.currency, balance: 0 },
          });
        }
        await tx.wallet.update({
          where: { id: vaultWallet.id },
          data: { balance: { increment: feeAmount } },
        });
      }

      // Worker transaction
      await tx.transaction.create({
        data: {
          userId: approvedSubmission.workerId,
          walletId: workerWallet.id,
          amount: workerAmount,
          fee: feeAmount,
          currency: task.currency,
          type: 'TASK_PAYMENT',
          status: 'COMPLETED',
          description: `Reward for completing "${task.title}" (${PLATFORM_FEE_PERCENT}% fee deducted)`,
          reference: `RELEASE-${task.id}-${Date.now()}`,
          balanceBefore: workerBalBefore,
          balanceAfter: workerBalBefore + workerAmount,
          taskId: task.id,
        },
      });

      // Mark escrow as released
      await tx.task.update({
        where: { id: task.id },
        data: { escrowed: false, platformFee: feeAmount },
      });
    });

    res.json({ success: true, message: 'Funds released', data: { workerAmount, fee: (amount * parseFloat(process.env.PLATFORM_FEE_PERCENT || '10')) / 100 } });
  } catch (error) {
    console.error('Escrow release error:', error);
    res.status(500).json({ success: false, error: 'Failed to release funds' });
  }
});

// POST /escrow/refund/:taskId — refund held funds to poster on cancellation
router.post('/refund/:taskId', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (!task.escrowed) return res.status(400).json({ success: false, error: 'Task is not escrowed' });
    if (task.posterId !== req.user.id) return res.status(403).json({ success: false, error: 'Only the task creator can refund' });

    const amount = Number(task.reward);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: { userId: task.posterId, currency: task.currency },
      });
      const lockedBal = Number(wallet?.lockedBalance || 0);
      if (lockedBal < amount) throw new Error('Insufficient locked balance');

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: { decrement: amount },
          balance: { increment: amount },
        },
      });

      await tx.task.update({
        where: { id: task.id },
        data: { escrowed: false, status: 'CANCELLED' },
      });
    });

    res.json({ success: true, message: 'Funds refunded' });
  } catch (error) {
    console.error('Escrow refund error:', error);
    res.status(500).json({ success: false, error: 'Failed to refund funds' });
  }
});

module.exports = router;
