export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@ticketing.local',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
