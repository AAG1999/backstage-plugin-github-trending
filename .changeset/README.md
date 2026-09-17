# Changesets

For later releases (after the first `0.1.0` publish), add a changeset on the PR:

```bash
yarn changeset
```

Pick patch / minor / major and write a short summary. Merging to `main` opens a **Version Packages** PR; merging that PR publishes to npm via `.github/workflows/release.yml`.
