import { getDb, saveProfile } from "@/lib/store";
import { errorResponse, readLocalJson } from "@/lib/http";
import { targetingProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const criteria = targetingProfileSchema.parse(await readLocalJson(request));
    return Response.json({ profile: saveProfile(getDb(), criteria) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
