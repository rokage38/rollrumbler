import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const mk = async (label) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'log') console.log(`[${label}] ${m.text()}`); });
  page.on('pageerror', e => console.log(`[${label}] PAGEERROR ${e.message}`));
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(800);
  return { ctx, page };
};
const host = await mk('host'), guest = await mk('guest');
await host.page.fill('#name', 'Ro'); await host.page.click('.chip[data-key="momo"]'); await host.page.click('#btnHost');
await host.page.waitForFunction(() => document.getElementById('lobbyHint').textContent.startsWith('Room open'), null, { timeout: 20000 });
const code = await host.page.textContent('#lobbyCode');
console.log('room code', code);
await guest.page.fill('#name', 'Mahmoud'); await guest.page.click('.chip[data-key="momo"]'); // same char on purpose
await guest.page.click('#btnJoinOpen'); await guest.page.fill('#code', code); await guest.page.click('#btnJoin');
await guest.page.waitForFunction(() => document.getElementById('lobbyHint').textContent.startsWith('Connected'), null, { timeout: 25000 });
await host.page.waitForTimeout(1000);
console.log('host lobby:', (await host.page.innerText('#plist')).replace(/\n/g, ' | '));
console.log('guest lobby:', (await guest.page.innerText('#plist')).replace(/\n/g, ' | '));
await host.page.screenshot({ path: 'test/10-host-lobby.png' });
await guest.page.screenshot({ path: 'test/11-guest-lobby.png' });
await host.page.click('#btnStart');
await guest.page.waitForFunction(() => document.getElementById('hud').hidden === false, null, { timeout: 10000 });
await host.page.waitForTimeout(4000); // countdown
// guest pushes stick up-left
const cdp = await guest.ctx.newCDPSession(guest.page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 650 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 70, y: 600 }] });
await host.page.waitForTimeout(1200);
await host.page.screenshot({ path: 'test/12-host-play.png' });
await guest.page.screenshot({ path: 'test/13-guest-play.png' });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const guestHud = await guest.page.evaluate(() => ({ scores: document.getElementById('scores').innerText.replace(/\n/g, ' '), ping: document.getElementById('ping').innerText, timer: document.getElementById('timer').innerText }));
console.log('guest hud', JSON.stringify(guestHud));
await host.page.waitForTimeout(20000);
console.log('host scores', (await host.page.innerText('#scores')).replace(/\n/g, ' '));
console.log('guest scores', (await guest.page.innerText('#scores')).replace(/\n/g, ' '));
await guest.page.screenshot({ path: 'test/14-guest-later.png' });
await browser.close();
