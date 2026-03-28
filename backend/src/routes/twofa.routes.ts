import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user!.userId } });
    res.json({ enabled: tfa?.enabled || false });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/setup', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    const secret = speakeasy.generateSecret({ name: `GISdesk (${user.email})`, issuer: 'GISdesk' });

    await prisma.twoFactorAuth.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, secret: secret.base32, enabled: false },
      update: { secret: secret.base32, enabled: false },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    res.json({ secret: secret.base32, qrCode });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/enable', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user!.userId } });
    if (!tfa) return res.status(400).json({ error: '2FA non configurato' });

    const valid = speakeasy.totp.verify({ secret: tfa.secret, encoding: 'base32', token, window: 2 });
    if (!valid) return res.status(400).json({ error: 'Codice non valido' });

    await prisma.twoFactorAuth.update({ where: { userId: req.user!.userId }, data: { enabled: true } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user!.userId } });
    if (!tfa || !tfa.enabled) return res.status(400).json({ error: '2FA non attivo' });

    const valid = speakeasy.totp.verify({ secret: tfa.secret, encoding: 'base32', token, window: 2 });
    if (!valid) return res.status(400).json({ error: 'Codice non valido' });

    await prisma.twoFactorAuth.update({ where: { userId: req.user!.userId }, data: { enabled: false } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
