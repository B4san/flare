// Codrops — verificación viva del rediseño de la landing (React).
// Uso: 1) cd app && npm run preview -- --port 4192 --host 127.0.0.1
//      2) node ../codrops-verify.mjs   (desde react-rewrite/)
// Captura FRAMES reales de la animación (carga, mitad de pin, fin de pin,
// pasos scrubbed, 820 px, reduced-motion) y comprueba: texto final
// legible, --progress pilotando el zoom, mitades fuera de pantalla al
// final del pin, media grande, 0 errores de consola, sin overflow,
// Studio intacto (audit Safe 10/10).
// CDP directo contra Playwright chromium-1255 (patrón r7c-verify.mjs).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = 9227;
const PROFILE = '/tmp/flare-codrops-profile';
const PAGE_URL = 'http://localhost:4192/';
const OUT = new URL('./codrops-evidence/', import.meta.url).pathname;
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
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
};
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
const evl = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT + name, Buffer.from(r.data, 'base64'));
};
const wheel = async (n, dy = 400) => {
  for (let i = 0; i < n; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 450, deltaX: 0, deltaY: dy });
    await sleep(140);
  }
};
// contraste WCAG (rgb/oklch -> luminancia)
function numsOf(str) { const out = []; let cur = ''; for (const ch of str) { if ((ch >= '0' && ch <= '9') || ch === '.' || ch === '-') cur += ch; else if (cur !== '') { out.push(parseFloat(cur)); cur = ''; } } if (cur !== '') out.push(parseFloat(cur)); return out; }
function lumRgb(r, g, b) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrastOf(fg, bg) {
  const a = numsOf(fg); const b = numsOf(bg);
  if (a.length < 3 || b.length < 3) return null;
  const l1 = lumRgb(a[0], a[1], a[2]); const l2 = lumRgb(b[0], b[1], b[2]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE_URL });
await sleep(7000); // intro: badge + H1 + scramble del tagline (termina ~3 s)

// ---------- A. Carga (1280) ----------
await shot('a-load-1280.png');
const h1Text = await evl(`document.querySelector('.t-hero-title')?.innerText`);
check('A1 H1 texto final completo', h1Text?.replace(/\s+/g, ' ').trim() === 'El comercial que tu agente puede dirigir.', h1Text);
// textContent del tagline incluye los 3 fantasmas por carácter: leer
// solo los .k-real (el texto visible real).
const tagText = await evl(`[...document.querySelectorAll('.k-tagline .k-real')].map(e => e.textContent).join('').replace(/\\u00A0/g, ' ')`);
check('A2 tagline tras scramble (texto exacto)', tagText === 'Atrapa la mirada. Retén el scroll. Gana el click.', tagText);
const cursorState = await evl(`(() => { const c = document.querySelector('.k-cursor'); const r = c.getBoundingClientRect(); const t = document.querySelector('.k-tagline').getBoundingClientRect(); return { display: getComputedStyle(c).display, cursorRight: Math.round(r.right), tagRight: Math.round(t.right) }; })()`);
check('A2b cursor oculto al final del scramble', cursorState && cursorState.display === 'none', cursorState);
const badgeText = await evl(`document.querySelector('.dojo-badge')?.getAttribute('aria-label')`);
check('A3 badge editorial (sin píldora)', badgeText === 'Dojo AI Hackathon 2026 — Flare · MIT', badgeText);
const lenisOn = await evl(`document.documentElement.classList.contains('lenis')`);
check('A4 Lenis activo (html.lenis)', lenisOn === true, lenisOn);
const h1Op = await evl(`(() => { const cs = document.querySelectorAll('.t-hero-title .char, .t-hero-title [data-char]'); const els = document.querySelectorAll('.t-half-left div, .t-half-right div'); let min = 1; els.forEach(e => { min = Math.min(min, parseFloat(getComputedStyle(e).opacity)); }); return { chars: els.length, minOpacity: min }; })()`);
check('A5 chars H1 visibles tras intro', h1Op && h1Op.chars > 10 && h1Op.minOpacity > 0.9, h1Op);
const overflowA = await evl(`document.documentElement.scrollWidth <= window.innerWidth`);
check('A6 sin overflow horizontal a 1280', overflowA === true, await evl(`document.documentElement.scrollWidth + '/' + window.innerWidth`));
const cH1 = await evl(`(() => { const h = document.querySelector('.t-hero-title'); const cs = getComputedStyle(h); return { color: cs.color, bg: getComputedStyle(document.body).backgroundColor }; })()`);

