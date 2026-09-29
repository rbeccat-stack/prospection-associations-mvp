import { errorResponse, readLocalJson } from "@/lib/http";
import { parseSubmission } from "@/lib/submission";
import { findDuplicates, getDb } from "@/lib/store";
import { inputLabel } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { inputs } = parseSubmission(await readLocalJson(request));
    const duplicates = await findDuplicates(await getDb(), inputs);
    return Response.json({ rows: inputs.map((input) => ({ label: inputLabel(input), type: input.type, url: input.url || null })), duplicates });
  } catch (error) {
    return errorResponse(error);
  }
}
