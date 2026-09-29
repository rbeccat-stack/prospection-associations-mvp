import { ZodError } from "zod";
import { DuplicateError } from "./store";

export async function readLocalJson(request: Request): Promise<unknown> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const originUrl = origin ? new URL(origin) : null;
  const isLoopback = (hostname: string) => ["127.0.0.1", "localhost"].includes(hostname);
  if (!isLoopback(url.hostname) || (originUrl && (!isLoopback(originUrl.hostname) || originUrl.port !== url.port || originUrl.protocol !== url.protocol))) {
    throw new HttpError(403, "Cette action est réservée à l’application locale.");
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new HttpError(415, "Le contenu doit être du JSON.");
  }
  const text = await request.text();
  if (text.length > 30_000) throw new HttpError(413, "Le formulaire dépasse la taille autorisée.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Le JSON est invalide.");
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof DuplicateError) return Response.json({ error: error.message, duplicates: error.matches }, { status: 409 });
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || "Données invalides", issues: error.issues }, { status: 400 });
  if (error instanceof Error && ["CSV invalide", "Le CSV", "Ligne", "Choisissez", "Enregistrez"].some((prefix) => error.message.startsWith(prefix))) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Erreur interne lors de l’enregistrement local", error);
  return Response.json({ error: "Une erreur interne a empêché l’enregistrement." }, { status: 500 });
}
