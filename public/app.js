import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFX } from './fx.js';
import { initMe } from './me.js';

const CITY_LIST = [['ncr', 'Delhi NCR'], ['blr', 'Bengaluru'], ['mum', 'Mumbai'], ['hyd', 'Hyderabad'], ['chn', 'Chennai'], ['kol', 'Kolkata']];
const BAND = { good: '#43b07a', sat: '#93bf4f', mod: '#e8b53e', poor: '#ea8545', vpoor: '#dd5265', severe: '#8f55b0' };
const BAND_ORDER = ['good', 'sat', 'mod', 'poor', 'vpoor', 'severe'];
const BAND_NAME = { good: 'Good', sat: 'Satisfactory', mod: 'Moderate', poor: 'Poor', vpoor: 'Very Poor', severe: 'Severe' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const CIG_SVG = `<svg viewBox="0 0 26 8"><rect x=".5" y="1" width="18" height="6" rx="1.2" fill="#fff" stroke="#2e2a40"/><rect x="18.5" y="1" width="6.5" height="6" rx="1.2" fill="#f7b27a" stroke="#2e2a40"/></svg>`;
const CIG_MINI = `<svg viewBox="0 0 26 8"><rect x=".5" y="1.5" width="17.5" height="5" rx="1.2" fill="#fff" stroke="#c9c3da"/><rect x="18" y="1.5" width="7" height="5" rx="1.2" fill="#f7b27a"/></svg>`;

// ================================================================ renderer, scene, post
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const BG_CLEAN = new THREE.Color('#d9c9c0'), BG_DIRTY = new THREE.Color('#c2b096');
const TOP_CLEAN = new THREE.Color('#8ea9d4'), TOP_DIRTY = new THREE.Color('#aaa192');
scene.fog = new THREE.FogExp2('#d9c9c0', 0.009);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 600);
const HOME = new THREE.Vector3(0, 25, 47);
const INTRO_FROM = new THREE.Vector3(0, 70, 115);
camera.position.copy(INTRO_FROM);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.06, minDistance: 10, maxDistance: 95, maxPolarAngle: Math.PI * 0.47 });
controls.target.set(0, 4, 0);
const fx = createFX(renderer, scene, camera, { bloom: 0.28, bloomThreshold: 0.96, bloomRadius: 0.45, tilt: 2.4, band: 0.14, focus: 0.46, vignette: 0.2, grain: 0.014, envIntensity: 0.3, exposure: 0.92 });

renderer.toneMapping = THREE.NeutralToneMapping;
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: TOP_CLEAN.clone() }, hor: { value: BG_CLEAN.clone() } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 top, hor; varying vec3 vP; void main(){ float y = max(vP.y, 0.0); gl_FragColor = vec4(mix(hor, top, pow(y, 0.55)), 1.0); }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat));

scene.add(new THREE.HemisphereLight('#fff4ec', '#a99cc4', 0.7));
const sun = new THREE.DirectionalLight('#fff0dc', 2.1);
sun.position.set(18, 34, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 110 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const rim = new THREE.DirectionalLight('#cbb9ff', 0.7);
rim.position.set(-20, 12, -30);
scene.add(rim);

// ================================================================ the map on the ground
const WORLD = 110, MAP = 2048;
const mapCanvas = document.createElement('canvas');
mapCanvas.width = mapCanvas.height = MAP;
const mapTex = new THREE.CanvasTexture(mapCanvas);
mapTex.colorSpace = THREE.SRGBColorSpace;
mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const skirt = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: '#bdb9a8', roughness: 1 }));
skirt.receiveShadow = true;
skirt.rotation.x = -Math.PI / 2; skirt.position.y = -0.02;
scene.add(skirt);
const heatCanvas = document.createElement('canvas');
heatCanvas.width = heatCanvas.height = MAP / 2;
const T = (x, z, s = MAP) => [(x / WORLD + 0.5) * s, (z / WORLD + 0.5) * s];

async function drawMap(d, pts, unitsPerDeg, world) {
  await document.fonts.load('800 40px "Space Grotesk"').catch(() => {});
  const g = mapCanvas.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  const bg = g.createRadialGradient(MAP / 2, MAP / 2, 0, MAP / 2, MAP / 2, MAP / 2);
  bg.addColorStop(0, '#cdd6c0'); bg.addColorStop(0.72, '#c8cfba'); bg.addColorStop(1, '#bdb9a8');
  g.fillStyle = bg; g.fillRect(0, 0, MAP, MAP);
  const u = MAP / WORLD;
  g.lineCap = g.lineJoin = 'round';
  // parks
  for (const pk of world.parks) {
    const [px, pz] = T(pk.x, pk.z);
    g.fillStyle = '#b3d1a3';
    g.beginPath();
    for (let a = 0; a <= 6.3; a += 0.3) { const rr = pk.r * u * (1 + Math.sin(a * 3 + pk.x) * 0.08); g.lineTo(px + Math.cos(a) * rr, pz + Math.sin(a) * rr * 0.9); }
    g.fill();
    g.strokeStyle = '#a3c592'; g.lineWidth = 6; g.stroke();
  }
  // roads: soft white ribbons
  for (const rd of world.roads) {
    g.beginPath();
    rd.forEach((p, i) => { const [px, pz] = T(p.x, p.z); i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
    g.strokeStyle = '#aea99c'; g.lineWidth = 30; g.stroke();
    g.strokeStyle = '#e6e0d4'; g.lineWidth = 22; g.stroke();
    g.setLineDash([22, 26]); g.strokeStyle = '#fbf7ef'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
  }
  // the river
  g.beginPath();
  world.river.forEach((p, i) => { const [px, pz] = T(p.x, p.z); i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
  g.strokeStyle = '#8fb3d2'; g.lineWidth = 84; g.stroke();
  g.strokeStyle = '#a7c6e0'; g.lineWidth = 60; g.stroke();
  g.setLineDash([40, 70]); g.strokeStyle = '#d3e4f2'; g.lineWidth = 4; g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(60,50,90,.10)';
  for (let x = -WORLD / 2; x <= WORLD / 2; x += 2) for (let z = -WORLD / 2; z <= WORLD / 2; z += 2) { const [px, pz] = T(x, z); g.fillRect(px - 1.5, pz - 1.5, 3, 3); }

  // pollution heat, blurred
  const h = heatCanvas.getContext('2d');
  h.clearRect(0, 0, heatCanvas.width, heatCanvas.height);
  h.globalCompositeOperation = 'source-over';
  d.stations.forEach((s, i) => {
    const [px, pz] = T(pts[i].x, pts[i].z, heatCanvas.width);
    const r = (3 + s.aqi / 45) * u / 2;
    const c = new THREE.Color(BAND[s.bandKey]);
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    const grd = h.createRadialGradient(px, pz, 0, px, pz, r);
    grd.addColorStop(0, `rgba(${rgb},.3)`); grd.addColorStop(0.5, `rgba(${rgb},.1)`); grd.addColorStop(1, `rgba(${rgb},0)`);
    h.fillStyle = grd; h.beginPath(); h.arc(px, pz, r, 0, 7); h.fill();
  });
  g.save();
  g.filter = 'blur(14px)';
  g.globalAlpha = 0.85;
  g.drawImage(heatCanvas, 0, 0, MAP, MAP);
  g.restore();

  // contour rings
  d.stations.forEach((s, i) => {
    const [px, pz] = T(pts[i].x, pts[i].z);
    g.strokeStyle = BAND[s.bandKey] + '99'; g.lineWidth = 3;
    for (const k of [0.9, 1.5]) { g.beginPath(); g.arc(px, pz, (1.2 + s.aqi / 90) * u * k, 0, 7); g.stroke(); }
  });

  // area labels at the centre of each sub-city
  const groups = {};
  d.stations.forEach((s, i) => { (groups[s.city] ||= []).push(pts[i]); });
  const names = Object.keys(groups);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (names.length > 1) for (const n of names) {
    const ps = groups[n], cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length;
    const [px, pz] = T(cx, cz + 3.5);
    g.font = '800 54px "Space Grotesk"';
    if ('letterSpacing' in g) g.letterSpacing = '10px';
    g.fillStyle = 'rgba(39,35,58,.2)';
    g.fillText(n.toUpperCase(), px, pz);
  }
  const maxZ = Math.max(...pts.map((p) => p.z)), minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x)), minZ = Math.min(...pts.map((p) => p.z));
  {
    const [px, pz] = T(0, Math.min(maxZ + 7, WORLD / 2 - 4));
    g.font = '800 150px "Space Grotesk"';
    if ('letterSpacing' in g) g.letterSpacing = '24px';
    g.fillStyle = 'rgba(111,91,214,.18)';
    g.fillText(d.label.toUpperCase(), px, pz);
  }
  // scale bar
  {
    const kmPerUnit = 111 / unitsPerDeg;
    const km = [1, 2, 5, 10, 20].find((k) => k / kmPerUnit >= 5) || 20;
    const len = (km / kmPerUnit) * u;
    const [px, pz] = T(minX - 1, Math.min(maxZ + 3.5, WORLD / 2 - 3));
    g.strokeStyle = 'rgba(46,42,64,.42)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(px, pz); g.lineTo(px + len, pz); g.moveTo(px, pz - 10); g.lineTo(px, pz + 10); g.moveTo(px + len, pz - 10); g.lineTo(px + len, pz + 10); g.stroke();
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.font = '700 30px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(46,42,64,.5)'; g.textAlign = 'left';
    g.fillText(`≈ ${km} km`, px, pz + 34);
  }
  // north arrow
  {
    const [px, pz] = T(Math.min(maxX + 3, WORLD / 2 - 3), Math.max(minZ - 1, -WORLD / 2 + 4));
    g.fillStyle = 'rgba(46,42,64,.5)';
    g.beginPath(); g.moveTo(px, pz - 34); g.lineTo(px + 14, pz + 6); g.lineTo(px, pz - 2); g.lineTo(px - 14, pz + 6); g.fill();
    g.font = '800 30px "Space Grotesk"'; g.textAlign = 'center';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillText('N', px, pz + 34);
  }
  mapTex.needsUpdate = true;
}

// ================================================================ creatures
const lumpBase = (() => {
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.05 * Math.sin(v.x * 5.1 + v.y * 3.3) + 0.04 * Math.sin(v.z * 6.7 - v.x * 2.1) + 0.03 * Math.sin(v.y * 8.9 + v.z);
    p.setXYZ(i, v.x * n, v.y * n, v.z * n);
  }
  g.computeVertexNormals();
  return g;
})();
const eyeGeo = new THREE.SphereGeometry(1, 20, 14);
const lidGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const smileGeo = new THREE.TorusGeometry(0.19, 0.045, 10, 24, Math.PI);
const flatGeo = new THREE.CapsuleGeometry(0.045, 0.24, 4, 8);
const tetherGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
const ringGeo = new THREE.RingGeometry(0.62, 0.74, 48);
const cylX = (r, len) => new THREE.CylinderGeometry(r, r, len, 14).rotateZ(-Math.PI / 2);
const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 });
const black = new THREE.MeshStandardMaterial({ color: '#2e2a40', roughness: 0.25 });
const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const blushMat = new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.55, depthWrite: false });
const leafMat = new THREE.MeshStandardMaterial({ color: '#6cc98a', roughness: 0.5 });
const paperMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 });
const filterMat = new THREE.MeshStandardMaterial({ color: '#f2a66e', roughness: 0.6 });
const tipMat = new THREE.MeshBasicMaterial({ color: '#ff6a1a', toneMapped: false });
const LUMPS = [[0, 0, 0, 1], [0.78, 0.1, -0.05, 0.72], [-0.78, 0.06, 0, 0.7], [0.32, 0.6, -0.15, 0.66], [-0.36, 0.55, -0.05, 0.6], [0, -0.28, 0.2, 0.72]];
const GREY = new THREE.Color('#dcd8e6');
// mesh → creature lookups live here, not in userData, so Object3D.clone() (which JSON-copies userData) stays safe
const ownerOf = new WeakMap();

