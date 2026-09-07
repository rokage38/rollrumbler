// Roll Rumble: app orchestration. Screens, matches (solo / host / client), and the update loop.
import { Renderer, isPhone } from './render/renderer.js';
import { Preview } from './render/preview.js';
import { Input } from './ui/input.js';
import { Screens } from './ui/screens.js';
import { Wardrobe } from './ui/wardrobe.js';
import { Sfx } from './audio.js';
import { Host, Client, makeCode } from './core/net.js';
import { Prediction } from './core/prediction.js';
import { BOT_NAMES, randomLook, defaultLook, normaliseLook, lookKey, colourOf } from './looks/catalog.js';
import { createSim, createPlayer, startMatch, stepSim, botThink, snapshot, lobbyInfo, PHASE, ROUND_TIME, TICK } from './core/sim.js';

const $ = id => document.getElementById(id);
const MAX_PLAYERS = 6;
const esc = s => String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

// ---------- settings ----------
const settings = { quality: 'auto', stick: 'any' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('rr-settings') || '{}')); } catch {}
const saveSettings = () => { try { localStorage.setItem('rr-settings', JSON.stringify(settings)); } catch {} };

const renderer = new Renderer($('c'), settings.quality === 'auto' ? {} : { quality: Number(settings.quality) });
if (settings.quality !== 'auto') renderer.auto = false;
const preview = new Preview($('pv'));
const input = new Input($('layer'), $('stick'), $('dash'));
input.side = settings.stick;
const sfx = new Sfx();
const screens = new Screens();
const pred = new Prediction();

const app = {
  mode: null, sim: null, net: null,
  myId: 'host', name: '', look: defaultLook(), code: '',
  lobby: [], snaps: [], pendingEvents: [],
  lastBotThink: 0, lastSend: 0, lastMsgKey: '', countdownShown: -1,
  thumbs: new Map(),
};
window.RR = { renderer, app }; // debug handle
const wardrobe = new Wardrobe(preview, sfx, (look) => { app.look = look; refreshMe(); });
app.look = wardrobe.look;

function thumbOf(look) { const k = lookKey(look); if (!app.thumbs.has(k)) app.thumbs.set(k, preview.thumb(look)); return app.thumbs.get(k); }
function refreshMe() { $('titleThumb').src = thumbOf(app.look); $('titleName').textContent = app.name || 'Your rumbler'; wardrobe.setName(app.name); }

// ---------- screens ----------
screens.onChange((name) => {
  renderer.setMode(name === null ? 'game' : 'menu');
  if (name === 'wardrobe') { wardrobe.apply(); preview.start(); } else preview.stop();
  sfx.music(name === null ? 'match' : 'menu');
});
function go(name) { sfx.unlock(); sfx.click(); screens.show(name); }

