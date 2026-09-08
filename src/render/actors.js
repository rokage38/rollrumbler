// Keeps one animated rumbler per player in sync with the view state.
import * as THREE from 'three';
import { BALL_R, PHASE } from '../core/sim.js';
import { buildRumbler, animateRig } from '../looks/builder.js';
import { lookKey, colourOf } from '../looks/catalog.js';
import { canvasTex } from '../looks/textures.js';
import { planeY } from './world.js';

function label(text, colour) {
  const tx = canvasTex('label:' + text + colour, 256, 80, (g) => {
    g.font = 'bold 44px Fredoka, Nunito, Arial Rounded MT Bold, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(20,10,40,0.85)'; g.strokeText(text, 128, 42); g.fillStyle = colour; g.fillText(text, 128, 42);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.scale.set(2.6, 0.8, 1); return sp;
}

export class Actors {
  constructor(scene, effects) { this.scene = scene; this.fx = effects; this.actors = new Map(); this.myId = null; this.clock = 0; }
  setMyId(id) { this.myId = id; }
  ensure(p) {
    const key = lookKey(p.look) + '|' + (p.name || '') + '|' + (p.id === this.myId);
    let a = this.actors.get(p.id);
    if (a) { if (a.key === key) return a; this.remove(p.id); }
    const rig = buildRumbler(p.look);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 0.95, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; this.scene.add(shadow);
    const lab = label(p.name || 'Rumbler', colourOf(p.look)); lab.position.y = BALL_R + 2.45; rig.group.add(lab);
    let marker = null;
    if (p.id === this.myId) { marker = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe066', emissiveIntensity: 0.8 })); marker.rotation.x = Math.PI; marker.position.y = BALL_R + 3.1; rig.group.add(marker); }
    this.scene.add(rig.group);
    a = { rig, shadow, marker, key, squash: 0, ouch: 0, lastX: p.x, lastZ: p.z, seed: Math.random() * 10 };
    this.actors.set(p.id, a); return a;
  }
  remove(id) { const a = this.actors.get(id); if (!a) return; this.scene.remove(a.rig.group); this.scene.remove(a.shadow); a.rig.dispose(); this.actors.delete(id); }
  clear() { for (const id of [...this.actors.keys()]) this.remove(id); }
  onEvents(events, players, tilt) {
    for (const e of events) {
      if (e.t === 'bump') { this.fx.burst(e.x, planeY(tilt, e.x, e.z) + BALL_R, e.z, e.s, '#fff7b0'); for (const id of [e.a, e.b]) { const A = this.actors.get(id); if (A) { A.squash = 1; A.ouch = 0.35 + e.s * 0.3; } } }
      else if (e.t === 'clash') { this.fx.burst(e.x, planeY(tilt, e.x, e.z) + BALL_R, e.z, 1, '#ffffff'); this.fx.confetti(e.x, planeY(tilt, e.x, e.z) + BALL_R, e.z, 16, 5, 6); for (const id of [e.a, e.b]) { const A = this.actors.get(id); if (A) { A.squash = 1; A.ouch = 0.7; } } }
      else if (e.t === 'fall') { const p = players.find(q => q.id === e.id); if (p) { const py = planeY(tilt, p.x, p.z); this.fx.burst(p.x, py, p.z, 0.4, '#ff6b6b'); this.fx.confetti(p.x, py + 1, p.z, 24, 4, 6); } }
      else if (e.t === 'dash') { const a = this.actors.get(e.id); if (a) a.squash = 0.7; }
      else if (e.t === 'land') { this.fx.burst(e.x, planeY(tilt, e.x, e.z), e.z, 0.3, '#b8ffd0'); const a = this.actors.get(e.id); if (a) a.squash = 1; }
      else if (e.t === 'roundEnd') { this.fx.celebrate = 3; const w = players.find(q => q.id === e.winner); if (w) this.fx.confetti(w.x, 4, w.z, 90, 8, 10); }
    }
  }
  update(view, dt) {
    this.clock += dt;
    const ids = new Set(); const t = this.clock;
    const roundOver = view.phase === PHASE.ROUND_END || view.phase === PHASE.MATCH_END;
    for (const p of view.players) {
      ids.add(p.id);
      const a = this.ensure(p), rig = a.rig;
      const plane = planeY(view.tilt, p.x, p.z);
      let y = plane; const isWinner = roundOver && view.roundWinner === p.id;
      if (!p.alive) { y = p.h; rig.group.visible = Math.max(0, p.fallT) < 2.5; a.shadow.visible = false; }
      else if (p.air) { y = p.h; rig.group.visible = true; a.shadow.visible = false; }
      else { rig.group.visible = true; a.shadow.visible = true; a.shadow.position.set(p.x, plane + 0.03, p.z); a.shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(view.tilt.x, 1, view.tilt.z).normalize()); }
      const mx = p.x - a.lastX, mz = p.z - a.lastZ, md = Math.hypot(mx, mz);
      if (md > 1e-4) rig.ball.rotateOnWorldAxis(new THREE.Vector3(mz, 0, -mx).normalize(), md / BALL_R);
      a.lastX = p.x; a.lastZ = p.z;
      let jump = 0;
      if (isWinner && p.alive) { jump = Math.abs(Math.sin(t * 7)) * 0.9; rig.bodyG.rotation.y += dt * 7; } else rig.bodyG.rotation.y = Math.atan2(p.fx, p.fz);
      rig.group.position.set(p.x, y + BALL_R + jump, p.z);
      const sp = Math.hypot(p.vx, p.vz);
      a.squash = Math.max(0, a.squash - dt * 4); a.ouch = Math.max(0, a.ouch - dt);
      let expr = null;
      if (!p.alive || p.air) expr = 'shock'; else if (isWinner) expr = 'happy'; else if (a.ouch > 0) expr = 'ouch'; else if (p.dashing) expr = 'dash';
      if (expr) rig.setExpression(expr); else if (rig.expression !== 'normal' && rig.expression !== 'blink') rig.setExpression('normal');
      animateRig(rig, t, dt, { speed: sp, dashing: p.dashing, squash: 1 + Math.sin(a.squash * Math.PI) * 0.28, seed: a.seed, lockFace: !!expr, cheer: isWinner });
      if (!p.alive) rig.bodyG.rotation.x = -0.6 - Math.max(0, p.fallT) * 2; else if (p.air) rig.bodyG.rotation.x = -0.35;
      if (a.marker) { a.marker.position.y = BALL_R + 3.1 + Math.sin(t * 4) * 0.15; a.marker.rotation.y += dt * 2; }
      rig.ball.material.emissive.set(p.dashing ? '#ffe066' : '#000000'); rig.ball.material.emissiveIntensity = p.dashing ? 0.5 : 0;
    }
    for (const id of [...this.actors.keys()]) if (!ids.has(id)) this.remove(id);
    if (view.events && view.events.length) this.onEvents(view.events, view.players, view.tilt);
  }
}
