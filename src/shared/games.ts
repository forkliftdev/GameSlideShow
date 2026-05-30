// Shared domain types + constants for the Word Game Arcade launchpad.
// Used by both the server (Redis read/write) and the client (carousel + admin).

/** Power mods allowed to manage games. Enforced SERVER-SIDE in every privileged endpoint. */
export const POWER_MODS = ['theforkliftdev', 'badasimo'] as const;

/** All genre tags. Each maps to a launchpad tab and is selectable in the submission forms. */
export const GENRE_TAGS = [
  'guess',
  'grouping',
  'word_search',
  'trivia',
  'spelling',
  'crossword',
  'picture',
] as const;
export type GenreTag = (typeof GENRE_TAGS)[number];

/** Short human label shown on tabs and under each card. */
export const GENRE_LABELS: Record<GenreTag, string> = {
  guess: 'Guess',
  grouping: 'Grouping',
  word_search: 'Word Search',
  trivia: 'Trivia',
  spelling: 'Spelling',
  crossword: 'Crossword',
  picture: 'Picture',
};

export type GameStatus = 'active' | 'pending' | 'aged_out';

export type Game = {
  name: string;
  /** Display string, e.g. "r/Word_Trail_Game". */
  subreddit: string;
  /** Normalized slug used as the Redis key, e.g. "Word_Trail_Game". */
  subreddit_slug: string;
  /** Empty string => modmail features are skipped for this game. */
  dev_username: string;
  /** ISO 8601 date, YYYY-MM-DD. */
  founded_date: string;
  genre_tags: GenreTag[];
  subscribers: number;
  /** ISO date of last subscriber refresh. */
  subscribers_updated?: string;
  status: GameStatus;
  /** #hex tile accent color. */
  color: string;
  /** Thumbnail fallback emoji. */
  emoji: string;
  /** Preferred round thumbnail (community icon URL). */
  icon_url?: string;
  /** Internal mod note, not shown on the card. */
  notes: string;
  approved_by?: string;
  approved_date?: string;
  /** Set (with an ISO date) when a subscriber refresh fails; never auto-removes the game. */
  fetch_error?: string;
};

/** Tab identifiers for the carousel. Genre tabs reuse the GenreTag value. */
export type TabId = 'all' | 'recent' | 'popular' | 'new' | 'deep_cuts' | GenreTag;

export type Tab = { id: TabId; label: string };

/** Number of subscribers a game needs to appear in the Popular tab. */
export const POPULAR_MIN_SUBSCRIBERS = 1000;
/** A game is "New" for this many months after its founded_date. */
export const NEW_TAB_MONTHS = 6;

/** Ordered tab list: All, Recent, Popular, New, Deep Cuts, then one tab per genre. */
export const TABS: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'New' },
  { id: 'deep_cuts', label: 'Deep Cuts' },
  ...GENRE_TAGS.map((tag) => ({ id: tag, label: GENRE_LABELS[tag] })),
];

// ----- API response types -----

export type GamesResponse = { type: 'games'; games: Game[] };

export type AdminQueueResponse =
  | { type: 'queue'; authorized: true; games: Game[] }
  | { type: 'queue'; authorized: false };

export type AdminActionResponse = {
  type: 'admin-action';
  ok: boolean;
  message?: string;
};

export type ApiErrorResponse = { status: 'error'; message: string };

// ----- Pure filtering/sorting helpers (shared by client; testable) -----

const monthsAgo = (isoDate: string, now: number): number => {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now - t) / (1000 * 60 * 60 * 24 * 30.44);
};

const byFoundedDesc = (a: Game, b: Game): number =>
  (Date.parse(b.founded_date) || 0) - (Date.parse(a.founded_date) || 0);

/** Games shown under a given tab, already sorted for display. `now` = Date.now(). */
export const gamesForTab = (games: Game[], tab: TabId, now: number): Game[] => {
  switch (tab) {
    case 'all':
      // No semantic order; the carousel shuffles random tabs for display variety.
      return [...games];
    case 'recent':
      return [...games].sort(byFoundedDesc);
    case 'popular':
      return games
        .filter((g) => g.subscribers >= POPULAR_MIN_SUBSCRIBERS)
        .sort((a, b) => b.subscribers - a.subscribers);
    case 'new':
      return games
        .filter((g) => monthsAgo(g.founded_date, now) <= NEW_TAB_MONTHS)
        .sort(byFoundedDesc);
    case 'deep_cuts':
      // Established but under-the-radar: older than "New", below the Popular threshold.
      // Order is randomized (see isRandomTab) so the long tail rotates into view.
      return games.filter(
        (g) =>
          monthsAgo(g.founded_date, now) > NEW_TAB_MONTHS &&
          g.subscribers < POPULAR_MIN_SUBSCRIBERS
      );
    default:
      // Genre tab: games carrying this tag, most recent first.
      return games.filter((g) => g.genre_tags.includes(tab)).sort(byFoundedDesc);
  }
};

/** Case-insensitive name filter. */
export const matchesSearch = (game: Game, query: string): boolean =>
  game.name.toLowerCase().includes(query.trim().toLowerCase());

/**
 * Search terms that resolve to a whole genre group. Lets users search by the famous
 * brand name and land on the equivalent mechanic genre (no trademark in the UI itself).
 */
export const SEARCH_ALIASES: Record<string, GenreTag> = {
  wordle: 'guess',
  connections: 'grouping',
  connection: 'grouping',
};

/** If the query contains a known alias term, return the genre tag it maps to. */
export const aliasForQuery = (query: string): GenreTag | undefined => {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  for (const [term, tag] of Object.entries(SEARCH_ALIASES)) {
    if (q.includes(term)) return tag;
  }
  return undefined;
};

/**
 * Resolve a search query to a tab, if it maps to one: brand-name aliases (e.g. "wordle")
 * first, then an exact match on a tab's label (e.g. "picture", "popular", "word search").
 * Exact label match is used so partial names (e.g. "pic") still fall through to name search.
 */
export const resolveQueryToTab = (query: string): TabId | undefined => {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const alias = aliasForQuery(q);
  if (alias) return alias;
  return TABS.find((t) => t.label.toLowerCase() === q)?.id;
};

/** First genre tag's short label, used as the single caption under a card. */
export const primaryGenreLabel = (game: Game): string =>
  game.genre_tags[0] ? GENRE_LABELS[game.genre_tags[0]] : 'Other';

/**
 * Tabs whose games display in random order ("All" + genre tabs). Recent/Popular/New keep
 * their meaningful sort (date / subscribers / date).
 */
export const isRandomTab = (tab: TabId): boolean =>
  tab === 'all' ||
  tab === 'deep_cuts' ||
  (GENRE_TAGS as readonly string[]).includes(tab);

const hashKey = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Deterministic shuffle: random order per `seed`, but stable across re-renders for the same
 * seed (so the row doesn't reshuffle while you type). Pass a fresh seed per page load.
 */
export const shuffleStable = <T extends { subreddit_slug: string }>(
  items: T[],
  seed: number
): T[] =>
  [...items].sort(
    (a, b) => hashKey(a.subreddit_slug + seed) - hashKey(b.subreddit_slug + seed)
  );
