// Rumbler customisation: data model, catalogues, procedural textures and the 3D builder.
import * as THREE from 'three';
import { BALL_R } from './sim.js';

export const PALETTE = [
  ['Cherry', '#ff4d6d'], ['Tangerine', '#ff8c42'], ['Sunny', '#ffd23f'], ['Lime', '#9ef01a'],
  ['Mint', '#3ddc84'], ['Teal', '#1fbfb8'], ['Sky', '#4cc9f0'], ['Royal', '#4361ee'],
  ['Grape', '#8338ec'], ['Bubblegum', '#ff5fb8'], ['Blush', '#ffb3c6'], ['Cream', '#fff1d6'],
  ['Cocoa', '#7a4b2a'], ['Slate', '#4a5568'], ['Ink', '#22223b'], ['Snow', '#ffffff'],
];
export const BODIES = [['round', 'Round'], ['egg', 'Egg'], ['squat', 'Squat'], ['tall', 'Tall'], ['bean', 'Bean']];
export const PATTERNS = [['plain', 'Plain'], ['stripes', 'Stripes'], ['spots', 'Spots'], ['twotone', 'Two-tone'], ['belly', 'Belly'], ['stars', 'Stars'], ['hearts', 'Hearts'], ['zigzag', 'Zigzag'], ['checks', 'Checks'], ['lightning', 'Lightning']];
export const EYES = [['dot', 'Dots'], ['big', 'Big'], ['sleepy', 'Sleepy'], ['angry', 'Fierce'], ['wink', 'Wink'], ['sparkle', 'Sparkle'], ['shades', 'Shades'], ['cyclops', 'Cyclops'], ['glasses', 'Glasses']];
export const MOUTHS = [['smile', 'Smile'], ['grin', 'Grin'], ['o', 'Oh'], ['fangs', 'Fangs'], ['tash', 'Moustache'], ['tongue', 'Tongue'], ['beak', 'Beak'], ['flat', 'Meh'], ['beard', 'Beard']];
export const HATS = [['none', 'None'], ['crown', 'Crown'], ['cap', 'Cap'], ['tophat', 'Top hat'], ['antenna', 'Antenna'], ['ears', 'Ears'], ['bunny', 'Bunny ears'], ['horns', 'Horns'], ['flower', 'Flower'], ['propeller', 'Propeller'], ['bow', 'Bow'], ['halo', 'Halo'], ['viking', 'Viking'], ['chef', 'Chef'], ['party', 'Party hat'], ['pirate', 'Pirate'], ['headphones', 'Headphones'], ['mohawk', 'Mohawk'], ['unicorn', 'Unicorn'], ['cat', 'Cat ears'], ['beanie', 'Beanie'], ['sombrero', 'Sombrero'], ['leaf', 'Sprout'], ['fin', 'Shark fin']];
export const EXTRAS = [['none', 'None'], ['cape', 'Cape'], ['scarf', 'Scarf'], ['bowtie', 'Bow tie'], ['backpack', 'Backpack'], ['wings', 'Wings'], ['tail', 'Tail'], ['tie', 'Tie'], ['bandolier', 'Sash'], ['jetpack', 'Jetpack']];
export const BALLS = [['stripes', 'Stripes'], ['beach', 'Beach ball'], ['soccer', 'Football'], ['disco', 'Disco'], ['globe', 'Globe'], ['basketball', 'Basketball'], ['candy', 'Candy swirl'], ['galaxy', 'Galaxy'], ['ladybird', 'Ladybird'], ['watermelon', 'Watermelon'], ['eight', 'Eight ball'], ['donut', 'Sprinkles']];

