import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { currentUserIsPowerMod } from '../core/mods';
import { seedGames } from '../core/seed';
import { clearAllGames, getGame } from '../core/games';
import {
  addGameFormDefinition,
  editGameFormDefinition,
  submitGameFormDefinition,
} from '../core/forms';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/seed', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  // force=true so re-seeding refreshes the round-1 records (e.g. after a schema/tag change).
  const written = await seedGames(true);
  return c.json<UiResponse>({ showToast: `Seeded ${written} game(s).` }, 200);
});

menu.post('/reset', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  const removed = await clearAllGames();
  return c.json<UiResponse>({ showToast: `Cleared ${removed} game(s).` }, 200);
});

menu.post('/add-game', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  return c.json<UiResponse>({ showForm: addGameFormDefinition() }, 200);
});

menu.post('/edit-game', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<UiResponse>({ showToast: 'Mods only' }, 403);
  }
  // If an id query param is supplied (from the admin panel launcher), pre-populate from
  // Redis; otherwise the form opens blank and the mod fills in the id to edit.
  const id = c.req.query('id');
  const game = id ? await getGame(id) : undefined;
  return c.json<UiResponse>({ showForm: editGameFormDefinition(game) }, 200);
});

menu.post('/submit-game', async (c) => {
  return c.json<UiResponse>({ showForm: submitGameFormDefinition() }, 200);
});
