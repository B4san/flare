// Visual snapshot helper for Flare landing (local only).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const exe = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const url = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || '/tmp/flare-shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(4500);
await page.screenshot({ path: `${out}/00-hero.png` });

const H = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('scrollHeight', H);
const stops = [0.06, 0.12, 0.18, 0.25, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.95];
let i = 1;
for (const p of stops) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(H * p));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}-p${Math.round(p * 100)}.png` });
}
// full page (layout without fixed transforms can be long)
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/99-full.png`, fullPage: true }).catch((e) => console.log('fullpage fail', e.message));

// mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await m.goto(url, { waitUntil: 'networkidle' });
await m.waitForTimeout(3500);
await m.screenshot({ path: `${out}/m-00-hero.png` });
await m.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.2));
await m.waitForTimeout(900);
await m.screenshot({ path: `${out}/m-01.png` });
await browser.close();
console.log('done', out);