export const BOT_NAMES = ['Sir Wobbles', 'Cpt Bounce', 'Lady Tumble', 'Doodle', 'Pickle', 'Sprocket', 'Mango', 'Biscuit', 'Zoomer', 'Nugget', 'Waffles', 'Pudding', 'Turbo', 'Noodle', 'Gizmo', 'Peaches'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)][0];
export function randomLook() {
  let c = Math.floor(Math.random() * PALETTE.length), a = Math.floor(Math.random() * PALETTE.length);
  if (a === c) a = (a + 5) % PALETTE.length;
  return {
    body: pick(BODIES), color: c, accent: a, pattern: pick(PATTERNS), eyes: pick(EYES), mouth: pick(MOUTHS),
    hat: pick(HATS), extra: Math.random() < 0.6 ? pick(EXTRAS) : 'none', ball: pick(BALLS), ballColor: Math.floor(Math.random() * PALETTE.length),
  };
}
export function defaultLook() { return { body: 'round', color: 0, accent: 11, pattern: 'belly', eyes: 'big', mouth: 'smile', hat: 'none', extra: 'none', ball: 'stripes', ballColor: 1 }; }
const has = (list, k) => list.some(x => x[0] === k);
export function normaliseLook(l) {
  const d = defaultLook(); if (!l || typeof l !== 'object') return d;
  const idx = v => (Number.isInteger(v) && v >= 0 && v < PALETTE.length) ? v : 0;
  return {
    body: has(BODIES, l.body) ? l.body : d.body, color: idx(l.color), accent: idx(l.accent),
    pattern: has(PATTERNS, l.pattern) ? l.pattern : d.pattern, eyes: has(EYES, l.eyes) ? l.eyes : d.eyes, mouth: has(MOUTHS, l.mouth) ? l.mouth : d.mouth,
    hat: has(HATS, l.hat) ? l.hat : 'none', extra: has(EXTRAS, l.extra) ? l.extra : 'none', ball: has(BALLS, l.ball) ? l.ball : d.ball, ballColor: idx(l.ballColor),
  };
}
export const lookKey = l => JSON.stringify(normaliseLook(l));
export const colourOf = l => PALETTE[l.color][1];

// ---------- textures ----------
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  texCache.set(key, tx); return tx;
}

function bodyTexture(look) {
  const base = PALETTE[look.color][1], acc = PALETTE[look.accent][1];
  return canvasTex('body:' + look.pattern + base + acc, 512, 256, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.fillStyle = acc;
    const p = look.pattern;
    if (p === 'stripes') for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 28, H);
    else if (p === 'spots') for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 30 + (i * 61) % (H - 60), r = 10 + (i % 3) * 5; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
    else if (p === 'twotone') g.fillRect(0, H / 2, W, H / 2);
    else if (p === 'belly') { g.beginPath(); g.ellipse(W * 0.5, H * 0.62, 70, 62, 0, 0, 6.29); g.fill(); }
    else if (p === 'stars') for (let i = 0; i < 18; i++) star(g, (i * 131) % W, 25 + (i * 83) % (H - 50), 14 + (i % 2) * 6);
    else if (p === 'hearts') for (let i = 0; i < 18; i++) heart(g, (i * 113) % W, 25 + (i * 71) % (H - 50), 12 + (i % 2) * 5);
    else if (p === 'zigzag') { g.lineWidth = 14; g.strokeStyle = acc; for (const y of [70, 150]) { g.beginPath(); for (let x = 0; x <= W; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 22 : -22)); g.stroke(); } }
    else if (p === 'checks') for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) if (((x + y) / 32) % 2 === 0) g.fillRect(x, y, 32, 32);
    else if (p === 'lightning') { g.beginPath(); g.moveTo(256, 60); g.lineTo(236, 130); g.lineTo(266, 125); g.lineTo(240, 200); g.lineTo(290, 115); g.lineTo(262, 120); g.lineTo(284, 60); g.closePath(); g.fill(); }
  });
}
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function heart(g, x, y, r) { g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r); g.fill(); }