function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function makeCreature(st, pos, density) {
  const col = new THREE.Color(BAND[st.bandKey]);
  const r = rng(st.id);
  const lumps = LUMPS.map(([x, y, z, s]) => {
    const sc = s * (0.88 + r() * 0.24);
    return lumpBase.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x + (r() - 0.5) * 0.12, y + (r() - 0.5) * 0.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), new THREE.Vector3(sc, sc, sc)));
  });
  const bodyGeo = mergeGeometries(lumps);
  const body = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: col.clone().lerp(new THREE.Color('#fff'), 0.65), emissive: col, emissiveIntensity: 0.08 });
  const g = new THREE.Group(), blob = new THREE.Group();
  g.add(blob);
  const bodyMesh = new THREE.Mesh(bodyGeo, body);
  bodyMesh.castShadow = true;
  blob.add(bodyMesh);

  const bad = ['poor', 'vpoor', 'severe'].includes(st.bandKey);
  const eyes = [];
  for (const sx of [-0.3, 0.3]) {
    const e = new THREE.Group();
    e.position.set(sx, 0.22, 0.83);
    const w = new THREE.Mesh(eyeGeo, white); w.scale.setScalar(0.21); e.add(w);
    const iris = new THREE.Group();
    const p = new THREE.Mesh(eyeGeo, black); p.scale.setScalar(0.11);
    const s = new THREE.Mesh(eyeGeo, shine); s.scale.setScalar(0.034); s.position.set(-0.035, 0.04, 0.1);
    iris.add(p, s); iris.position.z = 0.12;
    e.add(iris);
    if (bad) {
      const lid = new THREE.Mesh(lidGeo, body);
      lid.scale.setScalar(0.225);
      lid.rotation.x = st.bandKey === 'poor' ? 0.55 : 0.95;
      lid.rotation.z = sx < 0 ? -0.25 : 0.25;
      e.add(lid);
    }
    eyes.push({ e, iris });
    blob.add(e);
  }
  let mouth;
  if (st.bandKey === 'good' || st.bandKey === 'sat') { mouth = new THREE.Mesh(smileGeo, black); mouth.rotation.z = Math.PI; }
  else if (st.bandKey === 'mod') { mouth = new THREE.Mesh(flatGeo, black); mouth.rotation.z = Math.PI / 2; }
  else if (st.bandKey === 'severe') { mouth = new THREE.Mesh(eyeGeo, black); mouth.scale.set(0.12, 0.15, 0.05); }
  else mouth = new THREE.Mesh(smileGeo, black);
  mouth.position.set(0, -0.15, 0.93);
  blob.add(mouth);

  if (st.bandKey === 'good' || st.bandKey === 'sat') {
    for (const sx of [-0.52, 0.52]) { const b = new THREE.Mesh(eyeGeo, blushMat); b.scale.set(0.13, 0.07, 0.03); b.position.set(sx, -0.02, 0.8); b.rotation.y = sx * 0.6; blob.add(b); }
  }
  if (st.bandKey === 'good') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.28, 6), leafMat); stem.position.set(0.05, 1.08, 0);
    const l1 = new THREE.Mesh(eyeGeo, leafMat); l1.scale.set(0.16, 0.045, 0.09); l1.position.set(0.17, 1.22, 0); l1.rotation.z = 0.5;
    const l2 = l1.clone(); l2.position.x = -0.07; l2.rotation.z = -0.5;
    blob.add(stem, l1, l2);
  }
  let tip = null;
  if (bad) {
    const cig = new THREE.Group();
    const f = new THREE.Mesh(cylX(0.042, 0.11), filterMat); f.position.x = 0.055;
    const paper = new THREE.Mesh(cylX(0.041, 0.36), paperMat); paper.position.x = 0.29;
    const tp = new THREE.Mesh(cylX(0.043, 0.04), tipMat); tp.position.x = 0.49;
    cig.add(f, paper, tp);
    cig.position.set(0.16, -0.17, 0.92);
    cig.rotation.set(0, -0.55, -0.28);
    blob.add(cig);
    tip = tp;
  }

  const h = 1.8 + Math.min(st.aqi, 520) / 40;
  const s = (0.55 + Math.min(st.aqi, 500) / 430) * density;
  blob.position.y = h;
  const tetherMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.85), transparent: true, opacity: 0.6 });
  const tether = new THREE.Mesh(tetherGeo, tetherMat);
  tether.scale.y = Math.max(0.1, h - s * 0.6);
  tether.position.y = tether.scale.y / 2;
  g.add(tether);
  const ringMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.9), transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  g.add(ring);

  g.position.set(pos.x, 0, pos.z);
  g.userData = { st, blob, eyes, h, s, tip, ring, tether, body, base: col.clone(), phase: r() * 6.28, cough: st.bandKey === 'vpoor' || st.bandKey === 'severe', blinkAt: 1 + r() * 5, hover: 0, dim: 0, appear: 0, appearAt: 0, mats: [body, tetherMat, ringMat], geos: [bodyGeo] };
  blob.traverse((o) => { if (o.isMesh) ownerOf.set(o, g); });
  return g;
}

