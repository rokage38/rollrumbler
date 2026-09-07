import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(process.env.URL || 'http://localhost:4173/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
await page.click('#tWardrobe'); await page.waitForTimeout(800);
const looks = [
  { body: 'round', color: 9, accent: 2, pattern: 'belly', outfit: 'tee', eyes: 'big', mouth: 'smile', hat: 'crown', extra: 'cape', ball: 'beach', ballColor: 0 },
  { body: 'tall', color: 6, accent: 15, pattern: 'plain', outfit: 'tux', eyes: 'shades', mouth: 'smirk', hat: 'tophat', extra: 'bowtie', ball: 'eight', ballColor: 0 },
  { body: 'squat', color: 3, accent: 8, pattern: 'spots', outfit: 'dungarees', eyes: 'lashes', mouth: 'grin', hat: 'bunny', extra: 'balloon', ball: 'candy', ballColor: 9 },
  { body: 'egg', color: 1, accent: 11, pattern: 'stripes', outfit: 'sailor', eyes: 'angry', mouth: 'fangs', hat: 'viking', extra: 'shield', ball: 'soccer', ballColor: 0 },
];
for (let i = 0; i < looks.length; i++) {
  await page.evaluate((l) => { localStorage.setItem('rr-look', JSON.stringify(l)); }, looks[i]);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); await page.click('#tWardrobe'); await page.waitForTimeout(1400);
  await page.screenshot({ path: `test/6${i}-look.png`, clip: { x: 16, y: 70, width: 358, height: 340 } });
}
await browser.close();
