export const TIMER_START = 0;
export const TIMER_SLUT  = 24;
export const DAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

export function getMandagForUge(dato = new Date()) {
  const d = new Date(dato);
  const dag = d.getDay();
  const diff = dag === 0 ? -6 : 1 - dag;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getUgedage(mandag) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mandag);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function formatDagLabel(dato) {
  return dato.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export function formatUgeLabel(mandag, fredag) {
  const fra = mandag.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' });
  const til = fredag.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${fra} – ${til}`;
}

export function beregnPosition(startTime, endTime, timePx = 64) {
  const start = new Date(startTime);
  const slut  = new Date(endTime);
  const startMinutter = (start.getHours() - TIMER_START) * 60 + start.getMinutes();
  const slutMinutter  = (slut.getHours()  - TIMER_START) * 60 + slut.getMinutes();
  const top    = (startMinutter / 60) * timePx;
  const height = Math.max(((slutMinutter - startMinutter) / 60) * timePx, 20);
  return { top, height };
}

export function lektionerForDag(lektioner, dato) {
  const dagStr = dato.toISOString().slice(0, 10);
  return lektioner.filter(l =>
    new Date(l.start_time).toISOString().slice(0, 10) === dagStr
  );
}

export function fravaerForDag(fravaer, dato) {
  const dagStr = dato.toISOString().slice(0, 10);
  return fravaer.filter(f => f.start_date <= dagStr && f.end_date >= dagStr);
}

export function getUgenummer(dato) {
  const d = new Date(dato);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const uge1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - uge1) / 86400000 - 3 + ((uge1.getDay() + 6) % 7)) / 7);
}

export function statusFarve(status) {
  switch (status) {
    case 'normal':  return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
    case 'udækket': return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
    case 'dækket':  return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
    default:        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
  }
}