function layout(stations) {
  const lat0 = stations.reduce((a, s) => a + s.lat, 0) / stations.length;
  const lon0 = stations.reduce((a, s) => a + s.lon, 0) / stations.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const pts = stations.map((s) => ({ x: (s.lon - lon0) * k, z: -(s.lat - lat0) }));
  const d = pts.map((p) => Math.hypot(p.x, p.z)).sort((a, b) => a - b);
  const ref = d[Math.floor(d.length * 0.9)] || d.at(-1) || 0.1;
  const R = 20;
  for (const p of pts) {
    const r = Math.hypot(p.x, p.z);
    let rr = (r / ref) * R;
    if (rr > R) rr = R + (rr - R) * 0.25;
    const f = r ? rr / r : 0;
    p.x *= f; p.z *= f;
  }
  const min = stations.length > 40 ? 2.2 : 2.8;
  for (let it = 0; it < 140; it++) for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    let dx = pts[j].x - pts[i].x, dz = pts[j].z - pts[i].z, dist = Math.hypot(dx, dz);
    if (dist >= min) continue;
    if (dist < 1e-4) { dx = Math.cos(i + j); dz = Math.sin(i + j); dist = 1; }
    const push = (min - dist) / 2 / dist;
    pts[i].x -= dx * push; pts[i].z -= dz * push; pts[j].x += dx * push; pts[j].z += dz * push;
  }
  return { pts, unitsPerDeg: R / ref };
}

// ================================================================ the pastel world: parks, a river, roads, houses, trees, flowers, butterflies
const deco = new THREE.Group();
scene.add(deco);
const GREENS = ['#6fa97c', '#86b56d', '#6aa592', '#93bb78', '#5f9e78', '#7fb08e'];
const BLOSSOM = ['#e58fb0', '#d97fa2', '#eaa3bf', '#b89ae0', '#9d85d6', '#f0a58a'];
const HOUSE = ['#f3e6d8', '#ecd5d8', '#d8e0ee', '#dcead8', '#f1e5c4', '#e2dbf0'];
const ROOF = ['#d9667f', '#5f8fc9', '#8a72d0', '#4f9e7c', '#e08650', '#d6a93a'];
const PETALS = ['#e8759a', '#f2b3c6', '#f0cf5a', '#ffffff', '#a58fe0', '#f09a6a', '#dd5f7f', '#7fb4e0'];
const GEO = {
  trunk: new THREE.CylinderGeometry(0.08, 0.12, 0.9, 6).translate(0, 0.45, 0),
  ball: new THREE.IcosahedronGeometry(1, 2),
  cone: new THREE.ConeGeometry(0.62, 1.5, 8).translate(0, 0.75, 0),
  house: new RoundedBoxGeometry(1, 1, 1, 1, 0.06).translate(0, 0.5, 0),
  roof: new THREE.ConeGeometry(0.8, 0.55, 4).rotateY(Math.PI / 4).translate(0, 0.275, 0),
  door: new THREE.BoxGeometry(0.22, 0.34, 0.04).translate(0, 0.17, 0),
  flower: new THREE.IcosahedronGeometry(1, 1),
  stem: new THREE.CylinderGeometry(0.018, 0.018, 1, 4).translate(0, 0.5, 0),
};
const decoMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });

function inst(geo, list, cast = true) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, decoMat, list.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  list.forEach((it, i) => {
    m.setMatrixAt(i, M.compose(v.set(it.x, it.y || 0, it.z), q.setFromEuler(e.set(it.rx || 0, it.ry || 0, 0)), sc.set(it.sx, it.sy ?? it.sx, it.sz ?? it.sx)));
    m.setColorAt(i, c.set(it.c));
  });
  m.castShadow = cast; m.receiveShadow = true;
  deco.add(m);
  return m;
}
const distToLine = (x, z, line) => {
  let best = 1e9;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};

function buildWorld(pts, stations, seed) {
  for (const c of [...deco.children]) { deco.remove(c); c.dispose?.(); }
  const r = rng('world:' + seed), pick = (a) => a[Math.floor(r() * a.length)];
  const H = WORLD / 2 - 2;
  // a river that wanders across, and three soft roads through the middle
  const flip = r() < 0.5, z0 = (r() - 0.5) * 36, amp = 6 + r() * 6, f = 0.05 + r() * 0.04, ph = r() * 6;
  const river = [];
  for (let k = -WORLD / 2 - 4; k <= WORLD / 2 + 4; k += 3) { const w = z0 + Math.sin(k * f + ph) * amp + Math.sin(k * f * 2.3) * amp * 0.3; river.push(flip ? { x: w, z: k } : { x: k, z: w }); }
  const roads = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + r() * 0.6, ox = (r() - 0.5) * 16, oz = (r() - 0.5) * 16, bend = (r() - 0.5) * 8, line = [];
    for (let k = -1; k <= 1.001; k += 0.08) line.push({ x: ox + Math.cos(a) * k * 62 - Math.sin(a) * Math.sin(k * 3) * bend, z: oz + Math.sin(a) * k * 62 + Math.cos(a) * Math.sin(k * 3) * bend });
    roads.push(line);
  }
  const taken = [];
  const free = (x, z, rad, { station = 1.9, riverGap = 2.8, roadGap = 1.3 } = {}) => {
    if (Math.abs(x) > H || Math.abs(z) > H) return false;
    if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < station)) return false;
    if (distToLine(x, z, river) < riverGap) return false;
    if (roads.some((l) => distToLine(x, z, l) < roadGap)) return false;
    return !taken.some((t) => Math.hypot(t.x - x, t.z - z) < t.r + rad);
  };
  const take = (x, z, rad) => taken.push({ x, z, r: rad });
  const parks = [];
  for (let n = 0; n < 60 && parks.length < 7; n++) {
    const x = (r() - 0.5) * 90, z = (r() - 0.5) * 90, pr = 3 + r() * 3;
    if (distToLine(x, z, river) > pr + 2 && !parks.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + pr + 3) && Math.abs(x) < H - pr && Math.abs(z) < H - pr) parks.push({ x, z, r: pr });
  }

  const trunks = [], balls = [], cones = [], houses = [], roofs = [], doors = [], flowers = [], stems = [];
  const tree = (x, z, s = 0.7 + r() * 0.5) => {
    const kind = r();
    trunks.push({ x, z, sx: s, c: '#9c7a62' });
    if (kind < 0.28) cones.push({ x, y: 0.55 * s, z, sx: s, sy: s * (0.9 + r() * 0.4), c: pick(GREENS) });
    else {
      const col = kind < 0.52 ? pick(BLOSSOM) : pick(GREENS), cs = s * (0.62 + r() * 0.25);
      balls.push({ x, y: 0.9 * s + cs * 0.7, z, sx: cs, sy: cs * 0.92, c: col, ry: r() * 6 });
      if (r() < 0.45) balls.push({ x: x + (r() - 0.5) * cs, y: 0.9 * s + cs * 1.25, z: z + (r() - 0.5) * cs, sx: cs * 0.62, c: col, ry: r() * 6 });
    }
    take(x, z, 0.7 * s);
  };
  const bloom = (x, z, n, spread) => {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.3, d = Math.sqrt(r()) * spread, fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, h = 0.12 + r() * 0.16;
      stems.push({ x: fx, z: fz, sx: 1, sy: h, c: '#5f9e6a' });
      flowers.push({ x: fx, y: h + 0.02, z: fz, sx: 0.07 + r() * 0.05, c: pick(PETALS) });
    }
  };
  // parks: a ring of trees, a meadow of flowers
  for (const pk of parks) {
    const n = Math.round(pk.r * 2.2);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.3 + r() * 0.3, x = pk.x + Math.cos(a) * pk.r * 0.85, z = pk.z + Math.sin(a) * pk.r * 0.8; if (free(x, z, 0.5)) tree(x, z); }
    for (let i = 0; i < 5; i++) bloom(pk.x + (r() - 0.5) * pk.r, pk.z + (r() - 0.5) * pk.r, 12, 1.1);
  }
  // little houses along the roads, and a few loose ones
  for (let n = 0; n < 420 && houses.length < 70; n++) {
    let x, z, ry = r() * 6;
    if (r() < 0.65) {
      const l = pick(roads), i = 1 + Math.floor(r() * (l.length - 2)), a = l[i - 1], b = l[i], side = r() < 0.5 ? -1 : 1, len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len, off = 2.1 + r() * 1.4;
      x = a.x + nx * off * side; z = a.z + nz * off * side; ry = Math.atan2(b.x - a.x, b.z - a.z) + (side > 0 ? 0 : Math.PI);
    } else { x = (r() - 0.5) * 100; z = (r() - 0.5) * 100; }
    if (!free(x, z, 0.8, { station: 2.4 }) || parks.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 0.8)) continue;
    const w = 0.7 + r() * 0.45, h = 0.55 + r() * 0.6, d = 0.7 + r() * 0.35;
    houses.push({ x, z, sx: w, sy: h, sz: d, ry, c: pick(HOUSE) });
    roofs.push({ x, y: h, z, sx: w * 1.05, sy: 0.8 + r() * 0.6, sz: d * 1.05, ry, c: pick(ROOF) });
    doors.push({ x: x + Math.sin(ry) * (d / 2 + 0.01), z: z + Math.cos(ry) * (d / 2 + 0.01), sx: 1, ry, c: pick(ROOF) });
    take(x, z, 0.8);
    if (r() < 0.5) bloom(x + Math.sin(ry) * (d / 2 + 0.3), z + Math.cos(ry) * (d / 2 + 0.3), 5, 0.35);
  }
  // loose trees and meadows
  for (let n = 0; n < 900 && trunks.length < 190; n++) {
    const x = (r() - 0.5) * 104, z = (r() - 0.5) * 104;
    if (free(x, z, 0.55)) { tree(x, z); if (r() < 0.25) bloom(x, z, 6, 0.9); }
  }
  // clean air grows flowers around the station
  stations.forEach((st, i) => {
    if (st.bandKey !== 'good' && st.bandKey !== 'sat') return;
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28, h = 0.14 + r() * 0.1; stems.push({ x: pts[i].x + Math.cos(a) * 1.05, z: pts[i].z + Math.sin(a) * 1.05, sx: 1, sy: h, c: '#5f9e6a' }); flowers.push({ x: pts[i].x + Math.cos(a) * 1.05, y: h, z: pts[i].z + Math.sin(a) * 1.05, sx: 0.09, c: pick(PETALS) }); }
  });

  inst(GEO.trunk, trunks); inst(GEO.ball, balls); inst(GEO.cone, cones);
  inst(GEO.house, houses); inst(GEO.roof, roofs); inst(GEO.door, doors, false);
  inst(GEO.stem, stems, false); inst(GEO.flower, flowers, false);
  deco.userData.grow = 0;

  // butterflies drift between the parks
  const homes = parks.length ? parks : [{ x: 0, z: 0, r: 8 }];
  butterflies.forEach((b, i) => { const pk = homes[i % homes.length]; b.userData.c.set(pk.x, 0, pk.z); b.userData.rad = pk.r * (0.6 + r() * 0.6); });

  // somewhere quiet, off the ranking: the golden egg
  // in view from the home camera, but in a quiet corner of it
  let ex = 14, ez = 10;
  for (let n = 0; n < 400; n++) { const x = 7 + r() * 11, z = r() * 16; if (free(x, z, 1.4, { station: 4.5, riverGap: 2, roadGap: 1 })) { ex = x; ez = z; break; } }
  egg.position.set(ex, 0, ez);
  take(ex, ez, 1.4);
  return { parks, river, roads };
}

