import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto('' + (process.env.URL || 'http://localhost:4173/') + '');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'test/01-home.png' });
await page.fill('#name', 'Ro');
await page.click('.chip[data-key="momo"]');
await page.click('#btnSolo');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'test/02-countdown.png' });
await page.waitForTimeout(2500);
// hold the stick to the right for a bit using touch
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 650 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 160, y: 620 }] });
await page.waitForTimeout(900);
await page.screenshot({ path: 'test/03-play.png' });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
// dash button
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y: 780 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'test/04-play-later.png' });
// let the bots finish a few rounds
await page.waitForTimeout(25000);
await page.screenshot({ path: 'test/05-later.png' });
const hud = await page.evaluate(() => ({ scores: document.getElementById('scores').innerText, timer: document.getElementById('timer').innerText, msg: document.getElementById('msg').innerText, end: !document.getElementById('end').hidden }));
console.log(JSON.stringify(hud));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
