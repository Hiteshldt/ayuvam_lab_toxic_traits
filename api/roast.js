// GET /api/roast?c=ncr  →  AI-written dating profiles for the city's stations, keyed by station id.
//
// Visitors never pay for AI directly: each city is roasted at most once an hour, the answer is cached
// (Redis + Vercel's CDN), concurrent requests share one in-flight job, and there's a daily ceiling.
// Stations go out in small batches in parallel, so even free models answer inside their time limits.
import { hasAI, chat, cacheGet, cacheSet, hit } from '../lib/guard.js';
import { CITIES } from '../lib/air.js';
import { getCity } from './city.js';

const LIMIT = 36, BATCH = 12;

const SYSTEM = `You write the dating-app profiles of Indian neighbourhoods, judged only by their air quality.
Voice: dry, specific, affectionate roast. Puns welcome. Reference real local texture (traffic, flyovers, construction, stubble season, Diwali, sea breeze, lakes, IT parks) when it fits the place.
Rules: never insult residents, no politics, no party or politician names, no religion, no slurs. Each line 14 words max. No hashtags, no emojis.
Return JSON only.`;

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 140) : null);

async function batch(label, part, withHeadline, all) {
  const list = part.map((s, i) => `${i}|${s.name}, ${s.city}|AQI ${s.aqi}|${s.band}|${s.cigs} cigarettes/day`).join('\n');
  const summary = withHeadline ? `\nWhole city: ${all.length} stations, worst AQI ${all[0].aqi}, best ${all.at(-1).aqi}.` : '';
  const user = `City: ${label}.${summary}\nStations:\n${list}\n\nReturn {${withHeadline ? '"headline": "one-line verdict on the whole city", ' : ''}"s": {"<index>": {"t": "toxic trait (their personality)", "r": "red flag", "g": "green flag, however reluctant"}}} for every index.`;
  const out = await chat({ system: SYSTEM, user, maxTokens: 1100, temperature: 0.95 });
  const s = {};
  part.forEach((st, i) => {
    const a = out.s?.[i] || out.s?.[String(i)];
    if (a && clean(a.t)) s[st.id] = { t: clean(a.t), r: clean(a.r), g: clean(a.g) };
  });
  return { headline: withHeadline ? clean(out.headline) : null, s };
}

async function roast(id, city) {
  const data = await getCity(id, city);
  const top = data.stations.slice(0, LIMIT);
  const parts = [];
  for (let i = 0; i < top.length; i += BATCH) parts.push(top.slice(i, i + BATCH));
  const res = await Promise.allSettled(parts.map((p, i) => batch(city.label, p, i === 0, data.stations)));
  res.filter((r) => r.status === 'rejected').forEach((r) => console.error('roast batch failed:', r.reason?.message));
  const ok = res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const all = Object.assign({}, ...ok.map((x) => x.s));
  if (!Object.keys(all).length) return null;
  return { id, headline: ok.find((x) => x.headline)?.headline || null, s: all };
}

const inflight = (globalThis.__roastInflight ||= new Map());

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });
  if (Object.keys(req.query).some((k) => k !== 'c')) return res.status(400).json({ error: 'Unexpected parameters.' });
  const id = String(req.query.c || '');
  const city = CITIES[id];
  if (!city) return res.status(404).json({ error: 'Unknown city.' });
  if (!hasAI()) return res.status(503).json({ error: 'AI is switched off on this server.' });

  const key = `tt:roast:${id}:${new Date().toISOString().slice(0, 13)}`;
  let out = await cacheGet(key);
  if (!out) {
    if (!inflight.has(key)) {
      inflight.set(key, (async () => {
        // Hard ceiling on AI runs per day, even across serverless instances (needs Redis to be global).
        const budget = await hit(`tt:roast:day:${new Date().toISOString().slice(0, 10)}`, Number(process.env.DAILY_CAP || 200), 86400);
        if (!budget.ok) return null;
        const r = await roast(id, city);
        if (r) await cacheSet(key, r, 3600);
        return r;
      })().finally(() => setTimeout(() => inflight.delete(key), 1000)));
    }
    out = await inflight.get(key).catch((e) => (console.error('roast failed:', e.message), null));
  }
  if (!out) return res.status(503).json({ error: 'The roast writers are on a smoke break. Hand-written profiles for now.' });
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.json(out);
}
