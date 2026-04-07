import { useEffect } from 'react';

const ROLLE_LABEL = {
  laerer:   'Lærer',
  paedagog: 'Pædagog',
  vikar:    'Vikar',
};

/**
 * Modal der viser kontaktoplysninger for en person.
 * Props:
 *   person: { navn, rolle ('laerer'|'paedagog'|'vikar'), email, telefon }
 *   onLuk:  () => void
 */
export default function PersonKontaktModal({ person, onLuk }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onLuk(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onLuk]);

  const initialer = person.navn
    ?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  const rolleLabel = ROLLE_LABEL[person.rolle] ?? person.rolle ?? '—';

  const rolleKlasse =
    person.rolle === 'vikar'    ? 'bg-emerald-500' :
    person.rolle === 'paedagog' ? 'bg-violet-500'  :
                                   'bg-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onLuk} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-100">
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shrink-0 ${rolleKlasse}`}>
            {initialer}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900 leading-tight">{person.navn}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{rolleLabel}</p>
          </div>
          <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none mt-0.5 shrink-0">×</button>
        </div>

        <div className="h-px bg-slate-100 mx-6" />

        <div className="px-6 py-4 space-y-3">
          <MailRække label="Arbejdsmail" email={person.email} />
          <MailRække label="Personlig mail" email={person.personalEmail} />

          <TelefonRække telefon={person.telefon} />
        </div>
      </div>
    </div>
  );
}

const mailIkon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-slate-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const telefonIkon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-slate-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

function MailRække({ label, email }) {
  return (
    <div className={`flex items-center gap-3 ${!email ? 'opacity-40' : ''}`}>
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {mailIkon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        {email
          ? <a href={`mailto:${email}`} className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate block">{email}</a>
          : <p className="text-sm text-slate-400 italic">Ikke registreret</p>
        }
      </div>
    </div>
  );
}

function TelefonRække({ telefon }) {
  return (
    <div className={`flex items-center gap-3 ${!telefon ? 'opacity-40' : ''}`}>
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {telefonIkon}
      </div>
      <div>
        <p className="text-xs text-slate-400">Telefon</p>
        {telefon
          ? <a href={`tel:${telefon}`} className="text-sm text-slate-700 hover:text-blue-600 transition-colors">{telefon}</a>
          : <p className="text-sm text-slate-400 italic">Ikke registreret</p>
        }
      </div>
    </div>
  );
}
