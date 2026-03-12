import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { laererService } from '../api/laererService';
import { fravaerService } from '../api/fravaerService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const STATUS_STYLES = {
  aktiv:       { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  syg:         { badge: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500'     },
  fraværende:  { badge: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
};

const STATUS_LABELS = { aktiv: 'Aktiv', syg: 'Syg', fraværende: 'Fraværende' };

export default function AdminLaererePage() {
  const { data: laerere, loading, error, refetch } = useApi(laererService.getAll, []);
  const [valgtLaerer, setValgtLaerer] = useState(null); // lærer der er ved at blive sygemeldt
  const [raskmeldModal, setRaskmeldModal] = useState(null); // fravær der skal afsluttes

  if (loading) return <LoadingSpinner tekst="Henter lærere…" />;
  if (error)   return <ErrorMessage besked={error} />;

  const aktive      = (laerere || []).filter(l => l.status === 'aktiv');
  const fraværende  = (laerere || []).filter(l => l.status !== 'aktiv');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Lærere</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {(laerere || []).length} lærere · {fraværende.length} fraværende
          </p>
        </div>
      </div>

      {/* Fraværende lærere øverst hvis der er nogen */}
      {fraværende.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Fraværende nu
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fraværende.map(l => (
              <LaererKort
                key={l.id}
                laerer={l}
                onSygemelding={() => setValgtLaerer(l)}
                onRaskmelding={() => setRaskmeldModal(l)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Alle aktive lærere */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Aktive lærere
        </h2>
        {aktive.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen aktive lærere</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aktive.map(l => (
              <LaererKort
                key={l.id}
                laerer={l}
                onSygemelding={() => setValgtLaerer(l)}
                onRaskmelding={() => setRaskmeldModal(l)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sygemeldings-modal */}
      {valgtLaerer && (
        <SygemeldingModal
          laerer={valgtLaerer}
          onLuk={() => setValgtLaerer(null)}
          onSuccess={() => { setValgtLaerer(null); refetch(); }}
        />
      )}

      {/* Raskmeldings-modal */}
      {raskmeldModal && (
        <RaskmeldingModal
          laerer={raskmeldModal}
          onLuk={() => setRaskmeldModal(null)}
          onSuccess={() => { setRaskmeldModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ── LaererKort ───────────────────────────────────────────── */
function LaererKort({ laerer, onSygemelding, onRaskmelding }) {
  const styles = STATUS_STYLES[laerer.status] ?? STATUS_STYLES.aktiv;
  const erFravaerende = laerer.status !== 'aktiv';

  return (
    <div className={`bg-white rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm ${erFravaerende ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">{laerer.name}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${styles.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          {STATUS_LABELS[laerer.status]}
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        {erFravaerende ? (
          <button
            onClick={onRaskmelding}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            Raskmelding
          </button>
        ) : (
          <button
            onClick={onSygemelding}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
          >
            Registrer fravær
          </button>
        )}
      </div>
    </div>
  );
}

/* ── SygemeldingModal ─────────────────────────────────────── */
function SygemeldingModal({ laerer, onLuk, onSuccess }) {
  const idag = new Date().toISOString().slice(0, 10);
  const [type,       setType]       = useState('syg');
  const [startDato,  setStartDato]  = useState(idag);
  const [slutDato,   setSlutDato]   = useState(idag);
  const [loading,    setLoading]    = useState(false);
  const [fejl,       setFejl]       = useState('');

  async function handleSubmit() {
    if (!startDato || !slutDato) { setFejl('Udfyld begge datoer'); return; }
    if (slutDato < startDato)    { setFejl('Slutdato kan ikke være før startdato'); return; }
    setLoading(true);
    setFejl('');
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
    <Modal tittel={`Registrer fravær — ${laerer.name}`} onLuk={onLuk}>
      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fraværstype</label>
          <div className="flex gap-2">
            {[['syg', 'Sygdom'], ['kursus', 'Kursus'], ['andet', 'Andet']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setType(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === val
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Datoer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fra dato</label>
            <input
              type="date"
              value={startDato}
              onChange={e => setStartDato(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Til dato</label>
            <input
              type="date"
              value={slutDato}
              min={startDato}
              onChange={e => setSlutDato(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Alle lærerens lektioner i perioden markeres automatisk som <strong>udækket</strong> i kalenderen.
        </div>

        {fejl && <ErrorMessage besked={fejl} />}

        <div className="flex gap-2 pt-1">
          <button onClick={onLuk} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Annuller
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Registrerer…' : 'Registrer fravær'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── RaskmeldingModal ─────────────────────────────────────── */
function RaskmeldingModal({ laerer, onLuk, onSuccess }) {
  const [bevar,   setBevar]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [fejl,    setFejl]    = useState('');
  const { data: fravaerListe } = useApi(fravaerService.getAll, []);

  // Find aktivt fravær for denne lærer
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
    <Modal tittel={`Raskmelding — ${laerer.name}`} onLuk={onLuk}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {laerer.name} markeres som aktiv igen. Fremtidige udækkede lektioner normaliseres.
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
            <p className="text-xs text-slate-400 mt-0.5">Allerede tildelte vikarer beholdes på lektionerne</p>
          </div>
        </label>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
          Fremtidige lektioner uden vikar sættes tilbage til <strong>normal</strong>.
        </div>

        {fejl && <ErrorMessage besked={fejl} />}

        <div className="flex gap-2 pt-1">
          <button onClick={onLuk} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Annuller
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
    </Modal>
  );
}

/* ── Modal wrapper ────────────────────────────────────────── */
function Modal({ tittel, onLuk, children }) {
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