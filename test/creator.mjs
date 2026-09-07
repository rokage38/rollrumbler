import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION/.test(m.text())) errs.push(m.text()); });
await page.goto(process.env.URL || 'http://localhost:4173/'); await page.waitForTimeout(1000);
await page.fill('#name', 'Ro');
for (const [tab, val] of [['hat', 'crown'], ['extra', 'cape'], ['eyes', 'shades'], ['mouth', 'grin'], ['pattern', 'stars'], ['ball', 'beach'], ['body', 'egg']]) {
  await page.click(`.tab[data-k="${tab}"]`); await page.click(`.opt[data-v="${val}"]`);
}
await page.click('.tab[data-k="color"]'); await page.click('.opt[data-v="2"]');
await page.waitForTimeout(800);
await page.screenshot({ path: 'test/30-creator.png' });
const look = await page.evaluate(() => localStorage.getItem('rr-look'));
console.log('saved look:', look);
// lobby thumbnails
await page.click('#btnHost'); await page.waitForTimeout(1500);
await page.screenshot({ path: 'test/31-lobby.png' });
await page.click('#btnLobbyLeave'); await page.waitForTimeout(300);
await page.click('#btnSolo'); await page.waitForTimeout(4500);
await page.screenshot({ path: 'test/32-play.png' });
await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(1500);
await page.screenshot({ path: 'test/33-land.png' });
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await browser.close();
