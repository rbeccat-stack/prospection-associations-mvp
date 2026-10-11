import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dossierStructureSchema, outreachDraftSchema } from './schemas';
import type { CollectedPage } from './collector';
import { HttpError } from './http';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Ask for analysis content only. Storage versions, source records and draft state
// are owned by the server, not by the model.
export function analysisOutputSchema() {
  const schema = z.toJSONSchema(dossierStructureSchema.omit({ schemaVersion: true, preparation: true, sources: true }).extend({
    draft: outreachDraftSchema.omit({ state: true }).optional(),
  }));
  const labelSchema = () => ({ type: 'string', minLength: 1, maxLength: 100 });
  function visit(node: unknown) {
    if (!object(node)) return;
    if (object(node.properties)) {
      for (const [key, value] of Object.entries(node.properties)) {
        if (!object(value)) continue;
        if (key === 'claimId') node.properties[key] = labelSchema();
        if (key === 'claimIds' || key === 'factClaimIds') value.items = labelSchema();
        if (key === 'claims' && object(value.items) && object(value.items.properties)) {
          value.items.properties.id = labelSchema();
          delete value.items.properties.verification;
          if (Array.isArray(value.items.required)) value.items.required = value.items.required.filter(key => key !== 'verification');
        }
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  }
  visit(schema);
  return schema;
}

export function prepareAnalysisPayload(raw: unknown, pages: CollectedPage[]): unknown {
  if (!object(raw)) return raw;
  const content = structuredClone(raw);
  content.schemaVersion = 1;
  content.preparation = 'ai_assisted';
  content.sources = pages.map(page => structuredClone(page.source));
  if (object(content.draft)) content.draft.state = 'draft';
  if (Array.isArray(content.claims)) {
    for (const claim of content.claims) {
      if (object(claim)) claim.verification = claim.kind === 'fact' ? 'sourced' : claim.kind === 'unknown' ? 'incomplete' : 'to_verify';
    }
  }
  // Cross-references and actual evidence are still validated by validateAnalysis.
  return assignAnalysisClaimIds(content);
}

export function assignAnalysisClaimIds(raw: unknown): unknown {
  if (!object(raw) || !Array.isArray(raw.claims)) return raw;
  const content = structuredClone(raw);
  const labels = new Map<string, string>();
  const claims = content.claims as unknown[];
  for (const claim of claims) {
    if (!object(claim) || typeof claim.id !== 'string' || !claim.id.trim() || claim.id.length > 100) {
      throw new HttpError(422, 'Analyse rejetée : une observation ne possède pas de référence utilisable.');
    }
    const label = claim.id.trim();
    if (labels.has(label)) throw new HttpError(422, 'Analyse rejetée : deux observations utilisent la même référence.');
    const id = randomUUID();
    labels.set(label, id);
    claim.id = id;
  }
  function reference(value: unknown): string {
    const id = typeof value === 'string' ? labels.get(value.trim()) : undefined;
    if (!id) throw new HttpError(422, 'Analyse rejetée : un lien renvoie vers une observation inexistante.');
    return id;
  }
  function referenceList(value: Record<string, unknown>, key: string) {
    if (Array.isArray(value[key])) value[key] = value[key].map(reference);
  }
  if (Array.isArray(content.signals)) {
    for (const signal of content.signals) if (object(signal)) signal.claimId = reference(signal.claimId);
  }
  if (object(content.qualification)) {
    for (const axis of ['digitalDebt', 'absorption']) {
      const value = content.qualification[axis];
      if (object(value)) referenceList(value, 'claimIds');
    }
  }
  if (Array.isArray(content.matches)) {
    for (const match of content.matches) if (object(match)) referenceList(match, 'claimIds');
  }
  if (Array.isArray(content.opportunities)) {
    for (const opportunity of content.opportunities) if (object(opportunity)) referenceList(opportunity, 'factClaimIds');
  }
  return content;
}