(function init() {
  try { app.name = localStorage.getItem('rr-name') || ''; } catch {}
  $('name').value = app.name;
  $('name').addEventListener('input', () => { app.name = $('name').value.trim().slice(0, 10); try { localStorage.setItem('rr-name', app.name); } catch {} refreshMe(); });
  refreshMe();
  $('tPlay').onclick = () => go('play');
  $('tWardrobe').onclick = () => go('wardrobe');
  $('tSettings').onclick = () => go('settings');
  $('titleMe').onclick = () => go('wardrobe');
  $('pBack').onclick = () => go('title'); $('wBack').onclick = () => go('title'); $('sBack').onclick = () => go('title'); $('wDone').onclick = () => go('title');
  const url = new URL(location.href); const rc = url.searchParams.get('room');
  if (rc) { $('code').value = rc.toUpperCase(); screens.show('play'); }
  $('btnSolo').onclick = () => { if (!readName()) return; startSolo(); };
  $('btnHost').onclick = () => { if (!readName()) return; startHost(); };
  $('btnJoin').onclick = () => { if (!readName()) return; const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) return showErr('playErr', 'Enter the 4-letter room code.'); startClient(code); };
  $('btnStart').onclick = () => hostStartMatch();
  $('btnLobbyLeave').onclick = () => leave(); $('leave').onclick = () => leave(); $('btnEndLeave').onclick = () => leave();
  $('btnAgain').onclick = () => hostStartMatch();
  $('btnShare').onclick = async () => {
    const link = `${location.origin}${location.pathname}?room=${app.code}`;
    try { if (navigator.share) await navigator.share({ title: 'Roll Rumble', text: `Join my Roll Rumble room: ${app.code}`, url: link }); else { await navigator.clipboard.writeText(link); $('lobbyHint').textContent = 'Link copied!'; } } catch {}
  };
  const paint = () => {
    $('setSfx').textContent = sfx.muted ? 'Off' : 'On'; $('setSfx').classList.toggle('off', sfx.muted);
    $('setMusic').textContent = sfx.musicOn ? 'On' : 'Off'; $('setMusic').classList.toggle('off', !sfx.musicOn);
    $('setQuality').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.q === String(settings.quality)));
    $('setStick').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.s === settings.stick));
  };
  $('setSfx').onclick = () => { sfx.unlock(); sfx.setMuted(!sfx.muted); paint(); sfx.click(); };
  $('setMusic').onclick = () => { sfx.unlock(); sfx.setMusic(!sfx.musicOn); paint(); };
  $('setQuality').querySelectorAll('button').forEach(b => b.onclick = () => { settings.quality = b.dataset.q; saveSettings(); if (b.dataset.q === 'auto') renderer.setQuality(isPhone() ? 1 : 2, true); else renderer.setQuality(Number(b.dataset.q), false); paint(); sfx.click(); });
  $('setStick').querySelectorAll('button').forEach(b => b.onclick = () => { settings.stick = b.dataset.s; input.side = settings.stick; saveSettings(); paint(); sfx.click(); });
  paint();
  window.addEventListener('touchstart', () => sfx.unlock(), { once: true, passive: true });
  window.addEventListener('mousedown', () => sfx.unlock(), { once: true });
  initInstallHint();
})();

function readName() {
  sfx.unlock();
  const n = $('name').value.trim();
  if (!n) { showErr('playErr', 'Give yourself a name first.'); $('name').focus(); return false; }
  app.name = n.slice(0, 10); try { localStorage.setItem('rr-name', app.name); } catch {}
  showErr('playErr', ''); refreshMe(); return true;
}
function showErr(id, t) { $(id).textContent = t; }

// ---------- install hint ----------
function initInstallHint() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  let dismissed = false; try { dismissed = localStorage.getItem('rr-install-dismissed') === '1'; } catch {}
  const box = $('install'), ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
  $('setInstall').textContent = standalone ? 'Installed on your home screen.' : isIos ? 'To install: in Safari tap Share, then Add to Home Screen.' : 'To install: use "Install app" in your browser menu.';
  if (standalone || dismissed) return;
  $('installClose').onclick = () => { box.classList.remove('show'); try { localStorage.setItem('rr-install-dismissed', '1'); } catch {} };
  if (isIos) { if (isSafari) { $('installIos').hidden = false; box.classList.add('show'); } return; }
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('installAndroid').hidden = false; box.classList.add('show'); });
  $('installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); const r = await deferred.userChoice; deferred = null; box.classList.remove('show'); if (r && r.outcome === 'accepted') { try { localStorage.setItem('rr-install-dismissed', '1'); } catch {} } };
  window.addEventListener('appinstalled', () => { box.classList.remove('show'); try { localStorage.setItem('rr-install-dismissed', '1'); } catch {} });
}

