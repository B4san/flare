// Utilidades Codrops para la landing de Flare.
// Técnicas con fuente en CODROPS-RESEARCH.md: Lenis (§1/§5), CustomEase
// "cinematic" (§7), Cursor Scramble (§2 v01, reimplementado a mano para
// poder mover el cursor bloque entre caracteres y no depender del plugin).
// Solo landing: no toca el Studio ni el motor de retención.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

let easingsCreated = false;
export function registerCodropsEasings(): void {
  if (easingsCreated) return;
  easingsCreated = true;
  // §7 Cinematic: curvas del repo codrops-cinematic-scroll-animations.
  CustomEase.create('cinematic', '0.45,0.05,0.55,0.95');
  CustomEase.create('cinematicFlow', '0.33,0,0.2,1');
}

export function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// ---------- Lenis (singleton, ~10 KB) ----------

let lenis: Lenis | null = null;

function onAnchorClick(e: MouseEvent): void {
  const a = (e.target as HTMLElement | null)?.closest?.(
    'a[href^="#"]',
  ) as HTMLAnchorElement | null;
  if (!a) return;
  const hash = a.getAttribute('href');
  if (!hash || hash.length < 2) return;
  const el = document.querySelector(hash);
  if (!el) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -72, duration: 1.4 });
  else (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
}

export function initSmoothScroll(): Lenis | null {
  if (lenis || isReducedMotion()) return lenis;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', onAnchorClick);
  return lenis;
}

/** Scroll programático que respeta Lenis (usado por nav, rail y CTAs). */
export function scrollToId(id: string, offset = -72): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset, duration: 1.5 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Volver arriba sin pelear con Lenis. */
export function scrollToTop(): void {
  if (lenis) lenis.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function destroySmoothScroll(): void {
  document.removeEventListener('click', onAnchorClick);
  lenis?.destroy();
  lenis = null;
}

/**
 * Bloqueo de scroll real para overlays (modal del reel, menú móvil).
 * `overflow: hidden` en <body> no frena a Lenis porque Lenis mueve
 * window; hay que llamar a stop()/start() además de fijar el estilo.
 */
export function setScrollLocked(locked: boolean): void {
  if (typeof document === 'undefined') return;
  if (locked) {
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('lenis-stopped');
  } else {
    document.body.style.overflow = '';
    document.documentElement.classList.remove('lenis-stopped');
    lenis?.start();
  }
}

// ---------- Cursor Scramble (§2 v01, versión propia) ----------
// Revela los caracteres de izquierda a derecha: cada uno cicla por 3
// glifos aleatorios y se asienta; el cursor bloque viaja con el carácter
// activo (insertBefore). Los espacios se revelan al instante.
// Devuelve una función para cancelar los timers pendientes.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/<>=+*#';

export function scrambleSequence(
  chars: HTMLElement[],
  cursor: HTMLElement | null,
  opts?: { perChar?: number; shuffles?: number; onDone?: () => void },
): () => void {
  const perChar = opts?.perChar ?? 0.035;
  const shuffles = opts?.shuffles ?? 3;
  let cancelled = false;
  const timers: number[] = [];

  chars.forEach((el, i) => {
    const final = el.dataset.char ?? el.textContent ?? '';
    const start = i * perChar * 1000;
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        if (final.trim() === '') {
          el.style.opacity = '1';
          return;
        }
        // El cursor viaja delante del carácter activo.
        if (cursor && el.parentElement) el.parentElement.insertBefore(cursor, el);
        if (cursor) {
          cursor.style.display = '';
          cursor.style.opacity = '1';
        }
        let n = 0;
        const iv = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(iv);
            return;
          }          if (n >= shuffles) {
            window.clearInterval(iv);
            el.textContent = final;
            el.style.opacity = '1';
            if (i === chars.length - 1) {
              if (cursor) {
                const parent = chars[0]?.parentElement;
                if (parent) parent.appendChild(cursor);
                // display:none (no opacity): la animación an-blink anima
                // opacity y pisaría un opacity: 0 inline, dejando el
                // cursor parpadeando para siempre al final del tagline.
                cursor.style.display = 'none';
              }
              opts?.onDone?.();
            }
            return;
          }
          el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          el.style.opacity = '1';
          n++;
        }, 50);
        timers.push(iv);
      }, start),
    );
  });

  return () => {
    cancelled = true;
    timers.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
  };
}
