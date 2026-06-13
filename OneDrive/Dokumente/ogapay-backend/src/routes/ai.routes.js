'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const OpenAI = require('openai');

// ─── AI helper ───────────────────────────────────────────────────────
function getAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function fallbackResponse(type, input) {
  const fallbacks = {
    description: "Complete this task carefully following the instructions provided. Make sure to read all requirements before starting. Submit your proof once done.",
    reward: { min: 500, max: 2000, currency: "NGN", suggested: 1000 },
    proof: { score: 70, feedback: "Your proof was submitted. Make sure it clearly shows completion of all required steps.", passed: true },
  };
  return fallbacks[type] || fallbacks.description;
}

// ─── POST /ai/generate-task-description ──────────────────────────────
router.post('/generate-task-description', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

  try {
    const { title, category, instructions } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({
        success: true,
        data: { description: fallbackResponse('description', { title, category }) },
        source: 'fallback',
      });
    }

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a task description generator for a gig platform. Write clear, detailed task descriptions.' },
        { role: 'user', content: `Generate a task description for: Title="${title}", Category="${category}"${instructions ? `, Instructions="${instructions}"` : ''}. Keep it 2-4 sentences.` },
      ],
      max_tokens: 200,
    });

    const description = completion.choices[0]?.message?.content?.trim() || fallbackResponse('description', { title, category });
    res.json({ success: true, data: { description }, source: 'ai' });
  } catch (error) {
    console.error('AI description error:', error.message);
    res.json({ success: true, data: { description: fallbackResponse('description', req.body) }, source: 'fallback' });
  }
});

// ─── POST /ai/suggest-reward ────────────────────────────────────────
router.post('/suggest-reward', authenticate, [
  body('category').trim().notEmpty(),
  body('description').trim().notEmpty(),
], async (req, res) => {
  try {
    const { category, description } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({ success: true, data: fallbackResponse('reward', { category, description }), source: 'fallback' });
    }

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You suggest fair reward ranges for gig platform tasks in NGN.' },
        { role: 'user', content: `Suggest a reward range (min and max in NGN) for: Category="${category}", Description="${description.substring(0, 200)}". Respond with JSON: { "min": number, "max": number, "currency": "NGN", "suggested": number }` },
      ],
      max_tokens: 150,
    });

    let data;
    try {
      data = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch {
      data = fallbackResponse('reward', { category, description });
    }

    res.json({ success: true, data, source: 'ai' });
  } catch (error) {
    console.error('AI reward error:', error.message);
    res.json({ success: true, data: fallbackResponse('reward', req.body), source: 'fallback' });
  }
});

// ─── POST /ai/check-proof ──────────────────────────────────────────
router.post('/check-proof', authenticate, [
  body('proofText').trim().notEmpty().withMessage('Proof text is required'),
  body('taskTitle').optional().trim(),
], async (req, res) => {
  try {
    const { proofText, taskTitle } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({ success: true, data: fallbackResponse('proof', { proofText, taskTitle }), source: 'fallback' });
    }

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You check if proof text is adequate for a task submission. Score 0-100.' },
        { role: 'user', content: `Task: "${taskTitle || 'Task'}"\nProof: "${proofText.substring(0, 500)}"\nRespond JSON: { "score": number, "feedback": string, "passed": boolean }` },
      ],
      max_tokens: 150,
    });

    let data;
    try {
      data = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch {
      data = fallbackResponse('proof', { proofText, taskTitle });
    }

    res.json({ success: true, data, source: 'ai' });
  } catch (error) {
    console.error('AI proof check error:', error.message);
    res.json({ success: true, data: fallbackResponse('proof', req.body), source: 'fallback' });
  }
});

module.exports = router;
