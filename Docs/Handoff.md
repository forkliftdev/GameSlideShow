# Handoff — Word Game Arcade Launchpad

_Last updated: 2026-05-31_

A living handoff: current state, the decisions we made (and why), open issues, and the
questions likely to face us next. Companion docs: [launchpad-plan.md](launchpad-plan.md)
(architecture/build plan) and [RandomDisplay.md](RandomDisplay.md) (display fairness).

---

## 1. Current state

- **Platform:** Devvit **Web** (React 19 + Hono + Redis). **No Blocks** (per
  [AGENTS.md](../AGENTS.md)).
- **Playtest:** live via `npm run dev` on `gameslideshow_dev`. Changes hot-reload; just
  refresh the post. Version climbs on every save — cosmetic, not a concern.
- **Production:** **v0.0.3 uploaded and installed to r/WordGameArcade** (2026-05-31, by
  `theforkliftdev`). Install only makes the app available — it does **not** seed games, so the
  sub stays empty until a power mod runs **Create Launchpad Post** then **Seed Games**.
- **Catalog:** seed now holds **26 games** — the original **8** (round 1) plus **18** new
  live-sub games imported from the Combined Intake sheet (round 2; see §2).
- **What works:** the inline carousel (tabs, counts, search, scroll arrows), card
  auto-enrichment (icon/color/subscribers from the host subreddit), seed/reset/create-post
  menus, native Add/Edit/Submit forms, pending-queue admin panel, weekly subscriber-refresh
  + aged-out modmail scheduler jobs.
- **App name** is still `gameslideshow` (the original scaffold). The spec name is
  `wordgamearcade-launchpad`. Renaming the published app is a separate decision (see §5).

### Operating it (mod `...` menu on the subreddit)
1. **Reset Games (clear all)** — wipes all records + indexes (clean slate).
2. **Seed Games (round 1)** — loads/refreshes the 8 seed games (force-overwrites; pulls
   live icon/color/subscribers).
3. **Create Launchpad Post** — makes the pinned carousel post.
4. **Add Game / Edit Game** (mods), **Submit Your Game** (anyone → pending queue).

> After any data-model change, run **Reset → Seed** so stale records don't linger.

> **Finding the menu:** these are `location: "subreddit"` actions. They appear nested under the
> **app name (gameslideshow)** in the subreddit `...` menu, and are **reliable only on desktop**
> — the mobile app generally does not surface subreddit-level actions. For a phone-friendly
> trigger we'd add a `location: "post"` action (open item, §4).

---

## 2. Decisions we made (and why)

- **Devvit Web, not Blocks.** The original spec assumed the deprecated Blocks runtime; the
  whole app was re-expressed in the Web model (menus/forms/cron declared in `devvit.json` →
  Hono endpoints; Redis/Reddit accessed server-side).
- **Power-mod gate is server-side.** `forUserType` only supports moderator/user, so the
  `theforkliftdev` + `badasimo` allowlist is enforced in every privileged endpoint.
- **Tabs:** `All · Recent · Popular · New · Deep Cuts` + one tab per genre. **All** is the
  default. Each tab shows a **count**.
- **Genre names describe the mechanic** — Guess, Grouping, Word Search, Trivia, Spelling,
  Crossword, Picture — so **no trademarks** appear. ("Guess" = Wordle-style, "Grouping" =
  Connections-style.)
- **Deep Cuts** = older than 6 months **and** under 1,000 subscribers. A kind, crate-digger
  framing for established-but-small games; chosen over "Hidden Gems"/"Cult Classics" to avoid
  editorializing quality or inviting "the numbers are low" distrust.
- **Random display** on All + genre + Deep Cuts tabs (per-load seed, stable within a load).
  Recent/Popular/New keep meaningful sorts. Fairness rationale and the rejected
  tap-to-reshuffle idea are documented in [RandomDisplay.md](RandomDisplay.md). **No shuffle
  button** — genre tabs are the browse mechanism at scale.
- **Search** resolves brand aliases ("wordle" → Guess, "connections" → Grouping) and exact
  tab names ("picture" → Picture tab); partial text still does a global name search. Typing a
  resolvable term moves the active underline; **Enter collapses the field** and commits the
  tab. Aliases live in `SEARCH_ALIASES` ([src/shared/games.ts](../src/shared/games.ts)).
