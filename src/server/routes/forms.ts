import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { GENRE_TAGS, type GenreTag, type Game } from '../../shared/games';
import { getGame, putGame } from '../core/games';
import { currentUserIsPowerMod } from '../core/mods';
import { stripPrefix } from '../core/forms';
import { sendSubmissionModmail } from '../core/modmail';

export const forms = new Hono();

type RawFormValues = {
  name?: string;
  subreddit?: string;
  dev_username?: string;
  founded_date?: string;
  genre_tags?: string[];
  color?: string;
  emoji?: string;
  icon_url?: string;
  notes?: string;
};

const validTags = new Set<string>(GENRE_TAGS);

const cleanTags = (raw: string[] | undefined): GenreTag[] =>
  (raw ?? []).filter((t): t is GenreTag => validTags.has(t));

const str = (v: string | undefined): string => (typeof v === 'string' ? v.trim() : '');

/** Build a Game from submitted form values. `status` decides active vs pending. */
const gameFromValues = (
  values: RawFormValues,
  status: Game['status'],
  existing?: Game
): Game | { error: string } => {
  const name = str(values.name);
  const slug = stripPrefix(str(values.subreddit));
  const founded_date = str(values.founded_date);
  const genre_tags = cleanTags(values.genre_tags);

  if (!name || !slug || !founded_date) {
    return { error: 'Name, subreddit, and founded date are required.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(founded_date)) {
    return { error: 'Founded date must be in YYYY-MM-DD format.' };
  }
  if (genre_tags.length === 0) {
    return { error: 'Pick at least one genre tag.' };
  }

  return {
    name,
    subreddit: `r/${slug}`,
    subreddit_slug: slug,
    dev_username: stripPrefix(str(values.dev_username)),
    founded_date,
    genre_tags,
    subscribers: existing?.subscribers ?? 0,
    subscribers_updated: existing?.subscribers_updated,
    status,
    color: str(values.color) || existing?.color || '#1f2937',
    emoji: str(values.emoji) || existing?.emoji || '',
    icon_url: str(values.icon_url) || existing?.icon_url,
    notes: str(values.notes) || existing?.notes || '',
    approved_by: existing?.approved_by,
    approved_date: existing?.approved_date,
  };
};

// Mod add: writes an active game immediately.
forms.post('/add-submit', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  const values = await c.req.json<RawFormValues>();
  const result = gameFromValues(values, 'active');
  if ('error' in result) {
    return c.json<UiResponse>({ showToast: result.error }, 400);
  }
  await putGame(result);
  return c.json<UiResponse>({ showToast: `Added ${result.name}.` }, 200);
});

// Mod edit: upserts an active game (preserving subscriber + approval metadata).
forms.post('/edit-submit', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  const values = await c.req.json<RawFormValues>();
  const slug = stripPrefix(str(values.subreddit));
  const existing = slug ? await getGame(slug) : undefined;
  const result = gameFromValues(values, existing?.status ?? 'active', existing);
  if ('error' in result) {
    return c.json<UiResponse>({ showToast: result.error }, 400);
  }
  await putGame(result);
  return c.json<UiResponse>({ showToast: `Saved ${result.name}.` }, 200);
});

// Public submission: writes a pending game and notifies mods.
forms.post('/submit-submit', async (c) => {
  const values = await c.req.json<RawFormValues>();
  const result = gameFromValues(values, 'pending');
  if ('error' in result) {
    return c.json<UiResponse>({ showToast: result.error }, 400);
  }
  await putGame(result);
  await sendSubmissionModmail(result);
  return c.json<UiResponse>(
    { showToast: 'Thanks! Your game was submitted for review.' },
    200
  );
});
