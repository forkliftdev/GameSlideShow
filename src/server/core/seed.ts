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

  // ----- Round-2: live-sub games imported from the Combined Intake sheet -----
  // Only games with a real dedicated subreddit are included (Ecosystem Installs /
  // "no sub" rows were skipped). `subscribers` is the best available fallback —
  // enrichFromSubreddit() overrides it with the live count at seed time.
  // genre_tags are INFERRED from the intake's "Category" column — review before launch.
  {
    name: 'GameFox',
    subreddit: 'r/gamefox',
    subreddit_slug: 'gamefox',
    dev_username: '',
    founded_date: '2024-10-05',
    genre_tags: ['guess'],
    subscribers: 586,
    color: '#d96941',
    emoji: '🦊',
    notes: 'Bot-assisted: stable core pool supplemented by external daily comment hooks',
    status: 'active',
  },
  // Detective Puzzles: 4 games share one sub (r/DetectivePuzzles). Enrichment gives them
  // the same sub icon/color/subscriber count unless each is later given its own icon_url.
  {
    name: 'Detective Search',
    subreddit: 'r/DetectivePuzzles',
    subreddit_slug: 'DetectivePuzzles',
    dev_username: '',
    founded_date: '2025-06-14',
    genre_tags: ['word_search'],
    subscribers: 94,
    color: '#3d405b',
    emoji: '🕵️',
    notes: 'Shared sub (4 Detective games). Struggling: low conversion on multi-game menu',
    status: 'active',
  },
  {
    name: 'Detective Scramble',
    subreddit: 'r/DetectivePuzzles',
    subreddit_slug: 'DetectivePuzzles',
    dev_username: '',
    founded_date: '2025-06-14',
    genre_tags: ['spelling'],
    subscribers: 94,
    color: '#5f6caf',
    emoji: '🔀',
    notes: 'Shared sub (r/DetectivePuzzles); unscramble variant',
    status: 'active',
  },
  {
    name: 'Detective Daily',
    subreddit: 'r/DetectivePuzzles',
    subreddit_slug: 'DetectivePuzzles',
    dev_username: '',
    founded_date: '2025-06-15',
    genre_tags: ['guess'],
    subscribers: 94,
    color: '#2a9d8f',
    emoji: '📅',
    notes: 'Shared sub (r/DetectivePuzzles); daily detective puzzle',
    status: 'active',
  },
  {
    name: 'Detective Connections',
    subreddit: 'r/DetectivePuzzles',
    subreddit_slug: 'DetectivePuzzles',
    dev_username: '',
    founded_date: '2025-07-02',
    genre_tags: ['grouping'],
    subscribers: 94,
    color: '#8338ec',
    emoji: '🔗',
    notes: 'Shared sub (r/DetectivePuzzles); Connections-style grouping',
    status: 'active',
  },
  {
    name: 'GIF Enigma',
    subreddit: 'r/GifEnigma',
    subreddit_slug: 'GifEnigma',
    dev_username: '',
    founded_date: '2026-05-05',
    genre_tags: ['picture', 'guess'],
    subscribers: 11,
    color: '#7209b7',
    emoji: '🎞️',
    notes: 'Stalled: faded instantly post-launch',
    status: 'active',
  },
  {
    name: 'Wordungus',
    subreddit: 'r/wordungus',
    subreddit_slug: 'wordungus',
    dev_username: '',
    founded_date: '2026-02-26',
    genre_tags: ['guess'],
    subscribers: 418,
    color: '#9b5de5',
    emoji: '🍄',
    notes: 'The Trap: strong historical sign-ups, active traffic fallen to a fraction of members',
    status: 'active',
  },
  {
    name: 'Ladder Climb',
    subreddit: 'r/Laddergram',
    subreddit_slug: 'Laddergram',
    dev_username: '',
    founded_date: '2025-01-22',
    genre_tags: ['spelling'],
    subscribers: 0,
    color: '#2a6f97',
    emoji: '🪜',
    notes: 'Word ladder; no growth data in intake',
    status: 'active',
  },
  {
    name: 'WordMaxed Mini',
    subreddit: 'r/wordmaxed',
    subreddit_slug: 'wordmaxed',
    dev_username: '',
    founded_date: '2025-04-19',
    genre_tags: ['guess'],
    subscribers: 6,
    color: '#e76f51',
    emoji: '📈',
    notes: 'Stalled: single digits (Sheet1 listed 640, Sheet2 6 — verify)',
    status: 'active',
  },
  {
    name: 'Mind the Word',
    subreddit: 'r/mindtheword',
    subreddit_slug: 'mindtheword',
    dev_username: '',
    founded_date: '2025-08-08',
    genre_tags: ['guess'],
    subscribers: 2,
    color: '#6d597a',
    emoji: '🧠',
    notes: 'Latent: still testing (Sheet1 listed 310, Sheet2 2 — verify)',
    status: 'active',
  },
  {
    name: 'Word Grind',
    subreddit: 'r/wordgrind',
    subreddit_slug: 'wordgrind',
    dev_username: '',
    founded_date: '2025-03-22',
    genre_tags: ['spelling'],
    subscribers: 750,
    color: '#52489c',
    emoji: '⚙️',
    notes: 'Letter-rack word-finder; no Sheet2 growth data',
    status: 'active',
  },
  {
    name: 'Proximity',
    subreddit: 'r/proximitygame',
    subreddit_slug: 'proximitygame',
    dev_username: '',
    founded_date: '2025-02-14',
    genre_tags: ['guess'],
    subscribers: 32,
    color: '#ef476f',
    emoji: '🧲',
    notes: 'Dormant: abandoned funnel (Sheet1 listed 1,890, Sheet2 32 — verify)',
    status: 'active',
  },
  {
    name: 'Which is fake?',
    subreddit: 'r/WhichIsFake',
    subreddit_slug: 'WhichIsFake',
    dev_username: '',
    founded_date: '2025-05-20',
    genre_tags: ['trivia'],
    subscribers: 19,
    color: '#ffb703',
    emoji: '🎭',
    notes: 'Early launch: gathering initial core sign-ups',
    status: 'active',
  },
  {
    name: 'Word Pool',
    subreddit: 'r/wordpool',
    subreddit_slug: 'wordpool',
    dev_username: '',
    founded_date: '2025-07-11',
    genre_tags: ['spelling'],
    subscribers: 430,
    color: '#118ab2',
    emoji: '🏊',
    notes: 'Word puzzle; no Sheet2 growth data',
    status: 'active',
  },
  {
    name: 'SumWords',
    subreddit: 'r/SumWords',
    subreddit_slug: 'SumWords',
    dev_username: '',
    founded_date: '2025-09-03',
    genre_tags: ['spelling'],
    subscribers: 290,
    color: '#073b4c',
    emoji: '➕',
    notes: 'Math & word puzzle; no Sheet2 growth data',
    status: 'active',
  },
  {
    name: 'WordPaws',
    subreddit: 'r/WordPaws',
    subreddit_slug: 'WordPaws',
    dev_username: '',
    founded_date: '2025-11-18',
    genre_tags: ['guess'],
    subscribers: 510,
    color: '#c08552',
    emoji: '🐈',
    notes: 'Cozy word game; no Sheet2 growth data',
    status: 'active',
  },
  {
    name: 'Redacted',
    subreddit: 'r/RedactedGame',
    subreddit_slug: 'RedactedGame',
    dev_username: '',
    founded_date: '2025-03-05',
    genre_tags: ['trivia', 'guess'],
    subscribers: 1150,
    color: '#222222',
    emoji: '🖍️',
    notes: 'Word puzzle / trivia; no Sheet2 growth data',
    status: 'active',
  },
  {
    name: 'Snap Guess',
    subreddit: 'r/SnapGuess',
    subreddit_slug: 'SnapGuess',
    dev_username: '',
    founded_date: '2025-06-30',
    genre_tags: ['picture', 'guess'],
    subscribers: 840,
    color: '#ff6b6b',
    emoji: '📸',
    notes: 'Image guessing; no Sheet2 growth data',
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
