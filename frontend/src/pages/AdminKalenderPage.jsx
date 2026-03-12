import { useState, useRef, useEffect } from 'react';
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

const TIME_PX = 64;
const TIMER = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);
const COL_W = 120; // px bredde per person-kolonne

function getInitialer(navn) {
  return navn
    .split(' ')
    .map(d => d[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Farve per person baseret på indeks
const AVATAR_FARVER = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-pink-500', 'bg-lime-600', 'bg-sky-500',
];

export default function AdminKalenderPage() {
  const [mandag, setMandag]           = useState(() => getMandagForUge());
  const [valgtDagIdx, setValgtDagIdx] = useState(() => {
    const dag = new Date().getDay();
    // Hvis weekend, vis mandag. Ellers vis dagens index (man=0 ... fre=4)
    return dag === 0 || dag === 6 ? 0 : dag - 1;
  });
  const [valgtLektion, setValgtLektion] = useState(null);
  const [filterType, setFilterType]     = useState('alle'); // 'alle' | 'laerere' | 'vikarer'
  const [valgtPersonId, setValgtPersonId] = useState(null); // null = vis alle
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFejl, setActionFejl]       = useState('');
  const [vikarListe, setVikarListe]       = useState(null);
  const [henterVikarer, setHenterVikarer] = useState(false);

  const scrollRef = useRef(null);

  const { lektioner, fravaer, tildelinger, loading, error, refetch } = useKalender(mandag);
  const { data: alleLaerere } = useApi(laererService.getAll, []);
  const { data: alleVikarer } = useApi(vikarService.getAll, []);

  const ugedage   = getUgedage(mandag);
  const ugeNr     = getUgenummer(mandag);
  const valgtDag  = ugedage[valgtDagIdx];
  const idagStr   = new Date().toISOString().slice(0, 10);
  const valgtDagStr = valgtDag?.toISOString().slice(0, 10);

  // Byg personliste afhængigt af filter
  const personer = (() => {
    const l = (alleLaerere || []).map((p, i) => ({
      ...p, type: 'laerer', farve: AVATAR_FARVER[i % AVATAR_FARVER.length],
    }));
    const v = (alleVikarer || []).map((p, i) => ({
      ...p, type: 'vikar', farve: AVATAR_FARVER[(l.length + i) % AVATAR_FARVER.length],
    }));
    if (filterType === 'laerere') return l;
    if (filterType === 'vikarer') return v;
    return [...l, ...v];
  })();

  // Hvis én person er valgt, vis kun dem
  const visPersoner = valgtPersonId
    ? personer.filter(p => `${p.type}-${p.id}` === valgtPersonId)
    : personer;

  // Lektioner for valgt dag
  const dagLektioner = lektioner.filter(l => {
    const lDag = new Date(l.start_time).toISOString().slice(0, 10);
    return lDag === valgtDagStr;
  });

  // Fravær for valgt dag
  const dagFravaer = fravaer.filter(f =>
    f.start_date <= valgtDagStr && f.end_date >= valgtDagStr
  );

  function gaaTilUge(retning) {
    setMandag(prev => {
      const ny = new Date(prev);
      ny.setDate(ny.getDate() + retning * 7);
      return ny;
    });
  }

  function vælgPerson(nøgle) {
    setValgtPersonId(prev => prev === nøgle ? null : nøgle);
  }

  function aabneLektion(lektion) {
    const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
    setValgtLektion({ ...lektion, tildeling });
    setVikarListe(null);
    setActionFejl('');
  }

  async function hentLedigeVikarer(lektion) {
    setHenterVikarer(true);
    try {
      const start = new Date(lektion.start_time);
      const slut  = new Date(lektion.end_time);
      const fmt   = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      const vikarer = await vikarService.getLedige(
        start.toISOString().slice(0, 10), fmt(start), fmt(slut)
      );
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
      await tildelingService.tildel(valgtLektion.id, vikarId);
      refetch();
      setValgtLektion(null);
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function fjernTildeling() {
    setActionLoading(true);
    setActionFejl('');
    try {
      await tildelingService.fjern(valgtLektion.tildeling.id);
      refetch();
      setValgtLektion(null);
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner tekst="Henter kalender…" />;
  if (error)   return <ErrorMessage besked={error} />;

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Top toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">

        {/* Uge-nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMandag(getMandagForUge()); setValgtDagIdx(new Date().getDay() - 1); }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            I dag
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200 transition-colors">‹</button>
            <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 transition-colors">›</button>
          </div>
          <span className="text-sm font-semibold text-slate-800">Uge {ugeNr}</span>
        </div>

        {/* Dag-tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {ugedage.map((dag, i) => {
            const dagStr  = dag.toISOString().slice(0, 10);
            const erIDag  = dagStr === idagStr;
            const valgt   = i === valgtDagIdx;
            return (
              <button
                key={i}
                onClick={() => setValgtDagIdx(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  valgt
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="hidden sm:inline">{DAGE[i].slice(0, 3)} </span>
                <span className={erIDag ? 'text-blue-600 font-bold' : ''}>{formatDagLabel(dag)}</span>
              </button>
            );
          })}
        </div>

        {/* Person-filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[['alle', 'Alle'], ['laerere', 'Lærere'], ['vikarer', 'Vikarer']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setFilterType(val); setValgtPersonId(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Fravær-banner ───────────────────────────────────── */}
      {dagFravaer.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {dagFravaer.map(f => (
            <span key={f.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-600 border border-red-200">
              🤒 {f.laerer_navn} — {f.type}
            </span>
          ))}
        </div>
      )}

      {/* ── Hoved: tidslinje + person-kolonner ──────────────── */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Tidssøjle */}
        <div className="w-14 shrink-0 border-r border-slate-200 bg-white z-10">
          {/* Tom header */}
          <div className="h-16 border-b border-slate-200" />
          {TIMER.map(t => (
            <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1" style={{ height: TIME_PX }}>
              <span className="text-xs text-slate-300 tabular-nums">{t}:00</span>
            </div>
          ))}
        </div>

        {/* Person-kolonner (horisontal scroll) */}
        <div className="flex-1 overflow-x-auto overflow-y-auto" ref={scrollRef}>
          <div style={{ minWidth: visPersoner.length * COL_W }}>

            {/* Person-header-række */}
            <div className="flex sticky top-0 bg-white z-10 border-b border-slate-200">
              {visPersoner.map((person, idx) => {
                const nøgle      = `${person.type}-${person.id}`;
                const erValgt    = valgtPersonId === nøgle;
                const erFravaer  = person.type === 'laerer' && dagFravaer.some(f => f.teacher_id === person.id);
                return (
                  <button
                    key={nøgle}
                    onClick={() => vælgPerson(nøgle)}
                    style={{ minWidth: COL_W }}
                    className={`flex flex-col items-center py-3 px-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                      erValgt ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 ${person.farve} ${erFravaer ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
                      {getInitialer(person.name)}
                      {erFravaer && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className={`text-xs font-medium truncate max-w-full px-1 ${erValgt ? 'text-blue-700' : 'text-slate-600'}`}>
                      {getInitialer(person.name)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${
                      person.type === 'laerer' ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                      {person.type === 'laerer' ? 'L' : 'V'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Gitter med lektioner */}
            <div className="flex relative">
              {visPersoner.map((person, idx) => {
                const nøgle = `${person.type}-${person.id}`;

                // Find lektioner for denne person på valgt dag
                const personLektioner = dagLektioner.filter(l => {
                  if (person.type === 'laerer') return l.teacher_id === person.id;
                  if (person.type === 'vikar')  return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === person.id);
                  return false;
                });

                const erFravaer = person.type === 'laerer' && dagFravaer.some(f => f.teacher_id === person.id);

                return (
                  <div
                    key={nøgle}
                    className={`relative border-r border-slate-200 last:border-r-0 ${erFravaer ? 'bg-red-50/30' : ''}`}
                    style={{ minWidth: COL_W, height: TIMER.length * TIME_PX }}
                  >
                    {/* Timegitter */}
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100" style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {TIMER.map(t => (
                      <div key={`h${t}`} className="absolute w-full border-b border-slate-50" style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
                    ))}

                    {/* Lektioner */}
                    {personLektioner.map(lektion => {
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const farve     = statusFarve(lektion.status);
                      const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
                      return (
                        <button
                          key={lektion.id}
                          onClick={() => aabneLektion({ ...lektion, tildeling })}
                          className="absolute left-1 right-1 rounded-md px-1.5 py-1 text-left transition-all hover:shadow-md hover:brightness-95 z-10 overflow-hidden"
                          style={{
                            top: top + 1,
                            height: height - 2,
                            backgroundColor: farve.bg,
                            border: `1.5px solid ${farve.border}`,
                          }}
                        >
                          <p className="font-semibold text-xs leading-tight truncate" style={{ color: farve.text }}>
                            {lektion.subject}
                          </p>
                          <p className="text-xs opacity-60 truncate" style={{ color: farve.text }}>
                            {lektion.klasse_navn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Detalje-panel (højre side når lektion er valgt) ── */}
        {valgtLektion && (
          <div className="w-72 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
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

      {/* Person-tooltip ved hover — vises som overlay nederst */}
      {valgtPersonId && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>Filtreret: <strong className="text-slate-800">{visPersoner[0]?.name}</strong></span>
          <button onClick={() => setValgtPersonId(null)} className="text-blue-500 hover:text-blue-700 underline">Vis alle</button>
        </div>
      )}
    </div>
  );
}

/* ── Detalje-panel indhold ────────────────────────────────── */
function DetaljePanelIndhold({ lektion, vikarListe, henterVikarer, actionLoading, actionFejl, onLuk, onHentVikarer, onTildelVikar, onFjernTildeling }) {
  const start = new Date(lektion.start_time);
  const slut  = new Date(lektion.end_time);
  const fmt   = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const farve = statusFarve(lektion.status);

  const statusLabels = { normal: 'Normal', udækket: 'Uncovered', dækket: 'Covered' };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded text-xs font-semibold"
            style={{ backgroundColor: farve.bg, color: farve.text, border: `1px solid ${farve.border}` }}
          >
            {statusLabels[lektion.status] ?? lektion.status}
          </span>
        </div>
        <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
      </div>

      {/* Info-rækker */}
      <div className="px-4 py-4 space-y-3">
        <InfoRække label="Subject"  value={lektion.subject} />
        <InfoRække label="Class"    value={lektion.klasse_navn || '—'} bold />
        <InfoRække label="Time"     value={`${fmt(start)} - ${fmt(slut)}`} />
        <InfoRække label="Location" value={lektion.room || '—'} />
        <InfoRække label="Teacher"  value={lektion.laerer_navn || '—'} />
        {lektion.tildeling && (
          <InfoRække label="Vikar" value={lektion.tildeling.vikar_navn} />
        )}
      </div>

      {/* Handlinger */}
      <div className="px-4 pb-4 space-y-2">
        {actionFejl && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{actionFejl}</div>
        )}

        {lektion.status === 'udækket' && (
          !vikarListe ? (
            <button
              onClick={onHentVikarer}
              disabled={henterVikarer}
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {henterVikarer ? 'Henter…' : 'Find ledig vikar'}
            </button>
          ) : vikarListe.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Ingen ledige vikarer</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vælg vikar</p>
              {vikarListe.map(v => (
                <button
                  key={v.id}
                  onClick={() => onTildelVikar(v.id)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-sm transition-colors disabled:opacity-50"
                >
                  <span className="font-medium text-slate-800">{v.name}</span>
                  <span className="text-slate-400 text-xs">{v.email}</span>
                </button>
              ))}
            </div>
          )
        )}

        {lektion.status === 'dækket' && lektion.tildeling && (
          <button
            onClick={onFjernTildeling}
            disabled={actionLoading}
            className="w-full py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
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
      <span className={`text-sm text-right ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}