// Host-authoritative simulation. Pure data in, pure data out. No rendering here.

export const ARENA_R = 10;      // platform radius
export const BALL_R = 0.85;     // ball radius (collision radius)
export const ROUND_TIME = 60;   // seconds before sudden death
export const WINS_NEEDED = 3;
export const TICK = 1 / 60;

export const PHASE = { LOBBY: 'lobby', COUNTDOWN: 'countdown', PLAY: 'play', ROUND_END: 'roundEnd', MATCH_END: 'matchEnd' };

const ACCEL = 22;
const MAX_SPEED = 18;        // hard cap (bumps can exceed normal rolling speed)
const FRICTION = 2.4;        // per second, velocity damping
const SLIDE_G = 20;          // slide acceleration per unit of tilt
export const DOME = 0.5;     // outward slide per unit radius (the platform is a shallow dome)
export const DOME_H = 1.4;   // visual height of the dome at the centre
const DASH_SPEED = 16;
const DASH_TIME = 0.2;
export const DASH_CHARGES = 3;      // the dash meter holds three mini dashes
export const DASH_RECHARGE = 2.2;   // seconds to refill one charge
const DASH_GAP = 0.1;               // minimum time between two chained dashes
const GRAVITY = 28;
const GRAVITY_AIR = 10;            // floaty hang past the edge, so there is time to react
const AIR_TIME = 1.1;               // how long you can hang off the edge before you are gone
const AIR_HOP = 5;                  // upward kick of a dash while airborne
const EDGE_R = ARENA_R + BALL_R * 0.35;
const BUMP_RESTITUTION = 1.3;
const BUMP_MIN_PUSH = 8;
const CLASH_STUN = 0.45;   // both dashing into each other: both stunned
const CLASH_PUSH = 12;

export function createPlayer(id, name, look, isBot = false) {
  return {
    id, name, look, isBot,
    x: 0, z: 0, vx: 0, vz: 0,
    alive: true,
    fallT: -1,           // <0 = on platform, otherwise seconds since fell
    dashes: DASH_CHARGES, // dash meter (charges, fractional while refilling)
    dashT: 0,            // dash active time remaining
    dashGap: 0,          // time until the next chained dash may start
    air: false,          // airborne past the edge (can still dash back in)
    airT: 0,
    h: 0, vy: 0,         // world height and vertical speed while airborne or falling
    fx: 0, fz: 1,        // facing
    input: { x: 0, y: 0, dash: 0 }, // dash counts queued taps
    score: 0,
    stunned: 0,
    connected: true,
  };
}

export function createSim() {
  return {
    phase: PHASE.LOBBY,
    players: [],
    time: 0,             // seconds since round start
    phaseT: 0,           // seconds left in current phase (countdown / roundEnd)
    tilt: { x: 0, z: 0 },
    tiltPhase: 0,
    round: 0,
    lastRoundWinner: null,
    matchWinner: null,
    events: [],          // transient: bump / fall / dash cues for this tick
    tick: 0,
  };
}

export function startMatch(sim) {
  for (const p of sim.players) p.score = 0;
  sim.round = 0;
  sim.matchWinner = null;
  startRound(sim);
}

export function startRound(sim) {
  sim.round += 1;
  sim.phase = PHASE.COUNTDOWN;
  sim.phaseT = 3.2;
  sim.time = 0;
  sim.tiltPhase = Math.random() * Math.PI * 2;
  sim.tilt.x = 0; sim.tilt.z = 0;
  sim.lastRoundWinner = null;
  const alive = sim.players.filter(p => p.connected);
  const n = alive.length;
  alive.forEach((p, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    p.x = Math.cos(a) * 4.6;
    p.z = Math.sin(a) * 4.6;
    p.vx = 0; p.vz = 0;
    p.alive = true;
    p.fallT = -1;
    p.dashes = DASH_CHARGES; p.dashT = 0; p.dashGap = 0;
    p.air = false; p.airT = 0; p.h = 0; p.vy = 0;
    p.stunned = 0;
    p.input.dash = 0;
    p.fx = -Math.cos(a); p.fz = -Math.sin(a);
  });
}

function updateTilt(sim, dt) {
  const t = sim.time;
  let amp;
  if (t < ROUND_TIME) {
    amp = Math.min(0.08 + t * 0.008, 0.4) * (0.55 + 0.45 * Math.sin(t * 0.75 + 1));
  } else {
    amp = 0.4 + (t - ROUND_TIME) * 0.06; // sudden death: tilt ramps hard
  }
  const speed = 0.8 + 0.5 * Math.sin(t * 0.31);
  sim.tiltPhase += speed * dt;
  sim.tilt.x = Math.cos(sim.tiltPhase) * amp;
  sim.tilt.z = Math.sin(sim.tiltPhase) * amp;
}

