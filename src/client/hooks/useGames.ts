import { useEffect, useState } from 'react';
import type { Game, GamesResponse } from '../../shared/games';

type GamesState = {
  games: Game[];
  loading: boolean;
  error: string | null;
};

/** Fetches the active games once for the carousel. Filtering happens client-side. */
export const useGames = (): GamesState => {
  const [state, setState] = useState<GamesState>({
    games: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GamesResponse = await res.json();
        setState({ games: data.games, loading: false, error: null });
      } catch (err) {
        console.error('Failed to load games', err);
        setState({ games: [], loading: false, error: 'Failed to load games' });
      }
    };
    void load();
  }, []);

  return state;
};
