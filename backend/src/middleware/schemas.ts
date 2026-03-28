import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
});

export const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().min(2, 'Nome troppo corto').max(100),
  password: z.string().min(8, 'Password: minimo 8 caratteri'),
  role: z.enum(['ADMIN', 'CLIENT']).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Nome troppo corto').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  slaHours: z.number().int().min(1).max(720).optional(),
});

export const createTicketSchema = z.object({
  projectId: z.string().uuid('ID progetto non valido'),
  title: z.string().min(3, 'Titolo troppo corto').max(300),
  description: z.string().min(10, 'Descrizione troppo corta').max(10000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'FEATURE_REQUEST']).optional(),
  type: z.enum(['STANDARD', 'SERVICE']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Commento vuoto').max(5000),
});

export const createTimelineSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  sortOrder: z.number().int().optional(),
});

export const createTodoSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(300),
  userId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const createFaqSchema = z.object({
  projectId: z.string().uuid(),
  question: z.string().min(5).max(500),
  answer: z.string().min(5).max(5000),
  sortOrder: z.number().int().optional(),
});

export const aiAskSchema = z.object({
  projectId: z.string().uuid(),
  question: z.string().min(3, 'Domanda troppo corta').max(1000),
});
