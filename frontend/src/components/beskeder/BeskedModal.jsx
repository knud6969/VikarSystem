import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function hentBeskeder(lessonId) {
  const res = await fetch(`${API}/beskeder/lektion/${lessonId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Kunne ikke hente beskeder');
  return res.json();
}

async function sendBesked(lessonId, indhold) {
  const res = await fetch(`${API}/beskeder/lektion/${lessonId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ indhold }),
  });
  if (!res.ok) throw new Error('Kunne ikke sende besked');
  return res.json();
}

export default function BeskedModal({ lektion, onLuk }) {
  const { bruger } = useAuth();
  const [beskeder, setBeskeder]   = useState([]);
  const [indhold, setIndhold]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [sender, setSender]       = useState(false);
  const [fejl, setFejl]           = useState(null);
  const bundRef                   = useRef(null);
  const textareaRef               = useRef(null);

  useEffect(() => {
    let aktiv = true;
    setLoading(true);
    hentBeskeder(lektion.id)
      .then(data => { if (aktiv) { setBeskeder(data); setLoading(false); } })
      .catch(() => { if (aktiv) { setFejl('Kunne ikke hente beskeder'); setLoading(false); } });
    return () => { aktiv = false; };
  }, [lektion.id]);

  useEffect(() => {
    bundRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [beskeder]);

  async function handleSend(e) {
    e.preventDefault();
    const tekst = indhold.trim();
    if (!tekst) return;
    setSender(true);
    try {
      const nyBesked = await sendBesked(lektion.id, tekst);
      setBeskeder(prev => [...prev, {
        ...nyBesked,
        afsender_rolle: bruger.rolle,
        afsender_navn:  bruger.navn || bruger.email,
      }]);
      setIndhold('');
      textareaRef.current?.focus();
    } catch {
      setFejl('Beskeden kunne ikke sendes');
    } finally {
      setSender(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const start = new Date(lektion.start_time);
  const datoStr = start.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  const tidStr  = start.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onLuk(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 420, maxHeight: '80vh' }}>

        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{lektion.subject}</p>
            <p className="text-xs text-slate-400 mt-0.5">{lektion.klasse_navn} · {datoStr}, {tidStr}</p>
          </div>
          <button onClick={onLuk}
            className="text-slate-300 hover:text-slate-500 text-xl leading-none ml-3 mt-0.5">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading && <p className="text-center text-xs text-slate-400 py-8">Henter beskeder…</p>}
          {!loading && beskeder.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm text-slate-400">Ingen beskeder endnu.</p>
              <p className="text-xs text-slate-300 mt-1">Skriv den første besked herunder.</p>
            </div>
          )}
          {beskeder.map(b => {
            const erMig     = b.afsender_id === bruger?.id;
            const rolle     = b.afsender_rolle === 'laerer' ? 'Lærer' : 'Vikar';
            const tidspunkt = new Date(b.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={b.id} className={`flex flex-col ${erMig ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${erMig ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-medium text-slate-600">{erMig ? 'Dig' : b.afsender_navn}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    b.afsender_rolle === 'laerer' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>{rolle}</span>
                  <span className="text-xs text-slate-300">{tidspunkt}</span>
                </div>
                <div className={`rounded-2xl px-3.5 py-2.5 max-w-xs text-sm leading-snug whitespace-pre-wrap ${
                  erMig ? 'bg-slate-800 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {b.indhold}
                </div>
              </div>
            );
          })}
          {fejl && <p className="text-center text-xs text-red-400">{fejl}</p>}
          <div ref={bundRef} />
        </div>

        <div className="px-4 py-3 border-t border-slate-100">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={indhold}
              onChange={e => setIndhold(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv en besked…"
              rows={2}
              disabled={sender}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 transition disabled:opacity-50"
            />
            <button type="submit" disabled={sender || !indhold.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition disabled:opacity-40">
              {sender ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}