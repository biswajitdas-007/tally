<div align="center">

# Tally

**Split shared expenses with friends and settle up over UPI.**

[![CI](https://github.com/biswajitdas-007/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/biswajitdas-007/tally/actions/workflows/ci.yml)
[![CodeQL](https://github.com/biswajitdas-007/tally/actions/workflows/codeql.yml/badge.svg)](https://github.com/biswajitdas-007/tally/actions/workflows/codeql.yml)
[![Version](https://img.shields.io/badge/version-2.0.0-1c6b52.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-1c6b52.svg)](LICENSE)
[![Maintenance](https://img.shields.io/badge/maintenance-occasional-b8860b.svg)](#project-status)

[Live app](https://tally-eight-silk.vercel.app) · [Report a bug](https://github.com/biswajitdas-007/tally/issues) · [Security](SECURITY.md)

</div>

> [!NOTE]
> **Project status:** Tally is feature-complete and is no longer actively
> maintained on a regular schedule. The app stays online and the code remains
> available under the MIT License, but issues and pull requests may not get a
> quick response. New updates may still come later. See [Project status](#project-status).

## Overview

Tally is an installable web app (PWA) for keeping track of shared expenses —
trips, flats, dinners — and settling up. It works out who owes whom, reduces the
balances to the fewest possible payments, and lets you settle with any UPI app.

Tally is a ledger, not a payment rail: it never moves money. You pay in your own
UPI app and Tally records the settlement, so there's no payment gateway, KYC or
licensing involved.

> **Looking for budgets, accounts, loans or net worth?** Personal-finance
> tracking moved to its own app, **Money Ledger**, in Tally 2.0. The two apps are
> fully independent, with separate accounts, databases and deployments.

## Features

| | |
|---|---|
| **Groups and 1-on-1 splits** | Split equally or by exact amounts, in groups or directly with a friend. |
| **Minimal settle-up** | Balances are simplified to the fewest transfers needed to clear a group. |
| **UPI settle-up** | Copy a friend's UPI ID or scan a QR code, pay in any UPI app, then mark it settled. |
| **Repeating expenses** | Rent, subscriptions and other bills can repeat weekly or monthly. |
| **Invites** | Invite friends by email or a shareable link; they join with Google sign-in. |
| **Realtime sync** | Group members see new expenses and settlements instantly. |
| **Reminders** | Settlement receipts by email, a monthly settle-up reminder and web push. |
| **Insights** | Your share of spending: 6-month trend, category breakdown and spend by group. |
| **Works offline** | Installable PWA; changes made offline are queued and sent when you're back online. |
| **Accessible** | Mobile-first, light and dark themes, keyboard support and reduced motion. |

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), Framer Motion, lucide-react |
| State | Zustand, persisted to IndexedDB |
| Auth | Firebase Authentication (Google); ID tokens verified server-side via Google's JWKS |
| Data | MongoDB Atlas |
| Realtime | Pusher Channels |
| Email / push | Resend, Web Push (VAPID) |
| Hosting | Vercel, with a daily Vercel Cron job |
| Testing | Vitest |

Every API route verifies the caller's Firebase ID token before reading or
writing, so a user can only ever touch data they are part of.

## Getting started

### Prerequisites

- Node.js 20 or later
- A [Firebase](https://console.firebase.google.com) project with a Web App and
  the Google sign-in provider enabled
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Install and run

```bash
git clone https://github.com/biswajitdas-007/tally.git
cd tally
npm install
cp .env.local.example .env.local   # then fill it in
npm run dev                        # http://localhost:3000
```

### Configuration

All configuration lives in `.env.local` (git-ignored). See
[`.env.local.example`](.env.local.example) for the full list.

| Variables | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Google sign-in |
| `MONGODB_URI` | Yes | Database |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public URL used in invite links and emails |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | No | Invites, receipts and reminders by email. Without them, invites still produce a shareable link. |
| `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` | No | Realtime sync. Without them, the app refreshes when it comes back into view. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | No | Web push (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | For cron | Protects `/api/cron/daily` (repeating expenses and reminders) |
| `NEXT_PUBLIC_MONEY_LEDGER_URL` | No | Redirects old personal-finance links to Money Ledger |

## Deployment

Tally is set up for [Vercel](https://vercel.com); only the `main` branch deploys.

1. Import the repository in Vercel and keep **Production Branch** set to `main`.
2. Add the environment variables under **Settings → Environment Variables**.
3. In **MongoDB Atlas → Network Access**, allow Vercel's dynamic IPs
   (`0.0.0.0/0`) or use the Atlas Vercel integration.
4. In **Firebase → Authentication → Settings → Authorized domains**, add your
   production domain.

The daily cron job is defined in [`vercel.json`](vercel.json).

## Development

```bash
npm run dev            # dev server (Turbopack)
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint
npm test               # Vitest
npx tsc --noEmit       # type-check
```

### Split-ledger safety checks

Read-only tooling that protects split history (groups, expenses, settlements
and friends) during larger changes. Snapshots contain personal data and are
written to the git-ignored `.ledger/` folder.

```bash
npm run ledger:snapshot -- baseline                # dump split data and computed balances
npm run ledger:verify -- .ledger/<file>.json       # recompute balances with the current code
npm run ledger:diff -- <before>.json <after>.json  # compare two snapshots
npm run ledger:cleanup                             # post-split cleanup; dry run unless --confirm --backup <dump>
```

### Project structure

```
src/
├── app/            routes (home, groups, friends, direct, join, analytics, activity, account) and API
├── components/
│   ├── app/        app shell: navigation, top bar, sign-in, install prompt, sync
│   ├── features/   add expense, settle up, invites, groups, expense and balance rows
│   ├── charts/     SVG donut and bar charts
│   └── ui/         design-system primitives
├── lib/            balances engine, UPI helpers, repeats, emails, database access
└── store/          Zustand stores
```

Design tokens live in `src/app/globals.css`.

## Project status

Tally 2.0 is the current release, and it is considered feature-complete.

- **Maintenance:** the project is not maintained on a regular schedule. Updates
  may come later, but there is no fixed roadmap or release cadence.
- **Issues:** bug reports are welcome and will be read, but responses may be slow.
- **Security:** reported vulnerabilities are still taken seriously. Please follow
  [SECURITY.md](SECURITY.md).
- **Forks:** you are free to fork and build on Tally under the MIT License.

## Contributing

Pull requests are welcome, though reviews may take a while given the status
above. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: branch from
`develop`, keep type-check, lint, tests and build green, use lowercase
[Conventional Commits](https://www.conventionalcommits.org), and open the PR
against `develop`.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

Please **do not open a public issue** for a vulnerability. Report it privately
through the repository's **Security → Report a vulnerability** tab. See
[SECURITY.md](SECURITY.md) for scope and the disclosure process. No secrets are
stored in this repository; everything sensitive is provided through environment
variables.

## Support

If Tally is useful to you:

- [Sponsor on GitHub](https://github.com/sponsors/biswajitdas-007)
- Send a tip over UPI: `biswajit.007.private@okaxis`
- Star the repository

## License

Released under the [MIT License](LICENSE). © 2026 Biswajit Das.
