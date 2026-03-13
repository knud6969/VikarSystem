import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { lektionService } from '../api/lektionService';
import { vikarService } from '../api/vikarService';
import { tildelingService } from '../api/tildelingService';
import { useApi } from '../hooks/useApi';
import {
  getMandagForUge,
  getUgedage,
  beregnPosition,
  getUgenummer,
  dagTilStreng,
  statusFarve,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../utils/kalenderUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const TIME_PX    = 64;
const COL_W      = 200;
const TIME_COL_W = 48;
const HEADER_H   = 72;
const TIMER      = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

export default function VikarLektionerPage() {
  const { bruger } = useAuth();
  const [mandag, setMandag] = useState(() => getMandagForUge());
  const [valgtLektion, setValgtLektion] = useState(null);

  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  // Hent vikarens egne data
  const { data: vikar, loading: vikarLoading } = useApi(
    () => vikarService.getAll().then(alle => alle.find(v => v.email === bruger?.email)),
    [bruger?.email]
  );

  const { data: alleLektioner, loading: lekLoading, error } = useApi(
    () => lektionService.getAll(),
    []
  );
  const { data: alleTildelinger, loading: tilLoading } = useApi(
    () => tildelingService.getAll(),
    []
  );

  const ugedage = getUgedage(mandag);
  const ugeNr   = getUgenummer(mandag);
  const idagStr = dagTilStreng(new Date());

  // Auto-scroll til arbejdstid
  useEffect(() => {
    if (!lekLoading && yScrollRef.current) {
      yScrollRef.current.scrollTop = (8 - TIMER_START) * TIME_PX - 16;
    }
  }, [lekLoading]);

  const handleYScroll = useCallback((e) => {
    if (syncing.current) return;
    syncing.current = true;
    if (timeColRef.current) timeColRef.current.scrollTop = e.currentTarget.scrollTop;
    syncing.current = false;
  }, []);

  function gaaTilUge(r) {
    setMandag(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + r * 7);
      return d;
    });
    setValgtLektion(null);
  }

  // Filtrer lektioner tildelt denne vikar
  const mineTildelinger = (alleTildelinger || []).filter(t => t.substitute_id === vikar?.id);
  const mineLektionIds  = new Set(mineTildelinger.map(t => t.lesson_id));
  const mineLektioner   = (alleLektioner || []).filter(l => mineLektionIds.has(l.id));

  const loading = vikarLoading || lekLoading || tilLoading;

  if (loading) return <LoadingSpinner tekst="Henter lektioner…" />;
  if (error)   return <ErrorMessage besked={error} />;

  const totalGridW = ugedage.length * COL_W;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMandag(getMandagForUge()); setValgtLektion(null); }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            I dag
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹</button>
            <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
          </div>
          <span className="text-sm font-semibold text-slate-800">Uge {ugeNr}</span>
        </div>

        <div className="text-xs text-slate-400">
          {mineLektioner.length > 0
            ? `${mineLektioner.filter(l => dagTilStreng(new Date(l.start_time)) >= idagStr).length} kommende lektioner`
            : 'Ingen tildelte lektioner'}
        </div>
      </div>

      {/* Kalender */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Tidssøjle */}
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0 border-r border-slate-200 flex flex-col bg-white z-10">
          <div style={{ height: HEADER_H }} className="shrink-0 border-b border-slate-200" />
          <div ref={timeColRef} className="flex-1 overflow-hidden">
            <div style={{ height: TIMER.length * TIME_PX }}>
              {TIMER.map(t => (
                <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1" style={{ height: TIME_PX }}>
                  <span className="text-xs text-slate-300 tabular-nums leading-none">
                    {String(t).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dag-kolonner */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0 flex flex-col min-h-0">

          {/* Header */}
          <div className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
            style={{ width: totalGridW, height: HEADER_H }}>
            {ugedage.map((dag, i) => {
              const dagStr = dagTilStreng(dag);
              const erIdag = dagStr === idagStr;
              const antalDag = mineLektioner.filter(l => dagTilStreng(new Date(l.start_time)) === dagStr).length;
              return (
                <div key={i} style={{ width: COL_W, minWidth: COL_W }}
                  className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0">
                  <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : 'text-slate-500'}`}>
                    {DAGE[i].slice(0, 3)}
                  </p>
                  <p className={`text-2xl font-bold leading-tight ${erIdag ? 'text-blue-600' : 'text-slate-800'}`}>
                    {dag.getDate()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dag.toLocaleDateString('da-DK', { month: 'short' })}
                  </p>
                  {antalDag > 0 && (
                    <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">
                      {antalDag} lektion{antalDag !== 1 ? 'er' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Gitter */}
          <div ref={yScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleYScroll} style={{ width: totalGridW }}>
            <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
              {ugedage.map((dag, i) => {
                const dagStr      = dagTilStreng(dag);
                const erIdag      = dagStr === idagStr;
                const dagLektioner = mineLektioner.filter(l =>
                  dagTilStreng(new Date(l.start_time)) === dagStr
                );
                return (
                  <div key={i}
                    className={`relative border-r border-slate-200 last:border-r-0 shrink-0 ${erIdag ? 'bg-blue-50/20' : ''}`}
                    style={{ width: COL_W, height: TIMER.length * TIME_PX }}>
                    {/* Grid-linjer */}
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100"
                        style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {/* Lektioner */}
                    {dagLektioner.map(lektion => {
                      const tildeling = mineTildelinger.find(t => t.lesson_id === lektion.id);
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const erFortid = new Date(lektion.end_time) < new Date();
                      return (
                        <button key={lektion.id}
                          onClick={() => setValgtLektion(valgtLektion?.id === lektion.id ? null : { ...lektion, tildeling })}
                          className={`absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all hover:shadow-md z-10 overflow-hidden ${erFortid ? 'opacity-50' : ''}`}
                          style={{
                            top: top + 1,
                            height: height - 2,
                            backgroundColor: '#F0FDF4',
                            border: `1.5px solid ${valgtLektion?.id === lektion.id ? '#16A34A' : '#BBF7D0'}`,
                            boxShadow: valgtLektion?.id === lektion.id ? '0 0 0 2px #86EFAC' : undefined,
                          }}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-xs leading-tight truncate text-emerald-800">
                              {lektion.subject}
                            </p>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/60 font-bold shrink-0 text-emerald-700" style={{ fontSize: '9px' }}>
                              {lektion.laerer_navn?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <p className="text-xs opacity-60 truncate text-emerald-700">{lektion.klasse_navn}</p>
                          {height > 44 && (
                            <p className="text-xs opacity-50 text-emerald-600 mt-0.5">
                              {new Date(lektion.start_time).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                              {' – '}
                              {new Date(lektion.end_time).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                            </p>
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

        {/* Detalje-panel */}
        {valgtLektion && (
          <div className="w-64 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            <LektionDetalje lektion={valgtLektion} onLuk={() => setValgtLektion(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

function LektionDetalje({ lektion, onLuk }) {
  const start   = new Date(lektion.start_time);
  const slut    = new Date(lektion.end_time);
  const fmt     = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const erForbi = slut < new Date();

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          {erForbi ? 'Afholdt' : 'Tildelt'}
        </span>
        <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{lektion.subject}</p>
          <p className="text-sm text-slate-500">{lektion.klasse_navn}</p>
        </div>

        <div className="h-px bg-slate-100" />

        <InfoRække label="Dato"
          value={start.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })} />
        <InfoRække label="Tid"   value={`${fmt(start)} – ${fmt(slut)}`} />
        <InfoRække label="Lokale" value={lektion.room || '—'} />
        <InfoRække label="Lærer" value={lektion.laerer_navn || '—'} />

        {!erForbi && (
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
            Husk at møde op til denne lektion. Kontakt skolen ved afbud.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRække({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-right text-slate-700 capitalize">{value}</span>
    </div>
  );
}