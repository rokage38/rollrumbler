// The place: a floating circus island in a sunset sky, with the tilting drum stage at its heart.
import * as THREE from 'three';
import { ARENA_R, DOME_H, planeY } from '../core/sim.js';
import { canvasTex } from '../looks/textures.js';

export const CONFETTI = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc84', '#ff5fb8', '#8338ec', '#ffffff'];

function stripeTex(c1, c2, n = 24) {
  return canvasTex(`stripe:${c1}${c2}${n}`, 512, 64, (g, W, H) => { g.fillStyle = c2; g.fillRect(0, 0, W, H); g.fillStyle = c1; for (let i = 0; i < n; i++) g.fillRect(i * W / n, 0, W / n / 2, H); });
}
function stageTopTex() {
  return canvasTex('stagetop', 1024, 512, (g, W, H) => {
    const wedges = ['#ff6b8a', '#ffe08a', '#7fd8ff', '#9ef0b8', '#c7a3ff', '#ffb46b'];
    for (let i = 0; i < 12; i++) { g.fillStyle = wedges[i % wedges.length]; g.fillRect(Math.floor(i * W / 12), 0, Math.ceil(W / 12), H); }
    g.fillStyle = 'rgba(255,255,255,0.55)'; for (const v of [0.3, 0.6]) g.fillRect(0, (1 - v) * H - 5, W, 10);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 0.93 * H, W, 0.07 * H);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, W, 0.06 * H);
  });
}
const std = (o) => new THREE.MeshStandardMaterial(o);

