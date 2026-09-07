// Client-side prediction of the local player. The host is authoritative, but waiting a full round
// trip before your own rumbler moves feels awful on a phone, so the local player is simulated
// immediately from the joystick and gently pulled towards where the host says it is.
import { movePlayer, PHASE } from './sim.js';

export class Prediction {
  constructor() { this.state = null; }
  reset() { this.state = null; }
  // snaps: snapshot buffer, myId, inp: {x,y,dash}, rtt ms, now ms
  step(snaps, myId, inp, dt, rtt, now) {
    if (!snaps.length) { this.state = null; return null; }
    const latest = snaps[snaps.length - 1];
    const me = latest.p.find(q => q[0] === myId);
    if (!me || !me[5] || me[13] || latest.ph !== PHASE.PLAY) { this.state = null; return null; } // airborne: let the host drive
    const lag = Math.min(0.4, (rtt / 2 + (now - latest.rt)) / 1000);
    const tx = me[1] + me[3] * lag, tz = me[2] + me[4] * lag;
    let pr = this.state;
    if (!pr) pr = this.state = { x: tx, z: tz, vx: me[3], vz: me[4], fx: me[9], fz: me[10], dashes: me[7], dashT: 0, dashGap: 0, air: false, airT: 0, h: 0, vy: 0, stunned: 0, input: { x: 0, y: 0, dash: 0 } };
    pr.input.x = inp.x; pr.input.y = inp.y; if (inp.dash) pr.input.dash += inp.dash;
    movePlayer(pr, { x: latest.tl[0], z: latest.tl[1] }, dt, true);
    const dx = tx - pr.x, dz = tz - pr.z, dist = Math.hypot(dx, dz);
    if (dist > 2.6) { pr.x = tx; pr.z = tz; pr.vx = me[3]; pr.vz = me[4]; }
    else { const k = Math.min(1, dt * (dist > 1 ? 10 : 4)); pr.x += dx * k; pr.z += dz * k; pr.vx += (me[3] - pr.vx) * Math.min(1, dt * 3); pr.vz += (me[4] - pr.vz) * Math.min(1, dt * 3); }
    // meter: trust the host when it is lower (a dash it saw first) or clearly higher (a refill we missed)
    if (me[7] < pr.dashes || me[7] > pr.dashes + 1.05) pr.dashes = me[7];
    return pr;
  }
}