// Face patch texture. state: normal | blink | dash | shock | happy | ouch
const INK = '#1d1a3a';
function faceTexture(look, state) {
  return canvasTex(`face:${look.eyes}:${look.mouth}:${state}:${look.accent}`, 512, 320, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const acc = PALETTE[look.accent][1];
    drawEyes(g, look.eyes, state, W, H);
    drawMouth(g, look.mouth, state, W, H, acc);
  });
}
function eyeShape(g, cx, cy, rx, ry, pupil, state, angle = 0) {
  if (state === 'blink') { g.strokeStyle = INK; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - rx, cy); g.lineTo(cx + rx, cy); g.stroke(); return; }
  if (state === 'happy') { g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + ry * 0.4, rx, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
  const sy = state === 'dash' ? 0.5 : state === 'shock' ? 1.3 : 1;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy, rx, ry * sy, angle, 0, 6.29); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  const pr = state === 'shock' ? pupil * 0.55 : pupil, ox = state === 'dash' ? rx * 0.15 : 0;
  g.fillStyle = INK; g.beginPath(); g.arc(cx + ox, cy + (state === 'dash' ? 0 : ry * 0.15), pr, 0, 6.29); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + ox - pr * 0.35, cy - pr * 0.35, pr * 0.3, 0, 6.29); g.fill();
  if (state === 'ouch') { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - rx, cy - ry * 1.3); g.lineTo(cx + rx, cy - ry * 0.9); g.stroke(); }
}
function drawEyes(g, kind, state, W, H) {
  const y = H * 0.36, L = W * 0.36, R = W * 0.64;
  if (kind === 'cyclops') { eyeShape(g, W / 2, y, 58, 58, 26, state); return; }
  if (kind === 'shades') {
    g.fillStyle = INK; roundRect(g, L - 62, y - 32, 120, 64, 22); roundRect(g, R - 58, y - 32, 120, 64, 22); g.fillRect(L + 40, y - 6, R - L - 80, 10);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(L - 45, y - 22, 40, 10); g.fillRect(R - 41, y - 22, 40, 10);
    if (state === 'shock' || state === 'ouch') { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(L - 60, y - 55); g.lineTo(L + 60, y - 45); g.moveTo(R - 60, y - 45); g.lineTo(R + 60, y - 55); g.stroke(); }
    return;
  }
  const big = kind === 'big' || kind === 'sparkle', rx = big ? 46 : kind === 'dot' ? 28 : 40, ry = big ? 50 : kind === 'dot' ? 28 : kind === 'sleepy' ? 24 : 42, pupil = big ? 22 : kind === 'dot' ? 16 : 18;
  const angle = kind === 'angry' ? 0.25 : 0;
  eyeShape(g, L, y, rx, ry, pupil, kind === 'wink' && state === 'normal' ? 'blink' : state, -angle);
  eyeShape(g, R, y, rx, ry, pupil, state, angle);
  if (kind === 'angry' && state !== 'happy') { g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(L - 46, y - 62); g.lineTo(L + 40, y - 42); g.moveTo(R + 46, y - 62); g.lineTo(R - 40, y - 42); g.stroke(); }
  if (kind === 'sleepy' && state === 'normal') { g.fillStyle = INK; g.fillRect(L - rx, y - ry - 2, rx * 2, ry * 0.7); g.fillRect(R - rx, y - ry - 2, rx * 2, ry * 0.7); }
  if (kind === 'sparkle' && state === 'normal') { g.fillStyle = '#fff'; star(g, L + 14, y - 18, 10); star(g, R + 14, y - 18, 10); }
  if (kind === 'glasses') { g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.arc(L, y, rx + 14, 0, 6.29); g.moveTo(R + rx + 14, y); g.arc(R, y, rx + 14, 0, 6.29); g.moveTo(L + rx + 14, y); g.lineTo(R - rx - 14, y); g.stroke(); }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function drawMouth(g, kind, state, W, H, acc) {
  const cx = W / 2, y = H * 0.7;
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 9; g.lineCap = 'round';
  if (state === 'shock' || state === 'ouch') { g.fillStyle = INK; g.beginPath(); g.ellipse(cx, y + 10, state === 'shock' ? 34 : 22, state === 'shock' ? 44 : 14, 0, 0, 6.29); g.fill(); g.fillStyle = '#ff7b9c'; g.beginPath(); g.ellipse(cx, y + 26, 16, 12, 0, 0, 6.29); g.fill(); return; }
  if (state === 'happy' || kind === 'grin') { g.fillStyle = INK; g.beginPath(); g.arc(cx, y - 6, 60, 0.15, Math.PI - 0.15); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(cx - 44, y, 88, 14); g.fillStyle = '#ff7b9c'; g.beginPath(); g.ellipse(cx, y + 34, 26, 14, 0, 0, 6.29); g.fill(); return; }
  if (state === 'dash') { g.beginPath(); g.moveTo(cx - 40, y + 12); g.lineTo(cx + 40, y - 4); g.stroke(); return; }
  switch (kind) {
    case 'smile': g.beginPath(); g.arc(cx, y - 14, 50, 0.3, Math.PI - 0.3); g.stroke(); break;
    case 'o': g.beginPath(); g.ellipse(cx, y + 6, 22, 28, 0, 0, 6.29); g.fill(); break;
    case 'fangs': g.beginPath(); g.arc(cx, y - 14, 50, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 30, y + 6); g.lineTo(cx - 18, y + 34); g.lineTo(cx - 8, y + 10); g.fill(); g.beginPath(); g.moveTo(cx + 30, y + 6); g.lineTo(cx + 18, y + 34); g.lineTo(cx + 8, y + 10); g.fill(); break;
    case 'tash': g.beginPath(); g.arc(cx, y - 8, 40, 0.4, Math.PI - 0.4); g.stroke(); g.fillStyle = '#3b2a1a'; g.beginPath(); g.ellipse(cx - 34, y - 26, 34, 14, -0.3, 0, 6.29); g.fill(); g.beginPath(); g.ellipse(cx + 34, y - 26, 34, 14, 0.3, 0, 6.29); g.fill(); break;
    case 'tongue': g.beginPath(); g.arc(cx, y - 14, 50, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#ff5f8f'; g.beginPath(); g.ellipse(cx + 16, y + 30, 20, 26, 0, 0, 6.29); g.fill(); break;
    case 'beak': g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(cx - 44, y - 20); g.lineTo(cx + 44, y - 20); g.lineTo(cx, y + 34); g.closePath(); g.fill(); g.strokeStyle = '#d98a1f'; g.lineWidth = 4; g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(cx - 40, y); g.lineTo(cx + 40, y); g.stroke(); break;
    case 'beard': g.beginPath(); g.arc(cx, y - 14, 44, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#5b3a1e'; g.beginPath(); g.moveTo(cx - 90, y - 30); g.quadraticCurveTo(cx, y + 150, cx + 90, y - 30); g.quadraticCurveTo(cx + 60, y + 10, cx, y + 24); g.quadraticCurveTo(cx - 60, y + 10, cx - 90, y - 30); g.fill(); break;
  }
}

export function ballTexture(kind, colourIdx) {
  const c = PALETTE[colourIdx][1];
  return canvasTex('ball:' + kind + c, 512, 256, (g, W, H) => {
    const white = '#fff8ee';
    g.fillStyle = white; g.fillRect(0, 0, W, H);
    switch (kind) {
      case 'stripes': g.fillStyle = c; for (let i = 0; i < 4; i++) g.fillRect(i * 128, 0, 64, H); break;
      case 'beach': { const cs = [c, white, '#4cc9f0', white, '#ffd23f', white]; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(i * W / 6, 0, W / 6 + 1, H); } break; }
      case 'soccer': g.fillStyle = INK; for (let i = 0; i < 12; i++) { const x = (i % 4) * 128 + (i >= 4 && i < 8 ? 64 : 0), y = 40 + Math.floor(i / 4) * 88; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); } g.fill(); } break;
      case 'disco': for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) { const s = ((x + y) / 32) % 3; g.fillStyle = s === 0 ? '#e0e0e0' : s === 1 ? '#a0a0a0' : '#ffffff'; g.fillRect(x + 2, y + 2, 28, 28); } break;
      case 'globe': g.fillStyle = '#4cc9f0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3ddc84'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse((i * 137) % W, 40 + (i * 53) % (H - 80), 40 + (i % 3) * 18, 26 + (i % 2) * 14, i, 0, 6.29); g.fill(); } break;
      case 'basketball': g.fillStyle = '#ff8c42'; g.fillRect(0, 0, W, H); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); for (let i = 0; i < 4; i++) { g.moveTo(i * 128, 0); g.lineTo(i * 128, H); } g.stroke(); break;
      case 'candy': g.fillStyle = c; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 96, H); g.lineTo(i * 64 + 64, H); g.closePath(); g.fill(); } break;
      case 'galaxy': g.fillStyle = '#1b1035'; g.fillRect(0, 0, W, H); g.fillStyle = '#6b3fd6'; g.beginPath(); g.ellipse(W * 0.5, H * 0.5, 200, 60, 0.3, 0, 6.29); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { g.beginPath(); g.arc((i * 89) % W, (i * 37) % H, 1 + (i % 3), 0, 6.29); g.fill(); } break;
      case 'ladybird': g.fillStyle = '#ff2e4c'; g.fillRect(0, 0, W, H); g.fillStyle = INK; g.fillRect(W / 2 - 5, 0, 10, H); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i * 97) % W, 30 + (i * 61) % (H - 60), 18, 0, 6.29); g.fill(); } break;
      case 'watermelon': g.fillStyle = '#ff5f8f'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f9e44'; g.fillRect(0, 0, W, 34); g.fillRect(0, H - 34, W, 34); g.fillStyle = INK; for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse((i * 101) % W, 60 + (i * 47) % (H - 120), 6, 10, 0, 0, 6.29); g.fill(); } break;
      case 'eight': g.fillStyle = INK; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, 50, 0, 6.29); g.fill(); g.fillStyle = INK; g.font = 'bold 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', W / 2, H / 2 + 4); break;
      case 'donut': g.fillStyle = '#ffb3c6'; g.fillRect(0, 0, W, H); const sc = ['#ffd23f', '#4cc9f0', '#3ddc84', '#ff4d6d', '#fff']; for (let i = 0; i < 60; i++) { g.fillStyle = sc[i % 5]; g.save(); g.translate((i * 83) % W, (i * 49) % H); g.rotate(i); g.fillRect(-10, -3, 20, 6); g.restore(); } break;
    }
  });
}

