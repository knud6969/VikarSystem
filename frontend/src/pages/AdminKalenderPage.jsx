import { useState, useRef, useEffect, useCallback } from 'react';
import { useKalender } from '../hooks/useKalender';
import { laererService } from '../api/laererService';
import { vikarService } from '../api/vikarService';
import { tildelingService } from '../api/tildelingService';
import { useApi } from '../hooks/useApi';
import {
  getMandagForUge,
  getUgedage,
  formatDagLabel,
  beregnPosition,
  getUgenummer,
  statusFarve,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../utils/kalenderUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const TIME_PX       = 64;
const COL_W         = 120;
const TIME_COL_W    = 48;
const HEADER_H      = 72;
const ARBEJDS_START = 8;
const TIMER         = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

function getInitialer(navn) {
  return navn.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_FARVER = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-cyan-500','bg-indigo-500','bg-teal-500',
  'bg-orange-500','bg-pink-500','bg-lime-600','bg-sky-500',
];

export default function AdminKalenderPage() {
  const [mandag, setMandag]               = useState(() => getMandagForUge());
  const [valgtDagIdx, setValgtDagIdx]     = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 0 : d - 1;
  });
  const [valgtLektion, setValgtLektion]   = useState(null);
  const [filterType, setFilterType]       = useState('alle');
  const [valgtPersonId, setValgtPersonId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFejl, setActionFejl]       = useState('');
  const [vikarListe, setVikarListe]       = useState(null);
  const [henterVikarer, setHenterVikarer] = useState(false);

  /*
   * SCROLL-STRATEGI
   * ───────────────
   * Hele gitteret (header + kolonner) er pakket i ÉN horisontal
   * scroll-container ("xScrollRef").  Den er position:relative, og
   * person-headeren er sticky top:0 inde i den, så header og gitter
   * altid er perfekt alignet — ingen synkronisering nødvendig.
   *
   * Vertikal scroll håndteres af en wrapper omkring kun kolonnerne.
   * Tidssøjlen ("yScrollRef") spejler denne scrollTop.
   */
  const xScrollRef = useRef(null); // horisontal scroll (wrapper om alt)
  const yScrollRef = useRef(null); // vertikal scroll (kun gitter-body)
  const timeColRef = useRef(null); // tidssøjle (y spejles hertil)
  const syncing    = useRef(false);

  const { lektioner, fravaer, tildelinger, loading, error, refetch } = useKalender(mandag);
  const { data: alleLaerere } = useApi(laererService.getAll, []);
  const { data: alleVikarer } = useApi(vikarService.getAll, []);

  const ugedage     = getUgedage(mandag);
  const ugeNr       = getUgenummer(mandag);
  const valgtDag    = ugedage[valgtDagIdx];
  const idagStr     = new Date().toISOString().slice(0, 10);
  const valgtDagStr = valgtDag?.toISOString().slice(0, 10);

  // Auto-scroll til arbejdstid
  useEffect(() => {
    if (!loading && yScrollRef.current) {
      yScrollRef.current.scrollTop = (ARBEJDS_START - TIMER_START) * TIME_PX - 16;
    }
  }, [loading]);

  // Vertikal sync: gitter → tidssøjle
  const handleYScroll = useCallback((e) => {
    if (syncing.current) return;
    syncing.current = true;
    if (timeColRef.current) timeColRef.current.scrollTop = e.currentTarget.scrollTop;
    syncing.current = false;
  }, []);

  const personer = (() => {
    const l = (alleLaerere || []).map((p, i) => ({ ...p, type: 'laerer', farve: AVATAR_FARVER[i % AVATAR_FARVER.length] }));
    const v = (alleVikarer || []).map((p, i) => ({ ...p, type: 'vikar',  farve: AVATAR_FARVER[(l.length + i) % AVATAR_FARVER.length] }));
    if (filterType === 'laerere') return l;
    if (filterType === 'vikarer') return v;
    return [...l, ...v];
  })();

  const visPersoner   = valgtPersonId ? personer.filter(p => `${p.type}-${p.id}` === valgtPersonId) : personer;
  const totalGridW    = visPersoner.length * COL_W;

  const dagLektioner  = lektioner.filter(l => new Date(l.start_time).toISOString().slice(0, 10) === valgtDagStr);
  const dagFravaer    = fravaer.filter(f => f.start_date <= valgtDagStr && f.end_date >= valgtDagStr);

  function gaaTilUge(r) {
    setMandag(prev => { const d = new Date(prev); d.setDate(d.getDate() + r * 7); return d; });
  }

  function aabneLektion(lektion) {
    setValgtLektion({ ...lektion, tildeling: tildelinger.find(t => t.lesson_id === lektion.id) });
    setVikarListe(null);
    setActionFejl('');
  }

  async function hentLedigeVikarer(lektion) {
    setHenterVikarer(true);
    try {
      const s = new Date(lektion.start_time), e = new Date(lektion.end_time);
      const fmt = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      setVikarListe(await vikarService.getLedige(s.toISOString().slice(0, 10), fmt(s), fmt(e)));
    } catch (err) { setActionFejl(err.message); }
    finally      { setHenterVikarer(false); }
  }

  async function tildelVikar(vikarId) {
    setActionLoading(true); setActionFejl('');
    try   { await tildelingService.tildel(valgtLektion.id, vikarId); refetch(); setValgtLektion(null); }
    catch (err) { setActionFejl(err.message); }
    finally     { setActionLoading(false); }
  }

  async function fjernTildeling() {
    setActionLoading(true); setActionFejl('');
    try   { await tildelingService.fjern(valgtLektion.tildeling.id); refetch(); setValgtLektion(null); }
    catch (err) { setActionFejl(err.message); }
    finally     { setActionLoading(false); }
  }

  if (loading) return <LoadingSpinner tekst="Henter kalender…" />;
  if (error)   return <ErrorMessage besked={error} />;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMandag(getMandagForUge()); setValgtDagIdx(Math.max(0, new Date().getDay() - 1)); }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >I dag</button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹</button>
            <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
          </div>
          <span className="text-sm font-semibold text-slate-800">Uge {ugeNr}</span>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {ugedage.map((dag, i) => (
            <button key={i} onClick={() => setValgtDagIdx(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${i === valgtDagIdx ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="hidden sm:inline">{DAGE[i].slice(0, 3)} </span>
              <span className={dag.toISOString().slice(0,10) === idagStr ? 'text-blue-600 font-bold' : ''}>{formatDagLabel(dag)}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[['alle','Alle'],['laerere','Lærere'],['vikarer','Vikarer']].map(([val, label]) => (
            <button key={val} onClick={() => { setFilterType(val); setValgtPersonId(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {dagFravaer.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 shrink-0">
          {dagFravaer.map(f => (
            <span key={f.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-600 border border-red-200">
              🤒 {f.laerer_navn} — {f.type}
            </span>
          ))}
        </div>
      )}

      {valgtPersonId && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span>Viser: <strong className="text-slate-800">{visPersoner[0]?.name}</strong></span>
          <button onClick={() => setValgtPersonId(null)} className="text-blue-500 hover:text-blue-700 underline">Vis alle</button>
        </div>
      )}

      {/* ── Kalender-wrapper ────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Tidssøjle — fast bredde, kun y-scroll (spejl) */}
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0 border-r border-slate-200 flex flex-col bg-white z-10">
          {/* Hjørne over tidssøjlen */}
          <div style={{ height: HEADER_H }} className="shrink-0 border-b border-slate-200" />
          {/* Tidstallene */}
          <div ref={timeColRef} className="flex-1 overflow-hidden">
            <div style={{ height: TIMER.length * TIME_PX }}>
              {TIMER.map(t => (
                <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1" style={{ height: TIME_PX }}>
                  <span className="text-xs text-slate-300 tabular-nums leading-none">{String(t).padStart(2,'0')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*
         * HOVED-KOLONNE-OMRÅDE
         * ────────────────────
         * xScrollRef: overflow-x:auto  →  horisontal scroll for BEGGE header og gitter
         * Inde i den: sticky header øverst, gitter nedenunder (y-scroll separat).
         * Da header og gitter er børn af SAMME x-container, er de altid i sync.
         */}
        <div ref={xScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden min-w-0 flex flex-col min-h-0">

          {/* Person-header — sticky top inden i x-scroll-containeren */}
          <div
            className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
            style={{ width: totalGridW, height: HEADER_H }}
          >
            {visPersoner.map((person) => {
              const nøgle     = `${person.type}-${person.id}`;
              const erValgt   = valgtPersonId === nøgle;
              const erFravaer = person.type === 'laerer' && dagFravaer.some(f => f.teacher_id === person.id);
              return (
                <button
                  key={nøgle}
                  onClick={() => setValgtPersonId(prev => prev === nøgle ? null : nøgle)}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className={`flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 transition-colors ${erValgt ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 ${person.farve} ${erFravaer ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
                    {getInitialer(person.name)}
                    {erFravaer && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
                  </div>
                  <span className={`text-xs font-semibold leading-none ${erValgt ? 'text-blue-700' : 'text-slate-600'}`}>
                    {getInitialer(person.name)}
                  </span>
                  <span className={`text-xs mt-0.5 ${person.type === 'laerer' ? 'text-blue-400' : 'text-emerald-500'}`}>
                    {person.type === 'laerer' ? 'L' : 'V'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gitter-body — vertikal scroll */}
          <div
            ref={yScrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleYScroll}
            style={{ width: totalGridW }}
          >
            <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
              {visPersoner.map((person) => {
                const nøgle     = `${person.type}-${person.id}`;
                const erFravaer = person.type === 'laerer' && dagFravaer.some(f => f.teacher_id === person.id);

                const personLektioner = dagLektioner.filter(l => {
                  if (person.type === 'laerer') return l.teacher_id === person.id;
                  if (person.type === 'vikar')  return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === person.id);
                  return false;
                });

                return (
                  <div
                    key={nøgle}
                    className={`relative border-r border-slate-200 last:border-r-0 shrink-0 ${erFravaer ? 'bg-red-50/30' : ''}`}
                    style={{ width: COL_W, height: TIMER.length * TIME_PX }}
                  >
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100" style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {TIMER.map(t => (
                      <div key={`h${t}`} className="absolute w-full border-b border-slate-50" style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
                    ))}

                    {personLektioner.map(lektion => {
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const farve     = statusFarve(lektion.status);
                      const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
                      return (
                        <button
                          key={lektion.id}
                          onClick={() => aabneLektion({ ...lektion, tildeling })}
                          className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left transition-all hover:shadow-md hover:brightness-95 z-10 overflow-hidden"
                          style={{ top: top + 1, height: height - 2, backgroundColor: farve.bg, border: `1.5px solid ${farve.border}` }}
                        >
                          <p className="font-semibold text-xs leading-tight truncate" style={{ color: farve.text }}>{lektion.subject}</p>
                          {height > 32 && <p className="text-xs opacity-60 truncate" style={{ color: farve.text }}>{lektion.klasse_navn}</p>}
                          {tildeling && height > 44 && <p className="text-xs opacity-50 truncate" style={{ color: farve.text }}>👤 {tildeling.vikar_navn}</p>}
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
            <DetaljePanelIndhold
              lektion={valgtLektion}
              vikarListe={vikarListe}
              henterVikarer={henterVikarer}
              actionLoading={actionLoading}
              actionFejl={actionFejl}
              onLuk={() => setValgtLektion(null)}
              onHentVikarer={() => hentLedigeVikarer(valgtLektion)}
              onTildelVikar={tildelVikar}
              onFjernTildeling={fjernTildeling}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DetaljePanelIndhold({ lektion, vikarListe, henterVikarer, actionLoading, actionFejl, onLuk, onHentVikarer, onTildelVikar, onFjernTildeling }) {
  const start = new Date(lektion.start_time);
  const slut  = new Date(lektion.end_time);
  const fmt   = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const farve = statusFarve(lektion.status);
  const labels = { normal: 'Normal', udækket: 'Udækket', dækket: 'Dækket' };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="px-2.5 py-1 rounded text-xs font-semibold"
          style={{ backgroundColor: farve.bg, color: farve.text, border: `1px solid ${farve.border}` }}>
          {labels[lektion.status] ?? lektion.status}
        </span>
        <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
      </div>
      <div className="px-4 py-4 space-y-3 border-b border-slate-100">
        <InfoRække label="Fag"    value={lektion.subject} />
        <InfoRække label="Klasse" value={lektion.klasse_navn || '—'} bold />
        <InfoRække label="Tid"    value={`${fmt(start)} – ${fmt(slut)}`} />
        <InfoRække label="Lokale" value={lektion.room || '—'} />
        <InfoRække label="Lærer"  value={lektion.laerer_navn || '—'} />
        {lektion.tildeling && <InfoRække label="Vikar" value={lektion.tildeling.vikar_navn} />}
      </div>
      <div className="px-4 py-4 space-y-2">
        {actionFejl && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{actionFejl}</div>}
        {lektion.status === 'udækket' && (
          !vikarListe ? (
            <button onClick={onHentVikarer} disabled={henterVikarer}
              className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {henterVikarer ? 'Henter…' : 'Find ledig vikar'}
            </button>
          ) : vikarListe.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Ingen ledige vikarer</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vælg vikar</p>
              {vikarListe.map(v => (
                <button key={v.id} onClick={() => onTildelVikar(v.id)} disabled={actionLoading}
                  className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
                  <p className="text-xs font-medium text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-400">{v.email}</p>
                </button>
              ))}
            </div>
          )
        )}
        {lektion.status === 'dækket' && lektion.tildeling && (
          <button onClick={onFjernTildeling} disabled={actionLoading}
            className="w-full py-2 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
            {actionLoading ? 'Fjerner…' : 'Fjern tildeling'}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRække({ label, value, bold }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className={`text-xs text-right ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}