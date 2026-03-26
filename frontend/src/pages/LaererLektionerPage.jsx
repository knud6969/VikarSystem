import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import DagOversigt from '../components/kalender/DagOversigt';
import BeskedModal from '../components/beskeder/BeskedModal';
import { fetchLektionerMedBeskeder } from '../api/beskedFetch';
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

const TIME_PX    = 64;
const TIME_COL_W = 48;
const HEADER_H   = 88;
const TIMER      = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

async function fetchMig() {
  const token = localStorage.getItem('token');
  const res = await fetch('/laerere/mig', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Kunne ikke hente lærerdata');
  return res.json();
}

export default function LaererLektionerPage() {
  useAuth();
  const [mandag, setMandag]                             = useState(() => getMandagForUge());
  const [valgtLektion, setValgtLektion]                 = useState(null);
  const [beskedLektion, setBeskedLektion]               = useState(null);
  const [lektionerMedBeskeder, setLektionerMedBeskeder] = useState([]);
  const [filter, setFilter] = useState('mine');

  const [searchParams, setSearchParams] = useSearchParams();
  const autoAabnetRef = useRef(false);

  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  const { data: laerer, loading, error } = useApi(fetchMig, []);
  const mineLektioner = laerer?.lektioner ?? [];

  useEffect(() => {
    if (!mineLektioner.length) return;
    fetchLektionerMedBeskeder(mineLektioner.map(l => l.id)).then(setLektionerMedBeskeder);
  }, [mineLektioner.length]);

  // Auto-åbn lektion fra notifikations-link (?lessonId=X&besked=1)
  useEffect(() => {
    const lessonId = searchParams.get('lessonId');
    if (!lessonId || autoAabnetRef.current || !mineLektioner.length) return;
    const lektion = mineLektioner.find(l => String(l.id) === String(lessonId));
    if (!lektion) return;
    autoAabnetRef.current = true;
    setMandag(getMandagForUge(new Date(lektion.start_time)));
    if (searchParams.get('besked') === '1') {
      setBeskedLektion(lektion);
    } else {
      setValgtLektion(lektion);
    }
    setSearchParams({}, { replace: true });
  }, [mineLektioner, searchParams]);

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
    setValgtLektion(null);
  }

  function aabnesBeskedModal(lektion) {
    setBeskedLektion(lektion);
    setLektionerMedBeskeder(prev => prev.filter(id => id !== lektion.id));
  }

  function lukBeskedModal() {
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

  return (
    <>
      <div style={{ height: 'calc(100vh - 72px)' }} className="flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          {filter === 'mine' ? (
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
              {laerer?.name && (
                <span className="text-xs text-slate-400 ml-1">
                  <span className="font-medium text-slate-700">{laerer.name}</span>
                  {' · '}{mineLektioner.length} lektioner i alt
                </span>
              )}
            </div>
          ) : (
            <div />
          )}
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setValgtLektion(null); }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            <option value="mine">Mine lektioner</option>
            <option value="alle">Alle lektioner</option>
            <option value="vikarer">Vikarer</option>
            <option value="laerere">Lærere</option>
          </select>
        </div>

        {filter !== 'mine' && (
          <DagOversigt filter={filter} />
        )}

        {/* Mine lektioner: uge-kalender */}
        {filter === 'mine' && <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

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
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">

            {/* Header */}
            <div className="flex shrink-0 border-b border-slate-200 bg-white" style={{ height: HEADER_H }}>
              {ugedage.map((dag, i) => {
                const dagStr   = dagTilStreng(dag);
                const erIdag   = dagStr === idagStr;
                const antalDag = mineLektioner.filter(l =>
                  dagTilStreng(new Date(l.start_time)) === dagStr
                ).length;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 py-2">
                    <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : 'text-slate-500'}`}>
                      {DAGE[i]}
                    </p>
                    <p className={`text-2xl font-bold leading-tight ${erIdag ? 'text-blue-600' : 'text-slate-800'}`}>
                      {dag.getDate()}
                    </p>
                    <p className="text-xs text-slate-400 capitalize mb-1">
                      {dag.toLocaleDateString('da-DK', { month: 'long' })}
                    </p>
                    {antalDag > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                        {antalDag} lektion{antalDag !== 1 ? 'er' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gitter */}
            <div ref={yScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden flex"
              onScroll={handleYScroll}>
              {ugedage.map((dag, i) => {
                const dagStr       = dagTilStreng(dag);
                const erIdag       = dagStr === idagStr;
                const dagLektioner = mineLektioner.filter(l =>
                  dagTilStreng(new Date(l.start_time)) === dagStr
                );
                return (
                  <div key={i}
                    className={`flex-1 relative border-r border-slate-200 last:border-r-0 ${erIdag ? 'bg-blue-50/20' : ''}`}
                    style={{ height: TIMER.length * TIME_PX }}>
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100"
                        style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {dagLektioner.map(lektion => {
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const erDaekket   = !!lektion.vikar_navn;
                      const erFortid    = new Date(lektion.end_time) < new Date();
                      const erValgt     = valgtLektion?.id === lektion.id;
                      const harBeskeder = lektionerMedBeskeder.includes(lektion.id);

                      const bg     = erDaekket ? '#F0FDF4' : '#EFF6FF';
                      const border = erValgt
                        ? (erDaekket ? '#16A34A' : '#3B82F6')
                        : (erDaekket ? '#BBF7D0' : '#BFDBFE');
                      const tekst  = erDaekket ? 'text-emerald-800' : 'text-blue-800';
                      const sub    = erDaekket ? 'text-emerald-600' : 'text-blue-500';

                      return (
                        <button key={lektion.id}
                          onClick={() => setValgtLektion(erValgt ? null : lektion)}
                          className={`absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all hover:shadow-md z-10 overflow-hidden ${erFortid ? 'opacity-50' : ''}`}
                          style={{
                            top: top + 1,
                            height: height - 2,
                            backgroundColor: bg,
                            border: `1.5px solid ${border}`,
                            boxShadow: erValgt ? `0 0 0 2px ${erDaekket ? '#86EFAC' : '#93C5FD'}` : undefined,
                          }}>
                          {harBeskeder && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                          )}
                          <p className={`font-semibold text-xs leading-tight truncate ${tekst}`}>
                            {lektion.subject}
                          </p>
                          <p className={`text-xs opacity-60 truncate ${sub}`}>{lektion.klasse_navn}</p>
                          {erDaekket && lektion.vikar_navn && (
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

          {/* Detalje-panel */}
          {valgtLektion && (
            <div className="w-64 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
              <LektionDetalje
                lektion={valgtLektion}
                harBeskeder={lektionerMedBeskeder.includes(valgtLektion.id)}
                onLuk={() => setValgtLektion(null)}
                visBesked={true}
                onAabnBeskeder={() => { aabnesBeskedModal(valgtLektion); setValgtLektion(null); }}
              />
            </div>
          )}
        </div>}
      </div>

      {beskedLektion && (
        <BeskedModal lektion={beskedLektion} onLuk={lukBeskedModal} />
      )}
    </>
  );
}

function LektionDetalje({ lektion, harBeskeder, onLuk, onAabnBeskeder, visBesked }) {
  const start   = new Date(lektion.start_time);
  const slut    = new Date(lektion.end_time);
  const fmt     = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const erForbi = slut < new Date();
  const erDaekket = !!lektion.vikar_navn || lektion.status === 'dækket';

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
          erForbi
            ? 'bg-slate-100 text-slate-500 border-slate-200'
            : erDaekket
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-blue-100 text-blue-700 border-blue-200'
        }`}>
          {erForbi ? 'Afholdt' : erDaekket ? 'Dækket' : 'Planlagt'}
        </span>
        <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{lektion.subject}</p>
          <p className="text-sm text-slate-500">{lektion.klasse_navn}</p>
        </div>
        <div className="h-px bg-slate-100" />
        <InfoRække label="Dato"   value={start.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })} />
        <InfoRække label="Tid"    value={`${fmt(start)} – ${fmt(slut)}`} />
        <InfoRække label="Lokale" value={lektion.room || '—'} />
        <InfoRække label="Lærer"  value={lektion.laerer_navn || '—'} />
        {erDaekket && lektion.vikar_navn && (
          <InfoRække label="Vikar" value={lektion.vikar_navn} />
        )}
        {visBesked && (
          <button onClick={onAabnBeskeder}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Beskeder til vikar
            {harBeskeder && <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" />}
          </button>
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