export class World {
  constructor(scene) {
    this.scene = scene;
    this.clouds = []; this.flags = []; this.balloons = []; this.crowd = []; this.bulbs = []; this.lights = [];
    this.build();
  }
  build() {
    const s = this.scene;
    // sky
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#3b2fc8') }, mid: { value: new THREE.Color('#ff9a7a') }, bottom: { value: new THREE.Color('#5aa9ff') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y/300.0, -1.0, 1.0); vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bottom, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }',
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat));
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff1b0' })); sunBall.position.set(-120, 40, -220); s.add(sunBall);

    // lights
    s.add(new THREE.HemisphereLight('#fff3e6', '#c77dff', 0.8));
    const sun = new THREE.DirectionalLight('#fff0d0', 1.6); sun.position.set(-18, 30, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 80 }); sun.shadow.bias = -0.0008;
    s.add(sun); this.sun = sun;
    const rim = new THREE.DirectionalLight('#ff9ec6', 0.5); rim.position.set(20, 10, -20); s.add(rim);
    const fill = new THREE.DirectionalLight('#9ad0ff', 0.35); fill.position.set(10, 6, 24); s.add(fill);

    // cloud sea + clouds
    const sea = new THREE.Mesh(new THREE.CircleGeometry(240, 48), std({ color: '#6fb8ff', roughness: 1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -40; s.add(sea);
    const puffM = std({ color: '#ffffff', roughness: 1 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    const addCloud = (x, y, z, scale, speed) => { const g = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) { const m = new THREE.Mesh(puffGeo, puffM); const r = (0.7 + Math.random()) * scale; m.scale.setScalar(r); m.position.set((k - n / 2) * scale * 1.1 + Math.random(), Math.random() * 0.4 * scale, Math.random() * 0.6 * scale); g.add(m); } g.position.set(x, y, z); g.userData.speed = speed; s.add(g); this.clouds.push(g); };
    for (let i = 0; i < 22; i++) { const a = Math.random() * 6.283, d = 30 + Math.random() * 80; addCloud(Math.cos(a) * d, -38 + Math.random() * 6, Math.sin(a) * d, 2.5 + Math.random() * 2, 0.4 + Math.random() * 0.6); }
    for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, d = 40 + Math.random() * 40; addCloud(Math.cos(a) * d, 8 + Math.random() * 14, Math.sin(a) * d, 1.6, 0.3 + Math.random() * 0.4); }

    // ---- the island ----
    const island = new THREE.Group(); s.add(island); this.island = island;
    const IR = 27; // island radius
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(IR, IR - 1.5, 1.2, 64), std({ map: stripeTex('#ffd6e8', '#fff3f7', 48), roughness: 0.9 }));
    deck.position.y = -4.6; deck.receiveShadow = true; island.add(deck);
    const deckRim = new THREE.Mesh(new THREE.TorusGeometry(IR, 0.35, 10, 80), std({ color: '#ff4d6d', roughness: 0.6 })); deckRim.rotation.x = Math.PI / 2; deckRim.position.y = -4; island.add(deckRim);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(IR - 2, 26, 14, 4), std({ color: '#6b4a8a', roughness: 1, flatShading: true }));
    rock.rotation.x = Math.PI; rock.position.y = -18.2; island.add(rock);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; const root = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 8 + Math.random() * 6, 6), std({ color: '#5a3c78', roughness: 1, flatShading: true })); root.rotation.x = Math.PI; root.position.set(Math.cos(a) * (IR - 4), -12 - Math.random() * 6, Math.sin(a) * (IR - 4)); island.add(root); }
    // a pool of water around the stage: knocked-off rumblers splash into it
    const poolTex = canvasTex('pool', 512, 512, (g, W, H) => { g.fillStyle = '#4cc9f0'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 6; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(W / 2, H / 2, 20 + i * 18, 0, 6.29); g.stroke(); } });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 6.5, 64), std({ map: poolTex, roughness: 0.15, metalness: 0.1 })); pool.rotation.x = -Math.PI / 2; pool.position.y = -3.92; pool.receiveShadow = true; island.add(pool); this.pool = pool;
    const poolRim = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R + 6.5, 0.45, 10, 80), std({ color: '#ffd23f', roughness: 0.5 })); poolRim.rotation.x = Math.PI / 2; poolRim.position.y = -3.85; island.add(poolRim);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const duck = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), std({ color: i % 3 ? '#ffd23f' : '#ff5fb8', roughness: 0.4 })); duck.position.set(Math.cos(a) * (ARENA_R + 4.2), -3.6, Math.sin(a) * (ARENA_R + 4.2)); duck.userData.a = a; island.add(duck); this.bobbers = this.bobbers || []; this.bobbers.push(duck); }

    // ---- the stage (tilting) ----
    const platform = new THREE.Group(); this.platform = platform;
    const N = 24, pts = []; for (let i = N - 1; i >= 0; i--) { const r = ARENA_R * i / (N - 1); pts.push(new THREE.Vector2(r, DOME_H * (1 - (r / ARENA_R) ** 2))); }
    const top = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), std({ map: stageTopTex(), roughness: 0.8 })); top.receiveShadow = true; top.castShadow = true; platform.add(top);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R, ARENA_R * 0.92, 2.2, 72, 1, true), std({ map: stripeTex('#ff4d6d', '#fff7ee', 36), roughness: 0.7, side: THREE.DoubleSide })); side.position.y = -1.1; side.castShadow = true; platform.add(side);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R * 0.92, 72), std({ color: '#c9184a', roughness: 0.9 })); bottom.rotation.x = Math.PI / 2; bottom.position.y = -2.2; platform.add(bottom);
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.3, 12, 96), std({ color: '#ffd23f', metalness: 0.5, roughness: 0.35 })); rimT.rotation.x = Math.PI / 2; rimT.position.y = 0.04; rimT.castShadow = true; platform.add(rimT);
    const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; const m = new THREE.Mesh(bulbGeo, std({ color: '#fff8d6', emissive: '#ffe066', emissiveIntensity: 1.2 })); m.position.set(Math.cos(a) * ARENA_R, 0.34, Math.sin(a) * ARENA_R); m.userData.i = i; platform.add(m); this.bulbs.push(m); }
    const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.45 : 1.1; if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), std({ color: '#ff4d6d', roughness: 0.6 })); star.rotation.x = -Math.PI / 2; star.position.y = DOME_H + 0.02; platform.add(star);
    s.add(platform);
    const pivot = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 16), std({ color: '#ffd23f', metalness: 0.5, roughness: 0.3 })); pivot.position.y = -4.6; s.add(pivot);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.6, 30, 24), std({ map: stripeTex('#ff8fab', '#fff7ee', 12), roughness: 0.8 })); pillar.position.y = -20; s.add(pillar);

    // ---- bleachers around the pit, in four arcs ----
    const specGeo = new THREE.SphereGeometry(0.42, 8, 6);
    for (let arc = 0; arc < 4; arc++) {
      const a0 = arc * Math.PI / 2 + Math.PI / 4 - 0.6, a1 = a0 + 1.2;
      for (let row = 0; row < 3; row++) {
        const r = ARENA_R + 7.5 + row * 2, y = -3.4 + row * 1.1;
        const seg = new THREE.Mesh(new THREE.RingGeometry(r - 1, r + 1, 24, 1, a0, a1 - a0), std({ color: row % 2 ? '#ff8fab' : '#ffd23f', roughness: 0.8, side: THREE.DoubleSide }));
        seg.rotation.x = -Math.PI / 2; seg.position.y = y - 0.55; island.add(seg);
        const riser = new THREE.Mesh(new THREE.CylinderGeometry(r + 1, r + 1, 1.1, 32, 1, true, a0 - Math.PI / 2, a1 - a0), std({ color: '#c9184a', side: THREE.DoubleSide })); riser.position.y = y - 1.1; island.add(riser);
        const count = 10 + row * 2;
        const inst = new THREE.InstancedMesh(specGeo, std({ roughness: 0.7 }), count);
        const dummy = new THREE.Object3D();
        for (let k = 0; k < count; k++) { const a = a0 + (k + 0.5) / count * (a1 - a0); dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r); dummy.updateMatrix(); inst.setMatrixAt(k, dummy.matrix); inst.setColorAt(k, new THREE.Color(CONFETTI[(k + row + arc) % CONFETTI.length])); }
        inst.userData = { a0, a1, r, y, count, seed: arc * 3 + row }; island.add(inst); this.crowd.push(inst);
      }
    }
    // ---- tents between the arcs, lamp posts with string lights ----
    const tentM = (c) => std({ map: stripeTex(c, '#fff7ee', 16), roughness: 0.8 });
    const postTops = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const x = Math.cos(a) * 21, z = Math.sin(a) * 21;
      const tent = new THREE.Group(); tent.position.set(x, -4, z); tent.rotation.y = -a + Math.PI;
      const c = CONFETTI[i % 4];
      tent.add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 2.6, 16), std({ map: stripeTex(c, '#fff7ee', 12), roughness: 0.8 })).translateY(1.3));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 2.8, 16), tentM(c)); roof.position.y = 4; tent.add(roof);
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), std({ color: '#4a2a1a' })); flagPole.position.y = 5.9; tent.add(flagPole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), std({ color: '#ffd23f', side: THREE.DoubleSide })); flag.position.set(0.4, 6.2, 0); tent.add(flag); this.flags.push(flag);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), std({ color: '#2b1b4d' })); door.position.set(0, 0.9, 3.42); tent.add(door);
      island.add(tent);
      // lamp posts flanking the tents
      for (const s of [-1, 1]) {
        const pa = a + s * 0.55; const px = Math.cos(pa) * 24, pz = Math.sin(pa) * 24;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), std({ color: '#2b1b4d' })); post.position.set(px, -1, pz); island.add(post);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), std({ color: '#fff1b0', emissive: '#ffd23f', emissiveIntensity: 1.5 })); lamp.position.set(px, 2.2, pz); island.add(lamp);
        postTops.push(new THREE.Vector3(px, 2.2, pz));
      }
    }
    postTops.sort((p, q) => Math.atan2(p.z, p.x) - Math.atan2(q.z, q.x));
    const lightGeo = new THREE.SphereGeometry(0.12, 6, 5);
    const lightM = std({ color: '#fff', emissive: '#ffe9a0', emissiveIntensity: 1.6 });
    for (let i = 0; i < postTops.length; i++) {
      const a = postTops[i], b = postTops[(i + 1) % postTops.length];
      const mid = a.clone().lerp(b, 0.5); mid.y -= 2.2;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      island.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.03, 4), std({ color: '#4a2a1a' })));
      const n = 12; const inst = new THREE.InstancedMesh(lightGeo, lightM, n); const d = new THREE.Object3D();
      for (let k = 0; k < n; k++) { d.position.copy(curve.getPoint((k + 0.5) / n)); d.position.y -= 0.15; d.updateMatrix(); inst.setMatrixAt(k, d.matrix); }
      island.add(inst); this.lights.push(inst);
    }
    // ---- ferris wheel far behind ----
    const wheel = new THREE.Group(); wheel.position.set(-16, 2, -52); this.wheel = wheel;
    const spokesM = std({ color: '#ff4d6d' });
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(10, 0.25, 8, 40), spokesM));
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 20, 0.2), spokesM); sp.rotation.z = i * Math.PI / 8; wheel.add(sp); const a = i / 8 * 6.283; for (const t of [0, Math.PI]) { const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.0), std({ color: CONFETTI[i % 7], roughness: 0.6 })); cab.position.set(Math.cos(a + t) * 10, Math.sin(a + t) * 10, 0); cab.name = 'cab'; wheel.add(cab); } }
    s.add(wheel);
    for (const s2 of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, 0.5), std({ color: '#ffd23f' })); leg.position.set(-16 + s2 * 3, -6, -52); leg.rotation.z = s2 * 0.35; s.add(leg); }
    // hot air balloons far away
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), std({ map: stripeTex(CONFETTI[i % 7], '#fff7ee', 10), roughness: 0.5 })); b.scale.set(1, 1.2, 1); g.add(b);
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), std({ color: '#a9743a' })); basket.position.y = -3.4; g.add(basket);
      const a = i / 6 * 6.283 + 0.4, d = 55 + Math.random() * 25; g.position.set(Math.cos(a) * d, -6 + Math.random() * 22, Math.sin(a) * d); g.userData = { speed: 0.2 + Math.random() * 0.3, sway: Math.random() * 6, base: g.position.y };
      s.add(g); this.balloons.push(g);
    }
  }
  update(t, dt, excite) {
    for (const c of this.clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 110) c.position.x = -110; }
    for (const b of this.balloons) { b.position.y = b.userData.base + Math.sin(t * 0.3 + b.userData.sway) * 1.5; b.rotation.y = t * 0.1; }
    for (const f of this.flags) f.rotation.y = Math.sin(t * 3 + f.position.x) * 0.35;
    if (this.wheel) this.wheel.rotation.z = t * 0.12;
    if (this.bobbers) for (const b of this.bobbers) { b.position.y = -3.6 + Math.sin(t * 1.6 + b.userData.a * 3) * 0.12; b.rotation.y = t * 0.3; }
    if (this.pool) this.pool.rotation.z = t * 0.03;
    if (this.wheel) for (const c of this.wheel.children) if (c.name === 'cab') c.rotation.z = -this.wheel.rotation.z;
    const dummy = new THREE.Object3D();
    for (const inst of this.crowd) {
      const u = inst.userData;
      for (let k = 0; k < u.count; k++) { const a = u.a0 + (k + 0.5) / u.count * (u.a1 - u.a0); dummy.position.set(Math.cos(a) * u.r, u.y + Math.abs(Math.sin(t * (4 + excite * 4) + k * 1.3 + u.seed)) * 0.5 * excite, Math.sin(a) * u.r); dummy.updateMatrix(); inst.setMatrixAt(k, dummy.matrix); }
      inst.instanceMatrix.needsUpdate = true;
    }
    for (const b of this.bulbs) b.material.emissiveIntensity = 0.5 + (Math.floor(t * 6 + b.userData.i) % 3 === 0 ? 1.2 : 0.2);
  }
  setTilt(tilt) { this.platform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(tilt.x, 1, tilt.z).normalize()); }
}
export { planeY };
