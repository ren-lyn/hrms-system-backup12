import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';

/**
 * Optimized data fetching hook with caching, deduplication, and SWR-like features
 * @param {string} key - Unique key for the request
 * @param {Function} fetcher - Function that returns a promise with data
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, error, loading, mutate, isValidating }
 */
export function useOptimizedFetch(key, fetcher, options = {}) {
  const {
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    refreshInterval = 0,
    dedupingInterval = 2000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  
  const lastFetchTime = useRef(0);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (skipDedup = false) => {
    // Deduplication: Skip if fetched recently
    const now = Date.now();
    if (!skipDedup && now - lastFetchTime.current < dedupingInterval) {
      return;
    }

    try {
      setIsValidating(true);
      lastFetchTime.current = now;
      
      const result = await fetcher();
      
      if (isMounted.current) {
        setData(result);
        setError(null);
        setLoading(false);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err);
        setLoading(false);
        
        if (onError) {
          onError(err);
        }
      }
    } finally {
      if (isMounted.current) {
        setIsValidating(false);
      }
    }
  }, [fetcher, dedupingInterval, onSuccess, onError]);

  // Mutate function to manually trigger refetch or update data
  const mutate = useCallback((newData, shouldRevalidate = true) => {
    if (newData !== undefined) {
      setData(newData);
    }
    if (shouldRevalidate) {
      fetchData(true);
    }
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, fetchData]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handleOnline = () => {
      fetchData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, fetchData]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    error,
    loading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for paginated data fetching
 */
export function usePaginatedFetch(key, fetcher, options = {}) {
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const fetcherWithPage = useCallback(() => {
    return fetcher(page);
  }, [fetcher, page]);

  const { data, error, loading, isValidating, mutate } = useOptimizedFetch(
    `${key}_page_${page}`,
    fetcherWithPage,
    options
  );

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllData(data.items || data);
      } else {
        setAllData(prev => [...prev, ...(data.items || data)]);
      }
      
      setHasMore(data.hasMore !== undefined ? data.hasMore : (data.items?.length > 0));
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    error,
    loading,
    isValidating,
    hasMore,
    loadMore,
    reset,
    mutate,
  };
}

export default useOptimizedFetch;
