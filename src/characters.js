// Original cast. Each has a body colour, a ball colour pair and an accessory.
export const CHARACTERS = [
  { key: 'pip',  name: 'Pip',  body: '#ff4d4d', accent: '#ffd1d1', ball: ['#ff8a5c', '#fff3e0'], hat: 'ears' },
  { key: 'momo', name: 'Momo', body: '#3d8bff', accent: '#cfe3ff', ball: ['#5cc8ff', '#eaf7ff'], hat: 'antenna' },
  { key: 'zuzu', name: 'Zuzu', body: '#ffd23f', accent: '#fff6c9', ball: ['#ffe066', '#fffbe0'], hat: 'horns' },
  { key: 'kiki', name: 'Kiki', body: '#3ddc84', accent: '#d2f7e2', ball: ['#7ee8a6', '#ecfff3'], hat: 'leaf' },
  { key: 'bo',   name: 'Bo',   body: '#9b5cff', accent: '#e4d6ff', ball: ['#c39bff', '#f4eeff'], hat: 'crown' },
  { key: 'nib',  name: 'Nib',  body: '#ff8c1a', accent: '#ffe1c2', ball: ['#ffb266', '#fff2e6'], hat: 'fin' },
  { key: 'tux',  name: 'Tux',  body: '#2b2f3a', accent: '#ffffff', ball: ['#5a6070', '#e6e8ee'], hat: 'bow' },
  { key: 'lulu', name: 'Lulu', body: '#ff5fb8', accent: '#ffd9ee', ball: ['#ff9ad1', '#fff0f8'], hat: 'flower' },
];

export const charByKey = k => CHARACTERS.find(c => c.key === k) || CHARACTERS[0];