// ---------- solo / host ----------
function newSim() { const sim = createSim(); app.sim = sim; return sim; }
function startSolo() {
  app.mode = 'solo'; app.myId = 'host';
  const sim = newSim(); sim.players.push(createPlayer('host', app.name, app.look)); fillBots(sim, 4);
  renderer.setMyId('host'); startMatch(sim); screens.show(null);
}
function startHost() {
  app.mode = 'host'; app.myId = 'host'; app.code = makeCode();
  const sim = newSim(); sim.players.push(createPlayer('host', app.name, app.look));
  renderer.setMyId('host'); arrangeLobby(sim);
  $('lobbyHostBits').hidden = false; $('botToggleRow').hidden = false; $('btnStart').hidden = false;
  $('lobbyCode').textContent = app.code; $('lobbyHint').textContent = 'Setting up room…'; showErr('lobbyErr', '');
  screens.show('lobby'); renderLobby();
  app.net = new Host(app.code, {
    onOpen: () => { $('lobbyHint').textContent = 'Room open. Friends can join with the code.'; },
    onError: (e) => { if (e.type === 'unavailable-id') { app.net.close(); startHost(); return; } showErr('lobbyErr', 'Connection problem: ' + (e.type || e.message)); },
    onStatus: (t) => { $('lobbyHint').textContent = t; },
    onJoin: (id, m) => {
      const sim = app.sim;
      const existing = sim.players.find(q => q.id === id && q.connected);
      if (existing) { app.net.send(id, { t: 'welcome', id, code: app.code }); app.net.send(id, lobbyInfo(sim)); if (sim.phase !== PHASE.LOBBY) app.net.send(id, { t: 'start' }); return; }
      if (sim.players.filter(p => p.connected && !p.isBot).length >= MAX_PLAYERS) { app.net.send(id, { t: 'full' }); return; }
      if (sim.players.filter(p => p.connected).length >= MAX_PLAYERS) { const b = sim.players.find(p => p.isBot && p.connected); if (b) b.connected = false; }
      const p = createPlayer(id, String(m.name || 'Guest').slice(0, 10), normaliseLook(m.look));
      sim.players = sim.players.filter(q => q.id !== id); sim.players.push(p);
      app.net.send(id, { t: 'welcome', id, code: app.code });
      if (sim.phase !== PHASE.LOBBY) { p.alive = false; p.fallT = 9; app.net.send(id, { t: 'start' }); }
      arrangeLobby(sim); broadcastLobby(); renderLobby(); sfx.pop();
    },
    onLeave: (id) => { const p = app.sim?.players.find(q => q.id === id); if (p) { p.connected = false; if (app.sim.phase === PHASE.LOBBY) arrangeLobby(app.sim); broadcastLobby(); renderLobby(); } },
    onInput: (id, m) => { const p = app.sim?.players.find(q => q.id === id); if (p) { p.input.x = m.x; p.input.y = m.y; if (m.d) p.input.dash = true; } },
  });
}
function arrangeLobby(sim) { const P = sim.players.filter(p => p.connected); P.forEach((p, i) => { const a = (i / P.length) * Math.PI * 2 + Math.PI / 2; p.x = Math.cos(a) * 4.5; p.z = Math.sin(a) * 4.5; p.fx = -Math.cos(a); p.fz = -Math.sin(a); }); }
function fillBots(sim, upTo) { let n = sim.players.filter(p => p.connected).length, i = 0; const names = [...BOT_NAMES].sort(() => Math.random() - 0.5); while (n < upTo && i < 6) { sim.players.push(createPlayer('bot' + i, names[i], randomLook(), true)); n++; i++; } }
function hostStartMatch() {
  const sim = app.sim; if (!sim) return;
  sim.players = sim.players.filter(p => p.connected && !p.isBot);
  if (app.mode === 'solo' || $('botToggle').checked) fillBots(sim, 4);
  for (const p of sim.players) { p.alive = true; p.fallT = -1; }
  startMatch(sim); broadcastLobby();
  if (app.net) app.net.broadcast({ t: 'start' });
  screens.show(null);
}
function broadcastLobby() { if (app.mode === 'host' && app.net) app.net.broadcast(lobbyInfo(app.sim)); }
function lobbyList() { return app.mode === 'client' ? app.lobby : app.sim.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, look: p.look, bot: p.isBot })); }
function renderLobby() {
  const list = lobbyList();
  let html = list.map(p => `<div class="pcard"><img src="${thumbOf(p.look)}" alt="" />${esc(p.name)}<span class="sub">${p.id === app.myId ? 'you' : p.bot ? 'bot' : 'friend'}</span></div>`).join('');
  for (let i = list.length; i < Math.max(3, Math.min(MAX_PLAYERS, list.length + 1)); i++) html += `<div class="pcard empty">waiting…</div>`;
  $('plist').innerHTML = html;
}

