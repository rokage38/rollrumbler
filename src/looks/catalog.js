// Everything a rumbler can be: the catalogue of parts, colours, and the look data model.

export const PALETTE = [
  ['Cherry', '#ff4d6d'], ['Tangerine', '#ff8c42'], ['Sunny', '#ffd23f'], ['Lime', '#9ef01a'],
  ['Mint', '#3ddc84'], ['Teal', '#1fbfb8'], ['Sky', '#4cc9f0'], ['Royal', '#4361ee'],
  ['Grape', '#8338ec'], ['Bubblegum', '#ff5fb8'], ['Blush', '#ffb3c6'], ['Cream', '#fff1d6'],
  ['Cocoa', '#7a4b2a'], ['Slate', '#4a5568'], ['Ink', '#22223b'], ['Snow', '#ffffff'],
];

export const SLOTS = [
  { key: 'body', label: 'Body', options: [['round', 'Round'], ['egg', 'Egg'], ['squat', 'Squat'], ['tall', 'Tall'], ['bean', 'Bean'], ['pear', 'Pear']] },
  { key: 'color', label: 'Colour', palette: true },
  { key: 'accent', label: 'Accent', palette: true },
  { key: 'pattern', label: 'Skin', options: [['plain', 'Plain'], ['stripes', 'Stripes'], ['spots', 'Spots'], ['belly', 'Belly'], ['stars', 'Stars'], ['hearts', 'Hearts'], ['zigzag', 'Zigzag'], ['checks', 'Checks'], ['lightning', 'Bolt'], ['freckles', 'Freckles']] },
  { key: 'outfit', label: 'Outfit', options: [['none', 'None'], ['tee', 'T-shirt'], ['dungarees', 'Dungarees'], ['hoodie', 'Hoodie'], ['tux', 'Tuxedo'], ['sailor', 'Sailor'], ['dress', 'Dress'], ['football', 'Kit'], ['pyjamas', 'Pyjamas']] },
  { key: 'eyes', label: 'Eyes', options: [['big', 'Big'], ['dot', 'Dots'], ['sleepy', 'Sleepy'], ['angry', 'Fierce'], ['wink', 'Wink'], ['sparkle', 'Sparkle'], ['lashes', 'Lashes'], ['shades', 'Shades'], ['glasses', 'Glasses'], ['cyclops', 'Cyclops'], ['star', 'Starry']] },
  { key: 'mouth', label: 'Mouth', options: [['smile', 'Smile'], ['grin', 'Grin'], ['o', 'Oh'], ['smirk', 'Smirk'], ['fangs', 'Fangs'], ['tash', 'Moustache'], ['tongue', 'Tongue'], ['beak', 'Beak'], ['flat', 'Meh'], ['beard', 'Beard'], ['buck', 'Buck teeth']] },
  { key: 'hat', label: 'Hat', options: [['none', 'None'], ['crown', 'Crown'], ['cap', 'Cap'], ['tophat', 'Top hat'], ['party', 'Party hat'], ['cowboy', 'Cowboy'], ['wizard', 'Wizard'], ['astro', 'Space helmet'], ['beret', 'Beret'], ['cone', 'Traffic cone'], ['bucket', 'Bucket'], ['pirate', 'Pirate'], ['viking', 'Viking'], ['chef', 'Chef'], ['beanie', 'Beanie'], ['sombrero', 'Sombrero'], ['headphones', 'Headphones'], ['propeller', 'Propeller'], ['halo', 'Halo'], ['antenna', 'Antenna'], ['ears', 'Round ears'], ['bunny', 'Bunny ears'], ['cat', 'Cat ears'], ['horns', 'Horns'], ['unicorn', 'Unicorn'], ['flower', 'Flower'], ['bow', 'Bow'], ['mohawk', 'Mohawk'], ['leaf', 'Sprout'], ['fin', 'Shark fin'], ['crownflower', 'Flower crown']] },
  { key: 'extra', label: 'Extra', options: [['none', 'None'], ['cape', 'Cape'], ['scarf', 'Scarf'], ['bowtie', 'Bow tie'], ['tie', 'Tie'], ['backpack', 'Backpack'], ['jetpack', 'Jetpack'], ['wings', 'Wings'], ['batwings', 'Bat wings'], ['tail', 'Tail'], ['sash', 'Sash'], ['balloon', 'Balloon'], ['shield', 'Shield'], ['guitar', 'Guitar']] },
  { key: 'ball', label: 'Ball', options: [['stripes', 'Stripes'], ['beach', 'Beach ball'], ['soccer', 'Football'], ['basketball', 'Basketball'], ['disco', 'Disco'], ['globe', 'Globe'], ['candy', 'Candy swirl'], ['galaxy', 'Galaxy'], ['ladybird', 'Ladybird'], ['watermelon', 'Watermelon'], ['eight', 'Eight ball'], ['donut', 'Sprinkles'], ['tennis', 'Tennis'], ['bomb', 'Bomb'], ['planet', 'Ringed planet']] },
  { key: 'ballColor', label: 'Ball colour', palette: true },
];
const slot = k => SLOTS.find(s => s.key === k);
const has = (k, v) => { const s = slot(k); return s && s.options && s.options.some(o => o[0] === v); };

export const BOT_NAMES = ['Sir Wobbles', 'Cpt Bounce', 'Lady Tumble', 'Doodle', 'Pickle', 'Sprocket', 'Mango', 'Biscuit', 'Zoomer', 'Nugget', 'Waffles', 'Pudding', 'Turbo', 'Noodle', 'Gizmo', 'Peaches', 'Bumble', 'Ziggy'];

const pick = (k) => { const o = slot(k).options; return o[Math.floor(Math.random() * o.length)][0]; };
const pickIdx = () => Math.floor(Math.random() * PALETTE.length);

export function defaultLook() {
  return { body: 'round', color: 9, accent: 11, pattern: 'belly', outfit: 'none', eyes: 'big', mouth: 'smile', hat: 'none', extra: 'none', ball: 'stripes', ballColor: 1 };
}
export function randomLook() {
  let color = pickIdx(), accent = pickIdx(); if (accent === color) accent = (accent + 5) % PALETTE.length;
  return {
    body: pick('body'), color, accent, pattern: Math.random() < 0.7 ? pick('pattern') : 'plain', outfit: Math.random() < 0.6 ? pick('outfit') : 'none',
    eyes: pick('eyes'), mouth: pick('mouth'), hat: Math.random() < 0.85 ? pick('hat') : 'none', extra: Math.random() < 0.55 ? pick('extra') : 'none',
    ball: pick('ball'), ballColor: pickIdx(),
  };
}
export function normaliseLook(l) {
  const d = defaultLook(); if (!l || typeof l !== 'object') return d;
  const idx = v => (Number.isInteger(v) && v >= 0 && v < PALETTE.length) ? v : 0;
  const out = {};
  for (const s of SLOTS) {
    if (s.palette) out[s.key] = idx(l[s.key]);
    else out[s.key] = has(s.key, l[s.key]) ? l[s.key] : (s.options.some(o => o[0] === 'none') ? 'none' : d[s.key]);
  }
  if (!l.outfit && l.pattern === 'twotone') out.outfit = 'tee';
  return out;
}
export const lookKey = l => JSON.stringify(normaliseLook(l));
export const colourOf = l => PALETTE[normaliseLook(l).color][1];
export const accentOf = l => PALETTE[normaliseLook(l).accent][1];
