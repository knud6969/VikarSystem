/**
 * DagOversigt — read-only calendar used on vikar and laerer pages.
 * Supports 4 modes: person day, person week, class day, class week.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { lektionService } from '../../api/lektionService';
import { tildelingService } from '../../api/tildelingService';
import { laererService } from '../../api/laererService';
import { vikarService } from '../../api/vikarService';
import { klasserService } from '../../api/klasserService';
import { useApi } from '../../hooks/useApi';
import BeskedModal from '../beskeder/BeskedModal';
import LoadingSpinner from '../common/LoadingSpinner';
import KontaktTooltip from '../common/KontaktTooltip';
import PersonKontaktModal from '../common/PersonKontaktModal';
import {
  getMandagForUge, getUgedage, getUgenummer,
  beregnPosition, dagTilStreng, formatDagLabel,
  statusFarve, TIMER_START, TIMER_SLUT, DAGE,
} from '../../utils/kalenderUtils';

const TIME_PX    = 64;
const COL_W      = 140;
const UGE_COL_W  = 200;
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
  const { bruger } = useAuth();

  const [mandag,      setMandag]      = useState(() => getMandagForUge());
  const [valgtDagIdx, setValgtDagIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 0 : d - 1;
  });
  const [valgtLektion,    setValgtLektion]    = useState(null);
  const [beskedLektion,   setBeskedLektion]   = useState(null);
  const [ugePerson,       setUgePerson]       = useState(null);
  const [ugeKlasse,       setUgeKlasse]       = useState(null);
  const [aktivPersonModal, setAktivPersonModal] = useState(null);

  const xScrollRef = useRef(null);
  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  const [lektioner,   setLektioner]   = useState([]);
  const [tildelinger, setTildelinger] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const { data: alleLaerere } = useApi(laererService.getAll, []);
  const { data: alleVikarer } = useApi(vikarService.getAll, []);
  const { data: alleKlasser } = useApi(klasserService.getAll, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([lektionService.getAll(), tildelingService.getAll()])
      .then(([l, t]) => { setLektioner(l || []); setTildelinger(t || []); })
      .catch(() => { setLektioner([]); setTildelinger([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUgePerson(null); setUgeKlasse(null); setValgtLektion(null);
  }, [filter]);

  useEffect(() => { setValgtLektion(null); }, [valgtDagIdx, mandag]);

  useEffect(() => {
    if (!loading && yScrollRef.current)
      yScrollRef.current.scrollTop = (ARBEJDS_START - TIMER_START) * TIME_PX - 16;
  }, [loading, valgtDagIdx, mandag, ugePerson, ugeKlasse]);

  const handleYScroll = useCallback((e) => {
    if (syncing.current) return;
    syncing.current = true;
    if (timeColRef.current) timeColRef.current.scrollTop = e.currentTarget.scrollTop;
    syncing.current = false;
  }, []);

  function gaaTilUge(r) {
    setMandag(prev => { const d = new Date(prev); d.setDate(d.getDate() + r * 7); return d; });
    setValgtDagIdx(0);
    setValgtLektion(null);
  }

  // Mode flags
  const erKlasseFilter = filter === 'klasser';
  const erPersonUge    = ugePerson !== null;
  const erKlasseUge    = ugeKlasse !== null;
  const erUgeMode      = erPersonUge || erKlasseUge;

  // Current user's id in laerere/vikarer table
  const minLaererId = bruger?.rolle === 'laerer'
    ? (alleLaerere || []).find(l => l.user_id === bruger.id)?.id ?? null
    : null;
  const minVikarId = bruger?.rolle === 'vikar'
    ? (alleVikarer || []).find(v => v.user_id === bruger.id)?.id ?? null
    : null;

  function erInvolveret(lektion, tildeling) {
    if (bruger?.rolle === 'admin') return true;
    if (bruger?.rolle === 'laerer') return lektion.teacher_id === minLaererId;
    if (bruger?.rolle === 'vikar')  return tildeling?.substitute_id === minVikarId;
    return false;
  }

  // Build persons list for person-day view
  const personer = (() => {
    if (erKlasseFilter) return [];
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

  // Build grid columns based on mode
  const gitterKolonner = (() => {
    if (erPersonUge) {
      return ugedage.map((dag, i) => {
        const dagStr = dagTilStreng(dag);
        const dagLektioner = lektioner.filter(l => {
          if (dagTilStreng(new Date(l.start_time)) !== dagStr) return false;
          if (ugePerson.type === 'laerer') return l.teacher_id === ugePerson.id;
          return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === ugePerson.id);
        });
        return { key: `dag-${i}`, lektioner: dagLektioner, dag, dagStr };
      });
    }
    if (erKlasseUge) {
      return ugedage.map((dag, i) => {
        const dagStr = dagTilStreng(dag);
        const dagLektioner = lektioner.filter(l =>
          l.class_id === ugeKlasse.id && dagTilStreng(new Date(l.start_time)) === dagStr
        );
        return { key: `dag-${i}`, lektioner: dagLektioner, dag, dagStr };
      });
    }
    if (erKlasseFilter) {
      return (alleKlasser || []).map(klasse => {
        const dagLektioner = lektioner.filter(l =>
          l.class_id === klasse.id && dagTilStreng(new Date(l.start_time)) === valgtDagStr
        );
        return { key: `klasse-${klasse.id}`, klasse, lektioner: dagLektioner };
      });
    }
    // Person day view
    return personer.map(person => {
      const dagLektioner = lektioner.filter(l => {
        if (dagTilStreng(new Date(l.start_time)) !== valgtDagStr) return false;
        if (person.type === 'laerer') return l.teacher_id === person.id;
        return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === person.id);
      });
      return { key: `${person.type}-${person.id}`, person, lektioner: dagLektioner };
    });
  })();

  const erStretch  = true;
  const colW       = erUgeMode ? UGE_COL_W : COL_W;
  const totalGridW = erStretch ? '100%' : Math.max(gitterKolonner.length * colW, 200);

  if (loading) return <LoadingSpinner tekst="Henter kalender…" />;

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap shrink-0">

        {/* Venstre: navigation */}
        <div className="flex items-center gap-2">
          {erUgeMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setUgePerson(null); setUgeKlasse(null); setValgtLektion(null); }}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                ‹ Tilbage
              </button>
              {erPersonUge && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${ugePerson.farve}`}>
                  {getInitialer(ugePerson.name)}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-800">
                {erPersonUge ? ugePerson.name : ugeKlasse.name}
              </span>
              <span className="text-xs text-slate-400">— Uge {ugeNr}</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setMandag(getMandagForUge()); setValgtDagIdx(Math.max(0, new Date().getDay() - 1)); }}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                I dag
              </button>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => gaaTilUge(-1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹</button>
                <button onClick={() => gaaTilUge(1)}  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
              </div>
              <span className="text-sm font-semibold text-slate-800">Uge {ugeNr}</span>
            </>
          )}
        </div>

        {/* Midten: dag-tabs (kun i dag-tilstand) eller uge-nav (kun i uge-tilstand) */}
        {erUgeMode ? (
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => gaaTilUge(-1)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹ Forrige uge</button>
            <button onClick={() => gaaTilUge(1)}  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Næste uge ›</button>
          </div>
        ) : (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {ugedage.map((dag, i) => (
              <button
                key={i}
                onClick={() => setValgtDagIdx(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i === valgtDagIdx ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="hidden sm:inline">{DAGE[i].slice(0, 3)} </span>
                <span className={dagTilStreng(dag) === idagStr ? 'text-blue-600 font-bold' : ''}>
                  {formatDagLabel(dag)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div />
      </div>

      {/* ── Kalender ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Tidssøjle */}
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

        {/* Kolonner */}
        <div ref={xScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden min-w-0 flex flex-col min-h-0">

          {/* Header */}
          <div
            className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
            style={{ width: totalGridW, height: HEADER_H }}
          >
            {erUgeMode ? (
              /* Week view: day headers */
              ugedage.map((dag, i) => {
                const dagStr = dagTilStreng(dag);
                const erIdag = dagStr === idagStr;
                return (
                  <div
                    key={i}
                    style={{ flex: 1, minWidth: colW }}
                    className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0"
                  >
                    <p className={`text-xs font-semibold ${erIdag ? 'text-blue-600' : 'text-slate-500'}`}>
                      {DAGE[i].slice(0, 3)}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${erIdag ? 'text-blue-600' : 'text-slate-800'}`}>
                      {dag.getDate()}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {dag.toLocaleDateString('da-DK', { month: 'short' })}
                    </p>
                  </div>
                );
              })
            ) : erKlasseFilter ? (
              /* Class day view: class headers (clickable) */
              (alleKlasser || []).map(klasse => (
                <button
                  key={klasse.id}
                  style={{ flex: 1, minWidth: colW }}
                  onClick={() => { setUgeKlasse(klasse); setValgtLektion(null); }}
                  className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-200 text-slate-700 text-xs font-bold mb-0.5">
                    {klasse.name}
                  </div>
                  <span className="text-xs font-semibold leading-none text-slate-600">{klasse.name}</span>
                </button>
              ))
            ) : (
              /* Person day view: person avatars (clickable) */
              gitterKolonner.map(({ key, person }) => (
                <button
                  key={key}
                  style={{ flex: 1, minWidth: colW }}
                  onClick={() => setAktivPersonModal(person)}
                  className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <KontaktTooltip
                    navn={person.name}
                    email={person.email}
                    telefon={person.phone}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold mb-0.5 ${person.farve}`}>
                      {getInitialer(person.name)}
                    </div>
                  </KontaktTooltip>
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
                </button>
              ))
            )}
          </div>

          {/* Gitter */}
          <div
            ref={yScrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ width: totalGridW }}
            onScroll={handleYScroll}
          >
            <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
              {gitterKolonner.map(({ key, lektioner: kolonneLektioner }) => (
                <GitterKolonne
                  key={key}
                  colW={colW}
                  erUgeMode={erStretch}
                  lektioner={kolonneLektioner}
                  tildelinger={tildelinger}
                  valgtLektionId={valgtLektion?.id}
                  onLektionKlik={l => setValgtLektion(prev => prev?.id === l.id ? null : l)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detalje-panel */}
        {valgtLektion && (
          <div className="w-64 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            <LektionDetalje
              lektion={valgtLektion}
              tildeling={tildelinger.find(t => t.lesson_id === valgtLektion.id)}
              onLuk={() => setValgtLektion(null)}
              visBesk={erInvolveret(valgtLektion, tildelinger.find(t => t.lesson_id === valgtLektion.id))}
              onBesked={() => { setBeskedLektion(valgtLektion); setValgtLektion(null); }}
            />
          </div>
        )}
      </div>

      {/* SimplePersonModal */}
      {aktivPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setAktivPersonModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-100">
            <div className="px-6 pt-6 pb-4 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shrink-0 ${aktivPersonModal.farve}`}>
                {getInitialer(aktivPersonModal.name)}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-base font-semibold text-slate-900 leading-tight truncate">{aktivPersonModal.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {aktivPersonModal.type === 'vikar' ? 'Vikar' : aktivPersonModal.dbType === 'paedagog' ? 'Pædagog' : 'Lærer'}
                </p>
                {aktivPersonModal.email && (
                  <p className="text-xs text-slate-500 mt-1 truncate">{aktivPersonModal.email}</p>
                )}
                {aktivPersonModal.phone && (
                  <p className="text-xs text-slate-500">{aktivPersonModal.phone}</p>
                )}
              </div>
              <button onClick={() => setAktivPersonModal(null)} className="text-slate-300 hover:text-slate-500 text-xl leading-none mt-0.5 shrink-0">×</button>
            </div>
            <div className="h-px bg-slate-100 mx-6" />
            <div className="px-4 py-4">
              <button
                onClick={() => { setUgePerson(aktivPersonModal); setAktivPersonModal(null); setValgtLektion(null); }}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium leading-tight">Vis ugeoversigt</p>
                  <p className="text-xs opacity-60 mt-0.5">Se hele ugen for denne person</p>
                </div>
                <span className="ml-auto text-xs opacity-30">›</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BeskedModal */}
      {beskedLektion && (
        <BeskedModal lektion={beskedLektion} onLuk={() => setBeskedLektion(null)} />
      )}
    </div>
  );
}

