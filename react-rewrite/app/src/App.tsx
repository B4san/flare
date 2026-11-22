// Flare — App: landing + Studio + finale (una sola página, como la
// versión vanilla). Orden del DOM = orden de los capítulos del rail:
// 01 manifiesto → 05 agentes → 06 Studio → 07 acción. El Studio vive
// FUERA de .cine-root para conservar su cursor nativo y su chrome.
// La landing puede pedir abrir una plantilla en el Studio (openTemplate
// con nonce para que cada click cuente, aunque sea la misma plantilla).

import { useCallback, useState } from 'react';
import { Landing } from './components/landing';
import { Finale } from './components/cinematic/Finale';
import { StudioChapter } from './components/cinematic/StudioChapter';
import { Studio } from './components/studio/Studio';
import { scrollToId } from './components/landing/codrops-effects';

export default function App() {
  const [openTemplate, setOpenTemplate] = useState<{ slug: string; nonce: number } | null>(null);

  const openStudio = useCallback((slug?: string) => {
    if (slug) setOpenTemplate({ slug, nonce: Date.now() });
    // Lenis es el dueño del scroll: scrollIntoView nativo se pelea con él.
    // #studio-app apunta a la app; #studio (el capítulo) queda para el rail.
    scrollToId('studio-app');
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans text-[#F5F5F2] antialiased">
      <Landing onOpenStudio={openStudio} />
      <StudioChapter>
        <Studio openTemplate={openTemplate} />
      </StudioChapter>
      <div className="cine-root">
        <Finale onOpenStudio={() => openStudio()} />
      </div>
    </div>
  );
}
