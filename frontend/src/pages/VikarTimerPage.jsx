import { useState, useEffect, useCallback } from 'react';
import { timerService }       from '../api/timerService';
import { loenkoerselService } from '../api/loenkoerselService';
import LoadingSpinner from '../components/common/LoadingSpinner';

function getMaanedStr(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

function formatMaaned(maaned) {
  const [year, month] = maaned.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' });
}

function formatTimer(timer) {
  const t = parseFloat(timer) || 0;
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

export default function VikarTimerPage() {
  const [maanedOffset, setMaanedOffset] = useState(0);
  const [rækker,       setRækker]       = useState([]);
  const [kørsel,       setKørsel]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [fejl,         setFejl]         = useState('');

  const maaned = getMaanedStr(maanedOffset);

  const hent = useCallback(async () => {
    setLoading(true);
    setFejl('');
    try {
      const [data, k] = await Promise.all([
        timerService.getMine(maaned),
        loenkoerselService.get(maaned),
      ]);
      setRækker(data || []);
      setKørsel(k);
    } catch (err) {
      setFejl(err.message);
    } finally {
      setLoading(false);
    }
  }, [maaned]);

  useEffect(() => { hent(); }, [hent]);

  const laererRæk   = rækker.find(r => r.laerer_type === 'laerer');
  const paedagogRæk = rækker.find(r => r.laerer_type === 'paedagog');

  const totalLektioner = (laererRæk?.lektioner || 0) + (paedagogRæk?.lektioner || 0);
  const totalTimer     = (parseFloat(laererRæk?.timer) || 0) + (parseFloat(paedagogRæk?.timer) || 0);

  return (
    <div className="max-w-lg mx-auto py-6 space-y-5">

      {/* Måneds-navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMaanedOffset(p => p - 1)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ‹
        </button>
        <h1 className="text-base font-semibold text-slate-800 capitalize">
          {formatMaaned(maaned)}
        </h1>
        <button
          onClick={() => setMaanedOffset(p => p + 1)}
          disabled={maanedOffset >= 0}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {loading ? (
        <LoadingSpinner tekst="Henter timer…" />
      ) : fejl ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠ {fejl}</div>
      ) : (
        <>
          {/* Lønkørsel-banner */}
          {kørsel && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs text-slate-500">
              <span>🔒</span>
              <span>
                Måned låst — lønkørsel sendt{' '}
                {new Date(kørsel.koert_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          )}

          {/* Lærertimer */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lærertimer</p>
            {laererRæk ? (
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-slate-800">{formatTimer(laererRæk.timer)}</span>
                <span className="text-sm text-slate-400">{laererRæk.lektioner} lektioner</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-1">Ingen lærertimer denne måned</p>
            )}
          </div>

          {/* Pædagogtimer */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pædagogtimer</p>
            {paedagogRæk ? (
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-slate-800">{formatTimer(paedagogRæk.timer)}</span>
                <span className="text-sm text-slate-400">{paedagogRæk.lektioner} lektioner</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-1">Ingen pædagogtimer denne måned</p>
            )}
          </div>

          {/* Total */}
          {totalLektioner > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Total</span>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-800">{formatTimer(totalTimer)}</span>
                <span className="text-sm text-blue-500 ml-2">{totalLektioner} lektioner</span>
              </div>
            </div>
          )}

          {totalLektioner === 0 && !kørsel && (
            <p className="text-center text-sm text-slate-400 py-6">Ingen tildelte lektioner denne måned</p>
          )}
        </>
      )}
    </div>
  );
}
