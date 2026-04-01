import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';
import multer from 'multer';
import { calculateSlaDeadline } from '../services/sla.service';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/import/tickets - import tickets from CSV
router.post('/tickets', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file' });

    const csv = req.file.buffer.toString('utf-8');
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV vuoto o senza dati' });

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const imported: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      try {
        const { projectid, title, description, priority, status, type } = row;
        if (!projectid || !title) { errors.push(`Riga ${i + 1}: projectid e title obbligatori`); continue; }

        const project = await prisma.project.findUnique({ where: { id: projectid } });
        if (!project) { errors.push(`Riga ${i + 1}: progetto ${projectid} non trovato`); continue; }

        const ticketPriority = (['LOW','MEDIUM','HIGH','CRITICAL','FEATURE_REQUEST'].includes((priority||'').toUpperCase()) ? priority.toUpperCase() : 'MEDIUM');
        const slaDeadline = calculateSlaDeadline(project, ticketPriority);
        const ticket = await prisma.ticket.create({
          data: {
            projectId: projectid,
            creatorId: req.user!.userId,
            title,
            description: description || '',
            priority: (['LOW','MEDIUM','HIGH','CRITICAL','FEATURE_REQUEST'].includes((priority||'').toUpperCase()) ? priority.toUpperCase() : 'MEDIUM') as any,
            status: (['OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED'].includes((status||'').toUpperCase()) ? status.toUpperCase() : 'OPEN') as any,
            type: (type?.toUpperCase() === 'SERVICE' ? 'SERVICE' : 'STANDARD') as any,
            slaDeadline,
          },
        });
        imported.push(ticket);
      } catch (err: any) {
        errors.push(`Riga ${i + 1}: ${err.message}`);
      }
    }

    res.json({ imported: imported.length, errors });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
