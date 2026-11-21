// Flare — AgentOrb: el avatar del agente en el Studio.
//
// Lottie REAL con datos embebidos (SpiralLoader de 21st.dev Agent Elements:
// el loader en espiral que usan sus tool cards). Sin asset externo.
// Fallback del catálogo aplicado: Rive necesita un .riv diseñado y Spline
// una escena publicada; no hay ninguno de los dos, así que el orbe es
// Lottie con segmentos y el slot Rive/Spline queda preparado y documentado
// (ver SplineSlot.tsx y DESIGN.md §5).
//
// El anillo cambia de color según el estado del agente; el punto indica
// actividad. `prefers-reduced-motion` lo apaga el CSS global.

import { SpiralLoader } from '../vendor/agent-elements/components/spiral-loader';

export type AgentStatus = 'inactivo' | 'pensando' | 'analizando' | 'editando' | 'renderizando' | 'listo';

const STATUS_COLOR: Record<AgentStatus, string> = {
  inactivo: '#6E6E7C',
  pensando: '#FFB020',
  analizando: '#FF5A3C',
  editando: '#8B5CF6',
  renderizando: '#FF5A3C',
  listo: '#34D399',
};

export function AgentOrb({
  status,
  size = 56,
}: {
  status: AgentStatus;
  size?: number;
}) {
  const color = STATUS_COLOR[status];
  const active = status !== 'inactivo' && status !== 'listo';
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full border"
      style={{
        width: size,
        height: size,
        borderColor: color + '55',
        background: 'radial-gradient(circle at 35% 30%, rgba(255,176,32,0.14), rgba(139,92,246,0.10) 70%)',
        boxShadow: active ? `0 0 24px ${color}44` : 'none',
      }}
      aria-label={`Agente: ${status}`}
    >
      <SpiralLoader size={Math.round(size * 0.62)} />
      <span
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F]"
        style={{ background: color }}
      />
    </div>
  );
}
