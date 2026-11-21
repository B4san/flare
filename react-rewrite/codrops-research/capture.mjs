// Captura frames de una demo Codrops en Chromium headless (CDP directo).
// Uso: CDP_PORT=9226 PROFILE=/tmp/codrops-prof-1 node capture.mjs <url> <outdir>
// Captura: load t=0.5s / 1.5s / 3s, y scroll 0/25/50/75/100% (espera 1.5s en cada parada).
// Escribe <outdir>/*.png + <outdir>/meta.json (altura, errores de consola, título).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = Number(process.env.CDP_PORT || 9226);
const PROFILE = process.env.PROFILE || '/tmp/codrops-prof-default';
const [,, url, outdir] = process.argv;
if (!url || !outdir) { console.error('uso: node capture.mjs <url> <outdir>'); process.exit(2); }
mkdirSync(outdir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const list = await r.json();
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch { /* retry */ }
}
if (!target) { console.error('sin target CDP'); chrome.kill('SIGKILL'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params?.exceptionDetails?.text || m.params?.exceptionDetails?.exception?.description || 'exception').slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') errors.push(String(m.params.args?.map((a) => a.value ?? a.description ?? '').join(' ')).slice(0, 300));
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(500);
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true }))?.result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r?.data) { writeFileSync(`${outdir}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('saved', `${name}.png`); }
  else console.log('shot vacío:', name);
};

await sleep(500);
await shot('01-load-0.5s');
await sleep(1000);
await shot('02-load-1.5s');
await sleep(1500);
await shot('03-load-3s');
const meta = {
  url,
  title: await evalJs('document.title'),
  scrollHeight: await evalJs('document.documentElement.scrollHeight'),
  innerHeight: await evalJs('window.innerHeight'),
  h1: await evalJs('(document.querySelector("h1")||{}).innerText || null'),
};
console.log('meta', JSON.stringify(meta));
const stops = [0, 0.25, 0.5, 0.75, 1];
for (const f of stops) {
  await evalJs(`window.scrollTo({top: Math.round((document.documentElement.scrollHeight - window.innerHeight) * ${f}), behavior: 'instant'})`);
  await sleep(1500);
  await shot(`04-scroll-${String(Math.round(f * 100)).padStart(3, '0')}pct`);
}
meta.consoleErrors = errors;
writeFileSync(`${outdir}/meta.json`, JSON.stringify(meta, null, 2));
ws.close();
chrome.kill('SIGKILL');
console.log('done', outdir);
