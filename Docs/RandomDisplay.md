# Random Display & Game Exposure

## Decision

**Games display in random order; there is no shuffle button.** Genre tabs are the primary
browse mechanism, so a manual reshuffle control isn't needed. This doc records the reasoning
so the decision is durable.

---

## What's implemented

- **Random order** on the **All** tab and every **genre** tab. The order is randomized **per
  page load** but **stable within that load** (a seed captured on mount), so the row never
  re-jitters while you type or search.
- **Recent / Popular / New keep meaningful sorts** — date, subscribers, date — because those
  tabs are *about* order. Randomizing them would defeat their purpose.
- Implementation: `shuffleStable(games, seed)` and `isRandomTab(tab)` in
  [src/shared/games.ts](../src/shared/games.ts); the seed lives in
  [Launchpad.tsx](../src/client/components/Launchpad.tsx).

---

## Why random display (the fairness rationale)

A launchpad is a horizontal strip. **The first few cards get the overwhelming majority of
exposure** — most users never scroll to the end. With a fixed order, the same handful of
games would always lead and the long tail would be effectively invisible.

**Random-on-load fixes this cheaply.** Because the lead cards are re-randomized on every
visit, exposure evens out across the whole audience statistically — every game gets its turn
near the front across many loads, with **zero extra UI and no per-user tracking**. This is the
core fairness mechanism, and it already does most of the work.

---

## Why no shuffle button

A manual "🔀 Shuffle" control is cheap to add but solves the wrong problem:

- **Redundant with random-on-load.** Per-visit randomization already rotates who leads. A
  button mainly adds *within-session* variety, which is minor.
- **Low discoverability / low use.** Most users never notice or tap such controls, so it
  doesn't meaningfully change exposure.
- **The real problem at scale is exposure fairness, not user-initiated variety** — and a
  button puts the burden on the user instead of solving it systemically.

## Why genre tabs win instead

With a large catalog (the app is expected to reach **30+ games**), a single "All" strip
becomes a firehose — ~30 cards is thousands of pixels of horizontal scroll that nobody
finishes. **Genre tabs keep each strip short and scannable** (e.g. Guess 8, Spelling 5, Word
Search 6), and the **per-tab counts** help users self-route. At scale, genres *are* the
navigation; that's what makes 30+ games browsable, not a reshuffle button.

---

## Deferred options (revisit when the catalog is actually large)

These are intentionally **not** built yet; random-on-load + genre tabs are expected to
suffice until the catalog grows.

1. **Server-side fair rotation** — the scalable version of "show games not yet seen." Store a
   `last_surfaced` timestamp per game and order each tab by least-recently-surfaced plus light
   randomness, computed in the API. Every game cycles through the front across the whole
   audience automatically — no hidden gestures, no per-user state. This is the right place to
   invest if/when front-loading still feels unfair at scale.

2. **Cap the "All" tab to a random sample per load** (e.g. 12–15) so the default view is a
   *sampler* rather than a 30-card scroll-slog. Cheap, and worth considering as the catalog
   approaches 30.

A previously-considered idea — **tap the webview background to reshuffle "until all seen"** —
was rejected: it collides with card-tap and scroll gestures, has no affordance, and requires
per-user seen-state for little payoff. If manual reshuffle is ever wanted, a visible button
beats a hidden tap; but per the decision above, genre navigation is preferred over either.
