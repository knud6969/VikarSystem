import { useState } from 'react';
import { fravaerService } from '../../api/fravaerService';
import { useApi } from '../../hooks/useApi';
import { ModalWrapper } from './SygemeldingModal';
import ErrorMessage from '../common/ErrorMessage';
import { dagTilStreng } from '../../utils/kalenderUtils';

/**
 * RaskmeldingModal — afslutter aktivt fravær for en lærer.
 *
 * Viser to tydelige valg:
 *   - Behold vikardækning (bevarTildelinger=true)
 *   - Fjern alle tildelinger (bevarTildelinger=false)
 */
export default function RaskmeldingModal({ laerer, onTilbage, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fejl,    setFejl]    = useState('');

  const { data: fravaerListe } = useApi(fravaerService.getAll, []);

  const idagStr = dagTilStreng(new Date());

  // Find aktivt fravær: start_date <= i dag OG end_date >= i går
  // >= i går fordi afslutMedLektioner sætter end_date = CURRENT_DATE - 1
  // og vi vil stadig kunne raskmeldes lærere der var syge i går eller tidligere
  // Find det seneste fravær for læreren — læreren er markeret syg
  // så der MÅ eksistere et fravær. Tag det med seneste start_date.
  const aktivtFravaer = (fravaerListe || [])
    .filter(f => Number(f.teacher_id) === Number(laerer.id))
    .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))[0] || null;

  async function handleRaskmelding(bevarTildelinger) {
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
    <ModalWrapper tittel={`Raskmelding — ${laerer.name}`} onLuk={onTilbage}>
      <div className="space-y-4">

        <p className="text-sm text-slate-600">
          {laerer.name} markeres som aktiv igen. Hvad skal der ske med de tildelte vikarer?
        </p>

        {/* Valg 1: Behold vikardækning */}
        <button
          onClick={() => handleRaskmelding(true)}
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
          onClick={() => handleRaskmelding(false)}
          disabled={loading}
          className="w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <span className="text-xl leading-none mt-0.5">🗑</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Fjern alle tildelinger</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Alle vikartildelinger slettes og lektionerne sættes tilbage til normal.
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
  );
}