import { useState } from 'react';
import { fravaerService } from '../../api/fravaerService';
import { useApi } from '../../hooks/useApi';
import { ModalWrapper } from './SygemeldingModal';
import ErrorMessage from '../common/ErrorMessage';
import BekræftModal from '../common/BekræftModal';

/**
 * RaskmeldingModal — afslutter aktivt fravær for en lærer.
 *
 * Viser to tydelige valg:
 *   - Behold vikardækning (bevarTildelinger=true)
 *   - Fjern alle tildelinger (bevarTildelinger=false)
 */
export default function RaskmeldingModal({ laerer, onTilbage, onSuccess }) {
  const [loading,        setLoading]        = useState(false);
  const [fejl,           setFejl]           = useState('');
  const [ventendeBevaring, setVentendeBevaring] = useState(null); // null | true | false

  const { data: fravaerListe } = useApi(() => fravaerService.getForLaerer(laerer.id), [laerer.id]);

  // Find det seneste fravær for læreren
  const aktivtFravaer = (fravaerListe || [])
    .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))[0] || null;

  async function handleBekræft() {
    const bevarTildelinger = ventendeBevaring;
    setVentendeBevaring(null);
    if (!aktivtFravaer) { setFejl('Intet aktivt fravær fundet'); return; }
    setLoading(true);
    setFejl('');
    try {
      await fravaerService.afslut(aktivtFravaer.id, { bevarTildelinger });
      onSuccess();
    } catch (err) {
      setFejl(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <ModalWrapper tittel={`Raskmelding — ${laerer.name}`} onLuk={onTilbage}>
        <div className="space-y-4">

          <p className="text-sm text-slate-600">
            {laerer.name} markeres som aktiv igen. Hvad skal der ske med de tildelte vikarer?
          </p>

          {/* Valg 1: Behold vikardækning */}
          <button
            onClick={() => setVentendeBevaring(true)}
            disabled={loading}
            className="w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <span className="text-xl leading-none mt-0.5">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Behold vikardækning</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Allerede tildelte vikarer beholdes på lektionerne. Udækkede lektioner normaliseres.
              </p>
            </div>
          </button>

          {/* Valg 2: Fjern alle tildelinger */}
          <button
            onClick={() => setVentendeBevaring(false)}
            disabled={loading}
            className="w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="text-xl leading-none mt-0.5">🗑</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Fjern alle tildelinger</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Alle vikartildelinger slettes og lektionerne sættes tilbage til planlagt.
              </p>
            </div>
          </button>

          {fejl && <ErrorMessage besked={fejl} />}

          {loading && (
            <p className="text-xs text-center text-slate-400">Raskmelder…</p>
          )}

          <button
            onClick={onTilbage}
            className="w-full py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
          >
            ‹ Tilbage
          </button>
        </div>
      </ModalWrapper>

      {ventendeBevaring === true && (
        <BekræftModal
          tittel="Behold vikardækning?"
          besked={`${laerer.name} markeres som aktiv igen. Tildelte vikarer beholdes på lektionerne.`}
          bekræftTekst="Behold vikardækning"
          variant="primary"
          onBekræft={handleBekræft}
          onAnnuller={() => setVentendeBevaring(null)}
        />
      )}

      {ventendeBevaring === false && (
        <BekræftModal
          tittel="Fjern alle tildelinger?"
          besked={`${laerer.name} markeres som aktiv igen. Alle vikartildelinger fjernes og lektionerne sættes tilbage til planlagt.`}
          bekræftTekst="Fjern tildelinger"
          variant="danger"
          onBekræft={handleBekræft}
          onAnnuller={() => setVentendeBevaring(null)}
        />
      )}
    </>
  );
}
