// me.js: the intro board, the golden "who made this" card, background music and the easter eggs.
// One file, identical in all three toys. Edit it here in shared/, then run `node shared/sync.mjs`.

export const ME = {
  name: 'Hitesh Gupta',
  role: 'Software Engineer',
  tag: 'Backend · Cloud · Applied AI',
  where: 'Open to roles · Delhi NCR or remote',
  photo: './hitesh.jpg',
  phone: '+91 70051 92650',
  tel: '+917005192650',
  email: 'hiteshgupta.1432@gmail.com',
  whatsapp: '917005192650',
  linkedin: 'https://www.linkedin.com/in/hit-eshgupta',
  github: 'https://github.com/Hiteshldt',
  resume: './hitesh-gupta-resume.pdf',
};

// Update these once the sites are live.
export const TOYS = [
  { id: 'toxic-traits', name: 'Toxic Traits', line: 'Your city’s air, as a dating profile', url: 'https://toxic-traits.vercel.app', dot: '#8fdcae' },
  { id: 'boo-lean', name: 'Boo-lean', line: 'Is this job real, or a ghost?', url: 'https://boo-lean.vercel.app', dot: '#c9b8ff' },
  { id: 'silk-bored', name: 'Silk Bored', line: 'Certified Bengaluru traffic excuses', url: 'https://silk-bored.vercel.app', dot: '#ffd98a' },
];

