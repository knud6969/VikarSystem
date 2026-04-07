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
  dagTilStreng,
  statusFarve,
  TIMER_START,
  TIMER_SLUT,
  DAGE,
} from '../utils/kalenderUtils';
import DagOversigt from '../components/kalender/DagOversigt';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import BekræftModal from '../components/common/BekræftModal';
import PersonModal from '../components/kalender/PersonModal';
import SygemeldingModal from '../components/kalender/SygemeldingModal';
import RaskmeldingModal from '../components/kalender/RaskmeldingModal';
import BeskedModal from '../components/beskeder/BeskedModal';
import PersonKontaktModal from '../components/common/PersonKontaktModal';
import { fetchLektionerMedBeskeder } from '../api/beskedFetch';

const TIME_PX       = 64;
const COL_W         = 140;
const UGEOVERSIGT_COL_W = 200; // bredere kolonner i ugeoversigt
const TIME_COL_W    = 48;
const HEADER_H      = 72;
const ARBEJDS_START = 7;
const TIMER         = Array.from({ length: TIMER_SLUT - TIMER_START }, (_, i) => TIMER_START + i);

function getInitialer(navn) {
  return navn.split(' ').map(d => d[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_FARVER = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-cyan-500','bg-indigo-500','bg-teal-500',
  'bg-orange-500','bg-pink-500','bg-lime-600','bg-sky-500',
];

/**
 * AdminKalenderPage
 *
 * To visnings-tilstande:
 *   1. Normal: alle personer som kolonner, én dag valgt (dag-tabs)
 *   2. Ugeoversigt: én person valgt, 5 kolonner (mandag–fredag)
 *
 * Klik på avatar → PersonModal → herfra kan man:
 *   - Skifte til ugeoversigt for personen
 *   - Registrere fravær / Raskmelding (kun lærere)
 */
export default function AdminKalenderPage() {
  const [mandag, setMandag]           = useState(() => getMandagForUge());
  const [valgtDagIdx, setValgtDagIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 0 : d - 1;
  });

  // Normal-tilstand: filter
  const [filterType,    setFilterType]    = useState('alle');
  const [valgtPersonId, setValgtPersonId] = useState(null);

  // Ugeoversigt-tilstand
  const [ugePerson, setUgePerson] = useState(null); // person-objekt eller null

  // Modaler
  // activPerson husker altid den person der er i fokus,
  // så sub-modaler (sygemelding/raskmelding) kan gå tilbage til PersonModal.
  const [activPerson,     setActivPerson]     = useState(null); // person-objekt — deles af alle modaler
  const [personModal,     setPersonModal]     = useState(null); // person-objekt (viser PersonModal)
  const [sygemeldModal,   setSygemeldModal]   = useState(null); // { id, name }
  const [raskmeldModal,   setRaskmeldModal]   = useState(null); // { id, name }

  // Lektion-detalje
  const [valgtLektion,   setValgtLektion]   = useState(null);
  const [beskedLektion,  setBeskedLektion]  = useState(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [actionFejl,     setActionFejl]     = useState('');
  const [vikarListe,     setVikarListe]     = useState(null);
  const [henterVikarer,  setHenterVikarer]  = useState(false);
  const [advarsel,       setAdvarsel]       = useState(null);
  const [bekræftTildel,  setBekræftTildel]  = useState(null); // { vikarId, alle: bool } | null
  const [bekræftFjern,   setBekræftFjern]   = useState(false);

  const xScrollRef = useRef(null);
  const yScrollRef = useRef(null);
  const timeColRef = useRef(null);
  const syncing    = useRef(false);

  const { lektioner, fravaer, tildelinger, tilgaengelighed, loading, error, refetch } = useKalender(mandag);
  const { data: alleLaerere, refetch: refetchLaerere } = useApi(laererService.getAll, []);
  const { data: alleVikarer }                           = useApi(vikarService.getAll, []);

  const [lektionerMedBeskeder, setLektionerMedBeskeder] = useState([]);
  useEffect(() => {
    if (!lektioner.length) return;
    fetchLektionerMedBeskeder(lektioner.map(l => l.id)).then(setLektionerMedBeskeder);
  }, [lektioner.length]);

  const ugedage  = getUgedage(mandag);
  const ugeNr    = getUgenummer(mandag);
  const idagStr  = dagTilStreng(new Date()); // lokal dato, ikke UTC

  // Når alleLaerere opdateres (efter sygemelding/raskmelding),
  // og PersonModal er åben — opdater activPerson med ny status
  // så livePerson-beregningen i JSX altid er frisk.
  useEffect(() => {
    if (activPerson && alleLaerere && activPerson.type === 'laerer') {
      const opdateret = alleLaerere.find(l => l.id === activPerson.id);
      if (opdateret && opdateret.status !== activPerson.status) {
        setActivPerson(prev => ({ ...prev, ...opdateret }));
      }
    }
  }, [alleLaerere]);

  // Auto-scroll til arbejdstid
  useEffect(() => {
    if (!loading && yScrollRef.current) {
      yScrollRef.current.scrollTop = (ARBEJDS_START - TIMER_START) * TIME_PX - 16;
    }
  }, [loading, ugePerson]);

  // Vertikal sync: gitter → tidssøjle
  const handleYScroll = useCallback((e) => {
    if (syncing.current) return;
    syncing.current = true;
    if (timeColRef.current) timeColRef.current.scrollTop = e.currentTarget.scrollTop;
    syncing.current = false;
  }, []);

  // ── Personliste ───────────────────────────────────────────
  const personer = (() => {
    const l = (alleLaerere || []).map((p, i) => ({
      ...p, dbType: p.type, type: 'laerer', farve: AVATAR_FARVER[i % AVATAR_FARVER.length],
    }));
    const v = (alleVikarer || []).map((p, i) => ({
      ...p, type: 'vikar', farve: AVATAR_FARVER[(l.length + i) % AVATAR_FARVER.length],
    }));
    if (filterType === 'laerere') return l;
    if (filterType === 'vikarer') return v;
    return [...l, ...v];
  })();

  // I normal-tilstand: filtrer evt. til én person
  const visPersoner = valgtPersonId
    ? personer.filter(p => `${p.type}-${p.id}` === valgtPersonId)
    : personer;

  // ── Beregn hvad der vises i gitteret ─────────────────────

  const erUgeOversigt = ugePerson !== null;

  // I ugeoversigt: vis alle 5 dage som kolonner for én person
  // I normal: vis valgt dag for alle visPersoner
  const gitterKolonner = erUgeOversigt
    ? ugedage.map((dag) => ({ dag, person: ugePerson }))
    : visPersoner.map((person) => ({ person, dag: ugedage[valgtDagIdx] }));

  const colW       = erUgeOversigt ? UGEOVERSIGT_COL_W : COL_W;
  const totalGridW = erUgeOversigt ? '100%' : gitterKolonner.length * colW;

  // Fravær for valgt dag (normal) eller alle dage (ugeoversigt håndteres per kolonne)
  const valgtDagStr = ugedage[valgtDagIdx] ? dagTilStreng(ugedage[valgtDagIdx]) : null;
  const dagFravaer  = fravaer.filter(f => String(f.start_date).slice(0,10) <= valgtDagStr && String(f.end_date).slice(0,10) >= valgtDagStr);

  // ── Navigation ────────────────────────────────────────────
  function gaaTilUge(r) {
    // Spring altid til mandagen i den nye uge, ikke samme ugedag
    setMandag(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + r * 7);
      return d;
    });
    setValgtDagIdx(0); // Altid mandag i ny uge
  }

  // ── Avatar-klik → PersonModal ─────────────────────────────
  function aabnePersonModal(person) {
    setActivPerson(person);
    setPersonModal(person);
  }

  function lukPersonModal() {
    setPersonModal(null);
    setActivPerson(null);
  }

  // Skift til ugeoversigt for personen
  function aabneUgeoversigt(person) {
    setUgePerson(person);
    setPersonModal(null);
    setActivPerson(null);
    setValgtLektion(null);
  }

  // Gå tilbage til normal visning
  function lukUgeoversigt() {
    setUgePerson(null);
  }

  // Fra PersonModal → SygemeldingModal
  // activPerson bevares så "Tilbage" kan genåbne PersonModal
  function aabneFromPersonSygemelding(person) {
    setPersonModal(null);
    setSygemeldModal({ id: person.id, name: person.name });
  }

  // Fra PersonModal → RaskmeldingModal
  function aabneFromPersonRaskmelding(person) {
    setPersonModal(null);
    setRaskmeldModal({ id: person.id, name: person.name });
  }

  // Gå tilbage fra sub-modal → PersonModal (Annuller-knap)
  function gaaTilbageTilPersonModal() {
    setSygemeldModal(null);
    setRaskmeldModal(null);
    if (activPerson) setPersonModal(activPerson);
  }

  // ── Lektion-handlinger ────────────────────────────────────
  function aabneLektion(lektion, tildeling) {
    const l = { ...lektion, tildeling };
    setValgtLektion(l);
    setActionFejl('');
    // Auto-hent vikarer hvis lektionen er udækket
    if (lektion.status === 'udækket') {
      setVikarListe(null);
      hentLedigeVikarer(l);
    } else {
      setVikarListe(null);
    }
  }

  async function hentLedigeVikarer(lektion) {
    setHenterVikarer(true);
    try {
      const s = new Date(lektion.start_time), e = new Date(lektion.end_time);
      // Brug HH:MM format (ikke da-DK locale som giver '08.40' med punktum)
      const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      setVikarListe(await vikarService.getLedige(
        dagTilStreng(s), fmt(s), fmt(e)
      ));
    } catch (err) {
      setActionFejl(err.message);
    } finally {
      setHenterVikarer(false);
    }
  }

  function tildelVikar(vikarId) {
    setBekræftTildel({ vikarId, alle: false });
  }

  function tildelAlleIdag(vikarId) {
    setBekræftTildel({ vikarId, alle: true });
  }

  async function udførTildeling(vikarId, alle) {
    setBekræftTildel(null);
    if (!alle) {
      setActionLoading(true); setActionFejl(''); setAdvarsel(null);
      try {
        const tildeling = await tildelingService.tildel(valgtLektion.id, vikarId);
        setValgtLektion(prev => ({ ...prev, status: 'dækket', tildeling }));
        await refetch();
        setValgtLektion(null);
      } catch (err) {
        setActionFejl(err.message);
      } finally {
        setActionLoading(false);
      }
      return;
    }
    if (!valgtLektion) return;
    setActionLoading(true); setActionFejl(''); setAdvarsel(null);
    try {
      const lektionsDag = dagTilStreng(new Date(valgtLektion.start_time));
      const toMin = d => d.getHours() * 60 + d.getMinutes();
      const strMin = s => { const [h, m] = s.slice(0, 5).split(':').map(Number); return h * 60 + m; };
      const vikarOptaget = tilgaengelighed.filter(t =>
        Number(t.substitute_id) === Number(vikarId) && t.status === 'optaget' && t.date === lektionsDag
      );
      const alleLektionerIdag = lektioner.filter(l =>
        l.teacher_id === valgtLektion.teacher_id &&
        dagTilStreng(new Date(l.start_time)) === lektionsDag &&
        l.status === 'udækket'
      );
      const alleUdaekket = alleLektionerIdag.filter(l => {
        const lS = toMin(new Date(l.start_time));
        const lE = toMin(new Date(l.end_time));
        return !vikarOptaget.some(t => lS < strMin(t.end_time) && lE > strMin(t.start_time));
      });
      // Optimistisk: opdater valgtLektion med det samme
      setValgtLektion(prev => ({ ...prev, status: 'dækket' }));
      // Tildel alle parallelt
      await Promise.all(alleUdaekket.map(l => tildelingService.tildel(l.id, vikarId)));
      await refetch();
      setValgtLektion(null);
      // Vis advarsel hvis nogle lektioner blev sprunget over
      const skippede = alleLektionerIdag.length - alleUdaekket.length;
      if (skippede > 0) {
        const vikarNavn = vikarListe?.find(v => Number(v.id) === Number(vikarId))?.name ?? 'Vikaren';
        const tiderStr = vikarOptaget.map(t => `${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`).join(', ');
        setAdvarsel(
          `${alleUdaekket.length} af ${alleLektionerIdag.length} lektioner blev tildelt ${vikarNavn}. ` +
          `${skippede} lektion${skippede > 1 ? 'er' : ''} sprunget over – ${vikarNavn} er utilgængelig: ${tiderStr}.`
        );
      }
    } catch (err) {
      // Fortryd optimistisk opdatering ved fejl
      setValgtLektion(prev => ({ ...prev, status: 'udækket' }));
      setActionFejl(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function fjernTildeling() {
    setBekræftFjern(true);
  }

  async function udførFjernTildeling() {
    setBekræftFjern(false);
    setActionLoading(true); setActionFejl('');
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

  // ── Render ────────────────────────────────────────────────
  if (loading) return <LoadingSpinner tekst="Henter kalender…" />;
  if (error)   return <ErrorMessage besked={error} />;

  const bekræftTildelVikarNavn = bekræftTildel
    ? (vikarListe?.find(v => Number(v.id) === Number(bekræftTildel.vikarId))?.name ?? 'vikaren')
    : '';

  return (
    <>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>

        {/* ── Advarsel (delvis tildeling) ───────────────────── */}
        {advarsel && (
          <div className="mb-3 shrink-0 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            <span className="flex-1">{advarsel}</span>
            <button onClick={() => setAdvarsel(null)} className="shrink-0 text-amber-400 hover:text-amber-600 text-base leading-none">×</button>
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────── */}
        <div className={`flex items-center justify-between mb-3 gap-3 flex-wrap shrink-0 ${filterType === 'klasser' ? 'hidden' : ''}`}>

          {/* Venstre: uge-navigation */}
          <div className="flex items-center gap-2">
            {erUgeOversigt ? (
              /* Ugeoversigt: vis person-navn + tilbage-knap */
              <div className="flex items-center gap-2">
                <button
                  onClick={lukUgeoversigt}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  ‹ Tilbage
                </button>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${ugePerson.farve}`}>
                  {getInitialer(ugePerson.name)}
                </div>
                <span className="text-sm font-semibold text-slate-800">{ugePerson.name}</span>
                <span className="text-xs text-slate-400">— Uge {ugeNr}</span>
              </div>
            ) : (
              /* Normal: I dag + uge-navigation */
              <>
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
              </>
            )}
          </div>

          {/* Midten: dag-tabs — kun i normal tilstand */}
          {!erUgeOversigt && (
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
          )}

          {/* I ugeoversigt: uge-navigation i midten */}
          {erUgeOversigt && (
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => gaaTilUge(-1)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 border-r border-slate-200">‹ Forrige uge</button>
              <button onClick={() => gaaTilUge(1)}  className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">Næste uge ›</button>
            </div>
          )}

          {/* Højre: person-filter — kun i normal tilstand */}
          {!erUgeOversigt && (
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setValgtPersonId(null); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="alle">Alle</option>
              <option value="laerere">Lærere</option>
              <option value="vikarer">Vikarer</option>
              <option value="klasser">Klasser</option>
            </select>
          )}
        </div>

        {/* Fravær vises kun som rødt ring på avatar — ingen badges øverst */}

        {filterType === 'klasser' ? (
          <DagOversigt filter="klasser" />
        ) : (<>

        {/* Enkelt-person filter-info */}
        {!erUgeOversigt && valgtPersonId && (
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <span>Viser: <strong className="text-slate-800">{visPersoner[0]?.name}</strong></span>
            <button
              onClick={() => setValgtPersonId(null)}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Vis alle
            </button>
          </div>
        )}

        {/* ── Kalender-wrapper ──────────────────────────────── */}
        <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Tidssøjle */}
          <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} className="shrink-0 border-r border-slate-200 flex flex-col bg-white z-10">
            <div style={{ height: HEADER_H }} className="shrink-0 border-b border-slate-200" />
            <div ref={timeColRef} className="flex-1 overflow-hidden">
              <div style={{ height: TIMER.length * TIME_PX }}>
                {TIMER.map(t => (
                  <div key={t} className="border-b border-slate-100 flex items-start justify-end pr-2 pt-1" style={{ height: TIME_PX }}>
                    <span className="text-xs text-slate-300 tabular-nums leading-none">
                      {String(t).padStart(2,'0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hoved-kolonne-område */}
          <div
            ref={xScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden min-w-0 flex flex-col min-h-0"
          >
            {/* ── Header ──────────────────────────────────── */}
            <div
              className="flex shrink-0 border-b border-slate-200 bg-white sticky top-0 z-20"
              style={{ width: totalGridW, height: HEADER_H }}
            >
              {erUgeOversigt
                /* Ugeoversigt: dag-kolonner */
                ? ugedage.map((dag, i) => {
                    const dagStr = dagTilStreng(dag);
                    const erIdag = dagStr === idagStr;
                    const dagFravaerUge = ugePerson.type === 'laerer' ? fravaer.filter(f => String(f.start_date).slice(0,10) <= dagStr && String(f.end_date).slice(0,10) >= dagStr && Number(f.teacher_id) === Number(ugePerson.id)) : [];

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
                        <p className="text-xs text-slate-400">
                          {dag.toLocaleDateString('da-DK', { month: 'short' })}
                        </p>
                        {dagFravaerUge.length > 0 && (
                          <span className="mt-0.5 text-xs text-red-500">fraværende</span>
                        )}
                      </div>
                    );
                  })
                /* Normal: person-kolonner */
                : gitterKolonner.map(({ person }) => {
                    const nøgle     = `${person.type}-${person.id}`;
                    const erValgt   = valgtPersonId === nøgle;
                    const erFravaer = person.type === 'laerer' && (
                      person.status !== 'aktiv' &&
                      dagFravaer.some(f => Number(f.teacher_id) === Number(person.id))
                    );

                    return (
                      <button
                        key={nøgle}
                        onClick={() => erUgeOversigt ? aabneUgeoversigt(person) : aabnePersonModal(person)}
                        style={{ width: colW, minWidth: colW }}
                        className={`flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 transition-colors ${
                          erValgt ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 ${person.farve} ${erFravaer ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
                          {getInitialer(person.name)}
                          {erFravaer && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <span className={`text-xs font-semibold leading-none ${erValgt ? 'text-blue-700' : 'text-slate-600'}`}>
                          {getInitialer(person.name)}
                        </span>
                        <span className={`text-xs mt-0.5 ${
                          person.type === 'vikar'           ? 'text-emerald-500' :
                          person.dbType === 'paedagog'      ? 'text-violet-400'  :
                                                              'text-blue-400'
                        }`}>
                          {person.type === 'vikar' ? 'V' : person.dbType === 'paedagog' ? 'P' : 'L'}
                        </span>
                      </button>
                    );
                  })
              }
            </div>

            {/* ── Gitter-body ──────────────────────────────── */}
            <div
              ref={yScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              onScroll={handleYScroll}
              style={{ width: totalGridW }}
            >
              <div className="flex" style={{ width: totalGridW, height: TIMER.length * TIME_PX }}>
                {erUgeOversigt
                  /* Ugeoversigt: én kolonne per dag */
                  ? ugedage.map((dag, i) => {
                      const dagStr        = dagTilStreng(dag);
                      const dagLektioner  = lektioner.filter(l =>
                        dagTilStreng(new Date(l.start_time)) === dagStr &&
                        (ugePerson.type === 'laerer'
                          ? l.teacher_id === ugePerson.id
                          : tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === ugePerson.id))
                      );
                      const erFravaer = ugePerson.type === 'laerer' && fravaer.some(
                        f => Number(f.teacher_id) === Number(ugePerson.id) && String(f.start_date).slice(0,10) <= dagStr && String(f.end_date).slice(0,10) >= dagStr
                      );

                      return (
                        <GitterKolonne
                          key={i}
                          colW={colW}
                          stretch
                          lektioner={dagLektioner}
                          tildelinger={tildelinger}
                          erFravaer={erFravaer}
                          lektionerMedBeskeder={lektionerMedBeskeder}
                          dagOptaget={ugePerson.type === 'vikar'
                            ? tilgaengelighed.filter(t => Number(t.substitute_id) === Number(ugePerson.id) && t.date === dagStr)
                            : []}
                          onLektionKlik={(l) => aabneLektion(l, tildelinger.find(t => t.lesson_id === l.id))}
                        />
                      );
                    })
                  /* Normal: én kolonne per person */
                  : gitterKolonner.map(({ person, dag }) => {
                      const dagStr       = dagTilStreng(dag);
                      const dagLektioner = lektioner.filter(l => {
                        const lDagStr = dagTilStreng(new Date(l.start_time));
                        if (lDagStr !== dagStr) return false;
                        if (person.type === 'laerer') return l.teacher_id === person.id;
                        return tildelinger.some(t => t.lesson_id === l.id && t.substitute_id === person.id);
                      });
                      const erFravaer = person.type === 'laerer' && (
                      person.status !== 'aktiv' &&
                      dagFravaer.some(f => Number(f.teacher_id) === Number(person.id))
                    );

                      return (
                        <GitterKolonne
                          key={`${person.type}-${person.id}`}
                          colW={colW}
                          lektioner={dagLektioner}
                          tildelinger={tildelinger}
                          erFravaer={erFravaer}
                          lektionerMedBeskeder={lektionerMedBeskeder}
                          dagOptaget={person.type === 'vikar'
                            ? tilgaengelighed.filter(t => Number(t.substitute_id) === Number(person.id) && t.date === dagStr)
                            : []}
                          onLektionKlik={(l) => aabneLektion(l, tildelinger.find(t => t.lesson_id === l.id))}
                        />
                      );
                    })
                }
              </div>
            </div>
          </div>

          {/* Lektion-detalje-panel */}
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
                onTildelAlle={tildelAlleIdag}
                onFjernTildeling={fjernTildeling}
                onBeskeder={() => setBeskedLektion(valgtLektion)}
              />
            </div>
          )}
        </div>
        </>)}
      </div>

      {/* ── Modaler (uden for kalender-layoutet) ─────────── */}

      {personModal && (() => {
        // Berig personModal med live status fra alleLaerere/alleVikarer
        // så status altid er opdateret efter sygemelding/raskmelding
        const freshData  = personModal.type === 'laerer'
          ? (alleLaerere || []).find(l => l.id === personModal.id)
          : null;
        const livePerson = freshData
          ? { ...personModal, ...freshData, dbType: freshData.type, type: 'laerer', farve: personModal.farve }
          : personModal;
        return (
          <PersonModal
            person={livePerson}
            dagFravaer={dagFravaer}
            onLuk={lukPersonModal}
            onSygemelding={() => aabneFromPersonSygemelding(livePerson)}
            onRaskmelding={() => aabneFromPersonRaskmelding(livePerson)}
            onUgeoversigt={() => aabneUgeoversigt(livePerson)}
          />
        );
      })()}

      {sygemeldModal && (
        <SygemeldingModal
          laerer={sygemeldModal}
          initialDato={dagTilStreng(getUgedage(mandag)[valgtDagIdx])}
          onTilbage={gaaTilbageTilPersonModal}
          onSuccess={async () => {
            setSygemeldModal(null);
            setPersonModal(null);
            setActivPerson(null);
            await Promise.all([refetch(), refetchLaerere()]);
          }}
        />
      )}

      {raskmeldModal && (
        <RaskmeldingModal
          laerer={raskmeldModal}
          onTilbage={gaaTilbageTilPersonModal}
          onSuccess={async () => {
            setRaskmeldModal(null);
            // Luk PersonModal og opdater data — lad ikke stale data vises
            setPersonModal(null);
            setActivPerson(null);
            await Promise.all([refetch(), refetchLaerere()]);
          }}
        />
      )}

      {beskedLektion && (
        <BeskedModal
          lektion={beskedLektion}
          onLuk={() => setBeskedLektion(null)}
        />
      )}

      {bekræftTildel && (
        <BekræftModal
          tittel={bekræftTildel.alle ? 'Tildel alle lektioner i dag?' : 'Tildel vikar?'}
          besked={bekræftTildel.alle
            ? `${bekræftTildelVikarNavn} tildeles alle udækkede lektioner for denne lærer i dag.`
            : `${bekræftTildelVikarNavn} tildeles denne lektion.`}
          bekræftTekst="Tildel"
          variant="primary"
          onBekræft={() => udførTildeling(bekræftTildel.vikarId, bekræftTildel.alle)}
          onAnnuller={() => setBekræftTildel(null)}
        />
      )}

      {bekræftFjern && (
        <BekræftModal
          tittel="Fjern tildeling?"
          besked={`${valgtLektion?.tildeling?.vikar_navn ?? 'Vikaren'} fjernes fra denne lektion. Lektionen bliver udækket igen.`}
          bekræftTekst="Fjern tildeling"
          variant="danger"
          onBekræft={udførFjernTildeling}
          onAnnuller={() => setBekræftFjern(false)}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * GitterKolonne — én tidssøjle-kolonne i gitteret
 * ──────────────────────────────────────────────────────────── */
function GitterKolonne({ colW, stretch, lektioner, tildelinger, erFravaer, lektionerMedBeskeder = [], dagOptaget = [], onLektionKlik }) {
  return (
    <div
      className={`relative border-r border-slate-200 last:border-r-0 ${erFravaer ? 'bg-red-50/30' : ''}`}
      style={stretch ? { flex: 1, minWidth: colW, height: TIMER.length * TIME_PX } : { width: colW, height: TIMER.length * TIME_PX }}
    >
      {/* Timegrid-linjer */}
      {TIMER.map(t => (
        <div
          key={t}
          className="absolute w-full border-b border-slate-100"
          style={{ top: (t - TIMER_START) * TIME_PX, height: TIME_PX }}
        />
      ))}
      {TIMER.map(t => (
        <div
          key={`h${t}`}
          className="absolute w-full border-b border-slate-50"
          style={{ top: (t - TIMER_START) * TIME_PX + TIME_PX / 2 }}
        />
      ))}

      {/* Vikar utilgængeligheds-blokke */}
      {dagOptaget.map(blok => {
        const [sh, sm] = blok.start_time.slice(0,5).split(':').map(Number);
        const [eh, em] = blok.end_time.slice(0,5).split(':').map(Number);
        const startMin = (sh - TIMER_START) * 60 + sm;
        const slutMin  = (eh - TIMER_START) * 60 + em;
        const top    = (startMin / 60) * TIME_PX;
        const height = Math.max(((slutMin - startMin) / 60) * TIME_PX, 16);
        return (
          <div key={blok.id}
            className="absolute left-0.5 right-0.5 rounded-md z-5 overflow-hidden pointer-events-none"
            style={{ top: top + 1, height: height - 2, backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid #FECACA' }}>
            {height > 24 && (
              <p className="text-xs text-red-400 px-1.5 pt-0.5 leading-tight truncate" style={{ fontSize: '9px' }}>
                Utilgængelig{blok.kommentar ? ` · ${blok.kommentar}` : ''}
              </p>
            )}
          </div>
        );
      })}

      {/* Lektioner */}
      {lektioner.map(lektion => {
        const { top, height } = beregnPosition(lektion.start_time, lektion.end_time, TIME_PX);
        const farve           = statusFarve(lektion.status);
        const tildeling       = tildelinger.find(t => t.lesson_id === lektion.id);
        const harBeskeder     = lektionerMedBeskeder.includes(lektion.id);

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
            }}
          >
            {harBeskeder && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
            {/* Fag + initialer på samme linje */}
            <div className="flex items-center justify-between gap-1">
              <p className="font-semibold text-xs leading-tight truncate" style={{ color: farve.text }}>
                {lektion.subject}
              </p>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/50 font-bold shrink-0"
                style={{ color: farve.text, fontSize: '9px' }}
                title={tildeling ? tildeling.vikar_navn : lektion.laerer_navn}
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

/* ────────────────────────────────────────────────────────────
 * DetaljePanelIndhold — højre-panel for valgt lektion
 * ──────────────────────────────────────────────────────────── */
function DetaljePanelIndhold({
  lektion, vikarListe, henterVikarer, actionLoading, actionFejl,
  onLuk, onHentVikarer, onTildelVikar, onTildelAlle, onFjernTildeling, onBeskeder,
}) {
  const [tildelAlle,    setTildelAlle]    = useState(false);
  const [kontaktPerson, setKontaktPerson] = useState(null);
  const start  = new Date(lektion.start_time);
  const slut   = new Date(lektion.end_time);
  const fmt    = d => d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const farve  = statusFarve(lektion.status);
  const labels = { normal: 'Planlagt', udækket: 'Udækket', dækket: 'Dækket' };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span
          className="px-2.5 py-1 rounded text-xs font-semibold"
          style={{ backgroundColor: farve.bg, color: farve.text, border: `1px solid ${farve.border}` }}
        >
          {labels[lektion.status] ?? lektion.status}
        </span>
        <button onClick={onLuk} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
      </div>

      <div className="px-4 py-4 space-y-3 border-b border-slate-100">
        <InfoRække label="Fag"    value={lektion.subject} />
        <InfoRække label="Klasse" value={lektion.klasse_navn || '—'} bold />
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
        {lektion.tildeling && (
          <InfoRække
            label="Vikar"
            value={lektion.tildeling.vikar_navn}
            onClick={() => setKontaktPerson({
              navn: lektion.tildeling.vikar_navn,
              rolle: 'vikar',
              email: lektion.tildeling.vikar_email,
              personalEmail: lektion.tildeling.vikar_personal_email,
              telefon: lektion.tildeling.vikar_phone,
            })}
          />
        )}
      </div>

      {kontaktPerson && (
        <PersonKontaktModal person={kontaktPerson} onLuk={() => setKontaktPerson(null)} />
      )}

      <div className="px-4 py-4 space-y-2">
        {actionFejl && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {actionFejl}
          </div>
        )}

        {lektion.status === 'udækket' && (
          !vikarListe ? (
            <button
              onClick={onHentVikarer}
              disabled={henterVikarer}
              className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {henterVikarer ? 'Henter…' : 'Find ledig vikar'}
            </button>
          ) : vikarListe.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg">
              Ingen ledige vikarer
            </p>
          ) : (
            <div className="space-y-2">
              {/* Tildel-alle checkboks */}
              <label className="flex items-center gap-2 px-1 py-1 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tildelAlle}
                  onChange={e => setTildelAlle(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                  Tildel alle lærerens lektioner i dag
                </span>
              </label>

              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide pt-1">Vælg vikar</p>
              {vikarListe.map(v => (
                <button
                  key={v.id}
                  onClick={() => tildelAlle ? onTildelAlle(v.id) : onTildelVikar(v.id)}
                  disabled={actionLoading}
                  className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-800">{v.name}</p>
                      <p className="text-xs text-slate-400">{v.email}</p>
                    </div>
                    <span className="text-xs text-blue-500 font-medium shrink-0 ml-2">
                      {tildelAlle ? 'Tildel alle' : 'Tildel'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {lektion.status === 'dækket' && lektion.tildeling && (
          <button
            onClick={onFjernTildeling}
            disabled={actionLoading}
            className="w-full py-2 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Fjerner…' : 'Fjern tildeling'}
          </button>
        )}

        <button
          onClick={onBeskeder}
          className="w-full py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Beskeder
        </button>
      </div>
    </div>
  );
}

function InfoRække({ label, value, bold, onClick }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      {onClick ? (
        <button onClick={onClick} className="text-xs text-right text-blue-600 hover:underline">
          {value}
        </button>
      ) : (
        <span className={`text-xs text-right ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
          {value}
        </span>
      )}
    </div>
  );
}