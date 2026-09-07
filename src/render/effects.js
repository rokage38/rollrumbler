// Bursts, confetti and camera shake.
import * as THREE from 'three';
import { CONFETTI } from './world.js';

export class Effects {
  constructor(scene) { this.scene = scene; this.particles = []; this.shake = 0; this.celebrate = 0; }
  burst(x, y, z, strength, colour = '#ffffff') {
    const n = 6 + Math.floor(strength * 8);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 6, 5), new THREE.MeshBasicMaterial({ color: colour }));
      m.position.set(x, y, z);
      const a = Math.random() * 6.283, sp = 3 + Math.random() * 5 * (0.5 + strength);
      m.userData = { v: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp), life: 0.6, max: 0.6 };
      this.scene.add(m); this.particles.push(m);
    }
    this.shake = Math.max(this.shake, 0.15 + strength * 0.35);
  }
  confetti(x, y, z, n = 40, spread = 6, up = 9) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ color: CONFETTI[i % CONFETTI.length], side: THREE.DoubleSide }));
      m.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
      const a = Math.random() * 6.283, sp = Math.random() * spread;
      m.userData = { v: new THREE.Vector3(Math.cos(a) * sp, up * (0.5 + Math.random()), Math.sin(a) * sp), life: 2.2 + Math.random(), max: 3, spin: 4 + Math.random() * 6, confetti: true };
      m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.scene.add(m); this.particles.push(m);
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const m = this.particles[i], u = m.userData;
      u.life -= dt; u.v.y -= (u.confetti ? 6 : 20) * dt;
      if (u.confetti) { u.v.x *= 0.98; u.v.z *= 0.98; m.rotation.x += u.spin * dt; m.rotation.y += u.spin * 0.7 * dt; }
      m.position.addScaledVector(u.v, dt);
      if (!u.confetti) m.scale.setScalar(Math.max(0.01, u.life / u.max));
      if (u.life <= 0 || m.position.y < -40) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); this.particles.splice(i, 1); }
    }
    if (this.celebrate > 0) { this.celebrate -= dt; if (Math.random() < dt * 6) this.confetti((Math.random() - 0.5) * 16, 14, (Math.random() - 0.5) * 16, 6, 2, 0); }
    this.shake = Math.max(0, this.shake - Math.max(0, dt) * 1.5);
  }
}
