import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import {
  GENRE_TAGS,
  slugify,
  type GenreTag,
  type Game,
} from '../../shared/games';
import { getGame, putGame } from '../core/games';
import { currentUserIsPowerMod } from '../core/mods';
import { stripPrefix } from '../core/forms';
import { sendSubmissionModmail } from '../core/modmail';

export const forms = new Hono();

type RawFormValues = {
  id?: string;
  name?: string;
  subreddit?: string;
  url?: string;
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

/** Keep a link only if it's a real http(s) URL; otherwise card quietly falls back to the sub. */
const cleanUrl = (raw: string): string | undefined =>
  /^https?:\/\//i.test(raw) ? raw : undefined;

/** Find a free id by appending -2, -3, … if the base is taken. */
const uniqueId = async (base: string): Promise<string> => {
  let id = base || 'game';
  let n = 2;
  while (await getGame(id)) id = `${base}-${n++}`;
  return id;
};

/** Build a Game from submitted form values. `status` decides active vs pending. */
const gameFromValues = (
  values: RawFormValues,
  status: Game['status'],
  id: string,
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
    id,
    name,
    subreddit: `r/${slug}`,
    subreddit_slug: slug,
    url: cleanUrl(str(values.url)) ?? existing?.url,
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

// Mod add: writes an active game immediately. Id is auto-derived from the name (unique).
forms.post('/add-submit', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  const values = await c.req.json<RawFormValues>();
  const id = str(values.id) || (await uniqueId(slugify(str(values.name))));
  const result = gameFromValues(values, 'active', id);
  if ('error' in result) {
    return c.json<UiResponse>({ showToast: result.error }, 400);
  }
  await putGame(result);
  return c.json<UiResponse>({ showToast: `Added ${result.name}.` }, 200);
});

// Mod edit: upserts by id (preserving subscriber + approval metadata).
forms.post('/edit-submit', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  const values = await c.req.json<RawFormValues>();
  const id = str(values.id) || slugify(str(values.name));
  const existing = id ? await getGame(id) : undefined;
  const result = gameFromValues(values, existing?.status ?? 'active', id, existing);
  if ('error' in result) {
    return c.json<UiResponse>({ showToast: result.error }, 400);
  }
  await putGame(result);
  return c.json<UiResponse>({ showToast: `Saved ${result.name}.` }, 200);
});

// Public submission: writes a pending game and notifies mods.
forms.post('/submit-submit', async (c) => {
  const values = await c.req.json<RawFormValues>();
  const id = await uniqueId(slugify(str(values.name)));
  const result = gameFromValues(values, 'pending', id);
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
