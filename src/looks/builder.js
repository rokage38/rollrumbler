// Builds a rumbler: a round-headed toy on a ball, with hats, outfits, extras and expressions.
import * as THREE from 'three';
import { PALETTE, normaliseLook } from './catalog.js';
import { bodyTexture, faceTexture, ballTexture, INK } from './textures.js';
import { BALL_R } from '../core/sim.js';

let fancy = true; // clearcoat materials on capable devices
export function setMaterialQuality(high) { fancy = !!high; }

const mat = (color, o = {}) => fancy
  ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.55, clearcoatRoughness: 0.35, ...o })
  : new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; return me; };
function outline(target, scale = 1.05) { const o = new THREE.Mesh(target.geometry, outlineMat); o.scale.setScalar(scale); target.add(o); return o; }

const BODY = { round: [1, 1, 1], egg: [0.9, 1.22, 0.9], squat: [1.2, 0.8, 1.2], tall: [0.84, 1.35, 0.84], bean: [0.95, 1.1, 0.86], pear: [1.05, 1.05, 1.05] };
const BR = 0.5;   // body radius before scaling
const HR = 0.42;  // head radius
const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

// ---------------- hats (positioned relative to head centre; head top at y = HR) ----------------
function buildHat(kind, base, acc) {
  const g = new THREE.Group(); const top = HR - 0.02;
  const mb = mat(base), ma = mat(acc), gold = mat('#ffd23f', { metalness: 0.5, roughness: 0.3 }), white = mat('#fff7ee'), ink = mat('#2b1b4d');
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = mesh(geo, m, x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
  const cap = (r, h, m, y) => add(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, h), m, 0, y, 0);
  const band = (r, m, y, t = 0.05) => add(new THREE.TorusGeometry(r, t, 8, 32), m, 0, y, 0, Math.PI / 2);
  switch (kind) {
    case 'crown': { const c = add(new THREE.CylinderGeometry(0.36, 0.3, 0.3, 8, 1, true), mat('#ffd23f', { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }), 0, top + 0.12, 0); band(0.31, gold, top + 0.0, 0.04); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; add(new THREE.ConeGeometry(0.07, 0.16, 4), gold, Math.cos(a) * 0.35, top + 0.33, Math.sin(a) * 0.35); if (i % 2 === 0) add(new THREE.SphereGeometry(0.05, 8, 6), mat(['#ff4d6d', '#4cc9f0', '#3ddc84', '#8338ec'][i / 2], { roughness: 0.2 }), Math.cos(a) * 0.36, top + 0.14, Math.sin(a) * 0.36); } break; }
    case 'cap': cap(HR + 0.04, 1.35, mb, top - 0.36); add(new THREE.CylinderGeometry(HR + 0.05, HR + 0.05, 0.06, 24, 1, false, -0.6, 1.2 + 1.2), mb, 0, top - 0.02, 0.12).scale.set(1, 1, 1.3); add(new THREE.SphereGeometry(0.05, 8, 6), ma, 0, top + 0.1, 0); band(HR + 0.045, ma, top - 0.02, 0.025); break;
    case 'tophat': add(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 28), ink, 0, top, 0); add(new THREE.CylinderGeometry(0.33, 0.36, 0.52, 28), ink, 0, top + 0.27, 0); add(new THREE.CylinderGeometry(0.355, 0.365, 0.1, 28), mat('#ff4d6d'), 0, top + 0.08, 0); add(new THREE.SphereGeometry(0.04, 6, 5), gold, 0.3, top + 0.08, 0.2); break;
    case 'party': { add(new THREE.ConeGeometry(0.26, 0.62, 16), ma, 0, top + 0.3, 0); add(new THREE.SphereGeometry(0.08, 10, 8), white, 0, top + 0.63, 0); for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.26 - i * 0.075, 0.018, 6, 24), i % 2 ? gold : white, 0, top + 0.03 + i * 0.18, 0, Math.PI / 2); break; }
    case 'cowboy': add(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 28), mat('#a9743a'), 0, top - 0.02, 0).scale.set(1, 1, 0.85); add(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 20), mat('#a9743a'), 0, top + 0.16, 0); band(0.33, ink, top + 0.04, 0.035); add(new THREE.BoxGeometry(0.34, 0.06, 0.1), mat('#a9743a'), 0, top + 0.34, 0); break;
    case 'wizard': add(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 28), mat('#5b3fd6'), 0, top - 0.02, 0); add(new THREE.ConeGeometry(0.32, 0.9, 20), mat('#5b3fd6'), 0.06, top + 0.42, 0, 0, 0, -0.18); for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.035, 6, 5), gold, 0.16 - i * 0.05, top + 0.2 + i * 0.16, 0.22 - i * 0.05); break;
    case 'astro': add(new THREE.SphereGeometry(HR + 0.16, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.32, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide }), 0, 0, 0).castShadow = false; band(HR + 0.15, white, -HR * 0.55, 0.06); add(new THREE.BoxGeometry(0.22, 0.16, 0.16), white, -HR - 0.14, -0.1, 0); break;
    case 'beret': add(new THREE.SphereGeometry(0.5, 20, 10, 0, 6.283, 0, 1.1), ma, 0.08, top - 0.26, 0, 0, 0, -0.25).scale.set(1, 0.6, 1); add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), ma, 0.1, top + 0.08, 0); break;
    case 'cone': add(new THREE.ConeGeometry(0.34, 0.8, 20), mat('#ff8c42'), 0, top + 0.36, 0); add(new THREE.BoxGeometry(0.72, 0.05, 0.72), mat('#ff8c42'), 0, top - 0.02, 0); for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(0.21 - i * 0.1, 0.25 - i * 0.1, 0.09, 20), white, 0, top + 0.28 + i * 0.22, 0); break;
    case 'bucket': add(new THREE.CylinderGeometry(0.42, 0.34, 0.42, 20, 1, true), mat('#8d99ae', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), 0, top + 0.16, 0, 0.35); add(new THREE.TorusGeometry(0.42, 0.03, 6, 24), mat('#8d99ae', { metalness: 0.6 }), 0, top + 0.37, 0, Math.PI / 2 + 0.35); break;
    case 'pirate': cap(HR + 0.05, 1.3, ink, top - 0.36); add(new THREE.BoxGeometry(1.15, 0.08, 0.5), ink, 0, top + 0.02, 0).rotation.z = 0.05; add(new THREE.SphereGeometry(0.07, 8, 6), white, 0, top + 0.16, 0.42); add(new THREE.BoxGeometry(0.12, 0.03, 0.03), white, 0, top + 0.06, 0.44); add(new THREE.BoxGeometry(0.03, 0.03, 0.12), white, 0, top + 0.06, 0.44); break;
    case 'viking': cap(HR + 0.06, 1.45, mat('#8d99ae', { metalness: 0.5, roughness: 0.4 }), top - 0.4); band(HR + 0.06, gold, top - 0.34, 0.035); for (const s of [-1, 1]) { add(new THREE.ConeGeometry(0.1, 0.46, 10), mat('#f5e6c8'), s * 0.46, top + 0.02, 0, 0, 0, s * -0.95); add(new THREE.SphereGeometry(0.05, 6, 5), gold, s * 0.42, top - 0.2, 0.3); } break;
    case 'chef': add(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20), white, 0, top + 0.05, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; add(new THREE.SphereGeometry(0.2, 12, 10), white, Math.cos(a) * 0.2, top + 0.34, Math.sin(a) * 0.2); } add(new THREE.SphereGeometry(0.22, 12, 10), white, 0, top + 0.42, 0); break;
    case 'beanie': cap(HR + 0.06, 1.55, ma, top - 0.38); for (let i = 0; i < 2; i++) band(HR + 0.055 - i * 0.02, white, top - 0.18 + i * 0.12, 0.025); add(new THREE.SphereGeometry(0.13, 10, 8), white, 0, top + 0.3, 0); break;
    case 'sombrero': add(new THREE.CylinderGeometry(0.95, 0.9, 0.05, 28), mat('#e9c46a'), 0, top - 0.02, 0); add(new THREE.TorusGeometry(0.93, 0.05, 8, 40), mat('#c9184a'), 0, top + 0.02, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.28, 0.34, 0.34, 18), mat('#e9c46a'), 0, top + 0.15, 0); band(0.31, mat('#c9184a'), top + 0.02, 0.035); break;
    case 'headphones': add(new THREE.TorusGeometry(HR + 0.1, 0.05, 8, 28, Math.PI), ink, 0, -0.02, 0); for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14), mat('#ff4d6d'), s * (HR + 0.1), -0.05, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 14), ink, s * (HR + 0.17), -0.05, 0, 0, 0, Math.PI / 2); } break;
    case 'propeller': cap(HR + 0.04, 1.3, mat('#ff4d6d'), top - 0.34); band(HR + 0.045, white, top - 0.1, 0.02); add(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), ink, 0, top + 0.1, 0); { const p = add(new THREE.BoxGeometry(0.76, 0.03, 0.1), gold, 0, top + 0.2, 0); p.name = 'spin'; } break;
    case 'halo': { const h = add(new THREE.TorusGeometry(0.32, 0.04, 8, 32), mat('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.9 }), 0, top + 0.3, 0, Math.PI / 2); h.name = 'float'; break; }
    case 'antenna': add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat('#4a5568'), 0, top + 0.22, 0); add(new THREE.SphereGeometry(0.1, 10, 8), mat('#ff4d6d', { emissive: '#ff4d6d', emissiveIntensity: 0.7 }), 0, top + 0.5, 0); break;
    case 'ears': for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.2, 14, 10), mb, s * 0.4, top - 0.06, 0); add(new THREE.SphereGeometry(0.11, 10, 8), ma, s * 0.4, top - 0.06, 0.1); } break;
    case 'bunny': for (const s of [-1, 1]) { add(new THREE.CapsuleGeometry(0.1, 0.52, 4, 10), mb, s * 0.18, top + 0.32, 0, 0, 0, s * -0.15); add(new THREE.CapsuleGeometry(0.05, 0.38, 4, 8), mat('#ffb3c6'), s * 0.18, top + 0.32, 0.06, 0, 0, s * -0.15); } break;
    case 'cat': for (const s of [-1, 1]) { add(new THREE.ConeGeometry(0.15, 0.32, 4), mb, s * 0.3, top + 0.06, 0, 0, 0.78, s * -0.3); add(new THREE.ConeGeometry(0.08, 0.2, 4), mat('#ffb3c6'), s * 0.3, top + 0.06, 0.04, 0, 0.78, s * -0.3); } break;
    case 'horns': for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.11, 0.4, 10), mat('#f5e6c8'), s * 0.3, top + 0.06, 0, 0, 0, s * -0.55); break;
    case 'unicorn': add(new THREE.ConeGeometry(0.1, 0.55, 10), mat('#ffd23f', { metalness: 0.3, roughness: 0.3 }), 0, top + 0.24, 0.12, 0.35); for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.075 - i * 0.02, 0.012, 6, 16), mat('#ff5fb8'), 0, top + 0.12 + i * 0.15, 0.16 - i * 0.05, 0.35 + Math.PI / 2); break;
    case 'flower': for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(new THREE.SphereGeometry(0.11, 8, 6), mat('#ff5fb8'), Math.cos(a) * 0.18, top + 0.06, Math.sin(a) * 0.18).scale.set(1, 0.5, 1); } add(new THREE.SphereGeometry(0.1, 8, 6), gold, 0, top + 0.09, 0); break;
    case 'crownflower': for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; const c = ['#ff5fb8', '#ffd23f', '#4cc9f0', '#ff4d6d'][i % 4]; add(new THREE.SphereGeometry(0.08, 8, 6), mat(c), Math.cos(a) * (HR + 0.02), top - 0.12, Math.sin(a) * (HR + 0.02)); } band(HR + 0.02, mat('#3ddc84'), top - 0.12, 0.03); break;
    case 'bow': for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.16, 10, 8), mat('#ff4d6d'), s * 0.2, top + 0.04, 0.1).scale.set(1, 0.7, 0.6); add(new THREE.SphereGeometry(0.08, 8, 6), mat('#c9184a'), 0, top + 0.04, 0.12); break;
    case 'mohawk': for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.08, 0.4, 6), mat('#ff4d6d'), 0, top + 0.12, 0.3 - i * 0.12, (i - 2.5) * 0.22); break;
    case 'leaf': add(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6), mat('#2f9e44'), 0, top + 0.1, 0); add(new THREE.SphereGeometry(0.17, 8, 6), mat('#3ddc84'), 0.1, top + 0.25, 0).scale.set(1.6, 0.35, 0.8); break;
    case 'fin': add(new THREE.ConeGeometry(0.17, 0.52, 4), mat('#8d99ae'), 0, top + 0.2, -0.05, 0, Math.PI / 4); break;
  }
  return g;
}

