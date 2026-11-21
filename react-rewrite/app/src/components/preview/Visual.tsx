// Flare — visual de producto del preview (SVG, arte propio).
//
// Mismo arte que el preview vanilla (.pv-*) y que el export a canvas
// (drawVisualShape): luna ámbar, cama blanca/lavanda, sol, pantalla,
// barras… Nada de texto placeholder. Cada visual tiene altura FIJA en el
// layout (PreviewClip) y flex-none/min-h-0: un visual NUNCA puede colapsar
// a 0–2 px por flex-shrink (R6 B6).

interface VisualProps {
  kind?: string;
  /** Texto del badge (kicker del producto). */
  label?: string;
  className?: string;
}

export function Visual({ kind, label, className }: VisualProps) {
  const cls = className ?? 'h-full w-auto';
  switch (kind) {
    case 'moon':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <radialGradient id="pv-moon" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fffbe6" />
              <stop offset="60%" stopColor="#ffd76a" />
              <stop offset="100%" stopColor="#f5b942" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="42" fill="url(#pv-moon)" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#ffd76a" strokeOpacity="0.25" strokeWidth="2" />
        </svg>
      );
    case 'sun':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <radialGradient id="pv-sun" cx="40%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#fff8d6" />
              <stop offset="65%" stopColor="#ffb703" />
              <stop offset="100%" stopColor="#fb8500" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="40" fill="url(#pv-sun)" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#ffb703" strokeOpacity="0.3" strokeWidth="2" />
        </svg>
      );
    case 'zzz':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <text x="60" y="72" textAnchor="middle" fontSize="44" fontWeight="700" fill="#fff" fontFamily="Space Grotesk, sans-serif">Z z z</text>
        </svg>
      );
    case 'bed':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <rect x="10" y="62" width="100" height="34" rx="12" fill="#C4B5FD" stroke="#fff" strokeWidth="3" />
          <rect x="18" y="44" width="26" height="20" rx="10" fill="#fff" />
          <rect x="50" y="48" width="52" height="14" rx="7" fill="#fff" opacity="0.85" />
        </svg>
      );
    case 'breeze':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="pv-breeze" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFB020" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <g stroke="url(#pv-breeze)" strokeWidth="7" strokeLinecap="round">
            <line x1="22" y1="38" x2="98" y2="38" />
            <line x1="32" y1="60" x2="88" y2="60" />
            <line x1="42" y1="82" x2="78" y2="82" />
          </g>
        </svg>
      );
    case 'badge':
      return (
        <svg viewBox="0 0 200 60" className={cls} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pv-badge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFB020" />
              <stop offset="50%" stopColor="#FF5A3C" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <rect x="4" y="6" width="192" height="48" rx="24" fill="url(#pv-badge)" />
          <text x="100" y="37" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontFamily="Inter, sans-serif" letterSpacing="1">
            {(label || '').toUpperCase()}
          </text>
        </svg>
      );
    case 'screen':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <rect x="12" y="18" width="96" height="84" rx="10" fill="#fff" />
          <rect x="24" y="32" width="52" height="10" rx="5" fill="#1A1A26" />
          <rect x="24" y="50" width="38" height="10" rx="5" fill="#FFB020" />
          <rect x="24" y="68" width="46" height="10" rx="5" fill="#8B5CF6" />
          <circle cx="92" cy="88" r="5" fill="#34d399" />
        </svg>
      );
    case 'boxes':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <rect x="18" y="42" width="24" height="42" rx="6" fill="rgba(255,255,255,0.92)" />
          <rect x="48" y="30" width="24" height="54" rx="6" fill="#8b5cf6" />
          <rect x="78" y="42" width="24" height="42" rx="6" fill="rgba(255,255,255,0.92)" />
        </svg>
      );
    case 'receipt':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <rect x="28" y="16" width="64" height="88" rx="8" fill="#fff" />
          <text x="60" y="52" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111" fontFamily="Inter, sans-serif">✓ Enviada</text>
          <text x="60" y="76" textAnchor="middle" fontSize="10" fill="#555" fontFamily="Inter, sans-serif">Factura electrónica</text>
          <line x1="40" y1="88" x2="80" y2="88" stroke="#ddd" strokeWidth="2" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <text x="60" y="74" textAnchor="middle" fontSize="34" fontWeight="900" fill="#FFB020" fontFamily="Inter, sans-serif">✓ ✓ ✓</text>
        </svg>
      );
    case 'chart-up':
    case 'chart-down': {
      const up = kind === 'chart-up';
      const hs = up ? [30, 55, 80, 100] : [100, 70, 45, 25];
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="pv-bars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? '#34D399' : '#8b5cf6'} />
              <stop offset="100%" stopColor={up ? '#FFB020' : '#FF5A3C'} />
            </linearGradient>
          </defs>
          {hs.map((h, i) => (
            <rect key={i} x={16 + i * 23} y={96 - h * 0.72} width="16" height={h * 0.72} rx="4" fill="url(#pv-bars)" />
          ))}
        </svg>
      );
    }
    case 'layers':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="pv-layers" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#FF5A3C" />
            </linearGradient>
          </defs>
          <rect x="22" y="28" width="76" height="16" rx="8" fill="url(#pv-layers)" />
          <rect x="30" y="52" width="60" height="16" rx="8" fill="url(#pv-layers)" opacity="0.8" />
          <rect x="38" y="76" width="44" height="16" rx="8" fill="url(#pv-layers)" opacity="0.6" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <circle cx="52" cy="52" r="28" fill="none" stroke="#fff" strokeWidth="7" />
          <line x1="73" y1="73" x2="96" y2="96" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <circle cx="60" cy="60" r="40" fill="none" stroke="#fff" strokeWidth="6" />
          <line x1="60" y1="60" x2="60" y2="34" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <line x1="60" y1="60" x2="80" y2="68" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'paper':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <path d="M32 16 h44 l16 16 v72 a8 8 0 0 1 -8 8 h-52 a8 8 0 0 1 -8 -8 v-80 a8 8 0 0 1 8 -8 z" fill="#fff" />
          <line x1="42" y1="48" x2="78" y2="48" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="64" x2="78" y2="64" stroke="#C4B5FD" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="80" x2="66" y2="80" stroke="#C4B5FD" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'avatar':
      return (
        <svg viewBox="0 0 120 120" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="pv-avatar" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB020" />
              <stop offset="50%" stopColor="#FF5A3C" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="44" fill="url(#pv-avatar)" />
          <text x="60" y="74" textAnchor="middle" fontSize="30" fontWeight="900" fill="#fff" fontFamily="Space Grotesk, sans-serif">AR</text>
        </svg>
      );
    default:
      return null;
  }
}
