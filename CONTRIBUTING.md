# Contributing

Thank you for your interest in contributing to the GitHub Trending Backstage plugin!

This repository is licensed under the Apache 2.0 License. Commits should include a `Signed-off-by` line (DCO) if you intend to later donate the plugin to the `backstage/community-plugins` repository.

## Project Structure

This project uses Yarn workspaces and is structured as a monorepo containing multiple packages under the `plugins/` directory:

- `plugins/github-trending`: The frontend UI components and widget.
- `plugins/github-trending-backend`: The backend service responsible for fetching and caching the GitHub Trending HTML.
- `plugins/github-trending-common`: Shared types and utilities used by both frontend and backend.

## Local Development Setup

To get started with local development:

1. **Install Dependencies**
   Run the following at the root of the repository:
   ```bash
   yarn install
   ```

2. **Build and Test**
   Run the following commands to ensure everything builds and passes tests locally:
   ```bash
   yarn tsc
   yarn lint
   yarn test
   yarn build
   ```

3. **Standalone UI Development**
   To work on the frontend component in isolation without needing a full Backstage app, you can start the standalone development environment:
   ```bash
   yarn workspace @aag1999/plugin-github-trending start
   ```

## Backend Parser Maintenance

The backend fetches the public `github.com/trending` page and parses the HTML. Since there is no official API for GitHub trending, the DOM structure occasionally changes.

When the parser breaks, ensure you update the parsing logic and keep the test fixture HTML (`plugins/github-trending-backend/src/__fixtures__/trending.html`) in sync with the current `github.com/trending` markup.

## Submitting Changes

We use [Changesets](https://github.com/changesets/changesets) for managing versioning and changelogs. 

If your pull request contains code changes that should be published, you must include a changeset:

1. Run the following command at the root:
   ```bash
   yarn changeset
   ```
2. Follow the prompt to select which packages you are modifying and the type of version bump (patch, minor, major).
3. Provide a clear description of the change. This text will be included in the changelogs.
4. Commit the generated markdown file in the `.changeset/` directory along with your PR.

## Release Process (Maintainers Only)

For details on how the packages are published to NPM and how GitHub Action OIDC publishing is configured, please see the [Publishing Guide](docs/PUBLISH.md).
