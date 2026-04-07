import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vikarService } from '../api/vikarService';
import { profilService } from '../api/profilService';
import LoadingSpinner from '../components/common/LoadingSpinner';

async function fetchLaererMig() {
  const token = localStorage.getItem('token');
  const res = await fetch('/laerere/mig', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Kunne ikke hente lærerdata');
  return res.json();
}

export default function MineOplysningerPage() {
  const { bruger } = useAuth();
  const erVikar   = bruger?.rolle === 'vikar';
  const erLaerer  = bruger?.rolle === 'laerer';

  const [profil,        setProfil]        = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Kontaktoplysninger
  const [telefon,       setTelefon]       = useState('');
  const [personalMail,  setPersonalMail]  = useState('');
  const [gemmer,        setGemmer]        = useState(false);
  const [gemtOk,        setGemtOk]        = useState(false);
  const [gemFejl,       setGemFejl]       = useState('');

  // Password
  const [nuvaerende,    setNuvaerende]    = useState('');
  const [nyKode,        setNyKode]        = useState('');
  const [bekraeft,      setBekraeft]      = useState('');
  const [kodeGemmer,    setKodeGemmer]    = useState(false);
  const [kodeOk,        setKodeOk]        = useState(false);
  const [kodeFejl,      setKodeFejl]      = useState('');

  useEffect(() => {
    async function hent() {
      try {
        const data = erVikar ? await vikarService.getMig() : await fetchLaererMig();
        setProfil(data);
        setTelefon(data.phone ?? '');
        setPersonalMail(data.personal_email ?? '');
      } catch {
        // ignorerer fejl — viser bare tom formular
      } finally {
        setLoading(false);
      }
    }
    hent();
  }, [erVikar]);

  async function gemOplysninger(e) {
    e.preventDefault();
    setGemmer(true);
    setGemtOk(false);
    setGemFejl('');
    try {
      const opdateret = erVikar
        ? await profilService.opdaterVikar({ phone: telefon, personal_email: personalMail })
        : await profilService.opdaterLaerer({ phone: telefon, personal_email: personalMail });
      setProfil(prev => ({ ...prev, ...opdateret }));
      setGemtOk(true);
      setTimeout(() => setGemtOk(false), 3000);
    } catch (err) {
      setGemFejl(err.message || 'Noget gik galt');
    } finally {
      setGemmer(false);
    }
  }

  async function skiftKode(e) {
    e.preventDefault();
    if (nyKode !== bekraeft) {
      setKodeFejl('De to adgangskoder matcher ikke');
      return;
    }
    if (nyKode.length < 6) {
      setKodeFejl('Adgangskoden skal være mindst 6 tegn');
      return;
    }
    setKodeGemmer(true);
    setKodeOk(false);
    setKodeFejl('');
    try {
      await profilService.skiftKode({ nuvaerende, ny: nyKode });
      setKodeOk(true);
      setNuvaerende('');
      setNyKode('');
      setBekraeft('');
      setTimeout(() => setKodeOk(false), 3000);
    } catch (err) {
      setKodeFejl(err.message || 'Forkert nuværende adgangskode');
    } finally {
      setKodeGemmer(false);
    }
  }

  if (loading) return <LoadingSpinner tekst="Henter oplysninger…" />;

  const rolle = erVikar ? 'Vikar' : profil?.type === 'paedagog' ? 'Pædagog' : 'Lærer';

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Mine oplysninger</h1>
        <p className="text-sm text-slate-500 mt-0.5">{rolle} · {profil?.name}</p>
      </div>

      {/* Kontaktoplysninger */}
      <form onSubmit={gemOplysninger} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Kontaktoplysninger</h2>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Arbejdsmail — kun læsning */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Arbejdsmail</label>
            <input
              type="email"
              value={profil?.email ?? ''}
              disabled
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Arbejdsmailen kan ikke ændres</p>
          </div>

          {/* Personlig mail */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Personlig mail</label>
            <input
              type="email"
              value={personalMail}
              onChange={e => setPersonalMail(e.target.value)}
              placeholder="din@privatmail.dk"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Telefonnummer */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Telefonnummer</label>
            <input
              type="tel"
              value={telefon}
              onChange={e => setTelefon(e.target.value)}
              placeholder="12 34 56 78"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {gemFejl && <p className="text-xs text-red-500">{gemFejl}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={gemmer}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {gemmer ? 'Gemmer…' : 'Gem oplysninger'}
            </button>
            {gemtOk && <p className="text-xs text-emerald-600 font-medium">Gemt!</p>}
          </div>
        </div>
      </form>

      {/* Skift adgangskode */}
      <form onSubmit={skiftKode} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Skift adgangskode</h2>
        </div>
        <div className="px-6 py-5 space-y-4">

          <div>
            <label className="block text-xs text-slate-500 mb-1">Nuværende adgangskode</label>
            <input
              type="password"
              value={nuvaerende}
              onChange={e => setNuvaerende(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Ny adgangskode</label>
            <input
              type="password"
              value={nyKode}
              onChange={e => setNyKode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Bekræft ny adgangskode</label>
            <input
              type="password"
              value={bekraeft}
              onChange={e => setBekraeft(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {kodeFejl && <p className="text-xs text-red-500">{kodeFejl}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={kodeGemmer || !nuvaerende || !nyKode || !bekraeft}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {kodeGemmer ? 'Skifter…' : 'Skift adgangskode'}
            </button>
            {kodeOk && <p className="text-xs text-emerald-600 font-medium">Adgangskode skiftet!</p>}
          </div>
        </div>
      </form>

    </div>
  );
}
