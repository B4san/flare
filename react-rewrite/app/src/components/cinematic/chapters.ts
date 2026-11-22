export interface Chapter {
  id: string;
  n: string;
  label: string;
  short: string;
}

export const CHAPTERS: Chapter[] = [
  { id: 'manifiesto', n: '01', label: 'Manifiesto', short: 'Manifiesto' },
  { id: 'reel', n: '02', label: 'El reel', short: 'Reel' },
  { id: 'motor', n: '03', label: 'Motor de retención', short: 'Score' },
  { id: 'proceso', n: '04', label: 'Proceso', short: 'Proceso' },
  { id: 'agentes', n: '05', label: 'Agentes', short: 'Agentes' },
  { id: 'studio', n: '06', label: 'Studio', short: 'Studio' },
  { id: 'accion', n: '07', label: 'Acción', short: 'Acción' },
];

export const NAV_LINKS = [
  { href: '#manifiesto', label: 'Manifiesto' },
  { href: '#reel', label: 'Reel' },
  { href: '#motor', label: 'Score' },
  { href: '#proceso', label: 'Proceso' },
  { href: '#agentes', label: 'Agentes' },
];
