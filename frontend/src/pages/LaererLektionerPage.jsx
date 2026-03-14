import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import BeskedModal from '../components/beskeder/BeskedModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  getMandagForUge,
  getUgedage,
  beregnPosition,
  getUgenummer,
  dagTilStreng,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../utils/kalenderUtils';

const API        = import.meta.env.VITE_API_URL ?? '';
const TIME_PX    = 64;
const COL_W      = 200;
const TIME_COL_W = 48;
const HEADER_H   = 72;
const TIMER      = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

async function fetchMig() {
  const res = await fetch(`${API}/laerere/mig`, { credentials: 'include' });
  if (!res.ok) throw new Error('Kunne ikke hente lærerdata');
  return res.json();
}

async function fetchLektionerMedBeskeder(ids) {
  if (!ids.length) return [];
  const res = await fetch(
    `${API}/beskeder/lektioner-med-beskeder?ids=${ids.join(',')}`,
    { credentials: 'include' }
  );
  if (!res.ok) return [];
  return res.json();
}

export default function LaererLektionerPage() {
  useAuth();
  const [mandag, setMandag]             = useState(() => getMandagForUge());
  const [beskedLektion, setBeskedLektion] = useState(null);   // åbner BeskedModal
  const [lektionerMedBeskeder, setLektionerMedBeskeder] = useState([]); // lesson_ids med beskeder

  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  const { data: laerer, loading, error } = useApi(fetchMig, []);

  const mineLektioner = laerer?.lektioner ?? [];

  // Hent hvilke lektioner der har beskeder
  useEffect(() => {
    if (!mineLektioner.length) return;
    const ids = mineLektioner.map(l => l.id);
    fetchLektionerMedBeskeder(ids).then(setLektionerMedBeskeder);
  }, [mineLektioner.length]);

  // Auto-scroll til arbejdstid
  useEffect(() => {
    if (!loading && yScrollRef.current) {
      yScrollRef.current.scrollTop = (8 - TIMER_START) * TIME_PX - 16;
    }
  }, [loading]);

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
  }

  function aabnesBeskedModal(lektion) {
    setBeskedLektion(lektion);
    // Når vi åbner modal: fjern prik optimistisk (vi har set den)
    setLektionerMedBeskeder(prev => prev.filter(id => id !== lektion.id));
  }

  function lukBeskedModal() {
    // Genindlæs notifikationer så ny besked fra den anden vises
    if (mineLektioner.length) {
      fetchLektionerMedBeskeder(mineLektioner.map(l => l.id)).then(setLektionerMedBeskeder);
    }
    setBeskedLektion(null);
  }

  const ugedage = getUgedage(mandag);
  const ugeNr   = getUgenummer(mandag);
  const idagStr = dagTilStreng(new Date());

  if (loading) return <LoadingSpinner tekst="Henter lektioner…" />;
  if (error)   return <ErrorMessage besked={error} />;

  const totalGridW = ugedage.length * COL_W;

  return (
    <>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMandag(getMandagForUge())}
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
            {laerer?.name && <span className="font-medium text-slate-600 mr-2">{laerer.name}</span>}
            {mineLektioner.length} lektioner i alt
          </div>
        </div>

        {/* Kalender */}
        <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Tidssøjle */}
          <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
            className="shrink-0 border-r border-slate-200 flex flex-col bg-white z-10">
            <div style={{ height: HEADER_H }} className="shrink-0 border-b border-slate-200" />
            <div ref={timeColRef} className="flex-1 overflow-hidden">
              <div style={{ height: TIMER.length * TIME_PX }}>
                {TIMER.map(t => (
                  <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                    style={{ height: TIME_PX }}>
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
                const dagStr   = dagTilStreng(dag);
                const erIdag   = dagStr === idagStr;
                const antalDag = mineLektioner.filter(l =>
                  dagTilStreng(new Date(l.start_time)) === dagStr
                ).length;
                return (
                  <div key={i} style={{ width: COL_W, minWidth: COL_W }}
                    className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0">
                    <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : 'text-slate-500'}`}>
                      {DAGE[i].slice(0, 3)}
                    </p>
                    <p className={`text-2xl font-bold leading-tight ${erIdag ? 'text-blue-600' : 'text-slate-800'}`}>
                      {dag.getDate()}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {dag.toLocaleDateString('da-DK', { month: 'short' })}
                    </p>
                    {antalDag > 0 && (
                      <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700 font-medium">
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
                        const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                        const erDaekket   = !!lektion.vikar_navn;
                        const erFortid    = new Date(lektion.end_time) < new Date();
                        const harBeskeder = lektionerMedBeskeder.includes(lektion.id);

                        // Farve: violet (normal), grøn (dækket)
                        const bg     = erDaekket ? '#F0FDF4' : '#F5F3FF';
                        const border = erDaekket ? '#BBF7D0' : '#DDD6FE';
                        const tekst  = erDaekket ? 'text-emerald-800' : 'text-violet-800';
                        const sub    = erDaekket ? 'text-emerald-600' : 'text-violet-500';

                        return (
                          <button key={lektion.id}
                            onClick={() => aabnesBeskedModal(lektion)}
                            className={`absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all hover:shadow-md z-10 overflow-hidden ${erFortid ? 'opacity-50' : ''}`}
                            style={{ top: top + 1, height: height - 2, backgroundColor: bg, border: `1.5px solid ${border}` }}>

                            {/* Notifikationsprik */}
                            {harBeskeder && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                            )}

                            <div className="flex items-center justify-between gap-1 pr-3">
                              <p className={`font-semibold text-xs leading-tight truncate ${tekst}`}>
                                {lektion.subject}
                              </p>
                            </div>
                            <p className={`text-xs opacity-60 truncate ${sub}`}>{lektion.klasse_navn}</p>
                            {erDaekket && (
                              <p className="text-xs text-emerald-600 opacity-70 truncate">
                                ↳ {lektion.vikar_navn}
                              </p>
                            )}
                            {height > 44 && (
                              <p className={`text-xs opacity-50 mt-0.5 ${sub}`}>
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
        </div>
      </div>

      {/* BeskedModal */}
      {beskedLektion && (
        <BeskedModal lektion={beskedLektion} onLuk={lukBeskedModal} />
      )}
    </>
  );
}