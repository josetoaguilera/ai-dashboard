import express from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = express.Router();

// Get all conversations with pagination and filters
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['OPEN', 'CLOSED']),
  query('channel').optional().isIn(['WEB', 'WHATSAPP', 'INSTAGRAM']),
  query('minRating').optional().isInt({ min: 1, max: 5 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      userId: req.user!.id
    };

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.channel) {
      where.channel = req.query.channel;
    }

    if (req.query.minRating) {
      where.rating = {
        gte: parseInt(req.query.minRating as string)
      };
    }

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) {
        where.createdAt.gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        where.createdAt.lte = new Date(req.query.endDate as string);
      }
    }

    // Get conversations with message count
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.conversation.count({ where })
    ]);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single conversation with messages
router.get('/:id', [
  authenticateToken,
  param('id').isUUID()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      },
      include: {
        messages: {
          include: {
            prompt: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation
router.post('/', [
  authenticateToken,
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('channel').optional().isIn(['WEB', 'WHATSAPP', 'INSTAGRAM'])
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, channel = 'WEB' } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.id,
        title,
        channel,
        status: 'OPEN'
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation (rating, status, title)
router.patch('/:id', [
  authenticateToken,
  param('id').isUUID(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('status').optional().isIn(['OPEN', 'CLOSED']),
  body('title').optional().trim().isLength({ min: 1, max: 200 })
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if conversation exists and belongs to user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updateData: any = {};
    if (req.body.rating !== undefined) updateData.rating = req.body.rating;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.title !== undefined) updateData.title = req.body.title;

    // Calculate duration if closing conversation
    if (req.body.status === 'CLOSED' && existingConversation.status === 'OPEN') {
      const durationMs = Date.now() - existingConversation.createdAt.getTime();
      updateData.durationSeconds = Math.floor(durationMs / 1000);
    }

    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({ conversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete conversation
router.delete('/:id', [
  authenticateToken,
  param('id').isUUID()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if conversation exists and belongs to user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await prisma.conversation.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;