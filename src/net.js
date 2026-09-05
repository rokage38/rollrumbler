import { Peer } from 'peerjs';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() { let s = ''; for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
const peerId = code => 'bumperballs-' + code.toUpperCase();

const env = import.meta.env || {};
const PEER_OPTS = {
  debug: 1,
  ...(env.VITE_PEER_HOST ? { host: env.VITE_PEER_HOST, port: Number(env.VITE_PEER_PORT || 443), path: env.VITE_PEER_PATH || '/', secure: env.VITE_PEER_SECURE !== 'false' } : {}),
  config: { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Optional TURN relay for strict mobile networks: set VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS at build time.
    ...(env.VITE_TURN_URL ? [{ urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS }] : []),
  ] },
};

export class Host {
  constructor(code, handlers) {
    this.code = code;
    this.handlers = handlers; // { onOpen, onJoin(conn,id,msg), onLeave(id), onInput(id,msg), onError }
    this.conns = new Map();
    this.peer = new Peer(peerId(code), PEER_OPTS);
    this.peer.on('open', () => handlers.onOpen && handlers.onOpen());
    this.peer.on('error', (e) => handlers.onError && handlers.onError(e));
    this.peer.on('connection', (conn) => {
      const id = conn.peer;
      conn.on('open', () => { this.conns.set(id, conn); });
      conn.on('data', (m) => {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'join') handlers.onJoin(conn, id, m);
        else if (m.t === 'in') handlers.onInput(id, m);
        else if (m.t === 'ping') conn.send({ t: 'pong', k: m.k });
      });
      const gone = () => { this.conns.delete(id); handlers.onLeave(id); };
      conn.on('close', gone); conn.on('error', gone);
    });
  }
  send(id, m) { const c = this.conns.get(id); if (c && c.open) c.send(m); }
  broadcast(m) { for (const c of this.conns.values()) if (c.open) c.send(m); }
  close() { try { this.peer.destroy(); } catch {} }
}

export class Client {
  constructor(code, joinMsg, handlers) {
    this.handlers = handlers; // { onOpen, onMessage, onClose, onError }
    this.peer = new Peer(PEER_OPTS);
    this.conn = null;
    this.rtt = 0;
    this.peer.on('open', () => {
      const conn = this.peer.connect(peerId(code), { reliable: false, serialization: 'json' });
      this.conn = conn;
      const timer = setTimeout(() => { if (!conn.open) handlers.onError(new Error('Could not reach that room. Check the code and try again.')); }, 12000);
      conn.on('open', () => { clearTimeout(timer); conn.send({ t: 'join', ...joinMsg }); handlers.onOpen && handlers.onOpen(); this._pingLoop(); });
      conn.on('data', (m) => {
        if (m && m.t === 'pong') { this.rtt = performance.now() - m.k; return; }
        handlers.onMessage(m);
      });
      conn.on('close', () => handlers.onClose && handlers.onClose());
      conn.on('error', (e) => handlers.onError && handlers.onError(e));
    });
    this.peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') handlers.onError(new Error('No room with that code. Ask the host to check it.'));
      else handlers.onError(e);
    });
  }
  _pingLoop() { this._pt = setInterval(() => { if (this.conn && this.conn.open) this.conn.send({ t: 'ping', k: performance.now() }); }, 2000); }
  send(m) { if (this.conn && this.conn.open) this.conn.send(m); }
  close() { clearInterval(this._pt); try { this.peer.destroy(); } catch {} }
}
