# Import the `main` ruleset

1. Wait until the **ci** GitHub Actions job has run at least once on this repo.
2. GitHub → this repo → **Settings → Rules → Rulesets → New ruleset → Import a ruleset**.
3. Upload [`main.json`](main.json).
4. Save. Enforcement is `active`.

Admin bypass stays on (`RepositoryRole` id `5`). Required check context is `ci` (GitHub Actions integration `15368`).

If import rejects `integration_id`, remove that field and pick the **ci** check in the UI after the first green run.
