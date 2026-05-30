import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { context, reddit } from '@devvit/web/server';
import { listActiveGames } from '../core/games';
import { refreshAllSubscribers } from '../core/subscribers';
import { sendAgedOutModmail } from '../core/modmail';
import { NEW_TAB_MONTHS } from '../../shared/games';

export const scheduler = new Hono();

const DAY_MS = 24 * 60 * 60 * 1000;

// Sunday 00:00 UTC: refresh subscriber counts; flag + report failures to mods.
scheduler.post('/refresh-subscribers', async (c) => {
  const { updated, failed } = await refreshAllSubscribers();
  if (failed.length > 0) {
    const list = failed.map((g) => `- ${g.name} (${g.subreddit})`).join('\n');
    await reddit.modMail.createConversation({
      subredditName: context.subredditName ?? 'wordgamearcade',
      subject: `Subscriber refresh: ${failed.length} game(s) failed`,
      body: `These subreddits could not be fetched (left in place, flagged):\n\n${list}`,
      to: null,
    });
  }
  console.log(`refresh-subscribers: updated ${updated}, failed ${failed.length}`);
  return c.json<TaskResponse>({});
});

// Monday 09:00 UTC: notify devs whose games just crossed the 6-month "New" cutoff.
scheduler.post('/notify-aged-out', async (c) => {
  const games = await listActiveGames();
  const now = Date.now();

  for (const game of games) {
    if (!game.dev_username) continue;
    const founded = Date.parse(game.founded_date);
    if (Number.isNaN(founded)) continue;

    const anniversary = new Date(game.founded_date);
    anniversary.setMonth(anniversary.getMonth() + NEW_TAB_MONTHS);
    const daysSince = (now - anniversary.getTime()) / DAY_MS;

    // Within the 7-day window right after the game graduated out of "New".
    if (daysSince >= 0 && daysSince < 7) {
      await sendAgedOutModmail(game);
    }
  }

  return c.json<TaskResponse>({});
});