export function stepSim(sim, dt) {
  sim.events.length = 0;
  sim.tick += 1;
  const P = sim.players.filter(p => p.connected);

  if (sim.phase === PHASE.COUNTDOWN) {
    for (const p of P) p.input.dash = 0; // taps during the countdown must not fire at GO
    sim.phaseT -= dt;
    if (sim.phaseT <= 0) { sim.phase = PHASE.PLAY; sim.time = 0; }
    return;
  }
  if (sim.phase === PHASE.ROUND_END) {
    sim.phaseT -= dt;
    stepPhysics(sim, P, dt, false);
    if (sim.phaseT <= 0) {
      if (sim.matchWinner) sim.phase = PHASE.MATCH_END;
      else startRound(sim);
    }
    return;
  }
  if (sim.phase !== PHASE.PLAY) return;

  sim.time += dt;
  updateTilt(sim, dt);
  stepPhysics(sim, P, dt, true);

  // round end check
  const alive = P.filter(p => p.alive);
  if (alive.length <= 1 && P.length > 1) {
    sim.phase = PHASE.ROUND_END;
    sim.phaseT = 3.0;
    if (alive.length === 1) {
      alive[0].score += 1;
      sim.lastRoundWinner = alive[0].id;
      if (alive[0].score >= WINS_NEEDED) sim.matchWinner = alive[0].id;
    }
    sim.events.push({ t: 'roundEnd', winner: sim.lastRoundWinner });
  } else if (P.length === 1 && alive.length === 0) {
    sim.phase = PHASE.ROUND_END; sim.phaseT = 2.0;
  }
}

// Move one player for dt using its input, the platform tilt and the dome. Shared by the host
// simulation and by the client-side prediction of the local player. Returns a dash event or null.
export function movePlayer(p, tilt, dt, controls) {
  p.stunned = Math.max(0, p.stunned - dt);
  p.dashGap = Math.max(0, p.dashGap - dt);
  if (p.dashT <= 0) p.dashes = Math.min(DASH_CHARGES, p.dashes + dt / DASH_RECHARGE);
  let ax = 0, az = 0, dashed = false;
  if (controls) {
    const ix = p.input.x, iy = p.input.y;
    const mag = Math.hypot(ix, iy);
    if (mag > 0.08) {
      p.fx = ix / mag; p.fz = iy / mag;
      if (!p.air && p.stunned <= 0) { const m = Math.min(1, mag); ax += p.fx * m * ACCEL; az += p.fz * m * ACCEL; }
    }
    // Dash: one charge per tap, chainable up to three, in the stick direction (or facing).
    // Allowed while stunned only when airborne, so a knocked-off player can still try to get back.
    if (p.input.dash > 0) {
      if (p.dashes >= 1 && p.dashGap <= 0 && (p.air || p.stunned <= 0)) {
        p.dashes -= 1; p.dashT = DASH_TIME; p.dashGap = DASH_GAP; p.input.dash -= 1;
        p.vx = p.fx * DASH_SPEED; p.vz = p.fz * DASH_SPEED;
        if (p.air) p.vy = Math.max(p.vy, -2) + AIR_HOP;
        dashed = true;
      } else if (p.dashGap <= 0) p.input.dash = 0; // nothing to spend: drop the tap rather than firing it later
    }
  } else p.input.dash = 0;
  if (p.air) {
    p.airT += dt; p.dashT -= dt;
    p.vy -= GRAVITY_AIR * dt; p.h += p.vy * dt;
  } else {
    ax += tilt.x * SLIDE_G + p.x * DOME;
    az += tilt.z * SLIDE_G + p.z * DOME;
    p.vx += ax * dt; p.vz += az * dt;
    if (p.dashT > 0) {
      p.dashT -= dt;
    } else {
      const damp = Math.exp(-FRICTION * dt);
      p.vx *= damp; p.vz *= damp;
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > MAX_SPEED) { p.vx *= MAX_SPEED / sp; p.vz *= MAX_SPEED / sp; }
    }
  }
  p.x += p.vx * dt; p.z += p.vz * dt;
  return dashed;
}

// Height of the platform surface at (x, z): tilt plane plus the shallow dome.
export function planeY(tilt, x, z) { const r2 = (x * x + z * z) / (ARENA_R * ARENA_R); return -(tilt.x * x + tilt.z * z) + DOME_H * Math.max(0, 1 - r2); }

