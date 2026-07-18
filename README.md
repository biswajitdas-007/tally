# Tally — split expenses, settle up over UPI

[![CI](https://github.com/biswajitdas-007/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/biswajitdas-007/tally/actions/workflows/ci.yml)
[![CodeQL](https://github.com/biswajitdas-007/tally/actions/workflows/codeql.yml/badge.svg)](https://github.com/biswajitdas-007/tally/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-1c6b52.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1c6b52.svg)](CONTRIBUTING.md)

A production-grade PWA for splitting shared expenses with friends and settling up
instantly over UPI. Track who owes whom across trips, flats and dinners; the app
computes minimal settle-up transactions and generates real `upi://pay` QR codes
and deep links.

> **A warm digital ledger** — pine-green identity, brass accents, tabular
> numerals everywhere money appears. Designed mobile-first, works beautifully on
> desktop, with independently designed light and dark themes.

## Features

- **Split-expense engine** — equal or exact splits, per-person balances,
  greedy debt simplification for minimal settle-up.
- **UPI settle-up** — receipt-style card with a live scannable QR + one-tap
  deep links to GPay / PhonePe / Paytm / BHIM (Android). No gateway, no keys.
- **Google sign-in** (via Firebase) + **email invites** so friends can join.
- **Insights** — animated 6-month trend, category donut, spend-by-group, CSV export.
- **PWA** — installable, offline support (service worker), app shortcuts,
  maskable icons, web-push ready.
- **Polish** — skeletons, micro-interactions, swipe-to-delete with undo,
  optimistic UI, reduced-motion + keyboard + WCAG-AA support.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui (Base UI) · Zustand · Framer Motion · Firebase Auth · MongoDB Atlas ·
lucide-react.

Data lives in **MongoDB Atlas**, scoped per user. API routes verify the
caller's Firebase ID token (via Google's JWKS — no Admin SDK needed) before
reading/writing, so a user can only touch their own data. The client loads state
on sign-in and debounce-saves changes; nothing is stored in the browser.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

Sign-in is via **Google (Firebase Auth)** and data is stored in **MongoDB Atlas**.
Both are wired through `.env.local` (git-ignored), so `npm run dev` boots straight
to the Google sign-in screen. New users start with a clean slate — no seeded data
— and build their groups by inviting friends. Their data syncs to their account.

> Deploying? Add your production domain to **Firebase → Authentication →
> Settings → Authorized domains** so Google sign-in works there too.

### Optional integrations

Copy `.env.local.example` → `.env.local` and fill in what you need:

- **Google login** — create a [Firebase](https://console.firebase.google.com)
  project, add a Web App, enable the Google sign-in provider, and set the
  `NEXT_PUBLIC_FIREBASE_*` vars. **Required for sign-in.**
- **Email** (invites, settlement receipts, EMI reminders) — sent via Gmail SMTP
  with Nodemailer. Set `GMAIL_USER` + a Gmail **App Password** (`GMAIL_APP_PASSWORD`).
  Without them, invites are still recorded and a shareable link is shown.
- **Push notifications** — `npx web-push generate-vapid-keys`, then set the
  `*_VAPID_*` vars.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (or run `vercel`).
2. Add the env vars from `.env.local` in **Vercel → Settings → Environment
   Variables** (`NEXT_PUBLIC_FIREBASE_*` and `MONGODB_URI` are required).
3. In **MongoDB Atlas → Network Access**, allow `0.0.0.0/0` (Vercel functions use
   dynamic IPs) or use the Atlas Vercel integration.
4. In **Firebase → Authentication → Settings → Authorized domains**, add your
   Vercel domain so Google sign-in works in production.

## Scripts

```bash
npm run dev            # dev server (Turbopack)
npm run build          # production build
npm run start          # serve the production build
node scripts/gen-icons.mjs   # regenerate PWA icons from the tally mark
```

## Project structure

```
src/
  app/                 routes (home, groups, analytics, activity, account), manifest, api
  components/
    ui/                design-system primitives + shadcn components (bridged to our tokens)
    charts/            bespoke SVG donut + bar chart
    features/          add-expense, settle (UPI), invite, group, expense/balance rows
    app/               shell: sidebar, bottom nav, top bar, login, install prompt
  lib/                 types, balances engine, UPI helpers, categories, seed, firebase
  store/               Zustand stores (data + ephemeral UI)
```

Design tokens live in `src/app/globals.css`; shadcn's semantic tokens
(`--primary`, `--border`, …) are bridged to the Tally palette so every component
inherits the look and dark mode automatically.

## Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for
the dev setup, our Git Flow branching model, and the PR checklist. In short:
branch from `develop`, keep `npx tsc --noEmit`, `npm run lint`, and `npm run build`
green, and open a PR against `develop`.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? **Do not open a public issue.** Report it privately via
the repo's **Security → Report a vulnerability** tab. See **[SECURITY.md](SECURITY.md)**
for scope and our disclosure process. No secrets live in this repo or its git
history — everything sensitive is injected via environment variables.

## License

Released under the [MIT License](LICENSE). © 2026 Biswajit Das.
