import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { vikarService } from '../api/vikarService';
import { tilgaengelighedService } from '../api/tilgaengelighedService';
import { useApi } from '../hooks/useApi';
import {
  getMandagForUge,
  getUgedage,
  getUgenummer,
  dagTilStreng,
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

// Snap til nærmeste 15 min
function snapMinutter(minutter) {
  return Math.round(minutter / 15) * 15;
}

function minutterTilStreng(minutter) {
  const t = Math.floor(minutter / 60);
  const m = minutter % 60;
  return `${String(t).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function yTilMinutter(y, timePx) {
  const totalMinutter = (y / timePx) * 60;
  return snapMinutter(Math.max(0, totalMinutter));
}

export default function VikarTilgaengelighedPage() {
  const { bruger } = useAuth();
  const [mandag, setMandag] = useState(() => getMandagForUge());

  // Ny blok trækkes
  const [trekker, setTrekker]   = useState(null); // { dagIdx, startMin, slutMin }
  // Modal til bekræftelse/kommentar
  const [nyBlok, setNyBlok]     = useState(null); // { dato, startTid, slutTid }
  const [kommentar, setKommentar] = useState('');
  const [gemLoading, setGemLoading] = useState(false);
  const [fejl, setFejl]         = useState('');
  // Slet-bekræftelse
  const [sletId, setSletId]     = useState(null);

  const yScrollRef  = useRef(null);
  const timeColRef  = useRef(null);
  const syncing     = useRef(false);
  const dragRef     = useRef(null);

  const { data: vikar } = useApi(
    () => vikarService.getAll().then(alle => alle.find(v => v.email === bruger?.email)),
    [bruger?.email]
  );

  const { data: tilgaengelighed, loading, error, refetch } = useApi(
    () => vikar ? tilgaengelighedService.getMin() : Promise.resolve([]),
    [vikar?.id]
  );

  const ugedage = getUgedage(mandag);
  const ugeNr   = getUgenummer(mandag);
  const idagStr = dagTilStreng(new Date());

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

  // ── Drag for at oprette utilgængelighed ──────────────────
  function getYFraEvent(e, kolonne) {
    const rect = kolonne.getBoundingClientRect();
    const scrollTop = yScrollRef.current?.scrollTop || 0;
    return e.clientY - rect.top + scrollTop;
  }

  function startDrag(e, dagIdx) {
    if (e.button !== 0) return;
    e.preventDefault();
    const kolonne = e.currentTarget;
    const y = getYFraEvent(e, kolonne);
    const startMin = yTilMinutter(y, TIME_PX) + TIMER_START * 60;
    dragRef.current = { dagIdx, kolonne, startMin, slutMin: startMin + 60 };
    setTrekker({ dagIdx, startMin, slutMin: startMin + 60 });

    function onMove(ev) {
      const y2 = getYFraEvent(ev, kolonne);
      const slutMin = yTilMinutter(y2, TIME_PX) + TIMER_START * 60;
      const maxMin = TIMER_SLUT * 60;
      const clampedSlut = Math.min(Math.max(slutMin, dragRef.current.startMin + 15), maxMin);
      dragRef.current.slutMin = clampedSlut;
      setTrekker(prev => ({ ...prev, slutMin: clampedSlut }));
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const { dagIdx, startMin, slutMin } = dragRef.current;
      dragRef.current = null;
      setTrekker(null);
      if (slutMin - startMin >= 15) {
        const dag = ugedage[dagIdx];
        setNyBlok({
          dato: dagTilStreng(dag),
          startTid: minutterTilStreng(startMin),
          slutTid:  minutterTilStreng(slutMin),
        });
        setKommentar('');
        setFejl('');
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function gemUtilgaengelighed() {
    if (!nyBlok) return;
    setGemLoading(true);
    setFejl('');
    try {
      await tilgaengelighedService.saet({
        date:       nyBlok.dato,
        start_time: nyBlok.startTid,
        end_time:   nyBlok.slutTid,
        status:     'optaget',
        kommentar,
      });
      setNyBlok(null);
      await refetch();
    } catch (err) {
      setFejl(err.message);
    } finally {
      setGemLoading(false);
    }
  }

  async function sletTilgaengelighed(id) {
    try {
      await tilgaengelighedService.delete(id);
      setSletId(null);
      await refetch();
    } catch (err) {
      setFejl(err.message);
    }
  }

  // ── Beregn blok-position ─────────────────────────────────
  function blokPosition(startTid, slutTid) {
    const [sh, sm] = startTid.split(':').map(Number);
    const [eh, em] = slutTid.split(':').map(Number);
    const startMin = (sh - TIMER_START) * 60 + sm;
    const slutMin  = (eh - TIMER_START) * 60 + em;
    return {
      top:    (startMin / 60) * TIME_PX,
      height: Math.max(((slutMin - startMin) / 60) * TIME_PX, 20),
    };
  }

  if (loading) return <LoadingSpinner tekst="Henter tilgængelighed…" />;
  if (error)   return <ErrorMessage besked={error} />;

  const totalGridW = ugedage.length * COL_W;

  return (
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

        <p className="text-xs text-slate-400">
          Klik og træk på en dag for at markere utilgængelighed
        </p>
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
              const erFortid = dagStr < idagStr;
              return (
                <div key={i} style={{ width: COL_W, minWidth: COL_W }}
                  className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0">
                  <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : erFortid ? 'text-slate-300' : 'text-slate-500'}`}>
                    {DAGE[i].slice(0, 3)}
                  </p>
                  <p className={`text-2xl font-bold leading-tight ${erIdag ? 'text-blue-600' : erFortid ? 'text-slate-300' : 'text-slate-800'}`}>
                    {dag.getDate()}
                  </p>
                  <p className={`text-xs ${erFortid ? 'text-slate-300' : 'text-slate-400'}`}>
                    {dag.toLocaleDateString('da-DK', { month: 'short' })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Gitter */}
          <div ref={yScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleYScroll} style={{ width: totalGridW }}>
            <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
              {ugedage.map((dag, i) => {
                const dagStr  = dagTilStreng(dag);
                const erIdag  = dagStr === idagStr;
                const erFortid = dagStr < idagStr;

                // Utilgængeligheds-blokke for denne dag
                const dagBlokke = (tilgaengelighed || []).filter(t =>
                  t.date === dagStr && t.status === 'optaget'
                );

                // Drag-preview for denne kolonne
                const erDragKolonne = trekker?.dagIdx === i;
                const dragTop    = erDragKolonne ? ((trekker.startMin - TIMER_START * 60) / 60) * TIME_PX : 0;
                const dragHeight = erDragKolonne ? ((trekker.slutMin  - trekker.startMin) / 60) * TIME_PX : 0;

                return (
                  <div key={i}
                    className={`relative border-r border-slate-200 last:border-r-0 shrink-0 select-none
                      ${erIdag ? 'bg-blue-50/20' : ''}
                      ${erFortid ? 'bg-slate-50/50' : ''}
                      ${!erFortid ? 'cursor-crosshair' : 'cursor-default'}
                    `}
                    style={{ width: COL_W, height: TIMER.length * TIME_PX }}
                    onMouseDown={erFortid ? undefined : (e) => startDrag(e, i)}
                  >
                    {/* Grid-linjer */}
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100"
                        style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {TIMER.map(t => (
                      <div key={`h${t}`} className="absolute w-full border-b border-slate-50"
                        style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
                    ))}

                    {/* Drag-preview */}
                    {erDragKolonne && dragHeight > 0 && (
                      <div className="absolute left-1 right-1 rounded-lg z-10 pointer-events-none"
                        style={{
                          top: dragTop,
                          height: dragHeight,
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          border: '2px dashed #EF4444',
                        }}>
                        <p className="text-xs text-red-500 font-medium px-2 pt-1">
                          {minutterTilStreng(trekker.startMin)} – {minutterTilStreng(trekker.slutMin)}
                        </p>
                      </div>
                    )}

                    {/* Utilgængeligheds-blokke */}
                    {dagBlokke.map(blok => {
                      const { top, height } = blokPosition(
                        blok.start_time.slice(0, 5),
                        blok.end_time.slice(0, 5)
                      );
                      return (
                        <button key={blok.id}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => setSletId(blok.id)}
                          className="absolute left-1 right-1 rounded-lg z-20 text-left px-2 py-1 group transition-all hover:brightness-95"
                          style={{
                            top: top + 1,
                            height: height - 2,
                            backgroundColor: 'rgba(239,68,68,0.12)',
                            border: '1.5px solid #FECACA',
                          }}>
                          <p className="text-xs font-semibold text-red-600 truncate leading-tight">
                            Utilgængelig
                          </p>
                          {height > 36 && blok.kommentar && (
                            <p className="text-xs text-red-400 truncate">{blok.kommentar}</p>
                          )}
                          {height > 28 && (
                            <p className="text-xs text-red-300">
                              {blok.start_time.slice(0, 5)} – {blok.end_time.slice(0, 5)}
                            </p>
                          )}
                          <span className="absolute top-1 right-1.5 text-red-300 opacity-0 group-hover:opacity-100 text-xs transition-opacity">✕</span>
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

      {/* ── Ny utilgængelighed modal ── */}
      {nyBlok && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setNyBlok(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Tilføj utilgængelighed</h2>
              <button onClick={() => setNyBlok(null)} className="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Dato og tid — læs-only visning */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Dato</span>
                  <span className="font-medium text-slate-800">
                    {new Date(nyBlok.dato).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tidspunkt</span>
                  <span className="font-medium text-slate-800">{nyBlok.startTid} – {nyBlok.slutTid}</span>
                </div>
              </div>

              {/* Juster tider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fra</label>
                  <input type="time" value={nyBlok.startTid}
                    onChange={e => setNyBlok(prev => ({ ...prev, startTid: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Til</label>
                  <input type="time" value={nyBlok.slutTid}
                    onChange={e => setNyBlok(prev => ({ ...prev, slutTid: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>

              {/* Kommentar */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Kommentar (valgfri)</label>
                <input
                  type="text"
                  value={kommentar}
                  onChange={e => setKommentar(e.target.value)}
                  placeholder="F.eks. lægetid, kursus…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && gemUtilgaengelighed()}
                />
              </div>

              {fejl && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {fejl}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setNyBlok(null)}
                  className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  Annuller
                </button>
                <button onClick={gemUtilgaengelighed} disabled={gemLoading}
                  className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {gemLoading ? 'Gemmer…' : 'Gem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Slet bekræftelse ── */}
      {sletId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setSletId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 border border-slate-100">
            <p className="text-sm font-medium text-slate-900 mb-1">Fjern utilgængelighed?</p>
            <p className="text-xs text-slate-400 mb-5">Blokken slettes og du vil fremstå som ledig i dette tidsrum.</p>
            <div className="flex gap-2">
              <button onClick={() => setSletId(null)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                Behold
              </button>
              <button onClick={() => sletTilgaengelighed(sletId)}
                className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors">
                Fjern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}