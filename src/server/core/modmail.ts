// Modmail senders. Dev-facing messages are skipped when dev_username is empty.
// Subjects/bodies follow the handoff spec.

import { context, reddit } from '@devvit/web/server';
import type { Game } from '../../shared/games';
import { GENRE_LABELS } from '../../shared/games';

const subredditName = (): string => context.subredditName ?? 'wordgamearcade';

/** Notify the mod team that a new game was submitted (routes to Mod Discussions). */
export const sendSubmissionModmail = async (game: Game): Promise<void> => {
  const tags = game.genre_tags.map((t) => GENRE_LABELS[t]).join(', ');
  await reddit.modMail.createConversation({
    subredditName: subredditName(),
    subject: `New game submission: ${game.name}`,
    body: [
      `A new game has been submitted for r/${subredditName()}.`,
      ``,
      `Game: ${game.name}`,
      `Subreddit: ${game.subreddit}`,
      `Dev: ${game.dev_username ? `u/${game.dev_username}` : '(not provided)'}`,
      `Founded: ${game.founded_date}`,
      `Tags: ${tags}`,
      ``,
      `Review it in the Admin Panel on the pinned post.`,
    ].join('\n'),
    to: null,
  });
};

/** Tell a dev their submission was rejected. No-op if dev_username is empty. */
export const sendRejectionModmail = async (game: Game): Promise<void> => {
  if (!game.dev_username) return;
  await reddit.modMail.createConversation({
    subredditName: subredditName(),
    subject: `Your r/${subredditName()} submission`,
    body: [
      `Hi u/${game.dev_username},`,
      ``,
      `Thanks for submitting ${game.name} to r/${subredditName()}. After review, we weren't able to add it to the arcade at this time.`,
      ``,
      `Feel free to resubmit in the future if things change.`,
      ``,
      `-- The r/${subredditName()} mod team`,
    ].join('\n'),
    to: `u/${game.dev_username}`,
  });
};

/** Tell a dev their game has graduated out of the "New" tab. No-op if dev_username is empty. */
export const sendAgedOutModmail = async (game: Game): Promise<void> => {
  if (!game.dev_username) return;
  await reddit.modMail.createConversation({
    subredditName: subredditName(),
    subject: `Your game has moved out of the "New" tab on r/${subredditName()}`,
    body: [
      `Hi u/${game.dev_username},`,
      ``,
      `Just a heads-up: ${game.name} (${game.subreddit}) has graduated out of the "New" tab on r/${subredditName()} after 6 months. Your game is still listed in all other relevant tabs.`,
      ``,
      `Thanks for being part of the arcade!`,
      ``,
      `-- The r/${subredditName()} mod team`,
    ].join('\n'),
    to: `u/${game.dev_username}`,
  });
};
