import { discoverLyon } from "@/lib/discovery";
import { HttpError, errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const rawPage = new URL(request.url).searchParams.get("page") || "1";
    if (!/^\d{1,4}$/.test(rawPage)) throw new HttpError(400, "Page de recherche invalide.");
    const page = Number(rawPage);
    if (page < 1 || page > 1000) throw new HttpError(400, "Page de recherche invalide.");
    const result = await discoverLyon(page);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("L’annuaire public")) return Response.json({ error: error.message }, { status: 502 });
    return errorResponse(error);
  }
}
