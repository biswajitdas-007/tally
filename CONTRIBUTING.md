# Contributing to Tally

Thanks for your interest in improving Tally! This guide covers how to get set
up, our branching model, and what a good pull request looks like.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

```bash
git clone https://github.com/biswajitdas-007/tally.git
cd tally
npm install
cp .env.local.example .env.local   # fill in Firebase + MONGODB_URI (see README)
npm run dev                        # http://localhost:3000
```

Firebase (Google sign-in) and MongoDB Atlas are required to run the app; the
rest of the integrations in `.env.local.example` are optional. See the
[README](README.md#getting-started) for how to obtain each value.

## Branching model (Git Flow)

- `main` — production. Protected. Only release/hotfix merges land here, each
  tagged `vX.Y.Z`.
- `develop` — integration branch. Feature work merges here first.
- `feature/<slug>` — new features, branched from `develop`.
- `fix/<slug>` — bug fixes, branched from `develop`.
- `release/X.Y.Z` — release stabilization, branched from `develop`, merged to
  `main` and back to `develop`.
- `hotfix/<slug>` — urgent production fixes, branched from `main`.

**Never commit directly to `main` or `develop`** — open a pull request.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org), lowercase:

```
feat(friends): allow removing a friend once settled
fix(settle): guard against negative amounts
chore(deps): bump next to 16.x
docs(readme): document gmail smtp setup
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.

## Before you open a PR

Run the full local gate — CI runs the same checks:

```bash
npx tsc --noEmit     # types
npm run lint         # eslint (0 errors required)
npm run build        # production build must pass
```

Then:

1. Target your PR at **`develop`** (not `main`).
2. Fill in the PR template — what changed, why, and how you tested it.
3. Keep PRs focused; unrelated changes belong in separate PRs.
4. Update docs (`README`, `.env.local.example`) when behavior or config changes.
5. Never commit secrets. Anything sensitive goes in `.env.local` (git-ignored).

## Code style

- TypeScript everywhere; prefer explicit types at module boundaries.
- Match the surrounding code — naming, comment density, and idiom.
- UI uses the design tokens in `src/app/globals.css`; avoid ad-hoc hex values.
- Money is always in paise-accurate rupees; use the `formatINR` helper.

## Reporting bugs & requesting features

Use the issue templates under **Issues → New issue**. For security
vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening an issue.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE) that covers this project.
