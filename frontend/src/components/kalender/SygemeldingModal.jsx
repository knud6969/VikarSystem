import { useState } from 'react';
import { fravaerService } from '../../api/fravaerService';
import { dagTilStreng } from '../../utils/kalenderUtils';
import ErrorMessage from '../common/ErrorMessage';
import BekræftModal from '../common/BekræftModal';

export default function SygemeldingModal({ laerer, onTilbage, onSuccess, initialDato }) {
  const defaultDato = initialDato ?? dagTilStreng(new Date());

  const [type,       setType]       = useState('syg');
  const [startDato,  setStartDato]  = useState(defaultDato);
  const [slutDato,   setSlutDato]   = useState(defaultDato);
  const [loading,    setLoading]    = useState(false);
  const [fejl,       setFejl]       = useState('');
  const [visBekræft, setVisBekræft] = useState(false);

  function handleSubmitKlik() {
    if (!startDato || !slutDato) { setFejl('Udfyld begge datoer'); return; }
    if (slutDato < startDato)    { setFejl('Slutdato kan ikke være før startdato'); return; }
    setFejl('');
    setVisBekræft(true);
  }

  async function handleBekræft() {
    setVisBekræft(false);
    setLoading(true);
    try {
      const res = await fravaerService.opret({
        teacher_id: laerer.id,
        type,
        start_date: startDato,
        end_date:   slutDato,
      });
      onSuccess(res);
    } catch (err) {
      setFejl(err.message);
      setLoading(false);
    }
  }

  return (
    <>
    <ModalWrapper tittel={`Registrer fravær — ${laerer.name}`} onLuk={onTilbage}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fraværstype</label>
          <div className="flex gap-2">
            {[['syg', 'Sygdom'], ['kursus', 'Kursus'], ['andet', 'Andet']].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fra dato</label>
            <input type="date" value={startDato} onChange={e => setStartDato(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Til dato</label>
            <input type="date" value={slutDato} min={startDato} onChange={e => setSlutDato(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Alle lærerens lektioner i perioden markeres automatisk som <strong>udækket</strong> i kalenderen.
        </div>

        {fejl && <ErrorMessage besked={fejl} />}

        <div className="flex gap-2 pt-1">
          <button onClick={onTilbage}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
            ‹ Tilbage
          </button>
          <button onClick={handleSubmitKlik} disabled={loading}
            className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
            {loading ? 'Registrerer…' : 'Registrer fravær'}
          </button>
        </div>
      </div>
    </ModalWrapper>

    {visBekræft && (
      <BekræftModal
        tittel="Registrer fravær?"
        besked={`${laerer.name} registreres som fraværende fra ${startDato} til ${slutDato}. Alle lektioner i perioden markeres som udækket.`}
        bekræftTekst="Registrer fravær"
        variant="danger"
        onBekræft={handleBekræft}
        onAnnuller={() => setVisBekræft(false)}
      />
    )}
    </>
  );
}

export function ModalWrapper({ tittel, onLuk, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onLuk} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{tittel}</h2>
          <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}