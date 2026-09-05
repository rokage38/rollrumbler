import * as THREE from 'three';
import { ARENA_R, BALL_R, DOME_H } from './sim.js';
import { charByKey } from './characters.js';

const PLATFORM_TOP = 0;

function makeBallTexture(c1, c2) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = c2; g.fillRect(0, 0, 256, 128);
  g.fillStyle = c1;
  for (let i = 0; i < 4; i++) g.fillRect(i * 64, 0, 32, 128);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 60, 256, 8);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping;
  return tx;
}

function makePlatformTexture() {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const wedges = ['#ffd6a5', '#caffbf', '#a0c4ff', '#ffc6ff', '#fdffb6', '#9bf6ff', '#ffadad', '#bdb2ff'];
  for (let i = 0; i < 16; i++) { g.fillStyle = wedges[i % wedges.length]; g.fillRect(Math.floor(i * W / 16), 0, Math.ceil(W / 16), H); }
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (const v of [0.28, 0.55, 0.82]) g.fillRect(0, (1 - v) * H - 4, W, 8);
  g.fillStyle = 'rgba(60,40,80,0.35)'; g.fillRect(0, 0, W, 0.045 * H);
  g.fillStyle = '#ff6b6b'; g.fillRect(0, 0.955 * H, W, 0.045 * H);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
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

function buildAccessory(kind, colour, accent) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 });
  const ma = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); me.rotation.x = rx; me.rotation.z = rz; me.castShadow = true; g.add(me); return me; };
  switch (kind) {
    case 'ears': add(new THREE.SphereGeometry(0.22, 12, 10), m, -0.38, 0.5, 0); add(new THREE.SphereGeometry(0.22, 12, 10), m, 0.38, 0.5, 0); break;
    case 'antenna': add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), ma, 0, 0.75, 0); add(new THREE.SphereGeometry(0.12, 10, 8), ma, 0, 1.0, 0); break;
    case 'horns': add(new THREE.ConeGeometry(0.13, 0.4, 8), ma, -0.3, 0.62, 0, 0, 0.5); add(new THREE.ConeGeometry(0.13, 0.4, 8), ma, 0.3, 0.62, 0, 0, -0.5); break;
    case 'leaf': add(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#2fa35b' }), 0.1, 0.72, 0).scale.set(1.6, 0.35, 0.8); break;
    case 'crown': { const c = add(new THREE.CylinderGeometry(0.34, 0.28, 0.25, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#ffd23f', side: THREE.DoubleSide }), 0, 0.7, 0); c.rotation.y = 0.3; break; }
    case 'fin': add(new THREE.ConeGeometry(0.16, 0.5, 4), ma, 0, 0.72, -0.05, 0, 0).rotation.z = 0; break;
    case 'bow': add(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff4d4d' }), -0.16, 0.66, 0); add(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff4d4d' }), 0.16, 0.66, 0); break;
    case 'flower': for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.SphereGeometry(0.1, 8, 6), ma, Math.cos(a) * 0.16, 0.72, Math.sin(a) * 0.16); } add(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffd23f' }), 0, 0.74, 0); break;
  }
  return g;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#bfe6ff', 60, 140);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.camBase = new THREE.Vector3(0, 24, 20);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(0, 0, 0);

    this.actors = new Map();
    this.particles = [];
    this.clock = 0;
    this.shake = 0;
    this.myId = null;

    this.buildWorld();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildWorld() {
    const s = this.scene;
    // sky dome
    const skyGeo = new THREE.SphereGeometry(200, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#5aa9ff') }, bottom: { value: new THREE.Color('#dff4ff') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y/200.0*0.9+0.35, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    });
    s.add(new THREE.Mesh(skyGeo, skyMat));

    // lights
    s.add(new THREE.HemisphereLight('#ffffff', '#7fb1e0', 0.9));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
    sun.position.set(14, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 5; sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0008;
    s.add(sun);

    // sea far below
    const sea = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: '#2f8fd8', roughness: 0.9 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -34; s.add(sea);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(12 + i * 9, 12.6 + i * 9, 64), new THREE.MeshBasicMaterial({ color: '#7fc4f0', transparent: true, opacity: 0.35 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -33.9; s.add(ring);
    }

    // platform (tilting)
    this.platform = new THREE.Group();
    const N = 24, pts = [];
    for (let i = N - 1; i >= 0; i--) { const r = ARENA_R * i / (N - 1); pts.push(new THREE.Vector2(r, DOME_H * (1 - (r / ARENA_R) ** 2))); }
    const top = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshStandardMaterial({ map: makePlatformTexture(), roughness: 0.85 }));
    top.receiveShadow = true; top.castShadow = true;
    this.platform.add(top);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R, ARENA_R * 0.96, 1.3, 72), new THREE.MeshStandardMaterial({ color: '#ff9f6b', roughness: 0.7 }));
    side.position.y = -0.65; side.castShadow = true; side.receiveShadow = true;
    this.platform.add(side);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.28, 12, 72), new THREE.MeshStandardMaterial({ color: '#ff6b6b', roughness: 0.5 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.02; rim.castShadow = true; rim.receiveShadow = true;
    this.platform.add(rim);
    const under = new THREE.Mesh(new THREE.ConeGeometry(ARENA_R * 0.75, 4, 32), new THREE.MeshStandardMaterial({ color: '#b35a3d', roughness: 0.9 }));
    under.rotation.x = Math.PI; under.position.y = -3.2; this.platform.add(under);
    s.add(this.platform);

    // pivot ball + pillar (fixed)
    const pivot = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 16), new THREE.MeshStandardMaterial({ color: '#f4f4f4', metalness: 0.3, roughness: 0.3 }));
    pivot.position.y = -5.8; s.add(pivot);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 28, 24), new THREE.MeshStandardMaterial({ color: '#ffb997', roughness: 0.8 }));
    pillar.position.y = -20; s.add(pillar);

    // clouds
    this.clouds = [];
    const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const r = 1.6 + Math.random() * 1.8;
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cm);
        m.position.set((k - n / 2) * 2.2 + Math.random(), Math.random() * 0.8, Math.random() * 1.2);
        g.add(m);
      }
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 30;
      g.position.set(Math.cos(a) * d, -14 + Math.random() * 18, Math.sin(a) * d);
      g.userData.speed = 0.3 + Math.random() * 0.5;
      s.add(g); this.clouds.push(g);
    }
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
    let a = this.actors.get(p.id);
    if (a) { if (a.charKey !== p.char || a.nameKey !== p.name) { this.scene.remove(a.group); this.scene.remove(a.shadow); this.actors.delete(p.id); a = null; } else return a; }
    const c = charByKey(p.char);
    const group = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 20), new THREE.MeshStandardMaterial({ map: makeBallTexture(c.ball[0], c.ball[1]), roughness: 0.35 }));
    ball.castShadow = true; ball.receiveShadow = true;
    group.add(ball);
    const bodyG = new THREE.Group(); bodyG.position.y = BALL_R + 0.45;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.55 }));
    body.castShadow = true; bodyG.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.7 }));
    belly.position.set(0, -0.1, 0.3); belly.scale.set(1, 1, 0.5); bodyG.add(belly);
    const eyeM = new THREE.MeshStandardMaterial({ color: '#ffffff' }), pupM = new THREE.MeshStandardMaterial({ color: '#1a1a2e' });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), eyeM); e.position.set(sx * 0.2, 0.15, 0.45); bodyG.add(e);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), pupM); pu.position.set(sx * 0.2, 0.15, 0.58); bodyG.add(pu);
    }
    const feetM = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.6 });
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), feetM); f.position.set(sx * 0.28, -0.5, 0.05); f.scale.set(1, 0.6, 1.3); bodyG.add(f); }
    bodyG.add(buildAccessory(c.hat, c.body, c.accent));
    group.add(bodyG);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 0.95, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; this.scene.add(shadow);
    const label = makeLabel(p.name || c.name, c.body); label.position.y = BALL_R + 1.75; group.add(label);
    let marker = null;
    if (p.id === this.myId) {
      marker = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe066', emissiveIntensity: 0.8 }));
      marker.rotation.x = Math.PI; marker.position.y = BALL_R + 2.4; group.add(marker);
    }
    this.scene.add(group);
    a = { group, ball, bodyG, body, shadow, label, marker, charKey: p.char, nameKey: p.name, squash: 0, lastX: p.x, lastZ: p.z };
    this.actors.set(p.id, a);
    return a;
  }

  removeMissing(ids) {
    for (const [id, a] of this.actors) if (!ids.has(id)) { this.scene.remove(a.group); this.scene.remove(a.shadow); this.actors.delete(id); }
  }

  spawnBurst(x, y, z, strength, colour = '#ffffff') {
    const n = 6 + Math.floor(strength * 8);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 6, 5), new THREE.MeshBasicMaterial({ color: colour }));
      m.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5 * (0.5 + strength);
      m.userData.v = new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp);
      m.userData.life = 0.6;
      this.scene.add(m); this.particles.push(m);
    }
    this.shake = Math.max(this.shake, 0.15 + strength * 0.35);
  }

  handleEvents(events, players) {
    for (const e of events) {
      if (e.t === 'bump') {
        const y = PLATFORM_TOP + planeY(this._tilt, e.x, e.z) + BALL_R;
        this.spawnBurst(e.x, y, e.z, e.s, '#fff7b0');
        const A = this.actors.get(e.a), B = this.actors.get(e.b);
        if (A) A.squash = 1; if (B) B.squash = 1;
      } else if (e.t === 'fall') {
        const p = players.find(q => q.id === e.id);
        if (p) this.spawnBurst(p.x, PLATFORM_TOP + planeY(this._tilt, p.x, p.z), p.z, 0.4, '#ff6b6b');
      } else if (e.t === 'dash') {
        const a = this.actors.get(e.id);
        if (a) a.squash = 0.7;
      }
    }
  }

  // view: { tilt:{x,z}, players:[{id,name,char,x,z,vx,vz,alive,fallT,dashing,fx,fz}], events:[] }
  render(view, dt) {
    this.clock += dt;
    this._tilt = view.tilt;
    const ids = new Set();
    // platform orientation
    const n = new THREE.Vector3(view.tilt.x, 1, view.tilt.z).normalize();
    this.platform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);

    for (const p of view.players) {
      ids.add(p.id);
      const a = this.ensureActor(p);
      const plane = PLATFORM_TOP + planeY(view.tilt, p.x, p.z);
      let y = plane + BALL_R;
      if (!p.alive) {
        const f = Math.max(0, p.fallT);
        y = plane + BALL_R - 0.5 * 28 * f * f;
        a.group.visible = f < 2.5;
        a.shadow.visible = false;
      } else {
        a.group.visible = true; a.shadow.visible = true;
        a.shadow.position.set(p.x, plane + 0.03, p.z);
        a.shadow.quaternion.copy(this.platform.quaternion);
      }
      // ball roll
      const mx = p.x - a.lastX, mz = p.z - a.lastZ;
      const md = Math.hypot(mx, mz);
      if (md > 1e-4) {
        const axis = new THREE.Vector3(mz, 0, -mx).normalize();
        a.ball.rotateOnWorldAxis(axis, md / BALL_R);
      }
      a.lastX = p.x; a.lastZ = p.z;
      a.group.position.set(p.x, y, p.z);
      // body lean + facing + squash
      const sp = Math.hypot(p.vx, p.vz);
      a.bodyG.rotation.y = Math.atan2(p.fx, p.fz);
      a.bodyG.rotation.x = Math.min(0.45, sp * 0.045) * (p.dashing ? 1.4 : 1);
      a.squash = Math.max(0, a.squash - dt * 4);
      const sq = 1 + Math.sin(a.squash * Math.PI) * 0.28;
      a.body.scale.set(sq, 1 / sq, sq);
      a.bodyG.position.y = BALL_R + 0.45 + Math.abs(Math.sin(this.clock * 9 + p.x)) * Math.min(0.12, sp * 0.02);
      if (a.marker) { a.marker.position.y = BALL_R + 2.4 + Math.sin(this.clock * 4) * 0.15; a.marker.rotation.y += dt * 2; }
      if (p.dashing) a.ball.material.emissive = new THREE.Color('#ffe066'), a.ball.material.emissiveIntensity = 0.5;
      else a.ball.material.emissiveIntensity = 0;
    }
    this.removeMissing(ids);
    if (view.events && view.events.length) this.handleEvents(view.events, view.players);

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const m = this.particles[i];
      m.userData.life -= dt;
      m.userData.v.y -= 20 * dt;
      m.position.addScaledVector(m.userData.v, dt);
      m.scale.setScalar(Math.max(0.01, m.userData.life / 0.6));
      if (m.userData.life <= 0) { this.scene.remove(m); this.particles.splice(i, 1); }
    }
    // clouds drift
    for (const c of this.clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 70) c.position.x = -70; }

    // camera sway + shake
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const sh = this.shake * this.shake;
    this.camera.position.set(
      this.camBase.x + Math.sin(this.clock * 0.3) * 0.6 + (Math.random() - 0.5) * sh * 1.2,
      this.camBase.y + Math.sin(this.clock * 0.5) * 0.3 + (Math.random() - 0.5) * sh,
      this.camBase.z + (Math.random() - 0.5) * sh * 1.2,
    );
    this.camera.lookAt(0, 0.2, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

function planeY(tilt, x, z) { const r2 = (x * x + z * z) / (ARENA_R * ARENA_R); return -(tilt.x * x + tilt.z * z) + DOME_H * Math.max(0, 1 - r2); }
