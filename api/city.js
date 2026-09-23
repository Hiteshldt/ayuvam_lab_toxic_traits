// GET /api/city?c=ncr  →  every CPCB station in the city, with an AQI, a cigarette count and a dating profile.
//
// This route never calls the AI, so it's always fast. The AI roasts come from /api/roast,
// written once per city per hour and swapped in by the page when they arrive.
import { cacheGet, cacheSet } from '../lib/guard.js';
import { CITIES, loadCity, loadCityModel, fallbackTraits, fallbackHeadline } from '../lib/air.js';

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), ms))]);

async function build(id, city) {
  let stations = [], source = 'cpcb';
  try { stations = await withTimeout(loadCity(city), 25000); } catch (e) { console.error('cpcb failed:', e.message); }
  if (!stations.length) { stations = await loadCityModel(id); source = 'model'; }
  if (!stations.length) throw new Error('no stations reporting');
  stations.forEach((s) => Object.assign(s, fallbackTraits(s)));
  return {
    id, label: city.label, generated: new Date().toISOString(),
    headline: fallbackHeadline(city.label, stations),
    ai: false, source, stations,
  };
}

// Cached per city per hour; /api/roast reads the same copy so both agree on the station list.
const inflight = (globalThis.__cityInflight ||= new Map());
export async function getCity(id, city) {
  const key = `tt:city:${id}:${new Date().toISOString().slice(0, 13)}`;
  const hit = await cacheGet(key);
  if (hit) return hit;
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      const out = await build(id, city);
      await cacheSet(key, out, out.source === 'model' ? 900 : 3600);
      await cacheSet(`tt:last:${id}`, out, 7 * 86400);
      return out;
    })().finally(() => setTimeout(() => inflight.delete(key), 1000)));
  }
  return inflight.get(key);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });
  if (Object.keys(req.query).some((k) => k !== 'c')) return res.status(400).json({ error: 'Unexpected parameters.' });
  const id = String(req.query.c || 'ncr');
  const city = CITIES[id];
  if (!city) return res.status(404).json({ error: 'We only date cities we have data for.' });

  let out;
  try { out = await getCity(id, city); }
  catch (e) {
    console.error(id, e.message);
    out = await cacheGet(`tt:last:${id}`);
    if (!out) return res.status(502).json({ error: 'The CPCB feed isn’t answering right now. Try again in a minute.' });
    out = { ...out, stale: true };
  }
  res.setHeader('Cache-Control', out.stale || out.source === 'model'
    ? 'public, s-maxage=300'
    : 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.json(out);
}
