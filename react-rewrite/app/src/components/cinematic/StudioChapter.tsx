// Flare — capítulo 06: puente cinematográfico hacia el Studio.
// El Studio real se monta como children; este marco le da número de
// capítulo, titular y atmósfera para que la transición landing → app no
// sea un corte seco. Vive fuera de .cine-root (el Studio conserva su
// cursor y su chrome nativos).

import type { ReactNode } from 'react';
import { Reveal } from './motion';

export function StudioChapter({ children }: { children: ReactNode }) {
  return (
    <section id="studio" className="studio-stage scroll-mt-24">
      <div className="mx-auto w-full max-w-[1680px] px-5 pt-20 sm:px-8 lg:px-12">
        <div className="grid gap-8 border-t border-white/10 pt-6 lg:grid-cols-12">
          <p className="section-num lg:col-span-3">06 / El estudio</p>
          <Reveal className="lg:col-span-6">
            <h2 className="display m-0 text-[clamp(2.4rem,4.5vw,4.4rem)]">
              El set está abierto.{' '}
              <span className="serif-i text-flare-soft">Pasa.</span>
            </h2>
          </Reveal>
          <p className="max-w-xs text-sm leading-relaxed text-[#B8B4AB] lg:col-span-3">
            Esto no es una captura: el preview corre, la timeline responde y el score se
            mide en tu navegador mientras mueves las piezas.
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
