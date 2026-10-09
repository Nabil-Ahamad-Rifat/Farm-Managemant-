import { useState, useCallback, useEffect } from 'react';
import { mobileApiClient } from '@/src/lib/apiClient';

// Fetch/pull-to-refresh/error state shared by every list screen (Cows,
// Employees, Feed, Sales, Income, Expenses) — each just parameterizes the
// endpoint and item type.
export function useCrudList<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const data = await mobileApiClient.get<T[]>(endpoint, 'Failed to load data');
      setItems(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [endpoint]);

  useEffect(() => {
    // `loading` already starts true and `endpoint` is always a literal at
    // every call site (this effect only ever runs once, on mount) — no need
    // to re-arm it here. setLoading(false) only runs once the promise
    // settles, not synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  async function refresh() {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }

  return { items, loading, refreshing, error, refresh, reload: fetchItems };
}
