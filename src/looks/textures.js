// Procedural canvas textures for skins, outfits, faces and balls. Cached by content key.
import * as THREE from 'three';
import { PALETTE } from './catalog.js';

const cache = new Map();
export function canvasTex(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  cache.set(key, tx); return tx;
}
export const INK = '#2b1b4d';
const FRONT = 0.25; // u coordinate of the sphere's front (+z)

export function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
export function heart(g, x, y, r) { g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r); g.fill(); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
const darker = (hex, f = 0.75) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

// ---- body skin: pattern, then outfit on top ----
export function bodyTexture(look) {
  const base = PALETTE[look.color][1], acc = PALETTE[look.accent][1];
  return canvasTex(`body:${look.pattern}:${look.outfit}:${base}:${acc}`, 512, 256, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.fillStyle = acc;
    switch (look.pattern) {
      case 'stripes': for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 28, H); break;
      case 'spots': for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 97) % W, 30 + (i * 61) % (H - 60), 10 + (i % 3) * 5, 0, 6.29); g.fill(); } break;
      case 'belly': g.beginPath(); g.ellipse(W * FRONT, H * 0.66, 80, 60, 0, 0, 6.29); g.fill(); break;
      case 'stars': for (let i = 0; i < 18; i++) star(g, (i * 131) % W, 25 + (i * 83) % (H - 50), 14 + (i % 2) * 6); break;
      case 'hearts': for (let i = 0; i < 18; i++) heart(g, (i * 113) % W, 25 + (i * 71) % (H - 50), 12 + (i % 2) * 5); break;
      case 'zigzag': g.lineWidth = 14; g.strokeStyle = acc; for (const y of [70, 150]) { g.beginPath(); for (let x = 0; x <= W; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 22 : -22)); g.stroke(); } break;
      case 'checks': for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) if (((x + y) / 32) % 2 === 0) g.fillRect(x, y, 32, 32); break;
      case 'lightning': { const cx = W * FRONT; g.beginPath(); g.moveTo(cx, 60); g.lineTo(cx - 20, 130); g.lineTo(cx + 10, 125); g.lineTo(cx - 16, 200); g.lineTo(cx + 34, 115); g.lineTo(cx + 6, 120); g.lineTo(cx + 28, 60); g.closePath(); g.fill(); break; }
      case 'freckles': g.fillStyle = darker(base, 0.8); for (let i = 0; i < 60; i++) { g.beginPath(); g.arc((i * 89) % W, 20 + (i * 47) % (H - 40), 3, 0, 6.29); g.fill(); } break;
    }
    // outfits: y=0 is the top of the body sphere, front centre at x = W*FRONT
    const cx = W * FRONT, white = '#fff7ee';
    const shirtTop = (colour, to = 0.62) => { g.fillStyle = colour; g.fillRect(0, 0, W, H * to); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H * to - 6, W, 6); };
    switch (look.outfit) {
      case 'tee': shirtTop(acc); g.fillStyle = base; g.beginPath(); g.ellipse(cx, 0, 58, 40, 0, 0, 6.29); g.fill(); break;
      case 'dungarees': g.fillStyle = acc; g.fillRect(0, H * 0.42, W, H); g.fillRect(cx - 58, 0, 22, H * 0.5); g.fillRect(cx + 36, 0, 22, H * 0.5); g.fillStyle = darker(acc); rr(g, cx - 42, H * 0.5, 84, 46, 8); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(cx - 47, H * 0.43, 7, 0, 6.29); g.arc(cx + 47, H * 0.43, 7, 0, 6.29); g.fill(); break;
      case 'hoodie': shirtTop(acc, 0.7); g.fillStyle = darker(acc); rr(g, cx - 70, H * 0.42, 140, 40, 14); g.fillStyle = white; g.fillRect(cx - 14, 0, 6, 60); g.fillRect(cx + 8, 0, 6, 60); break;
      case 'tux': shirtTop('#22223b', 0.72); g.fillStyle = white; g.beginPath(); g.moveTo(cx - 50, 0); g.lineTo(cx + 50, 0); g.lineTo(cx + 22, H * 0.66); g.lineTo(cx - 22, H * 0.66); g.closePath(); g.fill(); g.fillStyle = INK; for (const y of [60, 100, 140]) { g.beginPath(); g.arc(cx, y, 4, 0, 6.29); g.fill(); } break;
      case 'sailor': shirtTop(white, 0.66); g.fillStyle = '#4361ee'; for (let i = 0; i < 4; i++) g.fillRect(0, 40 + i * 32, W, 12); g.beginPath(); g.moveTo(cx - 70, 0); g.lineTo(cx + 70, 0); g.lineTo(cx, 70); g.closePath(); g.fill(); break;
      case 'dress': shirtTop(acc, 0.5); g.fillStyle = acc; g.fillRect(0, H * 0.5, W, H * 0.5); g.fillStyle = white; for (let i = 0; i < 24; i++) { g.beginPath(); g.arc(i * 21 + 10, H * 0.5, 6, 0, 6.29); g.fill(); } g.fillStyle = base; g.beginPath(); g.ellipse(cx, 0, 50, 34, 0, 0, 6.29); g.fill(); break;
      case 'football': shirtTop(acc, 0.66); g.fillStyle = white; g.fillRect(cx - 100, 0, 22, H * 0.66); g.fillRect(cx + 78, 0, 22, H * 0.66); g.fillStyle = white; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.fillText('7', cx, H * 0.5); break;
      case 'pyjamas': shirtTop(acc, 1); g.fillStyle = white; for (let i = 0; i < 10; i++) g.fillRect(i * 52, 0, 16, H); g.fillStyle = base; g.beginPath(); g.ellipse(cx, 0, 44, 30, 0, 0, 6.29); g.fill(); break;
    }
  });
}

