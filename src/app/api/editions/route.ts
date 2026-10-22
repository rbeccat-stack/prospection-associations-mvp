import { z } from "zod";
import { errorResponse, readLocalJson } from "@/lib/http";
import { getDb } from "@/lib/store";
import { startEdition } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    z.object({}).strict().parse(await readLocalJson(request));
    return Response.json({ edition: await startEdition(await getDb()) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Le Journal officiel")) return Response.json({ error: error.message }, { status: 502 });
    return errorResponse(error);
  }
}
