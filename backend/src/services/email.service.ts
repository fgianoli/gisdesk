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

const statusLabels: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In lavorazione',
  WAITING: 'In attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
};

const priorityLabels: Record<string, string> = {
  CRITICAL: 'Critica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Bassa',
  FEATURE_REQUEST: 'Richiesta funzionalità',
};

/** Sent to admins/managers when a new ticket is created */
export function ticketCreatedEmail(ticketTitle: string, projectName: string, ticketId: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `[${projectName}] Nuovo ticket: ${ticketTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">📋 Nuovo Ticket Ricevuto</h2>
        <p><strong>Progetto:</strong> ${projectName}</p>
        <p><strong>Titolo:</strong> ${ticketTitle}</p>
        <p><a href="${url}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Visualizza Ticket</a></p>
      </div>
    `,
  };
}

/** Sent to the ticket creator as confirmation of submission */
export function ticketConfirmationEmail(ticketTitle: string, projectName: string, ticketId: string, priority: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  const priorityLabel = priorityLabels[priority] || priority;
  return {
    subject: `[${projectName}] Ticket ricevuto: ${ticketTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0f766e">✅ Abbiamo ricevuto il tuo ticket</h2>
        <p>Grazie per averci contattato. Il tuo ticket è stato registrato e sarà preso in carico al più presto.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f8fafc">
            <td style="padding:8px 12px;font-weight:bold;border:1px solid #e2e8f0;width:140px">Progetto</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${projectName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;border:1px solid #e2e8f0">Titolo</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${ticketTitle}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:8px 12px;font-weight:bold;border:1px solid #e2e8f0">Priorità</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">${priorityLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;border:1px solid #e2e8f0">Stato</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0">Aperto</td>
          </tr>
        </table>
        <p>Puoi seguire l'avanzamento del ticket in qualsiasi momento cliccando il pulsante qui sotto.</p>
        <p><a href="${url}" style="background:#0f766e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Segui il Ticket</a></p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Riceverai aggiornamenti via email ad ogni cambio di stato o nuovo commento.</p>
      </div>
    `,
  };
}

/** Sent to the ticket creator when status changes */
export function ticketStatusChangedEmail(ticketTitle: string, projectName: string, ticketId: string, oldStatus: string, newStatus: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  const oldLabel = statusLabels[oldStatus] || oldStatus;
  const newLabel = statusLabels[newStatus] || newStatus;
  const statusColors: Record<string, string> = {
    IN_PROGRESS: '#2563eb',
    WAITING: '#d97706',
    RESOLVED: '#16a34a',
    CLOSED: '#6b7280',
    OPEN: '#dc2626',
  };
  const color = statusColors[newStatus] || '#1d4ed8';
  return {
    subject: `[${projectName}] Ticket aggiornato: ${newLabel} — ${ticketTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:${color}">🔄 Aggiornamento ticket</h2>
        <p>Il tuo ticket <strong>"${ticketTitle}"</strong> (progetto: ${projectName}) ha cambiato stato.</p>
        <div style="background:#f8fafc;border-left:4px solid ${color};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
          <span style="color:#94a3b8;text-decoration:line-through">${oldLabel}</span>
          &nbsp;→&nbsp;
          <strong style="color:${color}">${newLabel}</strong>
        </div>
        ${newStatus === 'IN_PROGRESS' ? '<p>Un operatore ha preso in carico il tuo ticket e sta lavorando alla soluzione.</p>' : ''}
        ${newStatus === 'WAITING' ? '<p>Il ticket è in attesa di ulteriori informazioni o di una risposta da parte tua.</p>' : ''}
        ${newStatus === 'RESOLVED' ? '<p>Il ticket è stato marcato come risolto. Se il problema persiste, puoi riaprirlo aggiungendo un commento.</p>' : ''}
        <p><a href="${url}" style="background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Visualizza Ticket</a></p>
      </div>
    `,
  };
}

export function ticketUpdatedEmail(ticketTitle: string, projectName: string, ticketId: string, field: string, oldVal: string, newVal: string) {
  const url = `${env.FRONTEND_URL}/tickets/${ticketId}`;
  return {
    subject: `[${projectName}] Ticket aggiornato: ${ticketTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1d4ed8">Ticket Aggiornato</h2>
        <p><strong>Progetto:</strong> ${projectName}</p>
        <p><strong>Ticket:</strong> ${ticketTitle}</p>
        <p><strong>${field}:</strong> ${oldVal} → ${newVal}</p>
        <p><a href="${url}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Visualizza Ticket</a></p>
      </div>
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
