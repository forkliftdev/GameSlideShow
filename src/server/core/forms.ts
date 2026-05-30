// Native Devvit form definitions (returned via UiResponse.showForm from menu endpoints).
// The `name` on each ShowForm must match a key in devvit.json `forms`, which maps to the
// submit endpoint under /internal/form/*.

import type { Form, JsonObject, ShowForm } from '@devvit/web/shared';
import { GENRE_TAGS, GENRE_LABELS, type Game } from '../../shared/games';

type FormSpec = ShowForm<JsonObject>;

const genreOptions = GENRE_TAGS.map((tag) => ({
  label: GENRE_LABELS[tag],
  value: tag,
}));

/** Strip a leading r/ or u/ prefix (case-insensitive) from a pasted handle. */
export const stripPrefix = (raw: string): string =>
  raw.trim().replace(/^\/?[ru]\//i, '');

/** Mod-facing fields: full record incl. presentation + notes. */
const modFields = (game?: Game): Form['fields'] => [
  {
    type: 'string',
    name: 'id',
    label: 'Game ID (leave blank to add a new game; do not change when editing)',
    defaultValue: game?.id,
  },
  {
    type: 'string',
    name: 'name',
    label: 'Game name',
    required: true,
    defaultValue: game?.name,
  },
  {
    type: 'string',
    name: 'subreddit',
    label: 'Subreddit (with or without r/)',
    required: true,
    defaultValue: game?.subreddit,
  },
  {
    type: 'string',
    name: 'url',
    label: 'Game link (optional — stable post/permalink; blank links to the subreddit)',
    defaultValue: game?.url,
  },
  {
    type: 'string',
    name: 'dev_username',
    label: 'Dev Reddit username (optional, with or without u/)',
    defaultValue: game?.dev_username,
  },
  {
    type: 'string',
    name: 'founded_date',
    label: 'Founded date (YYYY-MM-DD)',
    required: true,
    defaultValue: game?.founded_date,
  },
  {
    type: 'select',
    name: 'genre_tags',
    label: 'Genre tags',
    required: true,
    multiSelect: true,
    options: genreOptions,
    defaultValue: game?.genre_tags,
  },
  {
    type: 'string',
    name: 'color',
    label: 'Card color (hex, e.g. #1a6b4a)',
    defaultValue: game?.color,
  },
  {
    type: 'string',
    name: 'emoji',
    label: 'Thumbnail emoji',
    defaultValue: game?.emoji,
  },
  {
    type: 'string',
    name: 'icon_url',
    label: 'Icon URL (optional, overrides emoji)',
    defaultValue: game?.icon_url,
  },
  {
    type: 'paragraph',
    name: 'notes',
    label: 'Notes (internal only)',
    defaultValue: game?.notes,
  },
];

export const addGameFormDefinition = (): FormSpec => ({
  name: 'addGame',
  form: {
    title: 'Add game',
    description: 'Adds an active game to the launchpad immediately.',
    acceptLabel: 'Add game',
    fields: modFields(),
  },
});

export const editGameFormDefinition = (game?: Game): FormSpec => ({
  name: 'editGame',
  form: {
    title: game ? `Edit ${game.name}` : 'Edit game',
    description: game
      ? 'Update this game. Changes appear on the next post render.'
      : 'Enter the subreddit of the game to edit, then update its fields.',
    acceptLabel: 'Save',
    fields: modFields(game),
  },
});

/** Public submission form: no presentation fields — mods assign color/emoji/notes on review. */
export const submitGameFormDefinition = (): FormSpec => ({
  name: 'submitGame',
  form: {
    title: 'Submit your game',
    description:
      'Submit a word game for review. A mod will review it before it appears.',
    acceptLabel: 'Submit',
    fields: [
      { type: 'string', name: 'name', label: 'Game name', required: true },
      {
        type: 'string',
        name: 'subreddit',
        label: 'Subreddit (with or without r/)',
        required: true,
      },
      {
        type: 'string',
        name: 'url',
        label: 'Game link (optional — blank links to the subreddit)',
      },
      {
        type: 'string',
        name: 'dev_username',
        label: 'Your Reddit username (optional, with or without u/)',
      },
      {
        type: 'string',
        name: 'founded_date',
        label: 'Founded date (YYYY-MM-DD)',
        required: true,
      },
      {
        type: 'select',
        name: 'genre_tags',
        label: 'Genre tags',
        required: true,
        multiSelect: true,
        options: genreOptions,
      },
    ],
  },
});
