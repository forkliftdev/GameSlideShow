// Weekly subscriber refresh. Never auto-removes a game: on fetch failure it flags the
// record with `fetch_error` and the caller notifies mods.

import { reddit } from '@devvit/web/server';
import { listActiveGames, patchGame } from './games';
import type { Game } from '../../shared/games';

const today = (): string => new Date().toISOString().slice(0, 10);

export type RefreshResult = {
  updated: number;
  failed: Game[];
};

/** Refresh subscriber counts for every active game. Returns failures for mod notification. */
export const refreshAllSubscribers = async (): Promise<RefreshResult> => {
  const games = await listActiveGames();
  const failed: Game[] = [];
  let updated = 0;

  for (const game of games) {
    try {
      const info = await reddit.getSubredditInfoByName(game.subreddit_slug);
      const count = info.subscribersCount ?? game.subscribers;
      await patchGame(game.subreddit_slug, {
        subscribers: String(count),
        subscribers_updated: today(),
      });
      updated++;
    } catch (error) {
      console.error(`Subscriber refresh failed for ${game.subreddit_slug}:`, error);
      await patchGame(game.subreddit_slug, { fetch_error: today() });
      failed.push(game);
    }
  }

  return { updated, failed };
};
