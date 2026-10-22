import { z } from "zod";
import { errorResponse, HttpError, readLocalJson } from "@/lib/http";
import { getDb } from "@/lib/store";
import { advanceEdition, closeEdition } from "@/lib/engine";

export const runtime = "nodejs";
// One step is either a site collection or one AI analysis (provider deadline: 90 seconds).
export const maxDuration = 120;
const actionSchema = z.object({ action: z.enum(["step", "close"]) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Édition introuvable.");
    const { action } = actionSchema.parse(await readLocalJson(request));
    const db = await getDb();
    return Response.json({ edition: action === "step" ? await advanceEdition(db, id) : await closeEdition(db, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
