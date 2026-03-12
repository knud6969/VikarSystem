/**
 * kalenderUtils.js
 * Pure utility-funktioner til kalenderberegninger.
 * Ingen React, ingen side-effects — kun ren logik.
 */

export const TIMER_START = 8;   // Første time kl. 08:00
export const TIMER_SLUT  = 16;  // Sidste time slutter kl. 16:00
export const DAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

/**
 * Returnerer mandagen i den uge som `dato` tilhører.
 */
export function getMandagForUge(dato = new Date()) {
  const d = new Date(dato);
  const dag = d.getDay(); // 0=søn, 1=man, ...
  const diff = dag === 0 ? -6 : 1 - dag;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returnerer array med de 5 hverdage (Date-objekter) for en given mandag.
 */
export function getUgedage(mandag) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mandag);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Formaterer Date til "dd. MMM" — fx "12. mar"
 */
export function formatDagLabel(dato) {
  return dato.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

/**
 * Formaterer Date til "dd. MMMM yyyy" — fx "10. marts 2026"
 */
export function formatUgeLabel(mandag, fredag) {
  const fra = mandag.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' });
  const til = fredag.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${fra} – ${til}`;
}

/**
 * Beregner top-position og højde for en lektion i kalendergitteret.
 * Gitteret starter kl. 08:00 og hver time er `timePx` pixels høj.
 */
export function beregnPosition(startTime, endTime, timePx = 64) {
  const start = new Date(startTime);
  const slut  = new Date(endTime);

  const startMinutter = (start.getHours() - TIMER_START) * 60 + start.getMinutes();
  const slutMinutter  = (slut.getHours()  - TIMER_START) * 60 + slut.getMinutes();

  const top    = (startMinutter / 60) * timePx;
  const height = Math.max(((slutMinutter - startMinutter) / 60) * timePx, 24);

  return { top, height };
}

/**
 * Filtrerer lektioner til en bestemt dag (Date).
 */
export function lektionerForDag(lektioner, dato) {
  const dagStr = dato.toISOString().slice(0, 10);
  return lektioner.filter(l => {
    const lDag = new Date(l.start_time).toISOString().slice(0, 10);
    return lDag === dagStr;
  });
}

/**
 * Finder aktive fravær der overlapper med en given dag.
 */
export function fravaerForDag(fravaer, dato) {
  const dagStr = dato.toISOString().slice(0, 10);
  return fravaer.filter(f => {
    return f.start_date <= dagStr && f.end_date >= dagStr;
  });
}

/**
 * Returnerer ugenummer (ISO 8601).
 */
export function getUgenummer(dato) {
  const d = new Date(dato);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const uge1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - uge1) / 86400000 - 3 + ((uge1.getDay() + 6) % 7)) / 7);
}

/**
 * Bestemmer baggrundsfarve for en lektion baseret på status.
 */
export function statusFarve(status) {
  switch (status) {
    case 'normal':   return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
    case 'udækket':  return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
    case 'dækket':   return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
    default:         return { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
  }
}