// butterflies
const wingTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(26, 22, 24, 18, -0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(22, 46, 16, 13, 0.4, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(30, 20, 6, 0, 7); g.fill();
  g.strokeStyle = 'rgba(80,60,110,.35)'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(26, 22, 23, 17, -0.5, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const wingGeo = new THREE.PlaneGeometry(0.36, 0.36).translate(0.18, 0, 0).rotateX(-Math.PI / 2);
const bodyGeo = new THREE.CapsuleGeometry(0.025, 0.16, 2, 6).rotateX(Math.PI / 2);
const bodyMat = new THREE.MeshBasicMaterial({ color: '#5a4a6a' });
const butterflies = Array.from({ length: 12 }, (_, i) => {
  const m = new THREE.MeshBasicMaterial({ map: wingTex, color: ['#ffb3c8', '#c9b8ff', '#ffe08a', '#a8d8ff', '#ffc49a', '#b8f0cf'][i % 6], side: THREE.DoubleSide, alphaTest: 0.4 });
  const g = new THREE.Group(), wl = new THREE.Mesh(wingGeo, m), wr = new THREE.Mesh(wingGeo, m);
  wl.scale.x = -1;
  g.add(wl, wr, new THREE.Mesh(bodyGeo, bodyMat));
  g.userData = { wl, wr, c: new THREE.Vector3(), rad: 3, ph: Math.random() * 20, sp: 0.35 + Math.random() * 0.3, last: new THREE.Vector3() };
  scene.add(g);
  return g;
});

// clouds, far away, drifting
const clouds = Array.from({ length: 9 }, (_, i) => {
  const parts = [];
  for (let k = 0; k < 6; k++) { const s = 1 + Math.random() * 1.2; parts.push(new THREE.IcosahedronGeometry(1, 2).scale(s * 1.4, s, s).translate((k - 2.5) * 1.5 + Math.random(), Math.random() * 0.8, (Math.random() - 0.5) * 1.5)); }
  const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: '#f4efec', emissive: '#f4e6ea', emissiveIntensity: 0.25, roughness: 1 }));
  const s = 2.2 + Math.random() * 1.6;
  m.scale.set(s, s * 0.7, s);
  m.userData = { a: (i / 9) * Math.PI * 2 + Math.random() * 0.5, rad: 78 + Math.random() * 30, y: 14 + Math.random() * 12 };
  scene.add(m);
  return m;
});

// the golden easter egg
const egg = new THREE.Group();
let eggLabel = null;
{
  const gold = new THREE.MeshPhysicalMaterial({ color: '#f3cd63', metalness: 0.55, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.6, sheenColor: new THREE.Color('#fff4c4'), emissive: '#7a5200', emissiveIntensity: 0.12 });
  const r = rng('hitesh');
  const blob = new THREE.Group();
  const geo = mergeGeometries(LUMPS.map(([x, y, z, s]) => lumpBase.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), new THREE.Vector3(s, s, s)))));
  const body = new THREE.Mesh(geo, gold); body.castShadow = true;
  const shades = new THREE.MeshStandardMaterial({ color: '#2e2a40', roughness: 0.1, metalness: 0.4 });
  const lens = new RoundedBoxGeometry(0.34, 0.2, 0.08, 2, 0.05);
  const l1 = new THREE.Mesh(lens, shades); l1.position.set(-0.22, 0.24, 0.95);
  const l2 = l1.clone(); l2.position.x = 0.22;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), shades); bridge.position.set(0, 0.28, 0.96);
  const grin = new THREE.Mesh(smileGeo, black); grin.position.set(0, -0.14, 0.93);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.28, 6), leafMat); stem.position.set(0.05, 1.08, 0);
  const leaf = new THREE.Mesh(eyeGeo, leafMat); leaf.scale.set(0.16, 0.045, 0.09); leaf.position.set(0.17, 1.22, 0); leaf.rotation.z = 0.5;
  blob.add(body, l1, l2, bridge, grin, stem, leaf);
  blob.position.y = 1.5; blob.scale.setScalar(0.85);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#e8b93f', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.scale.setScalar(1.4);
  const sp = new Float32Array(40 * 3);
  const spark = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: '#ffe38a', size: 0.14, transparent: true, opacity: 0.9, depthWrite: false }));
  spark.frustumCulled = false;
  egg.add(blob, ring, spark);
  egg.userData = { i: -2, egg: true, blob, sp, spark, h: 1.5, s: 0.85 };
  blob.traverse((o) => { if (o.isMesh) ownerOf.set(o, egg); });
  scene.add(egg);
}

// ================================================================ drifting smog + cigarette smoke
const cloudTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 70 + Math.random() * 116, y = 80 + Math.random() * 96, r = 40 + Math.random() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const smog = Array.from({ length: 26 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: '#cdbb9a', transparent: true, opacity: 0, depthWrite: false, fog: false }));
  const sc = 16 + Math.random() * 18;
  s.scale.set(sc, sc * 0.55, 1);
  s.position.set((Math.random() - 0.5) * 70, 2.5 + Math.random() * 7, (Math.random() - 0.5) * 60);
  s.userData.v = 0.25 + Math.random() * 0.5;
  scene.add(s);
  return s;
});
let smogTarget = 0;

