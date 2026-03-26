/**
 * DagOversigt — read-only version of admin's day calendar.
 * Same data sources as AdminKalenderPage, same layout, no admin actions.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { lektionService } from '../../api/lektionService';
import { tildelingService } from '../../api/tildelingService';
import { laererService } from '../../api/laererService';
import { vikarService } from '../../api/vikarService';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  getMandagForUge,
  getUgedage,
  getUgenummer,
  beregnPosition,
  dagTilStreng,
  formatDagLabel,
  statusFarve,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../../utils/kalenderUtils';

const TIME_PX    = 64;
const COL_W      = 140;
const TIME_COL_W = 48;
const HEADER_H   = 72;
const ARBEJDS_START = 7;
const TIMER = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

const AVATAR_FARVER = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-cyan-500','bg-indigo-500','bg-teal-500',
  'bg-orange-500','bg-pink-500','bg-lime-600','bg-sky-500',
];

function getInitialer(navn) {
  return (navn || '').split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2);
}

export default function DagOversigt({ filter }) {
  const [mandag,      setMandag]      = useState(() => getMandagForUge());
  const [valgtDagIdx, setValgtDagIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 0 : d - 1;
  });
  const [valgtLektion, setValgtLektion] = useState(null);

  const xScrollRef = useRef(null);
  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  const [lektioner,   setLektioner]   = useState([]);
  const [tildelinger, setTildelinger] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const { data: alleLaerere } = useApi(laererService.getAll, []);
  const { data: alleVikarer } = useApi(vikarService.getAll, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      lektionService.getAll(),
      tildelingService.getAll(),
    ]).then(([l, t]) => {
      setLektioner(l || []);
      setTildelinger(t || []);
    }).catch(() => {
      setLektioner([]);
      setTildelinger([]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && yScrollRef.current) {
      yScrollRef.current.scrollTop = (ARBEJDS_START - TIMER_START) * TIME_PX - 16;
    }
  }, [loading, valgtDagIdx, mandag]);

  useEffect(() => { setValgtLektion(null); }, [valgtDagIdx, mandag, filter]);

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
    setValgtDagIdx(0);
    setValgtLektion(null);
  }

  // Build person list — same logic as admin
  const personer = (() => {
    const l = (alleLaerere || []).map((p, i) => ({
      ...p, dbType: p.type, type: 'laerer', farve: AVATAR_FARVER[i % AVATAR_FARVER.length],
    }));
    const v = (alleVikarer || []).map((p, i) => ({
      ...p, type: 'vikar', farve: AVATAR_FARVER[(l.length + i) % AVATAR_FARVER.length],
    }));
    if (filter === 'laerere') return l;
    if (filter === 'vikarer') return v;
    return [...l, ...v];
  })();

  const ugedage     = getUgedage(mandag);
  const ugeNr       = getUgenummer(mandag);
  const idagStr     = dagTilStreng(new Date());
  const valgtDag    = ugedage[valgtDagIdx];
  const valgtDagStr = dagTilStreng(valgtDag);

  const totalGridW = Math.max(personer.length * COL_W, 200);

  if (loading) return <LoadingSpinner tekst="Henter kalender…" />;

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMandag(getMandagForUge());
              setValgtDagIdx(Math.max(0, new Date().getDay() - 1));
            }}
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

        {/* Day tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {ugedage.map((dag, i) => (
            <button
              key={i}
              onClick={() => setValgtDagIdx(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                i === valgtDagIdx
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="hidden sm:inline">{DAGE[i].slice(0, 3)} </span>
              <span className={dagTilStreng(dag) === idagStr ? 'text-blue-600 font-bold' : ''}>
                {formatDagLabel(dag)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Time column */}
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
          className="shrink-0 border-r border-slate-200 flex flex-col bg-white z-10">
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

        {/* Columns */}
        <div ref={xScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden min-w-0 flex flex-col min-h-0">

          {/* Person headers */}
          <div
            className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
            style={{ width: totalGridW, height: HEADER_H }}
          >
            {personer.map(person => {
              const nøgle = `${person.type}-${person.id}`;
              return (
                <div
                  key={nøgle}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 gap-0.5"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold mb-0.5 ${person.farve}`}>
                    {getInitialer(person.name)}
                  </div>
                  <span className="text-xs font-semibold leading-none text-slate-600">
                    {getInitialer(person.name)}
                  </span>
                  <span className={`text-xs ${
                    person.type === 'vikar'      ? 'text-emerald-500' :
                    person.dbType === 'paedagog' ? 'text-violet-400'  :
                                                   'text-blue-400'
                  }`}>
                    {person.type === 'vikar' ? 'V' : person.dbType === 'paedagog' ? 'P' : 'L'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div
            ref={yScrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ width: totalGridW }}
            onScroll={handleYScroll}
          >
            <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
              {personer.map(person => {
                const nøgle = `${person.type}-${person.id}`;
                const dagLektioner = lektioner.filter(l => {
                  const lDagStr = dagTilStreng(new Date(l.start_time));
                  if (lDagStr !== valgtDagStr) return false;
                  if (person.type === 'laerer') return l.teacher_id === person.id;
                  return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === person.id);
                });
                return (
                  <GitterKolonne
                    key={nøgle}
                    colW={COL_W}
                    lektioner={dagLektioner}
                    tildelinger={tildelinger}
                    valgtLektionId={valgtLektion?.id}
                    onLektionKlik={l => setValgtLektion(prev => prev?.id === l.id ? null : l)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {valgtLektion && (
          <div className="w-64 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            <LektionDetalje
              lektion={valgtLektion}
              tildeling={tildelinger.find(t => t.lesson_id === valgtLektion.id)}
              onLuk={() => setValgtLektion(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GitterKolonne({ colW, lektioner, tildelinger, valgtLektionId, onLektionKlik }) {
  return (
    <div
      className="relative border-r border-slate-200 last:border-r-0 shrink-0"
      style={{ width: colW, height: TIMER.length * TIME_PX }}
    >
      {TIMER.map(t => (
        <div key={t} className="absolute w-full border-b border-slate-100"
          style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
      ))}
      {TIMER.map(t => (
        <div key={`h${t}`} className="absolute w-full border-b border-slate-50"
          style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
      ))}
      {lektioner.map(lektion => {
        const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
        const farve     = statusFarve(lektion.status);
        const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
        const erValgt   = valgtLektionId === lektion.id;
        return (
          <button
            key={lektion.id}
            onClick={() => onLektionKlik(lektion)}
            className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left transition-all hover:shadow-md hover:brightness-95 z-10 overflow-hidden"
            style={{
              top: top + 1,
              height: height - 2,
              backgroundColor: farve.bg,
              border: `1.5px solid ${farve.border}`,
              boxShadow: erValgt ? `0 0 0 2px ${farve.border}` : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="font-semibold text-xs leading-tight truncate" style={{ color: farve.text }}>
                {lektion.subject}
              </p>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/50 font-bold shrink-0"
                style={{ color: farve.text, fontSize: '9px' }}
              >
                {tildeling
                  ? tildeling.vikar_navn?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2)
                  : lektion.laerer_navn?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2)
                }
              </span>
            </div>
            <p className="text-xs opacity-60 truncate" style={{ color: farve.text }}>
              {lektion.klasse_navn}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function LektionDetalje({ lektion, tildeling, onLuk }) {
  const start      = new Date(lektion.start_time);
  const slut       = new Date(lektion.end_time);
  const fmt        = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const erFortid   = slut < new Date();
  const farve      = statusFarve(lektion.status);
  const statusLabel = erFortid ? 'Afholdt'
    : lektion.status === 'dækket'  ? 'Dækket'
    : lektion.status === 'udækket' ? 'Udækket'
    : 'Planlagt';

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span
          className="px-2.5 py-1 rounded text-xs font-semibold border"
          style={{ backgroundColor: farve.bg, borderColor: farve.border, color: farve.text }}
        >
          {statusLabel}
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
        {tildeling?.vikar_navn && (
          <InfoRække label="Vikar" value={tildeling.vikar_navn} />
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
