import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

export async function logAudit(
  prismaClient: PrismaClient,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  ipAddress?: string,
) {
  try {
    await prismaClient.auditLog.create({
      data: { userId: userId || null, action, entity, entityId, details, ipAddress },
    });
  } catch {}
}

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { entity, userId, limit = '100' } = req.query;
    const where: any = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
