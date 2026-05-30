import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { context } from '@devvit/web/client';
import {
  gamesForTab,
  isRandomTab,
  matchesSearch,
  resolveQueryToTab,
  shuffleStable,
  TABS,
  type Game,
  type TabId,
} from '../../shared/games';
import { useGames } from '../hooks/useGames';
import { CarouselTabs } from './CarouselTabs';
import { GameCard } from './GameCard';
import { SearchBar } from './SearchBar';

export const Launchpad = () => {
  const { games, loading, error } = useGames();
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  // Capture "now" once on mount so the "New" tab cutoff is stable across re-renders.
  const [now] = useState(() => Date.now());
  // Fresh shuffle order per page load, stable across re-renders within that load.
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const rowRef = useRef<HTMLDivElement>(null);

  // A query that maps to a tab (alias like "wordle", or a tab name like "picture")
  // drives the active underline; otherwise the manually-selected tab stays underlined.
  const resolvedTab = resolveQueryToTab(query);
  const activeTab = resolvedTab ?? tab;

  // Game count per tab, shown next to each label.
  const counts = useMemo(() => {
    const map = {} as Record<TabId, number>;
    for (const t of TABS) map[t.id] = gamesForTab(games, t.id, now).length;
    return map;
  }, [games, now]);

  const visible = useMemo(() => {
    const q = query.trim();
    const forTab = (t: TabId): Game[] => {
      const base = gamesForTab(games, t, now);
      return isRandomTab(t) ? shuffleStable(base, seed) : base;
    };
    if (!q) return forTab(tab);
    if (resolvedTab) return forTab(resolvedTab);
    // Otherwise, a global name search across every game.
    return games.filter((g) => matchesSearch(g, q));
  }, [games, tab, query, now, resolvedTab, seed]);

  const selectTab = (id: TabId) => {
    setTab(id);
    setQuery('');
  };

  // Enter commits a resolved genre/tab search: keep the tab, collapse the field.
  const submitSearch = () => {
    if (resolvedTab) {
      setTab(resolvedTab);
      setQuery('');
    }
  };

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // On tab/search change, reset to the start and re-measure (deferred to keep the linter
  // happy and to read post-layout scroll dimensions).
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0 });
    const id = requestAnimationFrame(updateScrollButtons);
    return () => cancelAnimationFrame(id);
  }, [visible, updateScrollButtons]);

  const scrollBy = (dir: 1 | -1) => {
    rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0e12] text-white p-3 sm:p-4">
      {/* Header above the panel */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h1 className="text-lg sm:text-xl font-bold">Word Game Arcade</h1>
        <span className="text-xs text-gray-400">
          {context.subredditName ? `r/${context.subredditName}` : ''}
        </span>
      </div>

      {/* Launchpad panel */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1216] p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <CarouselTabs active={activeTab} counts={counts} onChange={selectTab} />
          <div className="shrink-0">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={submitSearch}
            />
          </div>
        </div>

        {loading ? (
          <div className="h-[240px] flex items-center justify-center text-gray-400">
            Loading…
          </div>
        ) : error ? (
          <div className="h-[240px] flex items-center justify-center text-gray-400">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-gray-400">
            No games here yet
          </div>
        ) : (
          <div className="relative">
            <div
              ref={rowRef}
              onScroll={updateScrollButtons}
              className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
            >
              {visible.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
            {/* Scroll controls sit in the bottom corners of the tiles, clear of the icons. */}
            {canLeft && (
              <button
                aria-label="Scroll left"
                onClick={() => scrollBy(-1)}
                className="absolute left-1 top-[156px] w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white text-lg cursor-pointer hover:bg-black/80"
              >
                ‹
              </button>
            )}
            {canRight && (
              <button
                aria-label="Scroll right"
                onClick={() => scrollBy(1)}
                className="absolute right-1 top-[156px] w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white text-lg cursor-pointer hover:bg-black/80"
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