// ---------- 3D builder ----------
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
const BODY_SCALE = { round: [1, 1, 1], egg: [0.9, 1.22, 0.9], squat: [1.18, 0.8, 1.18], tall: [0.82, 1.38, 0.82], bean: [0.95, 1.1, 0.85] };
const R = 0.58; // body radius before scaling

function buildHat(kind, base, acc) {
  const g = new THREE.Group(); const mb = M(base), ma = M(acc);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = mesh(geo, mat, x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const top = R;
  switch (kind) {
    case 'crown': add(new THREE.CylinderGeometry(0.34, 0.28, 0.26, 6, 1, true), M('#ffd23f', { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.3 }), 0, top + 0.1, 0, 0, 0.3); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(new THREE.SphereGeometry(0.05, 6, 5), M(['#ff4d6d', '#4cc9f0', '#3ddc84'][i % 3]), Math.cos(a) * 0.33, top + 0.25, Math.sin(a) * 0.33); } break;
    case 'cap': add(new THREE.SphereGeometry(0.44, 16, 10, 0, 6.283, 0, 1.5), mb, 0, top - 0.22, 0); add(new THREE.BoxGeometry(0.5, 0.05, 0.36), mb, 0, top - 0.02, 0.45); break;
    case 'tophat': add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), M('#22223b'), 0, top - 0.02, 0); add(new THREE.CylinderGeometry(0.32, 0.34, 0.5, 20), M('#22223b'), 0, top + 0.22, 0); add(new THREE.CylinderGeometry(0.345, 0.345, 0.08, 20), M('#ff4d6d'), 0, top + 0.04, 0); break;
    case 'antenna': add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), M('#4a5568'), 0, top + 0.2, 0); add(new THREE.SphereGeometry(0.1, 10, 8), M('#ff4d6d', { emissive: '#ff4d6d', emissiveIntensity: 0.6 }), 0, top + 0.48, 0); break;
    case 'ears': add(new THREE.SphereGeometry(0.2, 12, 10), mb, -0.4, top - 0.05, 0); add(new THREE.SphereGeometry(0.2, 12, 10), mb, 0.4, top - 0.05, 0); add(new THREE.SphereGeometry(0.11, 10, 8), ma, -0.4, top - 0.05, 0.1); add(new THREE.SphereGeometry(0.11, 10, 8), ma, 0.4, top - 0.05, 0.1); break;
    case 'bunny': for (const s of [-1, 1]) { add(new THREE.CapsuleGeometry(0.09, 0.5, 4, 10), mb, s * 0.18, top + 0.3, 0, 0, 0, s * -0.15); add(new THREE.CapsuleGeometry(0.045, 0.36, 4, 8), M('#ffb3c6'), s * 0.18, top + 0.3, 0.06, 0, 0, s * -0.15); } break;
    case 'horns': add(new THREE.ConeGeometry(0.11, 0.38, 8), M('#f5e6c8'), -0.3, top + 0.05, 0, 0, 0, 0.55); add(new THREE.ConeGeometry(0.11, 0.38, 8), M('#f5e6c8'), 0.3, top + 0.05, 0, 0, 0, -0.55); break;
    case 'flower': for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(new THREE.SphereGeometry(0.1, 8, 6), M('#ff5fb8'), Math.cos(a) * 0.17, top + 0.06, Math.sin(a) * 0.17); } add(new THREE.SphereGeometry(0.09, 8, 6), M('#ffd23f'), 0, top + 0.08, 0); break;
    case 'propeller': add(new THREE.SphereGeometry(0.42, 16, 10, 0, 6.283, 0, 1.3), M('#ff4d6d'), 0, top - 0.2, 0); add(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), M('#4a5568'), 0, top + 0.1, 0); { const p = add(new THREE.BoxGeometry(0.7, 0.03, 0.09), M('#ffd23f'), 0, top + 0.2, 0); p.name = 'spin'; } break;
    case 'bow': add(new THREE.SphereGeometry(0.15, 8, 6), M('#ff4d6d'), -0.2, top + 0.02, 0.1).scale.set(1, 0.7, 0.6); add(new THREE.SphereGeometry(0.15, 8, 6), M('#ff4d6d'), 0.2, top + 0.02, 0.1).scale.set(1, 0.7, 0.6); add(new THREE.SphereGeometry(0.07, 8, 6), M('#c9184a'), 0, top + 0.02, 0.12); break;
    case 'halo': { const h = add(new THREE.TorusGeometry(0.3, 0.035, 8, 32), M('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.9 }), 0, top + 0.28, 0, Math.PI / 2); h.name = 'float'; break; }
    case 'viking': add(new THREE.SphereGeometry(0.46, 16, 10, 0, 6.283, 0, 1.4), M('#8d99ae', { metalness: 0.5, roughness: 0.4 }), 0, top - 0.24, 0); add(new THREE.ConeGeometry(0.09, 0.4, 8), M('#f5e6c8'), -0.42, top + 0.02, 0, 0, 0, 0.9); add(new THREE.ConeGeometry(0.09, 0.4, 8), M('#f5e6c8'), 0.42, top + 0.02, 0, 0, 0, -0.9); break;
    case 'chef': add(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 16), M('#fff'), 0, top + 0.02, 0); add(new THREE.SphereGeometry(0.4, 16, 12), M('#fff'), 0, top + 0.3, 0).scale.set(1, 0.7, 1); break;
    case 'party': add(new THREE.ConeGeometry(0.24, 0.6, 12), M(acc), 0, top + 0.26, 0); add(new THREE.SphereGeometry(0.07, 8, 6), M('#ffd23f'), 0, top + 0.58, 0); break;
    case 'pirate': add(new THREE.SphereGeometry(0.44, 16, 10, 0, 6.283, 0, 1.3), M('#22223b'), 0, top - 0.2, 0); add(new THREE.BoxGeometry(1.0, 0.06, 0.4), M('#22223b'), 0, top + 0.02, 0).scale.set(1, 1, 1); add(new THREE.SphereGeometry(0.07, 8, 6), M('#fff'), 0, top + 0.15, 0.4); break;
    case 'headphones': add(new THREE.TorusGeometry(0.5, 0.05, 8, 24, Math.PI), M('#22223b'), 0, top - 0.3, 0); add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), M('#ff4d6d'), -0.5, top - 0.32, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), M('#ff4d6d'), 0.5, top - 0.32, 0, 0, 0, Math.PI / 2); break;
    case 'mohawk': for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.08, 0.36, 6), M('#ff4d6d'), 0, top + 0.1, 0.28 - i * 0.14, (i - 2) * 0.25); break;
    case 'unicorn': add(new THREE.ConeGeometry(0.09, 0.5, 8), M('#ffd23f', { metalness: 0.3, roughness: 0.3 }), 0, top + 0.22, 0.12, 0.35); break;
    case 'cat': for (const s of [-1, 1]) { add(new THREE.ConeGeometry(0.14, 0.3, 4), mb, s * 0.3, top + 0.05, 0, 0, 0.78, s * -0.3); add(new THREE.ConeGeometry(0.07, 0.18, 4), M('#ffb3c6'), s * 0.3, top + 0.05, 0.04, 0, 0.78, s * -0.3); } break;
    case 'beanie': add(new THREE.SphereGeometry(0.47, 16, 12, 0, 6.283, 0, 1.5), M(acc), 0, top - 0.22, 0); add(new THREE.SphereGeometry(0.12, 10, 8), M('#fff'), 0, top + 0.26, 0); break;
    case 'sombrero': add(new THREE.CylinderGeometry(0.9, 0.9, 0.04, 24), M('#e9c46a'), 0, top - 0.02, 0); add(new THREE.CylinderGeometry(0.28, 0.32, 0.32, 16), M('#e9c46a'), 0, top + 0.14, 0); add(new THREE.TorusGeometry(0.3, 0.03, 6, 20), M('#ff4d6d'), 0, top + 0.02, 0, Math.PI / 2); break;
    case 'leaf': add(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6), M('#2f9e44'), 0, top + 0.1, 0); add(new THREE.SphereGeometry(0.16, 8, 6), M('#3ddc84'), 0.1, top + 0.24, 0).scale.set(1.6, 0.35, 0.8); break;
    case 'fin': add(new THREE.ConeGeometry(0.16, 0.5, 4), M('#8d99ae'), 0, top + 0.18, -0.05, 0, Math.PI / 4); break;
  }
  return g;
}

