import { useState, useEffect, useCallback } from 'react';
import { lektionService } from '../api/lektionService';
import { fravaerService } from '../api/fravaerService';
import { tildelingService } from '../api/tildelingService';

/**
 * useKalender — henter og strukturerer data til ugekalenderen.
 *
 * Returnerer lektioner grupperet per dag, aktive fravær og tildelinger.
 * Al datahentning og -transformation sker her — ikke i komponenten.
 */
export function useKalender(mandag) {
  const [lektioner,   setLektioner]   = useState([]);
  const [fravaer,     setFravaer]     = useState([]);
  const [tildelinger, setTildelinger] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const hent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, f, t] = await Promise.all([
        lektionService.getAll(),
        fravaerService.getAll(),
        tildelingService.getAll(),
      ]);
      setLektioner(l);
      setFravaer(f);
      setTildelinger(t);
    } catch (err) {
      setError(err.message || 'Kunne ikke hente kalenderdata');
    } finally {
      setLoading(false);
    }
  }, [mandag]);

  useEffect(() => { hent(); }, [hent]);

  return { lektioner, fravaer, tildelinger, loading, error, refetch: hent };
}