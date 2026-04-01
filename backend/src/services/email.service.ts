import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL SKIP] SMTP non configurato. To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    await t.sendMail({
      from: env.SMTP_FROM,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log(`[EMAIL] Inviata a ${to}: ${subject}`);
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
  }
}

export function ticketCreatedEmail(ticketTitle: string, projectName: string, ticketId: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `[${projectName}] Nuovo ticket: ${ticketTitle}`,
    html: `
      <h2>Nuovo Ticket Creato</h2>
      <p><strong>Progetto:</strong> ${projectName}</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><a href="${url}">Visualizza Ticket</a></p>
    `,
  };
}

export function ticketUpdatedEmail(ticketTitle: string, projectName: string, ticketId: string, field: string, oldVal: string, newVal: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `[${projectName}] Ticket aggiornato: ${ticketTitle}`,
    html: `
      <h2>Ticket Aggiornato</h2>
      <p><strong>Progetto:</strong> ${projectName}</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>${field}:</strong> ${oldVal} → ${newVal}</p>
      <p><a href="${url}">Visualizza Ticket</a></p>
    `,
  };
}

export function ticketCommentEmail(ticketTitle: string, projectName: string, ticketId: string, commenterName: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `[${projectName}] Nuovo commento su: ${ticketTitle}`,
    html: `
      <h2>Nuovo Commento</h2>
      <p><strong>Progetto:</strong> ${projectName}</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>Da:</strong> ${commenterName}</p>
      <p><a href="${url}">Visualizza Ticket</a></p>
    `,
  };
}

export function slaWarningEmail(ticketTitle: string, projectName: string, ticketId: string, deadline?: Date) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  const deadlineStr = deadline ? deadline.toLocaleString('it-IT') : '';
  return {
    subject: `⚠️ SLA in scadenza: ${ticketTitle}`,
    html: `
      <h2>⚠️ SLA in Scadenza</h2>
      <p><strong>Progetto:</strong> ${projectName}</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      ${deadlineStr ? `<p><strong>Scadenza:</strong> ${deadlineStr}</p>` : ''}
      <p>L'SLA di questo ticket sta per scadere. Intervieni al più presto.</p>
      <p><a href="${url}">Visualizza Ticket</a></p>
    `,
  };
}

export function slaExpiredEmail(ticketTitle: string, ticketId: string, deadline: Date) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `🚨 SLA SCADUTA: ${ticketTitle}`,
    html: `
      <h2 style="color:#dc2626">🚨 SLA SCADUTA</h2>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>Scadenza:</strong> ${deadline.toLocaleString('it-IT')}</p>
      <p>L'SLA di questo ticket è <strong>SCADUTA</strong>. È necessario un intervento urgente.</p>
      <p><a href="${url}" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Visualizza Ticket</a></p>
    `,
  };
}

export function weeklyReportEmail(
  adminName: string,
  stats: { totalTickets: number; openTickets: number; resolvedTickets: number; slaBreaches: number },
) {
  return {
    subject: `GISdesk - Report Settimanale`,
    html: `
      <h2>Report Settimanale GISdesk</h2>
      <p>Ciao ${adminName},</p>
      <p>Ecco il riepilogo dell'attività della settimana:</p>
      <ul>
        <li><strong>Ticket totali:</strong> ${stats.totalTickets}</li>
        <li><strong>Ticket aperti:</strong> ${stats.openTickets}</li>
        <li><strong>Ticket risolti:</strong> ${stats.resolvedTickets}</li>
        <li><strong>Violazioni SLA:</strong> ${stats.slaBreaches}</li>
      </ul>
      <p><a href="${env.FRONTEND_URL}/analytics">Visualizza Analytics completi</a></p>
    `,
  };
}