function buildExtra(kind, base, acc) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = mesh(geo, mat, x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  switch (kind) {
    case 'cape': { const c = add(new THREE.PlaneGeometry(0.8, 0.9, 1, 4), M(acc, { side: THREE.DoubleSide }), 0, -0.1, -0.5); c.name = 'cape'; break; }
    case 'scarf': add(new THREE.TorusGeometry(0.5, 0.11, 8, 20), M(acc), 0, -0.25, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.16, 0.5, 0.08), M(acc), 0.2, -0.5, 0.42, 0.2); break;
    case 'bowtie': add(new THREE.ConeGeometry(0.1, 0.22, 3), M('#ff4d6d'), -0.12, -0.25, 0.5, 0, 0, Math.PI / 2); add(new THREE.ConeGeometry(0.1, 0.22, 3), M('#ff4d6d'), 0.12, -0.25, 0.5, 0, 0, -Math.PI / 2); add(new THREE.SphereGeometry(0.05, 6, 5), M('#c9184a'), 0, -0.25, 0.52); break;
    case 'backpack': add(new THREE.BoxGeometry(0.42, 0.5, 0.22), M(acc), 0, -0.05, -0.56); add(new THREE.BoxGeometry(0.3, 0.16, 0.1), M(base), 0, 0.15, -0.68); break;
    case 'wings': for (const s of [-1, 1]) { const w = add(new THREE.SphereGeometry(0.28, 10, 8), M('#fff'), s * 0.5, 0.05, -0.3, 0, 0, s * 0.6); w.scale.set(1.4, 0.7, 0.3); w.name = 'wing' + (s > 0 ? 'R' : 'L'); } break;
    case 'tail': { const t = add(new THREE.ConeGeometry(0.1, 0.6, 8), M(base), 0, -0.3, -0.62, -1.9); t.name = 'tail'; add(new THREE.SphereGeometry(0.1, 8, 6), M(acc), 0, -0.05, -0.9); break; }
    case 'tie': add(new THREE.BoxGeometry(0.12, 0.45, 0.04), M('#ff4d6d'), 0, -0.35, 0.56, 0.15); add(new THREE.BoxGeometry(0.16, 0.12, 0.04), M('#c9184a'), 0, -0.12, 0.56, 0.15); break;
    case 'bandolier': add(new THREE.TorusGeometry(0.58, 0.05, 6, 30), M('#ffd23f'), 0, 0, 0, Math.PI / 2 + 0.5, 0, 0.6); break;
    case 'jetpack': for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), M('#8d99ae', { metalness: 0.6, roughness: 0.3 }), s * 0.16, -0.05, -0.58); add(new THREE.ConeGeometry(0.09, 0.2, 8), M('#ff8c42', { emissive: '#ff8c42', emissiveIntensity: 0.8 }), s * 0.16, -0.4, -0.58, Math.PI); } break;
  }
  return g;
}

