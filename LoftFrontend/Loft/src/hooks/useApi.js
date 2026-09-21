import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';

/**
 * Generic fetch hook.
 * Usage: const { data, loading, error, refetch } = useApi('/scores/');
 * Pass `skip: true` to defer the initial fetch (trigger manually via refetch).
 */
export function useApi(url, { skip = false } = {}) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error,   setError]   = useState(null);

  const fetch_ = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(url);
      /* Handle DRF paginated responses transparently */
      setData(res.data?.results ?? res.data);
    } catch (e) {
      setError(e?.response?.data?.detail ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { if (!skip) fetch_(); }, [fetch_, skip]);

  return { data, loading, error, refetch: fetch_ };
}

/** Convenience hook for subscription status — used in several pages */
export function useSubscription() {
  const { data, loading, refetch } = useApi('/subscriptions/status/');
  return { sub: data, loading, refetch };
}
