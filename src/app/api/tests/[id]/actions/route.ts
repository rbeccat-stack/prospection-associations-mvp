import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { errorResponse, HttpError, readLocalJson } from '@/lib/http';
import { createRuns, getDb, getRun } from '@/lib/store';
import { outreachDraftSchema } from '@/lib/schemas';
import { collectPage, type CollectedPage } from '@/lib/collector';
import { collection, editDraft, finishWork, replaceDossier, saveCollection, startWork } from '@/lib/workflow';
import { analyze } from '@/lib/analysis';
import { confirmReceipt, previewDelivery, sendDelivery } from '@/lib/delivery';

export const runtime = 'nodejs';
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('collect'), urls: z.array(z.url().refine(url => /^https?:\/\//.test(url))).max(3), manualText: z.string().trim().max(18000).default('') }).strict(),
  z.object({ action: z.literal('analyze'), revision: z.number().int().nonnegative(), replace: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('draft'), revision: z.number().int().positive(), draft: outreachDraftSchema }).strict(),
  z.object({ action: z.literal('preview') }).strict(),
  z.object({ action: z.literal('send'), previewId: z.string().uuid(), retry: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('received'), deliveryId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('rerun') }).strict(),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let working = false;
  const { id } = await params;
  const db = getDb();
  try {
    const input = actionSchema.parse(await readLocalJson(request));
    const run = getRun(db, id);
    if (!run) throw new HttpError(404, 'Test introuvable.');
    if (input.action === 'collect') {
      if (!input.urls.length && input.manualText.length < 30) throw new HttpError(400, 'Indiquez une URL ou au moins 30 caractères d’informations à analyser.');
      startWork(db, id, 'collecting'); working = true;
      const pages: CollectedPage[] = [];
      for (const url of [...new Set(input.urls)]) pages.push(await collectPage(url));
      if (input.manualText) pages.push({ source: { id: randomUUID(), label: 'Informations fournies manuellement pour ce test', origin: 'user_input', consultedAt: new Date().toISOString(), accessStatus: 'available' }, text: input.manualText });
      saveCollection(db, id, pages);
      finishWork(db, id, pages.some(page => page.source.accessStatus === 'available') ? 'collected' : 'failed', pages.every(page => page.source.accessStatus !== 'available') ? 'Aucune page lisible. Ajoutez une autre URL ou des informations manuelles.' : null);
      return Response.json({ pages });
    }
    if (input.action === 'analyze') {
      if (input.revision > 0 && !input.replace) throw new HttpError(409, 'Confirmez la création d’une nouvelle version du dossier.');
      startWork(db, id, 'analyzing'); working = true;
      const content = await analyze(db, run, collection(db, id));
      const dossier = replaceDossier(db, id, content, input.revision);
      finishWork(db, id, 'ready');
      return Response.json({ dossier });
    }
    if (input.action === 'draft') return Response.json({ dossier: editDraft(db, id, input.draft, input.revision) });
    if (input.action === 'preview') return Response.json({ preview: previewDelivery(db, id) });
    if (input.action === 'send') return Response.json({ deliveries: await sendDelivery(db, id, input.previewId, input.retry) });
    if (input.action === 'received') { confirmReceipt(db, id, input.deliveryId); return Response.json({ ok: true }); }
    if (input.action === 'rerun') return Response.json({ run: createRuns(db, [run.input], true)[0] });
  } catch (error) {
    if (working) finishWork(db, id, 'failed', error instanceof HttpError ? error.message : 'Le traitement a échoué. Les données précédentes restent disponibles.');
    return errorResponse(error);
  }
}
