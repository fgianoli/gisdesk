import { Router } from 'express';
import { PrismaClient, TicketStatus } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { sendEmail, ticketCreatedEmail, ticketUpdatedEmail, ticketCommentEmail } from '../services/email.service';
import { calculateSlaDeadline, getSlaStatus } from '../services/sla.service';
import { validate } from '../middleware/validate';
import { createTicketSchema, createCommentSchema } from '../middleware/schemas';
import { createNotification } from './notifications.routes';
import { logAudit } from './audit.routes';
import { pushEvent } from './sse.routes';

const router = Router();
const prisma = new PrismaClient();

// Search tickets
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);

    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (req.user!.role !== 'ADMIN') {
      where.project = { members: { some: { userId: req.user!.userId } } };
      where.type = 'STANDARD';
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const ticketsWithSla = tickets.map((t) => ({ ...t, slaStatus: getSlaStatus(t.slaDeadline) }));
    res.json(ticketsWithSla);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Export tickets as CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { projectId, status, priority, type } = req.query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;

    if (req.user!.role !== 'ADMIN') {
      where.project = { members: { some: { userId: req.user!.userId } } };
      where.type = 'STANDARD';
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const escCsv = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Titolo', 'Progetto', 'Stato', 'Priorità', 'Tipo', 'Creatore', 'Assegnatario', 'Creato Il', 'SLA Scadenza'];
    const rows = tickets.map((t) => [
      escCsv(t.id),
      escCsv(t.title),
      escCsv(t.project?.name || ''),
      escCsv(t.status),
      escCsv(t.priority),
      escCsv(t.type),
      escCsv(t.creator?.name || ''),
      escCsv(t.assignee?.name || ''),
      escCsv(new Date(t.createdAt).toLocaleString('it-IT')),
      escCsv(t.slaDeadline ? new Date(t.slaDeadline).toLocaleString('it-IT') : ''),
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// List tickets (admin: all or by project, client: only from assigned projects)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { projectId, status, priority, type } = req.query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;

    // Clients only see STANDARD tickets from their projects
    if (req.user!.role !== 'ADMIN') {
      where.project = { members: { some: { userId: req.user!.userId } } };
      where.type = 'STANDARD';
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ticketsWithSla = tickets.map((t) => ({
      ...t,
      slaStatus: getSlaStatus(t.slaDeadline),
    }));

    res.json(ticketsWithSla);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get single ticket
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true, slaHours: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    // Append satisfaction separately to avoid TS error before migration
    let satisfactionData = null;
    try { satisfactionData = await (prisma as any).ticketSatisfaction.findUnique({ where: { ticketId: req.params.id } }); } catch {}
    const ticketWithSatisfaction = ticket ? { ...ticket, satisfaction: satisfactionData } : null;

    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    // Clients can't see service tickets
    if (req.user!.role !== 'ADMIN' && ticket.type === 'SERVICE') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    res.json({ ...ticketWithSatisfaction, slaStatus: getSlaStatus(ticket.slaDeadline) });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create ticket
router.post('/', authMiddleware, validate(createTicketSchema), async (req, res) => {
  try {
    const { projectId, title, description, priority, type, assigneeId } = req.body;

    // Only admins can create SERVICE tickets
    if (type === 'SERVICE' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo gli admin possono creare ticket di servizio' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Progetto non trovato' });

    const slaDeadline = type !== 'SERVICE' ? calculateSlaDeadline(project.slaHours) : null;

    let ticket = await prisma.ticket.create({
      data: {
        projectId,
        creatorId: req.user!.userId,
        assigneeId: assigneeId || null,
        title,
        description,
        priority: priority || 'MEDIUM',
        type: type || 'STANDARD',
        slaDeadline,
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-assignment: if no assigneeId, check AssignmentRule
    if (!ticket.assigneeId) {
      try {
        const rule = await (prisma as any).assignmentRule?.findFirst({
          where: {
            isActive: true,
            OR: [
              { projectId: ticket.projectId },
              { projectId: null },
            ],
            AND: [
              { OR: [{ priority: ticket.priority }, { priority: null }] },
              { OR: [{ type: ticket.type }, { type: null }] },
            ],
          },
          orderBy: { sortOrder: 'asc' },
        });
        if (rule) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { assigneeId: rule.assigneeId },
          });
          ticket = { ...ticket, assigneeId: rule.assigneeId };
        }
      } catch { /* AssignmentRule model may not exist yet */ }
    }

    // Audit log
    await logAudit(prisma, req.user!.userId, 'TICKET_CREATED', 'Ticket', ticket.id, JSON.stringify({ title: ticket.title, projectId: ticket.projectId }), req.ip || undefined);

    // Send email notifications
    const projectMembers = await prisma.projectUser.findMany({
      where: { projectId },
      include: { user: { select: { email: true, role: true } } },
    });

    const adminEmails = projectMembers
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.user.email);

    // Admins get notified for all tickets
    const { subject, html } = ticketCreatedEmail(ticket.title, ticket.project.name, ticket.id);
    if (adminEmails.length > 0) await sendEmail(adminEmails, subject, html);

    // For service tickets, only notify admins
    if (type !== 'SERVICE') {
      const clientEmails = projectMembers
        .filter((m) => m.role === 'MEMBER' && !adminEmails.includes(m.user.email))
        .map((m) => m.user.email);
      if (clientEmails.length > 0) await sendEmail(clientEmails, subject, html);
    }

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update ticket
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { name: true, slaHours: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    // Only admins can update priority
    const { title, description, status, priority, assigneeId } = req.body;
    const data: any = {};
    const historyEntries: { field: string; oldValue: string; newValue: string }[] = [];

    if (title !== undefined && title !== ticket.title) {
      data.title = title;
      historyEntries.push({ field: 'title', oldValue: ticket.title, newValue: title });
    }
    if (description !== undefined && description !== ticket.description) {
      data.description = description;
      historyEntries.push({ field: 'description', oldValue: ticket.description, newValue: description });
    }
    if (status !== undefined && status !== ticket.status) {
      // Only admins can change priority, but status can be changed by project members too
      data.status = status;
      historyEntries.push({ field: 'status', oldValue: ticket.status, newValue: status });
    }
    if (priority !== undefined && priority !== ticket.priority) {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo gli admin possono modificare la priorità' });
      }
      data.priority = priority;
      historyEntries.push({ field: 'priority', oldValue: ticket.priority, newValue: priority });
    }
    if (assigneeId !== undefined && assigneeId !== ticket.assigneeId) {
      data.assigneeId = assigneeId || null;
      historyEntries.push({ field: 'assignee', oldValue: ticket.assigneeId || 'nessuno', newValue: assigneeId || 'nessuno' });
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Record history
    for (const entry of historyEntries) {
      await prisma.ticketHistory.create({
        data: { ticketId: ticket.id, userId: req.user!.userId, ...entry },
      });
    }

    // Audit log
    if (historyEntries.length > 0) {
      await logAudit(prisma, req.user!.userId, 'TICKET_UPDATED', 'Ticket', ticket.id, JSON.stringify(historyEntries), req.ip || undefined);
    }

    // Send satisfaction survey email if status changed to RESOLVED or CLOSED
    const statusChange = historyEntries.find(e => e.field === 'status');
    if (statusChange && (statusChange.newValue === 'RESOLVED' || statusChange.newValue === 'CLOSED')) {
      try {
        const creator = await prisma.user.findUnique({ where: { id: ticket.creatorId } });
        if (creator?.email) {
          const surveyUrl = `${process.env.FRONTEND_URL}/tickets/${ticket.id}?survey=1`;
          await sendEmail(
            creator.email,
            `Il tuo ticket "${ticket.title}" è stato ${statusChange.newValue === 'RESOLVED' ? 'risolto' : 'chiuso'} - Lascia una valutazione`,
            `<h2>Come è andata?</h2><p>Il ticket <strong>${ticket.title}</strong> è stato ${statusChange.newValue === 'RESOLVED' ? 'risolto' : 'chiuso'}.</p><p>Ci farebbe molto piacere ricevere un tuo feedback sulla qualità del supporto ricevuto.</p><p><a href="${surveyUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Lascia una valutazione</a></p>`,
          );
        }
      } catch { /* ignore email errors */ }
    }

    // Send email for status/priority changes
    if (historyEntries.length > 0) {
      const projectMembers = await prisma.projectUser.findMany({
        where: { projectId: ticket.projectId },
        include: { user: { select: { email: true } } },
      });
      const emails = projectMembers.map((m) => m.user.email);
      const mainChange = historyEntries[0];
      const { subject, html } = ticketUpdatedEmail(
        updated.title, updated.project.name, updated.id,
        mainChange.field, mainChange.oldValue, mainChange.newValue,
      );
      if (emails.length > 0) await sendEmail(emails, subject, html);
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Add comment
router.post('/:id/comments', authMiddleware, validate(createCommentSchema), async (req, res) => {
  try {
    const { content } = req.body;
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { name: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const commenter = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const comment = await prisma.ticketComment.create({
      data: { ticketId: req.params.id, userId: req.user!.userId, content },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify participants
    const participants = await prisma.ticketComment.findMany({
      where: { ticketId: req.params.id },
      select: { user: { select: { email: true } } },
      distinct: ['userId'],
    });
    const emails = [
      ...new Set([
        ...participants.map((p) => p.user.email),
        ...(ticket.creatorId ? [(await prisma.user.findUnique({ where: { id: ticket.creatorId } }))?.email].filter(Boolean) : []),
      ]),
    ].filter((e) => e) as string[];

    const { subject, html } = ticketCommentEmail(ticket.title, ticket.project.name, ticket.id, commenter?.name || 'Unknown');
    if (emails.length > 0) await sendEmail(emails, subject, html);

    // Handle @mentions: find @name patterns and notify matching users
    const mentionMatches = content.match(/@([\w\-\.]+)/g);
    if (mentionMatches) {
      const mentionedNames = mentionMatches.map((m: string) => m.slice(1));
      for (const name of mentionedNames) {
        const mentionedUser = await prisma.user.findFirst({
          where: { name: { contains: name, mode: 'insensitive' } },
        });
        if (mentionedUser && mentionedUser.id !== req.user!.userId) {
          await createNotification(
            prisma,
            mentionedUser.id,
            'MENTION',
            `${commenter?.name || 'Qualcuno'} ti ha menzionato in un commento`,
            `Nel ticket: ${ticket.title}`,
            `/tickets/${ticket.id}`,
          );
          // Send email for mention
          if (mentionedUser.email) {
            await sendEmail(
              mentionedUser.email,
              `Sei stato menzionato nel ticket: ${ticket.title}`,
              `<p><strong>${commenter?.name || 'Qualcuno'}</strong> ti ha menzionato in un commento sul ticket <a href="${process.env.FRONTEND_URL}/tickets/${ticket.id}">${ticket.title}</a></p><p>${content}</p>`,
            );
          }
        }
      }
    }

    // Audit log for comment
    await logAudit(prisma, req.user!.userId, 'COMMENT_ADDED', 'Ticket', req.params.id, `Comment on: ${ticket.title}`, req.ip || undefined);

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete ticket (admin or ticket creator)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    if (req.user!.role !== 'ADMIN' && ticket.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Non autorizzato: puoi eliminare solo i tuoi ticket' });
    }

    await logAudit(prisma, req.user!.userId, 'TICKET_DELETED', 'Ticket', ticket.id, JSON.stringify({ title: ticket.title }), req.ip || undefined);
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Submit satisfaction survey
router.post('/:id/satisfaction', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valutazione non valida (1-5)' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return res.status(400).json({ error: 'Il ticket deve essere risolto o chiuso per lasciare una valutazione' });
    }

    const satisfaction = await (prisma as any).ticketSatisfaction.upsert({
      where: { ticketId: req.params.id },
      update: { rating, comment: comment || null },
      create: { ticketId: req.params.id, rating, comment: comment || null },
    });

    res.status(201).json(satisfaction);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
