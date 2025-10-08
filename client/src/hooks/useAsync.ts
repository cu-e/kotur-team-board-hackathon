import { useCallback, useEffect, useState } from 'react';
import { Toast } from '@skbkontur/react-ui';

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList, immediate = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);
  const exec = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res);
    } catch (e: any) {
      setError(e);
      Toast.push(e?.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    if (immediate) void exec();
  }, [exec, immediate]);
  return { data, loading, error, reload: exec, setData } as const;
}
