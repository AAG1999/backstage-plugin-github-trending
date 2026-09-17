# Contributing

This repository is Apache 2.0. Commits should include a `Signed-off-by` line (DCO) if you later donate the plugin to `backstage/community-plugins`.

1. `yarn install`
2. `yarn tsc && yarn lint && yarn test && yarn build`
3. Keep `plugins/github-trending-backend/src/__fixtures__/trending.html` in sync with github.com/trending markup when the parser breaks.
4. For a release after `0.1.0`, add a changeset: `yarn changeset`. See [.changeset/README.md](.changeset/README.md).
