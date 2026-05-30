import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import type {
  AdminActionResponse,
  AdminQueueResponse,
  ApiErrorResponse,
  GamesResponse,
} from '../../shared/games';
import {
  approveGame,
  deleteGame,
  listActiveGames,
  listPendingGames,
} from '../core/games';
import { currentUserIsPowerMod } from '../core/mods';
import { sendRejectionModmail } from '../core/modmail';

export const api = new Hono();

// Public: the launchpad carousel reads this on load.
api.get('/games', async (c) => {
  try {
    const games = await listActiveGames();
    return c.json<GamesResponse>({ type: 'games', games });
  } catch (error) {
    console.error('Failed to list active games:', error);
    return c.json<ApiErrorResponse>(
      { status: 'error', message: 'Failed to load games' },
      500
    );
  }
});

// Power-mod only: pending submission queue for the admin panel.
api.get('/admin/queue', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<AdminQueueResponse>({ type: 'queue', authorized: false });
  }
  const games = await listPendingGames();
  return c.json<AdminQueueResponse>({ type: 'queue', authorized: true, games });
});

// Power-mod only: approve a pending submission.
api.post('/admin/approve', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<AdminActionResponse>(
      { type: 'admin-action', ok: false, message: 'Not authorized' },
      403
    );
  }
  const { slug } = await c.req.json<{ slug?: string }>();
  if (!slug) {
    return c.json<AdminActionResponse>(
      { type: 'admin-action', ok: false, message: 'slug is required' },
      400
    );
  }
  const approvedBy = (await reddit.getCurrentUsername()) ?? 'unknown';
  const game = await approveGame(slug, approvedBy);
  if (!game) {
    return c.json<AdminActionResponse>(
      { type: 'admin-action', ok: false, message: 'Game not found' },
      404
    );
  }
  return c.json<AdminActionResponse>({ type: 'admin-action', ok: true });
});

// Power-mod only: reject a pending submission (delete + notify dev).
api.post('/admin/reject', async (c) => {
  if (!(await currentUserIsPowerMod())) {
    return c.json<AdminActionResponse>(
      { type: 'admin-action', ok: false, message: 'Not authorized' },
      403
    );
  }
  const { slug } = await c.req.json<{ slug?: string }>();
  if (!slug) {
    return c.json<AdminActionResponse>(
      { type: 'admin-action', ok: false, message: 'slug is required' },
      400
    );
  }
  const game = await deleteGame(slug);
  if (game?.dev_username) {
    await sendRejectionModmail(game);
  }
  return c.json<AdminActionResponse>({ type: 'admin-action', ok: true });
});