const SMOKE_N = 700;
const smokeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const smokeGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(SMOKE_N * 3), sAlpha = new Float32Array(SMOKE_N), sSize = new Float32Array(SMOKE_N);
smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1));
smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
const smokeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uTex: { value: smokeTex }, uPx: { value: 1 } },
  vertexShader: `uniform float uPx; attribute float aAlpha; attribute float aSize; varying float vA;
    void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPx * (240.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform sampler2D uTex; varying float vA;
    void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(0.6, 0.57, 0.64, a); }`,
});
const smoke = new THREE.Points(smokeGeo, smokeMat);
smoke.frustumCulled = false;
scene.add(smoke);
const parts = Array.from({ length: SMOKE_N }, () => ({ owner: -1, age: 1, life: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }));
let smokeCdf = [];
const _w = new THREE.Vector3();
function rebuildSmoke() {
  let acc = 0;
  smokeCdf = [];
  creatures.forEach((c, i) => { if (c.userData.tip) { acc += Math.max(1, c.userData.st.aqi - 150) ** 1.2; smokeCdf.push([acc, i]); } });
  for (const p of parts) { p.owner = -1; p.y = -99; p.age = p.life; }
}
function spawn(p) {
  if (!smokeCdf.length) return;
  const r = Math.random() * smokeCdf.at(-1)[0];
  const i = smokeCdf.find(([a]) => a >= r)[1], u = creatures[i].userData;
  if (u.appear < 0.9) return;
  u.tip.getWorldPosition(_w);
  Object.assign(p, { owner: i, age: 0, life: 1.8 + Math.random() * 1.8, x: _w.x, y: _w.y + 0.05, z: _w.z, vx: 0.15 + Math.random() * 0.2, vy: 0.55 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.2, s: 0.25 + u.s * 0.35 });
}
function updateSmoke(dt) {
  for (let i = 0; i < SMOKE_N; i++) {
    const p = parts[i];
    p.age += dt;
    if (p.age >= p.life) { p.owner = -1; if (Math.random() < 0.06) spawn(p); }
    p.x += (p.vx + Math.sin(p.age * 2 + i) * 0.15) * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const k = Math.min(1, p.age / p.life);
    sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.owner < 0 ? -99 : p.y; sPos[i * 3 + 2] = p.z;
    sAlpha[i] = p.owner < 0 ? 0 : Math.sin(Math.PI * k) * 0.45;
    sSize[i] = p.s * (1 + k * 4);
  }
  smokeGeo.attributes.position.needsUpdate = smokeGeo.attributes.aAlpha.needsUpdate = smokeGeo.attributes.aSize.needsUpdate = true;
}

// ================================================================ state + loading
let data = null, creatures = [], pickables = [], sel = -1, hover = -1, order = [], sortBest = false;
const labels = $('labels'), labelEls = new Map(), cache = new Map();
const clock = new THREE.Clock();

async function fetchCity(id) {
  if (cache.has(id)) return cache.get(id);
  const r = await fetch(`/api/city?c=${id}`);
  const d = await r.json().catch(() => ({ error: 'Bad response' }));
  if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);
  cache.set(id, d);
  return d;
}

function clearCity() {
  for (const c of creatures) { scene.remove(c); c.userData.mats.forEach((m) => m.dispose()); c.userData.geos.forEach((g) => g.dispose()); }
  creatures = []; pickables = []; sel = -1; hover = -1;
  labels.innerHTML = ''; labelEls.clear(); eggLabel = null;
}

const LOAD_MSGS = ['Asking CPCB how bad it is', 'Counting cigarettes', 'Teaching smog to flirt', 'Holding our breath', 'Writing red flags'];
const loadMsgT = setInterval(() => { $('loadMsg').textContent = LOAD_MSGS[Math.floor(Math.random() * LOAD_MSGS.length)]; }, 1500);
let firstLoad = true, intro = null, flight = null;

async function loadCity(id, focusId) {
  document.querySelectorAll('#cities button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  $('railEyebrow').textContent = `${CITY_LIST.find((c) => c[0] === id)[1]} · loading`;
  $('headline').textContent = 'Inhaling the data…';
  closeCard(true);
  let d;
  try { d = await fetchCity(id); }
  catch (e) {
    $('railEyebrow').textContent = 'No signal';
    $('headline').textContent = e.message;
    $('list').innerHTML = `<div class="empty"><button class="chip" id="retry">Try again</button></div>`;
    $('retry').onclick = () => { cache.delete(id); loadCity(id); };
    finishBoot();
    return;
  }
  data = d;
  clearCity();
  const { pts, unitsPerDeg } = layout(d.stations);
  const density = d.stations.length > 30 ? 0.78 : d.stations.length < 12 ? 1.35 : 1;
  const tNow = clock.elapsedTime, n = d.stations.length;
  d.stations.forEach((st, i) => {
    const c = makeCreature(st, pts[i], density);
    c.userData.i = i;
    c.userData.appearAt = tNow + (firstLoad ? 1.3 : 0.15) + ((n - i) / n) * 0.9 + Math.random() * 0.2;
    creatures.push(c);
    scene.add(c);
    c.userData.blob.traverse((o) => { if (o.isMesh) pickables.push(o); });
  });
  pickables.push(...egg.userData.blob.children);
  rebuildSmoke();
  drawMap(d, pts, unitsPerDeg, buildWorld(pts, d.stations, d.id || id));

  const avg = d.stations.reduce((a, s) => a + s.cigs, 0) / n;
  mood.target = Math.min(1, avg / 6);
  smogTarget = 0.02 + mood.target * 0.09;

  const when = d.generated ? new Date(d.generated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const src = d.source === 'model' ? 'modelled · CPCB offline' : d.stale ? 'last known' : 'live CPCB';
  $('liveDot').classList.toggle('off', d.source === 'model' || !!d.stale);
  $('railEyebrow').textContent = `${d.label} · ${src} · ${when}`;
  $('headline').textContent = `“${d.headline}”`;
  countUp($('stAvg'), avg, 1);
  countUp($('stWorst'), d.stations[0].aqi, 0);
  countUp($('stN'), n, 0);
  const counts = Object.fromEntries(BAND_ORDER.map((b) => [b, 0]));
  d.stations.forEach((s) => counts[s.bandKey]++);
  $('dist').innerHTML = BAND_ORDER.filter((b) => counts[b]).map((b) => `<i style="flex-grow:${counts[b]};background:${BAND[b]}" title="${BAND_NAME[b]}: ${counts[b]}"></i>`).join('');
  renderList();

  getRoast(id);
  store.set('tt-city', id);
  const u = new URL(location.href);
  u.searchParams.set('c', id); u.searchParams.delete('s');
  history.replaceState(null, '', u);
  finishBoot();

  if (!firstLoad) flyTo(new THREE.Vector3(0, 4, 0), HOME, 1200);
  firstLoad = false;
  if (focusId) {
    const i = d.stations.findIndex((s) => s.id === focusId);
    if (i >= 0) setTimeout(() => select(i), 2600);
  }
}

let introPending = false;
// AI roasts arrive separately (written once an hour per city) and replace the hand-written ones.
const roasts = new Map();
async function getRoast(id) {
  let r = roasts.get(id);
  if (!r) {
    try { const res = await fetch(`/api/roast?c=${id}`); r = res.ok ? await res.json() : null; } catch { r = null; }
    if (!r) return;
    roasts.set(id, r);
  }
  for (const d of [cache.get(id), data?.id === id ? data : null]) {
    if (!d || d.ai) continue;
    d.stations.forEach((st) => { const a = r.s?.[st.id]; if (a) { st.trait = a.t || st.trait; st.red = a.r || st.red; st.green = a.g || st.green; } });
    if (r.headline) d.headline = r.headline;
    d.ai = true;
  }
  if (data?.id !== id) return;
  const h = $('headline');
  h.style.transition = 'opacity .3s'; h.style.opacity = '0';
  setTimeout(() => { h.textContent = `“${data.headline}”`; h.style.opacity = '1'; }, 300);
  if (sel >= 0) {
    const st = creatures[sel].userData.st;
    $('cTrait').textContent = st.trait; $('cRed').textContent = st.red; $('cGreen').textContent = st.green;
    $('cMeta').textContent = 'CPCB station · personality by a small AI model';
  }
}

function finishBoot() {
  if ($('loading').classList.contains('done')) return;
  $('loading').classList.add('done');
  clearInterval(loadMsgT);
  if (me.isIntroOpen()) introPending = true; else startIntro();
}
function startIntro() {
  intro = { t: 0 };
  const t = clock.elapsedTime, n = creatures.length;
  creatures.forEach((c, i) => (c.userData.appearAt = t + 1.1 + ((n - i) / n) * 0.9 + Math.random() * 0.2));
  deco.userData.grow = 0;
  setTimeout(() => document.body.classList.remove('boot'), 900);
}

function countUp(el, to, dec) {
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / 900);
    el.textContent = (to * ease(k)).toFixed(dec);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderList() {
  if (!data) return;
  const q = $('q').value.trim().toLowerCase();
  order = data.stations.map((_, i) => i);
  if (sortBest) order.reverse();
  const shown = order.filter((i) => !q || `${data.stations[i].name} ${data.stations[i].city}`.toLowerCase().includes(q));
  $('list').innerHTML = shown.length ? shown.map((i) => {
    const s = data.stations[i];
    return `<button class="row${i === sel ? ' on' : ''}" data-i="${i}">
      <span class="n">${String(i + 1).padStart(2, '0')}</span>
      <span><b>${esc(s.name)}</b><small>${esc(s.city)} · ${CIG_MINI} ${s.cigs}/day</small><span class="meter"><i style="width:${Math.min(100, s.aqi / 5)}%;background:${BAND[s.bandKey]}"></i></span></span>
      <span class="aqi" style="background:${BAND[s.bandKey]}">${s.aqi}</span>
    </button>`;
  }).join('') : `<div class="empty">No station matches “${esc(q)}”.</div>`;
  $('list').querySelectorAll('.row').forEach((b) => (b.onclick = () => select(+b.dataset.i)));
}
$('q').addEventListener('input', renderList);
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const r = $('list').querySelector('.row'); if (r) select(+r.dataset.i); } });
$('sort').onclick = () => { sortBest = !sortBest; $('sort').querySelector('span').textContent = sortBest ? 'Best first' : 'Worst first'; renderList(); };

