import { useState, useEffect, useCallback } from 'react';

/**
 * Generisk hook til async datahentning.
 * Håndterer loading, error og data state ét sted.
 *
 * @param {Function} serviceFn - Async funktion der returnerer data
 * @param {Array}    deps      - Afhængigheder der trigger re-fetch
 *
 * @example
 * const { data, loading, error, refetch } = useApi(laererService.getAll, []);
 */
export function useApi(serviceFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Noget gik galt');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