export function buildRumbler(lookIn) {
  const look = normaliseLook(lookIn);
  const base = PALETTE[look.color][1], acc = PALETTE[look.accent][1];
  const group = new THREE.Group();
  // ball
  const ball = mesh(new THREE.SphereGeometry(BALL_R, 28, 20), new THREE.MeshStandardMaterial({ map: ballTexture(look.ball, look.ballColor), roughness: 0.35 }));
  ball.receiveShadow = true; group.add(ball);
  // body
  const bodyG = new THREE.Group(); bodyG.position.y = BALL_R + 0.5;
  const sc = BODY_SCALE[look.body];
  const shape = new THREE.Group(); shape.scale.set(sc[0], sc[1], sc[2]);
  const body = mesh(new THREE.SphereGeometry(R, 28, 20), new THREE.MeshStandardMaterial({ map: bodyTexture(look), roughness: 0.55 }));
  shape.add(body);
  const facePatch = mesh(new THREE.SphereGeometry(R * 1.012, 24, 16, Math.PI / 2 - 0.95, 1.9, 0.55, 1.35), new THREE.MeshBasicMaterial({ map: faceTexture(look, 'normal'), transparent: true }));
  facePatch.castShadow = false; shape.add(facePatch);
  bodyG.add(shape);
  // feet
  const feetM = M(base);
  for (const s of [-1, 1]) { const f = mesh(new THREE.SphereGeometry(0.16, 10, 8), feetM, s * 0.28 * sc[0], -R * sc[1] + 0.02, 0.08); f.scale.set(1, 0.6, 1.3); bodyG.add(f); }
  // hat and extra scale with body
  const hat = buildHat(look.hat, base, acc); hat.position.y = (R * sc[1]) - R; hat.scale.set(Math.max(0.9, sc[0]), 1, Math.max(0.9, sc[2])); bodyG.add(hat);
  const extra = buildExtra(look.extra, base, acc); extra.scale.set(sc[0], sc[1], sc[2]); bodyG.add(extra);
  group.add(bodyG);
  const faceStates = {}; for (const s of ['normal', 'blink', 'dash', 'shock', 'happy', 'ouch']) faceStates[s] = faceTexture(look, s);
  const rig = {
    group, ball, bodyG, shape, body, facePatch, hat, extra, look,
    spin: hat.getObjectByName('spin'), halo: hat.getObjectByName('float'), cape: extra.getObjectByName('cape'), wingL: extra.getObjectByName('wingL'), wingR: extra.getObjectByName('wingR'), tail: extra.getObjectByName('tail'),
    expression: 'normal',
    setExpression(s) { if (s !== this.expression && faceStates[s]) { this.expression = s; facePatch.material.map = faceStates[s]; facePatch.material.needsUpdate = true; } },
  };
  return rig;
}