// ---------- client ----------
function startClient(code) {
  app.mode = 'client'; app.code = code; app.lobby = []; app.snaps = []; pred.reset();
  $('lobbyHostBits').hidden = true; $('botToggleRow').hidden = true; $('btnStart').hidden = true;
  $('lobbyHint').textContent = 'Joining room ' + code + '…'; showErr('lobbyErr', '');
  screens.show('lobby'); renderLobby();
  app.net = new Client(code, { name: app.name, look: app.look }, {
    onOpen: (kind) => { $('lobbyHint').textContent = (kind === 'relay' ? 'Connected via relay. ' : 'Connected. ') + 'Waiting for the host to start…'; },
    onStatus: (t) => { $('lobbyHint').textContent = t; },
    onError: (e) => { showErr('lobbyErr', e.message || String(e.type || e)); },
    onClose: () => { if (app.mode === 'client') { showErr('lobbyErr', 'The host left the room.'); screens.show('lobby'); $('lobbyHint').textContent = 'Disconnected.'; } },
    onMessage: (m) => {
      if (!m) return;
      if (m.t === 'welcome') { app.myId = m.id; renderer.setMyId(m.id); }
      else if (m.t === 'lobby') { app.lobby = m.p; renderLobby(); }
      else if (m.t === 'start') { app.snaps = []; app.countdownShown = -1; pred.reset(); screens.show(null); }
      else if (m.t === 's') onSnapshot(m);
      else if (m.t === 'full') showErr('lobbyErr', 'That room is full.');
    },
  });
}
function onSnapshot(s) {
  const last = app.snaps[app.snaps.length - 1];
  if (last && s.k <= last.k) return;
  s.rt = performance.now();
  app.snaps.push(s); if (app.snaps.length > 12) app.snaps.shift();
  if (s.ev && s.ev.length) { playEvents(s.ev); app.pendingEvents.push(...s.ev); }
  if (screens.current === 'lobby' && s.ph !== PHASE.LOBBY) { app.countdownShown = -1; screens.show(null); }
}
function clientView(now) {
  const S = app.snaps; if (S.length === 0) return null;
  const delay = app.net && app.net.kind === 'relay' ? 140 : 90, target = now - delay;
  let i = S.length - 1; while (i > 0 && S[i].rt > target) i--;
  const a = S[i], b = S[Math.min(S.length - 1, i + 1)];
  const span = b.rt - a.rt, f = span > 0 ? Math.min(1, Math.max(0, (target - a.rt) / span)) : 1;
  const lerp = (u, v) => u + (v - u) * f;
  const bmap = new Map(b.p.map(q => [q[0], q])), meta = new Map(app.lobby.map(q => [q.id, q]));
  const players = a.p.map(q => {
    const r = bmap.get(q[0]) || q, mt = meta.get(q[0]);
    const pl = { id: q[0], name: mt?.name, look: mt?.look || defaultLook(), x: lerp(q[1], r[1]), z: lerp(q[2], r[2]), vx: r[3], vz: r[4], alive: !!r[5], fallT: r[6], dashCd: r[7], score: r[8], fx: r[9], fz: r[10], dashing: !!r[11] };
    const pr = pred.state;
    if (pl.id === app.myId && pr && pl.alive) { pl.x = pr.x; pl.z = pr.z; pl.vx = pr.vx; pl.vz = pr.vz; pl.fx = pr.fx; pl.fz = pr.fz; pl.dashing = pr.dashT > 0; pl.dashCd = pr.dashCd; }
    return pl;
  });
  const latest = S[S.length - 1], events = app.pendingEvents; app.pendingEvents = [];
  return { tilt: { x: lerp(a.tl[0], b.tl[0]), z: lerp(a.tl[1], b.tl[1]) }, players, events, phase: latest.ph, time: latest.tm, phaseT: latest.pt, round: latest.rd, roundWinner: latest.rw, matchWinner: latest.mw };
}
function hostView(sim) {
  return {
    tilt: sim.tilt,
    players: sim.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, look: p.look, x: p.x, z: p.z, vx: p.vx, vz: p.vz, alive: p.alive, fallT: p.fallT, dashCd: p.dashCd, score: p.score, fx: p.fx, fz: p.fz, dashing: p.dashT > 0 })),
    events: sim.events, phase: sim.phase, time: sim.time, phaseT: sim.phaseT, round: sim.round, roundWinner: sim.lastRoundWinner, matchWinner: sim.matchWinner,
  };
}
function playEvents(events) {
  for (const e of events) {
    if (e.t === 'bump') sfx.bump(e.s);
    else if (e.t === 'dash') sfx.dash();
    else if (e.t === 'fall') { sfx.fall(); sfx.crowd('ooh'); }
    else if (e.t === 'roundEnd') { if (e.winner === app.myId) sfx.win(); else sfx.lose(); sfx.crowd('cheer'); }
  }
}

