import http from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

// Serve only these prototype files, never the repository or environment files.
http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  const url = new URL(request.url, 'http://127.0.0.1:4173');
  const asset = assets.get(url.pathname);
  if (!asset) { response.writeHead(404); response.end('Page introuvable.'); return; }
  try {
    const bytes = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { 'Content-Type':asset[1], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(500); response.end('Aperçu indisponible.'); }
}).listen(4173, '127.0.0.1', () => console.log('Maquette : http://127.0.0.1:4173/'));