// ---------------- extras (relative to body centre) ----------------
function buildExtra(kind, base, acc, sy) {
  const g = new THREE.Group();
  const mb = mat(base), ma = mat(acc), gold = mat('#ffd23f', { metalness: 0.5, roughness: 0.3 }), white = mat('#fff7ee'), ink = mat('#2b1b4d');
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = mesh(geo, m, x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
  const back = -BR - 0.05, front = BR + 0.02, neck = BR * sy - 0.05;
  switch (kind) {
    case 'cape': { const c = add(new THREE.PlaneGeometry(0.9, 1.1, 1, 4), mat(acc, { side: THREE.DoubleSide }), 0, neck - 0.55, back); c.name = 'cape'; add(new THREE.TorusGeometry(0.34, 0.05, 6, 20), ma, 0, neck, 0, Math.PI / 2); break; }
    case 'scarf': add(new THREE.TorusGeometry(0.4, 0.12, 8, 20), ma, 0, neck - 0.02, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.18, 0.5, 0.08), ma, 0.2, neck - 0.3, front, 0.2); add(new THREE.BoxGeometry(0.18, 0.06, 0.1), white, 0.2, neck - 0.52, front, 0.2); break;
    case 'bowtie': add(new THREE.ConeGeometry(0.11, 0.24, 3), mat('#ff4d6d'), -0.13, neck - 0.08, front, 0, 0, Math.PI / 2); add(new THREE.ConeGeometry(0.11, 0.24, 3), mat('#ff4d6d'), 0.13, neck - 0.08, front, 0, 0, -Math.PI / 2); add(new THREE.SphereGeometry(0.05, 6, 5), mat('#c9184a'), 0, neck - 0.08, front + 0.02); break;
    case 'tie': add(new THREE.BoxGeometry(0.13, 0.5, 0.04), mat('#ff4d6d'), 0, neck - 0.36, front + 0.02, 0.15); add(new THREE.BoxGeometry(0.17, 0.12, 0.05), mat('#c9184a'), 0, neck - 0.1, front + 0.02, 0.15); break;
    case 'backpack': add(new THREE.BoxGeometry(0.46, 0.54, 0.24), ma, 0, -0.05, back - 0.06); add(new THREE.BoxGeometry(0.32, 0.18, 0.1), mb, 0, 0.15, back - 0.2); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.5, 0.06), ink, s * 0.18, 0.05, back + 0.2, -0.5); break;
    case 'jetpack': for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 12), mat('#8d99ae', { metalness: 0.6, roughness: 0.3 }), s * 0.17, -0.05, back - 0.05); add(new THREE.SphereGeometry(0.12, 10, 8), mat('#8d99ae', { metalness: 0.6 }), s * 0.17, 0.24, back - 0.05); const f = add(new THREE.ConeGeometry(0.09, 0.24, 8), mat('#ff8c42', { emissive: '#ff8c42', emissiveIntensity: 0.9 }), s * 0.17, -0.44, back - 0.05, Math.PI); f.name = 'flame'; } break;
    case 'wings': for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.3, 0.1, back + 0.05); for (let i = 0; i < 3; i++) { const f = mesh(new THREE.SphereGeometry(0.22 - i * 0.04, 10, 8), white, s * (0.2 + i * 0.28), -i * 0.1, 0); f.scale.set(1.5, 0.55, 0.3); w.add(f); } w.rotation.z = s * 0.5; w.name = 'wing' + (s > 0 ? 'R' : 'L'); g.add(w); } break;
    case 'batwings': for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.25, 0.1, back + 0.05); const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(s * 0.8, 0.35); shape.lineTo(s * 0.75, -0.05); shape.lineTo(s * 0.55, -0.3); shape.lineTo(s * 0.3, -0.15); shape.lineTo(0, -0.3); shape.closePath(); const m = mesh(new THREE.ShapeGeometry(shape), mat('#5b3fd6', { side: THREE.DoubleSide })); w.add(m); w.rotation.y = s * 0.5; w.name = 'wing' + (s > 0 ? 'R' : 'L'); g.add(w); } break;
    case 'tail': { const t = add(new THREE.ConeGeometry(0.1, 0.6, 8), mb, 0, -0.3, back - 0.15, -1.9); t.name = 'tail'; add(new THREE.SphereGeometry(0.1, 8, 6), ma, 0, -0.05, back - 0.45); break; }
    case 'sash': add(new THREE.TorusGeometry(BR + 0.05, 0.06, 6, 30), gold, 0, 0, 0, Math.PI / 2 + 0.5, 0, 0.6); add(new THREE.SphereGeometry(0.08, 8, 6), mat('#ff4d6d'), 0.35, 0.3, front - 0.1); break;
    case 'balloon': add(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 4), white, -0.6, 0.9, back + 0.1, 0, 0, 0.25); { const b = add(new THREE.SphereGeometry(0.28, 14, 10), mat(acc, { roughness: 0.25 }), -0.8, 1.75, back + 0.1); b.scale.set(1, 1.15, 1); b.name = 'balloon'; } break;
    case 'shield': add(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 20), mat('#8d99ae', { metalness: 0.5 }), -BR - 0.12, 0, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 20), gold, -BR - 0.13, 0, 0, 0, 0, Math.PI / 2); star(g, gold, -BR - 0.17, 0, 0); break;
    case 'guitar': { const b = add(new THREE.SphereGeometry(0.28, 12, 10), mat('#c9184a'), 0.1, -0.15, back - 0.1, 0, 0, 0.6); b.scale.set(0.8, 1.1, 0.35); add(new THREE.BoxGeometry(0.08, 0.9, 0.06), mat('#7a4b2a'), -0.22, 0.3, back - 0.1, 0, 0, 0.6); break; }
  }
  return g;
}
function star(g, m, x, y, z) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.04 : 0.1; if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r); } const me = mesh(new THREE.ShapeGeometry(s), mat('#ff4d6d')); me.position.set(x, y, z); me.rotation.y = -Math.PI / 2; g.add(me); }

