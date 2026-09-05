import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const svg = fs.readFileSync('public/icon.svg', 'utf8');
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:#5aa9ff">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: false });
  await page.close();
}
await browser.close();