function GitterKolonne({ colW, erUgeMode, lektioner, tildelinger, valgtLektionId, onLektionKlik }) {
  return (
    <div
      className="relative border-r border-slate-200 last:border-r-0"
      style={erUgeMode ? { flex: 1, minWidth: colW, height: TIMER.length * TIME_PX } : { width: colW, height: TIMER.length * TIME_PX }}
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
              <KontaktTooltip
                navn={tildeling ? tildeling.vikar_navn : lektion.laerer_navn}
                email={tildeling ? tildeling.vikar_email : lektion.laerer_email}
                telefon={tildeling ? tildeling.vikar_phone : lektion.laerer_phone}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/50 font-bold shrink-0"
                  style={{ color: farve.text, fontSize: '9px' }}
                >
                  {tildeling
                    ? tildeling.vikar_navn?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2)
                    : lektion.laerer_navn?.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2)
                  }
                </span>
              </KontaktTooltip>
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

function LektionDetalje({ lektion, tildeling, onLuk, visBesk, onBesked }) {
  const [kontaktPerson, setKontaktPerson] = useState(null);
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
        <InfoRække
          label={lektion.laerer_type === 'paedagog' ? 'Pædagog' : 'Lærer'}
          value={lektion.laerer_navn || '—'}
          onClick={lektion.laerer_navn ? () => setKontaktPerson({
            navn: lektion.laerer_navn,
            rolle: lektion.laerer_type === 'paedagog' ? 'paedagog' : 'laerer',
            email: lektion.laerer_email,
            personalEmail: lektion.laerer_personal_email,
            telefon: lektion.laerer_phone,
          }) : undefined}
        />
        {tildeling?.vikar_navn && (
          <InfoRække
            label="Vikar"
            value={tildeling.vikar_navn}
            onClick={() => setKontaktPerson({
              navn: tildeling.vikar_navn,
              rolle: 'vikar',
              email: tildeling.vikar_email,
              personalEmail: tildeling.vikar_personal_email,
              telefon: tildeling.vikar_phone,
            })}
          />
        )}
        {visBesk && (
          <button
            onClick={onBesked}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Beskeder
          </button>
        )}
      </div>

      {kontaktPerson && (
        <PersonKontaktModal person={kontaktPerson} onLuk={() => setKontaktPerson(null)} />
      )}
    </div>
  );
}

function InfoRække({ label, value, onClick }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      {onClick ? (
        <button onClick={onClick} className="text-xs text-right text-blue-600 hover:underline capitalize">
          {value}
        </button>
      ) : (
        <span className="text-xs text-right text-slate-700 capitalize">{value}</span>
      )}
    </div>
  );
}