function flyTo(target, camPos, ms = 1000) {
  flight = { t0: performance.now(), ms, fromT: controls.target.clone(), toT: target.clone(), fromC: camera.position.clone(), toC: camPos.clone() };
}

// ================================================================ profile card + live portrait
const pCanvas = $('portrait');
const pr = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
pr.toneMapping = THREE.ACESFilmicToneMapping;
pr.setPixelRatio(Math.min(devicePixelRatio, 2));
const pScene = new THREE.Scene();
pScene.environment = new THREE.PMREMGenerator(pr).fromScene(new RoomEnvironment(), 0.04).texture;
pScene.environmentIntensity = 0.3;
pScene.add(new THREE.HemisphereLight('#ffffff', '#223', 0.55));
const pKey = new THREE.DirectionalLight('#fff4e0', 1.7); pKey.position.set(3, 4, 5); pScene.add(pKey);
const pRim = new THREE.DirectionalLight('#ffffff', 1.2); pRim.position.set(-4, 2, -3); pScene.add(pRim);
const pCam = new THREE.PerspectiveCamera(26, 1.5, 0.1, 50);
pCam.position.set(0, 0.3, 8.6); pCam.lookAt(0, -0.2, 0);
let pObj = null;

function setPortrait(c) {
  if (pObj) pScene.remove(pObj);
  pObj = c.userData.blob.clone(true);
  pObj.position.set(0, 0, 0); pObj.scale.setScalar(1); pObj.rotation.set(0, 0, 0);
  pScene.add(pObj);
}
function renderPortrait(t) {
  if (!pObj || !$('card').classList.contains('open')) return;
  const w = pCanvas.clientWidth, h = pCanvas.clientHeight;
  if (!w || !h) return;
  if (pCanvas.width !== Math.round(w * pr.getPixelRatio())) { pr.setSize(w, h, false); pCam.aspect = w / h; pCam.updateProjectionMatrix(); }
  pObj.rotation.y = Math.sin(t * 0.7) * 0.5;
  pObj.position.y = Math.sin(t * 1.4) * 0.06 - 0.05;
  pr.render(pScene, pCam);
}

function select(i) {
  if (!data || i < 0 || i >= creatures.length) return;
  sel = i;
  const c = creatures[i], u = c.userData;
  const target = new THREE.Vector3(c.position.x, u.h, c.position.z);
  const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
  const side = innerWidth > 760 ? new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(-2.8) : new THREE.Vector3(0, -1.5, 0);
  flyTo(target.clone().add(side), target.clone().add(dir.multiplyScalar(14)).add(new THREE.Vector3(0, 4.5, 0)).add(side), 900);
  fillCard(u.st);
  setPortrait(c);
  document.querySelectorAll('.row').forEach((r) => r.classList.toggle('on', +r.dataset.i === i));
  document.querySelector(`.row[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const url = new URL(location.href);
  url.searchParams.set('s', u.st.id);
  history.replaceState(null, '', url);
  touched();
}

const COMPAT = [[80, 'Soulmate material. Marry this air.'], [60, 'Could work. Keep a purifier handy.'], [40, 'Situationship. Don’t move in yet.'], [20, 'Toxic. Everyone says you can do better.'], [0, 'Run. Hold your breath while you do.']];
const ICO = {
  pin: '<svg class="i" viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2"/></svg>',
  lung: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v8M12 12c-2 0-3-1-3-3M12 12c2 0 3-1 3-3M8 8c-3 1-5 5-5 9 0 2 1 3 3 3 3 0 3-3 3-6M16 8c3 1 5 5 5 9 0 2-1 3-3 3-3 0-3-3-3-6"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};
function fillCard(st) {
  const c = BAND[st.bandKey];
  $('cPhoto').style.background = `radial-gradient(120% 90% at 50% 20%, ${shade(c, 0.35)}, ${c} 45%, ${shade(c, -0.55)})`;
  $('cName').textContent = st.name;
  $('cAqi').textContent = st.aqi;
  $('cStamp').textContent = st.band.toUpperCase();
  $('cStamp').style.color = '#2e2a40';
  $('cCity').innerHTML = `${ICO.pin}${esc(st.city)}`;
  $('cDriver').innerHTML = `${ICO.lung}${st.driver} is the problem`;
  $('cTime').innerHTML = `${ICO.clock}${st.updated ? `Active ${fmtTime(st.updated)}` : 'Modelled'}`;
  const compat = Math.max(1, Math.min(99, Math.round(100 - st.aqi / 4.2)));
  $('cCompat').textContent = `${compat}%`;
  $('cCompatBar').style.width = '0%';
  setTimeout(() => ($('cCompatBar').style.width = `${compat}%`), 60);
  $('cCompatTxt').textContent = COMPAT.find(([m]) => compat >= m)[1];
  $('cCigs').textContent = st.cigs < 0.5 ? 'less than one cigarette' : `${st.cigs} cigarette${st.cigs === 1 ? '' : 's'}${st.estimated ? ' (est.)' : ''}`;
  const n = Math.round(st.cigs);
  $('cCigRow').innerHTML = n ? CIG_SVG.repeat(Math.min(n, 24)) + (n > 24 ? `<b style="font-size:12px;align-self:center">+${n - 24}</b>` : '') : '<span style="font-size:13px;color:#7c7892">Suspiciously healthy.</span>';
  $('cTrait').textContent = st.trait;
  $('cRed').textContent = st.red;
  $('cGreen').textContent = st.green;
  $('cMeta').textContent = `CPCB station · ${data?.ai ? 'personality by a small AI model' : 'hand-written personality'}`;
  const card = $('card');
  card.classList.remove('fly-l', 'fly-r');
  card.classList.add('open');
  card.querySelector('.card-body').scrollTop = 0;
  document.body.classList.add('card-open');
}
function closeCard(silent) {
  $('card').classList.remove('open');
  document.body.classList.remove('card-open');
  document.querySelectorAll('.row.on').forEach((r) => r.classList.remove('on'));
  if (sel >= 0) { sel = -1; if (!silent) flyTo(new THREE.Vector3(0, 4, 0), HOME); }
}
const shade = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(k < 0 ? '#000' : '#fff'), Math.abs(k)).getHexString();
function fmtTime(s) {
  const m = s.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/);
  if (!m) return s;
  return `${m[4]}:${m[5]}, ${+m[1]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]}`;
}

const LEFT = ['Left-swiped. Your lungs thank you.', 'Bold. Moving to the hills?', 'Unmatched. The air didn’t notice.', 'Blocked and reported. To CPCB.'];
const RIGHT = ['It’s a match! Your N95 ships tomorrow.', 'Matched. Rent is due on the 5th.', 'You matched with the air. It’s already inside you.', 'Match! It says it’s “working on itself.”'];
function swipe(dir) {
  if (sel < 0) return;
  const card = $('card');
  card.classList.add(dir < 0 ? 'fly-l' : 'fly-r');
  toast((dir < 0 ? LEFT : RIGHT)[Math.floor(Math.random() * 4)]);
  const next = order[(order.indexOf(sel) + 1) % order.length];
  setTimeout(() => { card.classList.remove('open', 'fly-l', 'fly-r'); requestAnimationFrame(() => select(next)); }, 380);
}

let toastT;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

// share card: the live portrait + the profile, as one PNG
async function share() {
  const st = creatures[sel]?.userData.st;
  if (!st) return;
  renderPortrait(clock.elapsedTime);
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'), col = BAND[st.bandKey];
  await Promise.all(['800 60px "Space Grotesk"', '700 58px \"Space Grotesk\"'].map((f) => document.fonts.load(f).catch(() => {})));
  const grd = g.createLinearGradient(0, 0, 0, 760);
  grd.addColorStop(0, shade(col, 0.3)); grd.addColorStop(1, shade(col, -0.5));
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const pw = pCanvas.width, ph = pCanvas.height, sc = Math.max(W / pw, 760 / ph);
  g.drawImage(pCanvas, (W - pw * sc) / 2, (760 - ph * sc) / 2, pw * sc, ph * sc);
  g.fillStyle = '#fffdf9';
  g.beginPath(); g.roundRect(40, 700, W - 80, H - 740, 48); g.fill();
  g.fillStyle = '#2e2a40'; g.font = '800 76px "Space Grotesk"';
  g.fillText(`${st.name}, ${st.aqi}`, 90, 810);
  g.font = '600 32px "Space Grotesk"'; g.fillStyle = '#7c7892';
  g.fillText(`${st.city} · AQI ${st.band} · ${st.cigs} cigarettes a day`, 90, 862);
  const block = (q, a, y) => {
    g.fillStyle = '#7c7892'; g.font = '700 26px "Space Grotesk"'; g.fillText(q.toUpperCase(), 90, y);
    g.fillStyle = '#2e2a40'; g.font = '700 42px "Space Grotesk"';
    let line = '', yy = y + 52;
    for (const w of a.split(' ')) { if (g.measureText(line + w).width > W - 180) { g.fillText(line, 90, yy); line = ''; yy += 52; } line += w + ' '; }
    g.fillText(line, 90, yy);
    return yy + 70;
  };
  block('Red flag', st.red, block('My toxic trait is', st.trait, 950));
  const tg = g.createLinearGradient(90, 0, 520, 0); tg.addColorStop(0, '#3fa872'); tg.addColorStop(0.5, '#6f5bd6'); tg.addColorStop(1, '#d9577f');
  g.fillStyle = tg; g.font = '700 58px \"Space Grotesk\"'; g.fillText('Toxic Traits', 90, H - 80);
  g.fillStyle = '#7c7892'; g.font = '600 26px "Space Grotesk"'; g.textAlign = 'right'; g.fillText(`live CPCB data · ${location.host}`, W - 90, H - 88);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `toxic-traits-${st.name.replace(/\W+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  const text = `${st.name} (${st.city}) is “${st.band}” today: AQI ${st.aqi}, like smoking ${st.cigs} cigarettes. Toxic trait: ${st.trait}`;
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text, url: location.href }); return; }
  } catch { return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  try { await navigator.clipboard.writeText(`${text}\n${location.href}`); } catch {}
  toast('Profile card downloaded, caption copied.');
}

