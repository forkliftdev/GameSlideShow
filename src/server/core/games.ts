// Redis read/write helpers for game records. The client never touches Redis directly;
// it goes through the /api/* routes which call into here.
//
// Storage model (Devvit Redis has hashes + sorted sets, but NO plain sets):
//   game:{id}      Hash         all game fields, stringified (id is the game slug, not the sub)
//   games:index    Sorted set   active game ids, scored by founded_date epoch
//   games:pending  Sorted set   pending game ids, scored by submission time

import { redis } from '@devvit/web/server';
import {
  GENRE_TAGS,
  type Game,
  type GenreTag,
  type GameStatus,
} from '../../shared/games';

const INDEX_KEY = 'games:index';
const PENDING_KEY = 'games:pending';

const gameKey = (id: string): string => `game:${id}`;

const foundedScore = (foundedDate: string): number => {
  const t = Date.parse(foundedDate);
  return Number.isNaN(t) ? 0 : t;
};

const parseGenreTags = (raw: string): GenreTag[] => {
  const valid = new Set<string>(GENRE_TAGS);
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is GenreTag => valid.has(t));
};

const serializeGame = (game: Game): Record<string, string> => {
  const record: Record<string, string> = {
    id: game.id,
    name: game.name,
    subreddit: game.subreddit,
    subreddit_slug: game.subreddit_slug,
    dev_username: game.dev_username,
    founded_date: game.founded_date,
    genre_tags: game.genre_tags.join(','),
    subscribers: String(game.subscribers),
    status: game.status,
    color: game.color,
    emoji: game.emoji,
    notes: game.notes,
  };
  if (game.url) record.url = game.url;
  if (game.subscribers_updated)
    record.subscribers_updated = game.subscribers_updated;
  if (game.icon_url) record.icon_url = game.icon_url;
  if (game.approved_by) record.approved_by = game.approved_by;
  if (game.approved_date) record.approved_date = game.approved_date;
  if (game.fetch_error) record.fetch_error = game.fetch_error;
  return record;
};

const deserializeGame = (hash: Record<string, string>): Game => ({
  id: hash.id ?? hash.subreddit_slug ?? '',
  name: hash.name ?? '',
  subreddit: hash.subreddit ?? '',
  subreddit_slug: hash.subreddit_slug ?? '',
  url: hash.url || undefined,
  dev_username: hash.dev_username ?? '',
  founded_date: hash.founded_date ?? '',
  genre_tags: parseGenreTags(hash.genre_tags ?? ''),
  subscribers: hash.subscribers ? parseInt(hash.subscribers, 10) : 0,
  subscribers_updated: hash.subscribers_updated || undefined,
  status: (hash.status as GameStatus) || 'active',
  color: hash.color ?? '#1f2937',
  emoji: hash.emoji ?? '',
  icon_url: hash.icon_url || undefined,
  notes: hash.notes ?? '',
  approved_by: hash.approved_by || undefined,
  approved_date: hash.approved_date || undefined,
  fetch_error: hash.fetch_error || undefined,
});

/** Read a single game by id, or undefined if it doesn't exist. */
export const getGame = async (id: string): Promise<Game | undefined> => {
  const hash = await redis.hGetAll(gameKey(id));
  if (!hash || Object.keys(hash).length === 0) return undefined;
  return deserializeGame(hash);
};

const listGames = async (indexKey: string): Promise<Game[]> => {
  const members = await redis.zRange(indexKey, 0, -1);
  const games = await Promise.all(
    members.map(({ member }) => getGame(member))
  );
  return games.filter((g): g is Game => g !== undefined);
};

/** All active games (for the public carousel). */
export const listActiveGames = (): Promise<Game[]> => listGames(INDEX_KEY);

/** All pending submissions (for the admin queue). */
export const listPendingGames = (): Promise<Game[]> => listGames(PENDING_KEY);

/**
 * Write a game's hash and place its id in the correct index sorted set.
 * Active games go in games:index; pending go in games:pending.
 */
export const putGame = async (game: Game): Promise<void> => {
  await redis.hSet(gameKey(game.id), serializeGame(game));
  if (game.status === 'pending') {
    await redis.zAdd(PENDING_KEY, { member: game.id, score: Date.now() });
    await redis.zRem(INDEX_KEY, [game.id]);
  } else {
    await redis.zAdd(INDEX_KEY, {
      member: game.id,
      score: foundedScore(game.founded_date),
    });
    await redis.zRem(PENDING_KEY, [game.id]);
  }
};

/** Update a subset of fields on an existing game's hash (no index changes). */
export const patchGame = async (
  id: string,
  fields: Partial<Record<keyof Game, string>>
): Promise<void> => {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) record[key] = value;
  }
  if (Object.keys(record).length > 0) {
    await redis.hSet(gameKey(id), record);
  }
};

/** Approve a pending game: move it to the active index and stamp approval metadata. */
export const approveGame = async (
  id: string,
  approvedBy: string
): Promise<Game | undefined> => {
  const game = await getGame(id);
  if (!game) return undefined;
  const approved: Game = {
    ...game,
    status: 'active',
    approved_by: approvedBy,
    approved_date: new Date().toISOString().slice(0, 10),
  };
  await putGame(approved);
  return approved;
};

/** Wipe all game data (every hash + both index sets). Returns how many were removed. */
export const clearAllGames = async (): Promise<number> => {
  const ids = new Set<string>();
  for (const key of [INDEX_KEY, PENDING_KEY]) {
    const members = await redis.zRange(key, 0, -1);
    for (const { member } of members) ids.add(member);
  }
  for (const id of ids) await redis.del(gameKey(id));
  await redis.del(INDEX_KEY);
  await redis.del(PENDING_KEY);
  return ids.size;
};

/** Remove a game entirely (hash + both indexes). Returns the deleted game for modmail use. */
export const deleteGame = async (id: string): Promise<Game | undefined> => {
  const game = await getGame(id);
  await redis.del(gameKey(id));
  await redis.zRem(INDEX_KEY, [id]);
  await redis.zRem(PENDING_KEY, [id]);
  return game;
};
