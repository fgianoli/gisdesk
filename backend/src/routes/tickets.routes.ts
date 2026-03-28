import { Router } from 'express';
import { PrismaClient, TicketStatus } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { sendEmail, ticketCreatedEmail, ticketUpdatedEmail, ticketCommentEmail } from '../services/email.service';
import { calculateSlaDeadline, getSlaStatus } from '../services/sla.service';
import { validate } from '../middleware/validate';
import { createTicketSchema, createCommentSchema } from '../middleware/schemas';
import { createNotification } from './notifications.routes';

const router = Router();
const prisma = new PrismaClient();

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

    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    // Clients can't see service tickets
    if (req.user!.role !== 'ADMIN' && ticket.type === 'SERVICE') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    res.json({ ...ticket, slaStatus: getSlaStatus(ticket.slaDeadline) });
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

    const ticket = await prisma.ticket.create({
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

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete ticket (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
