import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export function useSupabaseRealtime(table, filter = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionKey, setSubscriptionKey] = useState(0);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from(table).select('*');
      
      if (filter) {
        Object.keys(filter).forEach(key => {
          query = query.eq(key, filter[key]);
        });
      }

      const { data: freshData, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setData(freshData || []);
      setLoading(false);
    } catch (err) {
      console.error('Refetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [table, filter]);

  useEffect(() => {
    let subscription;

    const setupRealtimeListener = async () => {
      try {
        // Fetch initial data
        let query = supabase.from(table).select('*');
        
        if (filter) {
          Object.keys(filter).forEach(key => {
            query = query.eq(key, filter[key]);
          });
        }

        const { data: initialData, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        setData(initialData || []);
        setLoading(false);

        // Setup realtime listener
        subscription = supabase
          .channel(`public:${table}:${subscriptionKey}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
            },
            (payload) => {
              console.log('Realtime update:', payload);
              setData(current => {
                const updated = [...current];
                
                if (payload.eventType === 'INSERT') {
                  return [payload.new, ...updated];
                } else if (payload.eventType === 'UPDATE') {
                  return updated.map(item => 
                    item.id === payload.new.id ? payload.new : item
                  );
                } else if (payload.eventType === 'DELETE') {
                  return updated.filter(item => item.id !== payload.old.id);
                }
                
                return updated;
              });
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Realtime setup error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupRealtimeListener();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [table, filter, subscriptionKey]);

  return { data, loading, error, refetch };
}
