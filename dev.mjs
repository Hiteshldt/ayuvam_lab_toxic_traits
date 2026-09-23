// Zero-dependency local server: serves public/ and runs api/*.js the way Vercel does.
// Usage: node dev.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 3000);

for (const f of ['.env.local', '.env']) {
  try {
    for (const line of fs.readFileSync(path.join(root, f), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.json': 'application/json', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) {
    const file = path.join(root, u.pathname.replace(/\/$/, '') + '.js');
    if (!file.startsWith(path.join(root, 'api')) || !fs.existsSync(file)) { res.writeHead(404); return res.end('no route'); }
    let body = '';
    for await (const c of req) body += c;
    req.query = Object.fromEntries(u.searchParams);
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = body; }
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    res.send = (s) => res.end(s);
    try {
      const mod = await import(pathToFileURL(file).href + '?t=' + Date.now());
      await mod.default(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: String(e.message || e) });
    }
    return;
  }
  let p = path.join(root, 'public', decodeURIComponent(u.pathname));
  if (!p.startsWith(path.join(root, 'public'))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}`));
