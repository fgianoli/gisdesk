import { PrismaClient } from '@prisma/client';
import { sendEmail, slaWarningEmail, slaExpiredEmail, weeklyReportEmail } from './email.service';

const prisma = new PrismaClient();

export function calculateSlaDeadline(
  project: {
    slaHours: number;
    slaCriticalHours?: number | null;
    slaHighHours?: number | null;
    slaMediumHours?: number | null;
    slaLowHours?: number | null;
  },
  priority?: string,
): Date | null {
  if (priority === 'FEATURE_REQUEST') return null;
  let hours: number;
  switch (priority) {
    case 'CRITICAL': hours = project.slaCriticalHours ?? project.slaHours; break;
    case 'HIGH':     hours = project.slaHighHours ?? project.slaHours; break;
    case 'MEDIUM':   hours = project.slaMediumHours ?? project.slaHours; break;
    case 'LOW':      hours = project.slaLowHours ?? project.slaHours; break;
    default:         hours = project.slaHours;
  }
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

export function getSlaStatus(slaDeadline: Date | null): 'green' | 'yellow' | 'red' | 'none' {
  if (!slaDeadline) return 'none';
  const now = new Date();
  const remaining = slaDeadline.getTime() - now.getTime();
  const totalHours = remaining / (1000 * 60 * 60);

  if (totalHours <= 0) return 'red';
  if (totalHours <= 4) return 'yellow';
  return 'green';
}

export async function checkSlaWarnings() {
  const fourHoursFromNow = new Date();
  fourHoursFromNow.setHours(fourHoursFromNow.getHours() + 4);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
      slaDeadline: { lte: fourHoursFromNow, gt: new Date() },
    },
    include: {
      project: { include: { members: { include: { user: true }, where: { role: 'MANAGER' } } } },
    },
  });

  for (const ticket of tickets) {
    const adminEmails = ticket.project.members.map((m) => m.user.email);
    if (adminEmails.length > 0) {
      const { subject, html } = slaWarningEmail(ticket.title, ticket.project.name, ticket.id);
      await sendEmail(adminEmails, subject, html);
    }
  }
}

// Run SLA check every 30 minutes
setInterval(checkSlaWarnings, 30 * 60 * 1000);

// SLA escalation: every 15 minutes
// Warning: slaDeadline within next 1 hour AND not yet notified AND status not RESOLVED/CLOSED
// Expired: slaDeadline has passed AND not yet notified AND status not RESOLVED/CLOSED
export async function checkSlaEscalation() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  // Warning: expiring within 1 hour, not yet warned
  const warningTickets = await prisma.ticket.findMany({
    where: {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
      slaDeadline: { lte: oneHourFromNow, gt: now },
      slaWarningNotifiedAt: null,
    },
    include: {
      assignee: true,
      project: {
        include: {
          members: { include: { user: true }, where: { role: 'MANAGER' } },
        },
      },
    },
  });

  for (const ticket of warningTickets) {
    const recipients: string[] = [];
    if (ticket.assignee?.email) recipients.push(ticket.assignee.email);
    ticket.project.members.forEach((m) => {
      if (m.user.email && !recipients.includes(m.user.email)) recipients.push(m.user.email);
    });

    if (recipients.length > 0 && ticket.slaDeadline) {
      const { subject, html } = slaWarningEmail(ticket.title, ticket.project.name, ticket.id, ticket.slaDeadline);
      await sendEmail(recipients, subject, html);
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaWarningNotifiedAt: now },
    });
  }

  // Expired: slaDeadline passed, not yet notified as expired
  const expiredTickets = await prisma.ticket.findMany({
    where: {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
      slaDeadline: { lt: now },
      slaExpiredNotifiedAt: null,
    },
    include: {
      assignee: true,
      project: {
        include: {
          members: { include: { user: true }, where: { role: 'MANAGER' } },
        },
      },
    },
  });

  for (const ticket of expiredTickets) {
    const recipients: string[] = [];
    if (ticket.assignee?.email) recipients.push(ticket.assignee.email);
    ticket.project.members.forEach((m) => {
      if (m.user.email && !recipients.includes(m.user.email)) recipients.push(m.user.email);
    });

    if (recipients.length > 0 && ticket.slaDeadline) {
      const { subject, html } = slaExpiredEmail(ticket.title, ticket.id, ticket.slaDeadline);
      await sendEmail(recipients, subject, html);
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaExpiredNotifiedAt: now },
    });
  }
}

// Every 15 minutes
setInterval(checkSlaEscalation, 15 * 60 * 1000);

// SLA escalation: every hour, notify manager of tickets expiring within 2 hours via in-app notification
export async function slaEscalation() {
  const twoHoursFromNow = new Date();
  twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
      slaDeadline: { lte: twoHoursFromNow, gt: new Date() },
    },
    include: {
      project: { include: { members: { include: { user: true }, where: { role: 'MANAGER' } } } },
    },
  });

  for (const ticket of tickets) {
    const managers = ticket.project.members.map((m) => m.user);
    for (const manager of managers) {
      try {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            type: 'SLA_ESCALATION',
            title: `SLA in scadenza: ${ticket.title}`,
            body: `Il ticket "${ticket.title}" scade entro 2 ore. Intervieni al più presto.`,
            linkUrl: `/tickets/${ticket.id}`,
          },
        });
        const { subject, html } = slaWarningEmail(ticket.title, ticket.project.name, ticket.id);
        await sendEmail(manager.email, subject, html);
      } catch {}
    }
  }
}

setInterval(slaEscalation, 60 * 60 * 1000);

// Weekly report: every Monday at 8:00 AM
export async function sendWeeklyReport() {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true } });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalTickets, openTickets, resolvedTickets, slaBreaches] = await Promise.all([
    prisma.ticket.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } } }),
    prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] }, updatedAt: { gte: weekAgo } } }),
    prisma.ticket.count({ where: { slaDeadline: { lt: now }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
  ]);

  for (const admin of admins) {
    try {
      const { subject, html } = weeklyReportEmail(admin.name, { totalTickets, openTickets, resolvedTickets, slaBreaches });
      await sendEmail(admin.email, subject, html);
    } catch {}
  }
}

// Schedule weekly report every Monday at 8:00 AM
function scheduleWeeklyReport() {
  const now = new Date();
  const next = new Date();
  next.setHours(8, 0, 0, 0);
  // Find next Monday
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  const msUntilNext = next.getTime() - now.getTime();
  setTimeout(() => {
    sendWeeklyReport().catch(() => {});
    setInterval(() => sendWeeklyReport().catch(() => {}), 7 * 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

scheduleWeeklyReport();
