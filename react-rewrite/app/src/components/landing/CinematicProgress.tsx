// Barra de progreso cinematográfica (§7 Cinematic): fina, con el degradado
// Flare, ancho pilotado por gsap.quickSetter en onUpdate y porcentaje en
// mono (000%→100%). Se oculta mientras el Studio está en pantalla para no
// tapar su UI.

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function CinematicProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const label = labelRef.current;
    if (!bar || !label) return;
    const setWidth = gsap.quickSetter(bar, 'width', '%');
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        setWidth(self.progress * 100);
        label.textContent = `${String(Math.round(self.progress * 100)).padStart(3, '0')}%`;
      },
    });
    const hide = ScrollTrigger.create({
      trigger: '#studio',
      start: 'top 85%',
      end: 'bottom 15%',
      onToggle: (self) => {
        gsap.to(rootRef.current, { opacity: self.isActive ? 0 : 1, duration: 0.3, overwrite: true });
      },
    });
    return () => {
      st.kill();
      hide.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-x-0 top-0 z-[70]" aria-hidden="true">
      <div ref={barRef} className="bg-flare h-[3px] w-0" />
      <span
        ref={labelRef}
        className="absolute right-3 top-2 font-mono text-[10px] tracking-[0.2em] text-[#82828F]"
      >
        000%
      </span>
    </div>
  );
}
