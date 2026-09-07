import { createSim, createPlayer, startMatch, stepSim, botThink, PHASE, TICK } from '../src/core/sim.js';
let edge = 0, land = 0, fall = 0, dash = 0, rounds = 0;
for (let m = 0; m < 20; m++) {
  const sim = createSim();
  ['a','b','c','d'].forEach((id) => sim.players.push(createPlayer(id, id, 'pip', true)));
  startMatch(sim);
  let guard = 0;
  while (sim.phase !== PHASE.MATCH_END && guard++ < 60 * 600) {
    if (guard % 6 === 0) { const P = sim.players; for (const b of P) botThink(sim, b, P); }
    const ph = sim.phase; stepSim(sim, TICK);
    for (const e of sim.events) { if (e.t === 'edge') edge++; else if (e.t === 'land') land++; else if (e.t === 'fall') fall++; else if (e.t === 'dash') dash++; }
    if (ph === PHASE.PLAY && sim.phase === PHASE.ROUND_END) rounds++;
  }
}
console.log({ rounds, edge, land, fall, dash, recoveryRate: (land / edge).toFixed(2), dashesPerRound: (dash / rounds).toFixed(1) });
