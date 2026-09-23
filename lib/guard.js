// Abuse protection + a tiny OpenRouter client, shared by every API route.
//
// Layers, cheapest first:
//   1. Origin check          – ALLOWED_ORIGINS, so other sites can't call the API from a browser
//   2. Cloudflare Turnstile  – invisible bot check (only when TURNSTILE_SECRET_KEY is set)
//   3. Per-IP rate limit     – Upstash Redis when configured, in-memory otherwise
//   4. Global daily cap      – the hard ceiling on AI calls per day
//   5. Response cache        – identical input never costs twice
// Put a credit limit on the OpenRouter key itself as the final backstop.

const mem = globalThis.__guardMem || (globalThis.__guardMem = new Map());
const R_URL = process.env.UPSTASH_REDIS_REST_URL;
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = () => !!(R_URL && R_TOK);

async function redis(cmds) {
  const r = await fetch(`${R_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${R_TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

// Fixed-window counter. Returns { ok, count, retryAfter }.
export async function hit(key, limit, windowSec) {
  if (!Number.isFinite(limit)) limit = 5; // a mistyped env var should fail closed, not open
  if (hasRedis()) {
    const [, n, ttl] = await redis([
      ['SET', key, '0', 'EX', String(windowSec), 'NX'],
      ['INCR', key],
      ['TTL', key],
    ]);
    return { ok: n <= limit, count: n, retryAfter: Math.max(1, ttl) };
  }
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.reset < now) mem.set(key, (e = { n: 0, reset: now + windowSec * 1000 }));
  e.n++;
  return { ok: e.n <= limit, count: e.n, retryAfter: Math.ceil((e.reset - now) / 1000) };
}

export async function cacheGet(key) {
  if (hasRedis()) {
    const [v] = await redis([['GET', key]]);
    return v ? JSON.parse(v) : null;
  }
  const e = mem.get('c:' + key);
  return e && e.exp > Date.now() ? e.v : null;
}

export async function cacheSet(key, value, ttlSec) {
  if (hasRedis()) return redis([['SET', key, JSON.stringify(value), 'EX', String(ttlSec)]]);
  mem.set('c:' + key, { v: value, exp: Date.now() + ttlSec * 1000 });
}

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  return (xf ? String(xf).split(',')[0] : req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').trim();
}

export function originOk(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true;
  const from = req.headers.origin || req.headers.referer || '';
  return allowed.some((a) => from.startsWith(a));
}

export async function turnstileOk(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  return (await r.json()).success === true;
}

export function deny(res, status, error, extra = {}) {
  res.status(status).json({ error, ...extra });
  return false;
}

// Runs every layer for a POST route that spends AI credits. Returns true when the request may proceed.
export async function guard(req, res, o) {
  if (req.method !== 'POST') return deny(res, 405, 'POST only.');
  if (!originOk(req)) return deny(res, 403, o.msgOrigin || 'Not from around here.');
  const ip = clientIp(req);
  const perIp = await hit(`${o.name}:ip:${ip}`, o.perIp, o.windowSec);
  if (!perIp.ok) return deny(res, 429, o.msgIp || 'Slow down.', { retryAfter: perIp.retryAfter });
  if (!(await turnstileOk(req.body?.turnstile, ip))) return deny(res, 403, 'Bot check failed. Refresh the page and try again.');
  const day = new Date().toISOString().slice(0, 10);
  const daily = await hit(`${o.name}:day:${day}`, o.daily, 86400);
  if (!daily.ok) return deny(res, 429, o.msgDay || 'Today’s AI budget is spent. Come back tomorrow.');
  return true;
}

// ---------- OpenRouter ----------
// Free models first (cost $0, but shared and rate-limited upstream), then the
// cheapest good paid models as a fallback (~$0.00004 per call). Both lists can be
// overridden with comma-separated env vars.
const list = (v, d) => (v || d).split(',').map((s) => s.trim()).filter(Boolean);
const FREE = list(process.env.OPENROUTER_FREE_MODELS,
  'google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-26b-a4b-it:free');
const PAID = list(process.env.OPENROUTER_MODELS,
  'qwen/qwen3-30b-a3b-instruct-2507,mistralai/mistral-nemo,google/gemma-3-12b-it');

export const hasAI = () => !!process.env.OPENROUTER_API_KEY;

// When the free pool says "rate-limited", skip it for a while instead of
// making every visitor wait for the same 429.
const orMem = (globalThis.__orMem ||= { freeOffUntil: 0 });

async function call(models, { system, user, maxTokens, temperature }, ms) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(ms),
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'http://localhost',
      'X-Title': process.env.SITE_NAME || 'side-project',
    },
    body: JSON.stringify({
      model: models[0],
      models,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
      provider: { sort: 'price' },
    }),
  });
  if (!r.ok) {
    const e = new Error(`openrouter ${r.status}: ${(await r.text()).slice(0, 160)}`);
    e.status = r.status;
    throw e;
  }
  const d = await r.json();
  if (d.error) {
    const e = new Error(`openrouter: ${JSON.stringify(d.error).slice(0, 160)}`);
    e.status = d.error.code;
    throw e;
  }
  return parseJSON(d.choices?.[0]?.message?.content || '');
}

export async function chat({ system, user, maxTokens = 500, temperature = 0.9 }) {
  const opts = { system, user, maxTokens, temperature };
  if (FREE.length && process.env.OPENROUTER_FREE !== '0' && Date.now() > orMem.freeOffUntil) {
    try {
      return await call(FREE, opts, 9000);
    } catch (e) {
      if ([429, 402, 503].includes(e.status)) orMem.freeOffUntil = Date.now() + (e.status === 503 ? 3 : 10) * 60 * 1000;
      console.warn('[ai] free models failed, using paid fallback:', e.message);
    }
  }
  return call(PAID, opts, 20000);
}

export function parseJSON(s) {
  const t = String(s).replace(/<think>[\s\S]*?<\/think>/g, '');
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('model returned no JSON');
  return JSON.parse(m[0]);
}

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
