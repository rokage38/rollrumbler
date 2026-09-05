import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { CHARACTERS, charByKey } from './characters.js';
import { Host, Client, makeCode } from './net.js';
import { createSim, createPlayer, startMatch, startRound, stepSim, botThink, snapshot, lobbyInfo, PHASE, ROUND_TIME, WINS_NEEDED, TICK } from './sim.js';

const $ = id => document.getElementById(id);
const MAX_PLAYERS = 6;
const BOT_NAMES = ['Bumble', 'Ziggy', 'Pogo', 'Wobble', 'Tumble', 'Dizzy'];

const renderer = new Renderer($('c'));
const input = new Input($('layer'), $('stick'), $('dash'));
const sfx = new Sfx();

const app = {
  mode: null,          // 'solo' | 'host' | 'client'
  sim: null,
  net: null,
  myId: 'host',
  name: '',
  char: 'pip',
  code: '',
  lobby: [],           // client-side lobby list
  snaps: [],           // client-side snapshot buffer
  clientRecvT: 0,
  lastBotThink: 0,
  lastSend: 0,
  lastMsgKey: '',
  countdownShown: -1,
  view: null,
  pendingEvents: [],
};

// ---------- Home screen ----------
(function initHome() {
  try { app.name = localStorage.getItem('rr-name') || ''; app.char = localStorage.getItem('rr-char') || 'pip'; } catch {}
  $('name').value = app.name;
  const wrap = $('chars');
  for (const c of CHARACTERS) {
    const d = document.createElement('div');
    d.className = 'chip' + (c.key === app.char ? ' sel' : ''); d.style.background = c.body; d.dataset.key = c.key;
    d.innerHTML = `<div class="face"></div>${c.name}`;
    d.onclick = () => { sfx.unlock(); sfx.click(); app.char = c.key; try { localStorage.setItem('rr-char', c.key); } catch {} wrap.querySelectorAll('.chip').forEach(x => x.classList.toggle('sel', x.dataset.key === c.key)); };
    wrap.appendChild(d);
  }
  const url = new URL(location.href);
  const rc = url.searchParams.get('room');
  if (rc) { $('joinBox').hidden = false; $('code').value = rc.toUpperCase(); }

  $('btnJoinOpen').onclick = () => { $('joinBox').hidden = !$('joinBox').hidden; $('code').focus(); };
  $('btnSolo').onclick = () => { if (!readName()) return; startSolo(); };
  $('btnHost').onclick = () => { if (!readName()) return; startHost(); };
  $('btnJoin').onclick = () => { if (!readName()) return; const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) return showErr('homeErr', 'Enter the 4-letter room code.'); startClient(code); };
  $('btnStart').onclick = () => hostStartMatch();
  $('btnLobbyLeave').onclick = () => leave();
  $('leave').onclick = () => leave();
  $('btnEndLeave').onclick = () => leave();
  $('btnAgain').onclick = () => hostStartMatch();
  $('btnShare').onclick = async () => {
    const link = `${location.origin}${location.pathname}?room=${app.code}`;
    try { if (navigator.share) await navigator.share({ title: 'Roll Rumble', text: `Join my Roll Rumble room: ${app.code}`, url: link }); else { await navigator.clipboard.writeText(link); $('lobbyHint').textContent = 'Link copied!'; } } catch {}
  };
  window.addEventListener('touchstart', () => sfx.unlock(), { once: true, passive: true });
  window.addEventListener('mousedown', () => sfx.unlock(), { once: true });
})();

function readName() {
  sfx.unlock();
  const n = $('name').value.trim();
  if (!n) { showErr('homeErr', 'Give yourself a name first.'); return false; }
  app.name = n.slice(0, 10); try { localStorage.setItem('rr-name', app.name); } catch {}
  showErr('homeErr', ''); return true;
}
function showErr(id, t) { $(id).textContent = t; }
function show(screen) { for (const s of ['home', 'lobby', 'end']) $(s).hidden = s !== screen; $('hud').hidden = screen !== null; $('layer').hidden = screen !== null; }

// ---------- Solo / Host ----------
function newSim() { const sim = createSim(); app.sim = sim; return sim; }

