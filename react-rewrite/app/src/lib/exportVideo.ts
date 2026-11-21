// Flare — export a vídeo WebM (MediaRecorder) + storyboard HTML.
// Port fiel de web/app.js (exportDims, wrapText, drawHeadline,
// drawVisualShape, drawFrame, exportWebM, exportStoryboard): la geometría
// del vídeo YA estaba APTO en R6 (WebM real de 4.0 MB), así que no se toca.
//
// El vídeo se dibuja en canvas a resolución completa del formato
// (1080×1920 / 1080×1080 / 1920×1080) con el layout de canvas propio
// (texto a la izquierda, caption al 90%): es el artefacto de vídeo, distinto
// del preview del Studio (centrado, bandas absolutas).

import { totalDuration } from './data';
import type { FormatId, Scene, TemplateMeta } from './types';

const TONE_BG: Record<string, [string, string]> = {
  'tone-violet': ['#2A1650', '#0A0A0F'],
  'tone-pink': ['#3D1030', '#0A0A0F'],
  'tone-cyan': ['#0B2A33', '#0A0A0F'],
  'tone-dark': ['#1A1A26', '#0A0A0F'],
  'tone-split': ['#17171F', '#0A0A0F'],
};

export function exportDims(format: FormatId): { w: number; h: number } {
  if (format === '9:16') return { w: 1080, h: 1920 };
  if (format === '1:1') return { w: 1080, h: 1080 };
  return { w: 1920, h: 1080 };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = String(text).split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  x: number,
  y: number,
  lineH: number,
  maxW: number,
): number {
  const grad = ctx.createLinearGradient(x, 0, x + maxW, 0);
  grad.addColorStop(0, '#FFB020');
  grad.addColorStop(0.5, '#FF5A3C');
  grad.addColorStop(1, '#8B5CF6');
  const hlWords = new Set(String(s.headlineHl || '').split(' ').filter(Boolean));
  let cy = y;
  wrapText(ctx, s.headline || '', maxW).forEach((ln) => {
    const words = ln.split(' ');
    let cx = x;
    words.forEach((w, wi) => {
      const word = w + (wi < words.length - 1 ? ' ' : '');
      ctx.fillStyle = hlWords.has(w) ? grad : '#F5F5F2';
      ctx.fillText(word, cx, cy);
      cx += ctx.measureText(word).width;
    });
    cy += lineH;
  });
  return cy;
}

