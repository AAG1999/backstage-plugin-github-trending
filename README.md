# GitHub Trending for Backstage

[![CI](https://github.com/AAG1999/backstage-plugin-github-trending/actions/workflows/ci.yml/badge.svg)](https://github.com/AAG1999/backstage-plugin-github-trending/actions/workflows/ci.yml)

Apache-2.0 homepage ticker that shows [GitHub Trending](https://github.com/trending) as a stock-market / news-channel crawl.

![Ticker strip](docs/ticker.svg)

There is no official GitHub Trending API. The **backend** fetches the public HTML page once, parses it, and caches the result (default 45 minutes) so browsers never scrape GitHub. See GitHub’s [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies).

## Packages

| Package | Role |
| --- | --- |
| `@aag1999/plugin-github-trending` | Frontend ticker widget |
| `@aag1999/plugin-github-trending-backend` | Cached fetch + JSON API |
| `@aag1999/plugin-github-trending-common` | Shared types |

## Install

```bash
yarn workspace app add @aag1999/plugin-github-trending
yarn workspace backend add @aag1999/plugin-github-trending-backend
```

### Backend (new backend system)

```ts
// packages/backend/src/index.ts
backend.add(import('@aag1999/plugin-github-trending-backend'));
```

### Frontend — customizable home grid

Register the plugin so its API factory is discovered, then mount the widget as a child of `CustomHomepageGrid`. Users hide it with **Home → Edit → remove widget** (layout is persisted).

```tsx
import { githubTrendingPlugin, HomePageGithubTrendingTicker } from '@aag1999/plugin-github-trending';

createApp({
  plugins: [githubTrendingPlugin],
  // ...
});

<CustomHomepageGrid>
  <HomePageGithubTrendingTicker />
  {/* other widgets */}
</CustomHomepageGrid>
```

All widget props are optional:

| Prop | Default | Purpose |
| --- | --- | --- |
| `since` | backend config | `daily` \| `weekly` \| `monthly` |
| `language` | all | Programming language filter, e.g. `typescript` |
| `spokenLanguageCode` | all | Spoken language filter, e.g. `en` |
| `maxItems` | all returned | Cap the number of repositories shown |
| `pixelsPerSecond` | `50` | Scroll speed; readable range ~30–80, >100 is unreadable |
| `refreshIntervalMinutes` | `15` | Re-fetch cadence; `0` disables polling |
| `showSpotlight` | `true` | Static rotating feature row (with description) under the crawl |

```tsx
<HomePageGithubTrendingTicker since="weekly" language="go" maxItems={15} />
```

### Frontend — new frontend system

```ts
import githubTrendingPlugin from '@aag1999/plugin-github-trending/alpha';

createApp({
  features: [githubTrendingPlugin],
});
```

Place it in `app.extensions` `page:home` `defaultConfig` as `HomePageGithubTrendingTicker` (full width, 2 rows).

The same knobs as the props above are available declaratively, so adopters
never need to fork the component:

```yaml
app:
  extensions:
    - home-page-widget:github-trending/ticker:
        config:
          since: weekly
          language: go
          maxItems: 15
          pixelsPerSecond: 50
          refreshIntervalMinutes: 15
          showSpotlight: true
```

## Config

```yaml
githubTrending:
  # Public github.com — GHES has no /trending page
  baseUrl: https://github.com
  since: daily          # daily | weekly | monthly
  # language: typescript
  # spokenLanguageCode: en
  cacheTtlMinutes: 45
```

## Accessibility

The crawl pauses with a visible **Pause** control (WCAG 2.2.2). Hover also pauses. `prefers-reduced-motion` starts paused. Screen readers get a static list; the animation is visual only.

## Directory listing

After the packages are on the public npm registry, add [`docs/plugin-directory.yaml`](docs/plugin-directory.yaml) to [`backstage/backstage` `microsite/data/plugins`](https://backstage.io/docs/plugins/add-to-directory/).

## Development

This repo is a Yarn workspace (`plugins/*`).

```bash
yarn install
yarn tsc
yarn lint
yarn test
yarn build
```

Standalone UI: `yarn workspace @aag1999/plugin-github-trending start`

Publishing: see [docs/PUBLISH.md](docs/PUBLISH.md).
