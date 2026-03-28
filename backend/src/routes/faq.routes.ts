import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, adminOnly } from '../middleware/auth';

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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per documenti di progetto
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'application/zip',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo file non supportato'));
  },
});

// Get FAQs for a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const faqs = await prisma.projectFaq.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(faqs);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create FAQ (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, question, answer, sortOrder } = req.body;
    const faq = await prisma.projectFaq.create({
      data: { projectId, question, answer, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(faq);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update FAQ (admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { question, answer, sortOrder } = req.body;
    const data: any = {};
    if (question !== undefined) data.question = question;
    if (answer !== undefined) data.answer = answer;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const faq = await prisma.projectFaq.update({ where: { id: req.params.id }, data });
    res.json(faq);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete FAQ (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.projectFaq.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get documents for a project
router.get('/documents/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const docs = await prisma.projectDocument.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create document (admin)
router.post('/documents', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, title, content } = req.body;
    const doc = await prisma.projectDocument.create({
      data: { projectId, title, content },
    });
    res.status(201).json(doc);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update document (admin)
router.put('/documents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, content } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;

    const doc = await prisma.projectDocument.update({ where: { id: req.params.id }, data });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete document (admin)
router.delete('/documents/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.projectDocument.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ─── Allegati di Progetto ────────────────────────────────────────────────────

// Lista allegati di un progetto
router.get('/project-attachments/:projectId', authMiddleware, async (req, res) => {
  try {
    const attachments = await prisma.projectAttachment.findMany({
      where: { projectId: req.params.projectId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Upload allegato di progetto (admin)
router.post('/project-attachments/:projectId', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId: req.params.projectId,
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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Errore server' });
  }
});

// Scarica/visualizza allegato di progetto
router.get('/project-attachments/file/:id', authMiddleware, async (req, res) => {
  try {
    const attachment = await prisma.projectAttachment.findUnique({ where: { id: req.params.id } });
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

// Elimina allegato di progetto (admin)
router.delete('/project-attachments/file/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const attachment = await prisma.projectAttachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) return res.status(404).json({ error: 'Allegato non trovato' });

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.projectAttachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
