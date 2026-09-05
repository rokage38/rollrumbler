// Networking: the host phone runs the game. Players connect either directly (WebRTC via PeerJS,
// lowest latency) or, when that cannot get through their network, via a Supabase Realtime relay.
// The host listens on both at once; a joining phone races both and keeps whichever works first.
import { Peer } from 'peerjs';
import { RealtimeClient } from '@supabase/realtime-js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() { let s = ''; for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
const peerId = code => 'bumperballs-' + code.toUpperCase();
const roomName = code => 'rr-' + code.toUpperCase();
const uid = () => 'p' + Math.random().toString(36).slice(2, 10);

const env = import.meta.env || {};
const SB_URL = env.VITE_SB_URL || 'https://luwwclpsfqflpgzrsxby.supabase.co';
const SB_KEY = env.VITE_SB_KEY || 'sb_publishable_Jg6erblVgpUqFpQ2zrO9qg_FMKMxuUg';
const FORCE = new URLSearchParams(location.search).get('net'); // 'rtc' | 'relay' for testing

const PEER_OPTS = {
  debug: 0,
  ...(env.VITE_PEER_HOST ? { host: env.VITE_PEER_HOST, port: Number(env.VITE_PEER_PORT || 443), path: env.VITE_PEER_PATH || '/', secure: env.VITE_PEER_SECURE !== 'false' } : {}),
  config: { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
    ...(env.VITE_TURN_URL ? [{ urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS }] : []),
  ] },
};

function relayClient() { return new RealtimeClient(SB_URL.replace(/^http/, 'ws') + '/realtime/v1', { params: { apikey: SB_KEY, eventsPerSecond: 50 } }); }

export class Host {
  constructor(code, handlers) {
    this.code = code;
    this.h = handlers; // { onOpen, onJoin(id, msg), onLeave(id), onInput(id, msg), onError, onStatus }
    this.conns = new Map(); // id -> { kind: 'rtc', conn } | { kind: 'relay' }
    this.rtcOpen = false; this.relayOpen = false;
    this._startRtc(); this._startRelay();
  }
  _startRtc() {
    if (FORCE === 'relay') return;
    try {
      this.peer = new Peer(peerId(this.code), PEER_OPTS);
      this.peer.on('open', () => { this.rtcOpen = true; this._ready(); });
      this.peer.on('error', (e) => { if (e.type === 'unavailable-id') this.h.onError && this.h.onError(e); else this.h.onStatus && this.h.onStatus('Direct link unavailable, relay only.'); });
      this.peer.on('connection', (conn) => {
        const id = conn.peer;
        conn.on('open', () => this.conns.set(id, { kind: 'rtc', conn }));
        conn.on('data', (m) => this._onMsg(id, m));
        const gone = () => { if (this.conns.get(id)?.kind === 'rtc') { this.conns.delete(id); this.h.onLeave(id); } };
        conn.on('close', gone); conn.on('error', gone);
      });
    } catch (e) { /* no WebRTC support */ }
  }
  _startRelay() {
    if (FORCE === 'rtc') return;
    this.rc = relayClient();
    this.ch = this.rc.channel(roomName(this.code), { config: { broadcast: { self: false, ack: false }, presence: { key: 'host' } } });
    this.ch.on('broadcast', { event: 'c' }, ({ payload }) => {
      if (!payload || !payload.from) return;
      if (!this.conns.has(payload.from)) this.conns.set(payload.from, { kind: 'relay', last: Date.now() });
      else this.conns.get(payload.from).last = Date.now();
      this._onMsg(payload.from, payload.m);
    });
    this.ch.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences) if (p.id && this.conns.get(p.id)?.kind === 'relay') { this.conns.delete(p.id); this.h.onLeave(p.id); }
    });
    this.ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { this.relayOpen = true; this.ch.track({ id: 'host' }); this._ready(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.h.onStatus && this.h.onStatus('Relay unavailable, direct links only.');
    });
  }
  _ready() { if (!this._announced) { this._announced = true; this.h.onOpen && this.h.onOpen(); } }
  _onMsg(id, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join') this.h.onJoin(id, m);
    else if (m.t === 'in') this.h.onInput(id, m);
    else if (m.t === 'ping') this.send(id, { t: 'pong', k: m.k });
  }
  send(id, m) {
    const c = this.conns.get(id); if (!c) return;
    if (c.kind === 'rtc') { if (c.conn.open) c.conn.send(m); }
    else if (this.relayOpen) this.ch.send({ type: 'broadcast', event: 'h', payload: { to: id, m } });
  }
  broadcast(m) {
    let relayAny = false;
    for (const c of this.conns.values()) { if (c.kind === 'rtc') { if (c.conn.open) c.conn.send(m); } else relayAny = true; }
    if (relayAny && this.relayOpen) this.ch.send({ type: 'broadcast', event: 'h', payload: { to: '*', m } });
  }
  hasRelayClients() { for (const c of this.conns.values()) if (c.kind === 'relay') return true; return false; }
  kindOf(id) { return this.conns.get(id)?.kind || '?'; }
  close() { try { this.peer && this.peer.destroy(); } catch {} try { this.ch && this.ch.unsubscribe(); this.rc && this.rc.disconnect(); } catch {} }
}

