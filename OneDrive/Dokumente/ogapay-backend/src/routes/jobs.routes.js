const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API = `/api/${process.env.API_VERSION || 'v1'}`;

// ─── GET /jobs — Browse active jobs ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { status: 'active' };
    if (type) where.jobType = type;
    if (search) {
      where.OR = [
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.jobListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.jobListing.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});

// ─── GET /jobs/:id — Single job detail ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await prisma.jobListing.findUnique({
      where: { id: req.params.id },
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Job detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job' });
  }
});

// ─── POST /jobs — Post a new job (authenticated) ────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      jobTitle, companyName, companyLogoUrl, jobType,
      location, salaryRange, jobDescription, requirements,
      applicationLink, applicationDeadline,
    } = req.body;

    if (!jobTitle || !companyName || !jobType || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: jobTitle, companyName, jobType, jobDescription',
      });
    }

    const validTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];
    if (!validTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid jobType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const job = await prisma.jobListing.create({
      data: {
        employerId: req.user.id,
        jobTitle,
        companyName,
        companyLogoUrl,
        jobType,
        location,
        salaryRange,
        jobDescription,
        requirements,
        applicationLink,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        status: 'active',
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('Job create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create job listing' });
  }
});

// ─── PUT /jobs/:id — Update job (owner only) ────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.jobListing.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (existing.employerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowed = [
      'jobTitle', 'companyName', 'companyLogoUrl', 'jobType',
      'location', 'salaryRange', 'jobDescription', 'requirements',
      'applicationLink', 'applicationDeadline', 'status',
    ];

    const data = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === 'applicationDeadline') {
          data[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          data[field] = req.body[field];
        }
      }
    }

    const job = await prisma.jobListing.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update job listing' });
  }
});

// ─── DELETE /jobs/:id — Delete job (owner only) ─────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.jobListing.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (existing.employerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.jobListing.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Job listing deleted' });
  } catch (error) {
    console.error('Job delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete job listing' });
  }
});

// ─── GET /jobs/my — My job listings (authenticated) ─────────────────
router.get('/my/listings', authenticate, async (req, res) => {
  try {
    const jobs = await prisma.jobListing.findMany({
      where: { employerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('My jobs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch my listings' });
  }
});

module.exports = router;
