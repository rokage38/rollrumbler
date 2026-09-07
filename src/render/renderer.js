// Orchestrates the scene: quality, camera, environment lighting, world, actors and effects.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ARENA_R, PHASE } from '../core/sim.js';
import { World } from './world.js';
import { Actors } from './actors.js';
import { Effects } from './effects.js';
import { setMaterialQuality } from '../looks/builder.js';

export function isPhone() { return (navigator.maxTouchPoints || 0) > 0 && Math.min(window.innerWidth, window.innerHeight) < 900; }

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#ffd0b8', 130, 260);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.55; pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.camBase = new THREE.Vector3(0, 24, 20);
    this.mode = 'menu'; this.menuAngle = 0;
    this.quality = opts.quality ?? (isPhone() ? 1 : 2);
    this.applyQuality();
    this.world = new World(this.scene);
    this.fx = new Effects(this.scene);
    this.actors = new Actors(this.scene, this.fx);
    this.clock = 0; this._frameAvg = 16; this._slowFor = 0; this.auto = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  setQuality(q, auto = false) { this.quality = q; this.auto = auto; this.applyQuality(); this.resize(); }
  applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(this.quality === 2 ? Math.min(dpr, 2) : this.quality === 1 ? Math.min(dpr, 1.5) : 1);
    this.renderer.shadowMap.enabled = this.quality > 0;
    setMaterialQuality(this.quality === 2);
    this._frameAvg = 16; this._slowFor = 0;
  }
  _autoQuality(dt) {
    if (!this.auto) return;
    this._frameAvg = this._frameAvg * 0.95 + dt * 1000 * 0.05;
    if (this._frameAvg > 26) this._slowFor += dt; else this._slowFor = 0;
    if (this._slowFor > 2.5 && this.quality > 0) { this.quality -= 1; this.applyQuality(); this.resize(); }
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h; this.camera.aspect = aspect;
    this.camBase.set(0, aspect < 1 ? 24 : 20, aspect < 1 ? 21 : 19);
    const D = this.camBase.length();
    let vFov;
    if (aspect < 1) { const halfW = (ARENA_R + 0.8) / 0.97; vFov = 2 * Math.atan(halfW / D / aspect); }
    else { const halfH = (ARENA_R + 2.5) * 0.8; vFov = 2 * Math.atan(halfH / D); }
    this.gameFov = THREE.MathUtils.radToDeg(vFov);
    this.camera.fov = this.mode === 'menu' ? 48 : this.gameFov;
    this.camera.updateProjectionMatrix();
  }
  setMode(mode) { if (this.mode !== mode) { this.mode = mode; this.resize(); } }
  setMyId(id) { this.actors.setMyId(id); }
  clearActors() { this.actors.clear(); }

  render(view, dt) {
    this.clock += dt; const t = this.clock;
    this._autoQuality(dt);
    this.world.setTilt(view.tilt);
    const roundOver = view.phase === PHASE.ROUND_END || view.phase === PHASE.MATCH_END;
    this.world.update(t, dt, roundOver ? 1 : this.mode === 'menu' ? 0.5 : 0.35);
    this.actors.update(view, dt);
    this.fx.update(dt);
    const sh = this.fx.shake * this.fx.shake;
    if (this.mode === 'menu') {
      // slow orbit of the island for the title screen
      this.menuAngle += dt * 0.08;
      const r = 46, a = this.menuAngle;
      this.camera.position.set(Math.cos(a) * r, 15 + Math.sin(t * 0.3) * 0.8, Math.sin(a) * r);
      this.camera.lookAt(0, -1, 0);
    } else {
      this.camera.position.set(this.camBase.x + Math.sin(t * 0.3) * 0.6 + (Math.random() - 0.5) * sh * 1.2, this.camBase.y + Math.sin(t * 0.5) * 0.3 + (Math.random() - 0.5) * sh, this.camBase.z + (Math.random() - 0.5) * sh * 1.2);
      this.camera.lookAt(0, 0.2, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
