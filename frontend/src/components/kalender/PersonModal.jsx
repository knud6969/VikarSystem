import { useEffect } from 'react';

const STATUS_STYLES = {
  aktiv:      { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  syg:        { badge: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500'     },
  fraværende: { badge: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
  ledig:      { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const STATUS_LABELS = {
  aktiv: 'Aktiv', syg: 'Syg', fraværende: 'Fraværende', ledig: 'Ledig',
};

/**
 * PersonModal — vises ved klik på en persons avatar i kalender-headeren.
 *
 * Props:
 *   person         — { id, name, type: 'laerer'|'vikar', status, farve, email?, phone? }
 *   dagFravaer     — liste af aktive fravær denne dag
 *   onLuk          — lukker modalen
 *   onSygemelding  — åbner sygemeldingsflow (kun lærere)
 *   onRaskmelding  — åbner raskmeldingsflow (kun lærere)
 *   onUgeoversigt  — skifter til enkelt-person ugeoversigt
 */
export default function PersonModal({
  person,
  dagFravaer,
  onLuk,
  onSygemelding,
  onRaskmelding,
  onUgeoversigt,
}) {
  // Luk ved Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onLuk(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onLuk]);

  const erLaerer     = person.type === 'laerer';
  const erFravaerende = erLaerer && person.status !== 'aktiv';
  const statusStyle  = STATUS_STYLES[person.status] ?? STATUS_STYLES.aktiv;
  const initialer    = person.name.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onLuk}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">

        {/* Header med farvet avatar */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0 ${person.farve}`}
          >
            {initialer}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900 leading-tight truncate">
              {person.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">
              {erLaerer ? 'Lærer' : 'Vikar'}
              {person.email && ` · ${person.email}`}
            </p>
            {person.phone && (
              <p className="text-xs text-slate-400">{person.phone}</p>
            )}
          </div>

          <button
            onClick={onLuk}
            className="text-slate-300 hover:text-slate-500 text-xl leading-none mt-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Status badge */}
        <div className="px-6 pb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {STATUS_LABELS[person.status] ?? person.status}
          </span>
        </div>

        <div className="h-px bg-slate-100 mx-6" />

        {/* Handlinger */}
        <div className="px-4 py-4 space-y-2">

          {/* Ugeoversigt — altid tilgængelig */}
          <HandlingsKnap
            ikon="📅"
            label="Vis ugeoversigt"
            beskrivelse="Se hele ugen for denne person"
            onClick={onUgeoversigt}
            variant="primary"
          />

          {/* Lærer-specifikke handlinger */}
          {erLaerer && !erFravaerende && (
            <HandlingsKnap
              ikon="🤒"
              label="Registrer fravær"
              beskrivelse="Sygemelding eller kursus"
              onClick={onSygemelding}
              variant="danger"
            />
          )}

          {erLaerer && erFravaerende && (
            <HandlingsKnap
              ikon="✅"
              label="Raskmelding"
              beskrivelse="Marker læreren som aktiv igen"
              onClick={onRaskmelding}
              variant="success"
            />
          )}

          {/* Vikar-specifikke handlinger */}
          {!erLaerer && (
            <HandlingsKnap
              ikon="🗓"
              label="Se tilgængelighed"
              beskrivelse="Vikarens ledige tider"
              onClick={() => {/* TODO */}}
              variant="neutral"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function HandlingsKnap({ ikon, label, beskrivelse, onClick, variant }) {
  const variantKlasser = {
    primary: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
    danger:  'border-red-200 bg-red-50 hover:bg-red-100 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
    neutral: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${variantKlasser[variant]}`}
    >
      <span className="text-lg leading-none">{ikon}</span>
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs opacity-60 mt-0.5">{beskrivelse}</p>
      </div>
      <span className="ml-auto text-xs opacity-30">›</span>
    </button>
  );
}