// ---------- HUD ----------
function updateHud(v) {
  const me = v.players.find(p => p.id === app.myId);
  const key = v.players.map(p => `${p.id}:${p.name}:${p.score}:${p.alive ? 1 : 0}:${p.id === app.myId ? 1 : 0}`).join('|');
  if (key !== app._scoreKey) { app._scoreKey = key; $('scores').innerHTML = v.players.map(p => `<div class="sc${p.alive ? '' : ' out'}${p.id === app.myId ? ' me' : ''}"><div class="dot" style="background:${colourOf(p.look)}"></div>${esc(p.name || 'Rumbler')}<div class="pips">${[0, 1, 2].map(i => `<div class="pip${i < p.score ? ' on' : ''}"></div>`).join('')}</div></div>`).join(''); }
  const tEl = $('timer');
  if (v.phase === PHASE.PLAY) { const left = Math.max(0, ROUND_TIME - v.time); tEl.textContent = left > 0 ? Math.ceil(left) : 'SUDDEN DEATH'; tEl.classList.toggle('sudden', left <= 0); if (left <= 0 && !app._sudden) { app._sudden = true; sfx.sudden(); } if (left > 0) app._sudden = false; }
  else tEl.textContent = v.phase === PHASE.COUNTDOWN ? `Round ${v.round}` : '';
  $('dash').querySelector('.cd').style.height = me && me.alive ? `${Math.min(100, (me.dashCd / 2.4) * 100)}%` : '0%';
  let msg = '';
  if (v.phase === PHASE.COUNTDOWN) { const n = Math.ceil(v.phaseT - 0.2); msg = n > 0 ? String(n) : 'GO!'; if (n !== app.countdownShown) { app.countdownShown = n; sfx.beep(n <= 0); } }
  else if (v.phase === PHASE.ROUND_END) { const w = v.players.find(p => p.id === v.roundWinner); msg = w ? `${esc(w.name || 'Rumbler')}<small>wins the round</small>` : 'Draw!'; if (v.matchWinner && w) msg = `${esc(w.name)}<small>wins the match!</small>`; }
  else if (v.phase === PHASE.PLAY && me && !me.alive) msg = '<small>Knocked off! Watch the rest…</small>';
  if (msg !== app.lastMsgKey) { app.lastMsgKey = msg; $('msg').innerHTML = msg; $('msg').classList.toggle('show', !!msg); }
  if (app.mode === 'client' && app.net) $('ping').textContent = (app.net.rtt ? `${Math.round(app.net.rtt)} ms` : '') + (app.net.kind === 'relay' ? ' relay' : '');
}
function showMatchEnd(v) {
  const sorted = [...v.players].sort((a, b) => b.score - a.score), w = sorted[0];
  $('winnerPic').src = thumbOf(w.look);
  $('winnerText').textContent = w.id === app.myId ? 'You win the match!' : `${w.name || 'Rumbler'} wins the match!`;
  $('podium').innerHTML = sorted.map((p, i) => `<div class="prow"><img src="${thumbOf(p.look)}" alt="" />${i + 1}. ${esc(p.name || 'Rumbler')}<span class="sub">${p.score} win${p.score === 1 ? '' : 's'}</span></div>`).join('');
  $('btnAgain').hidden = app.mode === 'client'; $('againHint').hidden = app.mode !== 'client';
  screens.show('end');
  if (w.id === app.myId) sfx.fanfare();
}
function leave() {
  if (app.net) { app.net.close(); app.net = null; }
  app.mode = null; app.sim = null; app.snaps = []; app.lobby = []; app.myId = 'host'; pred.reset();
  renderer.clearActors(); renderer.setMyId(null);
  $('msg').classList.remove('show'); app.lastMsgKey = ''; app._scoreKey = '';
  history.replaceState(null, '', location.pathname);
  screens.show('title');
}