// ---------- B. Mitad del pin ----------
await wheel(1, 420);
await sleep(1800);
await shot('b-mid-pin-1280.png');
const progB = await evl(`getComputedStyle(document.querySelector('.t-hero')).getPropertyValue('--progress')`);
check('B1 --progress a mitad de pin entre 0.2 y 0.8', parseFloat(progB) > 0.2 && parseFloat(progB) < 0.8, progB);
const mediaB = await evl(`(() => { const r = document.querySelector('.hero-media').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
check('B2 media a mitad de pin ya visible y creciendo', mediaB && mediaB.h > 150 && mediaB.h < 620, mediaB);

// ---------- C. Fin del pin ----------
await wheel(1, 420);
await sleep(2000);
await shot('c-end-pin-1280.png');
const progC = await evl(`getComputedStyle(document.querySelector('.t-hero')).getPropertyValue('--progress')`);
check('C1 --progress al final del pin ≈ 1', parseFloat(progC) > 0.9, progC);
const halves = await evl(`(() => { const l = document.querySelector('.t-half-left').getBoundingClientRect(); const r = document.querySelector('.t-half-right').getBoundingClientRect(); return { leftRight: Math.round(l.right), rightLeft: Math.round(r.left), vw: window.innerWidth }; })()`);
check('C2 mitades del H1 fuera de pantalla al final del pin', halves && halves.leftRight < 0 && halves.rightLeft > halves.vw, halves);
const mediaC = await evl(`(() => { const r = document.querySelector('.hero-media').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
check('C3 media a pantalla casi completa al final del pin', mediaC && mediaC.h >= 600, mediaC);
const ghostC = await evl(`(() => { const g = document.querySelector('.k-ghost.g3'); return getComputedStyle(g).opacity; })()`);
check('C4 estela fantasma visible durante el scroll', parseFloat(ghostC) > 0.1, ghostC);

// ---------- D. Pasos scrubbed (#como) ----------
// Se muestrea en dos posiciones de scroll: la transición entre pasos es
// continua (solape), pero en el instante exacto del cambio ambos pasos
// están a media opacidad; medir en dos puntos evita ese falso negativo.
await evl(`document.getElementById('como').scrollIntoView()`);
await sleep(1200);
const readSteps = () => evl(`(() => { const ws = [...document.querySelectorAll('.step-word')]; return ws.map(w => { const r = w.getBoundingClientRect(); return { op: parseFloat(getComputedStyle(w).opacity), y: Math.round(r.top + r.height / 2) }; }); })()`);
await wheel(3, 380);
await sleep(1600);
let step = await readSteps();
let stepOk = step && step.some((s) => s.op > 0.5 && s.y > 250 && s.y < 650);
if (!stepOk) {
  await wheel(2, 380);
  await sleep(1600);
  step = await readSteps();
  stepOk = step && step.some((s) => s.op > 0.5 && s.y > 250 && s.y < 650);
}
await shot('d-steps-1280.png');
check('D1 al menos un paso visible y centrado (2 posiciones)', stepOk === true, step);
const stepText = await evl(`document.querySelector('.step-word')?.innerText?.slice(0, 40)`);
check('D2 pasos con copy real (Brief/Agente/Render)', /Brief|Agente|Render/.test(stepText || ''), stepText);

// ---------- E. Contrastes finales ----------
const contrasts = await evl(`(() => {
  const out = {};
  const probe = (sel) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); return { color: cs.color, bg: 'rgb(10, 10, 15)' }; };
  out.h1 = probe('.t-hero-title');
  // .hero-content > p es el tagline (color transparente por el degradado):
  // el subtítulo es el p con mt-4.
  out.sub = probe('.hero-content p.mt-4');
  out.badge = probe('.dojo-badge');
  out.statsLabel = probe('.hero-content .mt-1.text-xs');
  return out;
})()`);
for (const [k, v] of Object.entries(contrasts || {})) {
  if (!v) { check(`E contraste ${k}`, false, 'sin elemento'); continue; }
  const ratio = contrastOf(v.color, v.bg);
  check(`E contraste ${k} >= 4.5:1`, ratio !== null && ratio >= 4.5, ratio ? ratio.toFixed(2) + ':1' : null);
}

// ---------- F. 820 px ----------
await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE_URL });
await sleep(4500);
await shot('f-load-820.png');
const overflowF = await evl(`document.documentElement.scrollWidth <= window.innerWidth`);
check('F1 sin overflow horizontal a 820', overflowF === true, await evl(`document.documentElement.scrollWidth + '/' + window.innerWidth`));
const h1F = await evl(`document.querySelector('.t-hero-title')?.innerText?.replace(/\\s+/g, ' ').trim()`);
check('F2 H1 completo a 820', h1F === 'El comercial que tu agente puede dirigir.', h1F);

// ---------- G. Reduced motion ----------
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: PAGE_URL });
await sleep(3000);
await shot('g-reduced-1280.png');
const rm = await evl(`(() => {
  const media = document.querySelector('.hero-media');
  const tag = document.querySelector('.k-tagline');
  const h1 = document.querySelector('.t-hero-title');
  return {
    mediaDisplay: getComputedStyle(media).display,
    tagOpacity: getComputedStyle(tag).opacity,
    tagText: [...document.querySelectorAll('.k-tagline .k-real')].map(e => e.textContent).join('').replace(/\\u00A0/g, ' '),
    h1Text: h1.innerText.replace(/\\s+/g, ' ').trim(),
    lenis: document.documentElement.classList.contains('lenis'),
  };
})()`);
check('G1 reduced-motion: media oculta, tagline visible y completo', rm && rm.mediaDisplay === 'none' && rm.tagText === 'Atrapa la mirada. Retén el scroll. Gana el click.', rm);
check('G2 reduced-motion: H1 completo sin animación', rm && rm.h1Text === 'El comercial que tu agente puede dirigir.', rm?.h1Text);
check('G3 reduced-motion: sin Lenis (scroll nativo)', rm && rm.lenis === false, rm?.lenis);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

// ---------- H. Studio intacto ----------
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE_URL });
await sleep(4000);
await evl(`document.getElementById('studio').scrollIntoView()`);
await sleep(4000);
const audit = await evl(`window.__flareAudit ? { status: window.__flareAudit.status, safe: window.__flareAudit.safePoints } : null`);
check('H1 audit del Studio: done + Safe 10/10', audit && audit.status === 'done' && audit.safe === 10, audit);
const studioVisible = await evl(`document.getElementById('studio')?.innerText?.includes('Retención')`);
check('H2 Studio renderiza (panel de retención presente)', studioVisible === true);

// ---------- Consola ----------
check('Z0 cero errores de consola en toda la sesión', consoleErrors.length === 0, consoleErrors.slice(0, 3));

const fails = results.filter((r) => !r.ok).length;
console.log(`\n=== CODROPS-VERIFY: ${results.length - fails}/${results.length} PASS, ${fails} FAIL ===`);
ws.close();
chrome.kill('SIGKILL');
process.exit(fails === 0 ? 0 : 1);
