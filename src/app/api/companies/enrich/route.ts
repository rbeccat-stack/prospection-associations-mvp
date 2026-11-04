import { ZodError } from "zod";
import { enrichCompany } from "@/lib/company-enrichment";
import { HttpError, readLocalJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Single-instance guard; not a distributed rate limiter.
let active = false;
export async function POST(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store" };
  if (active) return Response.json({ error: "Une consultation est en cours. Réessayez dans une minute." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  active = true;
  try { return Response.json(await enrichCompany(await readLocalJson(request)), { headers }); }
  catch (error) {
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || "Sources invalides." }, { status: 400, headers });
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "La consultation a échoué. Réessayez avec une page publique de l’entreprise." }, { status: 500, headers });
  } finally { active = false; }
}
