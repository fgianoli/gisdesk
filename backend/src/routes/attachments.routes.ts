import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo file non supportato'));
  },
});

// Upload allegato
router.post('/tickets/:ticketId/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
    if (!ticket) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: req.params.ticketId,
        uploadedById: req.user!.userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    res.status(201).json(attachment);
  } catch (err: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Errore server' });
  }
});

// Scarica/visualizza allegato
router.get('/attachments/:id', authMiddleware, async (req, res) => {
  try {
    const attachment = await prisma.ticketAttachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) return res.status(404).json({ error: 'Allegato non trovato' });

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File non trovato' });

    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.sendFile(path.resolve(filePath));
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Elimina allegato
router.delete('/attachments/:id', authMiddleware, async (req, res) => {
  try {
    const attachment = await prisma.ticketAttachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) return res.status(404).json({ error: 'Allegato non trovato' });

    // Solo chi ha caricato o admin può eliminare
    if (attachment.uploadedById !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.ticketAttachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
