import { errorResponse, readLocalJson } from "@/lib/http";
import { parseSubmission } from "@/lib/submission";
import { createRuns, getDb } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { inputs, allowDuplicates } = parseSubmission(await readLocalJson(request));
    const runs = createRuns(getDb(), inputs, allowDuplicates);
    return Response.json({ runs }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
