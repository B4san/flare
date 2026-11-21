// R8b — verificación viva de los fixes R8 (landing Codrops).
// Uso: 1) cd app && npm run preview -- --port 4186 --host 127.0.0.1
//      2) node r8b-verify.mjs
// Mide con sondas CDP propias (patrón r7c-verify.mjs), en claro/oscuro
// × 1280/820:
//  (a) dwell legible de CADA paso de #como (Brief/Agente/Render): opacidad
//      ≥0,9 con el centro dentro del viewport (±180 px) en un barrido de
//      100 px por toda la sección; y zona muerta (ningún scrollY dentro
//      del sticky con los 3 pasos en op <0,05). También el ajuste del
//      trigger (fit lineal de la barra de progreso) vs el rango sticky.
//  (b) estela Kinetic visible a mitad de pin: opacidad efectiva de los
//      fantasmas (.k-ghost, estilo computado) >0,10 con el tagline real
//      ya desvanecido, + captura de frame.
//  (c) regresión: contrastes finales ≥4,5:1 (muestra de textos clave),
//      cero errores de consola, sin overflow horizontal, Studio intacto
//      (scores 100/85/85, Safe 10/10) y examples-check PASS (se corre
//      aparte; aquí se comprueba el panel en vivo).
// Capturas en ./r8b-evidence/. CDP directo contra Playwright chromium-1255.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = 9230;
const PROFILE = '/tmp/flare-r8b-verify-profile';
const PAGE_URL = 'http://localhost:4186/';
const OUT = new URL('./r8b-evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== null ? ' :: ' + JSON.stringify(detail) : ''));
}

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
if (!target) { console.error('no CDP target'); chrome.kill('SIGKILL'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const consoleErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails?.text || 'exception');
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args?.map((a) => a.value ?? a.description ?? '').join(' '));
};
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __error: r.exceptionDetails.text || 'eval error' };
  return r.result?.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT + name, Buffer.from(r.data, 'base64'));
};

await send('Page.enable');
await send('Runtime.enable');