- **Card auto-enrichment.** On seed/add, we pull the host subreddit's **community icon, brand
  color, and live subscriber count** via `reddit.getSubredditByName(...)`. This is a
  first-party API call from inside the app — not web scraping.
- **Card icons fill the tile edge-to-edge** (`object-cover`); emoji/letter fallback otherwise.
- **Scroll arrows** sit in the bottom corners of the tiles (clear of the icon) and show
  contextually (‹ only after scrolling, › until the end).

### Multi-game-per-subreddit (the big refactor)
Some brands host several games on one sub (e.g. r/DetectivePuzzles). So:
- **Identity moved off the subreddit.** Primary key is a unique **`id`** (slugified from the
  name, `-2` tiebreaker). `subreddit_slug` is just the host and may repeat.
- **Per-game link** (`url`): the card opens it, and **quietly falls back to the subreddit**
  when blank.
- **Enrichment respects shared subs:** subscriber count always comes from the sub (universal),
  but icon/color are pulled from the sub **only when the game has no icon of its own** — so
  games sharing a sub keep their own icon instead of all looking identical. Each game keeps its
  **own launch date**.
- **Dev-suppliable icon:** per spec, a dev may supply a game-specific icon if they want
  something other than the sub icon. (See open item in §4 — the public submission form does
  not yet expose an icon field.)

### Data intake
- Method unchanged: collect + verify in a **Google Sheet**, then load seed-style with the same
  auto-enrichment. We chose **not** to build an in-app bulk importer — collection lives in sheets.
- **Round 2 loaded (2026-05-31).** The "arcade" workbook had two data tabs (Sheet1 = game
  directory: slugs, categories, dates, counts; Sheet2 = growth/status analysis). They were
  merged one-row-per-game (joined by game/subreddit) into a new **Combined Intake** sheet:
  https://docs.google.com/spreadsheets/d/17RjcKah4ouHm1aNS6DUegnaGJKXjSTKzsiUYOTEhwxE/edit
- From it, **18 live-sub games** were appended to `SEED_GAMES` (`Ecosystem Installs` / no-sub
  rows skipped): GameFox, Detective Search/Scramble/Daily/Connections (4 on the shared
  r/DetectivePuzzles), GIF Enigma, Wordungus, Ladder Climb, WordMaxed Mini, Mind the Word,
  Word Grind, Proximity, Which is fake?, Word Pool, SumWords, WordPaws, Redacted, Snap Guess.
- **Unscramble Game excluded on purpose** — the source flagged it "Do Not List" (its sub is an
  app-store promo). Re-add if that changes.
- The earlier **FlexWord intake sheet** (Daily Guess, Daily Mix, FlexBard, Wriddler,
  FlexPlayCozy, WordFusions, BlinkWords) is a **separate batch, not in seed yet** —
  genres/dev/verified still to fill with badasimo.
  https://docs.google.com/spreadsheets/d/1fdfX-SiGIfAvHw9yfXDCNNbpifo1QOzP-DlGVhy26XY/edit

---

## 3. OPEN ISSUE — Deep Cuts shows 0

**Symptom:** the Deep Cuts tab count is `0` even though Wordseekr (founded 2025-09-15, ~94
subs) should qualify (older than 6 months **and** < 1,000 subscribers).

**To investigate (later today):**
- **Did the data get re-seeded under the new id model?** Run **Reset → Seed**, then recheck —
  stale slug-keyed records from before the refactor can skew things.
- **Did live enrichment change the count?** Seed `subscribers` is overwritten by the real
  subreddit count. If r/wordseekr resolves to ≥ 1,000 (or enrichment failed and left an
  unexpected value), it drops out. Check the stored `subscribers` for `game:wordseekr`.
- **Boundary math:** Deep Cuts uses `monthsAgo(founded) > 6 && subscribers < 1000`. Confirm
  `monthsAgo` (30.44-day months) and the date are doing what we expect for borderline games
  (e.g. Lettered at 2025-12-05 is ~5.8 months → correctly New, not Deep Cuts).
- **Filter location:** `gamesForTab` case `'deep_cuts'` in
  [src/shared/games.ts](../src/shared/games.ts).

Likely just "needs Reset → Seed," but verify before assuming.

---

## 4. Open questions & what's coming

