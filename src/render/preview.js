// Wardrobe viewport: one rumbler on a turntable, plus thumbnails for lists.
import * as THREE from 'three';
import { buildRumbler, animateRig } from '../looks/builder.js';
import { BALL_R } from '../core/sim.js';

export class Preview {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    this.camera.position.set(0, 3.4, 10.6); this.camera.lookAt(0, 2.05, 0);
    this.scene.add(new THREE.HemisphereLight('#fff3e6', '#c77dff', 1.2));
    const key2 = new THREE.DirectionalLight('#ffffff', 0.6); key2.position.set(3, 4, 6); this.scene.add(key2);
    const sun = new THREE.DirectionalLight('#fff0d0', 1.5); sun.position.set(-3, 6, 4); this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#ff9ec6', 0.7); rim.position.set(4, 2, -4); this.scene.add(rim);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.25, 40), new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.6 })); disc.position.y = -0.12; this.scene.add(disc);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; this.scene.add(shadow);
    this.rig = null; this.spin = 0; this.clock = 0; this.running = false; this.dragging = false; this.dragVel = 0; this.pop = 0;
    this._bindDrag(); this.resize();
  }
  _bindDrag() {
    let lastX = 0;
    const down = (x) => { this.dragging = true; lastX = x; this.dragVel = 0; };
    const move = (x) => { if (!this.dragging) return; const dx = x - lastX; lastX = x; this.spin += dx * 0.012; this.dragVel = dx * 0.012; };
    const up = () => { this.dragging = false; };
    this.canvas.addEventListener('touchstart', e => down(e.touches[0].clientX), { passive: true });
    this.canvas.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
    this.canvas.addEventListener('touchend', up);
    this.canvas.addEventListener('mousedown', e => down(e.clientX));
    window.addEventListener('mousemove', e => move(e.clientX));
    window.addEventListener('mouseup', up);
  }
  resize() { const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 300; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  setLook(look) { if (this.rig) { this.scene.remove(this.rig.group); this.rig.dispose(); } this.rig = buildRumbler(look); this.rig.group.position.y = BALL_R; this.scene.add(this.rig.group); this.pop = 1; }
  start() { if (this.running) return; this.running = true; this._last = performance.now(); const loop = (now) => { if (!this.running) return; requestAnimationFrame(loop); this.frame(now); }; requestAnimationFrame(loop); }
  stop() { this.running = false; }
  frame(now) {
    const dt = Math.max(0, Math.min(0.1, (now - this._last) / 1000)); this._last = now; this.clock += dt;
    if (!this.rig) return;
    if (!this.dragging) { this.spin += dt * 0.5 + this.dragVel; this.dragVel *= 0.92; }
    this.rig.group.rotation.y = this.spin;
    this.pop = Math.max(0, this.pop - dt * 3);
    animateRig(this.rig, this.clock, dt, { speed: 0, squash: 1 + Math.sin(this.pop * Math.PI) * 0.2, cheer: this.cheer });
    if (this.canvas.clientWidth !== this._w || this.canvas.clientHeight !== this._h) { this._w = this.canvas.clientWidth; this._h = this.canvas.clientHeight; this.resize(); }
    this.renderer.render(this.scene, this.camera);
  }
  thumb(look, size = 112) {
    const prev = this.rig;
    const rig = buildRumbler(look, { outlines: true }); rig.group.position.y = BALL_R; rig.group.rotation.y = 0.35;
    if (prev) prev.group.visible = false;
    this.scene.add(rig.group);
    this.renderer.setSize(size, size, false); this.camera.aspect = 1; this.camera.position.set(0, 3.0, 8.6); this.camera.lookAt(0, 2.0, 0); this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.camera.position.set(0, 3.4, 10.6); this.camera.lookAt(0, 2.05, 0);
    this.scene.remove(rig.group); rig.dispose(); if (prev) prev.group.visible = true;
    this.resize(); return url;
  }
}