// ================================================================ versus
async function renderVs() {
  const a = $('vsA').value, b = $('vsB').value;
  $('vsVerdict').textContent = 'Sniffing both cities…';
  const [ra, rb] = await Promise.allSettled([fetchCity(a), fetchCity(b)]);
  if (ra.status !== 'fulfilled' || rb.status !== 'fulfilled') { $('vsVerdict').textContent = 'One of them isn’t picking up. Try again in a minute.'; return; }
  const stat = (d) => {
    const n = d.stations.length, sorted = [...d.stations].sort((x, y) => x.aqi - y.aqi), med = sorted[Math.floor(n / 2)];
    return { d, avg: d.stations.reduce((x, s) => x + s.cigs, 0) / n, worst: d.stations[0].aqi, poor: Math.round((d.stations.filter((s) => s.aqi > 200).length / n) * 100), med };
  };
  const A = stat(ra.value), B = stat(rb.value);
  $('vsBlobs').innerHTML = [A, B].map((x) => `<div class="vs-blob"><div class="face" style="background:${BAND[x.med.bandKey]}"></div><div><b>${esc(x.d.label)}</b><small>Typical station: ${x.med.band} · ${x.d.stations.length} stations</small></div></div>`).join('');
  const row = (label, va, vb, f) => `<div class="vs-row"><div class="lbl"><b>${f(va)}</b><span>${label}</span><b>${f(vb)}</b></div>
    <div class="tug"><i style="flex-grow:${Math.max(va, 0.01)};background:${BAND[A.med.bandKey]}"></i><i style="flex-grow:${Math.max(vb, 0.01)};background:${BAND[B.med.bandKey]}"></i></div></div>`;
  $('vsRows').innerHTML = row('cigarettes a day, average', A.avg, B.avg, (v) => v.toFixed(1)) + row('worst station AQI', A.worst, B.worst, (v) => v) + row('stations Poor or worse', A.poor, B.poor, (v) => `${v}%`);
  if (a === b) { $('vsVerdict').textContent = 'A city can’t out-smoke itself. Pick a rival.'; return; }
  const [w, l, wv, lv] = A.avg >= B.avg ? [A.d.label, B.d.label, A.avg, B.avg] : [B.d.label, A.d.label, B.avg, A.avg];
  const ratio = wv / Math.max(lv, 0.1);
  $('vsVerdict').textContent = ratio < 1.12 ? `Too close to call. ${A.d.label} and ${B.d.label} should both invest in air purifiers.` : `${w} out-smokes ${l} ${ratio.toFixed(1)}×. ${l} wins, which is a very low bar.`;
}
function openModal(id) { $(id).classList.add('open'); if (id === 'versus') renderVs(); touched(); }
function closeModals() { document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open')); }

// ================================================================ input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9);
let down = null;
function touched() { document.body.classList.add('touched'); }
canvas.addEventListener('pointermove', (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
canvas.addEventListener('pointerleave', () => ndc.set(9, 9));
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; flight = null; touched(); });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  if (hit && ownerOf.get(hit.object).userData.egg) openEgg();
  else if (hit) select(ownerOf.get(hit.object).userData.i);
  else if (sel >= 0) closeCard();
});

$('cities').innerHTML = CITY_LIST.map(([id, l]) => `<button data-id="${id}" aria-pressed="false">${l}</button>`).join('');
$('cities').querySelectorAll('button').forEach((b) => (b.onclick = () => { touched(); loadCity(b.dataset.id); }));
for (const s of [$('vsA'), $('vsB')]) { s.innerHTML = CITY_LIST.map(([id, l]) => `<option value="${id}">${l}</option>`).join(''); s.onchange = renderVs; }
$('vsA').value = 'ncr'; $('vsB').value = 'blr';
$('cClose').onclick = () => closeCard();
$('swL').onclick = () => swipe(-1);
$('swR').onclick = () => swipe(1);
$('cShare').onclick = share;
$('btnHelp').onclick = () => openModal('help');
$('btnVs').onclick = () => openModal('versus');
$('btnTs').onclick = () => { const on = $('btnTs').getAttribute('aria-pressed') !== 'true'; $('btnTs').setAttribute('aria-pressed', String(on)); fx.setTilt(on); store.set('tt-ts', on ? '1' : '0'); };
if (store.get('tt-ts') === '0') { $('btnTs').setAttribute('aria-pressed', 'false'); fx.setTilt(false); }
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModals));
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModals(); }));

addEventListener('keydown', (e) => {
  if (e.target.closest?.('select, input, textarea') || e.metaKey || e.ctrlKey) return;
  touched();
  const k = e.key;
  if (k === 'Escape') { if (document.querySelector('.modal.open')) closeModals(); else closeCard(); }
  else if ((k === 'ArrowRight' || k === 'ArrowLeft') && order.length) {
    const at = sel < 0 ? -1 : order.indexOf(sel);
    select(order[k === 'ArrowRight' ? (at + 1) % order.length : at <= 0 ? order.length - 1 : at - 1]);
  }
  else if (k === 'c' || k === 'C') { const cur = CITY_LIST.findIndex((c) => c[0] === data?.id); loadCity(CITY_LIST[(cur + 1) % CITY_LIST.length][0]); }
  else if (k === 'v' || k === 'V') openModal('versus');
  else if (k === 't' || k === 'T') $('btnTs').click();
  else if (k === '/') { e.preventDefault(); document.body.classList.toggle('hide-ui'); }
  else if (k === '?') openModal('help');
});

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 48 : 34;
  camera.updateProjectionMatrix();
  fx.setSize(innerWidth, innerHeight);
  smokeMat.uniforms.uPx.value = renderer.getPixelRatio();
}
addEventListener('resize', resize);
resize();

// ================================================================ labels
const tmp = new THREE.Vector3();
function updateLabels() {
  if (!data) return;
  if (!eggLabel) { eggLabel = document.createElement('div'); eggLabel.className = 'lab gold'; labels.appendChild(eggLabel); }
  tmp.set(egg.position.x, egg.userData.blob.position.y + 1.3, egg.position.z).project(camera);
  const eggVis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05 && sel < 0 && deco.userData.grow > 0.9;
  eggLabel.innerHTML = hover === -2 ? '✦ click me' : '✦';
  eggLabel.style.opacity = eggVis ? '1' : '0';
  eggLabel.style.left = `${(tmp.x * 0.5 + 0.5) * innerWidth}px`;
  eggLabel.style.top = `${(-tmp.y * 0.5 + 0.5) * innerHeight}px`;
  const show = new Set();
  if (sel < 0) for (let i = 0; i < Math.min(5, creatures.length); i++) show.add(i);
  if (hover >= 0) show.add(hover);
  if (sel >= 0) show.add(sel);
  for (const [i, el] of labelEls) if (!show.has(i)) el.style.opacity = '0';
  for (const i of show) {
    const c = creatures[i], u = c.userData;
    if (u.appear < 0.8) continue;
    let el = labelEls.get(i);
    if (!el) {
      el = document.createElement('div');
      el.className = 'lab';
      el.innerHTML = `${esc(u.st.name)}<i style="background:${BAND[u.st.bandKey]}">${u.st.aqi}</i>`;
      labels.appendChild(el);
      labelEls.set(i, el);
    }
    el.classList.toggle('big', i === hover || i === sel);
    tmp.set(c.position.x, u.blob.position.y + u.s * 1.35, c.position.z).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.opacity = vis ? '1' : '0';
    el.style.left = `${(tmp.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-tmp.y * 0.5 + 0.5) * innerHeight}px`;
  }
}

