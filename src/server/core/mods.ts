// Power-mod authorization. `forUserType: moderator` on a menu item is only a coarse gate;
// the explicit allowlist below is what actually restricts privileged actions, and it MUST
// be checked server-side in every privileged endpoint.

import { reddit } from '@devvit/web/server';
import { POWER_MODS } from '../../shared/games';

export const isPowerMod = (username: string | undefined): boolean =>
  username !== undefined && (POWER_MODS as readonly string[]).includes(username);

/** Resolve the current user and return whether they're a power mod. */
export const currentUserIsPowerMod = async (): Promise<boolean> => {
  const username = await reddit.getCurrentUsername();
  return isPowerMod(username);
};
