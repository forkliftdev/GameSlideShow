import { useCallback, useEffect, useState } from 'react';
import type {
  AdminActionResponse,
  AdminQueueResponse,
  Game,
} from '../../shared/games';

type AdminState = {
  authorized: boolean;
  games: Game[];
  loading: boolean;
};

export const useAdminQueue = () => {
  const [state, setState] = useState<AdminState>({
    authorized: false,
    games: [],
    loading: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/queue');
        const data: AdminQueueResponse = await res.json();
        if (data.authorized) {
          setState({ authorized: true, games: data.games, loading: false });
        } else {
          setState({ authorized: false, games: [], loading: false });
        }
      } catch (err) {
        console.error('Failed to load admin queue', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };
    void load();
  }, []);

  const act = useCallback(
    async (action: 'approve' | 'reject', id: string) => {
      try {
        const res = await fetch(`/api/admin/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data: AdminActionResponse = await res.json();
        if (data.ok) {
          setState((prev) => ({
            ...prev,
            games: prev.games.filter((g) => g.id !== id),
          }));
        }
      } catch (err) {
        console.error(`Failed to ${action} ${id}`, err);
      }
    },
    []
  );

  return {
    ...state,
    approve: (id: string) => act('approve', id),
    reject: (id: string) => act('reject', id),
  } as const;
};