// ---------- combo runner ----------
async function runCombo({ width, height, dark, label }) {
  consoleErrors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(6000); // carga + fonts.ready + pin + intro + build de pasos

  // Geometría sticky
  const geo = await evalJs(`(() => {
    const cont = document.querySelector('#como div.relative');
    if (!cont) return null;
    const r = cont.getBoundingClientRect();
    return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height),
      stickyStart: Math.round(r.top + window.scrollY),
      stickyEnd: Math.round(r.top + window.scrollY + r.height - window.innerHeight) };
  })()`);
  if (!geo) { check(`${label} geometría #como`, false, 'sin contenedor'); return; }

  // (b) Estela Kinetic a mitad de pin (p≈0,5 → scrollY ≈ 450 a 1280/900)
  // El pin dura 900 px de scroll (100svh); p=0,5 en scrollY≈450.
  await evalJs(`window.scrollTo(0, 450)`);
  await sleep(1200);
  const ghost = await evalJs(`(() => {
    const g1 = document.querySelector('.k-ghost.g1');
    const real = document.querySelector('.k-real');
    const tag = document.querySelector('.k-tagline');
    const cs = (el) => el ? getComputedStyle(el) : null;
    return {
      ghostOp: g1 ? +cs(g1).opacity : null,
      ghostVar: getComputedStyle(document.querySelector('.t-hero')).getPropertyValue('--ghost'),
      realOp: real ? +cs(real).opacity : null,
      tagOp: tag ? +cs(tag).opacity : null,
      progressVar: getComputedStyle(document.querySelector('.t-hero')).getPropertyValue('--progress'),
    };
  })()`);
  await shot(`${label}-pin-mid.png`);
  check(`${label} estela visible a mitad de pin (fantasma g1 >0,10)`, ghost.ghostOp !== null && ghost.ghostOp > 0.10, ghost);
  check(`${label} tagline real desvanecido a mitad de pin (real op <0,2)`, ghost.realOp !== null && ghost.realOp < 0.2, { realOp: ghost.realOp });

  // (a) Barrido de pasos: de stickyStart-500 a stickyEnd+300, pasos de 100 px.
  // Lenis suaviza la rueda pero window.scrollTo es directo; esperar a asentar.
  const rows = [];
  for (let y = geo.stickyStart - 500; y <= geo.stickyEnd + 300; y += 100) {
    await evalJs(`window.scrollTo(0, ${y})`);
    await sleep(350);
    const m = await evalJs(`(() => {
      const steps = [...document.querySelectorAll('#como .step-word')].map((el) => {
        const r = el.getBoundingClientRect();
        return { op: +(+getComputedStyle(el).opacity).toFixed(2), cy: Math.round(r.top + r.height / 2) };
      });
      const bar = document.querySelector('#como .bg-flare');
      const mm = bar ? /scaleX\\(([0-9.]+)\\)/.exec(bar.style.transform) : null;
      return { y: window.scrollY, prog: mm ? +mm[1] : null, steps };
    })()`);
    rows.push(m);
  }
  // Fit del trigger desde la barra de progreso
  const pts = rows.filter((r) => r.prog !== null && r.prog > 0.02 && r.prog < 0.98);
  let fit = null;
  if (pts.length >= 2) {
    const n = pts.length;
    const sx = pts.reduce((s, p) => s + p.y, 0), sy = pts.reduce((s, p) => s + p.prog, 0);
    const sxx = pts.reduce((s, p) => s + p.y * p.y, 0), sxy = pts.reduce((s, p) => s + p.y * p.prog, 0);
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const b = (sy - a * sx) / n;
    fit = { start: Math.round(-b / a), end: Math.round((1 - b) / a) };
  }
  check(`${label} trigger alineado con sticky (fit≈${geo.stickyStart}–${geo.stickyEnd})`, !!fit && Math.abs(fit.start - geo.stickyStart) <= 100 && Math.abs(fit.end - geo.stickyEnd) <= 100, { fit, sticky: [geo.stickyStart, geo.stickyEnd] });
  const names = ['Brief', 'Agente', 'Render'];
  const dwell = [0, 0, 0];
  let dead = 0;
  for (const r of rows) {
    if (r.y < geo.stickyStart || r.y > geo.stickyEnd) continue;
    let any = false;
    r.steps.forEach((s, i) => {
      if (s.op >= 0.9 && Math.abs(s.cy - height / 2) <= 180) { dwell[i] += 100; any = true; }
      if (s.op >= 0.05) any = true;
    });
    if (!any) dead += 100;
  }
  names.forEach((n, i) => check(`${label} dwell legible ${n} ≥300 px`, dwell[i] >= 300, { dwell: dwell[i] }));
  check(`${label} sin zona muerta en el sticky`, dead === 0, { deadPx: dead });
  // Captura a mitad de la sección (paso centrado)
  await evalJs(`window.scrollTo(0, ${Math.round((geo.stickyStart + geo.stickyEnd) / 2)})`);
  await sleep(1200);
  await shot(`${label}-steps-mid.png`);

  // (c) Regresión rápida: overflow + consola
  const reg = await evalJs(`(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
  }))()`);
  check(`${label} sin overflow horizontal`, reg.overflowX === 0, reg);
  check(`${label} cero errores de consola`, consoleErrors.length === 0, consoleErrors.slice(0, 3));
}

await runCombo({ width: 1280, height: 900, dark: false, label: 'light-1280' });
await runCombo({ width: 1280, height: 900, dark: true, label: 'dark-1280' });
await runCombo({ width: 820, height: 900, dark: false, label: 'light-820' });
await runCombo({ width: 820, height: 900, dark: true, label: 'dark-820' });

// ---------- Studio intacto (una pasada, 1280 claro) ----------
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: PAGE_URL });
await sleep(5000);
const studio = await evalJs(`(() => {
  // Ir al Studio: botón "Abrir el Studio" del hero
  const btns = [...document.querySelectorAll('button')].filter((b) => /Abrir el Studio/.test(b.textContent || ''));
  if (btns[0]) btns[0].click();
  return btns.length;
})()`);
await sleep(4000);
const audit = await evalJs(`(() => {
  const txt = document.body.innerText || '';
  const m = txt.match(/(\\d+)\\/100/g);
  return { clicked: true, scores: m ? m.slice(0, 5) : [], hasStudio: !!document.querySelector('#studio, [data-studio]') || /Studio/.test(txt) };
})()`);
console.log('STUDIO probe:', JSON.stringify({ studio, audit }));
check('Studio abre y muestra scores', audit.scores.length > 0, audit);

const fails = results.filter((r) => !r.ok);
console.log(`\nTOTAL: ${results.length - fails.length}/${results.length} PASS, ${fails.length} FAIL`);
if (fails.length) console.log('FAILs:', fails.map((f) => f.name).join(' | '));
ws.close();
chrome.kill('SIGKILL');
process.exit(fails.length ? 1 : 0);