function startSolo() {
  app.mode = 'solo'; app.myId = 'host';
  const sim = newSim();
  sim.players.push(createPlayer('host', app.name, app.char));
  fillBots(sim, 4);
  renderer.setMyId('host');
  startMatch(sim);
  show(null);
}

function startHost() {
  app.mode = 'host'; app.myId = 'host';
  app.code = makeCode();
  const sim = newSim();
  sim.players.push(createPlayer('host', app.name, app.char));
  renderer.setMyId('host'); arrangeLobby(sim);
  $('lobbyHostBits').hidden = false; $('botToggleRow').hidden = false; $('btnStart').hidden = false;
  $('lobbyCode').textContent = app.code; $('lobbyHint').textContent = 'Setting up room…'; showErr('lobbyErr', '');
  show('lobby'); renderLobby();
  app.net = new Host(app.code, {
    onOpen: () => { $('lobbyHint').textContent = 'Room open. Friends can join with the code.'; },
    onError: (e) => {
      if (e.type === 'unavailable-id') { app.net.close(); startHost(); return; }
      showErr('lobbyErr', 'Connection problem: ' + (e.type || e.message));
    },
    onStatus: (t) => { $('lobbyHint').textContent = t; },
    onJoin: (id, m) => {
      const sim = app.sim;
      const existing = sim.players.find(q => q.id === id && q.connected);
      if (existing) { app.net.send(id, { t: 'welcome', id, char: existing.char, code: app.code }); app.net.send(id, lobbyInfo(sim)); if (sim.phase !== PHASE.LOBBY) app.net.send(id, { t: 'start' }); return; }
      const humans = sim.players.filter(p => p.connected && !p.isBot).length;
      if (humans >= MAX_PLAYERS) { app.net.send(id, { t: 'full' }); return; }
      let char = m.char; const taken = new Set(sim.players.filter(p => p.connected).map(p => p.char));
      if (taken.has(char)) char = CHARACTERS.find(c => !taken.has(c.key))?.key || char;
      // make room by dropping a bot if the roster is full
      if (sim.players.filter(p => p.connected).length >= MAX_PLAYERS) { const b = sim.players.find(p => p.isBot && p.connected); if (b) b.connected = false; }
      const p = createPlayer(id, String(m.name || 'Guest').slice(0, 10), char);
      sim.players = sim.players.filter(q => q.id !== id); sim.players.push(p);
      app.net.send(id, { t: 'welcome', id, char, code: app.code });
      if (sim.phase !== PHASE.LOBBY) { p.alive = false; p.fallT = 9; app.net.send(id, { t: 'start' }); }
      arrangeLobby(sim); broadcastLobby(); renderLobby();
    },
    onLeave: (id) => { const p = app.sim?.players.find(q => q.id === id); if (p) { p.connected = false; if (app.sim.phase === PHASE.LOBBY) arrangeLobby(app.sim); broadcastLobby(); renderLobby(); } },
    onInput: (id, m) => { const p = app.sim?.players.find(q => q.id === id); if (p) { p.input.x = m.x; p.input.y = m.y; if (m.d) p.input.dash = true; } },
  });
}

function arrangeLobby(sim) {
  const P = sim.players.filter(p => p.connected);
  P.forEach((p, i) => { const a = (i / P.length) * Math.PI * 2 + Math.PI / 2; p.x = Math.cos(a) * 4.5; p.z = Math.sin(a) * 4.5; p.fx = -Math.cos(a); p.fz = -Math.sin(a); });
}

function fillBots(sim, upTo) {
  const taken = new Set(sim.players.filter(p => p.connected).map(p => p.char));
  let n = sim.players.filter(p => p.connected).length, i = 0;
  while (n < upTo && i < 6) {
    const c = CHARACTERS.find(x => !taken.has(x.key)); if (!c) break;
    taken.add(c.key);
    sim.players.push(createPlayer('bot' + i, BOT_NAMES[i], c.key, true));
    n++; i++;
  }
}

