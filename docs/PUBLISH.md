# Publish to npm and the Backstage plugin directory

Packages: `@aag1999/plugin-github-trending`, `@aag1999/plugin-github-trending-backend`, `@aag1999/plugin-github-trending-common`.

npm **user** `aag_1999` must publish through npm **org** `aag1999` (the `@aag1999` scope).

## First publish (`0.1.0`) — local

Trusted publishing can only be attached after the packages exist.

1. Confirm org `aag1999` on npmjs.com; `aag_1999` can publish; 2FA is on.
2. `npm login` as `aag_1999`.
3. From this repo:

   ```bash
   yarn install
   yarn tsc
   yarn test
   yarn build
   yarn workspace @aag1999/plugin-github-trending-common npm publish --access public
   yarn workspace @aag1999/plugin-github-trending-backend npm publish --access public
   yarn workspace @aag1999/plugin-github-trending npm publish --access public
   ```

4. On **each** package page on npmjs.com: **Trusted Publisher → GitHub Actions**
   - Organization or user: `AAG1999`
   - Repository: `backstage-plugin-github-trending`
   - Workflow filename: `release.yml` (filename only)
   - Allowed action: `npm publish`

Do not store an `NPM_TOKEN` in GitHub secrets.

The first `Release` workflow run after pushing `release.yml` may fail until step 4 is done. Re-run it after the trusted publisher is bound, or wait for the next version bump.

## Later versions — Changesets

1. On a PR: `yarn changeset` (this trio is versioned together).
2. Merge the PR to `main`. CI must pass.
3. `release.yml` opens a **Version Packages** PR.
4. Merge that PR. The same workflow publishes to npm with GitHub OIDC (no token).

## Plugin directory

After the packages are on the public npm registry, copy [plugin-directory.yaml](plugin-directory.yaml) to `microsite/data/plugins/github-trending.yaml` in [backstage/backstage](https://github.com/backstage/backstage) and open a DCO-signed PR. See [Add to Directory](https://backstage.io/docs/plugins/add-to-directory/).
