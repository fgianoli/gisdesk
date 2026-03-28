import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/analytics/overview
router.get('/overview', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const [totTickets, openTickets, resolvedTickets, ticketsWithSla] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.findMany({
        where: { slaDeadline: { not: null }, type: 'STANDARD' },
        select: { slaDeadline: true, createdAt: true, status: true, updatedAt: true },
      }),
    ]);

    // Avg resolution hours (for resolved tickets with history - approximate using updatedAt)
    const resolvedWithDates = await prisma.ticket.findMany({
      where: { status: { in: ['RESOLVED', 'CLOSED'] } },
      select: { createdAt: true, updatedAt: true },
    });

    const avgResolutionHours = resolvedWithDates.length > 0
      ? resolvedWithDates.reduce((acc, t) => {
          const diff = (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
          return acc + diff;
        }, 0) / resolvedWithDates.length
      : 0;

    // SLA compliance: tickets resolved before slaDeadline
    const now = new Date();
    const slaTickets = ticketsWithSla.filter(t => t.slaDeadline);
    const slaCompliant = slaTickets.filter(t => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        return new Date(t.updatedAt || now) <= new Date(t.slaDeadline!);
      }
      return new Date(t.slaDeadline!) > now;
    });

    const slaCompliance = slaTickets.length > 0
      ? Math.round((slaCompliant.length / slaTickets.length) * 100)
      : 100;

    res.json({
      totTickets,
      openTickets,
      resolvedTickets,
      avgResolutionHours: Math.round(avgResolutionHours),
      slaCompliance,
    });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/analytics/by-status
router.get('/by-status', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const;
    const results = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await prisma.ticket.count({ where: { status } }),
      }))
    );
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/analytics/by-priority
router.get('/by-priority', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'FEATURE_REQUEST'] as const;
    const results = await Promise.all(
      priorities.map(async (priority) => ({
        priority,
        count: await prisma.ticket.count({ where: { priority } }),
      }))
    );
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/analytics/by-project
router.get('/by-project', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { name: 'asc' },
    });
    const results = projects.map(p => ({ name: p.name, count: p._count.tickets }));
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/analytics/trend - tickets created in last 30 days
router.get('/trend', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tickets = await prisma.ticket.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dateMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      dateMap[key] = 0;
    }

    for (const t of tickets) {
      const key = new Date(t.createdAt).toISOString().split('T')[0];
      if (dateMap[key] !== undefined) dateMap[key]++;
    }

    const result = Object.entries(dateMap).map(([date, count]) => ({ date, count }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