function hostStartMatch() {
  const sim = app.sim; if (!sim) return;
  sim.players = sim.players.filter(p => p.connected && !p.isBot);
  if (app.mode === 'solo' || $('botToggle').checked) fillBots(sim, 4);
  for (const p of sim.players) { p.alive = true; p.fallT = -1; }
  startMatch(sim);
  broadcastLobby();
  if (app.net) app.net.broadcast({ t: 'start' });
  show(null);
}

function broadcastLobby() { if (app.mode === 'host' && app.net) app.net.broadcast(lobbyInfo(app.sim)); }

function renderLobby() {
  const list = app.mode === 'client' ? app.lobby : app.sim.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, char: p.char, bot: p.isBot }));
  $('plist').innerHTML = list.map(p => { const c = charByKey(p.char); return `<div class="prow"><div class="dot" style="background:${c.body}"></div>${esc(p.name)}${p.id === app.myId ? ' (you)' : ''}${p.bot ? '<span class="bot">bot</span>' : ''}</div>`; }).join('') || '<div class="hint">Nobody here yet</div>';
}
const esc = s => String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

// ---------- Client ----------
function startClient(code) {
  app.mode = 'client'; app.code = code; app.lobby = []; app.snaps = [];
  $('lobbyHostBits').hidden = true; $('botToggleRow').hidden = true; $('btnStart').hidden = true;
  $('lobbyHint').textContent = 'Joining room ' + code + '…'; showErr('lobbyErr', '');
  show('lobby'); renderLobby();
  app.net = new Client(code, { name: app.name, char: app.char }, {
    onOpen: (kind) => { app.netKind = kind; $('lobbyHint').textContent = (kind === 'relay' ? 'Connected via relay. ' : 'Connected. ') + 'Waiting for the host to start…'; },
    onStatus: (t) => { $('lobbyHint').textContent = t; },
    onError: (e) => { showErr('lobbyErr', e.message || String(e.type || e)); },
    onClose: () => { if (app.mode === 'client') { showErr('lobbyErr', 'The host left the room.'); show('lobby'); $('lobbyHint').textContent = 'Disconnected.'; } },
    onMessage: (m) => {
      if (!m) return;
      if (m.t === 'welcome') { app.myId = m.id; app.char = m.char; renderer.setMyId(m.id); }
      else if (m.t === 'lobby') { app.lobby = m.p; renderLobby(); }
      else if (m.t === 'start') { app.snaps = []; app.countdownShown = -1; show(null); }
      else if (m.t === 's') { onSnapshot(m); }
      else if (m.t === 'full') { showErr('lobbyErr', 'That room is full.'); }
    },
  });
}

function onSnapshot(s) {
  const last = app.snaps[app.snaps.length - 1];
  if (last && s.k <= last.k) return;
  s.rt = performance.now();
  app.snaps.push(s); if (app.snaps.length > 12) app.snaps.shift();
  if (s.ev && s.ev.length) { playEvents(s.ev); app.pendingEvents.push(...s.ev); }
  if (!$('lobby').hidden && s.ph !== PHASE.LOBBY) { app.countdownShown = -1; show(null); }
}

function clientView(now) {
  const S = app.snaps; if (S.length === 0) return null;
  const delay = 90; // ms behind the newest snapshot
  const target = now - delay;
  let i = S.length - 1;
  while (i > 0 && S[i].rt > target) i--;
  const a = S[i], b = S[Math.min(S.length - 1, i + 1)];
  const span = b.rt - a.rt; const f = span > 0 ? Math.min(1, Math.max(0, (target - a.rt) / span)) : 1;
  const lerp = (u, v) => u + (v - u) * f;
  const bmap = new Map(b.p.map(q => [q[0], q]));
  const lobbyNames = new Map(app.lobby.map(q => [q.id, q]));
  const players = a.p.map(q => {
    const r = bmap.get(q[0]) || q;
    const meta = lobbyNames.get(q[0]);
    return { id: q[0], name: meta?.name, char: meta?.char || 'pip', x: lerp(q[1], r[1]), z: lerp(q[2], r[2]), vx: r[3], vz: r[4], alive: !!r[5], fallT: r[6], dashCd: r[7], score: r[8], fx: r[9], fz: r[10], dashing: !!r[11] };
  });
  const latest = S[S.length - 1];
  const events = app.pendingEvents; app.pendingEvents = [];
  return { tilt: { x: lerp(a.tl[0], b.tl[0]), z: lerp(a.tl[1], b.tl[1]) }, players, events, phase: latest.ph, time: latest.tm, phaseT: latest.pt, round: latest.rd, roundWinner: latest.rw, matchWinner: latest.mw };
}

