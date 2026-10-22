import type { Client } from '@libsql/client';
import { z } from 'zod';
import { row, run } from './store';
import { analysisOutputSchema } from './analysis-identifiers';

export const ANALYSIS_CONTRACT = 'strict-dossier-v1';
const names = new Set<string>(['dossier', 'data', 'result', 'analysis']);
function collectNames(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if ('properties' in value && value.properties && typeof value.properties === 'object') Object.keys(value.properties).forEach(key => names.add(key));
  Object.values(value).forEach(collectNames);
}
collectNames(analysisOutputSchema());
const field = (value: PropertyKey): string | number => typeof value === 'number' ? value : names.has(String(value)) ? String(value) : '[autre champ]';
export const diagnosticToken = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9._:/ -]{1,160}$/.test(value) ? value : undefined;

export type AnalysisDiagnostic = {
  id: string;
  contract: string;
  createdAt: string;
  stage: 'request' | 'envelope' | 'json' | 'validation' | 'complete';
  outcome: 'failed' | 'validated';
  requestedModel: string;
  provider?: string;
  responseModel?: string;
  responseId?: string;
  finishReason?: string;
  httpStatus?: number;
  contentCharacters?: number;
  promptTokens?: number;
  completionTokens?: number;
  // Provider-reported cost of the call (OpenRouter credits, in USD), when available.
  cost?: number;
  rootType?: string;
  rootFields?: (string | number)[];
  issues?: { path: (string | number)[]; code: string }[];
};

export function responseShape(value: unknown) {
  return {
    rootType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    rootFields: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).slice(0, 60).map(field) : [],
  };
}

export function diagnosticIssues(error: unknown): AnalysisDiagnostic['issues'] {
  return error instanceof z.ZodError ? error.issues.slice(0, 30).map(issue => ({ path: issue.path.map(field), code: issue.code })) : undefined;
}

export async function saveAnalysisDiagnostic(db: Client, runId: string, diagnostic: AnalysisDiagnostic) {
  // No prompts, page texts, raw model responses, contacts or credentials.
  await run(db, 'INSERT INTO analysis_diagnostics(id, run_id, payload, created_at) VALUES (?, ?, ?, ?)', [diagnostic.id, runId, JSON.stringify(diagnostic), diagnostic.createdAt]);
}

export async function getAnalysisDiagnostic(db: Client, runId: string, id: string) {
  const result = await row<{ payload: string }>(db, 'SELECT payload FROM analysis_diagnostics WHERE run_id = ? AND id = ?', [runId, id]);
  return result ? JSON.parse(result.payload) as AnalysisDiagnostic : null;
}
