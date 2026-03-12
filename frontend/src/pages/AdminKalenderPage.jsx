import { useState, useRef, useEffect } from 'react';
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
import { tildelingService } from '../api/tildelingService';
import { vikarService } from '../api/vikarService';
import { laererService } from '../api/laererService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const TIME_PX = 72;
const TIMER = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

export default function AdminKalenderPage() {
  const [mandag, setMandag] = useState(() => getMandagForUge());
  const [valgtLektion, setValgtLektion] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFejl, setActionFejl] = useState('');

  // Søgestate
  const [soegeTekst, setSoegeTekst]         = useState('');
  const [soegeResultater, setSoegeResultater] = useState([]);
  const [soegeLoading, setSoegeLoading]       = useState(false);
  const [aktivFilter, setAktivFilter]         = useState(null); // { type, id, navn }
  const [visDropdown, setVisDropdown]         = useState(false);
  const soegeRef    = useRef(null);
  const soegeTimer  = useRef(null);

  const { lektioner, fravaer, tildelinger, loading, error, refetch } = useKalender(mandag);

  const ugedage = getUgedage(mandag);
  const fredag  = ugedage[4];
  const ugeNr   = getUgenummer(mandag);
  const idag    = new Date().toISOString().slice(0, 10);

  // Filtrer lektioner ved aktivt filter
  const filtreredeLektioner = aktivFilter
    ? lektioner.filter(l => {
        if (aktivFilter.type === 'laerer') return l.teacher_id === aktivFilter.id;
        if (aktivFilter.type === 'vikar')  return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === aktivFilter.id);
        return true;
      })
    : lektioner;

  async function soeg(tekst) {
    setSoegeLoading(true);
    try {
      const [laerere, vikarer] = await Promise.all([
        laererService.getAll(),
        vikarService.getAll(),
      ]);
      const t = tekst.toLowerCase();
      const resultater = [
        ...laerere.filter(l => l.name.toLowerCase().includes(t)).map(l => ({ type: 'laerer', id: l.id, navn: l.name, detalje: l.status })),
        ...vikarer.filter(v => v.name.toLowerCase().includes(t)).map(v => ({ type: 'vikar',  id: v.id, navn: v.name, detalje: v.email  })),
      ];
      setSoegeResultater(resultater);
      setVisDropdown(true);
    } catch {
      setSoegeResultater([]);
    } finally {
      setSoegeLoading(false);
    }
  }

  function handleInput(e) {
    const tekst = e.target.value;
    setSoegeTekst(tekst);
    clearTimeout(soegeTimer.current);
    if (!tekst.trim()) { setSoegeResultater([]); setVisDropdown(false); return; }
    soegeTimer.current = setTimeout(() => soeg(tekst), 250);
  }

  function vælgFilter(r) {
    setAktivFilter(r);
    setSoegeTekst(r.navn);
    setVisDropdown(false);
  }

  function nulstilFilter() {
    setAktivFilter(null);
    setSoegeTekst('');
    setSoegeResultater([]);
    setVisDropdown(false);
  }

  useEffect(() => {
    function lukDropdown(e) {
      if (soegeRef.current && !soegeRef.current.contains(e.target)) setVisDropdown(false);
    }
    document.addEventListener('mousedown', lukDropdown);
    return () => document.removeEventListener('mousedown', lukDropdown);
  }, []);

  function gaaTilUge(retning) {
    setMandag(prev => {
      const ny = new Date(prev);
      ny.setDate(ny.getDate() + retning * 7);
      return ny;
    });
  }

  function aabneLektion(lektion) {
    const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
    setValgtLektion({ ...lektion, tildeling });
    setActionFejl('');
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">
              Uge {ugeNr}
              {aktivFilter && <span className="ml-2 text-sm font-normal text-blue-600">— {aktivFilter.navn}</span>}
            </h1>
            <p className="text-xs text-slate-400">{formatUgeLabel(mandag, fredag)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMandag(getMandagForUge())} className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              I dag
            </button>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-500 border-r border-slate-200 text-sm transition-colors">‹</button>
              <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-500 text-sm transition-colors">›</button>
            </div>
          </div>
        </div>

        {/* Søgefelt */}
        <div className="relative w-full sm:w-72" ref={soegeRef}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={soegeTekst}
            onChange={handleInput}
            onFocus={() => soegeResultater.length > 0 && setVisDropdown(true)}
            placeholder="Søg lærer eller vikar…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {aktivFilter && (
            <button onClick={nulstilFilter} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          )}

          {visDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
              {soegeLoading ? (
                <p className="px-4 py-3 text-sm text-slate-400">Søger…</p>
              ) : soegeResultater.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">Ingen resultater</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {soegeResultater.map((r, i) => (
                    <button key={i} onClick={() => vælgFilter(r)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${r.type === 'laerer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {r.type === 'laerer' ? 'Lærer' : 'Vikar'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.navn}</p>
                        <p className="text-xs text-slate-400 truncate capitalize">{r.detalje}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter-banner */}
      {aktivFilter && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-700">
            Viser skema for <strong>{aktivFilter.navn}</strong> ({aktivFilter.type === 'laerer' ? 'lærer' : 'vikar'})
          </span>
          <button onClick={nulstilFilter} className="ml-auto text-blue-500 hover:text-blue-700 text-xs underline">Vis alle</button>
        </div>
      )}

      {error && <ErrorMessage besked={error} />}

      {loading ? <LoadingSpinner tekst="Henter kalender…" /> : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Dag-headers */}
          <div className="grid border-b border-slate-200 sticky top-0 bg-white z-20" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
            <div className="border-r border-slate-200" />
            {ugedage.map((dag, i) => {
              const dagStr     = dag.toISOString().slice(0, 10);
              const erIDag     = dagStr === idag;
              const fravaerIDag = fravaerForDag(fravaer, dag);
              return (
                <div key={i} className={`px-3 py-2.5 border-r border-slate-200 last:border-r-0 ${erIDag ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{DAGE[i].slice(0, 3)}</span>
                    <span className={`text-sm font-semibold ${erIDag ? 'text-blue-600' : 'text-slate-800'}`}>{formatDagLabel(dag)}</span>
                    {erIDag && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                  {fravaerIDag.map(f => (
                    <div key={f.id} className="mt-1 px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-500 border border-red-100 truncate">
                      🤒 {f.laerer_navn}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Tidsgitter */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
              <div className="border-r border-slate-200">
                {TIMER.map(t => (
                  <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1" style={{ height: TIME_PX }}>
                    <span className="text-xs text-slate-300 tabular-nums">{t}:00</span>
                  </div>
                ))}
              </div>

              {ugedage.map((dag, dagIdx) => {
                const erIDag  = dag.toISOString().slice(0, 10) === idag;
                const dagLekt = lektionerForDag(filtreredeLektioner, dag);
                return (
                  <div key={dagIdx} className={`relative border-r border-slate-200 last:border-r-0 ${erIDag ? 'bg-blue-50/20' : ''}`} style={{ height: TIMER.length * TIME_PX }}>
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100" style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {TIMER.map(t => (
                      <div key={`h${t}`} className="absolute w-full border-b border-slate-50" style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
                    ))}
                    {dagLekt.map(lektion => {
                      const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
                      const farve     = statusFarve(lektion.status);
                      const tildeling = tildelinger.find(t => t.lesson_id === lektion.id);
                      return (
                        <button
                          key={lektion.id}
                          onClick={() => aabneLektion(lektion)}
                          className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left transition-all hover:shadow-md hover:brightness-95 z-10 overflow-hidden"
                          style={{ top: top + 2, height: height - 4, backgroundColor: farve.bg, border: `1.5px solid ${farve.border}` }}
                        >
                          <p className="font-medium text-xs leading-tight truncate" style={{ color: farve.text }}>{lektion.subject}</p>
                          <p className="text-xs opacity-60 truncate" style={{ color: farve.text }}>{lektion.klasse_navn} · {lektion.laerer_navn}</p>
                          {tildeling && <p className="text-xs opacity-50 truncate" style={{ color: farve.text }}>👤 {tildeling.vikar_navn}</p>}
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

      {valgtLektion && (
        <LektionModal
          lektion={valgtLektion}
          onLuk={() => { setValgtLektion(null); setActionFejl(''); }}
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

/* ── LektionModal ─────────────────────────────────────────── */
function LektionModal({ lektion, onLuk, onRefetch, actionLoading, setActionLoading, actionFejl, setActionFejl }) {
  const [vikarListe,    setVikarListe]    = useState(null);
  const [henterVikarer, setHenterVikarer] = useState(false);

  const start       = new Date(lektion.start_time);
  const slut        = new Date(lektion.end_time);
  const tidsformat  = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const datoformat  = d => d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

  async function hentLedigeVikarer() {
    setHenterVikarer(true);
    try {
      const vikarer = await vikarService.getLedige(
        start.toISOString().slice(0, 10),
        tidsformat(start),
        tidsformat(slut),
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
      await tildelingService.tildel(lektion.id, vikarId);
      onRefetch(); onLuk();
    } catch (err) {
      setActionFejl(err.message);
      setActionLoading(false);
    }
  }

  async function fjernTildeling() {
    setActionLoading(true);
    setActionFejl('');
    try {
      await tildelingService.fjern(lektion.tildeling.id);
      onRefetch(); onLuk();
    } catch (err) {
      setActionFejl(err.message);
      setActionLoading(false);
    }
  }

  const farve = statusFarve(lektion.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onLuk} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: farve.border }} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{lektion.subject}</h2>
              <p className="text-sm text-slate-400 mt-0.5 capitalize">{datoformat(start)}</p>
            </div>
            <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-2xl leading-none ml-4">×</button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoBoks label="Tid"    value={`${tidsformat(start)} – ${tidsformat(slut)}`} />
            <InfoBoks label="Klasse" value={lektion.klasse_navn || '—'} />
            <InfoBoks label="Lærer"  value={lektion.laerer_navn || '—'} />
            <InfoBoks label="Lokale" value={lektion.room || '—'} />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: farve.bg, borderColor: farve.border, color: farve.text }}>
              {lektion.status}
            </span>
            {lektion.tildeling && (
              <span className="text-sm text-slate-500">Vikar: <strong className="text-slate-800">{lektion.tildeling.vikar_navn}</strong></span>
            )}
          </div>

          {actionFejl && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{actionFejl}</div>
          )}

          <div className="flex flex-col gap-2">
            {lektion.status === 'udækket' && (
              !vikarListe ? (
                <button onClick={hentLedigeVikarer} disabled={henterVikarer} className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {henterVikarer ? 'Henter vikarer…' : 'Find ledig vikar'}
                </button>
              ) : vikarListe.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Ingen ledige vikarer i dette tidsrum</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Vælg vikar</p>
                  {vikarListe.map(v => (
                    <button key={v.id} onClick={() => tildelVikar(v.id)} disabled={actionLoading} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-sm transition-colors disabled:opacity-50">
                      <span className="font-medium text-slate-800">{v.name}</span>
                      <span className="text-slate-400 text-xs">{v.email}</span>
                    </button>
                  ))}
                </div>
              )
            )}
            {lektion.status === 'dækket' && lektion.tildeling && (
              <button onClick={fjernTildeling} disabled={actionLoading} className="w-full py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
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