// ---------- update loop (worker timer, so the host keeps ticking in a background tab) ----------
let last = performance.now(), acc = 0, endShown = false, latestView = null;
function update(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  let view = null;
  if ((app.mode === 'solo' || app.mode === 'host') && app.sim) {
    const sim = app.sim;
    if (sim.phase !== PHASE.LOBBY) {
      const me = sim.players.find(p => p.id === 'host'), inp = input.read();
      if (me) { me.input.x = inp.x; me.input.y = inp.y; if (inp.dash) me.input.dash = true; }
      if (now - app.lastBotThink > 100) { app.lastBotThink = now; const P = sim.players.filter(p => p.connected); for (const b of P) if (b.isBot) botThink(sim, b, P); }
      acc += dt; const merged = [];
      while (acc >= TICK) { stepSim(sim, TICK); acc -= TICK; if (sim.events.length) merged.push(...sim.events); }
      if (merged.length) playEvents(merged);
      view = hostView(sim); view.events = merged;
      if (app.mode === 'host' && app.net && now - app.lastSend > (app.net.hasRelayClients() ? 80 : 50)) { app.lastSend = now; const s = snapshot(sim); s.ev = merged; app.net.broadcast(s); }
      if (sim.phase === PHASE.MATCH_END && !endShown) { endShown = true; showMatchEnd(view); }
      if (sim.phase !== PHASE.MATCH_END) endShown = false;
    } else if (app.mode === 'host') view = hostView(sim);
  } else if (app.mode === 'client') {
    const inp = input.read(); if (inp.dash) app._dashQueued = true;
    pred.step(app.snaps, app.myId, inp, dt, app.net ? app.net.rtt : 0, now);
    view = clientView(now);
    if (app.net && now - app.lastSend > (app.net.kind === 'relay' ? 80 : 50)) {
      app.lastSend = now; const d = app._dashQueued; app._dashQueued = false;
      if (d || inp.x !== app._lx || inp.y !== app._ly || now - (app._lastForce || 0) > 500) { app._lx = inp.x; app._ly = inp.y; app._lastForce = now; app.net.send({ t: 'in', x: +inp.x.toFixed(2), y: +inp.y.toFixed(2), d: d ? 1 : 0 }); }
    }
    if (view && view.phase === PHASE.MATCH_END && !endShown) { endShown = true; showMatchEnd(view); }
    if (view && view.phase !== PHASE.MATCH_END) endShown = false;
  }
  if (view) { if (latestView && latestView.events && latestView.events.length && !latestView.rendered) view.events = latestView.events.concat(view.events || []); latestView = view; }
  else latestView = null;
  if (screens.current === null && view) updateHud(view);
}
try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16);'], { type: 'text/javascript' }))); w.onmessage = () => update(performance.now()); }
catch (e) { setInterval(() => update(performance.now()), 16); }

let lastRender = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // clamp at 0: the first rAF timestamp can predate performance.now() taken after a long module load
  const dt = Math.max(0, Math.min(0.1, (now - lastRender) / 1000)); lastRender = now;
  if (screens.current === 'wardrobe') return; // the wardrobe has its own viewport; rest the big scene
  if (latestView) { renderer.render(latestView, dt); latestView.rendered = true; latestView.events = []; }
  else renderer.render({ tilt: { x: Math.sin(now / 1500) * 0.06, z: Math.cos(now / 1900) * 0.06 }, players: [], events: [], phase: PHASE.LOBBY }, dt);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}));
