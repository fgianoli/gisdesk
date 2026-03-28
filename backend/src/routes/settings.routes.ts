import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { authMiddleware, adminOnly } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const SETTING_KEYS = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 'appName', 'frontendUrl', 'appLogo'];

const DEFAULTS: Record<string, string> = {
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFrom: 'noreply@gisdesk.local',
  appName: 'GISdesk',
  frontendUrl: 'http://localhost:3000',
  appLogo: '',
};

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${uuidv4()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo immagini JPEG, PNG, WebP, GIF o SVG'));
  },
});

// GET /public - nome app e logo (nessuna autenticazione, usato da Login e Sidebar)
router.get('/public', async (_req, res) => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ['appName', 'appLogo'] } },
    });
    const result: Record<string, string> = { appName: DEFAULTS.appName, appLogo: '' };
    for (const row of rows) result[row.key] = row.value;
    res.json(result);
  } catch {
    res.json({ appName: DEFAULTS.appName, appLogo: '' });
  }
});

// POST /logo - upload logo (admin only)
router.post('/logo', authMiddleware, adminOnly, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    // Cancella vecchio logo
    const existing = await prisma.systemSetting.findUnique({ where: { key: 'appLogo' } });
    if (existing?.value) {
      const oldPath = path.join(UPLOADS_DIR, existing.value);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await prisma.systemSetting.upsert({
      where: { key: 'appLogo' },
      update: { value: req.file.filename },
      create: { key: 'appLogo', value: req.file.filename },
    });

    res.json({ filename: req.file.filename });
  } catch (err: any) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message || 'Errore server' });
  }
});

// DELETE /logo - rimuovi logo (admin only)
router.delete('/logo', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const existing = await prisma.systemSetting.findUnique({ where: { key: 'appLogo' } });
    if (existing?.value) {
      const filePath = path.join(UPLOADS_DIR, existing.value);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.systemSetting.upsert({
      where: { key: 'appLogo' },
      update: { value: '' },
      create: { key: 'appLogo', value: '' },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET / - all settings (admin only)
router.get('/', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT / - upsert settings (admin only)
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const ops = [];
    for (const key of SETTING_KEYS) {
      if (body[key] !== undefined) {
        ops.push(
          prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(body[key]) },
            create: { key, value: String(body[key]) },
          })
        );
      }
    }
    await Promise.all(ops);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /test-email - send test email to admin (admin only)
router.post('/test-email', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    if (!settings.smtpHost) {
      return res.status(400).json({ error: 'SMTP Host non configurato' });
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      return res.status(404).json({ error: 'Nessun admin trovato' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort || '587', 10),
      secure: parseInt(settings.smtpPort || '587', 10) === 465,
      auth: settings.smtpUser
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
    });

    await transporter.sendMail({
      from: settings.smtpFrom,
      to: admin.email,
      subject: `[${settings.appName}] Email di test`,
      html: `<h2>Email di test</h2><p>La configurazione SMTP di <strong>${settings.appName}</strong> funziona correttamente.</p>`,
    });

    res.json({ success: true, message: `Email di test inviata a ${admin.email}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Errore invio email' });
  }
});

export default router;
