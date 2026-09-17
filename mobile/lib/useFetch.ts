import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api";

/** Loads `fn()` on mount and whenever `deps` change; call `refetch` to redo it.
 *  Pass `null` as `fn` to skip the fetch entirely (e.g. when the caller is
 *  not authorised to use the endpoint). The hook will immediately settle with
 *  `loading: false` and `data: null`. */
export function useFetch<T>(
  fn: (() => Promise<T>) | null,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(fn !== null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (fn === null) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // fn is recreated every render by design; callers pass their own deps array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn === null, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
