/**
 * Viser en farvekodet badge baseret på status-streng.
 * Bruges konsistent på tværs af lektioner, vikarer og lærere.
 */
const STATUS_STYLES = {
  normal:      'bg-emerald-100 text-emerald-800 border-emerald-200',
  udækket:     'bg-red-100 text-red-800 border-red-200',
  dækket:      'bg-blue-100 text-blue-800 border-blue-200',
  aktiv:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  syg:         'bg-red-100 text-red-800 border-red-200',
  fraværende:  'bg-amber-100 text-amber-800 border-amber-200',
  ledig:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  optaget:     'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS = {
  normal:      'Planlagt',
  udækket:     'Udækket',
  dækket:      'Dækket',
  aktiv:       'Aktiv',
  syg:         'Syg',
  fraværende:  'Fraværende',
  ledig:       'Ledig',
  optaget:     'Optaget',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}