const I = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  wa: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z"/>',
  in: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  gh: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  cv: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/>',
  flip: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
};
const ico = (k, cls = '') => `<svg class="me-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};

// ================================================================ styles
const CSS = `
.me-i{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.me-layer{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .35s}
.me-layer.open{opacity:1;pointer-events:auto}
.me-dim{position:absolute;inset:0;background:var(--me-dim,rgba(60,48,80,.28));backdrop-filter:blur(10px) saturate(1.1);-webkit-backdrop-filter:blur(10px) saturate(1.1)}

/* ---------- intro board ---------- */
.me-board{position:relative;width:min(440px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:26px 24px 20px;border-radius:28px;background:var(--me-paper,#fffdf8);color:var(--me-ink,#2d2a3e);border:var(--me-border,1px solid #2d2a3e14);box-shadow:var(--me-shadow,0 40px 90px -30px #3b2d5a66);font-family:var(--me-font,'Space Grotesk',system-ui,sans-serif);transform:translateY(24px) scale(.96);transition:transform .6s cubic-bezier(.2,.9,.25,1.15)}
.me-layer.open .me-board{transform:none}
.me-board .kick{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:99px;background:var(--me-soft,#f1ecff);font:600 11px/1 var(--me-font,'Space Grotesk'),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--me-mute,#6e6a86)}
.me-board .kick i{width:7px;height:7px;border-radius:50%;background:var(--me-accent,#9b87f5);animation:mepulse 1.6s infinite}
@keyframes mepulse{50%{opacity:.35}}
.me-board h2{margin:14px 0 8px;font:var(--me-display,800 34px/1 'Space Grotesk',sans-serif);color:var(--me-title,var(--me-ink,#2d2a3e))}
.me-board p.lede{font-size:15.5px;line-height:1.5;color:var(--me-mute,#6e6a86)}
.me-board p.lede b{color:var(--me-ink,#2d2a3e);font-weight:600}
.me-steps{display:grid;gap:8px;margin:18px 0 18px;padding:0;list-style:none}
.me-steps li{display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:center;padding:10px 12px;border-radius:16px;background:var(--me-soft,#f6f2ff);opacity:0;transform:translateY(8px);animation:mestep .5s cubic-bezier(.2,.9,.25,1) forwards}
.me-steps li:nth-child(2){animation-delay:.08s}.me-steps li:nth-child(3){animation-delay:.16s}.me-steps li:nth-child(4){animation-delay:.24s}
@keyframes mestep{to{opacity:1;transform:none}}
.me-steps .n{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--me-chip,#fff);color:var(--me-ink,#2d2a3e);box-shadow:0 1px 0 #0000000d}
.me-steps .n .me-i{width:20px;height:20px}
.me-steps b{display:block;font-size:14.5px;font-weight:600}
.me-steps span{display:block;font-size:13px;color:var(--me-mute,#6e6a86);margin-top:1px;line-height:1.35}
.me-go{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:15px;border-radius:16px;border:var(--me-btn-border,0);background:var(--me-accent,#9b87f5);color:var(--me-accent-ink,#fff);font:700 16px var(--me-font,'Space Grotesk'),sans-serif;cursor:pointer;box-shadow:var(--me-btn-shadow,0 14px 30px -12px var(--me-accent,#9b87f5));transition:transform .15s,filter .2s}
.me-go:hover{filter:brightness(1.05);transform:translateY(-1px)}
.me-go:active{transform:translateY(1px)}
.me-go small{font-weight:500;opacity:.8;font-size:12.5px}
.me-by{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;font-size:12.5px;color:var(--me-mute,#6e6a86)}
.me-by button{display:inline-flex;align-items:center;gap:8px;padding:4px 10px 4px 4px;border-radius:99px;border:0;background:linear-gradient(135deg,#fff4c9,#f3d37a 45%,#e9bd52);color:#4a3510;font:600 12.5px var(--me-font,'Space Grotesk'),sans-serif;cursor:pointer;box-shadow:0 4px 14px -6px #b88a2a,inset 0 1px 0 #fff8}
.me-by button img{width:26px;height:26px;border-radius:50%;object-fit:cover;object-position:50% 30%;border:1.5px solid #fff6d5}
.me-by em{font-style:normal;opacity:.8}

/* ---------- toolbar buttons ---------- */
.me-music .bars{display:inline-flex;align-items:flex-end;gap:2px;height:14px;width:16px}
.me-music .bars i{display:block;width:3px;height:30%;border-radius:2px;background:currentColor;opacity:.45;transition:height .3s}
.me-music.on .bars i{opacity:1;animation:mebar 1s ease-in-out infinite}
.me-music.on .bars i:nth-child(2){animation-delay:-.4s}.me-music.on .bars i:nth-child(3){animation-delay:-.7s}.me-music.on .bars i:nth-child(4){animation-delay:-.2s}
@keyframes mebar{0%,100%{height:25%}50%{height:100%}}
.me-ava{position:relative;padding:0!important;overflow:visible}
.me-ava img{width:100%;height:100%;border-radius:inherit;object-fit:cover;object-position:50% 28%;display:block}
.me-ava::after{content:'';position:absolute;inset:-3px;border-radius:inherit;padding:2.5px;background:conic-gradient(from var(--me-rot,0deg),#fff6c9,#e3b340,#fff1a8,#b9862b,#ffe79a,#fff6c9);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:merot 4s linear infinite;pointer-events:none}
@property --me-rot{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes merot{to{--me-rot:360deg}}
.me-ava .spark{position:absolute;top:-5px;right:-5px;width:13px;height:13px;color:#e3b340;filter:drop-shadow(0 0 3px #fff);animation:metw 1.8s ease-in-out infinite}
@keyframes metw{50%{transform:scale(.6) rotate(45deg);opacity:.6}}

/* ---------- golden card ---------- */
.me-stage{position:relative;perspective:1400px;width:min(640px,100%)}
.me-hint{text-align:center;margin-top:16px;font:500 12.5px 'Space Grotesk',sans-serif;color:#fff;text-shadow:0 1px 8px #0006;opacity:.9}
.me-card{position:relative;width:100%;aspect-ratio:1.62;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.9,.25,1);transform:rotateY(var(--ry,0deg)) rotateX(var(--rx,0deg));font-family:'Space Grotesk',system-ui,sans-serif;color:#3d2a07}
.me-layer.open .me-card{animation:mein .9s cubic-bezier(.2,.9,.25,1.1)}
@keyframes mein{from{transform:translateY(60px) rotateX(35deg) rotateY(-25deg) scale(.7);opacity:0}}
.me-card.flipped{--flip:180deg}
.me-face{position:absolute;inset:0;border-radius:24px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(var(--flip,0deg));transition:transform .8s cubic-bezier(.2,.9,.25,1)}
.me-face.back{transform:rotateY(calc(var(--flip,0deg) + 180deg))}
.me-gold{position:absolute;inset:0;background:linear-gradient(125deg,#9a6b1a 0%,#d9b04e 16%,#f5e2a0 30%,#cfa043 44%,#ecd18a 56%,#b8862a 70%,#e4c476 84%,#8e6214 100%);background-size:220% 220%;background-position:var(--gx,50%) var(--gy,50%)}
.me-gold::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(100deg,#ffffff10 0 1px,transparent 1px 3px),repeating-linear-gradient(10deg,#6b4a0a08 0 1px,transparent 1px 4px);mix-blend-mode:overlay}
.me-gold::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 18% 120%,#fff7d055,transparent 50%),radial-gradient(circle at 110% -10%,#fff7d066,transparent 45%)}
.me-glare{position:absolute;inset:0;background:radial-gradient(circle at var(--gx,50%) var(--gy,30%),#ffffffcc 0%,#fff8dc55 18%,transparent 48%);mix-blend-mode:soft-light;pointer-events:none}
.me-sweep{position:absolute;inset:-50%;background:linear-gradient(105deg,transparent 42%,#fffbe8aa 49%,#ffffff 50%,#fffbe8aa 51%,transparent 58%);mix-blend-mode:overlay;animation:mesweep 5.5s ease-in-out infinite;pointer-events:none}
@keyframes mesweep{0%,55%{transform:translateX(-60%)}85%,100%{transform:translateX(60%)}}
.me-edge{position:absolute;inset:0;border-radius:24px;box-shadow:inset 0 0 0 1.5px #fff6cc99,inset 0 0 0 7px #b8862a22,inset 0 0 0 8px #fff3c455;pointer-events:none}
.me-frame{position:absolute;inset:0;box-shadow:0 50px 90px -30px #2b1d0599,0 24px 40px -24px #6b4a0a88;border-radius:24px;transform:translateZ(-1px)}
.me-sparks i{position:absolute;width:10px;height:10px;color:#fffbe6;filter:drop-shadow(0 0 4px #fff);animation:metw 2.4s ease-in-out infinite;pointer-events:none}
.me-body{position:relative;height:100%;display:grid;grid-template-columns:38% 1fr;gap:4%;padding:6% 6% 5.5%}
.me-left{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}
.me-photo{position:relative;width:88%;aspect-ratio:1;border-radius:50%;padding:5px;background:conic-gradient(from 200deg,#fff6c9,#b9862b,#ffe79a,#8e6212,#fff1a8,#c9972f,#fff6c9);box-shadow:0 10px 24px -8px #5a3d0888,inset 0 2px 2px #fff8}
.me-photo img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 26%;display:block;border:3px solid #fff4cf}
.me-open{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:#fff8dd88;border:1px solid #8e62124d;font-size:11.5px;font-weight:600;color:#4a3510}
.me-open i{width:7px;height:7px;border-radius:50%;background:#3aa35c;box-shadow:0 0 0 3px #3aa35c33}
.me-right{display:flex;flex-direction:column;min-width:0}
.me-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.me-label{font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#6b4a0acc}
.me-chip{width:40px;height:30px;border-radius:6px;background:linear-gradient(135deg,#fff3c0,#d9aa45 50%,#f7df8f);box-shadow:inset 0 0 0 1px #8e621266;position:relative;flex:none}
.me-chip::before{content:'';position:absolute;inset:6px 8px;border:1px solid #8e621266;border-radius:3px}
.me-chip::after{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:1px solid #8e621255}
.me-name{margin-top:8px;font:700 clamp(28px,5.4vw,40px)/1 'Space Grotesk',sans-serif;letter-spacing:.2px;color:#3a2604;text-shadow:0 1px 0 #fff5c880,0 -1px 0 #6b4a0a33}
.me-role{margin-top:6px;font-size:14px;font-weight:600;color:#4a3510}
.me-role small{display:block;font-size:12.5px;font-weight:500;opacity:.8;margin-top:1px}
.me-rule{height:1px;margin:12px 0 10px;background:linear-gradient(90deg,#6b4a0a66,#6b4a0a11)}
.me-links{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
.me-links a,.me-links button{display:flex;align-items:center;gap:8px;min-width:0;padding:7px 9px;border-radius:12px;background:#fff8dc5c;border:1px solid #8e621240;color:#3d2a07;text-decoration:none;font:600 12.5px 'Space Grotesk',sans-serif;cursor:pointer;transition:background .15s,transform .15s;box-shadow:inset 0 1px 0 #fffbe977}
.me-links a:hover,.me-links button:hover{background:#fff8dcaa;transform:translateY(-1px)}
.me-links .me-i{width:16px;height:16px}
.me-links span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.me-links small{display:block;font-size:10.5px;font-weight:500;opacity:.75}
.me-links .cv{grid-column:1/-1;justify-content:center;background:#3d2a07;color:#fff4cf;border-color:#3d2a07}
.me-links .cv:hover{background:#523a0c}
.me-ctl{position:absolute;right:14px;bottom:12px;display:flex;gap:6px;z-index:3}
.me-ctl button,.me-x{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff8dc88;border:1px solid #8e62124d;color:#3d2a07;cursor:pointer}
.me-x{position:absolute;top:-14px;right:-14px;z-index:4;background:#fffdf6;box-shadow:0 8px 20px -6px #0006}
.me-back .me-body{grid-template-columns:1fr;align-content:start;gap:0}
.me-back h3{font:700 30px/1 'Space Grotesk',sans-serif;color:#3a2604;margin-top:4px}
.me-back p{font-size:13.5px;line-height:1.45;margin-top:6px;color:#4a3510}
.me-toys{display:grid;gap:7px;margin-top:12px}
.me-toys a{display:grid;grid-template-columns:12px 1fr auto;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;background:#fff8dc5c;border:1px solid #8e621240;color:#3d2a07;text-decoration:none;transition:background .15s}
.me-toys a:hover{background:#fff8dcaa}
.me-toys a i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 -2px 0 #0002}
.me-toys b{font-size:14.5px}
.me-toys small{display:block;font-size:12px;opacity:.8}
.me-toys em{font-style:normal;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.me-stack{margin-top:10px;font-size:11.5px;opacity:.8}
.me-mono{position:absolute;right:7%;top:9%;font:700 64px/1 'Space Grotesk',sans-serif;color:#6b4a0a26;letter-spacing:-4px;pointer-events:none}

@media (max-width:620px){
  .me-stage{width:min(360px,100%)}
  .me-card{aspect-ratio:.62}
  .me-body{grid-template-columns:1fr;grid-template-rows:auto 1fr;padding:22px 20px 18px;gap:10px}
  .me-left{flex-direction:row;justify-content:flex-start;text-align:left;gap:14px}
  .me-photo{width:96px;flex:none}
  .me-links{grid-template-columns:1fr}
  .me-back .me-body{padding-top:26px}
  .me-mono{font-size:48px}
}
@media (max-width:620px) and (max-height:700px){ .me-card{aspect-ratio:.7} .me-links a,.me-links button{padding:6px 9px} }

/* ---------- toast + confetti ---------- */
.me-toast{position:fixed;left:50%;top:22px;z-index:95;transform:translate(-50%,-20px);opacity:0;padding:10px 16px 10px 10px;border-radius:99px;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#fff6d0,#f0cf6f);color:#3d2a07;font:600 14px 'Space Grotesk',sans-serif;box-shadow:0 18px 40px -14px #6b4a0a99;transition:.4s cubic-bezier(.2,.9,.25,1.2);pointer-events:none;max-width:calc(100vw - 32px)}
.me-toast img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:50% 28%}
.me-toast.show{opacity:1;transform:translate(-50%,0)}
.me-confetti{position:fixed;inset:0;z-index:96;pointer-events:none}
/* Gumroad-style defaults for the intro board */
.me-intro{--me-accent:#FF90E8;--me-accent-ink:#000;--me-ink:#000;--me-mute:#555;--me-soft:#F4F4F0;--me-paper:#fff;--me-title:#000;--me-display:700 40px/1 'Space Grotesk',sans-serif;--me-font:'Space Grotesk',sans-serif;--me-border:2px solid #000;--me-shadow:8px 8px 0 #000;--me-btn-border:2px solid #000;--me-btn-shadow:4px 4px 0 #000;--me-dim:rgba(0,0,0,.35)}
.me-intro .me-board{border-radius:14px}
.me-intro .me-board h2{letter-spacing:-.04em}
.me-intro .kick{background:#FFC900;border:1.5px solid #000;color:#000}
.me-intro .kick i{background:#000}
.me-intro .me-steps li{border:1.5px solid #000;border-radius:10px}
.me-intro .me-steps .n{border:1.5px solid #000;border-radius:8px;box-shadow:none}
.me-intro .me-go{border-radius:8px;transition:transform .12s,box-shadow .12s}
.me-intro .me-go:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #000;filter:none}
.me-intro .me-by{color:#555}
.me-music .bars i{background:currentColor}
@media (prefers-reduced-motion:reduce){.me-sweep,.me-ava::after,.me-sparks i{animation:none}}
`;

// ================================================================ background music (WebAudio, generated live)
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const SONGS = {
  // soft pastel pads + a music-box arpeggio, C major
  dreamy: {
    bpm: 70, steps: 16, volume: 0.5, reverb: 0.55,
    chords: [
      { r: 41, n: [57, 60, 64, 67] }, { r: 40, n: [55, 59, 62, 64] },
      { r: 45, n: [57, 60, 64, 71] }, { r: 43, n: [55, 59, 62, 67] },
    ],
    scale: [72, 74, 76, 79, 81, 84, 86, 88],
    step(A, s, bar, t, ch, st) {
      if (s === 0) { A.pad(ch.n, t, A.bar * 1.05, 0.032); A.bass(ch.r, t, A.bar * 0.95, 0.07); }
      if (s % 2 === 0 && Math.random() < (s % 8 === 0 ? 0.75 : 0.42)) {
        st.m = Math.max(0, Math.min(A.song.scale.length - 1, (st.m ?? 3) + Math.round((Math.random() - 0.5) * 3)));
        A.bell(A.song.scale[st.m], t, 0.055, 2.4);
      }
      if (s === 8 && bar % 2 === 1) A.bell(ch.n[Math.floor(Math.random() * 4)] + 24, t, 0.025, 3);
    },
  },
  // a cute-spooky music box waltz in A minor, with a theremin that sometimes wanders in
  spooky: {
    bpm: 132, steps: 12, volume: 0.5, reverb: 0.65,
    chords: [
      { r: 45, n: [57, 60, 64] }, { r: 41, n: [57, 60, 65] },
      { r: 38, n: [57, 62, 65] }, { r: 40, n: [56, 59, 62, 64] },
    ],
    scale: [69, 71, 72, 74, 76, 77, 80, 81, 83, 84],
    step(A, s, bar, t, ch, st) {
      if (s === 0) { A.bell(ch.r + 12, t, 0.06, 1.6, 3.01); A.pad(ch.n.map((n) => n - 12), t, A.bar * 1.1, 0.02, 700); }
      if (s === 4 || s === 8) { A.bell(ch.n[1] + 12, t, 0.035, 1.2, 3.01); A.bell(ch.n[2] + 12, t + 0.01, 0.03, 1.2, 3.01); }
      if (s % 2 === 0 && Math.random() < 0.5) {
        st.m = Math.max(0, Math.min(A.song.scale.length - 1, (st.m ?? 4) + Math.round((Math.random() - 0.5) * 3)));
        A.bell(A.song.scale[st.m], t, 0.045, 1.8, 3.01);
      }
      if (s === 0 && bar % 4 === 2 && Math.random() < 0.7) A.theremin([ch.n[2] + 12, ch.n[0] + 24, ch.n[1] + 12], t, A.bar * 2, 0.018);
    },
  },
  // lo-fi beat: warm keys, soft drums, vinyl crackle. ii-V-I-VI in C
  lofi: {
    bpm: 78, steps: 16, volume: 0.55, reverb: 0.35, swing: 0.18, crackle: true,
    chords: [
      { r: 38, n: [53, 57, 60, 64] }, { r: 43, n: [53, 59, 62, 64] },
      { r: 36, n: [52, 55, 59, 62] }, { r: 45, n: [55, 58, 61, 64] },
    ],
    scale: [62, 64, 65, 67, 69, 72, 74, 76],
    step(A, s, bar, t, ch, st) {
      if (s === 0) A.keys(ch.n, t, 0.034, A.bar * 0.55);
      if (s === 6 && Math.random() < 0.8) A.keys(ch.n.slice(1), t, 0.022, A.bar * 0.35);
      if (s === 0 || s === 10) A.bass(s ? ch.r + 12 : ch.r, t, A.beat * (s ? 1.2 : 2.2), 0.09);
      if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) A.kick(t, 0.28);
      if (s === 4 || s === 12) A.snare(t, 0.07);
      if (s % 2 === 0) A.hat(t, s % 4 === 0 ? 0.025 : 0.015);
      if (s % 2 === 0 && s > 0 && Math.random() < 0.16) {
        st.m = Math.max(0, Math.min(A.song.scale.length - 1, (st.m ?? 3) + Math.round((Math.random() - 0.5) * 4)));
        A.keys([A.song.scale[st.m]], t, 0.03, A.beat * 1.5);
      }
    },
  },
};

function createMusic(songName) {
  const song = SONGS[songName] || SONGS.dreamy;
  let ctx = null, out, wet, noise, timer = null, playing = false, nextT = 0, step = 0, bar = 0, crackle = null;
  const st = {};
  const A = { song, beat: 60 / song.bpm, bar: (60 / song.bpm) * (song.steps / 4) };

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 7000;
    out.connect(tone).connect(comp).connect(ctx.destination);
    // a generated reverb tail
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = song.reverb;
    wet.connect(verb).connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (playing) ctx.resume(); });
  }
  const send = (node, dry = 1, rev = 1) => { const d = ctx.createGain(); d.gain.value = dry; node.connect(d).connect(out); const w = ctx.createGain(); w.gain.value = rev; node.connect(w).connect(wet); };
  const env = (t, peak, a, dur, rel) => { const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a + dur, rel / 4); return g; };

  A.pad = (notes, t, dur, vol, cut = 1100) => {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cut * 0.6, t); f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cut * 0.6, t + dur);
    const g = env(t, vol, dur * 0.35, dur * 0.4, dur * 0.5);
    f.connect(g); send(g, 0.8, 0.9);
    for (const n of notes) for (const det of [-7, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og).connect(f); o.start(t); o.stop(t + dur * 1.6);
    }
  };
  A.bell = (n, t, vol, dur = 2, ratio = 2) => {
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.frequency.value = midi(n); mod.frequency.value = midi(n) * ratio;
    mg.gain.setValueAtTime(midi(n) * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - 0.5) * 0.7;
    car.connect(g).connect(p); send(p, 0.8, 1);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  };
  A.keys = (notes, t, vol, dur) => {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.4); g.gain.setTargetAtTime(0, t + dur, 0.25);
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 4.2; tg.gain.value = vol * 0.25; trem.connect(tg).connect(g.gain);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    g.connect(f); send(f, 1, 0.5);
    for (const n of notes) {
      const a = ctx.createOscillator(); a.type = 'sine'; a.frequency.value = midi(n); a.detune.value = (Math.random() - 0.5) * 8;
      const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = midi(n) * 2; const bg = ctx.createGain(); bg.gain.value = 0.12;
      a.connect(g); b.connect(bg).connect(g); a.start(t); b.start(t); a.stop(t + dur + 1.5); b.stop(t + dur + 1.5);
    }
    trem.start(t); trem.stop(t + dur + 1.5);
  };
  A.bass = (n, t, dur, vol) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midi(n);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = env(t, vol, 0.02, dur, 0.3);
    o.connect(f).connect(g); send(g, 1, 0.1);
    o.start(t); o.stop(t + dur + 1);
  };
  A.theremin = (notes, t, dur, vol) => {
    const o = ctx.createOscillator(); o.type = 'sine';
    const seg = dur / notes.length;
    o.frequency.setValueAtTime(midi(notes[0]), t);
    notes.forEach((n, i) => o.frequency.setTargetAtTime(midi(n), t + i * seg, seg * 0.25));
    const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.5; vg.gain.value = 9; v.connect(vg).connect(o.frequency);
    const g = env(t, vol, seg * 0.6, dur - seg, seg);
    o.connect(g); send(g, 0.7, 1);
    o.start(t); v.start(t); o.stop(t + dur + seg * 2); v.stop(t + dur + seg * 2);
  };
  const noiseHit = (t, vol, type, freq, dur, q = 0.8) => {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g); send(g, 1, 0.15);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  };
  A.kick = (t, vol) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
  };
  A.snare = (t, vol) => noiseHit(t, vol, 'bandpass', 1800, 0.22, 0.6);
  A.hat = (t, vol) => noiseHit(t, vol, 'highpass', 7500, 0.05);

  function startCrackle() {
    if (!song.crackle || crackle) return;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
    crackle = ctx.createBufferSource(); crackle.buffer = b; crackle.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.18;
    crackle.connect(f).connect(g).connect(out); crackle.start();
  }

  function tick() {
    const spb = A.beat / 4;
    while (nextT < ctx.currentTime + 0.25) {
      const swing = song.swing && step % 2 === 1 ? spb * song.swing * 2 : 0;
      song.step(A, step, bar, nextT + swing, song.chords[bar % song.chords.length], st);
      nextT += spb;
      if (++step >= song.steps) { step = 0; bar++; }
    }
  }

  const api = {
    get on() { return playing; },
    start() {
      if (!ctx) setup();
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return;
      playing = true;
      nextT = ctx.currentTime + 0.08; step = 0;
      startCrackle();
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(song.volume, ctx.currentTime, 0.8);
      tick(); timer = setInterval(tick, 60);
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    },
  };
  return api;
}

// ================================================================ confetti (gold)
function confetti(x = innerWidth / 2, y = innerHeight / 2) {
  const c = document.createElement('canvas');
  c.className = 'me-confetti';
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  c.style.width = '100%'; c.style.height = '100%';
  document.body.appendChild(c);
  const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  const COLS = ['#f6d77a', '#e9bd52', '#fff3c4', '#c9972f', '#ffe79a', '#ffffff'];
  const P = Array.from({ length: 140 }, () => {
    const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: 4 + Math.random() * 6, c: COLS[Math.floor(Math.random() * COLS.length)], star: Math.random() < 0.3 };
  });
  const t0 = performance.now();
  (function draw(now) {
    const k = (now - t0) / 1000;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) {
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - k / 2.6); g.fillStyle = p.c;
      if (p.star) { g.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? p.s * 0.35 : p.s; g.lineTo(Math.cos((i * Math.PI) / 4) * rr, Math.sin((i * Math.PI) / 4) * rr); } g.fill(); }
      else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    if (k < 2.6) requestAnimationFrame(draw); else c.remove();
  })(t0);
}

// ================================================================ the public bit
let booted = null;
export function initMe(o) {
  if (booted) return booted;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';
  document.head.appendChild(font);
  new Image().src = ME.photo;

  const music = createMusic(o.music);
  const MKEY = 'me-music';
  const wantMusic = () => ls.get(MKEY) !== '0';

  // ---------- toolbar buttons
  const btns = [];
  const mBtn = document.createElement('button');
  mBtn.className = `${o.btnClass || ''} me-music`;
  mBtn.type = 'button';
  mBtn.title = 'Background music';
  mBtn.setAttribute('aria-label', 'Background music');
  mBtn.setAttribute('aria-pressed', 'false');
  mBtn.innerHTML = '<span class="bars"><i></i><i></i><i></i><i></i></span>' + (o.musicLabel ? `<span>${o.musicLabel}</span>` : '');
  const syncBtn = () => { mBtn.classList.toggle('on', music.on); mBtn.setAttribute('aria-pressed', String(music.on)); };
  mBtn.onclick = () => { if (music.on) { music.stop(); ls.set(MKEY, '0'); } else { music.start(); ls.set(MKEY, '1'); } syncBtn(); };
  const aBtn = document.createElement('button');
  aBtn.className = `${o.btnClass || ''} me-ava`;
  aBtn.type = 'button';
  aBtn.title = 'Who made this?';
  aBtn.setAttribute('aria-label', 'Who made this? Contact card');
  aBtn.innerHTML = `<img src="${ME.photo}" alt=""><svg class="spark" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>`;
  aBtn.onclick = () => openCard();
  btns.push(mBtn);
  if (o.mount) o.mount.append(...btns);

  // ---------- intro board
  const intro = document.createElement('div');
  intro.className = 'me-layer me-intro';
  intro.setAttribute('role', 'dialog');
  intro.setAttribute('aria-modal', 'true');
  intro.setAttribute('aria-label', `About ${o.name}`);
  const it = o.intro || {};
  intro.innerHTML = `<div class="me-dim"></div><div class="me-board">
    <span class="kick"><i></i>${esc(it.kicker || 'A tiny web toy')}</span>
    <h2>${it.titleHtml || esc(o.name)}</h2>
    <p class="lede">${it.lede || ''}</p>
    <ul class="me-steps">${(it.steps || []).map(([ic, b, s]) => `<li><span class="n">${ic}</span><div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul>
    <button class="me-go" type="button">${esc(it.cta || 'Let’s go')} <small>· with music</small></button>
    <div class="me-by"><em>${esc(it.note || 'Works on phones too')}</em></div>
  </div>`;
  document.body.appendChild(intro);
  const go = intro.querySelector('.me-go');
  const closeIntro = (withMusic) => {
    intro.classList.remove('open');
    ss.set(`me-intro-${o.id}`, '1');
    if (withMusic && wantMusic()) { music.start(); syncBtn(); }
    o.onIntroClose?.();
  };
  go.onclick = () => closeIntro(true);
  intro.querySelector('.me-dim').onclick = () => closeIntro(true);
  const showIntro = () => { intro.classList.add('open'); setTimeout(() => go.focus(), 60); };

  // ---------- golden card
  const layer = document.createElement('div');
  layer.className = 'me-layer me-cardlayer';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', `${ME.name}: contact card`);
  const sparks = Array.from({ length: 7 }, () => `<i style="left:${8 + Math.random() * 84}%;top:${6 + Math.random() * 86}%;animation-delay:${-Math.random() * 2.4}s;transform:scale(${0.5 + Math.random() * 0.8})"><svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg></i>`).join('');
  const shine = `<div class="me-gold"></div><div class="me-sweep"></div><div class="me-glare"></div><div class="me-sparks">${sparks}</div><div class="me-edge"></div>`;
  const others = TOYS.map((t) => t.id === o.id
    ? `<a href="#" data-here><i style="background:${t.dot}"></i><span><b>${esc(t.name)}</b><small>${esc(t.line)}</small></span><em>You’re here</em></a>`
    : `<a href="${t.url}" target="_blank" rel="noopener"><i style="background:${t.dot}"></i><span><b>${esc(t.name)}</b><small>${esc(t.line)}</small></span>${ico('arrow')}</a>`).join('');
  const waText = encodeURIComponent(`Hi Hitesh! I found you through ${o.name} 👋`);
  layer.innerHTML = `<div class="me-dim"></div><div class="me-stage">
    <div class="me-card" tabindex="-1">
      <div class="me-frame"></div>
      <div class="me-face front">${shine}
        <div class="me-body">
          <div class="me-left">
            <div class="me-photo"><img src="${ME.photo}" alt="${esc(ME.name)}"></div>
            <div class="me-mob">
              <span class="me-open"><i></i>${esc(ME.where)}</span>
            </div>
          </div>
          <div class="me-right">
            <div class="me-top"><span class="me-label">Made ${esc(o.name)}</span><span class="me-chip"></span></div>
            <div class="me-name">${esc(ME.name)}</div>
            <div class="me-role">${esc(ME.role)}<small>${esc(ME.tag)}</small></div>
            <div class="me-rule"></div>
            <div class="me-links">
              <a href="tel:${ME.tel}">${ico('phone')}<span>${esc(ME.phone)}<small>Call</small></span></a>
              <a href="https://wa.me/${ME.whatsapp}?text=${waText}" target="_blank" rel="noopener">${ico('wa')}<span>WhatsApp<small>Say hi</small></span></a>
              <button type="button" data-copy="${ME.email}" title="Copy email">${ico('mail')}<span>${esc(ME.email)}<small>Tap to copy</small></span></button>
              <a href="${ME.linkedin}" target="_blank" rel="noopener">${ico('in')}<span>LinkedIn<small>/in/hit-eshgupta</small></span></a>
              <a href="${ME.github}" target="_blank" rel="noopener">${ico('gh')}<span>GitHub<small>@Hiteshldt</small></span></a>
              <a href="mailto:${ME.email}?subject=${encodeURIComponent(`Hi from ${o.name}`)}">${ico('mail')}<span>Email me<small>Opens your mail app</small></span></a>
              <a class="cv" href="${ME.resume}" target="_blank" rel="noopener">${ico('cv')}<span>View my resume (PDF)</span></a>
            </div>
          </div>
        </div>
        <div class="me-ctl"><button type="button" data-flip title="Flip the card">${ico('flip')}</button></div>
      </div>
      <div class="me-face back me-back">${shine}<div class="me-mono">HG</div>
        <div class="me-body">
          <span class="me-label">More toys from the same workshop</span>
          <h3>Three silly, useful things</h3>
          <p>Built for fun: live data, a little AI, a lot of three.js. Each one works without any AI at all.</p>
          <div class="me-toys">${others}</div>
          <div class="me-stack">three.js · WebAudio · Vercel functions · free and ultra-cheap LLMs via OpenRouter</div>
        </div>
        <div class="me-ctl"><button type="button" data-flip title="Flip back">${ico('flip')}</button></div>
      </div>
    </div>
    <button type="button" class="me-x" aria-label="Close">${ico('x')}</button>
    <div class="me-hint">Flip the card for more</div>
  </div>`;
  document.body.appendChild(layer);
  const card = layer.querySelector('.me-card');
  layer.querySelectorAll('[data-flip]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); card.classList.toggle('flipped'); }));
  layer.querySelector('[data-here]').onclick = (e) => { e.preventDefault(); closeCard(); };
  layer.querySelector('[data-copy]').onclick = async (e) => {
    const el = e.currentTarget, small = el.querySelector('small');
    try { await navigator.clipboard.writeText(el.dataset.copy); small.textContent = 'Copied!'; }
    catch { location.href = `mailto:${el.dataset.copy}`; }
    setTimeout(() => (small.textContent = 'Tap to copy'), 1600);
  };
  const closeCard = () => { layer.classList.remove('open'); card.classList.remove('flipped'); };
  layer.querySelector('.me-dim').onclick = closeCard;
  layer.querySelector('.me-x').onclick = closeCard;
  // tilt + glare that follow the pointer
  const stage = layer.querySelector('.me-stage');
  let raf = 0, idle = true;
  const setTilt = (px, py) => {
    card.style.setProperty('--ry', `${(px - 0.5) * 22}deg`);
    card.style.setProperty('--rx', `${(0.5 - py) * 16}deg`);
    card.style.setProperty('--gx', `${px * 100}%`);
    card.style.setProperty('--gy', `${py * 100}%`);
  };
  stage.addEventListener('pointermove', (e) => {
    idle = false;
    const r = card.getBoundingClientRect();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => setTilt(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))));
  });
  stage.addEventListener('pointerleave', () => { idle = true; });
  (function drift(now) {
    if (idle && layer.classList.contains('open')) { const t = now / 1000; setTilt(0.5 + Math.sin(t * 0.7) * 0.25, 0.5 + Math.cos(t * 0.9) * 0.2); }
    requestAnimationFrame(drift);
  })(0);

  function openCard(egg) {
    intro.classList.remove('open');
    layer.classList.add('open');
    card.classList.remove('flipped');
    setTimeout(() => card.focus({ preventScroll: true }), 50);
    if (egg) { setTimeout(() => confetti(), 250); toast(egg === true ? 'You found an easter egg.' : egg); }
  }

  // ---------- toast
  const tEl = document.createElement('div');
  tEl.className = 'me-toast';
  tEl.innerHTML = `<img src="${ME.photo}" alt=""><span></span>`;
  document.body.appendChild(tEl);
  let tT;
  function toast(msg) { tEl.querySelector('span').textContent = msg; tEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => tEl.classList.remove('show'), 2800); }

  // ---------- keys + easter eggs
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let typed = '', kon = 0;
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (layer.classList.contains('open')) { closeCard(); e.stopImmediatePropagation(); return; } if (intro.classList.contains('open')) { closeIntro(true); e.stopImmediatePropagation(); return; } }
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    kon = k === KONAMI[kon] ? kon + 1 : k === KONAMI[0] ? 1 : 0;
    if (kon === KONAMI.length) { kon = 0; openCard('Konami code. Nice.'); }
    if (k.length === 1) { typed = (typed + k).slice(-6); if (typed === 'hitesh') { typed = ''; openCard(true); } }
  }, true);
  // music starts on the first real interaction if the intro was skipped this session
  const firstGesture = () => {
    removeEventListener('pointerdown', firstGesture, true);
    if (!intro.classList.contains('open') && wantMusic() && !music.on) { music.start(); syncBtn(); }
  };
  addEventListener('pointerdown', firstGesture, true);

  window.hitesh = () => { openCard(true); return 'Hitesh Gupta · ' + ME.email; };
  console.log(`%c✦ Hi, curious human.%c\nYou're reading the console of ${o.name}, so you're probably a developer.\nI'm ${ME.name}, and I made this. Type hitesh() here, or type "hitesh" on the page.\n${ME.linkedin} · ${ME.email}`,
    'font:700 18px Georgia,serif;color:#b8862a', 'font:13px system-ui;color:#555;line-height:1.5');

  const introSeen = () => !!ss.get(`me-intro-${o.id}`);
  if (!introSeen() && o.intro && o.introDelay !== null) setTimeout(showIntro, o.introDelay ?? 900);

  booted = { openCard, closeCard, showIntro, introSeen, isIntroOpen: () => intro.classList.contains('open'), toast, music, confetti, buttons: btns, ME };
  return booted;
}
