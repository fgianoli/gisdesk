import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const AVATARS_DIR = '/app/uploads/avatars';
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo immagini consentite'));
  },
});

// GET /me - current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, role: true, active: true,
        phone: true, company: true, avatar: true, language: true, createdAt: true,
        _count: { select: { createdTickets: true } },
      } as any,
    });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /me - update profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, phone, company, language, email } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (company !== undefined) data.company = company;
    if (language !== undefined) data.language = language;
    if (email !== undefined && email.trim() !== '') data.email = email.trim().toLowerCase();

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true, email: true, name: true, role: true, active: true,
        phone: true, company: true, avatar: true, language: true, createdAt: true,
      } as any,
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /me/password - change password
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nuova password deve avere almeno 8 caratteri' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Password attuale non corretta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user!.userId }, data: { password: hashed } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /me/avatar - upload avatar
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    // Delete old avatar if exists
    const existing = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { avatar: true },
    });
    if (existing?.avatar) {
      const oldPath = path.join(AVATARS_DIR, existing.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatar: req.file.filename },
    });

    res.json({ avatar: req.file.filename });
  } catch (err: any) {
    if (req.file) {
      const p = path.join(AVATARS_DIR, req.file.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.status(500).json({ error: err.message || 'Errore server' });
  }
});

// GET /avatar/:userId - serve avatar (public)
router.get('/avatar/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { avatar: true },
    });
    if (!user?.avatar) return res.status(404).json({ error: 'Avatar non trovato' });

    const filePath = path.join(AVATARS_DIR, user.avatar);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File non trovato' });

    res.sendFile(path.resolve(filePath));
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /me/notifications - get notification preferences
router.get('/me/notifications', authMiddleware, async (req, res) => {
  try {
    const prefs = await (prisma as any).userNotificationPreference.findUnique({
      where: { userId: req.user!.userId },
    });
    res.json(prefs ?? {
      emailOnTicketCreated: true,
      emailOnStatusChange: true,
      emailOnComment: true,
      emailOnSlaWarning: true,
      weeklyReport: true,
    });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /me/notifications - update notification preferences
router.put('/me/notifications', authMiddleware, async (req, res) => {
  try {
    const { emailOnTicketCreated, emailOnStatusChange, emailOnComment, emailOnSlaWarning, weeklyReport } = req.body;
    const prefs = await (prisma as any).userNotificationPreference.upsert({
      where: { userId: req.user!.userId },
      update: { emailOnTicketCreated, emailOnStatusChange, emailOnComment, emailOnSlaWarning, weeklyReport },
      create: { userId: req.user!.userId, emailOnTicketCreated, emailOnStatusChange, emailOnComment, emailOnSlaWarning, weeklyReport },
    });
    res.json(prefs);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
