import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Keep local development unchanged; production data requires a private password.
  if (!process.env.VERCEL) return NextResponse.next();
  const password = process.env.APP_PASSWORD;
  if (!password) return new Response("APP_PASSWORD manque dans les variables Vercel.", { status: 503 });

  const authorization = request.headers.get("authorization") || "";
  const encoded = authorization.startsWith("Basic ") ? authorization.slice(6) : "";
  let supplied = "";
  try { supplied = Buffer.from(encoded, "base64").toString("utf8"); }
  catch { /* Invalid authorization header. */ }
  const actual = Buffer.from(supplied);
  const expected = Buffer.from(`swipe:${password}`);
  if (actual.length === expected.length && timingSafeEqual(actual, expected)) return NextResponse.next();
  return new Response("Accès privé : identifiez-vous.", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Dossier du jour", charset="UTF-8"', "Cache-Control": "no-store" } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|icon.svg).*)"] };
