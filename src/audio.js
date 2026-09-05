// Tiny synthesised sound effects. No files to load.
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; }
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  _osc(type, f0, f1, dur, vol = 0.3, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(dur, vol = 0.25, hp = 800) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start();
  }
  bump(s = 0.5) { this._osc('square', 180 + s * 120, 60, 0.12, 0.25 + s * 0.2); this._noise(0.08, 0.15 + s * 0.2, 1200); }
  dash() { this._osc('sawtooth', 300, 900, 0.18, 0.12); this._noise(0.15, 0.08, 2000); }
  fall() { this._osc('sine', 700, 120, 0.7, 0.3); }
  beep(high = false) { this._osc('square', high ? 880 : 440, high ? 880 : 440, high ? 0.35 : 0.12, 0.2); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this._osc('triangle', f, f, 0.25, 0.25, i * 0.12)); }
  lose() { [400, 300, 200].forEach((f, i) => this._osc('triangle', f, f * 0.9, 0.3, 0.2, i * 0.18)); }
  click() { this._osc('sine', 600, 500, 0.06, 0.15); }
}
