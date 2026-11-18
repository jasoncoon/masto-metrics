# Mastodon Metrics

Compare follower growth across a set of Mastodon profiles: https://jasoncoon.github.io/masto-metrics/

- **Dashboard** (`index.html`): a summary of who's growing (top gainers, fastest growth, rank changes,
  accounts with no recent data), a chart with % change / change / followers / log scales, a
  small-multiples view (one chart per profile, each with its own y-axis), and a sortable table with
  1-day, 7-day, 30-day and in-range changes.
- **Profile** (`profile.html?handle=…`): one profile's details and follower history.
- **Followers** (`followers.html?handle=…`): an account's followers ranked by follower count, with mutuals marked.
- **Top posts** (`posts.html?handle=…`): an account's posts (excluding replies and boosts) ranked by favorites.

Days where the collector failed (followers missing or 0) are drawn as gaps, not drops.
Follower history comes from [social-metrics](../social-metrics), which collects daily counts for the
profiles listed in `social-metrics/src/handles.json`. Other profiles still show their current numbers.

The sister app is [Bluesky Metrics](https://jasoncoon.github.io/bsky-metrics/).

## Development

Shared code (components, charts, data utilities, pages) lives in `../social-metrics/web-core` and is
linked as a `file:` dependency, so clone the repos side by side:

```
misc/
  social-metrics/     # collector Lambda + web-core
  bsky-metrics/
  masto-metrics/
```

```sh
(cd ../social-metrics/web-core && npm install)  # needed for type-checking web-core
npm install
npm run dev        # http://localhost:5173
npm test           # type-check + lint
```

The metrics API only allows CORS from `jasoncoon.github.io`, so `npm run dev` / `npm run preview`
proxy it through `/social-metrics-api` (see `vite.config.ts`).

## Deploy

`npm run build` writes the site to `docs/`. Commit `docs/`; GitHub Pages serves it
(Settings → Pages → Deploy from a branch → `main` / `/docs`).

Old URLs keep working: the `.htm` files in `public/` redirect to the new pages.