### Freshness / staleness — "how recently must a game be updated to stay in the arcade?"
Not yet defined or built. Today nothing ages a game out for inactivity. Decisions needed:
- **What counts as "alive"?** Options: the subreddit still resolves (we already flag
  `fetch_error` on 404/403 in the weekly refresh); recent posts/activity; subscriber growth;
  dev responsiveness.
- **What happens when a game goes stale?** Flag for mod review (soft) vs auto-hide vs remove.
  We have a `status: "aged_out"` value defined but currently unused for removal, and the
  weekly job only flags fetch failures — it never removes anything by design.
- **Suggested direction:** add a `last_checked`/`last_active` signal and a staleness window
  (e.g. "sub unreachable for N weeks → flag to mods, not auto-remove"). Keep removal a human
  decision. Worth a short policy doc once you decide the rule.

### Other open items
- **Dev-supplied icon in the submission flow.** The public "Submit Your Game" form has no
  icon field yet (mods assign on review). If devs should self-supply a game icon, add an
  optional Icon URL field to the submit form (mod Add/Edit already has one).
- **External icon loading.** Card icons load from `styles.redditmedia.com`. They render in the
  playtest; confirm they hold up in production web-views (CSP/allowed domains). Fallback to
  emoji/letter already exists if they don't.
- **Subscriber metric for shared subs.** All games on one sub share the sub's subscriber
  count, so they cluster together in Popular/Deep Cuts. If per-game traffic ever matters,
  it'd need manual entry (Reddit's API only gives sub-level counts).
- **"All" tab at 30+ games.** A 30-card strip is a scroll-slog. Consider capping All to a
  random sample (e.g. 12–15) per load. (See [RandomDisplay.md](RandomDisplay.md).)
- **Server-side fair rotation.** The scalable version of "show games not recently seen" —
  least-recently-surfaced ordering computed in the API. Deferred until the catalog is large.
- **Seed is destructive.** "Seed Games" force-overwrites the 8 round-1 games (reverts mod
  edits to them). Fine pre-launch; revisit before public launch if that's a risk.
- **Genre/data confirmations.** Confirm genre tags, colors, dev usernames for seed + intake
  games. (r/4pics1word confirmed real.) **The 18 round-2 games have INFERRED `genre_tags`** —
  mapped from the intake's vague "Category" column — so review before public launch. A wrong tag
  just parks a card under the wrong genre tab (one-line fix in `seed.ts`).
- **Subscriber-count discrepancies (round 2).** Sheet1 and Sheet2 disagreed sharply for several
  games (WordMaxed 640 vs 6, Proximity 1,890 vs 32, Mind the Word 310 vs 2, Wordungus 185 vs
  418). Seed uses the Sheet2 number where present, but live enrichment overrides it at seed time
  anyway — reconcile the source data when convenient.
- **Round-2 import status = `active`.** All 18 were seeded `active` like the round-1 8, even ones
  Sheet2 labels Dormant/Stalled (Proximity, GIF Enigma, WordMaxed). Decide whether external
  imports should instead land as `pending` for review.
- **Phone-friendly seed trigger.** Subreddit menu actions don't appear in the mobile app. Add a
  `location: "post"` "Load Games" / "Create Post" action to drive the arcade from a phone, and/or
  rename the "...Launchpad..." labels to read as the arcade.
- **Subreddit-ownership verification.** v1 is manual (mod checks); no automated check.
- **Production cutover.** App rename decision; `deploy`/`launch` (publish); mod must manually
  pin the post; verify scheduler jobs (Sun refresh, Mon aged-out) and modmail end-to-end on a
  real sub.

---

## 5. Data model (current)

```
Game (Redis hash: game:{id})
  id                 unique game slug (key) — derived from name
  name
  subreddit          "r/Foo" (display)
  subreddit_slug     "Foo"  (host; NOT unique)
  url?               per-game link; blank → card opens the subreddit
  dev_username       "" => modmail skipped
  founded_date       YYYY-MM-DD (per game)
  genre_tags         guess|grouping|word_search|trivia|spelling|crossword|picture
  subscribers        from host sub (shared by games on that sub)
  subscribers_updated
  status             active | pending | aged_out
  color              #hex tile accent (sub brand color, or manual)
  emoji              thumbnail fallback
  icon_url?          round thumbnail; manual value is preserved over the sub icon
  notes              internal
  approved_by / approved_date
  fetch_error?       date set when the weekly refresh can't reach the sub

Indexes (sorted sets): games:index (active ids), games:pending (pending ids)
```
