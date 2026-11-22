// Flare — landing cinematográfica (rediseño 2026).
//
// Composición editorial en seis capítulos: hero, manifiesto, reel, motor
// de retención, proceso y agentes. El Studio (capítulo 06) y el finale
// (07) los compone App para que el orden del DOM —y del rail— sea el
// mismo que se recorre con el scroll. Lenis + ScrollTrigger mueven todo;
// el Studio sigue intacto y funcional.
//
// Referencias: case studies de Codrops 2026 (Propagande, DKTON, Serotoninn,
// Cloth Posters WebGPU, Kinetic Typography, Telescope Zoom) + el sistema de
// componentes propio de Flare.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { destroySmoothScroll, initSmoothScroll } from './landing/codrops-effects';
import {
  ChapterRail,
  CineCursor,
  CineGrain,
  CineNav,
  Preloader,
} from './cinematic/Chrome';
import { Hero } from './cinematic/Hero';
import { Manifesto } from './cinematic/Manifesto';
import { ReelRail } from './cinematic/ReelRail';
import { RetentionLab } from './cinematic/RetentionLab';
import { ProcessActs } from './cinematic/ProcessActs';
import { AgentsSection } from './cinematic/AgentsSection';

interface LandingProps {
  onOpenStudio: (slug?: string) => void;
}

export function Landing({ onOpenStudio }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    initSmoothScroll();
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      window.clearTimeout(refresh);
      window.removeEventListener('load', onLoad);
      destroySmoothScroll();
    };
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => window.clearTimeout(t);
  }, [introDone]);

  return (
    <div ref={rootRef} className="cine-root">
      <Preloader onDone={finishIntro} />
      <CineCursor />
      <CineGrain />
      <CineNav onOpenStudio={() => onOpenStudio()} />
      <ChapterRail />

      <Hero introDone={introDone} onOpenStudio={() => onOpenStudio()} />

      <Manifesto onOpenStudio={onOpenStudio} />

      <ReelRail onOpenStudio={onOpenStudio} />

      <RetentionLab />

      <ProcessActs />

      <AgentsSection onOpenStudio={() => onOpenStudio()} />
    </div>
  );
}
