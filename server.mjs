import http from 'node:http';
import { deliver } from './mail.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('./public/', import.meta.url));
const projects = ['Textiles de badminton', 'Tubes de volants', 'Textiles et tubes de volants', 'Autre projet'];
export function validate(data) {
  if (!data || typeof data !== 'object') return false;
  for (const [key, max] of Object.entries({name:120,email:254,phone:40,personalization:160,website:200,project:80,message:5000})) {
    if (data[key] !== undefined && (typeof data[key] !== 'string' || data[key].length > max)) return false;
  }
  return Boolean(data.name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '') && projects.includes(data.project) && Number.isInteger(Number(data.quantity)) && Number(data.quantity) >= 1 && Number(data.quantity) <= 100000 && data.message?.trim().length >= 10 && data.consent === 'on' && !data.website);
}
export function createServer({ sender = deliver } = {}) {
  const attempts = new Map();
  return http.createServer(async (req, res) => {
    const reply = (code, data) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    let url; try { url = new URL(req.url, 'http://localhost'); } catch { return reply(400,{error:'Invalid URL'}); }
    if (url.pathname === '/api/config' && req.method === 'GET') return reply(200,{contactEnabled:true});
    if (url.pathname === '/api/contact' && req.method === 'POST') {
      if (req.headers.origin) {
        try { if (new URL(req.headers.origin).host !== req.headers.host) return reply(403,{error:'Origin rejected'}); }
        catch { return reply(403,{error:'Origin rejected'}); }
      }
      if (!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'JSON required'});
      const now = Date.now();
      for (const [ip, times] of attempts) if (times.every(t => now-t >= 60000)) attempts.delete(ip);
      const key = req.socket.remoteAddress;
      const times = (attempts.get(key) || []).filter(t => now-t < 60000);
      if (times.length >= 5) return reply(429,{error:'Réessayez dans une minute'});
      attempts.set(key,[...times,now]);
      try {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16000) return reply(413,{error:'Request too large'}); }
        let data; try { data = JSON.parse(raw); } catch { return reply(400,{error:'Invalid JSON'}); }
        if (!validate(data)) return reply(400,{error:'Invalid fields'});
        const payload = Object.fromEntries(['name','email','phone','personalization','project','quantity','message','consent'].map(key => [key,data[key] || '']));
        await sender(payload);
        return reply(200,{ok:true,message:'Votre demande a été prise en charge par le service d’envoi. Merci !'});
      } catch { return reply(502,{error:'Delivery unavailable'}); }
    }
    if (!['GET','HEAD'].includes(req.method)) return reply(405,{error:'Method not allowed'});
    try {
      const pathname = decodeURIComponent(url.pathname);
      const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!filename.startsWith(root)) return reply(403,{error:'Forbidden'});
      const content = await readFile(filename);
      const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'}[path.extname(filename)] || 'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime}); res.end(req.method === 'HEAD' ? undefined : content);
    } catch { reply(404,{error:'Not found'}); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createServer().listen(Number(process.env.PORT || 3000),'127.0.0.1',() => console.log('BADONLINE prêt sur http://127.0.0.1:'+(process.env.PORT || 3000)));
