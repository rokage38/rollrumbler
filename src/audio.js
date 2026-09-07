// Synthesised sound: effects, crowd, and a small generative music loop. No files to load.
export class Sfx {
  constructor() {
    this.ctx = null; this.muted = false; this.musicOn = true; this._musicMode = null; this._musicTimer = null;
    try { this.muted = localStorage.getItem('rr-mute') === '1'; this.musicOn = localStorage.getItem('rr-music') !== '0'; } catch {}
  }
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.muted ? 0 : 0.9; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.28 : 0; this.musicBus.connect(this.master);
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; this.master.disconnect(); this.master.connect(comp); comp.connect(this.ctx.destination);
      if (this._musicMode) this._startMusic(this._musicMode);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  setMuted(m) { this.muted = m; try { localStorage.setItem('rr-mute', m ? '1' : '0'); } catch {} if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02); }
  setMusic(on) { this.musicOn = on; try { localStorage.setItem('rr-music', on ? '1' : '0'); } catch {} if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.28 : 0, this.ctx.currentTime, 0.05); }
  _osc(type, f0, f1, dur, vol = 0.3, delay = 0, bus = null) {
    if (!this.ctx) return null;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  _noise(dur, vol = 0.25, type = 'highpass', freq = 800, q = 1, delay = 0, bus = null) {
    if (!this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), t = c.currentTime + delay;
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 1.5;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(bus || this.sfxBus); s.start(t);
  }
  // ---- effects ----
  bump(s = 0.5) {
    this._osc('sine', 160 + s * 80, 50, 0.16, 0.5 + s * 0.3);                   // body thud
    this._osc('square', 900 + s * 400, 300, 0.05, 0.08);                          // click
    this._noise(0.1, 0.25 + s * 0.3, 'bandpass', 1800, 0.8);                      // slap
    if (s > 0.6) this._noise(0.25, 0.2, 'lowpass', 600, 1, 0.01);                 // heavy hit rumble
  }
  dash() { this._noise(0.28, 0.35, 'bandpass', 1200, 0.6); this._osc('sawtooth', 220, 1200, 0.22, 0.09); this._osc('sine', 500, 1600, 0.18, 0.06, 0.02); }
  fall() { this._osc('sine', 900, 140, 0.9, 0.35); this._osc('triangle', 1200, 200, 0.7, 0.12, 0.05); this._noise(0.4, 0.12, 'highpass', 2500, 1, 0.4); }
  beep(high = false) { this._osc('square', high ? 880 : 520, high ? 880 : 520, high ? 0.4 : 0.12, 0.18); if (high) this._osc('square', 1320, 1320, 0.4, 0.08); }
  win() { [523, 659, 784, 1046].forEach((f, i) => { this._osc('triangle', f, f, 0.28, 0.25, i * 0.11); this._osc('square', f * 2, f * 2, 0.2, 0.05, i * 0.11); }); }
  lose() { [400, 300, 200].forEach((f, i) => this._osc('triangle', f, f * 0.9, 0.3, 0.18, i * 0.18)); }
  click() { this._osc('sine', 700, 500, 0.06, 0.12); }
  pop() { this._osc('sine', 300, 900, 0.12, 0.2); this._noise(0.05, 0.1, 'highpass', 3000); }
  sudden() { for (let i = 0; i < 3; i++) { this._osc('square', 200, 200, 0.18, 0.25, i * 0.25); this._osc('square', 100, 100, 0.18, 0.2, i * 0.25); } }
  fanfare() { [523, 523, 523, 659, 784, 1046, 784, 1046].forEach((f, i) => { this._osc('square', f, f, i === 7 ? 0.7 : 0.16, 0.12, i * 0.14); this._osc('triangle', f / 2, f / 2, i === 7 ? 0.7 : 0.16, 0.15, i * 0.14); }); }
  crowd(kind) {
    if (!this.ctx) return;
    if (kind === 'ooh') { const n = this._osc('sawtooth', 220, 180, 0.9, 0.05); this._noise(0.9, 0.12, 'bandpass', 700, 2); this._noise(0.9, 0.08, 'bandpass', 350, 3, 0.05); }
    else { for (let i = 0; i < 5; i++) this._noise(1.6, 0.1, 'bandpass', 900 + i * 350, 2.5, i * 0.03); for (let i = 0; i < 4; i++) this._osc('sawtooth', 300 + i * 90, 280 + i * 90, 1.2, 0.02, i * 0.05); }
  }
  // ---- music: a light carnival loop, generated note by note ----
  music(mode) {
    if (mode === this._musicMode) return;
    this._musicMode = mode;
    if (this.ctx) this._startMusic(mode);
  }
  _startMusic(mode) {
    clearInterval(this._musicTimer);
    if (!mode) return;
    const c = this.ctx;
    const bpm = mode === 'match' ? 132 : 104, beat = 60 / bpm;
    const bass = [0, 0, 7, 7, 5, 5, 7, 7, 0, 0, 7, 7, 9, 9, 7, 7];
    const lead = [12, 16, 19, 16, 12, 16, 19, 23, 14, 17, 21, 17, 12, 16, 19, 24];
    const root = 130.81; // C3
    const f = (semi) => root * Math.pow(2, semi / 12);
    let step = 0, nextT = c.currentTime + 0.1;
    const schedule = () => {
      while (nextT < c.currentTime + 0.5) {
        const i = step % 16, bar = Math.floor(step / 16);
        const t0 = nextT - c.currentTime;
        // oom-pah bass
        this._osc('triangle', f(bass[i] - 12), f(bass[i] - 12), beat * 0.9, i % 2 === 0 ? 0.32 : 0.0001, t0, this.musicBus);
        if (i % 2 === 1) { this._osc('square', f(bass[i]), f(bass[i]), beat * 0.4, 0.07, t0, this.musicBus); this._osc('square', f(bass[i] + 4), f(bass[i] + 4), beat * 0.4, 0.05, t0, this.musicBus); }
        // lead every other bar (menu) or always (match)
        if (mode === 'match' || bar % 2 === 1) this._osc('square', f(lead[i]), f(lead[i]), beat * 0.5, 0.08, t0, this.musicBus);
        // hats
        if (mode === 'match') this._noise(0.04, i % 4 === 2 ? 0.08 : 0.04, 'highpass', 6000, 1, t0, this.musicBus);
        step++; nextT += beat / 2;
      }
    };
    schedule();
    this._musicTimer = setInterval(schedule, 200);
  }
}
