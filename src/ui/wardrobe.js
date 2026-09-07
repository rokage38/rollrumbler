// The wardrobe: category tabs, option grid, live preview. Owns the player's saved look.
import { SLOTS, PALETTE, randomLook, normaliseLook } from '../looks/catalog.js';
const $ = id => document.getElementById(id);

export class Wardrobe {
  constructor(preview, sfx, onChange) {
    this.preview = preview; this.sfx = sfx; this.onChange = onChange;
    this.tab = 'body';
    try { const l = localStorage.getItem('rr-look'); this.look = l ? normaliseLook(JSON.parse(l)) : randomLook(); } catch { this.look = randomLook(); }
    $('btnRandom').onclick = () => { this.look = randomLook(); sfx.unlock(); sfx.pop(); this.save(); this.apply(); this.renderOpts(); };
    this.renderTabs(); this.renderOpts();
  }
  save() { try { localStorage.setItem('rr-look', JSON.stringify(this.look)); } catch {} this.onChange && this.onChange(this.look); }
  apply() { this.preview.setLook(this.look); }
  setName(n) { $('pvname').textContent = n || 'Rumbler'; }
  renderTabs() {
    $('tabs').innerHTML = SLOTS.map(s => `<button class="tab${s.key === this.tab ? ' on' : ''}" data-k="${s.key}">${s.label}</button>`).join('');
    $('tabs').querySelectorAll('.tab').forEach(b => b.onclick = () => { this.tab = b.dataset.k; this.sfx.click(); this.renderTabs(); this.renderOpts(); b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
  }
  renderOpts() {
    const slot = SLOTS.find(s => s.key === this.tab), wrap = $('opts'), k = slot.key;
    if (slot.palette) wrap.innerHTML = PALETTE.map(([name, hex], i) => `<div class="opt swatch${this.look[k] === i ? ' on' : ''}" data-v="${i}" style="background:${hex}" title="${name}">${name}</div>`).join('');
    else wrap.innerHTML = slot.options.map(([v, label]) => `<div class="opt${this.look[k] === v ? ' on' : ''}" data-v="${v}">${label}</div>`).join('');
    wrap.querySelectorAll('.opt').forEach(o => o.onclick = () => { this.look[k] = slot.palette ? Number(o.dataset.v) : o.dataset.v; this.sfx.unlock(); this.sfx.click(); this.save(); this.apply(); this.renderOpts(); });
  }
}
