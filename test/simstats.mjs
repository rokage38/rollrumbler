import { createSim, createPlayer, startMatch, stepSim, botThink, PHASE, TICK } from '../src/core/sim.js';
const lens = []; let bumps = 0;
for (let m = 0; m < 20; m++) {
  const sim = createSim();
  ['a','b','c','d'].forEach((id, i) => sim.players.push(createPlayer(id, id, 'pip', true)));
  startMatch(sim);
  let t = 0, roundStart = 0, guard = 0;
  while (sim.phase !== PHASE.MATCH_END && guard++ < 60 * 600) {
    if (guard % 6 === 0) { const P = sim.players; for (const b of P) botThink(sim, b, P); }
    const ph = sim.phase;
    stepSim(sim, TICK); t += TICK;
    bumps += sim.events.filter(e => e.t === 'bump').length;
    if (ph === PHASE.PLAY && sim.phase === PHASE.ROUND_END) lens.push(sim.time);
  }
}
lens.sort((a,b)=>a-b);
console.log('rounds', lens.length, 'median', lens[Math.floor(lens.length/2)].toFixed(1), 'min', lens[0].toFixed(1), 'max', lens[lens.length-1].toFixed(1), 'bumps/round', (bumps/lens.length).toFixed(1));
