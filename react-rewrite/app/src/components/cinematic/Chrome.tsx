// Flare — chrome cinematográfico: preloader, cursor propio, navegación
// editorial, rail de capítulos, grano y componentes compartidos.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { isReducedMotion, scrollToId, scrollToTop, setScrollLocked } from '../landing/codrops-effects';
import { CHAPTERS, NAV_LINKS } from './chapters';
import { Magnetic } from './motion';

/* ======================= PRELOADER ======================= */

export function Preloader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (isReducedMotion()) {
      onDone();
      setGone(true);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const start = performance.now();
    const total = 1180;
    let raf = 0;
    let leaveTimer = 0;
    let goneTimer = 0;

    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - start) / total) * 100));
      setProgress(p);
      if (p < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        leaveTimer = window.setTimeout(() => {
          setLeaving(true);
          if (!fired.current) {
            fired.current = true;
            onDone();
          }
          goneTimer = window.setTimeout(() => {
            setGone(true);
            document.body.style.overflow = prevOverflow;
          }, 1000);
        }, 170);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(goneTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [onDone]);

  if (gone) return null;

  return (
    <div className="preloader" data-state={leaving ? 'leaving' : 'loading'} aria-hidden="true">
      <div className="absolute inset-x-6 top-6 flex items-center justify-between sm:inset-x-10 sm:top-8">
        <span className="kicker">Estudio agent-native</span>
        <span className="kicker">MMXXVI</span>
      </div>
      <div className="flex flex-col items-center gap-8">
        <div className="preloader-word" aria-label="Flare">
          {'FLARE'.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
              {c}
            </span>
          ))}
        </div>
        <div className="preloader-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between sm:inset-x-10 sm:bottom-8">
        <span className="kicker">Cargando el set</span>
        <span className="font-mono text-[11px] tracking-[0.2em] text-[#F4F1E9]">
          {String(progress).padStart(3, '0')}%
        </span>
      </div>
    </div>
  );
}

/* ======================= CURSOR ======================= */

