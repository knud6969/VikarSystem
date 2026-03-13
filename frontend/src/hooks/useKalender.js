import { useState, useEffect, useCallback } from 'react';
import { lektionService } from '../api/lektionService';
import { fravaerService } from '../api/fravaerService';
import { tildelingService } from '../api/tildelingService';
import { tilgaengelighedService } from '../api/tilgaengelighedService';

/**
 * useKalender — henter og strukturerer data til ugekalenderen.
 * Returnerer lektioner, fravær, tildelinger og vikartilgængelighed.
 */
export function useKalender(mandag) {
  const [lektioner,       setLektioner]       = useState([]);
  const [fravaer,         setFravaer]         = useState([]);
  const [tildelinger,     setTildelinger]     = useState([]);
  const [tilgaengelighed, setTilgaengelighed] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  const hent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, f, t, tg] = await Promise.all([
        lektionService.getAll(),
        fravaerService.getAll(),
        tildelingService.getAll(),
        tilgaengelighedService.getAlle(),
      ]);
      setLektioner(l);
      setFravaer(f);
      setTildelinger(t);
      setTilgaengelighed(tg);
    } catch (err) {
      setError(err.message || 'Kunne ikke hente kalenderdata');
    } finally {
      setLoading(false);
    }
  }, [mandag]);

  useEffect(() => { hent(); }, [hent]);

  return { lektioner, fravaer, tildelinger, tilgaengelighed, loading, error, refetch: hent };
}