import { useState } from 'react';
import { fravaerService } from '../../api/fravaerService';
import { useApi } from '../../hooks/useApi';
import { ModalWrapper } from './SygemeldingModal';
import ErrorMessage from '../common/ErrorMessage';

/**
 * RaskmeldingModal — afslutter aktivt fravær for en lærer.
 *
 * Props:
 *   laerer    — { id, name }
 *   onLuk     — lukker modalen
 *   onSuccess — kaldes når raskmeldingen er gennemført
 */
export default function RaskmeldingModal({ laerer, onTilbage, onSuccess }) {
  const [bevar,   setBevar]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [fejl,    setFejl]    = useState('');

  const { data: fravaerListe } = useApi(fravaerService.getAll, []);

  // Find det seneste aktive fravær for denne lærer
  const aktivtFravaer = (fravaerListe || []).find(f =>
    f.teacher_id === laerer.id &&
    f.end_date >= new Date().toISOString().slice(0, 10)
  );

  async function handleRaskmelding() {
    if (!aktivtFravaer) { setFejl('Intet aktivt fravær fundet'); return; }
    setLoading(true);
    setFejl('');
    try {
      await fravaerService.afslut(aktivtFravaer.id, { bevarTildelinger: bevar });
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
          {laerer.name} markeres som aktiv igen. Fremtidige udækkede lektioner
          normaliseres automatisk.
        </p>

        {/* Bevar tildelinger */}
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={bevar}
            onChange={e => setBevar(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <div>
            <p className="text-sm font-medium text-slate-800">Bevar vikartildelinger</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Allerede tildelte vikarer beholdes på lektionerne
            </p>
          </div>
        </label>

        {/* Info-boks */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
          Fremtidige lektioner uden vikar sættes tilbage til <strong>normal</strong>.
        </div>

        {fejl && <ErrorMessage besked={fejl} />}

        {/* Knapper */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onTilbage}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
          >
            ‹ Tilbage
          </button>
          <button
            onClick={handleRaskmelding}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Raskmelder…' : 'Raskmelding'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}