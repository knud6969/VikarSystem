import { useState, useEffect, useCallback } from 'react';
import { timerService }        from '../api/timerService';
import { indstillingerService } from '../api/indstillingerService';
import { loenkoerselService }  from '../api/loenkoerselService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getMaanedStr, formatMaaned } from '../utils/kalenderUtils';

function formatTimer(val) {
  const t = parseFloat(val) || 0;
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

// Saml rækker (lærer + pædagog) per vikar til én post
function samleVikarer(rækker) {
  const map = new Map();
  for (const r of rækker) {
    if (!map.has(r.vikar_id)) {
      map.set(r.vikar_id, { vikar_id: r.vikar_id, vikar_navn: r.vikar_navn, laerer: null, paedagog: null });
    }
    const v = map.get(r.vikar_id);
    if (r.laerer_type === 'laerer')   v.laerer   = r;
    if (r.laerer_type === 'paedagog') v.paedagog = r;
  }
  return Array.from(map.values());
}

export default function AdminTimestyringPage() {
  const [maanedOffset,  setMaanedOffset]  = useState(0);
  const [rækker,        setRækker]        = useState([]);
  const [kørsel,        setKørsel]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [satser,        setSatser]        = useState({ timesat_laerer: '250', timesat_paedagog: '220' });
  const [satsInput,     setSatsInput]     = useState({ timesat_laerer: '250', timesat_paedagog: '220' });
  const [gemSatsFejl,   setGemSatsFejl]   = useState('');
  const [gemSatsOk,     setGemSatsOk]     = useState(false);
  const [kørerLøn,      setKørerLøn]      = useState(false);
  const [lønFejl,       setLønFejl]       = useState('');
  const [annullerer,    setAnnullerer]    = useState(false);
  const [valgtVikar,    setValgtVikar]    = useState(null); // { vikar_id, vikar_navn }
  const [vikarDetaljer, setVikarDetaljer] = useState([]);
  const [henterDetaljer,setHenterDetaljer]= useState(false);

  const maaned = getMaanedStr(maanedOffset);

  const hent = useCallback(async () => {
    setLoading(true);
    try {
      const [data, k, s] = await Promise.all([
        timerService.getAlleAdmin(maaned),
        loenkoerselService.get(maaned),
        indstillingerService.getTimesatser(),
      ]);
      setRækker(data || []);
      setKørsel(k);
      setSatser(s);
      setSatsInput(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [maaned]);

  useEffect(() => { hent(); }, [hent]);

  async function gemSatser() {
    setGemSatsFejl(''); setGemSatsOk(false);
    try {
      await indstillingerService.setTimesatser(satsInput);
      setSatser(satsInput);
      setGemSatsOk(true);
      setTimeout(() => setGemSatsOk(false), 3000);
    } catch (err) {
      setGemSatsFejl(err.message);
    }
  }

  async function køresLønkørsel() {
    setKørerLøn(true); setLønFejl('');
    try {
      const k = await loenkoerselService.koer(maaned);
      setKørsel(k);
    } catch (err) {
      setLønFejl(err.message);
    } finally {
      setKørerLøn(false);
    }
  }

  async function annullerLønkørsel() {
    setAnnullerer(true); setLønFejl('');
    try {
      await loenkoerselService.annuller(maaned);
      setKørsel(null);
    } catch (err) {
      setLønFejl(err.message);
    } finally {
      setAnnullerer(false);
    }
  }

  async function åbnVikar(v) {
    setValgtVikar(v);
    setHenterDetaljer(true);
    try {
      const data = await timerService.getVikarAdmin(v.vikar_id, maaned);
      setVikarDetaljer(data || []);
    } catch (err) {
      setVikarDetaljer([]);
    } finally {
      setHenterDetaljer(false);
    }
  }

  const vikarer = samleVikarer(rækker);

  // Sidst i måneden (bruger for advarsel)
  const erSidstIMaaned = (() => {
    const idag = new Date();
    const sidst = new Date(idag.getFullYear(), idag.getMonth() + 1, 0);
    return idag.getDate() >= sidst.getDate() - 2;
  })();
  const erIndevaerendeMaaned = maanedOffset === 0;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <h1 className="text-lg font-bold text-slate-800">Timestyring</h1>

      {/* Timesatser */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Timesatser</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Lærere (kr/t)</label>
            <input
              type="number"
              value={satsInput.timesat_laerer}
              onChange={e => setSatsInput(p => ({ ...p, timesat_laerer: e.target.value }))}
              className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Pædagoger (kr/t)</label>
            <input
              type="number"
              value={satsInput.timesat_paedagog}
              onChange={e => setSatsInput(p => ({ ...p, timesat_paedagog: e.target.value }))}
              className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            onClick={gemSatser}
            className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Gem satser
          </button>
          {gemSatsOk  && <span className="text-xs text-emerald-600">Gemt</span>}
          {gemSatsFejl && <span className="text-xs text-red-500">{gemSatsFejl}</span>}
        </div>
      </div>

      {/* Måneds-navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setMaanedOffset(p => p - 1); setValgtVikar(null); }}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-slate-800 capitalize">
          {formatMaaned(maaned)}
        </h2>
        <button
          onClick={() => { setMaanedOffset(p => p + 1); setValgtVikar(null); }}
          disabled={maanedOffset >= 0}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {loading ? (
        <LoadingSpinner tekst="Henter timer…" />
      ) : (
        <>
          {/* Advarsel: sidst i måneden og ikke kørt */}
          {erIndevaerendeMaaned && erSidstIMaaned && !kørsel && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              <span>Det er sidst i måneden — husk at køre lønkørsel for {formatMaaned(maaned)}.</span>
            </div>
          )}

          {/* Lønkørsel-status */}
          {kørsel ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 border border-slate-200 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                <span>
                  Lønkørsel sendt{' '}
                  {new Date(kørsel.koert_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}
                  {' '}af {kørsel.koert_af_email}
                </span>
              </div>
              <button
                onClick={annullerLønkørsel}
                disabled={annullerer}
                className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 shrink-0"
              >
                {annullerer ? 'Annullerer…' : 'Annuller'}
              </button>
            </div>
          ) : null}

          {/* Vikar-tabel */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Vikar</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Lærertimer</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Pædagogtimer</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vikarer.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-slate-400">
                      Ingen tildelinger denne måned
                    </td>
                  </tr>
                ) : vikarer.map(v => {
                  const lT = parseFloat(v.laerer?.timer)   || 0;
                  const pT = parseFloat(v.paedagog?.timer) || 0;
                  return (
                    <tr
                      key={v.vikar_id}
                      onClick={() => åbnVikar(v)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{v.vikar_navn}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {v.laerer ? formatTimer(v.laerer.timer) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {v.paedagog ? formatTimer(v.paedagog.timer) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatTimer(lT + pT)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lønkørsel-knap */}
          {!kørsel && (
            <div className="flex flex-col items-end gap-2">
              {lønFejl && <p className="text-xs text-red-500">{lønFejl}</p>}
              <button
                onClick={køresLønkørsel}
                disabled={kørerLøn}
                className="px-5 py-2.5 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {kørerLøn ? 'Kører…' : `Kør lønkørsel for ${formatMaaned(maaned)}`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Vikar-detalje panel */}
      {valgtVikar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setValgtVikar(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{valgtVikar.vikar_navn}</h2>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{formatMaaned(maaned)}</p>
              </div>
              <button onClick={() => setValgtVikar(null)} className="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {henterDetaljer ? (
                <LoadingSpinner tekst="Henter…" />
              ) : (
                <>
                  {['laerer', 'paedagog'].map(type => {
                    const r = vikarDetaljer.find(x => x.laerer_type === type);
                    return (
                      <div key={type} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                          {type === 'laerer' ? 'Lærertimer' : 'Pædagogtimer'}
                        </p>
                        {r ? (
                          <div className="flex items-baseline gap-3">
                            <span className="text-xl font-bold text-slate-800">{formatTimer(r.timer)}</span>
                            <span className="text-sm text-slate-400">{r.lektioner} lektioner</span>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">Ingen timer</p>
                        )}
                      </div>
                    );
                  })}
                  {/* Total */}
                  {vikarDetaljer.length > 0 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Total</span>
                      <span className="text-base font-bold text-blue-800">
                        {formatTimer(
                          vikarDetaljer.reduce((sum, r) => sum + (parseFloat(r.timer) || 0), 0)
                        )}
                      </span>
                    </div>
                  )}
                  {vikarDetaljer.length === 0 && (
                    <p className="text-center text-sm text-slate-400">Ingen tildelte lektioner denne måned</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
