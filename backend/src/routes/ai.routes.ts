import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { aiAskSchema } from '../middleware/schemas';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

// AI Assistant - ask a question about a project
router.post('/ask', authMiddleware, validate(aiAskSchema), async (req, res) => {
  try {
    const { projectId, question } = req.body;

    if (!env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI non configurata. Impostare OPENAI_API_KEY.' });
    }

    // Gather project context: FAQs + Documents + recent tickets
    const [faqs, docs, recentTickets] = await Promise.all([
      prisma.projectFaq.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } }),
      prisma.projectDocument.findMany({ where: { projectId } }),
      prisma.ticket.findMany({
        where: { projectId, status: { in: ['RESOLVED', 'CLOSED'] } },
        include: { comments: { orderBy: { createdAt: 'asc' }, take: 3 } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    // Build context string
    let context = '';

    if (faqs.length > 0) {
      context += '## FAQ del Progetto\n\n';
      for (const faq of faqs) {
        context += `**D:** ${faq.question}\n**R:** ${faq.answer}\n\n`;
      }
    }

    if (docs.length > 0) {
      context += '## Documentazione del Progetto\n\n';
      for (const doc of docs as any[]) {
        context += `### ${doc.title}\n${doc.content}\n`;
        if (doc.url) {
          context += `[LINK: ${doc.title}] → ${doc.url}\n`;
        }
        context += '\n';
      }
    }

    if (recentTickets.length > 0) {
      context += '## Ticket Risolti Recenti\n\n';
      for (const ticket of recentTickets) {
        context += `**${ticket.title}** (${ticket.priority})\n${ticket.description}\n`;
        if (ticket.comments.length > 0) {
          context += 'Commenti risoluzione:\n';
          for (const c of ticket.comments) {
            context += `- ${c.content}\n`;
          }
        }
        context += '\n';
      }
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sei un assistente di supporto tecnico. Rispondi alle domande degli utenti basandoti sulla documentazione e le FAQ del progetto fornite. Se non trovi informazioni sufficienti nel contesto, dillo chiaramente e suggerisci di aprire un ticket.\n\nContesto del progetto:\n${context}`,
        },
        { role: 'user', content: question },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content || 'Non sono riuscito a generare una risposta.';
    res.json({ answer, sourcesUsed: { faqs: faqs.length, docs: docs.length, tickets: recentTickets.length } });
  } catch (err: any) {
    console.error('[AI ERROR]', err);
    res.status(500).json({ error: 'Errore nel servizio AI' });
  }
});

export default router;