function drawVisualShape(
  ctx: CanvasRenderingContext2D,
  kind: string | undefined,
  cx: number,
  cy: number,
  w: number,
  h: number,
  s: Scene,
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const R = Math.min(w, h);
  if (kind === 'moon' || kind === 'sun') {
    const g = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.15, R * 0.1, cx, cy, R * 0.5);
    if (kind === 'moon') {
      g.addColorStop(0, '#fffbe6');
      g.addColorStop(0.6, '#ffd76a');
      g.addColorStop(1, '#f5b942');
    } else {
      g.addColorStop(0, '#fff8d6');
      g.addColorStop(0.65, '#ffb703');
      g.addColorStop(1, '#fb8500');
    }
    ctx.shadowColor = kind === 'moon' ? 'rgba(255,215,106,.55)' : 'rgba(255,183,3,.5)';
    ctx.shadowBlur = R * 0.35;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'zzz') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(R * 0.42) + 'px "Space Grotesk", sans-serif';
    ctx.fillText('Z z z', cx, cy);
  } else if (kind === 'bed') {
    ctx.fillStyle = '#C4B5FD';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.42, cy - h * 0.28, w * 0.84, h * 0.56, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.36, cy - h * 0.42, w * 0.2, h * 0.22, 10);
    ctx.fill();
  } else if (kind === 'breeze') {
    const g = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
    g.addColorStop(0, '#FFB020');
    g.addColorStop(1, '#8b5cf6');
    ctx.strokeStyle = g;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    [0.42, 0.32, 0.22].forEach((f, i) => {
      ctx.beginPath();
      ctx.moveTo(cx - w * f, cy - h * 0.28 + i * h * 0.28);
      ctx.lineTo(cx + w * f, cy - h * 0.28 + i * h * 0.28);
      ctx.stroke();
    });
  } else if (kind === 'badge') {
    const label = s.kicker || '';
    ctx.font = '900 ' + Math.round(R * 0.22) + 'px Inter, sans-serif';
    const tw = ctx.measureText(label).width + 44;
    const g = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    g.addColorStop(0, '#FFB020');
    g.addColorStop(0.5, '#FF5A3C');
    g.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - h * 0.3, tw, h * 0.6, 999);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, cy + 1);
  } else if (kind === 'screen') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.44, cy - h * 0.42, w * 0.88, h * 0.84, 12);
    ctx.fill();
    const bars: [string, number][] = [
      ['#1A1A26', 0.72],
      ['#FFB020', 0.52],
      ['#8B5CF6', 0.36],
    ];
    bars.forEach(([c, f], i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.36, cy - h * 0.3 + i * h * 0.26, w * 0.72 * f, h * 0.13, 99);
      ctx.fill();
    });
  } else if (kind === 'boxes') {
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = i === 0 ? '#8b5cf6' : 'rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.roundRect(cx + i * w * 0.3 - w * 0.13, cy - h * 0.3, w * 0.26, h * 0.6, 9);
      ctx.fill();
    }
  } else if (kind === 'receipt') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.34, cy - h * 0.42, w * 0.68, h * 0.84, 10);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = '700 ' + Math.round(R * 0.2) + 'px Inter, sans-serif';
    ctx.fillText('✓ Enviada', cx, cy - h * 0.12);
    ctx.fillStyle = '#555';
    ctx.font = '400 ' + Math.round(R * 0.16) + 'px Inter, sans-serif';
    ctx.fillText('Factura electrónica', cx, cy + h * 0.22);
  } else if (kind === 'check') {
    ctx.fillStyle = '#FFB020';
    ctx.font = '900 ' + Math.round(R * 0.4) + 'px Inter, sans-serif';
    ctx.fillText('✓ ✓ ✓', cx, cy);
  } else if (kind === 'chart-up' || kind === 'chart-down') {
    const hs = kind === 'chart-up' ? [0.3, 0.55, 0.8, 1] : [1, 0.7, 0.45, 0.25];
    const g = ctx.createLinearGradient(cx, cy - h * 0.4, cx, cy + h * 0.4);
    if (kind === 'chart-up') {
      g.addColorStop(0, '#34D399');
      g.addColorStop(1, '#FFB020');
    } else {
      g.addColorStop(0, '#8b5cf6');
      g.addColorStop(1, '#FF5A3C');
    }
    ctx.fillStyle = g;
    hs.forEach((f, i) => {
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.4 + i * w * 0.21, cy + h * 0.4 - h * 0.8 * f, w * 0.15, h * 0.8 * f, 6);
      ctx.fill();
    });
  } else if (kind === 'layers') {
    const g = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
    g.addColorStop(0, '#8b5cf6');
    g.addColorStop(1, '#FF5A3C');
    ctx.fillStyle = g;
    [0.4, 0.3, 0.2].forEach((f, i) => {
      ctx.beginPath();
      ctx.roundRect(cx - w * f, cy - h * 0.3 + i * h * 0.3, w * 2 * f, h * 0.16, 99);
      ctx.fill();
    });
  } else if (kind === 'search') {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx - R * 0.05, cy - R * 0.05, R * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.14, cy + R * 0.14);
    ctx.lineTo(cx + R * 0.36, cy + R * 0.36);
    ctx.stroke();
  } else if (kind === 'clock') {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - R * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * 0.16, cy);
    ctx.stroke();
  } else if (kind === 'paper') {
    const pw = w * 0.6;
    const ph = h * 0.72;
    const px = cx - pw / 2;
    const py = cy - ph / 2;
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.roundRect(px + 12, py + 12, pw, ph, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();
    ctx.fillStyle = '#1A1A26';
    ctx.beginPath();
    ctx.roundRect(px + pw * 0.1, py + ph * 0.12, pw * 0.5, ph * 0.09, 99);
    ctx.fill();
    ctx.fillStyle = '#C4B5FD';
    (
      [
        [0.72, 0.3],
        [0.6, 0.46],
        [0.72, 0.62],
      ] as [number, number][]
    ).forEach(([f, yf]) => {
      ctx.beginPath();
      ctx.roundRect(px + pw * 0.1, py + ph * yf, pw * f, ph * 0.07, 99);
      ctx.fill();
    });
    const sx = px + pw * 0.78;
    const sy = py + ph * 0.78;
    const sr = Math.min(pw, ph) * 0.16;
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, sr * 0.28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - sr * 0.45, sy);
    ctx.lineTo(sx - sr * 0.1, sy + sr * 0.35);
    ctx.lineTo(sx + sr * 0.5, sy - sr * 0.35);
    ctx.stroke();
  } else if (kind === 'avatar') {
    const g = ctx.createLinearGradient(cx - R * 0.3, cy - R * 0.3, cx + R * 0.3, cy + R * 0.3);
    g.addColorStop(0, '#FFB020');
    g.addColorStop(0.5, '#FF5A3C');
    g.addColorStop(1, '#8B5CF6');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(5, R * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.round(R * 0.28) + 'px Inter, sans-serif';
    ctx.fillText('AR', cx, cy + 1);
  }
  ctx.restore();
}

