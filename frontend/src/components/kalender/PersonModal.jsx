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

export default function PersonModal({
  person,
  dagFravaer,
  onLuk,
  onSygemelding,
  onRaskmelding,
  onUgeoversigt,
  visPersonligMail = false,
}) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onLuk(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onLuk]);

  const erLaerer      = person.type === 'laerer';
  const erPaedagog    = erLaerer && person.dbType === 'paedagog';
  const erFravaerende = erLaerer && person.status !== 'aktiv';
  const statusStyle   = STATUS_STYLES[person.status] ?? STATUS_STYLES.aktiv;
  const initialer     = person.name.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onLuk} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0 ${person.farve}`}>
            {initialer}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900 leading-tight truncate">{person.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {erPaedagog ? 'Pædagog' : erLaerer ? 'Lærer' : 'Vikar'}
            </p>
          </div>
          <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none mt-0.5 shrink-0">×</button>
        </div>

        {/* Status badge — kun hvis personen har en status */}
        {person.status && (
          <div className="px-6 pb-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {STATUS_LABELS[person.status] ?? person.status}
            </span>
          </div>
        )}

        <div className="h-px bg-slate-100 mx-6" />

        {/* Kontaktoplysninger */}
        <div className="px-6 py-4 space-y-3">
          <KontaktRække ikon="mail" label="Arbejdsmail" value={person.email} href={person.email ? `mailto:${person.email}` : null} />
          {visPersonligMail && (
            <KontaktRække ikon="mail" label="Personlig mail" value={person.personal_email} href={person.personal_email ? `mailto:${person.personal_email}` : null} />
          )}
          <KontaktRække ikon="phone" label="Telefon" value={person.phone} href={person.phone ? `tel:${person.phone}` : null} />
        </div>

        <div className="h-px bg-slate-100 mx-6" />

        {/* Handlinger */}
        <div className="px-4 py-4 space-y-2">

          {/* Ugeoversigt — altid */}
          <HandlingsKnap
            label="Vis ugeoversigt"
            beskrivelse="Se hele ugen for denne person"
            onClick={onUgeoversigt}
            variant="primary"
          />

          {/* Kun admin: sygemelding/raskmelding (vises når callbacks er givet) */}
          {erLaerer && !erFravaerende && onSygemelding && (
            <HandlingsKnap
              label="Registrer fravær"
              beskrivelse="Sygemelding eller kursus"
              onClick={onSygemelding}
              variant="danger"
            />
          )}
          {erLaerer && erFravaerende && onRaskmelding && (
            <HandlingsKnap
              label="Raskmelding"
              beskrivelse="Marker læreren som aktiv igen"
              onClick={onRaskmelding}
              variant="success"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function KontaktRække({ ikon, label, value, href }) {
  const mailSvg = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-slate-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  const phoneSvg = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-slate-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );

  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
        {ikon === 'phone' ? phoneSvg : mailSvg}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
        {value ? (
          <a href={href} className="text-xs text-slate-700 hover:text-blue-600 transition-colors truncate block">
            {value}
          </a>
        ) : (
          <p className="text-xs text-slate-300 italic">Ikke registreret</p>
        )}
      </div>
    </div>
  );
}

function HandlingsKnap({ label, beskrivelse, onClick, variant }) {
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
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs opacity-60 mt-0.5">{beskrivelse}</p>
      </div>
      <span className="ml-auto text-xs opacity-30">›</span>
    </button>
  );
}