// idle / motion animation shared by game and preview
export function animateRig(rig, t, dt, opts = {}) {
  const speed = opts.speed || 0, dashing = !!opts.dashing;
  rig.bodyG.rotation.x = Math.min(0.45, speed * 0.045) * (dashing ? 1.4 : 1);
  rig.bodyG.position.y = BALL_R + 0.5 + Math.abs(Math.sin(t * 9 + (opts.seed || 0))) * Math.min(0.12, speed * 0.02) + Math.sin(t * 2.2 + (opts.seed || 0)) * 0.02;
  const breathe = 1 + Math.sin(t * 2.2 + (opts.seed || 0)) * 0.02;
  rig.shape.scale.set(BODY_SCALE[rig.look.body][0] * breathe * (opts.squash || 1), BODY_SCALE[rig.look.body][1] / (opts.squash || 1), BODY_SCALE[rig.look.body][2] * breathe * (opts.squash || 1));
  if (rig.spin) rig.spin.rotation.y += dt * (6 + speed * 3);
  if (rig.halo) rig.halo.position.y = R + 0.28 + Math.sin(t * 3) * 0.04;
  if (rig.cape) { rig.cape.rotation.x = -0.3 - Math.min(0.9, speed * 0.1) - Math.sin(t * 6) * 0.08; }
  if (rig.wingL) { rig.wingL.rotation.z = 0.6 + Math.sin(t * 10) * 0.35; rig.wingR.rotation.z = -0.6 - Math.sin(t * 10) * 0.35; }
  if (rig.tail) rig.tail.rotation.y = Math.sin(t * 5) * 0.5;
  // blink
  rig._blinkT = (rig._blinkT ?? (2 + Math.random() * 3)) - dt;
  if (!opts.lockFace) {
    if (rig._blinkT < 0) { rig.setExpression('blink'); if (rig._blinkT < -0.12) { rig._blinkT = 2 + Math.random() * 4; rig.setExpression('normal'); } }
    else if (rig.expression === 'blink') rig.setExpression('normal');
  }
}
