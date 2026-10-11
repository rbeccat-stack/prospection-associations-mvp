import { z } from 'zod';
import { getDb } from '@/lib/store';
import { getAnalysisDiagnostic } from '@/lib/analysis-diagnostics';
import { errorResponse, HttpError } from '@/lib/http';

export const runtime = 'nodejs';

// Protected by the same production authentication as all other /api routes.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  try {
    const { id, attemptId } = await params;
    if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(attemptId).success) throw new HttpError(404, 'Diagnostic introuvable.');
    const diagnostic = await getAnalysisDiagnostic(await getDb(), id, attemptId);
    if (!diagnostic) throw new HttpError(404, 'Diagnostic introuvable.');
    return new Response(JSON.stringify(diagnostic, null, 2), { headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="diagnostic-ia-${attemptId}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return errorResponse(error); }
}
