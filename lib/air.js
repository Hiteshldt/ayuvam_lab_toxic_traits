// Live CPCB station data (via data.gov.in) and the hand-written fallback personalities.

const RESOURCE = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
// data.gov.in's public sample key: 10 rows per call and heavily rate-limited. Get your own free key.
const SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

export const CITIES = {
  ncr: { label: 'Delhi NCR', cities: ['Delhi', 'Gurugram', 'Noida', 'Greater Noida', 'Ghaziabad', 'Faridabad'] },
  blr: { label: 'Bengaluru', cities: ['Bengaluru'] },
  mum: { label: 'Mumbai', cities: ['Mumbai', 'Navi Mumbai', 'Thane'] },
  hyd: { label: 'Hyderabad', cities: ['Hyderabad'] },
  chn: { label: 'Chennai', cities: ['Chennai'] },
  kol: { label: 'Kolkata', cities: ['Kolkata', 'Howrah'] },
};

// CPCB National AQI bands.
export const BANDS = [
  { max: 50, name: 'Good', key: 'good' },
  { max: 100, name: 'Satisfactory', key: 'sat' },
  { max: 200, name: 'Moderate', key: 'mod' },
  { max: 300, name: 'Poor', key: 'poor' },
  { max: 400, name: 'Very Poor', key: 'vpoor' },
  { max: Infinity, name: 'Severe', key: 'severe' },
];
export const band = (aqi) => BANDS.find((b) => aqi <= b.max);

// Sub-index → concentration (µg/m³), inverting the CPCB breakpoints.
const BP = {
  pm25: [[0, 50, 0, 30], [51, 100, 31, 60], [101, 200, 61, 90], [201, 300, 91, 120], [301, 400, 121, 250], [401, 500, 251, 380]],
  pm10: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 200, 101, 250], [201, 300, 251, 350], [301, 400, 351, 430], [401, 500, 431, 600]],
};
function conc(kind, idx) {
  const row = BP[kind].find((r) => idx <= r[1]) || BP[kind].at(-1);
  const [iLo, iHi, cLo, cHi] = row;
  return cLo + ((Math.min(idx, iHi) - iLo) * (cHi - cLo)) / (iHi - iLo);
}
// Berkeley Earth: breathing 22 µg/m³ of PM2.5 for a day ≈ smoking one cigarette.
const CIG_UGM3 = 22;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(city, pollutant, offset, limit) {
  const key = process.env.DATA_GOV_API_KEY || SAMPLE_KEY;
  const u = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${key}&format=json&limit=${limit}&offset=${offset}` +
    `&filters%5Bcity%5D=${encodeURIComponent(city)}&filters%5Bpollutant_id%5D=${encodeURIComponent(pollutant)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    let d;
    try {
      const r = await fetch(u, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      d = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    } catch (e) {
      d = { error: `rate limit / network: ${e.message}` }; // network blips get the same backoff
    }
    if (!d.error && Array.isArray(d.records)) return d;
    if (!/rate limit/i.test(d.error || '')) throw new Error(`data.gov.in: ${d.error}`);
    await sleep(1200 * (attempt + 1));
  }
  throw new Error('data.gov.in: rate limited');
}

async function records(city, pollutant) {
  const limit = Number(process.env.DATA_GOV_PAGE || (process.env.DATA_GOV_API_KEY ? 500 : 10));
  const out = [];
  for (let offset = 0, total = Infinity; offset < total && offset < 1000; offset += limit) {
    const d = await page(city, pollutant, offset, limit);
    total = Number(d.total || 0);
    out.push(...d.records);
    if (!d.records.length) break;
  }
  return out;
}

const tidy = (station) =>
  station.split(',')[0].replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();

export async function loadCity(city) {
  const jobs = city.cities.flatMap((c) => ['PM2.5', 'PM10'].map((p) => [c, p]));
  const tag = (p) => (list) => list.map((r) => ({ ...r, _p: p }));
  let rows = [];
  if (process.env.DATA_GOV_API_KEY) {
    // Own key: fire every query at once.
    rows = (await Promise.all(jobs.map(([c, p]) => records(c, p).then(tag(p))))).flat();
  } else {
    // Sample key: one at a time, or it rate-limits us.
    for (const [c, p] of jobs) rows.push(...tag(p)(await records(c, p)));
  }

  const byStation = new Map();
  for (const r of rows) {
    const v = Number(r.avg_value);
    if (!Number.isFinite(v)) continue;
    const s = byStation.get(r.station) || {
      id: r.station, name: tidy(r.station), city: r.city,
      lat: Number(r.latitude), lon: Number(r.longitude), updated: r.last_update,
    };
    s[r._p === 'PM2.5' ? 'pm25i' : 'pm10i'] = v;
    byStation.set(r.station, s);
  }

  return [...byStation.values()]
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => {
      const aqi = Math.round(Math.max(s.pm25i ?? 0, s.pm10i ?? 0));
      const pm25 = s.pm25i != null ? conc('pm25', s.pm25i) : conc('pm10', s.pm10i) * 0.55;
      return {
        id: s.id, name: s.name, city: s.city, lat: s.lat, lon: s.lon, updated: s.updated,
        aqi, band: band(aqi).name, bandKey: band(aqi).key,
        driver: (s.pm25i ?? -1) >= (s.pm10i ?? -1) ? 'PM2.5' : 'PM10',
        pm25: Math.round(pm25), estimated: s.pm25i == null,
        cigs: Math.round((pm25 / CIG_UGM3) * 10) / 10,
      };
    })
    .sort((a, b) => b.aqi - a.aqi);
}