function hostView(sim) {
  return {
    tilt: sim.tilt,
    players: sim.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, char: p.char, x: p.x, z: p.z, vx: p.vx, vz: p.vz, alive: p.alive, fallT: p.fallT, dashCd: p.dashCd, score: p.score, fx: p.fx, fz: p.fz, dashing: p.dashT > 0 })),
    events: sim.events, phase: sim.phase, time: sim.time, phaseT: sim.phaseT, round: sim.round, roundWinner: sim.lastRoundWinner, matchWinner: sim.matchWinner,
  };
}

function playEvents(events) {
  for (const e of events) {
    if (e.t === 'bump') sfx.bump(e.s);
    else if (e.t === 'dash') sfx.dash();
    else if (e.t === 'fall') sfx.fall();
    else if (e.t === 'roundEnd') { if (e.winner === app.myId) sfx.win(); else sfx.lose(); }
  }
}

// ---------- HUD ----------
function updateHud(v) {
  const me = v.players.find(p => p.id === app.myId);
  // scores
  const key = v.players.map(p => `${p.id}:${p.score}:${p.alive ? 1 : 0}`).join('|');
  if (key !== app._scoreKey) {
    app._scoreKey = key;
    $('scores').innerHTML = v.players.map(p => { const c = charByKey(p.char); return `<div class="sc${p.alive ? '' : ' out'}${p.id === app.myId ? ' me' : ''}"><div class="dot" style="background:${c.body}"></div>${esc(p.name || c.name)}<div class="pips">${[0, 1, 2].map(i => `<div class="pip${i < p.score ? ' on' : ''}"></div>`).join('')}</div></div>`; }).join('');
  }
  // timer
  const tEl = $('timer');
  if (v.phase === PHASE.PLAY) { const left = Math.max(0, ROUND_TIME - v.time); tEl.textContent = left > 0 ? Math.ceil(left) : 'SUDDEN DEATH'; tEl.classList.toggle('sudden', left <= 0); }
  else tEl.textContent = v.phase === PHASE.COUNTDOWN ? `Round ${v.round}` : '';
  // dash cooldown
  $('dash').querySelector('.cd').style.height = me && me.alive ? `${Math.min(100, (me.dashCd / 2.4) * 100)}%` : '0%';
  // centre message
  let msg = '';
  if (v.phase === PHASE.COUNTDOWN) {
    const n = Math.ceil(v.phaseT - 0.2);
    msg = n > 0 ? String(n) : 'GO!';
    if (n !== app.countdownShown) { app.countdownShown = n; sfx.beep(n <= 0); }
  } else if (v.phase === PHASE.ROUND_END) {
    const w = v.players.find(p => p.id === v.roundWinner);
    msg = w ? `${esc(w.name || charByKey(w.char).name)}<small>wins the round</small>` : 'Draw!';
    if (v.matchWinner) msg = `${esc(w.name)}<small>wins the match!</small>`;
  } else if (v.phase === PHASE.PLAY && me && !me.alive) msg = '<small>Knocked off! Watch the rest…</small>';
  if (msg !== app.lastMsgKey) { app.lastMsgKey = msg; $('msg').innerHTML = msg; $('msg').classList.toggle('show', !!msg); }
  if (app.mode === 'client' && app.net) $('ping').textContent = (app.net.rtt ? `${Math.round(app.net.rtt)} ms` : '') + (app.net.kind === 'relay' ? ' relay' : '');
}

