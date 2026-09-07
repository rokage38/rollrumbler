import * as THREE from 'three';
import { ARENA_R, BALL_R, DOME_H, PHASE } from './sim.js';
import { buildRumbler, animateRig, lookKey, colourOf, normaliseLook } from './looks.js';

const PLATFORM_TOP = 0;
const CONFETTI = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc84', '#ff5fb8', '#8338ec', '#ffffff'];

function makePlatformTexture() {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const wedges = ['#ff6b8a', '#ffe08a', '#7fd8ff', '#9ef0b8', '#c7a3ff', '#ffb46b'];
  for (let i = 0; i < 12; i++) { g.fillStyle = wedges[i % wedges.length]; g.fillRect(Math.floor(i * W / 12), 0, Math.ceil(W / 12), H); }
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (const v of [0.3, 0.6]) g.fillRect(0, (1 - v) * H - 5, W, 10);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 0.93 * H, W, 0.07 * H);
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, W, 0.06 * H);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}
function makeStripeTexture(c1, c2, n = 24) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const g = cv.getContext('2d'); g.fillStyle = c2; g.fillRect(0, 0, 512, 64); g.fillStyle = c1;
  for (let i = 0; i < n; i++) g.fillRect(i * 512 / n, 0, 512 / n / 2, 64);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; return tx;
}
function makeLabel(text, colour) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80;
  const g = cv.getContext('2d');
  g.font = 'bold 44px Fredoka, Nunito, Arial Rounded MT Bold, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = 'rgba(20,10,40,0.85)'; g.strokeText(text, 128, 42);
  g.fillStyle = colour; g.fillText(text, 128, 42);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false }));
  sp.scale.set(2.6, 0.8, 1);
  return sp;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const phone = (navigator.maxTouchPoints || 0) > 0 && Math.min(window.innerWidth, window.innerHeight) < 900;
    this.quality = phone ? 1 : 2; // 2 = full, 1 = medium, 0 = low
    this.applyQuality();
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#ffd0b8', 130, 260);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.camBase = new THREE.Vector3(0, 24, 20);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(0, 0, 0);

    this.actors = new Map();
    this.particles = [];
    this.clock = 0;
    this.shake = 0;
    this.myId = null;
    this.celebrate = 0;

    this.buildWorld();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildWorld() {
    const s = this.scene;
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#3b2fc8') }, mid: { value: new THREE.Color('#ff9a7a') }, bottom: { value: new THREE.Color('#5aa9ff') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y/300.0, -1.0, 1.0); vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bottom, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }',
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat));
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff1b0' }));
    sunBall.position.set(-120, 40, -220); s.add(sunBall);

    s.add(new THREE.HemisphereLight('#fff3e6', '#c77dff', 0.85));
    const sun = new THREE.DirectionalLight('#fff0d0', 1.7);
    sun.position.set(-18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 5; sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0008;
    s.add(sun);
    const rim = new THREE.DirectionalLight('#ff9ec6', 0.5); rim.position.set(20, 10, -20); s.add(rim);

    // cloud sea far below
    const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ color: '#6fb8ff', roughness: 1 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -36; s.add(sea);
    const puffM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) { const r = 2 + Math.random() * 3; const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), puffM); m.position.set((k - n / 2) * 3 + Math.random(), Math.random() * 1.2, Math.random() * 2); g.add(m); }
      const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 70;
      g.position.set(Math.cos(a) * d, -34 + Math.random() * 6, Math.sin(a) * d);
      g.userData.speed = 0.4 + Math.random() * 0.6; s.add(g); this.clouds.push(g);
    }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.4, 10, 8), puffM); m.position.set((k - 1) * 2.4, Math.random() * 0.6, 0); g.add(m); }
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 30;
      g.position.set(Math.cos(a) * d, 6 + Math.random() * 12, Math.sin(a) * d); g.userData.speed = 0.3 + Math.random() * 0.4; s.add(g); this.clouds.push(g);
    }

    // ---- the stage (tilting) ----
    this.platform = new THREE.Group();
    const N = 24, pts = [];
    for (let i = N - 1; i >= 0; i--) { const r = ARENA_R * i / (N - 1); pts.push(new THREE.Vector2(r, DOME_H * (1 - (r / ARENA_R) ** 2))); }
    const top = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshStandardMaterial({ map: makePlatformTexture(), roughness: 0.8 }));
    top.receiveShadow = true; top.castShadow = true; this.platform.add(top);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R, ARENA_R * 0.92, 2.2, 72, 1, true), new THREE.MeshStandardMaterial({ map: makeStripeTexture('#ff4d6d', '#fff7ee', 36), roughness: 0.7, side: THREE.DoubleSide }));
    side.position.y = -1.1; side.castShadow = true; side.receiveShadow = true; this.platform.add(side);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R * 0.92, 72), new THREE.MeshStandardMaterial({ color: '#c9184a', roughness: 0.9 }));
    bottom.rotation.x = Math.PI / 2; bottom.position.y = -2.2; this.platform.add(bottom);
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.3, 12, 96), new THREE.MeshStandardMaterial({ color: '#ffd23f', metalness: 0.5, roughness: 0.35 }));
    rimT.rotation.x = Math.PI / 2; rimT.position.y = 0.04; rimT.castShadow = true; this.platform.add(rimT);
    this.bulbs = [];
    const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      const m = new THREE.Mesh(bulbGeo, new THREE.MeshStandardMaterial({ color: '#fff8d6', emissive: '#ffe066', emissiveIntensity: 1.2 }));
      m.position.set(Math.cos(a) * ARENA_R, 0.34, Math.sin(a) * ARENA_R); m.userData.i = i; this.platform.add(m); this.bulbs.push(m);
    }
    const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.45 : 1.1; if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshStandardMaterial({ color: '#ff4d6d', roughness: 0.6 }));
    star.rotation.x = -Math.PI / 2; star.position.y = DOME_H + 0.02; this.platform.add(star);
    s.add(this.platform);

    const pivot = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 16), new THREE.MeshStandardMaterial({ color: '#ffd23f', metalness: 0.5, roughness: 0.3 }));
    pivot.position.y = -4.6; s.add(pivot);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.6, 34, 24), new THREE.MeshStandardMaterial({ map: makeStripeTexture('#ff8fab', '#fff7ee', 12), roughness: 0.8 }));
    pillar.position.y = -22; s.add(pillar);

    // ---- carnival dressing ----
    this.flags = [];
    const poleM = new THREE.MeshStandardMaterial({ map: makeStripeTexture('#ff4d6d', '#fff7ee', 8), roughness: 0.7 });
    const P = 8, PR = 16.5;
    const poleTops = [];
    for (let i = 0; i < P; i++) {
      const a = i / P * Math.PI * 2;
      const x = Math.cos(a) * PR, z = Math.sin(a) * PR;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 9, 10), poleM);
      pole.position.set(x, -1.5, z); s.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.6, 16), new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.6 }));
      base.position.set(x, -6.2, z); s.add(base);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshStandardMaterial({ color: CONFETTI[i % CONFETTI.length], roughness: 0.4 }));
      ball.position.set(x, 3.2, z); s.add(ball);
      poleTops.push(new THREE.Vector3(x, 3, z));
    }
    const flagGeo = new THREE.ConeGeometry(0.28, 0.7, 3);
    for (let i = 0; i < P; i++) {
      const a = poleTops[i], b = poleTops[(i + 1) % P];
      const n = 9;
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 1.4;
        const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: CONFETTI[(i + k) % CONFETTI.length], roughness: 0.7, side: THREE.DoubleSide }));
        f.position.copy(p); f.rotation.x = Math.PI; f.userData.phase = i + k; s.add(f); this.flags.push(f);
      }
      const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(a.y - 2.8), b), 12, 0.04, 5), new THREE.MeshStandardMaterial({ color: '#4a2a1a' }));
      s.add(rope);
    }
    this.crowd = [];
    const specGeo = new THREE.SphereGeometry(0.42, 8, 6);
    for (let arc = 0; arc < 4; arc++) {
      const a0 = arc * Math.PI / 2 + Math.PI / 4 - 0.55, a1 = a0 + 1.1;
      for (let row = 0; row < 3; row++) {
        const r = 22 + row * 2.2, y = -3 + row * 1.4;
        const seg = new THREE.Mesh(new THREE.RingGeometry(r - 1, r + 1, 24, 1, a0, a1 - a0), new THREE.MeshStandardMaterial({ color: row % 2 ? '#ff8fab' : '#ffd23f', roughness: 0.8, side: THREE.DoubleSide }));
        seg.rotation.x = -Math.PI / 2; seg.position.y = y - 0.6; s.add(seg);
        const count = 10 + row * 2;
        const inst = new THREE.InstancedMesh(specGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), count);
        const dummy = new THREE.Object3D();
        for (let k = 0; k < count; k++) {
          const a = a0 + (k + 0.5) / count * (a1 - a0);
          dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r); dummy.updateMatrix(); inst.setMatrixAt(k, dummy.matrix);
          inst.setColorAt(k, new THREE.Color(CONFETTI[(k + row + arc) % CONFETTI.length]));
        }
        inst.userData = { a0, a1, r, y, count, seed: arc * 3 + row }; s.add(inst); this.crowd.push(inst);
      }
    }
    this.balloons = [];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshStandardMaterial({ color: CONFETTI[i % CONFETTI.length], roughness: 0.3 }));
      b.scale.set(1, 1.15, 1); g.add(b);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 4), new THREE.MeshStandardMaterial({ color: '#fff' })); str.position.y = -2.1; g.add(str);
      const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 16;
      g.position.set(Math.cos(a) * d, -20 + Math.random() * 20, Math.sin(a) * d); g.userData = { speed: 0.6 + Math.random() * 0.8, sway: Math.random() * 6 };
      s.add(g); this.balloons.push(g);
    }
  }

  applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(this.quality === 2 ? Math.min(dpr, 2) : this.quality === 1 ? Math.min(dpr, 1.5) : 1);
    this.renderer.shadowMap.enabled = this.quality > 0;
    this._frameAvg = 16; this._slowFor = 0;
  }
  // drop quality if the device cannot keep up
  _autoQuality(dt) {
    this._frameAvg = this._frameAvg * 0.95 + dt * 1000 * 0.05;
    if (this._frameAvg > 26) this._slowFor += dt; else this._slowFor = 0;
    if (this._slowFor > 2.5 && this.quality > 0) { this.quality -= 1; this.applyQuality(); this.resize(); }
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camBase.set(0, aspect < 1 ? 25 : 21, aspect < 1 ? 20 : 18);
    const D = this.camBase.length();
    let vFov;
    if (aspect < 1) { const halfW = (ARENA_R + 1.3) / 0.95; vFov = 2 * Math.atan(halfW / D / aspect); }
    else { const halfH = (ARENA_R + 2.5) * 0.8; vFov = 2 * Math.atan(halfH / D); }
    this.camera.fov = THREE.MathUtils.radToDeg(vFov);
    this.camera.updateProjectionMatrix();
  }

  setMyId(id) { this.myId = id; }

  ensureActor(p) {
    const key = lookKey(p.look) + '|' + (p.name || '') + '|' + (p.id === this.myId);
    let a = this.actors.get(p.id);
    if (a) { if (a.key !== key) { this.scene.remove(a.rig.group); this.scene.remove(a.shadow); this.actors.delete(p.id); a = null; } else return a; }
    const rig = buildRumbler(p.look);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 0.95, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; this.scene.add(shadow);
    const label = makeLabel(p.name || 'Rumbler', colourOf(normaliseLook(p.look))); label.position.y = BALL_R + 2.0; rig.group.add(label);
    let marker = null;
    if (p.id === this.myId) {
      marker = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe066', emissiveIntensity: 0.8 }));
      marker.rotation.x = Math.PI; marker.position.y = BALL_R + 2.65; rig.group.add(marker);
    }
    this.scene.add(rig.group);
    a = { rig, shadow, label, marker, key, squash: 0, ouch: 0, lastX: p.x, lastZ: p.z, seed: Math.random() * 10 };
    this.actors.set(p.id, a);
    return a;
  }

  removeMissing(ids) {
    for (const [id, a] of this.actors) if (!ids.has(id)) { this.scene.remove(a.rig.group); this.scene.remove(a.shadow); this.actors.delete(id); }
  }

  spawnBurst(x, y, z, strength, colour = '#ffffff') {
    const n = 6 + Math.floor(strength * 8);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 6, 5), new THREE.MeshBasicMaterial({ color: colour }));
      m.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5 * (0.5 + strength);
      m.userData = { v: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp), life: 0.6, max: 0.6, spin: 0 };
      this.scene.add(m); this.particles.push(m);
    }
    this.shake = Math.max(this.shake, 0.15 + strength * 0.35);
  }
  spawnConfetti(x, y, z, n = 40, spread = 6, up = 9) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ color: CONFETTI[i % CONFETTI.length], side: THREE.DoubleSide }));
      m.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
      const a = Math.random() * Math.PI * 2, sp = Math.random() * spread;
      m.userData = { v: new THREE.Vector3(Math.cos(a) * sp, up * (0.5 + Math.random()), Math.sin(a) * sp), life: 2.2 + Math.random(), max: 3, spin: 4 + Math.random() * 6, confetti: true };
      m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.scene.add(m); this.particles.push(m);
    }
  }

  handleEvents(events, players) {
    for (const e of events) {
      if (e.t === 'bump') {
        const y = PLATFORM_TOP + planeY(this._tilt, e.x, e.z) + BALL_R;
        this.spawnBurst(e.x, y, e.z, e.s, '#fff7b0');
        for (const id of [e.a, e.b]) { const A = this.actors.get(id); if (A) { A.squash = 1; A.ouch = 0.35 + e.s * 0.3; } }
      } else if (e.t === 'fall') {
        const p = players.find(q => q.id === e.id);
        if (p) { const py = PLATFORM_TOP + planeY(this._tilt, p.x, p.z); this.spawnBurst(p.x, py, p.z, 0.4, '#ff6b6b'); this.spawnConfetti(p.x, py + 1, p.z, 24, 4, 6); }
      } else if (e.t === 'dash') {
        const a = this.actors.get(e.id); if (a) a.squash = 0.7;
      } else if (e.t === 'roundEnd') {
        this.celebrate = 3;
        const w = players.find(q => q.id === e.winner);
        if (w) this.spawnConfetti(w.x, 4, w.z, 90, 8, 10);
      }
    }
  }

  render(view, dt) {
    this.clock += dt;
    this._autoQuality(dt);
    this._tilt = view.tilt;
    const ids = new Set();
    const n = new THREE.Vector3(view.tilt.x, 1, view.tilt.z).normalize();
    this.platform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const roundOver = view.phase === PHASE.ROUND_END || view.phase === PHASE.MATCH_END;

    for (const p of view.players) {
      ids.add(p.id);
      const a = this.ensureActor(p);
      const rig = a.rig;
      const plane = PLATFORM_TOP + planeY(view.tilt, p.x, p.z);
      let y = plane + BALL_R;
      const isWinner = roundOver && view.roundWinner === p.id;
      if (!p.alive) {
        const f = Math.max(0, p.fallT);
        y = plane + BALL_R - 0.5 * 28 * f * f;
        rig.group.visible = f < 2.5; a.shadow.visible = false;
      } else {
        rig.group.visible = true; a.shadow.visible = true;
        a.shadow.position.set(p.x, plane + 0.03, p.z);
        a.shadow.quaternion.copy(this.platform.quaternion);
      }
      const mx = p.x - a.lastX, mz = p.z - a.lastZ, md = Math.hypot(mx, mz);
      if (md > 1e-4) rig.ball.rotateOnWorldAxis(new THREE.Vector3(mz, 0, -mx).normalize(), md / BALL_R);
      a.lastX = p.x; a.lastZ = p.z;
      let jump = 0;
      if (isWinner && p.alive) { jump = Math.abs(Math.sin(this.clock * 7)) * 0.9; rig.bodyG.rotation.y += dt * 7; }
      else rig.bodyG.rotation.y = Math.atan2(p.fx, p.fz);
      rig.group.position.set(p.x, y + jump, p.z);
      const sp = Math.hypot(p.vx, p.vz);
      a.squash = Math.max(0, a.squash - dt * 4); a.ouch = Math.max(0, a.ouch - dt);
      const squash = 1 + Math.sin(a.squash * Math.PI) * 0.28;
      let expr = null;
      if (!p.alive) expr = 'shock'; else if (isWinner) expr = 'happy'; else if (a.ouch > 0) expr = 'ouch'; else if (p.dashing) expr = 'dash';
      if (expr) rig.setExpression(expr);
      else if (rig.expression !== 'normal' && rig.expression !== 'blink') rig.setExpression('normal');
      animateRig(rig, this.clock, dt, { speed: sp, dashing: p.dashing, squash, seed: a.seed, lockFace: !!expr });
      if (!p.alive) rig.bodyG.rotation.x = -0.6 - Math.max(0, p.fallT) * 2;
      if (a.marker) { a.marker.position.y = BALL_R + 2.65 + Math.sin(this.clock * 4) * 0.15; a.marker.rotation.y += dt * 2; }
      rig.ball.material.emissive.set(p.dashing ? '#ffe066' : '#000000'); rig.ball.material.emissiveIntensity = p.dashing ? 0.5 : 0;
    }
    this.removeMissing(ids);
    if (view.events && view.events.length) this.handleEvents(view.events, view.players);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const m = this.particles[i], u = m.userData;
      u.life -= dt;
      u.v.y -= (u.confetti ? 6 : 20) * dt;
      if (u.confetti) { u.v.x *= 0.98; u.v.z *= 0.98; m.rotation.x += u.spin * dt; m.rotation.y += u.spin * 0.7 * dt; }
      m.position.addScaledVector(u.v, dt);
      if (!u.confetti) m.scale.setScalar(Math.max(0.01, u.life / u.max));
      if (u.life <= 0 || m.position.y < -40) { this.scene.remove(m); this.particles.splice(i, 1); }
    }
    if (this.celebrate > 0) { this.celebrate -= dt; if (Math.random() < dt * 6) this.spawnConfetti((Math.random() - 0.5) * 16, 14, (Math.random() - 0.5) * 16, 6, 2, 0); }

    const t = this.clock;
    for (const c of this.clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 90) c.position.x = -90; }
    for (const b of this.balloons) { b.position.y += b.userData.speed * dt; b.position.x += Math.sin(t * 0.7 + b.userData.sway) * dt * 0.4; if (b.position.y > 24) b.position.y = -24; }
    for (const f of this.flags) f.rotation.z = Math.sin(t * 3 + f.userData.phase) * 0.25;
    const excite = roundOver ? 1 : 0.35;
    const dummy = new THREE.Object3D();
    for (const inst of this.crowd) {
      const u = inst.userData;
      for (let k = 0; k < u.count; k++) {
        const a = u.a0 + (k + 0.5) / u.count * (u.a1 - u.a0);
        dummy.position.set(Math.cos(a) * u.r, u.y + Math.abs(Math.sin(t * (4 + excite * 4) + k * 1.3 + u.seed)) * 0.5 * excite, Math.sin(a) * u.r);
        dummy.updateMatrix(); inst.setMatrixAt(k, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
    for (const b of this.bulbs) b.material.emissiveIntensity = 0.5 + (Math.floor(t * 6 + b.userData.i) % 3 === 0 ? 1.2 : 0.2);

    this.shake = Math.max(0, this.shake - dt * 1.5);
    const sh = this.shake * this.shake;
    this.camera.position.set(
      this.camBase.x + Math.sin(t * 0.3) * 0.6 + (Math.random() - 0.5) * sh * 1.2,
      this.camBase.y + Math.sin(t * 0.5) * 0.3 + (Math.random() - 0.5) * sh,
      this.camBase.z + (Math.random() - 0.5) * sh * 1.2,
    );
    this.camera.lookAt(0, 0.2, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

function planeY(tilt, x, z) { const r2 = (x * x + z * z) / (ARENA_R * ARENA_R); return -(tilt.x * x + tilt.z * z) + DOME_H * Math.max(0, 1 - r2); }
