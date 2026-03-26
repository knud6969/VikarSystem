import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const FÆLLES = [
  { tast: 'Escape',         beskrivelse: 'Luk modal / detaljer' },
  { tast: 'Klik udenfor',   beskrivelse: 'Luk modal' },
];

const SIDE_GENVEJE = {
  '/vikar/tilgaengelighed': [
    { tast: 'Dobbeltklik',    beskrivelse: 'Tilføj ny tilgængeligheds-blok' },
    { tast: 'Træk blok',      beskrivelse: 'Flyt en blok til nyt tidspunkt' },
    { tast: 'Træk kant',      beskrivelse: 'Tilpas start- eller sluttid' },
    { tast: 'Ctrl + C',       beskrivelse: 'Kopiér markeret tidsblok' },
    { tast: 'Ctrl + V',       beskrivelse: 'Indsæt kopieret blok på valgt dag' },
  ],
  '/admin/kalender': [
    { tast: 'Klik på person', beskrivelse: 'Åbn persondetaljer' },
    { tast: 'Klik på lektion',beskrivelse: 'Åbn lektionsdetaljer og vikar-tildeling' },
  ],
  '/laerer/lektioner': [
    { tast: 'Klik på lektion',beskrivelse: 'Åbn lektionsdetaljer og beskeder' },
  ],
  '/vikar/lektioner': [
    { tast: 'Klik på lektion',beskrivelse: 'Åbn lektionsdetaljer og beskeder' },
  ],
};

export default function GenvejModal({ onLuk }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onLuk(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onLuk]);

  const sideGenveje = SIDE_GENVEJE[pathname] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onLuk} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Tastaturgenveje</h2>
          <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {sideGenveje.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Denne side</p>
              <GenvejListe genveje={sideGenveje} />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Generelt</p>
            <GenvejListe genveje={FÆLLES} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GenvejListe({ genveje }) {
  return (
    <div className="space-y-1.5">
      {genveje.map(({ tast, beskrivelse }) => (
        <div key={tast} className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">{beskrivelse}</span>
          <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs font-mono text-slate-600 whitespace-nowrap shrink-0">
            {tast}
          </kbd>
        </div>
      ))}
    </div>
  );
}