function showMatchEnd(v) {
  const sorted = [...v.players].sort((a, b) => b.score - a.score);
  const w = sorted[0];
  $('winnerText').textContent = w.id === app.myId ? 'You win the match!' : `${w.name || charByKey(w.char).name} wins the match!`;
  $('podium').innerHTML = sorted.map((p, i) => { const c = charByKey(p.char); return `<div class="prow"><div class="dot" style="background:${c.body}"></div>${i + 1}. ${esc(p.name || c.name)}<span class="bot">${p.score} win${p.score === 1 ? '' : 's'}</span></div>`; }).join('');
  $('btnAgain').hidden = app.mode === 'client'; $('againHint').hidden = app.mode !== 'client';
  show('end');
}

function leave() {
  if (app.net) { app.net.close(); app.net = null; }
  app.mode = null; app.sim = null; app.snaps = []; app.lobby = []; app.myId = 'host';
  renderer.removeMissing(new Set()); renderer.setMyId(null);
  $('msg').classList.remove('show'); app.lastMsgKey = '';
  history.replaceState(null, '', location.pathname);
  show('home');
}

// ---------- Main loop ----------
// Simulation and networking run from a Web Worker timer so a host keeps ticking even when the
// tab is in the background (requestAnimationFrame pauses there); rendering stays on rAF.
let last = performance.now(), acc = 0, endShown = false, latestView = null, lastUpdate = 0;
function update(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  let view = null;

  if ((app.mode === 'solo' || app.mode === 'host') && app.sim) {
    const sim = app.sim;
    const inGame = sim.phase !== PHASE.LOBBY;
    if (inGame) {
      const me = sim.players.find(p => p.id === 'host');
      const inp = input.read();
      if (me) { me.input.x = inp.x; me.input.y = inp.y; if (inp.dash) me.input.dash = true; }
      if (now - app.lastBotThink > 100) { app.lastBotThink = now; const P = sim.players.filter(p => p.connected); for (const b of P) if (b.isBot) botThink(sim, b, P); }
      acc += dt;
      const merged = [];
      while (acc >= TICK) { stepSim(sim, TICK); acc -= TICK; if (sim.events.length) merged.push(...sim.events); }
      if (merged.length) { playEvents(merged); }
      view = hostView(sim); view.events = merged;
      if (app.mode === 'host' && app.net && now - app.lastSend > (app.net.hasRelayClients() ? 80 : 50)) { app.lastSend = now; const s = snapshot(sim); s.ev = merged; app.net.broadcast(s); }
      if (sim.phase === PHASE.MATCH_END && !endShown) { endShown = true; showMatchEnd(view); }
      if (sim.phase !== PHASE.MATCH_END) endShown = false;
    } else if (app.mode === 'host') {
      view = hostView(sim);
    }
  } else if (app.mode === 'client') {
    view = clientView(now);
    if (app.net && now - app.lastSend > (app.net.kind === 'relay' ? 90 : 50)) {
      app.lastSend = now; const inp = input.read();
      if (inp.dash || inp.x !== app._lx || inp.y !== app._ly || now - (app._lastForce || 0) > 500) { app._lx = inp.x; app._ly = inp.y; app._lastForce = now; app.net.send({ t: 'in', x: +inp.x.toFixed(2), y: +inp.y.toFixed(2), d: inp.dash ? 1 : 0 }); }
    }
    if (view && view.phase === PHASE.MATCH_END && !endShown) { endShown = true; showMatchEnd(view); }
    if (view && view.phase !== PHASE.MATCH_END) endShown = false;
  }
  if (view) { if (latestView && latestView.events && latestView.events.length && !latestView.rendered) view.events = latestView.events.concat(view.events || []); latestView = view; }
  else latestView = null;
  if (!$('hud').hidden && view) updateHud(view);
}
let ticker = null;
try {
  const src = 'setInterval(() => postMessage(0), 16);';
  ticker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  ticker.onmessage = () => update(performance.now());
} catch (e) { setInterval(() => update(performance.now()), 16); }

let lastRender = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastRender) / 1000); lastRender = now;
  if (latestView) { renderer.render(latestView, dt); latestView.rendered = true; latestView.events = []; }
  else renderer.render({ tilt: { x: Math.sin(now / 1500) * 0.06, z: Math.cos(now / 1900) * 0.06 }, players: [], events: [] }, dt);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}));
}