export type FrameScene = Scene & { split?: boolean };

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  s: FrameScene,
  localT: number,
  W: number,
  H: number,
  format: FormatId,
): void {
  const p = clamp(localT / 0.6, 0, 1);
  const u = Math.min(W, H);
  const pad = Math.round(u * 0.07);
  const headY = format === '16:9' ? H * 0.24 : format === '1:1' ? H * 0.26 : H * 0.3;
  const visY = format === '1:1' ? H * 0.64 : format === '16:9' ? H * 0.62 : H * 0.6;
  const visH = Math.round(H * (format === '1:1' ? 0.11 : 0.12));
  if (s.split) {
    ctx.fillStyle = '#17171F';
    ctx.fillRect(0, 0, W / 2, H);
    const g = ctx.createLinearGradient(W / 2, 0, W, H);
    g.addColorStop(0, '#FFB020');
    g.addColorStop(0.5, '#FF5A3C');
    g.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2, 0, W / 2, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '600 ' + Math.round(u * 0.03) + 'px "JetBrains Mono", monospace';
    ctx.fillText('ANTES', W * 0.25, H * 0.45);
    ctx.fillText('DESPUÉS', W * 0.75, H * 0.45);
    ctx.font = '700 ' + Math.round(u * 0.07) + 'px "Space Grotesk", sans-serif';
    ctx.fillText('apagado', W * 0.25, H * 0.53);
    ctx.fillText('glow total', W * 0.75, H * 0.53);
  } else {
    const cols = TONE_BG[s.tone || 'tone-dark'] || ['#1A1A26', '#0A0A0F'];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cols[0]);
    g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = p;
    ctx.fillStyle = '#FFB020';
    ctx.font = '600 ' + Math.round(u * 0.028) + 'px "JetBrains Mono", monospace';
    ctx.fillText((s.kicker || '').toUpperCase(), pad, headY + (1 - p) * 24);
    ctx.font = '700 ' + Math.round(u * 0.085) + 'px "Space Grotesk", sans-serif';
    const lineH = Math.round(u * 0.105);
    const afterHeadline = drawHeadline(ctx, s, pad, headY + (1 - p) * 24 + lineH, lineH, W - pad * 2);
    ctx.fillStyle = 'rgba(245,245,242,.78)';
    ctx.font = '400 ' + Math.round(u * 0.036) + 'px Inter, sans-serif';
    wrapText(ctx, s.sub || '', W - pad * 2).forEach((ln, i) =>
      ctx.fillText(ln, pad, afterHeadline + 26 + i * Math.round(u * 0.05)),
    );
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.roundRect(pad, visY, W - pad * 2, visH, 16);
    ctx.fill();
    ctx.stroke();
    drawVisualShape(ctx, s.visualKind, W / 2, visY + visH / 2, W - pad * 2, visH, s);
    if (s.isCTA) {
      const cg = ctx.createLinearGradient(pad, 0, W - pad, 0);
      cg.addColorStop(0, '#FFB020');
      cg.addColorStop(0.5, '#FF5A3C');
      cg.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(pad, H * 0.76, W - pad * 2, Math.round(H * 0.055), 999);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 ' + Math.round(u * 0.036) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.ctaLabel || 'Comprar ahora', W / 2, H * 0.76 + Math.round(H * 0.037));
      ctx.textAlign = 'left';
    }
  }
  // Caption dentro de la safe zone: su borde inferior queda justo en el 90%.
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  const capH = Math.round(H * 0.075);
  const capY = Math.round(H * 0.9 - capH);
  ctx.beginPath();
  ctx.roundRect(pad, capY, W - pad * 2, capH, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 ' + Math.round(u * 0.03) + 'px Inter, sans-serif';
  ctx.textAlign = 'left';
  wrapText(ctx, s.caption || '', W - pad * 2 - 20)
    .slice(0, 2)
    .forEach((ln, i) =>
      ctx.fillText(ln, pad + 12, capY + Math.round(capH * 0.38) + i * Math.round(u * 0.038)),
    );
  ctx.globalAlpha = 1;
}

export type LogKind = 'info' | 'ok' | 'warn' | 'edit';

export interface ExportCallbacks {
  onStatus: (text: string) => void;
  onLog: (kind: LogKind, text: string, tag: string) => void;
  onSeek: (t: number) => void;
  onDone: (sizeMB: number, filename: string) => void;
  onError: (text: string) => void;
}

