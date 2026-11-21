#!/usr/bin/env node
// flare — local deterministic renderer CLI for Flare.
//   flare lint <dir|slug>       validate scenes.html
//   flare score <dir|slug>      retention score 0-100 + checklist
//   flare storyboard <dir|slug> [--out file.html]
//   flare preview <dir|slug> [--port 8321] [--no-serve]
//   flare render <dir|slug> [--fps 30] [--out out.mp4] [--dry-run]
// Zero mandatory dependencies. Node 22+.
//
// <dir|slug>: a direct path (examples/colchon-descanso-total,
// renderer/test-fixture, ...) or a bare slug, resolved against
// examples/<slug>/ and renderer/<slug>/ from the repo root.
// A missing project prints a friendly error with the available
// projects — never a raw Node stack trace.
//
// Render principal de Flare: WebM en el navegador (MediaRecorder,
// botón "Exportar video (WebM)" en Flare Studio). Este CLI es la
// opción AVANZADA para MP4 local determinista (HTML -> PNGs -> H.264).

import { existsSync, mkdirSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { join, resolve, dirname, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { parseDir } from '../lib/parse.js';
import { scoreTimeline, verdictLabel } from '../lib/score.js';
import { detectChrome, detectFfmpeg, chromeVersion, writeStoryboard, framePlan, renderReal } from '../lib/render.js';

const VERSION = '0.1.0';
const BIN_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER_DIR = resolve(BIN_DIR, '..');
const REPO_ROOT = resolve(RENDERER_DIR, '..');
const DEFAULT_PREVIEW_PORT = 8321;

function usage() {
  console.log(`flare ${VERSION} — local HTML -> MP4 renderer (deterministic frame capture)

Usage:
  flare lint <dir|slug>                          validate scenes.html / fixture.html
  flare score <dir|slug>                         retention score 0-100 + checklist
  flare storyboard <dir|slug> [--out file.html]  generate a storyboard HTML
  flare preview <dir|slug> [--port N] [--no-serve]
                                                 validate + serve the piece in the browser
  flare render <dir|slug> [--fps 30] [--out out.mp4] [--dry-run]
                                                 capture frames + encode MP4

Options:
  --fps N      frames per second (default 30)
  --out FILE   output file (storyboard: <dir>/storyboard-export.html, render: out.mp4)
  --port N     preview server port (default ${DEFAULT_PREVIEW_PORT})
  --no-serve   preview: only validate and print the scenes.html path, do not serve
  --dry-run    validate + plan only; no Chrome, no ffmpeg, no MP4, no files written

<dir|slug> is a path or a bare slug (looked up in examples/<slug>/
and renderer/<slug>/ from the repo root).

The main Flare render is WebM in the browser (MediaRecorder in Flare
Studio); this CLI's MP4 render is the advanced local option.

Requires Node 22+, FFmpeg, and Chrome/Chromium (render only).
Set CHROME_PATH if Chrome is installed outside PATH.`);
}

function parseArgs(argv) {
  const positional = [];
  const opts = { fps: 30, out: null, dryRun: false, port: DEFAULT_PREVIEW_PORT, noServe: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fps') opts.fps = Number(argv[++i]);
    else if (a.startsWith('--fps=')) opts.fps = Number(a.slice(6));
    else if (a === '--out') opts.out = argv[++i];
    else if (a.startsWith('--out=')) opts.out = a.slice(6);
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a.startsWith('--port=')) opts.port = Number(a.slice(7));
    else if (a === '--no-serve') opts.noServe = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--version' || a === '-v') opts.version = true;
    else positional.push(a);
  }
  return { positional, opts };
}

// --- Project resolution (slug or path) ----------------------------------

function listAvailableProjects() {
  const found = [];
  const scan = (base) => {
    if (!existsSync(base)) return;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(base, entry.name);
      if (existsSync(join(dir, 'scenes.html')) || existsSync(join(dir, 'fixture.html'))) {
        found.push(entry.name);
      }
    }
  };
  scan(join(REPO_ROOT, 'examples'));
  scan(RENDERER_DIR);
  return [...new Set(found)].sort();
}