export function CineCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReducedMotion()) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let raf = 0;
    let visible = false;

    const render = () => {
      pos.x += (target.x - pos.x) * 0.16;
      pos.y += (target.y - pos.y) * 0.16;
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      label.style.transform = `translate3d(${pos.x}px, ${pos.y + 48}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const setState = (cursor: string | null, isLink: boolean) => {
      ring.classList.toggle('is-link', isLink);
      ring.classList.toggle('is-drag', cursor === 'drag');
      label.textContent = cursor && cursor !== 'link' ? cursor : '';
      label.classList.toggle('is-on', !!cursor && cursor !== 'link');
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = (e.target as HTMLElement | null)?.closest?.('.cine-root');
      const inside = !!el && !(e.target as HTMLElement | null)?.closest?.('.studio-stage');
      if (!inside) {
        if (visible) {
          visible = false;
          dot.style.opacity = '0';
          ring.style.opacity = '0';
          label.style.opacity = '0';
        }
        return;
      }
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      const node = e.target as HTMLElement | null;
      const labelled = node?.closest?.('[data-cursor]') as HTMLElement | null;
      const interactive = node?.closest?.('a, button, [role="button"], input, textarea, select');
      setState(labelled?.dataset.cursor ?? (interactive ? 'link' : null), !!interactive);
    };

    const onDown = () => {
      dot.style.width = '10px';
      dot.style.height = '10px';
    };
    const onUp = () => {
      dot.style.width = '6px';
      dot.style.height = '6px';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" style={{ opacity: 0 }} />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" style={{ opacity: 0 }} />
      <div ref={labelRef} className="cursor-label" aria-hidden="true" />
    </>
  );
}

/* ======================= NAV ======================= */

export function CineNav({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const ids = CHAPTERS.map((c) => c.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-38% 0px -52% 0px', threshold: [0, 0.2, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrollLocked(open);
    return () => setScrollLocked(false);
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    window.setTimeout(() => scrollToId(id), 40);
  };

  return (
    <>
      <header className={`nav-shell ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="mx-auto flex h-[72px] max-w-[1680px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={scrollToTop}
            className="group flex items-center gap-3"
            data-cursor="Inicio"
            aria-label="Flare — volver arriba"
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#FF5A3C] blur-[5px]" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#FFB020]" />
            </span>
            <span className="font-display text-[19px] font-bold tracking-[-0.04em]">FLARE</span>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.24em] text-[#8C8A92] sm:inline">
              Agent-native studio
            </span>
          </button>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Secciones">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`nav-link ${active === l.href.slice(1) ? 'is-active' : ''}`}
                data-cursor="Ir"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenStudio}
              className="flare-btn flare-btn-ghost hidden h-9 px-4 text-[11px] uppercase tracking-[0.14em] sm:inline-flex"
              data-cursor="Abrir"
            >
              Abrir Studio
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#F4F1E9] lg:hidden"
              aria-label="Abrir menú"
              data-cursor="Menú"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        <span ref={progressRef} className="nav-progress" aria-hidden="true" />
      </header>

      <div className={`nav-menu ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menú">
        <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
          <span className="font-display text-[19px] font-bold tracking-[-0.04em]">FLARE</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15"
            aria-label="Cerrar menú"
            data-cursor="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-col gap-3 px-5 pt-10 sm:px-8" aria-label="Menú móvil">
          {CHAPTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => go(c.id)}
              className="flex items-baseline gap-4 text-left"
              data-cursor="Ir"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#8C8A92]">{c.n}</span>
              <span className="font-display text-[clamp(2.4rem,10vw,5rem)] font-bold leading-[1.02] tracking-[-0.04em]">
                {c.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="absolute inset-x-5 bottom-8 flex items-center justify-between border-t border-white/10 pt-5 sm:inset-x-8">
          <span className="kicker">Dojo AI Hackathon 2026</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenStudio();
            }}
            className="flare-btn flare-btn-solid h-10 px-5 text-sm"
            data-cursor="Abrir"
          >
            Abrir el Studio <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ======================= RAIL DE CAPÍTULOS ======================= */

export function ChapterRail() {
  const [active, setActive] = useState('manifiesto');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] },
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="chapter-rail" aria-hidden="true">
      {CHAPTERS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={active === c.id ? 'is-active' : ''}
          onClick={() => scrollToId(c.id)}
          tabIndex={-1}
        >
          <i />
          <span>
            {c.n} · {c.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ======================= GRANO / ATMÓSFERA ======================= */

export function CineGrain() {
  return (
    <>
      <div className="cine-grain" aria-hidden="true" />
      <div className="cine-vignette" aria-hidden="true" />
    </>
  );
}

/* ======================= BOTÓN FLARE ======================= */

export function FlareButton({
  children,
  onClick,
  href,
  variant = 'solid',
  className = '',
  cursor = 'Abrir',
  icon,
  target,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'solid' | 'ghost';
  className?: string;
  cursor?: string;
  icon?: ReactNode;
  target?: string;
}) {
  const cls = `flare-btn flare-btn-${variant} ${className}`;
  const inner = (
    <>
      {children}
      {icon ?? <ArrowUpRight className="h-4 w-4" />}
    </>
  );
  return (
    <Magnetic>
      {href ? (
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noreferrer' : undefined}
          className={cls}
          data-cursor={cursor}
        >
          {inner}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={cls} data-cursor={cursor}>
          {inner}
        </button>
      )}
    </Magnetic>
  );
}

/* ======================= CABECERA DE SECCIÓN ======================= */

export function SectionIntro({
  n,
  label,
  title,
  aside,
  className = '',
}: {
  n: string;
  label: string;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-8 border-t border-white/10 pt-6 lg:grid-cols-12 ${className}`}>
      <div className="lg:col-span-3">
        <p className="section-num">
          {n} / {label}
        </p>
      </div>
      <div className="lg:col-span-6">
        <h2 className="display m-0 text-[clamp(2.4rem,4.5vw,4.4rem)]">{title}</h2>
      </div>
      {aside && (
        <div className="lg:col-span-3 lg:justify-self-end">
          <p className="max-w-xs text-sm leading-relaxed text-[#B8B4AB]">{aside}</p>
        </div>
      )}
    </div>
  );
}

/* ======================= CTA DE TEXTO ======================= */

export function TextLink({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <span className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8B4AB] transition-colors hover:text-[#F4F1E9]">
      {children}
      <ArrowDownRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
    </span>
  );
  if (href) {
    return (
      <a href={href} data-cursor="Ver">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} data-cursor="Ver">
      {inner}
    </button>
  );
}