/** Graba la timeline en un canvas y la descarga como WebM (MediaRecorder). */
export async function exportWebM(
  scenes: Scene[],
  format: FormatId,
  templateId: string,
  cb: ExportCallbacks,
): Promise<void> {
  if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
    cb.onError('Tu navegador no soporta grabación con MediaRecorder. Prueba en Chrome o Edge.');
    cb.onLog('warn', 'Exportación WebM no soportada en este navegador.', 'EXPORT');
    return;
  }
  try {
    await document.fonts.ready;
  } catch {
    /* fuentes no disponibles: se usa el fallback */
  }
  const dims = exportDims(format);
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      this.rect(x, y, w, h);
      return this;
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cb.onError('No se pudo crear el canvas de exportación.');
    return;
  }
  const stream = canvas.captureStream(30);
  let mime = 'video/webm;codecs=vp9';
  if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mime)) {
    mime = 'video/webm';
  }
  let rec: MediaRecorder;
  try {
    const vbps = dims.w >= 1920 || dims.h >= 1920 ? 12000000 : 10000000;
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vbps });
  } catch {
    cb.onError('No se pudo iniciar MediaRecorder en este navegador.');
    return;
  }
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const total = totalDuration(scenes);
  const filename = `flare-${templateId}-${format.replace(':', 'x')}.webm`;
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    const sizeMB = blob.size / 1048576;
    cb.onStatus(`Video WebM exportado (${sizeMB.toFixed(1)} MB).`);
    cb.onLog('ok', `Video WebM exportado: ${filename} (${sizeMB.toFixed(1)} MB).`, 'EXPORT');
    cb.onDone(sizeMB, filename);
  };
  cb.onLog('info', 'Exportando video WebM: reproduciendo la timeline y capturando el canvas a 30 fps…', 'EXPORT');
  rec.start(250);
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = (now - t0) / 1000;
    if (t >= total) {
      const s = scenes[scenes.length - 1];
      drawFrame(ctx, s, s.duration, dims.w, dims.h, format);
      cb.onSeek(total);
      cb.onStatus('Finalizando exportación…');
      rec.stop();
      return;
    }
    const idx = scenes.findIndex((s) => t >= s.start && t < s.start + s.duration);
    const s = scenes[idx === -1 ? 0 : idx];
    drawFrame(ctx, s, t - s.start, dims.w, dims.h, format);
    cb.onSeek(t);
    cb.onStatus(`Grabando… ${t.toFixed(1)} s / ${total.toFixed(1)} s`);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Storyboard HTML ---------- */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildStoryboardHtml(
  scenes: Scene[],
  template: TemplateMeta,
  format: FormatId,
  retentionTotal: number | null,
): string {
  const total = totalDuration(scenes);
  const rows = scenes
    .map(
      (s, i) =>
        '<section class="sb-scene"><div class="sb-num">' +
        (i + 1) +
        '</div><div><h3>' +
        esc(s.name) +
        ' <span>' +
        s.start.toFixed(1) +
        '–' +
        (s.start + s.duration).toFixed(1) +
        ' s</span></h3>' +
        '<p class="sb-head">' +
        esc(s.headline || 'Antes / Después (pantalla partida)') +
        '</p>' +
        '<p>' +
        esc(s.sub || '') +
        '</p>' +
        '<p class="sb-cap">Caption (' +
        s.captionDuration +
        ' s): “' +
        esc(s.caption) +
        '”</p>' +
        (s.isCTA ? '<p class="sb-cta">' + esc(s.ctaLabel || '') + '</p>' : '') +
        '</div></section>',
    )
    .join('\n');
  return (
    '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<title>Storyboard — ' +
    esc(template.product) +
    ' · Flare</title>\n' +
    '<style>body{font-family:Inter,system-ui,sans-serif;background:#0A0A0F;color:#F5F5F2;margin:0;padding:40px}h1{font-family:"Space Grotesk",sans-serif;font-size:32px}h1 span{background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:transparent}.meta{color:#9A9AA8}.sb-scene{display:flex;gap:16px;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin:14px 0}.sb-num{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex:none}.sb-scene h3 span{color:#9A9AA8;font-size:14px;font-weight:400}.sb-head{font-size:19px;font-weight:700}.sb-cap{color:#9A9AA8}.sb-cta{display:inline-block;background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);padding:8px 16px;border-radius:999px;font-weight:700}</style>\n</head>\n<body>\n' +
    '<h1>Storyboard — <span>' +
    esc(template.product) +
    '</span></h1>\n' +
    '<p class="meta">Flare Studio · ' +
    esc(template.name) +
    ' · Formato ' +
    format +
    ' · ' +
    total +
    ' s · Score de retención ' +
    (retentionTotal === null ? 'sin verificar' : retentionTotal + '/100') +
    '</p>\n' +
    rows +
    '\n<p class="meta">Generado con Flare Studio. Atrapa la mirada. Retén el scroll. Gana el click.</p>\n</body>\n</html>'
  );
}