// Resolve <dir|slug> to an existing directory, or null (with a friendly
// error printed by the caller). Never throws, never prints a stack trace.
function resolveProject(input) {
  if (!input) return null;
  const direct = resolve(input);
  if (existsSync(direct)) return direct;
  for (const base of [join(REPO_ROOT, 'examples'), RENDERER_DIR]) {
    const candidate = join(base, input);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function friendlyNotFound(input) {
  const available = listAvailableProjects();
  console.error(`No encontré el proyecto '${input}'.`);
  if (available.length) {
    console.error(`Proyectos disponibles: ${available.join(', ')}.`);
  } else {
    console.error('No hay proyectos disponibles en examples/ ni en renderer/.');
  }
  console.error('Pasa una ruta (p. ej. examples/colchon-descanso-total) o un slug (p. ej. colchon-descanso-total).');
  return 1;
}

function printIssues(title, issues) {
  if (issues.length === 0) return;
  console.log(`\n${title}:`);
  for (const it of issues) console.log(`  ${it.file}:${it.line}  ${it.message}`);
}

function cmdLint(dir) {
  const t = parseDir(dir);
  console.log(`lint: ${t.file ?? dir}`);
  printIssues('ERRORS', t.errors);
  printIssues('Warnings', t.warnings);
  if (t.valid) {
    console.log(`\nOK — ${t.compositionId || '(no id)'} ${t.width}x${t.height} ${t.duration}s, ` +
      `${t.scenes.length} scene(s), ${t.clips.length} clip(s), ${t.captions.length} caption(s), ${t.ctas.length} CTA(s).` +
      (t.warnings.length ? ` (${t.warnings.length} warning(s))` : ''));
    return 0;
  }
  console.log(`\nFAILED — ${t.errors.length} error(s). Fix them and re-run lint.`);
  return 1;
}

function cmdScore(dir) {
  const t = parseDir(dir);
  if (!t.valid) {
    console.log(`score: cannot score — ${t.file ?? dir} failed lint.`);
    printIssues('ERRORS', t.errors);
    return 1;
  }
  const result = scoreTimeline(t);
  console.log(`score: ${t.compositionId || '(no id)'} — ${result.score}/100 (${result.verdict})`);
  for (const c of result.checks) {
    const mark = c.pass ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.label}: ${c.points}/${c.max} — ${c.detail}`);
  }
  console.log(`\nVerdict: ${result.verdict} (${result.score}/100).`);
  return 0;
}

function cmdStoryboard(dir, opts) {
  const t = parseDir(dir);
  if (!t.valid) {
    console.log(`storyboard: cannot build — ${t.file ?? dir} failed lint.`);
    printIssues('ERRORS', t.errors);
    return 1;
  }
  // Never overwrite the example's own storyboard.html without an
  // explicit --out: the default is a separate export file.
  const out = opts.out || join(resolve(dir), 'storyboard-export.html');
  writeStoryboard(t, out);
  console.log(`storyboard: ${t.scenes.length} scene(s) -> ${out}`);
  for (const s of t.scenes) {
    const bg = s.bg || t.stageBg || '(sin fondo declarado)';
    console.log(`  ${s.id}: ${s.start}s–${s.start + s.duration}s, bg ${bg}`);
  }
  return 0;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function cmdPreview(dir, opts) {
  const t = parseDir(dir);
  if (!t.valid) {
    console.log(`preview: cannot preview — ${t.file ?? dir} failed lint.`);
    printIssues('ERRORS', t.errors);
    return 1;
  }
  const entryFile = t.file;
  if (opts.noServe) {
    console.log(`preview: ${t.compositionId || '(no id)'} OK — ${t.width}x${t.height} ${t.duration}s, ` +
      `${t.scenes.length} scene(s), ${t.captions.length} caption(s), ${t.ctas.length} CTA(s).`);
    console.log(`preview: abre en el navegador: ${entryFile}`);
    console.log('preview: (sin servidor: usa --port para servirlo con HTTP si la pieza carga assets relativos).');
    return 0;
  }
  // Serve the repo root when the project lives under it, so relative
  // assets (p. ej. ../../web/vendor/gsap.min.js) resolve; otherwise
  // serve the project directory itself.
  const absDir = resolve(dir);
  const underRoot = absDir === REPO_ROOT || absDir.startsWith(REPO_ROOT + sep);
  const serveRoot = underRoot ? REPO_ROOT : absDir;
  const urlPath = '/' + relative(serveRoot, entryFile).split(sep).join('/');
  const port = Number.isFinite(opts.port) && opts.port > 0 ? opts.port : DEFAULT_PREVIEW_PORT;
  const server = createServer((req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(serveRoot, '.' + path);
      if (!file.startsWith(serveRoot) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found\n');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      createReadStream(file).pipe(res);
    } catch {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Server error\n');
    }
  });
  server.on('error', (err) => {
    console.error(`preview: no se pudo servir en el puerto ${port}: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`preview: ${t.compositionId || '(no id)'} OK — ${t.width}x${t.height} ${t.duration}s, ${t.scenes.length} scene(s).`);
    console.log(`preview: http://localhost:${port}${urlPath}`);
    console.log('preview: pulsa Ctrl+C para parar el servidor.');
  });
  return null; // keep the process alive serving
}

