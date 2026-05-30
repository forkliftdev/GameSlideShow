// Round-1 seed data. seedGames() is idempotent: it skips a game whose hash already exists
// unless `force` is set. On seed, each game is enriched from its live subreddit — community
// icon, brand color, and current subscriber count — falling back to the values below.

import { reddit } from '@devvit/web/server';
import { getGame, putGame } from './games';
import { slugify, type Game } from '../../shared/games';

/** Seed entries omit `id`; it's derived from the name at seed time. */
type SeedGame = Omit<Game, 'id'>;

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Pull subscriber count from the host subreddit (always — it's the universal metric, and is
 * shared by every game on that sub). Community icon + brand color are pulled ONLY when the
 * game has no icon of its own: single-game subs get the sub's branding, while games that
 * share a sub (multiple games, one subreddit) must set their own icon/color and are left
 * untouched. Failures (private/missing sub) keep the game's existing values.
 */
const enrichFromSubreddit = async (game: Game): Promise<Game> => {
  try {
    const sub = await reddit.getSubredditByName(game.subreddit_slug);
    const subscribers = sub.numberOfSubscribers ?? game.subscribers;
    if (game.icon_url) {
      // Self-presented game (e.g. one of several on a shared sub): keep its icon/color.
      return { ...game, subscribers, subscribers_updated: today() };
    }
    // Keep the full icon URL incl. query string — it carries a required signature. Just unescape.
    const icon = sub.settings.communityIcon?.replace(/&amp;/g, '&');
    const color = sub.settings.primaryColor || sub.settings.keyColor;
    return {
      ...game,
      icon_url: icon || game.icon_url,
      color: color || game.color,
      subscribers,
      subscribers_updated: today(),
    };
  } catch (error) {
    console.error(`Could not enrich ${game.subreddit_slug}:`, error);
    return game;
  }
};

export const SEED_GAMES: SeedGame[] = [
  {
    name: 'Word Trail Game',
    subreddit: 'r/Word_Trail_Game',
    subreddit_slug: 'Word_Trail_Game',
    dev_username: '',
    founded_date: '2025-08-20',
    genre_tags: ['guess', 'spelling'],
    subscribers: 2900,
    color: '#2d6a4f',
    emoji: '🐾',
    notes: 'Particle-based trail velocity game; highly active',
    status: 'active',
  },
  {
    name: 'Hexaword',
    subreddit: 'r/hexaword',
    subreddit_slug: 'hexaword',
    dev_username: '',
    founded_date: '2025-09-12',
    genre_tags: ['guess', 'crossword'],
    subscribers: 2000,
    color: '#1a472a',
    emoji: '⬡',
    notes: 'Mature independent grid; exceptional baseline player retention',
    status: 'active',
  },
  {
    name: 'Lettered',
    subreddit: 'r/Lettered',
    subreddit_slug: 'Lettered',
    dev_username: '',
    founded_date: '2025-12-05',
    genre_tags: ['spelling'],
    subscribers: 850,
    color: '#4a4e69',
    emoji: '🔤',
    notes: 'Phrase-fitting drag/place puzzle; steady ascension',
    status: 'active',
  },
  {
    name: '4 Pics 1 Word',
    subreddit: 'r/4pics1word',
    subreddit_slug: '4pics1word',
    dev_username: '',
    founded_date: '2026-05-02',
    genre_tags: ['picture', 'trivia'],
    subscribers: 580,
    color: '#e07a5f',
    emoji: '🖼️',
    notes: 'Visual scaling mechanics; in carousel at r/gamesonreddit',
    status: 'active',
  },
  {
    name: 'FlexWord',
    subreddit: 'r/FlexWord',
    subreddit_slug: 'FlexWord',
    dev_username: 'theforkliftdev',
    founded_date: '2026-05-05',
    genre_tags: ['guess'],
    subscribers: 264,
    color: '#007ACC',
    emoji: '💪',
    notes: 'High core interaction ratio; organic growth',
    status: 'active',
  },
  {
    name: 'Letterset',
    subreddit: 'r/letterset',
    subreddit_slug: 'letterset',
    dev_username: '',
    founded_date: '2026-05-12',
    genre_tags: ['grouping', 'spelling'],
    subscribers: 125,
    color: '#f4a261',
    emoji: '🃏',
    notes: 'Powerful 1:1 engagement density; in carousel at r/gamesonreddit',
    status: 'active',
  },
  {
    name: 'CluesWord',
    subreddit: 'r/cluesword',
    subreddit_slug: 'cluesword',
    dev_username: '',
    founded_date: '2026-02-09',
    genre_tags: ['trivia', 'guess'],
    subscribers: 115,
    color: '#457b9d',
    emoji: '🔍',
    notes: 'Wordle-style hangman trivia; showing early leg depth',
    status: 'active',
  },
  {
    name: 'Wordseekr',
    subreddit: 'r/wordseekr',
    subreddit_slug: 'wordseekr',
    dev_username: '',
    founded_date: '2025-09-15',
    genre_tags: ['word_search', 'grouping'],
    subscribers: 94,
    color: '#6b4226',
    emoji: '🔎',
    notes: '',
    status: 'active',
  },
];

/**
 * Seed round-1 games. Returns how many were written.
 * Existing games are skipped unless `force` is true.
 */
export const seedGames = async (force = false): Promise<number> => {
  let written = 0;
  for (const game of SEED_GAMES) {
    const withId: Game = { ...game, id: slugify(game.name) };
    if (!force) {
      const existing = await getGame(withId.id);
      if (existing) continue;
    }
    const enriched = await enrichFromSubreddit(withId);
    await putGame(enriched);
    written++;
  }
  return written;
};
