// Flare — App: landing + Studio (una sola página, como la versión vanilla).
// La landing puede pedir abrir una plantilla en el Studio (openTemplate con
// nonce para que cada click cuente, aunque sea la misma plantilla).

import { useCallback, useState } from 'react';
import { Landing } from './components/landing';
import { Studio } from './components/studio/Studio';

export default function App() {
  const [openTemplate, setOpenTemplate] = useState<{ slug: string; nonce: number } | null>(null);

  const openStudio = useCallback((slug?: string) => {
    if (slug) setOpenTemplate({ slug, nonce: Date.now() });
    document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans text-[#F5F5F2] antialiased">
      <Landing onOpenStudio={openStudio} />
      <Studio openTemplate={openTemplate} />
    </div>
  );
}