// ---------------- the rumbler ----------------
export function buildRumbler(lookIn, opts = {}) {
  const look = normaliseLook(lookIn);
  const base = PALETTE[look.color][1], acc = PALETTE[look.accent][1];
  const [sx, sy, sz] = BODY[look.body];
  const group = new THREE.Group();

  // ball
  const ball = mesh(G('ball', () => new THREE.SphereGeometry(BALL_R, 28, 20)), mat('#ffffff', { map: ballTexture(look.ball, look.ballColor), roughness: 0.35 }));
  ball.receiveShadow = true; group.add(ball);
  if (opts.outlines !== false) outline(ball, 1.04);

  // body group sits on the ball
  const bodyG = new THREE.Group(); bodyG.position.y = BALL_R;
  const bodyY = BR * sy + 0.02;
  const body = mesh(G('body', () => new THREE.SphereGeometry(BR, 28, 20)), mat('#ffffff', { map: bodyTexture(look), roughness: 0.5 }), 0, bodyY, 0);
  body.scale.set(sx, sy, sz); bodyG.add(body);
  if (opts.outlines !== false) outline(body, 1.06);
  if (look.body === 'pear') { const belly = mesh(new THREE.SphereGeometry(BR * 0.9, 20, 14), body.material, 0, bodyY - 0.2, 0); belly.scale.set(1.15, 0.8, 1.15); bodyG.add(belly); }
  // outfit meshes
  const skirt = look.outfit === 'dress' ? mesh(new THREE.ConeGeometry(BR * sx * 1.25, 0.5, 24, 1, true), mat(acc, { side: THREE.DoubleSide }), 0, bodyY - BR * sy * 0.45, 0) : null;
  if (skirt) bodyG.add(skirt);
  if (look.outfit === 'hoodie') { const collar = mesh(new THREE.TorusGeometry(0.36 * sx, 0.07, 8, 20), mat(acc), 0, bodyY + BR * sy - 0.08, 0); collar.rotation.x = Math.PI / 2; bodyG.add(collar); }
  if (look.outfit === 'tux') { for (const s of [-1, 1]) bodyG.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 3), mat('#ff4d6d'), s * 0.09, bodyY + BR * sy - 0.16, BR * sz + 0.02).rotateZ(s * Math.PI / 2)); }
  if (look.outfit === 'sailor') { const c = mesh(new THREE.TorusGeometry(0.34 * sx, 0.05, 6, 20), mat('#4361ee'), 0, bodyY + BR * sy - 0.06, 0); c.rotation.x = Math.PI / 2; bodyG.add(c); }
  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * BR * sx * 0.98, bodyY + BR * sy * 0.2, 0);
    const cap = mesh(G('arm', () => new THREE.CapsuleGeometry(0.09, 0.3, 4, 10)), mat(base), 0, -0.18, 0); a.add(cap);
    const hand = mesh(G('hand', () => new THREE.SphereGeometry(0.11, 10, 8)), mat(base), 0, -0.4, 0); a.add(hand);
    a.rotation.z = s * 0.35; bodyG.add(a); arms.push(a);
  }
  // feet
  for (const s of [-1, 1]) { const f = mesh(G('foot', () => new THREE.SphereGeometry(0.17, 10, 8)), mat(base), s * 0.26 * sx, 0.06, 0.1); f.scale.set(1, 0.55, 1.35); bodyG.add(f); }
  // head
  const headY = bodyY + BR * sy + HR - 0.16;
  const headG = new THREE.Group(); headG.position.y = headY;
  const head = mesh(G('head', () => new THREE.SphereGeometry(HR, 28, 20)), mat(base, { roughness: 0.5 })); headG.add(head);
  if (opts.outlines !== false) outline(head, 1.06);
  const facePatch = mesh(G('face', () => new THREE.SphereGeometry(HR * 1.015, 28, 18, Math.PI / 2 - 1.15, 2.3, 0.5, 1.5)), new THREE.MeshBasicMaterial({ map: faceTexture(look, 'normal'), transparent: true }));
  facePatch.castShadow = false; headG.add(facePatch);
  // cheeks
  for (const s of [-1, 1]) { const c = mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff8fab', transparent: true, opacity: 0.55 }), s * 0.26, -0.1, HR * 0.86); c.castShadow = false; headG.add(c); }
  const hat = buildHat(look.hat, base, acc); headG.add(hat);
  bodyG.add(headG);
  const extra = buildExtra(look.extra, base, acc, sy); extra.position.y = bodyY; bodyG.add(extra);
  group.add(bodyG);

  const faces = {}; for (const s of ['normal', 'blink', 'dash', 'shock', 'happy', 'ouch']) faces[s] = faceTexture(look, s);
  const rig = {
    group, ball, bodyG, body, headG, head, facePatch, hat, extra, arms, look, sy, headY,
    spin: hat.getObjectByName('spin'), halo: hat.getObjectByName('float'), cape: extra.getObjectByName('cape'), wingL: extra.getObjectByName('wingL'), wingR: extra.getObjectByName('wingR'), tail: extra.getObjectByName('tail'), balloon: extra.getObjectByName('balloon'),
    expression: 'normal', _blinkT: 2 + Math.random() * 3,
    setExpression(s) { if (s !== this.expression && faces[s]) { this.expression = s; facePatch.material.map = faces[s]; facePatch.material.needsUpdate = true; } },
    dispose() { group.traverse(o => { if (o.material && o.material !== outlineMat && !o.material.map) o.material.dispose?.(); }); },
  };
  return rig;
}

