// Flare — SplineSlot: hueco preparado para una escena Spline.
//
// Spline necesita una escena PUBLICADA (URL de splinetool) diseñada a mano;
// no existe ninguna para Flare. El catálogo lo dice claro: sin asset, no se
// improvisa uno. Este componente NO renderiza nada mientras no haya escena
// (nada de placeholder falso en la UI), y se activa solo con
// VITE_SPLINE_SCENE_URL en el entorno de build:
//
//   VITE_SPLINE_SCENE_URL=https://prod.spline.design/<escena>/scene.splinecode
//
// Cuando esté configurado, el hero de la landing lo muestra como fondo
// interactivo detrás del titular. Hasta entonces, el fondo del hero es el
// Particles de Magic UI (componente real, sin asset externo).

import Spline from '@splinetool/react-spline';

export function SplineSlot({ className }: { className?: string }) {
  const url = import.meta.env.VITE_SPLINE_SCENE_URL as string | undefined;
  if (!url) return null;
  return (
    <div className={className} aria-hidden="true">
      <Spline scene={url} />
    </div>
  );
}
