import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { vikarService } from '../api/vikarService';
import { tilgaengelighedService } from '../api/tilgaengelighedService';
import { useApi } from '../hooks/useApi';
import {
  getMandagForUge, getUgedage, getUgenummer, dagTilStreng,
  TIMER_START, TIMER_SLUT, DAGE,
} from '../utils/kalenderUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TIME_PX    = 64;
const TIME_COL_W = 48;
const HEADER_H   = 88;
const SNAP       = 15;
const HANDLE_PX  = 10;
const TIMER      = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

function snap(min)        { return Math.round(min / SNAP) * SNAP; }
function minToStr(min)    { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }
function strToMin(s)      { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function yToMin(y)        { return snap(clamp((y / TIME_PX) * 60 + TIMER_START * 60, TIMER_START * 60, TIMER_SLUT * 60)); }
function minToY(min)      { return ((min - TIMER_START * 60) / 60) * TIME_PX; }

let _uid = 0;
function uid() { return `local-${++_uid}`; }

export default function VikarTilgaengelighedPage() {
  const { bruger } = useAuth();
  const [mandag, setMandag]               = useState(() => getMandagForUge());
  const [lokale, setLokale]               = useState([]);
  const [aktivId, setAktivId]             = useState(null);
  const [kommentar, setKommentar]         = useState('');
  const [modalStartTime, setModalStartTime] = useState('');
  const [modalEndTime, setModalEndTime]     = useState('');
  const [gemLoading, setGemLoading]       = useState(false);
  const [clipboard, setClipboard]         = useState(null);
  const [hoverDagIdx, setHoverDagIdx]     = useState(null);
  const [draggingBlokId, setDraggingBlokId] = useState(null);

  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);
  const colRefs    = useRef({});
  const dragRef    = useRef(null);
  const stateRef   = useRef({});

  const { data: vikar } = useApi(vikarService.getMig, []);
  const { data: serverBlokke, loading, refetch } = useApi(
    () => tilgaengelighedService.getMin(),
    [vikar?.id]
  );

  const ugedage = getUgedage(mandag);
  const ugeNr   = getUgenummer(mandag);
  const idagStr = dagTilStreng(new Date());

  const serverOptaget = (serverBlokke || []).filter(b => b.status === 'optaget' && b.id !== draggingBlokId);
  const alleBlokke = [
    ...serverOptaget,
    ...lokale.filter(lokal =>
      !serverOptaget.some(s =>
        s.date === lokal.date &&
        s.start_time.slice(0, 5) === lokal.start_time.slice(0, 5)
      )
    ),
  ];

  // Keep stateRef current so keyboard handler never closes over stale values
  stateRef.current = { aktivId, clipboard, hoverDagIdx, alleBlokke, ugedage };

  useEffect(() => {
    if (!loading && yScrollRef.current)
      yScrollRef.current.scrollTop = (8 - TIMER_START) * TIME_PX - 16;
  }, [loading]);

  const handleYScroll = useCallback((e) => {
    if (syncing.current) return;
    syncing.current = true;
    if (timeColRef.current) timeColRef.current.scrollTop = e.currentTarget.scrollTop;
    syncing.current = false;
  }, []);

  // ── Keyboard: Ctrl+C / Ctrl+V ──────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const { aktivId, clipboard, hoverDagIdx, alleBlokke, ugedage } = stateRef.current;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const blok = aktivId ? alleBlokke.find(b => b.id === aktivId) : null;
        if (blok) setClipboard(blok);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!clipboard || hoverDagIdx === null) return;
        e.preventDefault();
        const dato   = dagTilStreng(ugedage[hoverDagIdx]);
        const cS     = strToMin(clipboard.start_time.slice(0, 5));
        const cE     = strToMin(clipboard.end_time.slice(0, 5));
        const overlap = alleBlokke
          .filter(b => b.date === dato)
          .some(b => {
            const bS = strToMin(b.start_time.slice(0, 5));
            const bE = strToMin(b.end_time.slice(0, 5));
            return cS < bE && cE > bS;
          });
        if (overlap) return;

        const nyBlok = {
          id: uid(),
          date: dato,
          start_time: clipboard.start_time.slice(0, 5),
          end_time:   clipboard.end_time.slice(0, 5),
          status:     'optaget',
          kommentar:  clipboard.kommentar || null,
          _local:     true,
        };
        setLokale(prev => [...prev, nyBlok]);
        gemNy(nyBlok);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // stateRef keeps values fresh — no deps needed

  function gaaTilUge(r) {
    setMandag(prev => { const d = new Date(prev); d.setDate(d.getDate() + r * 7); return d; });
    setAktivId(null);
  }

  function getY(e, dagIdx) {
    const col = colRefs.current[dagIdx];
    if (!col) return 0;
    return e.clientY - col.getBoundingClientRect().top;
  }

  function blokkeForDag(dagStr) {
    return alleBlokke.filter(b => b.date === dagStr);
  }

  // ── Opret ny blok ──────────────────────────────────────────
  async function gemNy(blok) {
    const fjernLokal = () => setLokale(prev => prev.filter(b => b.id !== blok.id));
    try {
      await tilgaengelighedService.saet({
        date:       blok.date,
        start_time: blok.start_time,
        end_time:   blok.end_time,
        status:     'optaget',
        kommentar:  blok.kommentar || null,
      });
      fjernLokal();
      await refetch();
    } catch (err) {
      console.error('Gem fejlede:', err.message);
      fjernLokal();
    }
  }

  // ── Flyt eksisterende blok (drag eller cross-day) ──────────
  async function flyt(gammelBlok, nyStartTime, nyEndTime, nyDate = null) {
    try {
      if (gammelBlok.id && !String(gammelBlok.id).startsWith('local-')) {
        await tilgaengelighedService.delete(gammelBlok.id);
      }
      await tilgaengelighedService.saet({
        date:       nyDate ?? gammelBlok.date,
        start_time: nyStartTime,
        end_time:   nyEndTime,
        status:     'optaget',
        kommentar:  gammelBlok.kommentar || null,
      });
      await refetch();
    } catch (err) {
      console.error('Flyt fejlede:', err.message);
      await refetch();
    }
  }

  async function slet(blok) {
    if (blok._local) {
      setLokale(prev => prev.filter(b => b.id !== blok.id));
      return;
    }
    try {
      await tilgaengelighedService.delete(blok.id);
      await refetch();
    } catch (err) {
      console.error(err);
    }
  }

  // ── Gem fra modal (tid + kommentar kan ændres) ─────────────
  async function gemBlokFraModal(blok) {
    const nyStart = modalStartTime;
    const nySlut  = modalEndTime;
    if (strToMin(nyStart) >= strToMin(nySlut)) return; // invalid range

    setGemLoading(true);
    setAktivId(null);
    try {
      if (blok.id && !String(blok.id).startsWith('local-')) {
        await tilgaengelighedService.delete(blok.id);
      }
      await tilgaengelighedService.saet({
        date:       blok.date,
        start_time: nyStart,
        end_time:   nySlut,
        status:     'optaget',
        kommentar:  kommentar || null,
      });
      await refetch();
    } catch (err) {
      console.error(err);
    }
    setGemLoading(false);
  }

  // ── Dobbeltklik → opret blok ───────────────────────────────
  function handleDblClick(e, dagIdx) {
    e.preventDefault();
    const y        = getY(e, dagIdx);
    const startMin = clamp(yToMin(y), TIMER_START * 60, TIMER_SLUT * 60 - 60);
    const slutMin  = startMin + 60;
    const dato     = dagTilStreng(ugedage[dagIdx]);

    const harOverlap = blokkeForDag(dato).some(b => {
      const bS = strToMin(b.start_time.slice(0, 5));
      const bE = strToMin(b.end_time.slice(0, 5));
      return startMin < bE && slutMin > bS;
    });
    if (harOverlap) return;

    const nyBlok = {
      id: uid(),
      date: dato,
      start_time: minToStr(startMin),
      end_time:   minToStr(slutMin),
      status:     'optaget',
      kommentar:  null,
      _local:     true,
    };
    setLokale(prev => [...prev, nyBlok]);
    gemNy(nyBlok);
  }

  // ── Mouse-down på blok → drag (inkl. cross-day) ───────────
  function handleBlokMouseDown(e, blok, dagIdx) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const y          = getY(e, dagIdx);
    const startMin   = strToMin(blok.start_time.slice(0, 5));
    const slutMin    = strToMin(blok.end_time.slice(0, 5));
    const blokTop    = minToY(startMin);
    const blokHeight = minToY(slutMin) - blokTop;
    const relY       = y - blokTop;

    let mode;
    if (e._blokMode)                         mode = e._blokMode;
    else if (relY <= HANDLE_PX)              mode = 'top';
    else if (relY >= blokHeight - HANDLE_PX) mode = 'bottom';
    else                                     mode = 'move';

    let curStart  = startMin;
    let curSlut   = slutMin;
    let curDagIdx = dagIdx;
    let startY    = y;
    let hasMoved  = false;
    dragRef.current = { curStart, curSlut, curDagIdx };

    document.body.style.cursor     = mode === 'move' ? 'grabbing' : 'ns-resize';
    document.body.style.userSelect = 'none';

    const dragId = uid();
    setDraggingBlokId(blok.id);
    setLokale(prev => [...prev, { ...blok, id: dragId, _local: true }]);

    function onMove(ev) {
      hasMoved = true;
      const dur = slutMin - startMin;

      // For move mode: track which column the mouse is over (cross-day)
      if (mode === 'move') {
        for (let j = 0; j < ugedage.length; j++) {
          const col = colRefs.current[j];
          if (col) {
            const rect = col.getBoundingClientRect();
            if (ev.clientX >= rect.left && ev.clientX <= rect.right) {
              curDagIdx = j;
              break;
            }
          }
        }
      }

      // Y delta always relative to original column (all columns share same top)
      const delta    = getY(ev, dagIdx) - startY;
      const deltaMin = snap(delta / TIME_PX * 60);

      if (mode === 'top') {
        curStart = clamp(snap(startMin + deltaMin), TIMER_START * 60, slutMin - SNAP);
        curSlut  = slutMin;
      } else if (mode === 'bottom') {
        curStart = startMin;
        curSlut  = clamp(snap(slutMin + deltaMin), startMin + SNAP, TIMER_SLUT * 60);
      } else {
        curStart = clamp(snap(startMin + deltaMin), TIMER_START * 60, TIMER_SLUT * 60 - dur);
        curSlut  = curStart + dur;
      }

      dragRef.current = { curStart, curSlut, curDagIdx };

      const newDate = dagTilStreng(ugedage[curDagIdx]);
      setLokale(prev => prev.map(b =>
        b.id === dragId
          ? { ...b, date: newDate, start_time: minToStr(curStart), end_time: minToStr(curSlut) }
          : b
      ));
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';

      const { curStart, curSlut, curDagIdx: finalDagIdx } = dragRef.current;
      dragRef.current = null;

      setLokale(prev => prev.filter(b => b.id !== dragId));
      setDraggingBlokId(null);

      if (hasMoved) {
        const nyDate = dagTilStreng(ugedage[finalDagIdx]);
        const harOverlap = stateRef.current.alleBlokke
          .filter(b => b.date === nyDate && b.id !== blok.id && !b._local)
          .some(b => {
            const bS = strToMin(b.start_time.slice(0, 5));
            const bE = strToMin(b.end_time.slice(0, 5));
            return curStart < bE && curSlut > bS;
          });
        if (harOverlap) { refetch(); return; }
        flyt(blok, minToStr(curStart), minToStr(curSlut), nyDate);
      } else {
        // Click without drag → open modal
        if (aktivId === blok.id) {
          setAktivId(null);
        } else {
          setAktivId(blok.id);
          setKommentar(blok.kommentar || '');
          setModalStartTime(blok.start_time.slice(0, 5));
          setModalEndTime(blok.end_time.slice(0, 5));
        }
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  if (loading) return <LoadingSpinner tekst="Henter tilgængelighed…" />;

  const aktivBlok = aktivId ? alleBlokke.find(b => b.id === aktivId) : null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setMandag(getMandagForUge())}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            I dag
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹</button>
            <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
          </div>
          <span className="text-sm font-semibold text-slate-800">Uge {ugeNr}</span>
        </div>
        <div className="flex items-center gap-3">
          {clipboard && (
            <span className="text-xs text-blue-500 font-medium">
              Kopieret {clipboard.start_time.slice(0,5)}–{clipboard.end_time.slice(0,5)} · Ctrl+V for at indsætte
            </span>
          )}
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
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
            style={{ height: HEADER_H }}>
            {ugedage.map((dag, i) => {
              const erIdag = dagTilStreng(dag) === idagStr;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 py-2">
                  <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : 'text-slate-500'}`}>{DAGE[i]}</p>
                  <p className={`text-2xl font-bold leading-tight ${erIdag ? 'text-blue-600' : 'text-slate-800'}`}>{dag.getDate()}</p>
                  <p className="text-xs text-slate-400 capitalize">{dag.toLocaleDateString('da-DK', { month: 'long' })}</p>
                </div>
              );
            })}
          </div>

          <div ref={yScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleYScroll}>
            <div className="flex flex-1" style={{ height: TIMER.length * TIME_PX }}>
              {ugedage.map((dag, i) => {
                const dagStr    = dagTilStreng(dag);
                const erIdag    = dagStr === idagStr;
                const erHover   = hoverDagIdx === i;
                const dagBlokke = blokkeForDag(dagStr);

                return (
                  <div key={i}
                    ref={el => colRefs.current[i] = el}
                    className={`flex-1 relative border-r border-slate-200 last:border-r-0 select-none cursor-default transition-colors ${
                      erIdag ? 'bg-blue-50/20' : erHover && clipboard ? 'bg-blue-50/30' : ''
                    }`}
                    style={{ height: TIMER.length * TIME_PX }}
                    onDoubleClick={e => handleDblClick(e, i)}
                    onMouseEnter={() => setHoverDagIdx(i)}
                    onMouseLeave={() => setHoverDagIdx(null)}
                  >
                    {TIMER.map(t => (
                      <div key={t} className="absolute w-full border-b border-slate-100"
                        style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }} />
                    ))}
                    {TIMER.map(t => (
                      <div key={`h${t}`} className="absolute w-full border-b border-slate-50"
                        style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }} />
                    ))}

                    {dagBlokke.map(blok => {
                      const sMin   = strToMin(blok.start_time.slice(0, 5));
                      const eMin   = strToMin(blok.end_time.slice(0, 5));
                      const top    = minToY(sMin);
                      const height = Math.max(minToY(eMin) - top, 24);

                      return (
                        <BlokKomponent
                          key={blok.id}
                          blok={blok}
                          top={top}
                          height={height}
                          erAktiv={aktivId === blok.id}
                          sMin={sMin}
                          eMin={eMin}
                          handlePx={HANDLE_PX}
                          onMouseDown={e => handleBlokMouseDown(e, blok, i)}
                          onSlet={e => { e.stopPropagation(); slet(blok); }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Blok-modal (klik på blok) */}
      {aktivBlok && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setAktivId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Utilgængelighed</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {aktivBlok.date}
                </p>
              </div>
              <button onClick={() => setAktivId(null)} className="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Tidsramme */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Fra</label>
                  <input
                    type="time"
                    value={modalStartTime}
                    onChange={e => setModalStartTime(e.target.value)}
                    step={SNAP * 60}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Til</label>
                  <input
                    type="time"
                    value={modalEndTime}
                    onChange={e => setModalEndTime(e.target.value)}
                    step={SNAP * 60}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {modalStartTime >= modalEndTime && (
                <p className="text-xs text-red-500">Sluttid skal være efter starttid</p>
              )}

              {/* Kommentar */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Kommentar (valgfri)</label>
                <input
                  autoFocus
                  type="text"
                  value={kommentar}
                  onChange={e => setKommentar(e.target.value)}
                  placeholder="F.eks. lægetid, kursus…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') gemBlokFraModal(aktivBlok);
                    if (e.key === 'Escape') setAktivId(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { slet(aktivBlok); setAktivId(null); }}
                  className="py-2 px-3 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Slet
                </button>
                <button onClick={() => setAktivId(null)}
                  className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  Annuller
                </button>
                <button
                  onClick={() => gemBlokFraModal(aktivBlok)}
                  disabled={gemLoading || modalStartTime >= modalEndTime}
                  className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {gemLoading ? 'Gemmer…' : 'Gem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BlokKomponent — én utilgængeligheds-blok i kalenderen.
 */
function BlokKomponent({ blok, top, height, erAktiv, sMin, eMin, handlePx, onMouseDown, onSlet }) {
  const ref = React.useRef(null);
  const [cursor, setCursor] = React.useState('grab');

  function getMode(e) {
    if (!ref.current) return 'move';
    const rect = ref.current.getBoundingClientRect();
    const relY  = e.clientY - rect.top;
    if (relY <= handlePx)               return 'top';
    if (relY >= rect.height - handlePx) return 'bottom';
    return 'move';
  }

  function handleMouseMove(e) {
    const mode = getMode(e);
    if (mode === 'top')         setCursor('n-resize');
    else if (mode === 'bottom') setCursor('s-resize');
    else                        setCursor('grab');
  }

  function handleMouseDown(e) {
    e._blokMode = getMode(e);
    onMouseDown(e);
  }

  return (
    <div
      ref={ref}
      className="absolute left-1 right-1 rounded-lg overflow-hidden group z-20 select-none"
      style={{
        top: top + 1,
        height: height - 2,
        backgroundColor: 'rgba(239,68,68,0.13)',
        border: `1.5px solid ${erAktiv ? '#EF4444' : '#FCA5A5'}`,
        boxShadow: erAktiv ? '0 0 0 2px rgba(239,68,68,0.2)' : undefined,
        cursor,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursor('grab')}
      onMouseDown={handleMouseDown}
    >
      <div className="px-2 pt-1 pb-2 pointer-events-none">
        <p className="text-xs font-semibold text-red-600 leading-tight">Utilgængelig</p>
        {height > 32 && (
          <p className="text-xs text-red-400">{minToStr(sMin)} – {minToStr(eMin)}</p>
        )}
        {height > 48 && blok.kommentar && (
          <p className="text-xs text-red-400 italic truncate">{blok.kommentar}</p>
        )}
      </div>

      <button
        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
        style={{ fontSize: '10px', lineHeight: 1, cursor: 'pointer' }}
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
        onClick={onSlet}
      >
        ×
      </button>

      <div className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex justify-center"
        style={{ height: handlePx, background: 'linear-gradient(to bottom, rgba(239,68,68,0.25), transparent)' }}>
        <div className="w-8 h-0.5 rounded-full bg-red-400 mt-1" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end justify-center"
        style={{ height: handlePx, background: 'linear-gradient(to top, rgba(239,68,68,0.25), transparent)' }}>
        <div className="w-8 h-0.5 rounded-full bg-red-400 mb-1" />
      </div>
    </div>
  );
}
