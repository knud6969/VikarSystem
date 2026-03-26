import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifikationService } from '../../api/notifikationService';

const TYPE_IKON = {
  tildeling_oprettet: '✅',
  tildeling_fjernet:  '❌',
  vikar_tildelt:      '✅',
  vikar_fjernet:      '❌',
  ny_besked:          '💬',
};

export default function KlokkeKnap() {
  const [notifikationer, setNotifikationer] = useState([]);
  const [aaben,          setAaben]          = useState(false);
  const navigate  = useNavigate();
  const panelRef  = useRef(null);
  const knopRef   = useRef(null);

  const hent = useCallback(async () => {
    try {
      const data = await notifikationService.getForMig();
      setNotifikationer(data);
    } catch (err) {
      console.error('[KlokkeKnap] GET /notifikationer fejlede:', err);
    }
  }, []);

  // Hent ved mount + hvert 60. sekund
  useEffect(() => {
    hent();
    const interval = setInterval(hent, 15_000);
    return () => clearInterval(interval);
  }, [hent]);

  // Luk ved klik udenfor
  useEffect(() => {
    if (!aaben) return;
    function handleClick(e) {
      if (!panelRef.current?.contains(e.target) && !knopRef.current?.contains(e.target)) {
        setAaben(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [aaben]);

  const ulæste = notifikationer.filter(n => !n.laest).length;

  async function handleKlik(notif) {
    if (!notif.laest) {
      try {
        await notifikationService.markerLaest(notif.id);
        setNotifikationer(prev =>
          prev.map(n => n.id === notif.id ? { ...n, laest: true } : n)
        );
      } catch { /* ignorer */ }
    }
    setAaben(false);
    if (notif.link) navigate(notif.link);
  }

  return (
    <div className="relative">
      {/* Klokke-knap */}
      <button
        ref={knopRef}
        onClick={() => setAaben(v => !v)}
        className="relative p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
        title="Notifikationer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {ulæste > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {ulæste > 9 ? '9+' : ulæste}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aaben && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Notifikationer</span>
            {ulæste > 0 && (
              <span className="text-xs text-slate-400">{ulæste} ulæste</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifikationer.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Ingen notifikationer</p>
            ) : (
              notifikationer.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleKlik(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start ${
                    notif.laest ? 'opacity-50' : ''
                  }`}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">
                    {TYPE_IKON[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium leading-snug text-slate-800 ${!notif.laest ? 'font-semibold' : ''}`}>
                        {notif.titel}
                      </p>
                      {!notif.laest && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                      )}
                    </div>
                    {notif.besked && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.besked}</p>
                    )}
                    <p className="text-[10px] text-slate-300 mt-1">
                      {new Date(notif.oprettet_at).toLocaleString('da-DK', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
