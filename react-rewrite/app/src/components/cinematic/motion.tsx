// Flare — utilidades de movimiento del rediseño cinematográfico.
// Principios (Codrops / Propagande / DKTON):
//  - El scroll es dirección: Lenis + ScrollTrigger, una sola línea de tiempo.
//  - Los textos entran por máscaras de línea, no por fade genérico.
//  - Todo respeta prefers-reduced-motion.
//  - Nada de animar layout: solo transform, opacity y filter.

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isReducedMotion } from '../landing/codrops-effects';

gsap.registerPlugin(ScrollTrigger);

/* ---------------- Reveal: un bloque que sube y se enfoca ---------------- */

export function Reveal({
  children,
  className,
  delay = 0,
  y = 30,
  blur = true,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !ref.current) return;
    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y, autoAlpha: 0, filter: blur ? 'blur(9px)' : 'none' },
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1.15,
          delay,
          ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [delay, y, blur, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ---------------- Líneas con máscara ---------------- */

export interface CinematicLine {
  content: ReactNode;
  className?: string;
}

export function AnimatedLines({
  lines,
  className,
  lineClassName = '',
  play = true,
  scrollTrigger = false,
  delay = 0,
  stagger = 0.09,
}: {
  lines: CinematicLine[];
  className?: string;
  lineClassName?: string;
  play?: boolean;
  scrollTrigger?: boolean;
  delay?: number;
  stagger?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!play || !root.current || isReducedMotion()) return;
    const el = root.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.line-inner'),
        { yPercent: 118, rotate: 2.4 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.25,
          delay,
          stagger,
          ease: 'power4.out',
          ...(scrollTrigger
            ? { scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
            : {}),
        },
      );
    }, el);
    return () => ctx.revert();
  }, [play, scrollTrigger, delay, stagger]);

  return (
    <div ref={root} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`line-mask ${lineClassName}`}>
          <span className="line-inner">{line.content}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------------- Botón magnético ---------------- */

export function Magnetic({
  children,
  className = '',
  strength = 0.24,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={`magnetic ${className}`}>
      {children}
    </div>
  );
}

/* ---------------- Entrada cinematográfica del hero ---------------- */

export function useIntroTimeline(
  root: React.RefObject<HTMLElement | null>,
  play: boolean,
  onDone?: () => void,
) {
  useEffect(() => {
    if (!play || !root.current) return;
    if (isReducedMotion()) {
      onDone?.();
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: onDone });
      tl.fromTo(
        '[data-intro="eyebrow"]',
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.9 },
      )
        .fromTo(
          '[data-intro="line"] .line-inner',
          { yPercent: 118, rotate: 2 },
          { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.1 },
          0.08,
        )
        .fromTo(
          '[data-intro="sub"], [data-intro="cta"], [data-intro="meta"]',
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 },
          0.6,
        )
        .fromTo(
          '[data-intro="phone"]',
          { autoAlpha: 0, y: 70, rotateY: -16, scale: 0.92 },
          { autoAlpha: 1, y: 0, rotateY: 0, scale: 1, duration: 1.5 },
          0.35,
        )
        .fromTo(
          '[data-intro="chip"]',
          { autoAlpha: 0, scale: 0.8 },
          { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.12 },
          1.05,
        );
    }, root);
    return () => ctx.revert();
  }, [play, root, onDone]);
}

/* ---------------- Parallax suave ---------------- */

export function useParallax(
  ref: React.RefObject<HTMLElement | null>,
  amount = 80,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        y: amount,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, el);
    return () => ctx.revert();
  }, [ref, amount]);
}

/* ---------------- Número animado ---------------- */

export function useTweenedNumber(value: number, duration = 0.9) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (isReducedMotion()) {
      node.textContent = String(value);
      return;
    }
    const proxy = { n: prev.current };
    const tween = gsap.to(proxy, {
      n: value,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        node.textContent = String(Math.round(proxy.n));
      },
    });
    prev.current = value;
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return el;
}
