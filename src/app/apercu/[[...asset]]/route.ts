import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const assets = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['styles.css', 'text/css; charset=utf-8'],
  ['app.js', 'text/javascript; charset=utf-8'],
]);

// Same password protection as the rest of the site. Only these three files
// may be served; the prototype directory also contains non-public tooling.
export async function GET(_request: Request, { params }: { params: Promise<{ asset?: string[] }> }) {
  const { asset = [] } = await params;
  const filename = asset.length === 0 ? 'index.html' : asset.length === 1 ? asset[0] : '';
  const contentType = assets.get(filename);
  const headers = { 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex, nofollow', 'Referrer-Policy':'no-referrer' };
  if (!contentType) return new Response('Page introuvable.', { status:404, headers });

  try {
    let content = await readFile(path.join(process.cwd(), 'prototypes', 'mobile', filename), 'utf8');
    if (filename === 'index.html') {
      // Work with /apercu, /apercu/ and /apercu/index.html on every domain.
      content = content.replace('href="styles.css"', 'href="/apercu/styles.css"').replace('src="app.js"', 'src="/apercu/app.js"');
    }
    return new Response(content, { headers:{ ...headers, 'Content-Type':contentType } });
  } catch {
    return new Response('L’aperçu est momentanément indisponible.', { status:503, headers });
  }
}
