import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = express.Router();

// Get dashboard KPIs
router.get('/kpis', [
  authenticateToken,
  query('period').optional().isIn(['today', 'week', 'month'])
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const period = (req.query?.period as string) || 'week';
    const userId = req.user!.id;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        startDate = monthAgo;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get conversations in period
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      include: {
        messages: {
          where: {
            role: 'ASSISTANT'
          },
          select: {
            responseTimeMs: true
          }
        }
      }
    });

    const totalConversations = conversations.length;
    const satisfactoryConversations = conversations.filter(c => c.rating && c.rating >= 4).length;
    const satisfactionRate = totalConversations > 0 
      ? Math.round((satisfactoryConversations / totalConversations) * 100) 
      : 0;

    // Calculate average response time
    const allResponseTimes = conversations.flatMap(c => 
      c.messages.map(m => m.responseTimeMs).filter((time: number | null): time is number => time !== null)
    );
    const avgResponseTime = allResponseTimes.length > 0
      ? Math.round(allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length / 1000)
      : 0;

    res.json({
      totalConversations,
      satisfactionRate,
      avgResponseTimeSeconds: avgResponseTime
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversations trend data
router.get('/trend', [
  authenticateToken,
  query('days').optional().isInt({ min: 1, max: 90 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const days = parseInt(req.query?.days as string) || 30;
    const userId = req.user!.id;

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);

    // Get daily conversation counts
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true
      }
    });

    // Group by date
    const trendData: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = conversations.filter(c => {
        const convDate = c.createdAt.toISOString().split('T')[0];
        return convDate === dateStr;
      }).length;

      trendData.push({ date: dateStr, count });
    }

    res.json({ trend: trendData });
  } catch (error) {
    console.error('Get trend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rating distribution
router.get('/ratings', [
  authenticateToken
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        rating: { not: null }
      },
      select: {
        rating: true
      }
    });

    const distribution = [1, 2, 3, 4, 5].map(rating => {
      const count = conversations.filter(c => c.rating === rating).length;
      const percentage = conversations.length > 0 
        ? Math.round((count / conversations.length) * 100)
        : 0;
      
      return { rating, count, percentage };
    });

    res.json({ distribution });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get channel distribution
router.get('/channels', [
  authenticateToken
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const channels = await prisma.conversation.groupBy({
      by: ['channel'],
      where: { userId },
      _count: {
        channel: true
      }
    });

    const total = channels.reduce((sum, ch) => sum + ch._count.channel, 0);
    
    const distribution = channels.map(ch => ({
      channel: ch.channel,
      count: ch._count.channel,
      percentage: total > 0 ? Math.round((ch._count.channel / total) * 100) : 0
    }));

    res.json({ distribution });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top worst-performing prompts
router.get('/worst-prompts', [
  authenticateToken,
  query('limit').optional().isInt({ min: 1, max: 20 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query?.limit as string) || 5;
    const userId = req.user!.id;

    // Get conversations with ratings and prompts
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        rating: { not: null }
      },
      include: {
        messages: {
          where: {
            role: 'ASSISTANT',
            promptId: { not: null }
          },
          include: {
            prompt: true
          }
        }
      }
    });

    // Calculate average rating per prompt
    const promptStats: { [key: string]: { prompt: any; ratings: number[]; avgRating: number } } = {};

    conversations.forEach(conv => {
      if (conv.rating !== null && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          if (msg.prompt && msg.promptId) {
            if (!promptStats[msg.promptId]) {
              promptStats[msg.promptId] = {
                prompt: msg.prompt,
                ratings: [],
                avgRating: 0
              };
            }
            promptStats[msg.promptId].ratings.push(conv.rating as number);
          }
        });
      }
    });

    // Calculate averages and sort by worst performance
    const promptResults = Object.values(promptStats)
      .map(stat => ({
        ...stat.prompt,
        avgRating: stat.ratings.reduce((sum, r) => sum + r, 0) / stat.ratings.length,
        usageCount: stat.ratings.length
      }))
      .sort((a, b) => a.avgRating - b.avgRating)
      .slice(0, limit);

    res.json({ prompts: promptResults });
  } catch (error) {
    console.error('Get worst prompts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;