// ---- faces ----
function eye(g, cx, cy, rx, ry, pupil, state, angle = 0, lashes = false) {
  if (state === 'blink') { g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - rx, cy); g.quadraticCurveTo(cx, cy + 10, cx + rx, cy); g.stroke(); return; }
  if (state === 'happy') { g.strokeStyle = INK; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + ry * 0.45, rx, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); return; }
  const sy = state === 'dash' ? 0.5 : state === 'shock' ? 1.3 : 1;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy, rx, ry * sy, angle, 0, 6.29); g.fill();
  g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
  const pr = state === 'shock' ? pupil * 0.55 : pupil, ox = state === 'dash' ? rx * 0.18 : 0, oy = state === 'dash' ? 0 : ry * 0.12;
  g.fillStyle = INK; g.beginPath(); g.arc(cx + ox, cy + oy, pr, 0, 6.29); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + ox - pr * 0.35, cy + oy - pr * 0.35, pr * 0.32, 0, 6.29); g.fill();
  if (lashes && state === 'normal') { g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; for (const a of [-0.9, -0.55, -0.2]) { const s = Math.sign(cx - 256) || 1; g.beginPath(); g.moveTo(cx + Math.cos(-Math.PI / 2 + a * s) * rx, cy + Math.sin(-Math.PI / 2 + a * s) * ry); g.lineTo(cx + Math.cos(-Math.PI / 2 + a * s) * (rx + 16), cy + Math.sin(-Math.PI / 2 + a * s) * (ry + 16)); g.stroke(); } }
  if (state === 'ouch') { g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(cx - rx, cy - ry * 1.35); g.lineTo(cx + rx, cy - ry * 0.95); g.stroke(); }
}
function drawEyes(g, kind, state, W, H) {
  const y = H * 0.4, L = W * 0.36, R = W * 0.64;
  if (kind === 'cyclops') { eye(g, W / 2, y, 64, 64, 30, state); return; }
  if (kind === 'shades') {
    g.fillStyle = INK; rr(g, L - 66, y - 34, 128, 70, 24); rr(g, R - 62, y - 34, 128, 70, 24); g.fillRect(L + 40, y - 6, R - L - 80, 12);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(L - 48, y - 24, 44, 10); g.fillRect(R - 44, y - 24, 44, 10);
    if (state === 'shock' || state === 'ouch') { g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(L - 60, y - 60); g.lineTo(L + 60, y - 50); g.moveTo(R - 60, y - 50); g.lineTo(R + 60, y - 60); g.stroke(); }
    return;
  }
  const big = kind === 'big' || kind === 'sparkle' || kind === 'lashes' || kind === 'star';
  const rx = big ? 50 : kind === 'dot' ? 30 : 44, ry = big ? 54 : kind === 'dot' ? 30 : kind === 'sleepy' ? 26 : 46, pupil = big ? 24 : kind === 'dot' ? 18 : 20;
  const angle = kind === 'angry' ? 0.25 : 0;
  eye(g, L, y, rx, ry, pupil, kind === 'wink' && state === 'normal' ? 'blink' : state, -angle, kind === 'lashes');
  eye(g, R, y, rx, ry, pupil, state, angle, kind === 'lashes');
  if (kind === 'angry' && state !== 'happy') { g.strokeStyle = INK; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(L - 50, y - 66); g.lineTo(L + 42, y - 46); g.moveTo(R + 50, y - 66); g.lineTo(R - 42, y - 46); g.stroke(); }
  if (kind === 'sleepy' && state === 'normal') { g.fillStyle = INK; g.fillRect(L - rx, y - ry - 2, rx * 2, ry * 0.7); g.fillRect(R - rx, y - ry - 2, rx * 2, ry * 0.7); }
  if (kind === 'sparkle' && state === 'normal') { g.fillStyle = '#fff'; star(g, L + 16, y - 20, 11); star(g, R + 16, y - 20, 11); }
  if (kind === 'star' && state === 'normal') { g.fillStyle = '#ffd23f'; star(g, L, y + 6, 22); star(g, R, y + 6, 22); }
  if (kind === 'glasses') { g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(L, y, rx + 16, 0, 6.29); g.moveTo(R + rx + 16, y); g.arc(R, y, rx + 16, 0, 6.29); g.moveTo(L + rx + 16, y); g.lineTo(R - rx - 16, y); g.stroke(); }
}
function drawMouth(g, kind, state, W, H) {
  const cx = W / 2, y = H * 0.76;
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 10; g.lineCap = 'round';
  if (state === 'shock' || state === 'ouch') { g.beginPath(); g.ellipse(cx, y + 8, state === 'shock' ? 36 : 24, state === 'shock' ? 46 : 15, 0, 0, 6.29); g.fill(); g.fillStyle = '#ff7b9c'; g.beginPath(); g.ellipse(cx, y + 26, 18, 13, 0, 0, 6.29); g.fill(); return; }
  if (state === 'happy' || kind === 'grin') { g.beginPath(); g.arc(cx, y - 8, 64, 0.15, Math.PI - 0.15); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(cx - 48, y - 2, 96, 15); g.fillStyle = '#ff7b9c'; g.beginPath(); g.ellipse(cx, y + 34, 28, 15, 0, 0, 6.29); g.fill(); return; }
  if (state === 'dash') { g.beginPath(); g.moveTo(cx - 44, y + 12); g.lineTo(cx + 44, y - 4); g.stroke(); return; }
  switch (kind) {
    case 'smile': g.beginPath(); g.arc(cx, y - 16, 54, 0.3, Math.PI - 0.3); g.stroke(); break;
    case 'o': g.beginPath(); g.ellipse(cx, y + 6, 24, 30, 0, 0, 6.29); g.fill(); break;
    case 'smirk': g.beginPath(); g.moveTo(cx - 40, y + 4); g.quadraticCurveTo(cx + 10, y + 26, cx + 44, y - 8); g.stroke(); break;
    case 'fangs': g.beginPath(); g.arc(cx, y - 16, 54, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 32, y + 6); g.lineTo(cx - 20, y + 36); g.lineTo(cx - 8, y + 10); g.fill(); g.beginPath(); g.moveTo(cx + 32, y + 6); g.lineTo(cx + 20, y + 36); g.lineTo(cx + 8, y + 10); g.fill(); break;
    case 'tash': g.beginPath(); g.arc(cx, y - 6, 42, 0.4, Math.PI - 0.4); g.stroke(); g.fillStyle = '#3b2a1a'; g.beginPath(); g.ellipse(cx - 36, y - 28, 36, 15, -0.3, 0, 6.29); g.fill(); g.beginPath(); g.ellipse(cx + 36, y - 28, 36, 15, 0.3, 0, 6.29); g.fill(); break;
    case 'tongue': g.beginPath(); g.arc(cx, y - 16, 54, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#ff5f8f'; g.beginPath(); g.ellipse(cx + 18, y + 30, 22, 28, 0, 0, 6.29); g.fill(); break;
    case 'beak': g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(cx - 48, y - 22); g.lineTo(cx + 48, y - 22); g.lineTo(cx, y + 36); g.closePath(); g.fill(); g.strokeStyle = '#d98a1f'; g.lineWidth = 4; g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(cx - 44, y); g.lineTo(cx + 44, y); g.stroke(); break;
    case 'beard': g.beginPath(); g.arc(cx, y - 16, 48, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#5b3a1e'; g.beginPath(); g.moveTo(cx - 96, y - 32); g.quadraticCurveTo(cx, y + 160, cx + 96, y - 32); g.quadraticCurveTo(cx + 64, y + 10, cx, y + 26); g.quadraticCurveTo(cx - 64, y + 10, cx - 96, y - 32); g.fill(); break;
    case 'buck': g.beginPath(); g.arc(cx, y - 16, 50, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#fff'; rr(g, cx - 22, y + 4, 20, 30, 4); rr(g, cx + 2, y + 4, 20, 30, 4); break;
  }
}
export function faceTexture(look, state) {
  return canvasTex(`face:${look.eyes}:${look.mouth}:${state}`, 512, 400, (g, W, H) => { g.clearRect(0, 0, W, H); drawEyes(g, look.eyes, state, W, H); drawMouth(g, look.mouth, state, W, H); });
}

// ---- balls ----
export function ballTexture(kind, colourIdx) {
  const c = PALETTE[colourIdx][1];
  return canvasTex('ball:' + kind + c, 512, 256, (g, W, H) => {
    const white = '#fff8ee';
    g.fillStyle = white; g.fillRect(0, 0, W, H);
    switch (kind) {
      case 'stripes': g.fillStyle = c; for (let i = 0; i < 4; i++) g.fillRect(i * 128, 0, 64, H); break;
      case 'beach': { const cs = [c, white, '#4cc9f0', white, '#ffd23f', white]; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(i * W / 6, 0, W / 6 + 1, H); } break; }
      case 'soccer': g.fillStyle = INK; for (let i = 0; i < 12; i++) { const x = (i % 4) * 128 + (i >= 4 && i < 8 ? 64 : 0), y = 40 + Math.floor(i / 4) * 88; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); } g.fill(); } break;
      case 'basketball': g.fillStyle = '#ff8c42'; g.fillRect(0, 0, W, H); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); for (let i = 0; i < 4; i++) { g.moveTo(i * 128, 0); g.lineTo(i * 128, H); } g.stroke(); break;
      case 'disco': for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) { const s = ((x + y) / 32) % 3; g.fillStyle = s === 0 ? '#e0e0e0' : s === 1 ? '#a0a0a0' : '#ffffff'; g.fillRect(x + 2, y + 2, 28, 28); } break;
      case 'globe': g.fillStyle = '#4cc9f0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3ddc84'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse((i * 137) % W, 40 + (i * 53) % (H - 80), 40 + (i % 3) * 18, 26 + (i % 2) * 14, i, 0, 6.29); g.fill(); } break;
      case 'candy': g.fillStyle = c; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 96, H); g.lineTo(i * 64 + 64, H); g.closePath(); g.fill(); } break;
      case 'galaxy': g.fillStyle = '#1b1035'; g.fillRect(0, 0, W, H); g.fillStyle = '#6b3fd6'; g.beginPath(); g.ellipse(W * 0.5, H * 0.5, 200, 60, 0.3, 0, 6.29); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { g.beginPath(); g.arc((i * 89) % W, (i * 37) % H, 1 + (i % 3), 0, 6.29); g.fill(); } break;
      case 'ladybird': g.fillStyle = '#ff2e4c'; g.fillRect(0, 0, W, H); g.fillStyle = INK; g.fillRect(W / 2 - 5, 0, 10, H); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i * 97) % W, 30 + (i * 61) % (H - 60), 18, 0, 6.29); g.fill(); } break;
      case 'watermelon': g.fillStyle = '#ff5f8f'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f9e44'; g.fillRect(0, 0, W, 34); g.fillRect(0, H - 34, W, 34); g.fillStyle = INK; for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse((i * 101) % W, 60 + (i * 47) % (H - 120), 6, 10, 0, 0, 6.29); g.fill(); } break;
      case 'eight': g.fillStyle = INK; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, 50, 0, 6.29); g.fill(); g.fillStyle = INK; g.font = 'bold 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', W / 2, H / 2 + 4); break;
      case 'donut': { g.fillStyle = '#ffb3c6'; g.fillRect(0, 0, W, H); const sc = ['#ffd23f', '#4cc9f0', '#3ddc84', '#ff4d6d', '#fff']; for (let i = 0; i < 60; i++) { g.fillStyle = sc[i % 5]; g.save(); g.translate((i * 83) % W, (i * 49) % H); g.rotate(i); g.fillRect(-10, -3, 20, 6); g.restore(); } break; }
      case 'tennis': g.fillStyle = '#d9f24f'; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(128, 128, 0, 196); g.moveTo(W, 60); g.quadraticCurveTo(384, 128, W, 196); g.moveTo(128, 0); g.quadraticCurveTo(256, 128, 128, H); g.moveTo(384, 0); g.quadraticCurveTo(256, 128, 384, H); g.stroke(); break;
      case 'bomb': g.fillStyle = '#2b2b3b'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(W * 0.3, H * 0.3, 40, 26, -0.5, 0, 6.29); g.fill(); break;
      case 'planet': g.fillStyle = c; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) g.fillRect(0, 30 + i * 46, W, 10 + (i % 2) * 8); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, H * 0.48, W, 14); break;
    }
  });
}
