# Publish to npm and the Backstage plugin directory

Packages: `@aag1999/plugin-github-trending`, `@aag1999/plugin-github-trending-backend`, `@aag1999/plugin-github-trending-common`.

1. Create a public GitHub repository and push this `community-plugin-github-trending` directory (Apache-2.0).
2. Create an npm org named `aag1999` (or change the package scope) and `npm login`.
3. From a Yarn workspace that can build Backstage packages:

   ```bash
   yarn workspace @aag1999/plugin-github-trending-common build
   yarn workspace @aag1999/plugin-github-trending-backend build
   yarn workspace @aag1999/plugin-github-trending build
   yarn workspace @aag1999/plugin-github-trending-common npm publish --access public
   yarn workspace @aag1999/plugin-github-trending-backend npm publish --access public
   yarn workspace @aag1999/plugin-github-trending npm publish --access public
   ```

4. Plugin directory (the easy listing, not `community-plugins` donation): copy [plugin-directory.yaml](plugin-directory.yaml) to `microsite/data/plugins/github-trending.yaml` in [backstage/backstage](https://github.com/backstage/backstage) and open a DCO-signed PR. See [Add to Directory](https://backstage.io/docs/plugins/add-to-directory/).
