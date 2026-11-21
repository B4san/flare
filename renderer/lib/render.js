// render.js — Chrome detection, storyboard generation, dry-run planning
// and the real frame-capture + ffmpeg encode pipeline.
//
// Real render path (no libraries): for each frame, headless Chrome
// screenshots `scenes.html?t=<seconds>` at the composition size, then
// ffmpeg stitches the PNGs into an H.264 MP4. The scenes file must honour
// the `?t=` query param (see test-fixture/fixture.html): on load it shows
// the scene whose [start, start+duration) contains t. That makes every
// frame deterministic and independent of wall-clock animation timing.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHROME_BINARIES = ['google-chrome', 'chromium', 'chromium-browser', 'chrome'];

// Extra well-known locations, checked LAST: the /opt/meta-chromium entry
// is the Chromium shipped with this VM image (Muse Browser); it answers
// --version but refuses headless CLI screenshots ("Hatch WebGL domain
// policy is required for browser startup", exit 13), so a stock Chromium
// from the Playwright/Puppeteer caches must win over it. See TEST-REPORT.md.
export const CHROME_KNOWN_PATHS = [
  '/opt/meta-chromium/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function which(binary) {
  try {
    const out = execFileSync('which', [binary], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function playwrightChromePath() {
  // Playwright cache: ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
  const home = process.env.HOME || '';
  if (!home) return null;
  try {
    const base = join(home, '.cache', 'ms-playwright');
    if (!existsSync(base)) return null;
    for (const entry of readdirSync(base)) {
      if (!entry.startsWith('chromium-')) continue;
      // Layout varies by Playwright version: chrome-linux (older) or
      // chrome-linux64 (newer, e.g. chromium-1255).
      for (const sub of ['chrome-linux', 'chrome-linux64']) {
        const p = join(base, entry, sub, 'chrome');
        if (existsSync(p)) return p;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function puppeteerChromePath() {
  const home = process.env.HOME || '';
  if (!home) return null;
  try {
    const base = join(home, '.cache', 'puppeteer');
    if (!existsSync(base)) return null;
    for (const entry of readdirSync(base)) {
      const p = join(base, entry, 'chrome-linux', 'chrome');
      if (existsSync(p)) return p;
    }
  } catch { /* ignore */ }
  return null;
}

export function detectChrome() {
  const checked = [];
  if (process.env.CHROME_PATH) {
    checked.push({ source: 'CHROME_PATH', path: process.env.CHROME_PATH, exists: existsSync(process.env.CHROME_PATH) });
    if (existsSync(process.env.CHROME_PATH)) {
      return { found: true, path: process.env.CHROME_PATH, source: 'CHROME_PATH', checked };
    }
  }
  for (const bin of CHROME_BINARIES) {
    const p = which(bin);
    checked.push({ source: `PATH:${bin}`, path: p, exists: !!p });
    if (p) return { found: true, path: p, source: `PATH:${bin}`, checked };
  }
  const pw = playwrightChromePath();
  checked.push({ source: 'playwright-cache', path: pw, exists: !!pw });
  if (pw) return { found: true, path: pw, source: 'playwright-cache', checked };
  const pp = puppeteerChromePath();
  checked.push({ source: 'puppeteer-cache', path: pp, exists: !!pp });
  if (pp) return { found: true, path: pp, source: 'puppeteer-cache', checked };
  for (const p of CHROME_KNOWN_PATHS) {
    checked.push({ source: 'known-path', path: p, exists: existsSync(p) });
    if (existsSync(p)) return { found: true, path: p, source: 'known-path', checked };
  }
  return { found: false, path: null, source: null, checked };
}

export function detectFfmpeg() {
  return { found: !!which('ffmpeg'), path: which('ffmpeg'), ffprobe: which('ffprobe') };
}

export function chromeVersion(chromePath) {
  try {
    return execFileSync(chromePath, ['--version'], { encoding: 'utf8', timeout: 15000 }).trim();
  } catch (e) {
    return `unknown (${e.message.split('\n')[0]})`;
  }
}

// --- Storyboard ---------------------------------------------------------

export function storyboardHtml(timeline) {
  // Fondo real por escena: data-bg del clip; si no lo tiene, el fondo del
  // stage (normalmente un gradiente CSS, p. ej. linear-gradient(...));
  // si tampoco hay fondo declarado en el stage pero el CSS usa
  // gradientes, se dice "gradiente CSS" en vez de inventar un color.
  const bgOf = (s) => {
    if (s.bg) return { css: s.bg, label: s.bg };
    if (timeline.stageBg) return { css: timeline.stageBg, label: timeline.stageBg };
    if (/gradient/i.test(timeline.source || '')) return { css: '#111827', label: 'gradiente CSS' };
    return { css: '#111827', label: '(sin fondo declarado)' };
  };
  const scenes = timeline.scenes.map((s) => {
    const end = s.start !== null && s.duration !== null ? (s.start + s.duration).toFixed(1) : '?';
    const bg = bgOf(s);
    const caption = timeline.captions.find((c) => c.start !== null && s.start !== null && c.start >= s.start && c.start < s.start + (s.duration || 0));
    return `<div class="card" style="--bg:${bg.css}">
      <div class="thumb"><span class="scene-text">${escapeHtml(s.text || s.id)}</span></div>
      <div class="meta"><strong>${escapeHtml(s.id)}</strong>
      <span>${s.start ?? '?'}s – ${end}s</span>
      <span class="cap">${caption ? '“' + escapeHtml(caption.text) + '”' : 'sin caption'}</span>
      <span class="bg">fondo: ${escapeHtml(bg.label)}</span></div></div>`;
  }).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Storyboard — ${escapeHtml(timeline.compositionId || 'flare')}</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b12;color:#fff;margin:0;padding:24px}
h1{font-size:22px} .sub{color:#9ca3af;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{border:1px solid #333;border-radius:16px;overflow:hidden;background:#16161f}
.thumb{aspect-ratio:9/16;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px;text-align:center;font-size:20px;font-weight:700}
.meta{padding:12px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.meta .cap{color:#d1d5db}.meta .bg{color:#9ca3af}</style></head>
<body><h1>Storyboard — ${escapeHtml(timeline.compositionId || 'flare')}</h1>
<div class="sub">${timeline.width}×${timeline.height} · ${timeline.duration}s · ${timeline.scenes.length} escena(s) · archivo: ${escapeHtml(timeline.file || '')}</div>
<div class="grid">${scenes}</div></body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function writeStoryboard(timeline, outPath) {
  const html = storyboardHtml(timeline);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, html, 'utf8');
  return outPath;
}

// --- Frame plan (shared by dry-run and real render) ---------------------

export function framePlan(timeline, fps) {
  const total = Math.max(0, Math.round((timeline.duration || 0) * fps));
  const frames = [];
  for (let i = 0; i < total; i++) {
    frames.push({ index: i, t: i / fps, file: `frame${String(i + 1).padStart(4, '0')}.png` });
  }
  return { fps, total, frames };
}

// --- Real render ----------------------------------------------------------

export function renderReal(timeline, { fps = 30, out = 'out.mp4', chromePath, workDir = null } = {}) {
  const dir = workDir || join(process.cwd(), `.flare-frames-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const plan = framePlan(timeline, fps);
  const fileUrl = `file://${timeline.file}`;
  const captured = [];
  for (const frame of plan.frames) {
    const shotPath = join(dir, frame.file);
    const url = `${fileUrl}?t=${frame.t.toFixed(3)}`;
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${timeline.width},${timeline.height}`,
      '--virtual-time-budget=1500',
      `--screenshot=${shotPath}`,
      url,
    ];
    const res = spawnSync(chromePath, args, { encoding: 'utf8', timeout: 60000 });
    if (res.status !== 0 || !existsSync(shotPath)) {
      return { ok: false, dir, captured, failedFrame: frame, stderr: (res.stderr || res.error?.message || '').slice(0, 500) };
    }
    captured.push(shotPath);
  }
  // Encode with ffmpeg.
  const absOut = resolve(out);
  const ff = spawnSync('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', join(dir, 'frame%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', absOut,
  ], { encoding: 'utf8', timeout: 300000 });
  if (ff.status !== 0) {
    return { ok: false, dir, captured, ffmpegStderr: (ff.stderr || '').slice(-800) };
  }
  return { ok: true, dir, captured, out: absOut, frames: plan.total };
}
