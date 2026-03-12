import { useState, useCallback } from 'react';
import { useKalender } from '../hooks/useKalender';
import {
  getMandagForUge,
  getUgedage,
  formatDagLabel,
  formatUgeLabel,
  beregnPosition,
  lektionerForDag,
  fravaerForDag,
  getUgenummer,
  statusFarve,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../utils/kalenderUtils';
import { fravaerService } from '../api/fravaerService';
import { tildelingService } from '../api/tildelingService';
import { vikarService } from '../api/vikarService';
import { laererService } from '../api/laererService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const TIME_PX = 72; // pixels per time
const TIMER = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

/**
 * AdminKalenderPage — ugekalender som centrum for admin-interfacet.
 *
 * View-laget: al logik delegeres til useKalender-hook og kalenderUtils.
 * Viser lektioner, fravær og tildelinger visuelt i et ugegitter.
 */
export default function AdminKalenderPage() {
  const [mandag, setMandag] = useState(() => getMandagForUge());
  const [valgtLektion, setValgtLektion] = useState(null);
  const [modalType, setModalType] = useState(null); // 'lektion' | 'fravaer' | 'tildel'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFejl, setActionFejl] = useState('');

  const { lektioner, fravaer, tildelinger, loading, error, refetch } = useKalender(mandag);

  const ugedage = getUgedage(mandag);
  const fredag  = ugedage[4];
  const ugeNr   = getUgenummer(mandag);
  const idag    = new Date().toISOString().slice(0, 10);

  function gaaTilUge(retning) {
    setMandag(prev => {
      const ny = new Date(prev);
      ny.setDate(ny.getDate() + retning * 7);
      return ny;
    });
  }

  function gaaTilIDag() {
    setMandag(getMandagForUge());
  }

  function aabneLektion(lektion) {
    setValgtLektion(lektion);
    setModalType('lektion');
    setActionFejl('');
  }

  function lukModal() {
    setValgtLektion(null);
    setModalType(null);
    setActionFejl('');
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Kalender-header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Uge {ugeNr}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {formatUgeLabel(mandag, fredag)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={gaaTilIDag}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            I dag
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => gaaTilUge(-1)}
              className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200"
              aria-label="Forrige uge"
            >
              ‹
            </button>
            <button
              onClick={() => gaaTilUge(1)}
              className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
              aria-label="Næste uge"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* ── Status ──────────────────────────────────────────── */}
      {error && <ErrorMessage besked={error} />}

      {loading ? (
        <LoadingSpinner tekst="Henter kalender…" />
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Dag-headers */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
            <div className="border-r border-slate-200" /> {/* tom hjørnecelle */}
            {ugedage.map((dag, i) => {
              const dagStr = dag.toISOString().slice(0, 10);
              const erIDag = dagStr === idag;
              const fravaerIDag = fravaerForDag(fravaer, dag);
              return (
                <div key={i} className={`px-3 py-3 border-r border-slate-200 last:border-r-0 ${erIDag ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {DAGE[i].slice(0, 3)}
                    </span>
                    <span className={`text-sm font-semibold ${erIDag ? 'text-blue-600' : 'text-slate-800'}`}>
                      {formatDagLabel(dag)}
                    </span>
                  </div>
                  {/* Fravær-banner */}
                  {fravaerIDag.map(f => (
                    <div key={f.id} className="mt-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 truncate">
                      🤒 {f.laerer_navn} — {f.type}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Tidsgitter */}
          <div className="relative overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>

              {/* Tidskolonne */}
              <div className="border-r border-slate-200">
                {TIMER.map(time => (
                  <div
                    key={time}
                    className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                    style={{ height: TIME_PX }}
                  >
                    <span className="text-xs text-slate-400 tabular-nums">{time}:00</span>
                  </div>
                ))}
              </div>

              {/* En kolonne per dag */}
              {ugedage.map((dag, dagIdx) => {
                const dagStr  = dag.toISOString().slice(0, 10);
                const erIDag  = dagStr === idag;
                const dagLekt = lektionerForDag(lektioner, dag);

                return (
                  <div
                    key={dagIdx}
                    className={`relative border-r border-slate-200 last:border-r-0 ${erIDag ? 'bg-blue-50/30' : ''}`}
                    style={{ height: TIMER.length * TIME_PX }}
                  >
                    {/* Timegitter-linjer */}
                    {TIMER.map(time => (
                      <div
                        key={time}
                        className="absolute w-full border-b border-slate-100"
                        style={{ top: (time - TIMER_START) * TIME_PX, height: TIME_PX }}
                      />
                    ))}

                    {/* Halvtimeslinjer */}
                    {TIMER.map(time => (
                      <div
                        key={`half-${time}`}
                        className="absolute w-full border-b border-slate-50"
                        style={{ top: (time - TIMER_START) * TIME_PX + TIME_PX / 2 }}
                      />
                    ))}

                    {/* Lektioner */}
                    {dagLekt.map(lektion => {
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const farve = statusFarve(lektion.status);
                      const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);

                      return (
                        <button
                          key={lektion.id}
                          onClick={() => aabneLektion({ ...lektion, tildeling })}
                          className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99] z-10 overflow-hidden"
                          style={{
                            top: top + 2,
                            height: height - 4,
                            backgroundColor: farve.bg,
                            border: `1.5px solid ${farve.border}`,
                          }}
                        >
                          <div className="font-medium text-xs leading-tight truncate" style={{ color: farve.text }}>
                            {lektion.subject}
                          </div>
                          <div className="text-xs opacity-70 truncate" style={{ color: farve.text }}>
                            {lektion.klasse_navn || lektion.klasse_name} · {lektion.laerer_navn}
                          </div>
                          {tildeling && (
                            <div className="text-xs opacity-60 truncate" style={{ color: farve.text }}>
                              👤 {tildeling.vikar_navn}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Lektion-modal ───────────────────────────────────── */}
      {modalType === 'lektion' && valgtLektion && (
        <LektionModal
          lektion={valgtLektion}
          onLuk={lukModal}
          onRefetch={refetch}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          actionFejl={actionFejl}
          setActionFejl={setActionFejl}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LektionModal — viser detaljer og handlinger for én lektion
───────────────────────────────────────────────────────────── */
function LektionModal({ lektion, onLuk, onRefetch, actionLoading, setActionLoading, actionFejl, setActionFejl }) {
  const [vikarListe, setVikarListe] = useState(null);
  const [henterVikarer, setHenterVikarer] = useState(false);

  const start = new Date(lektion.start_time);
  const slut  = new Date(lektion.end_time);

  const tidsformat = (d) =>
    d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const datoformat = (d) =>
    d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

  async function hentLedigeVikarer() {
    setHenterVikarer(true);
    try {
      const dato  = start.toISOString().slice(0, 10);
      const startT = tidsformat(start);
      const slutT  = tidsformat(slut);
      const vikarer = await vikarService.getLedige(dato, startT, slutT);
      setVikarListe(vikarer);
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setHenterVikarer(false);
    }
  }

  async function tildelVikar(vikarId) {
    setActionLoading(true);
    setActionFejl('');
    try {
      await tildelingService.tildel(lektion.id, vikarId);
      onRefetch();
      onLuk();
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function fjernTildeling() {
    if (!lektion.tildeling) return;
    setActionLoading(true);
    setActionFejl('');
    try {
      await tildelingService.fjern(lektion.tildeling.id);
      onRefetch();
      onLuk();
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const farve = statusFarve(lektion.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Baggrund */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onLuk} />

      {/* Modal-kort */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Farvet top-bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: farve.border }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{lektion.subject}</h2>
              <p className="text-sm text-slate-500 mt-0.5 capitalize">{datoformat(start)}</p>
            </div>
            <button
              onClick={onLuk}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
            >
              ×
            </button>
          </div>

          {/* Detaljer */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <InfoBoks label="Tid" value={`${tidsformat(start)} – ${tidsformat(slut)}`} />
            <InfoBoks label="Klasse" value={lektion.klasse_navn || lektion.klasse_name || '—'} />
            <InfoBoks label="Lærer" value={lektion.laerer_navn || '—'} />
            <InfoBoks label="Lokale" value={lektion.room || '—'} />
          </div>

          {/* Status-badge */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ backgroundColor: farve.bg, borderColor: farve.border, color: farve.text }}
            >
              {lektion.status}
            </span>
            {lektion.tildeling && (
              <span className="text-sm text-slate-600">
                Vikar: <strong>{lektion.tildeling.vikar_navn}</strong>
              </span>
            )}
          </div>

          {/* Fejl */}
          {actionFejl && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {actionFejl}
            </div>
          )}

          {/* Handlinger */}
          <div className="flex flex-col gap-2">
            {lektion.status === 'udækket' && (
              <>
                {!vikarListe ? (
                  <button
                    onClick={hentLedigeVikarer}
                    disabled={henterVikarer}
                    className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {henterVikarer ? 'Henter vikarer…' : 'Find ledig vikar'}
                  </button>
                ) : vikarListe.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-2 bg-slate-50 rounded-lg">
                    Ingen ledige vikarer i dette tidsrum
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vælg vikar</p>
                    {vikarListe.map(v => (
                      <button
                        key={v.id}
                        onClick={() => tildelVikar(v.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-sm transition-colors disabled:opacity-50"
                      >
                        <span className="font-medium text-slate-800">{v.name}</span>
                        <span className="text-slate-400 text-xs">{v.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {lektion.status === 'dækket' && lektion.tildeling && (
              <button
                onClick={fjernTildeling}
                disabled={actionLoading}
                className="w-full py-2 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Fjerner…' : 'Fjern tildeling'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBoks({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}