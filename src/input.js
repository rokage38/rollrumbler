// Floating touch joystick (anywhere on screen) + dash button + keyboard fallback.
export class Input {
  constructor(layer, stickEl, dashEl) {
    this.x = 0; this.y = 0; this.dashQueued = false;
    this.stickId = null; this.origin = null;
    this.stickEl = stickEl; this.knob = stickEl.querySelector('.knob');
    this.keys = new Set();
    const R = 48;

    const start = (e) => {
      for (const t of e.changedTouches) {
        if (this.stickId !== null) continue;
        this.stickId = t.identifier; this.origin = { x: t.clientX, y: t.clientY };
        this.stickEl.style.display = 'block';
        this.stickEl.style.left = t.clientX + 'px'; this.stickEl.style.top = t.clientY + 'px';
        this.knob.style.transform = 'translate(-50%,-50%)';
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.stickId) continue;
        let dx = t.clientX - this.origin.x, dy = t.clientY - this.origin.y;
        const d = Math.hypot(dx, dy);
        const cl = Math.min(d, R);
        if (d > 0) { dx = dx / d * cl; dy = dy / d * cl; }
        this.x = dx / R; this.y = dy / R;
        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.stickId) continue;
        this.stickId = null; this.x = 0; this.y = 0;
        this.stickEl.style.display = 'none';
      }
      e.preventDefault();
    };
    layer.addEventListener('touchstart', start, { passive: false });
    layer.addEventListener('touchmove', move, { passive: false });
    layer.addEventListener('touchend', end, { passive: false });
    layer.addEventListener('touchcancel', end, { passive: false });

    // mouse (desktop testing)
    let mouseDown = false;
    layer.addEventListener('mousedown', (e) => { mouseDown = true; this.origin = { x: e.clientX, y: e.clientY }; this.stickEl.style.display = 'block'; this.stickEl.style.left = e.clientX + 'px'; this.stickEl.style.top = e.clientY + 'px'; });
    window.addEventListener('mousemove', (e) => {
      if (!mouseDown) return;
      let dx = e.clientX - this.origin.x, dy = e.clientY - this.origin.y; const d = Math.hypot(dx, dy); const cl = Math.min(d, R);
      if (d > 0) { dx = dx / d * cl; dy = dy / d * cl; }
      this.x = dx / R; this.y = dy / R; this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    window.addEventListener('mouseup', () => { if (!mouseDown) return; mouseDown = false; this.x = 0; this.y = 0; this.stickEl.style.display = 'none'; });

    const dash = (e) => { this.dashQueued = true; e.preventDefault(); e.stopPropagation(); dashEl.classList.add('pressed'); setTimeout(() => dashEl.classList.remove('pressed'), 120); };
    dashEl.addEventListener('touchstart', dash, { passive: false });
    dashEl.addEventListener('mousedown', dash);

    window.addEventListener('keydown', (e) => { this.keys.add(e.code); if (e.code === 'Space') this.dashQueued = true; });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  read() {
    let x = this.x, y = this.y;
    if (this.stickId === null && this.keys.size) {
      const k = this.keys;
      x = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
      y = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
    }
    const dash = this.dashQueued; this.dashQueued = false;
    // small dead zone, then a slight curve so fine control is easier near the centre
    const m = Math.hypot(x, y);
    if (m > 0) { const dz = 0.1; const mm = m < dz ? 0 : Math.min(1, (m - dz) / (1 - dz)); const curved = Math.pow(mm, 1.3); x = x / m * curved; y = y / m * curved; }
    return { x, y, dash };
  }
}
