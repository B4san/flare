// Señal de que el pin del hero Telescope ya existe (con su pin-spacer).
//
// Por qué existe: ScrubbedSteps mide su trigger (start/end) a partir de la
// geometría del documento. Si lo mide ANTES de que el pin del hero exista,
// el documento es 900 px más corto (falta el pin-spacer) y el trigger queda
// 900 px arriba del sticky real — y ningún ScrollTrigger.refresh()
// posterior lo corrige (medido en R8b: el rango efectivo era 3603–5763
// frente al sticky real 4503–6663, y un resize genuino no lo movió).
// Por eso ScrubbedSteps espera a esta señal (con timeout de seguridad)
// antes de medir. No es un evento global de la app: solo coordina estos
// dos componentes de la landing.
let resolvePinReady: (() => void) | null = null;

export const pinReady: Promise<void> = new Promise((res) => {
  resolvePinReady = res;
});

export function markPinReady(): void {
  resolvePinReady?.();
  resolvePinReady = null;
}

/** Espera al pin, pero nunca bloquea la sección: pasado el timeout se sigue. */
export function waitPinReady(timeoutMs = 4000): Promise<void> {
  return Promise.race([
    pinReady,
    new Promise<void>((res) => window.setTimeout(res, timeoutMs)),
  ]);
}