export class Client {
  constructor(code, joinMsg, handlers) {
    this.h = handlers; // { onOpen(kind), onMessage, onClose, onError, onStatus }
    this.code = code; this.joinMsg = joinMsg;
    this.id = uid();
    this.kind = null; // 'rtc' | 'relay' once chosen
    this.rtt = 0;
    this._closed = false;
    const status = (t) => this.h.onStatus && this.h.onStatus(t);
    status('Looking for the room…');
    this._deadline = setTimeout(() => { if (!this.kind) this._fail('Could not connect to that room. Check the code, make sure the host is still in the lobby, then try again.'); }, 20000);
    this._startRelay(status);
    this._startRtc(status);
  }
  _fail(msg) { if (this.kind) return; this.close(); this.h.onError && this.h.onError(new Error(msg)); }
  _choose(kind) {
    if (this.kind) return false;
    this.kind = kind; clearTimeout(this._deadline); clearInterval(this._relayJoin);
    if (kind === 'rtc') { try { this.ch && this.ch.unsubscribe(); this.rc && this.rc.disconnect(); } catch {} }
    else { try { this.peer && this.peer.destroy(); } catch {} }
    this.h.onOpen && this.h.onOpen(kind);
    this._pt = setInterval(() => this.send({ t: 'ping', k: performance.now() }), 2000);
    return true;
  }
  _startRtc(status) {
    if (FORCE === 'relay') return;
    try {
      this.peer = new Peer(PEER_OPTS);
      this.peer.on('open', () => {
        if (this.kind) return;
        const conn = this.peer.connect(peerId(this.code), { reliable: false, serialization: 'json' });
        this.conn = conn;
        conn.on('open', () => { if (this._choose('rtc')) conn.send({ t: 'join', ...this.joinMsg }); });
        conn.on('data', (m) => { if (this.kind !== 'rtc') return; this._onMsg(m); });
        conn.on('close', () => { if (this.kind === 'rtc') this.h.onClose && this.h.onClose(); });
        conn.on('error', () => {});
      });
      this.peer.on('error', () => { /* the relay path carries on */ });
    } catch (e) { /* no WebRTC */ }
  }
  _startRelay(status) {
    if (FORCE === 'rtc') return;
    this.rc = relayClient();
    this.ch = this.rc.channel(roomName(this.code), { config: { broadcast: { self: false, ack: false }, presence: { key: this.id } } });
    this.ch.on('broadcast', { event: 'h' }, ({ payload }) => {
      if (!payload || (payload.to !== '*' && payload.to !== this.id)) return;
      const m = payload.m;
      if (!this.kind && m && m.t === 'welcome' && m.id === this.id) { if (!this._choose('relay')) return; }
      if (this.kind !== 'relay') return;
      this._onMsg(m);
    });
    this.ch.on('presence', { event: 'leave' }, ({ leftPresences }) => { if (this.kind === 'relay' && leftPresences.some(p => p.id === 'host')) this.h.onClose && this.h.onClose(); });
    this.ch.subscribe((st) => {
      if (st !== 'SUBSCRIBED') return;
      this.ch.track({ id: this.id });
      // Give the direct link a head start, then ask through the relay too. Whoever answers first wins.
      const wait = FORCE === 'relay' ? 0 : 3000;
      const ask = () => this.ch.send({ type: 'broadcast', event: 'c', payload: { from: this.id, m: { t: 'join', ...this.joinMsg } } });
      setTimeout(() => {
        if (this.kind || this._closed) return;
        status('Connecting through the relay…');
        ask();
        this._relayJoin = setInterval(() => { if (this.kind || this._closed) clearInterval(this._relayJoin); else ask(); }, 1500);
      }, wait);
    });
  }
  _onMsg(m) {
    if (!m) return;
    if (m.t === 'pong') { this.rtt = performance.now() - m.k; return; }
    this.h.onMessage(m);
  }
  send(m) {
    if (this.kind === 'rtc') { if (this.conn && this.conn.open) this.conn.send(m); }
    else if (this.kind === 'relay') this.ch.send({ type: 'broadcast', event: 'c', payload: { from: this.id, m } });
  }
  close() {
    this._closed = true; clearInterval(this._pt); clearInterval(this._relayJoin); clearTimeout(this._deadline);
    try { this.peer && this.peer.destroy(); } catch {}
    try { this.ch && this.ch.unsubscribe(); this.rc && this.rc.disconnect(); } catch {}
  }
}
