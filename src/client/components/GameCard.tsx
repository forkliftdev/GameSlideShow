import { navigateTo } from '@devvit/web/client';
import { type Game, primaryGenreLabel } from '../../shared/games';

type GameCardProps = { game: Game };

/** A launchpad tile: colored card with a centered round thumbnail, name + genre below. */
export const GameCard = ({ game }: GameCardProps) => {
  const open = () =>
    navigateTo(`https://reddit.com/r/${game.subreddit_slug}`);

  return (
    <button
      onClick={open}
      className="flex flex-col w-[150px] shrink-0 snap-start text-left cursor-pointer group"
    >
      <div
        className="relative flex items-center justify-center w-[150px] h-[200px] rounded-2xl overflow-hidden transition-transform group-hover:scale-[1.02]"
        style={{ backgroundColor: game.color }}
      >
        {game.icon_url ? (
          <img
            src={game.icon_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : game.emoji ? (
          <span className="text-6xl leading-none">{game.emoji}</span>
        ) : (
          <span className="text-6xl font-bold text-white/90 leading-none">
            {game.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className="mt-2 px-0.5 font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
        {game.name}
      </span>
      <span className="px-0.5 text-xs text-gray-500 dark:text-gray-400">
        {primaryGenreLabel(game)}
      </span>
    </button>
  );
};