// Idle and motion animation shared by the game and the wardrobe preview.
export function animateRig(rig, t, dt, o = {}) {
  const speed = o.speed || 0, dashing = !!o.dashing, seed = o.seed || 0, sq = o.squash || 1;
  const [sx, sy, sz] = BODY[rig.look.body];
  const breathe = 1 + Math.sin(t * 2.2 + seed) * 0.02;
  rig.body.scale.set(sx * breathe * sq, sy / sq, sz * breathe * sq);
  rig.bodyG.rotation.x = Math.min(0.45, speed * 0.045) * (dashing ? 1.4 : 1);
  rig.bodyG.position.y = BALL_R + Math.abs(Math.sin(t * 9 + seed)) * Math.min(0.12, speed * 0.02);
  rig.headG.position.y = rig.headY + Math.sin(t * 2.2 + seed) * 0.015;
  rig.headG.rotation.z = Math.sin(t * 1.3 + seed) * 0.04;
  // arms swing with speed, raise when celebrating
  const swing = Math.sin(t * 10 + seed) * Math.min(0.9, speed * 0.12);
  for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; const a = rig.arms[i]; if (o.cheer) { a.rotation.z = s * (2.6 + Math.sin(t * 8 + i) * 0.3); a.rotation.x = 0; } else { a.rotation.z = s * 0.35 + Math.sin(t * 2 + seed) * 0.05; a.rotation.x = swing * (i ? 1 : -1); } }
  if (rig.spin) rig.spin.rotation.y += dt * (6 + speed * 3);
  if (rig.halo) rig.halo.position.y = HR + 0.28 + Math.sin(t * 3) * 0.04;
  if (rig.cape) rig.cape.rotation.x = -0.25 - Math.min(0.9, speed * 0.1) - Math.sin(t * 6) * 0.08;
  if (rig.wingL) { const f = Math.sin(t * 10) * 0.35; rig.wingL.rotation.z = 0.5 + f; rig.wingR.rotation.z = -0.5 - f; }
  if (rig.tail) rig.tail.rotation.y = Math.sin(t * 5) * 0.5;
  if (rig.balloon) rig.balloon.position.x = -0.8 + Math.sin(t * 1.5 + seed) * 0.1;
  const flame = rig.extra.getObjectByName('flame'); if (flame) flame.scale.y = 0.7 + Math.random() * 0.6;
  if (!o.lockFace) {
    rig._blinkT -= dt;
    if (rig._blinkT < 0) { rig.setExpression('blink'); if (rig._blinkT < -0.12) { rig._blinkT = 2 + Math.random() * 4; rig.setExpression('normal'); } }
    else if (rig.expression === 'blink') rig.setExpression('normal');
  }
}
export const HEAD_R = HR;
