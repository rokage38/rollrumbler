// Screen router with a small fade/slide transition. Screens are <section class="screen"> elements.
const $ = id => document.getElementById(id);
const ALL = ['title', 'play', 'wardrobe', 'settings', 'lobby', 'end'];

export class Screens {
  constructor() { this.current = 'title'; this.listeners = []; }
  onChange(fn) { this.listeners.push(fn); }
  // show(null) = in-game (HUD only)
  show(name) {
    const prev = this.current; this.current = name;
    for (const s of ALL) {
      const el = $(s);
      if (s === name) { el.hidden = false; el.classList.add('entering'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('entering'))); }
      else if (!el.hidden) { el.classList.add('leaving'); setTimeout(() => { if (this.current !== s) { el.hidden = true; el.classList.remove('leaving'); } }, 220); }
    }
    $('hud').hidden = name !== null; $('layer').hidden = name !== null;
    for (const fn of this.listeners) fn(name, prev);
  }
}
