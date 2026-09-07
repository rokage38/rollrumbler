import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('console', m => console.log('[c]', m.text().slice(0, 200)));
await page.goto('http://localhost:4173/?net=relay');
await page.fill('#name', 'Ro'); await page.click('#btnHost');
await page.waitForTimeout(8000);
console.log('hint:', await page.textContent('#lobbyHint'), '| err:', await page.textContent('#lobbyErr'));
await browser.close();