function cmdRender(dir, opts) {
  const t = parseDir(dir);
  if (!t.valid) {
    console.log(`render: cannot render — ${t.file ?? dir} failed lint.`);
    printIssues('ERRORS', t.errors);
    return 1;
  }
  const fps = Number.isFinite(opts.fps) && opts.fps > 0 ? opts.fps : 30;
  const out = opts.out || 'out.mp4';
  const chrome = detectChrome();
  const ff = detectFfmpeg();
  const plan = framePlan(t, fps);

  console.log(`render: ${t.compositionId} ${t.width}x${t.height} ${t.duration}s @ ${fps}fps -> ${plan.total} frame(s) -> ${out}`);
  console.log(`  chrome: ${chrome.found ? `${chrome.path} (${chrome.source}) — ${chromeVersion(chrome.path)}` : 'NOT FOUND'}`);
  console.log(`  ffmpeg: ${ff.found ? ff.path : 'NOT FOUND'}`);

  if (opts.dryRun) {
    console.log('\n--dry-run: no frames captured, no MP4 written, no files written.');
    console.log(`  timeline OK: ${t.scenes.length} scene(s), ${t.captions.length} caption(s), ${t.ctas.length} CTA(s).`);
    console.log(`  frames that WOULD be captured (${plan.total}):`);
    const show = plan.frames.slice(0, 10);
    for (const f of show) console.log(`    ${f.file}  t=${f.t.toFixed(3)}s  (${t.file}?t=${f.t.toFixed(3)})`);
    if (plan.total > 10) console.log(`    ... and ${plan.total - 10} more (up to ${plan.frames[plan.total - 1].file} at t=${plan.frames[plan.total - 1].t.toFixed(3)}s)`);
    // O2 R5b: un dry-run NO escribe nada. Antes escribía
    // <dir>/storyboard-export.html por diseño, lo que en un sandbox con
    // escritura restringida truncaba ese fichero a 0 bytes y devolvía
    // exit 1. Para generar el storyboard usa:
    //   flare storyboard <dir|slug> --out <file.html>
    if (!chrome.found) {
      console.log('\n  What is missing for a real render:');
      console.log('    - Chrome/Chromium (checked PATH: google-chrome, chromium, chromium-browser;');
      console.log('      CHROME_PATH; known paths incl. /opt/meta-chromium/chrome; Playwright/Puppeteer caches).');
      console.log('    - Install it, e.g.: npx --yes playwright@latest install chromium');
      console.log('      or: sudo apt-get install -y chromium-browser');
      console.log('      then re-run without --dry-run (or set CHROME_PATH=/path/to/chrome).');
    }
    if (!ff.found) console.log('    - FFmpeg (https://ffmpeg.org/download.html) for the MP4 encode step.');
    console.log(`\n  Real render command (once Chrome is available):`);
    console.log(`    flare render ${dir} --fps ${fps} --out ${out}`);
    return 0;
  }

  if (!chrome.found) {
    console.log('\nERROR: no Chrome/Chromium found. Re-run with --dry-run to validate the timeline,');
    console.log('or install Chrome (npx --yes playwright@latest install chromium) or set CHROME_PATH.');
    for (const c of chrome.checked) console.log(`  checked ${c.source}: ${c.path ?? '(not found)'}`);
    return 2;
  }
  if (!ff.found) {
    console.log('\nERROR: ffmpeg not found in PATH. Install FFmpeg, then re-run.');
    return 2;
  }
  console.log(`\nCapturing ${plan.total} frame(s) with ${chrome.path} ...`);
  const result = renderReal(t, { fps, out, chromePath: chrome.path });
  if (!result.ok) {
    console.log(`\nERROR: render failed${result.failedFrame ? ` at ${result.failedFrame.file} (t=${result.failedFrame.t}s)` : ''}.`);
    if (result.stderr) console.log(result.stderr);
    if (result.ffmpegStderr) console.log(result.ffmpegStderr);
    console.log(`Frames (if any) are in ${result.dir}`);
    return 2;
  }
  console.log(`\nDone: ${result.out} (${result.frames} frames)`);
  console.log(`Frame PNGs kept in ${result.dir} (delete when done).`);
  return 0;
}

function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));
  if (opts.version) { console.log(`flare ${VERSION}`); return 0; }
  if (opts.help || positional.length === 0) { usage(); return positional.length === 0 ? 1 : 0; }
  const [cmd, input] = positional;
  if (!['lint', 'score', 'storyboard', 'preview', 'render'].includes(cmd)) {
    console.error(`Unknown command: ${cmd}`);
    usage();
    return 1;
  }
  if (!input) { console.error(`Missing <dir|slug>. Usage: flare ${cmd} <dir|slug>`); return 1; }
  const dir = resolveProject(input);
  if (!dir) return friendlyNotFound(input);
  switch (cmd) {
    case 'lint': return cmdLint(dir);
    case 'score': return cmdScore(dir);
    case 'storyboard': return cmdStoryboard(dir, opts);
    case 'preview': return cmdPreview(dir, opts);
    case 'render': return cmdRender(dir, opts);
    default: return 1;
  }
}

const code = main();
// cmdPreview serving returns null: keep the event loop alive (the HTTP
// server holds the process open). Any other return is an exit code.
if (code !== null && code !== undefined) process.exit(code);