function stepPhysics(sim, P, dt, controls) {
  for (const p of P) {
    if (!p.alive) {
      p.fallT += dt; p.vy -= GRAVITY * dt; p.h += p.vy * dt;
      p.x += p.vx * dt; p.z += p.vz * dt;
      continue;
    }
    if (movePlayer(p, sim.tilt, dt, controls)) sim.events.push({ t: 'dash', id: p.id });
  }

  // collisions between balls
  for (let i = 0; i < P.length; i++) {
    const a = P[i]; if (!a.alive || a.air) continue;
    for (let j = i + 1; j < P.length; j++) {
      const b = P[j]; if (!b.alive || b.air) continue;
      let dx = b.x - a.x, dz = b.z - a.z;
      let d = Math.hypot(dx, dz);
      const minD = BALL_R * 2;
      if (d < minD && d > 1e-4) {
        dx /= d; dz /= d;
        const overlap = minD - d;
        a.x -= dx * overlap / 2; a.z -= dz * overlap / 2;
        b.x += dx * overlap / 2; b.z += dz * overlap / 2;
        const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
        const vn = rvx * dx + rvz * dz;
        if (vn < 0) {
          const boost = (a.dashT > 0 || b.dashT > 0) ? 1.6 : 1;
          let jImp = -(1 + BUMP_RESTITUTION) * vn / 2 * boost;
          jImp = Math.max(jImp, BUMP_MIN_PUSH);
          a.vx -= dx * jImp; a.vz -= dz * jImp;
          b.vx += dx * jImp; b.vz += dz * jImp;
          const strength = Math.min(1, -vn / 14);
          const st = 0.08 + strength * 0.22;
          a.stunned = Math.max(a.stunned, st); b.stunned = Math.max(b.stunned, st);
          if (a.dashT > 0 && b.dashT > 0) {
            // head-on clash: both dashes cancel and both are stunned, thrown apart evenly
            a.dashT = 0; b.dashT = 0; a.stunned = CLASH_STUN; b.stunned = CLASH_STUN;
            a.vx = -dx * CLASH_PUSH; a.vz = -dz * CLASH_PUSH; b.vx = dx * CLASH_PUSH; b.vz = dz * CLASH_PUSH;
            sim.events.push({ t: 'clash', a: a.id, b: b.id, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
            continue;
          }
          if (a.dashT > 0 && b.dashT <= 0) b.stunned = 0.4;
          if (b.dashT > 0 && a.dashT <= 0) a.stunned = 0.4;
          sim.events.push({ t: 'bump', a: a.id, b: b.id, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, s: strength });
        }
      }
    }
  }

  // edge, air and falling. Past the rim you are airborne for a moment: a dash back towards the
  // stage can save you, as long as you have not dropped below the (possibly tilted-up) edge.
  for (const p of P) {
    if (!p.alive) continue;
    const r = Math.hypot(p.x, p.z);
    if (!p.air) {
      if (r > EDGE_R) { p.air = true; p.airT = 0; p.h = planeY(sim.tilt, p.x, p.z); p.vy = 0; p.stunned = 0; sim.events.push({ t: 'edge', id: p.id }); }
    } else {
      const surf = planeY(sim.tilt, p.x, p.z);
      if (r <= EDGE_R - 0.2 && p.h >= surf - 0.7 && p.vy <= 3) {
        p.air = false; p.h = 0; p.vy = 0; p.airT = 0;
        sim.events.push({ t: 'land', id: p.id, x: p.x, z: p.z });
      } else if (p.airT > AIR_TIME || p.h < surf - 2.2) {
        p.alive = false; p.fallT = 0; p.air = false;
        sim.events.push({ t: 'fall', id: p.id });
      }
    }
  }
}

// ---- Bot AI ----
export function botThink(sim, bot, P) {
  if (sim.phase !== PHASE.PLAY || !bot.alive) { bot.input.x = 0; bot.input.y = 0; bot.input.dash = 0; return; }
  bot._brain = bot._brain || { noiseA: Math.random() * 6.28, dashWait: 0, skill: 0.55 + Math.random() * 0.4 };
  if (bot.air) { // knocked off: sometimes react in time and dash straight back at the stage
    const br = bot._brain;
    if (!br.inAir) { br.inAir = true; br.recover = Math.random() < 0.25 + 0.5 * br.skill; br.reactAt = 0.15 + (1 - br.skill) * 0.5; }
    const r0 = Math.hypot(bot.x, bot.z) || 1; bot.input.x = -bot.x / r0; bot.input.y = -bot.z / r0;
    bot.input.dash = br.recover && bot.dashes >= 1 && bot.airT > br.reactAt ? 1 : 0; return;
  }
  bot._brain.inAir = false;
  bot._brain = bot._brain || { noiseA: Math.random() * 6.28, dashWait: 0, skill: 0.55 + Math.random() * 0.4 };
  const br = bot._brain;
  const t = sim.time;
  const r = Math.hypot(bot.x, bot.z);

  // desire 1: go uphill / to centre, more urgent near edge
  const upX = -sim.tilt.x, upZ = -sim.tilt.z;
  const tiltMag = Math.hypot(sim.tilt.x, sim.tilt.z);
  let dx = 0, dz = 0;
  const edgeUrgency = Math.min(1, Math.max(0, (r - 4) / 5));
  const toCx = -bot.x / (r + 1e-3), toCz = -bot.z / (r + 1e-3);
  dx += toCx * (0.5 + edgeUrgency * 2.2);
  dz += toCz * (0.5 + edgeUrgency * 2.2);
  if (tiltMag > 0.02) { dx += (upX / tiltMag) * (0.6 + tiltMag * 3); dz += (upZ / tiltMag) * (0.6 + tiltMag * 3); }

  // desire 2: hunt nearest opponent, push toward the edge
  let target = null, best = 1e9;
  for (const o of P) {
    if (o === bot || !o.alive) continue;
    const d = Math.hypot(o.x - bot.x, o.z - bot.z);
    if (d < best) { best = d; target = o; }
  }
  let wantDash = false;
  if (target && edgeUrgency < 0.75) {
    const tx = target.x - bot.x, tz = target.z - bot.z;
    const d = best;
    const tr = Math.hypot(target.x, target.z);
    // approach from the centre side so the push goes outwards
    const outX = target.x / (tr + 1e-3), outZ = target.z / (tr + 1e-3);
    const goalX = target.x - outX * 1.6, goalZ = target.z - outZ * 1.6;
    const gx = goalX - bot.x, gz = goalZ - bot.z;
    const gd = Math.hypot(gx, gz) + 1e-3;
    const aggression = 1.4 * br.skill * (tr > r ? 1.4 : 0.8);
    dx += (gx / gd) * aggression; dz += (gz / gd) * aggression;
    const align = (tx / d) * outX + (tz / d) * outZ;
    if (t > 1.5 && d < 3.6 && align > 0.3 && bot.dashes >= (edgeUrgency > 0.4 ? 2 : 1) && (target.dashT <= 0 || Math.random() < 0.25) && Math.random() < 0.7 * br.skill) {
      // a target squared up to us with charges left is likely to dash too, and a clash helps nobody
      const facing = (target.fx * -tx + target.fz * -tz) / d;
      if (!(facing > 0.6 && target.dashes >= 1 && Math.random() < 0.7 * br.skill)) wantDash = true;
    }
  }

  // wobble
  br.noiseA += 0.9 * TICK * 60 / 60;
  dx += Math.cos(br.noiseA * 1.7 + t) * 0.25;
  dz += Math.sin(br.noiseA * 1.3 + t * 0.8) * 0.25;
  const m = Math.hypot(dx, dz) || 1;
  bot.input.x = dx / m; bot.input.y = dz / m;
  bot.input.dash = wantDash ? 1 : 0;
}

// ---- Snapshot (compact) for the network ----
export function snapshot(sim) {
  return {
    t: 's',
    k: sim.tick,
    ph: sim.phase,
    tm: +sim.time.toFixed(2),
    pt: +sim.phaseT.toFixed(2),
    tl: [+sim.tilt.x.toFixed(3), +sim.tilt.z.toFixed(3)],
    rd: sim.round,
    rw: sim.lastRoundWinner,
    mw: sim.matchWinner,
    p: sim.players.filter(p => p.connected).map(p => [
      p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.vx.toFixed(2), +p.vz.toFixed(2),
      p.alive ? 1 : 0, +p.fallT.toFixed(2), +p.dashes.toFixed(2), p.score, +p.fx.toFixed(2), +p.fz.toFixed(2), p.dashT > 0 ? 1 : 0, +p.h.toFixed(2), p.air ? 1 : 0,
    ]),
    ev: sim.events.slice(),
  };
}

export function lobbyInfo(sim) {
  return { t: 'lobby', p: sim.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, look: p.look, bot: p.isBot })) };
}
