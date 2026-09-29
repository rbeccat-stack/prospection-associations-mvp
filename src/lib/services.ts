import { z } from 'zod';

export function aiConfig() {
  const base = process.env.AI_BASE_URL || '';
  const key = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || '';
  const limit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 5);
  const tokens = Number(process.env.AI_MAX_OUTPUT_TOKENS || 6000);
  let validUrl = false;
  try { const url = new URL(base); validUrl = url.protocol === 'https:' && !url.username && !url.password; } catch {}
  const ready = process.env.AI_AUTHORIZED === 'true' && validUrl && !!key && !!model && Number.isInteger(limit) && limit > 0 && limit <= 100 && Number.isInteger(tokens) && tokens >= 1000 && tokens <= 8000;
  return { ready, base, key, model, limit, tokens };
}
export function mailConfig() {
  const recipient = process.env.TEST_EMAIL_TO || '';
  const from = process.env.TEST_EMAIL_FROM || '';
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  const ready = process.env.EMAIL_AUTHORIZED === 'true' && z.email().safeParse(recipient).success && z.email().safeParse(from).success && !!host && !!user && !!pass && [465,587].includes(port);
  return { ready, recipient, from, host, port, user, pass };
}
export function serviceStatus() {
  const ai = aiConfig(); const mail = mailConfig();
  return { aiReady: ai.ready, aiModel: ai.ready ? ai.model : '', dailyLimit: ai.limit, mailReady: mail.ready, recipient: z.email().safeParse(mail.recipient).success ? mail.recipient : '' };
}
export type ServiceStatus = ReturnType<typeof serviceStatus>;
