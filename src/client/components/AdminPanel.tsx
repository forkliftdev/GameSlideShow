import { GENRE_LABELS } from '../../shared/games';
import { useAdminQueue } from '../hooks/useAdminQueue';

export const AdminPanel = () => {
  const { authorized, games, loading, approve, reject } = useAdminQueue();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e12] text-gray-400 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0b0e12] text-gray-300 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-bold text-white">Admin Panel</h1>
        <p className="text-sm text-gray-400">
          This panel is for power mods only.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e12] text-white p-4">
      <h1 className="text-xl font-bold mb-1">Pending submissions</h1>
      <p className="text-xs text-gray-400 mb-4">
        Use the “Add Game” / “Edit Game” menu items to add or edit games.
      </p>

      {games.length === 0 ? (
        <p className="text-gray-400 text-sm">Nothing pending. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((game) => (
            <li
              key={game.subreddit_slug}
              className="rounded-xl border border-white/10 bg-[#0e1216] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{game.name}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {game.subreddit}
                    {game.dev_username ? ` · u/${game.dev_username}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Founded {game.founded_date} ·{' '}
                    {game.genre_tags.map((t) => GENRE_LABELS[t]).join(', ')}
                  </div>
                  {game.notes && (
                    <div className="text-xs text-gray-500 mt-1 italic">
                      {game.notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => approve(game.subreddit_slug)}
                    className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-sm font-medium cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(game.subreddit_slug)}
                    className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