// ================================================================ loop
const camLocal = new THREE.Vector3(), mood = { v: 0, target: 0 }, _bp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

  if (intro) {
    intro.t += dt;
    const k = ease(Math.min(1, intro.t / 2.4));
    camera.position.lerpVectors(INTRO_FROM, HOME, k);
    controls.target.set(0, 4, 0);
    if (intro.t >= 2.4) intro = null;
  } else if (flight) {
    const k = Math.min(1, (performance.now() - flight.t0) / flight.ms), e = ease(k);
    controls.target.lerpVectors(flight.fromT, flight.toT, e);
    camera.position.lerpVectors(flight.fromC, flight.toC, e);
    if (k >= 1) flight = null;
  }
  controls.update();

  mood.v += (mood.target - mood.v) * Math.min(1, dt * 1.5);
  scene.fog.color.copy(BG_CLEAN).lerp(BG_DIRTY, mood.v);
  scene.fog.density = 0.0045 + mood.v * 0.006;
  skyMat.uniforms.hor.value.copy(scene.fog.color);
  skyMat.uniforms.top.value.copy(TOP_CLEAN).lerp(TOP_DIRTY, mood.v * 0.8);

  // the world sprouts, butterflies flap, clouds drift
  deco.userData.grow = Math.min(1, deco.userData.grow + dt * 0.9);
  deco.scale.set(1, Math.max(0.001, backOut(deco.userData.grow)), 1);
  for (const b of butterflies) {
    const u = b.userData, k = t * u.sp + u.ph;
    _bp.set(u.c.x + Math.sin(k) * u.rad, 1.1 + Math.sin(k * 2.3) * 0.5 + Math.abs(Math.sin(t * 9 + u.ph)) * 0.08, u.c.z + Math.sin(k * 0.7 + u.ph) * u.rad * 0.8);
    b.rotation.y = Math.atan2(_bp.x - u.last.x, _bp.z - u.last.z);
    u.last.copy(_bp); b.position.copy(_bp);
    const flap = Math.sin(t * 16 + u.ph) * 0.9 + 0.25;
    u.wr.rotation.z = flap; u.wl.rotation.z = -flap;
  }
  for (const c of clouds) { const u = c.userData; u.a += dt * 0.006; c.position.set(Math.cos(u.a) * u.rad, u.y, Math.sin(u.a) * u.rad); }
  {
    const u = egg.userData, hot = hover === -2;
    u.blob.position.y = 1.5 + Math.sin(t * 1.6) * 0.15;
    u.blob.rotation.y = Math.sin(t * 0.8) * 0.4 + (hot ? Math.sin(t * 8) * 0.1 : 0);
    u.blob.scale.setScalar(0.85 * (1 + (hot ? 0.12 : 0) + Math.sin(t * 3) * 0.02));
    for (let i = 0; i < 40; i++) { const a = i * 2.4 + t * (0.4 + (i % 5) * 0.08), rr = 1.1 + (i % 7) * 0.12; u.sp[i * 3] = Math.cos(a) * rr; u.sp[i * 3 + 1] = 0.6 + ((i * 0.37 + t * 0.25) % 1) * 2.2; u.sp[i * 3 + 2] = Math.sin(a) * rr; }
    u.spark.geometry.attributes.position.needsUpdate = true;
    u.spark.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.15;
  }
  for (const s of smog) {
    s.material.opacity += (smogTarget - s.material.opacity) * Math.min(1, dt);
    s.position.x += s.userData.v * dt;
    if (s.position.x > 40) s.position.x = -40;
  }

  if (pickables.length && ndc.x < 2 && !flight && !intro) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    hover = hit ? ownerOf.get(hit.object).userData.i : -1;
  } else if (ndc.x >= 2) hover = -1;
  canvas.style.cursor = hover >= 0 ? 'pointer' : '';

  tipMat.color.setRGB(1, 0.42 + Math.sin(t * 7) * 0.08, 0.1).multiplyScalar(2.4 + Math.sin(t * 3.1) * 0.8);

  for (const c of creatures) {
    const u = c.userData;
    u.appear = Math.min(1, Math.max(0, (t - u.appearAt) / 0.7));
    const pop = u.appear > 0 ? backOut(u.appear) : 0;
    const isHot = u.i === hover || u.i === sel;
    u.hover += ((isHot ? 1 : 0) - u.hover) * 0.15;
    u.dim += ((sel >= 0 && u.i !== sel ? 1 : 0) - u.dim) * 0.08;
    u.body.color.copy(u.base).lerp(GREY, u.dim * 0.7);
    u.body.emissiveIntensity = 0.08 * (1 - u.dim);
    u.mats[1].opacity = 0.6 * (1 - u.dim * 0.7);
    u.ring.material.opacity = (0.8 - u.dim * 0.6) * (u.i === sel ? 0.6 + Math.sin(t * 5) * 0.4 : 1);
    u.ring.scale.setScalar(u.i === sel ? 1.2 + Math.sin(t * 5) * 0.12 : 1);
    u.ring.visible = u.tether.visible = u.appear > 0.15;
    let sx = u.s * pop * (1 + u.hover * 0.12), sy = sx, sz = sx;
    if (u.cough) {
      const q = Math.pow(Math.max(0, Math.sin(t * 1.4 + u.phase)), 14);
      sx *= 1 + q * 0.1; sz *= 1 + q * 0.1; sy *= 1 - q * 0.14;
    }
    u.blob.scale.set(Math.max(sx, 0.001), Math.max(sy, 0.001), Math.max(sz, 0.001));
    u.blob.position.y = u.h * (0.4 + 0.6 * Math.min(1, pop)) + Math.sin(t * 1.1 + u.phase) * 0.18;
    u.blob.rotation.y = Math.sin(t * 0.35 + u.phase) * 0.3 + (isHot ? Math.sin(t * 6) * 0.08 : 0);
    const blink = t > u.blinkAt && t < u.blinkAt + 0.12;
    if (t > u.blinkAt + 0.12) u.blinkAt = t + 2 + Math.random() * 5;
    for (const { e, iris } of u.eyes) {
      e.scale.y = blink ? 0.1 : 1;
      camLocal.copy(camera.position);
      e.worldToLocal(camLocal);
      camLocal.normalize().multiplyScalar(0.12);
      iris.position.set(camLocal.x * 0.8, camLocal.y * 0.8, Math.max(0.08, camLocal.z));
    }
  }
  updateSmoke(dt);
  fx.render(dt, t);
  updateLabels();
  renderPortrait(t);
  requestAnimationFrame(frame);
}
frame();

// ================================================================ the maker, the music, the intro board
const IC = (d) => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const me = initMe({
  id: 'toxic-traits', name: 'Toxic Traits', music: 'dreamy', mount: $('tools'), btnClass: 'chip', introDelay: 350,
  intro: {
    kicker: 'Live air quality · 6 Indian cities',
    lede: 'Every government air-quality station in your city becomes a little smog creature with a <b>dating profile</b>. The dirtier the air, the higher it floats, and the worst ones have taken up smoking.',
    steps: [
      [IC('<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>'), 'Pick a city', 'Delhi NCR, Bengaluru, Mumbai and more, live from CPCB.'],
      [IC('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'), 'Tap a creature', 'Read its profile: AQI, cigarettes a day, red flags.'],
      [IC('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6"/>'), 'Swipe, share, compare', 'Swipe left or right, share the card, or pit two cities against each other.'],
    ],
    cta: 'Start sniffing',
    note: 'Works on phones too',
  },
  onIntroClose: () => { if (introPending) { introPending = false; startIntro(); } },
});
function openEgg() { touched(); me.openCard(true); }

// ================================================================ boot
const q = new URL(location.href).searchParams;
const start = CITY_LIST.some((c) => c[0] === q.get('c')) ? q.get('c') : (store.get('tt-city') || 'ncr');
loadCity(CITY_LIST.some((c) => c[0] === start) ? start : 'ncr', q.get('s'));