// ---------- Hand-written personalities (used when AI is off, and to fill gaps) ----------
const LINES = {
  good: [
    ['Emotionally available. Also oxygen-available.', 'Makes every other neighbourhood look bad.', 'The sky is blue, like in the textbooks.'],
    ['Therapist-recommended air.', 'Suspiciously well-adjusted. What is it hiding?', 'Your lungs just sent a thank-you note.'],
    ['Wholesome main-character energy.', 'Will ruin you for every other postcode.', 'Morning runs with no sequel at the pulmonologist.'],
  ],
  sat: [
    ['Has a few issues, but is in therapy.', 'Slightly dusty; blames the construction next door.', 'Perfectly breathable if you don’t think about it.'],
    ['Situationship air: not great, not a dealbreaker.', 'Won’t commit to being clean.', 'Still lets you open the window.'],
    ['A solid 7/10, and knows it.', 'Posts sunrise pics with a suspicious filter.', 'Your inhaler can take the day off.'],
  ],
  mod: [
    ['Says “I’m not like other cities.” Is like other cities.', 'Asthmatics get left on read.', 'Sunsets are 30% more orange, free of charge.'],
    ['Mixed signals: blue at 7am, grey regret by 5pm.', 'Your lungs are doing unpaid overtime.', 'Could be worse. Could be Anand Vihar.'],
    ['Hot and cold. Mostly dusty.', 'Leaves a film on your car and your soul.', 'Still technically counts as “outside”.'],
  ],
  poor: [
    ['Love-bombs you with golden-hour haze, then takes your breath away. Literally.', 'Your N95 is now a personality trait.', 'Airtight excuse to work from home.'],
    ['Gaslights you: “It’s just fog.” It is not fog.', 'Morning walk? More like morning wheeze.', 'Moody Instagram shots, no filter needed.'],
    ['Emotionally unavailable, particulately very available.', 'Says it’s changing. The data says otherwise.', 'Keeps the air-purifier industry employed.'],
  ],
  vpoor: [
    ['Chain-smoker who insists they can quit anytime.', 'Every breath is a free cigarette you didn’t order.', 'Air-purifier sales are booming, so the economy’s fine.'],
    ['Toxic-ex energy: you keep coming back because of rent.', 'Visibility is a suggestion.', 'Builds character. Mostly in your bronchi.'],
    ['Red flag so big it has its own postcode.', 'Your lungs have started drafting a resignation letter.', 'Great for finally learning to breathe through your nose.'],
  ],
  severe: [
    ['Declared a public-health situationship.', 'Your lungs have filed for divorce.', 'None. We looked. Twice.'],
    ['The final boss of air.', 'Visibility: vibes only.', 'Makes you appreciate Himachal.'],
    ['Smokes more than a Diwali night, every night.', 'Doctors call it “the ashtray with a PIN code”.', 'Free cardio: every flight of stairs.'],
  ],
};

function pickIdx(s, n) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

export function fallbackTraits(st) {
  const opts = LINES[st.bandKey];
  const [t, r, g] = opts[pickIdx(st.id, opts.length)];
  return { trait: t, red: r, green: g };
}

export function fallbackHeadline(label, stations) {
  const avg = stations.reduce((a, s) => a + s.cigs, 0) / Math.max(1, stations.length);
  if (avg < 0.8) return `${label} is the one your mother wanted you to marry.`;
  if (avg < 2) return `${label}: nice on paper, a little dusty in person.`;
  if (avg < 4) return `${label} has commitment issues with clean air.`;
  return `${label} smokes ${avg.toFixed(1)} cigarettes a day and calls it a phase.`;
}

// ---------- Fallback: modelled air at the real station locations (Open-Meteo / CAMS, no key) ----------
function subIndex(kind, c) {
  const row = BP[kind].find((r) => c <= r[3]) || BP[kind].at(-1);
  const [iLo, iHi, cLo, cHi] = row;
  return iLo + ((Math.min(c, cHi) - cLo) * (iHi - iLo)) / (cHi - cLo);
}

export async function loadCityModel(id) {
  const { default: dir } = await import('./stations.json', { with: { type: 'json' } });
  const list = dir[id] || [];
  if (!list.length) throw new Error('no station directory for ' + id);
  const q = new URLSearchParams({
    latitude: list.map((s) => s.lat.toFixed(4)).join(','),
    longitude: list.map((s) => s.lon.toFixed(4)).join(','),
    hourly: 'pm2_5,pm10', past_hours: '24', forecast_hours: '0', timezone: 'Asia/Kolkata',
  });
  const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  let d = await r.json();
  if (!Array.isArray(d)) d = [d];
  const avg = (a) => { const v = (a || []).filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  return list.map((s, i) => {
    const h = d[i]?.hourly || {};
    const pm25c = avg(h.pm2_5), pm10c = avg(h.pm10);
    if (pm25c == null && pm10c == null) return null;
    const i25 = pm25c == null ? 0 : subIndex('pm25', pm25c);
    const i10 = pm10c == null ? 0 : subIndex('pm10', pm10c);
    const aqi = Math.round(Math.max(i25, i10));
    const pm25 = pm25c ?? pm10c * 0.55;
    return {
      id: s.id, name: tidy(s.id), city: s.city, lat: s.lat, lon: s.lon, updated: null,
      aqi, band: band(aqi).name, bandKey: band(aqi).key, driver: i25 >= i10 ? 'PM2.5' : 'PM10',
      pm25: Math.round(pm25), estimated: true, cigs: Math.round((pm25 / CIG_UGM3) * 10) / 10,
    };
  }).filter(Boolean).sort((a, b) => b.aqi - a.aqi);
}
