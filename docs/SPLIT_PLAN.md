# Plan: Splitting Tally into two products

> **Status:** v4, approved for execution · **Date:** 2026-11-19 · **Base:** `main` @ `f24565d` (v1.41.1)
>
> Goal: separate the current PWA into two independent products, each with its
> own repository, configuration, database, deployment, CI and release cycle:
>
> - **Tally** — split bills with friends, settle up over UPI.
> - **Money Ledger** — personal finance: income/spend, accounts, cards, loans/EMIs,
>   investments, budget, emergency fund, reports.

### What changed from v1 (v2 – v4)

| # | Change | Effect on the plan |
|---|---|---|
| 1 | **The "paid from / received into account" feature is removed.** Splits and settlements no longer touch bank, card or wallet balances. | `Expense.accountId`, the `AccountPicker` in the split sheets, the split part of `linkedDelta`, card outstanding from splits, and "unparked" money are all deleted. Most of the hard coupling disappears. |
| 2 | **Money data is test-only.** Nothing in `finance` or the money fields on `users` needs to survive. | No money migration and no money parity check. Money Ledger starts on an **empty** database. |
| 3 | **Split history must not be lost**: friends, groups, expenses and settlements. | New §8, *Protecting split history*: splits never move databases. Backups, a ledger snapshot compared before and after every phase, and an allowlist that stops scripts from touching split data. |
| 4 | **(v3) No link between the two apps.** They're two independent applications with their own features. | The `/api/feed` bridge, `split_feed`, `SplitShare` hooks and the related decision are removed. Each app has its own Firebase project too (D1). §10 now records that integration is out of scope. The former Phase 5 (cleanup) is renumbered to Phase 4. |
| 5 | **(v4) Name & execution.** The money app is **Money Ledger** (repo `money-ledger`). | Phase 0 keeps only the behaviour changes (0.0, 0.1, 0.3, 0.8). The structural splits (former 0.2, 0.4–0.7) happen at the cut in Phase 2, where each repo deletes the other side and `tsc` acts as the import fence. Doing them in place first would mean writing every split twice. |

---

## Table of contents

1. [Why split](#1-why-split)
2. [Current architecture (as-is)](#2-current-architecture-as-is)
3. [Coupling inventory](#3-coupling-inventory)
4. [Target architecture (to-be)](#4-target-architecture-to-be)
5. [File-by-file allocation](#5-file-by-file-allocation)
6. [Data model & database split](#6-data-model--database-split)
7. [Phased execution plan](#7-phased-execution-plan)
8. [Protecting split history](#8-protecting-split-history)
9. [Cutover runbook](#9-cutover-runbook)
10. [Out of scope: no integration between the apps](#10-out-of-scope-no-integration-between-the-apps)
11. [Decisions needed before starting](#11-decisions-needed-before-starting)
12. [Risks & mitigations](#12-risks--mitigations)
13. [Testing strategy](#13-testing-strategy)
14. [Rollback plan](#14-rollback-plan)
15. [Post-split maintenance model](#15-post-split-maintenance-model)
16. [Housekeeping found during review](#16-housekeeping-found-during-review)
17. [Master checklist](#17-master-checklist)

---

## 1. Why split

- **Clutter.** The home screen, navigation, analytics, activity and report pages
  each serve both audiences. Someone who only splits dinners sees net worth and
  EMIs; someone who only tracks money sees ledgers and invites. The app even has
  a heuristic (`usesMoney()` + `moneyMode`) just to guess which home screen to show.
- **Different products, different users.** Splitting is social (groups, invites,
  realtime sync, UPI). Money is private and single-user (accounts, liabilities,
  EMI crons). Their release pace, risk and data sensitivity differ.
- **Blast radius.** A bug in card-balance logic today ships with, and can break,
  the split ledger, and the other way round. One `/api/state` payload loads both.
- **Data isolation.** Personal financial data (loans, balances, investments)
  shouldn't sit in the same database as socially shared data.

## 2. Current architecture (as-is)

| Concern | Today |
|---|---|
| Framework | Next.js 16.2 (App Router), React 19, TS, Tailwind v4, shadcn/Base UI, Zustand, Framer Motion |
| Auth | Firebase Auth (Google); server verifies ID token via JWKS (`src/lib/auth-server.ts`, `jose`) |
| Database | One MongoDB Atlas DB `tally` (`src/lib/mongodb.ts`) |
| Collections | `users`, `groups`, `expenses`, `finance`, `invites` |
| Client state | One Zustand store `src/store/useStore.ts` (~30 actions), persisted to IndexedDB; one UI store `src/store/useUI.ts` |
| Bootstrap | `GET /api/state` → `buildState()` (`src/lib/db.ts`) returns *everything* |
| Realtime | Pusher (`pusher`, `pusher-js`): "sync" events to group members |
| Email | Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) |
| Push | web-push / VAPID |
| Cron | Vercel cron `0 4 * * *` → `/api/cron/daily` (+ legacy alias `/api/cron/emi`) |
| Rate limiting | `src/proxy.ts` on `/api/*` |
| Deploy | One Vercel project, prod on `main` only |
| CI | `ci.yml`, `codeql.yml`, `sonarcloud.yml`, dependabot |

**Split data (production, must be preserved):** `groups`, `expenses` (incl.
settlements and repeating splits), `invites`, plus `users.contacts`,
`users.removedFriends`, `users.upiId` and the profile fields.

**Money data (test only, disposable):** the `finance` collection plus `users`
fields `budget`, `accounts`, `liabilities`, `emergency`, `recurrings`,
`debtPlan`, `receiptKeys`, `moneyMode`.

## 3. Coupling inventory

Status after v2 decisions:

| ID | Coupling | Location | v2 resolution |
|---|---|---|---|
| **C1** | `Expense.accountId`: a split or settlement records which account it moved through | `lib/types.ts`, `db.ts` `ExpenseDoc`, `api/expenses/route.ts:76`, `api/settle/route.ts:67`, `AccountPicker` in `add-expense-sheet.tsx:305` & `settle-sheet.tsx:270`, `store/useStore.ts` `addExpense`/`settleUp` | **Remove** (feature dropped) |
| **C2** | Account & card balances read `expenses` | `lib/accounts.ts` `linkedDelta` / `liveBalance` / `accountTransactions` / `withLiveBalances`; `lib/liabilities.ts` `liveLiabilityOutstanding` / `withLiveOutstanding` / `cardStatus` | **Remove** the `expenses` parameter; balances come from `finance` only |
| **C3** | Spend/budget include "my share of splits" | `lib/money.ts` `monthlyMoney` / `spendByCategory`, `lib/insights.ts`, `lib/budget-alerts.ts`, `lib/health.ts`, `app/analytics`, `app/report` | **Cut.** Money counts personal entries only; Tally shows split spend in its own Insights. |
| **C4** | "Unparked" money: settlements received but not assigned to an account | `lib/accounts.ts` `unparkedAmount`, `park-sheet.tsx`, `balances.ts:243-245` | **Remove** (depends on C1) |
| C5 | Mixed activity feed | `lib/activity.ts`, `app/activity/page.tsx` | Each app shows its own |
| C6 | One state payload | `lib/db.ts` `ClientState` / `buildState`, `lib/api.ts` `fetchState`, `api/state/route.ts` | Split per app |
| C7 | One client store | `store/useStore.ts` | Split per app |
| C8 | One UI store | `store/useUI.ts` | Split per app |
| C9 | One cron | `lib/cron-daily.ts` `runDaily` | Split per app |
| C10 | Home-screen mode | `lib/money-mode.ts`, `users.moneyMode`, `app/page.tsx:150,382,404` | **Delete** |
| C11 | Account deletion & export | `lib/delete-account.ts`, `lib/export.ts`, `delete-account-dialog.tsx` | Split per app |
| C12 | Navigation | `nav-items.ts`, `command-palette.tsx`, `menu-drawer.tsx`, `bottom-nav.tsx` | Split per app |

With C1, C2, C4 removed and C3 cut, **no behavioural link remains**. Everything else is structural and is resolved by giving each app its own copy.

## 4. Target architecture (to-be)

```
 ┌──────────────────────────┐            ┌──────────────────────────┐
 │  Tally (splits)           │            │  Money Ledger              │
 │  repo: tally              │            │  repo: money-ledger        │
 │  Vercel project A         │            │  Vercel project B         │
 │  existing domain          │            │  new domain               │
 │  Firebase project A       │            │  Firebase project B       │
 │  (existing)               │            │  (new)                    │
 └────────────┬─────────────┘            └────────────┬─────────────┘
              │                                         │
 ┌────────────▼─────────────┐            ┌────────────▼─────────────┐
 │ EXISTING Atlas cluster    │            │ NEW Atlas cluster B       │
 │ db: tally                 │            │ db: money_ledger           │
 │ users, groups, expenses,  │            │ users, finance            │
 │ invites (data stays put)  │            │ (empty at launch)         │
 └──────────────────────────┘            └──────────────────────────┘

        No shared database, auth project, API or runtime dependency.
```

**Key principle: split data never moves.** Tally keeps its current repo, Vercel
project, domain, database, Firebase app, Pusher app and VAPID keys. Only code is
removed from it. Money Ledger is the *new* thing, built on fresh infrastructure.

| | **Tally** (splits) | **Money Ledger** |
|---|---|---|
| Repository | `biswajitdas-007/tally` (kept) | `biswajitdas-007/money-ledger` (new, history preserved) |
| Vercel project | existing | new |
| Domain | existing (invite links in sent emails keep working) | new (e.g. `money.<domain>`) |
| MongoDB | existing cluster, db `tally` | new cluster B (separate Atlas project), db `money_ledger`, **empty** |
| Firebase | existing project (unchanged) | **new** Firebase project (Google sign-in enabled) |
| Realtime | Pusher (unchanged) | none initially |
| Email | Resend (invites, settlement, reminders, welcome) | Resend (EMI, card, due, declined, receipts, welcome), separate key/sender |
| Push | existing VAPID keys (existing subscriptions keep working) | new VAPID keypair |
| Cron | daily: repeat splits, settle reminders (1st of month) | daily: EMIs, recurring entries, budget alerts |
| PWA | existing manifest (trimmed shortcuts) | own manifest, icons, name, shortcuts |
| CI | ci, codeql, sonar, dependabot | ci, codeql, sonar (new project), dependabot |

**Shared code: copy, don't package (for now).** UI primitives, design tokens,
shell, hooks and server utilities are duplicated into both repos at the cut. With
one maintainer, a cross-repo npm package adds versioning and publishing work for
little payoff. Revisit (§15) if `components/ui` drift starts to hurt.

## 5. File-by-file allocation

Legend: **S** = Tally (splits) only · **M** = Money Ledger only · **B** = both
(copied) · **B\*** = both, but trimmed/edited per app · **✗** = delete.

### 5.1 Routes (`src/app`)

| Path | Alloc | Notes |
|---|---|---|
| `page.tsx` (home) | **B\*** | S: split home (balance hero, groups, pending, recent). M: today's money-mode home. Remove `usesMoney` branching in both. |
| `groups/`, `groups/[id]/` | S | |
| `friends/` | S | |
| `direct/` | S | |
| `join/[id]/` | S | Must stay on the existing domain so invite links already sent keep working. |
| `money/` | M | |
| `wealth/` | M | |
| `debt/` | M | |
| `report/` | **M\*** | Drop split section (`scopedDebts`, `splitOverview`, `myShare`) and `unparkedAmount`. |
| `analytics/` | **B\*** | S: split category donut + trend (`balances.categoryBreakdown/monthlyTrend`). M: money insights (`insights`, `monthlyMoney`). |
| `activity/` | **B\*** | Each shows only its own domain. |
| `account/` | **B\*** | S: profile, UPI ID. M: profile, money prefs. Both: delete account, theme, support. |
| `offline/`, `template.tsx`, `layout.tsx`, `providers.tsx`, `globals.css`, `favicon.ico` | B | Rename title/metadata in M. |
| `manifest.ts` | **B\*** | Separate name, short_name, icons, shortcuts, theme colour. |

### 5.2 API routes (`src/app/api`)

| Route | Alloc |
|---|---|
| `state` | **B\*** (each returns its own slice; liability migration moves to M) |
| `expenses`, `expenses/[id]` | S (stop writing `accountId`; silently ignore it in input for one release) |
| `groups`, `groups/[id]` | S |
| `friends/[id]` | S |
| `invite/*` (create, get, accept, resend) | S |
| `settle` | S (stop writing `accountId`; ignore it in input for one release) |
| `pusher/auth` | S |
| `finance`, `finance/[id]` | M |
| `budget` | M |
| `wealth` (+ test) | M |
| `recurring` | M |
| `liabilities/[id]/{confirm,decline,receipt}` (+ test) | M |
| `profile` | **B\*** (S: name/upiId; M: name; `moneyMode` dropped) |
| `account` (delete) | **B\*** |
| `push/subscribe`, `push/unsubscribe` | B |
| `cron/daily` | **B\*** (different job bodies) |
| `cron/emi` | M (legacy alias), or ✗ if no external schedule uses it |

### 5.3 Library (`src/lib`)

| File | Alloc | Notes |
|---|---|---|
| `balances.ts` (+test) | S | **Not modified** apart from removing the `accountId` comments at lines 243–245 (§8.4). |
| `upi.ts`, `qr.ts` (+tests) | S | |
| `settlement-email.ts`, `settled-email.ts`, `reminder-email.ts` | S | |
| `pusher-client.ts`, `pusher-server.ts` | S | |
| `money.ts` (+test) | M | Drop `splitSpend` (C3). |
| `accounts.ts` | M | Drop `expenses` param from `linkedDelta` etc.; delete `unparkedAmount` (C2, C4). |
| `liabilities.ts` (+test), `cards.ts`, `card-balance.test.ts`, `card-baseline.test.ts` | M | Drop `expenses` param (C2); update tests that assert split→card effects. |
| `payoff.ts`, `debt.ts` | M | |
| `health.ts` (+test) | M | |
| `insights.ts` | M | Drop `myShare` usage (C3). |
| `investments.ts`, `banks.ts`, `reconcile.ts` (+test) | M | |
| `recurring.ts` (+test) | **B** | `duePeriods` is used by both (recurring rules & repeating splits). Copy. |
| `budget-alerts.ts` | M | Stop reading the `expenses` collection (C3). |
| `categorise.ts` | M, or **B** if the add-expense sheet's live guess uses it (to verify) | |
| `card-email.ts`, `emi-email.ts`, `due-email.ts` (+test), `declined-email.ts` | M | |
| `money-mode.ts` (+test) | ✗ | |
| `cron-daily.ts` (+test) | **B\*** | S: `repeatExpenses`, `remindToSettle`. M: `runEmis`, `runRecurring`, budget alerts. |
| `activity.ts` (+test) | **B\*** | Each own domain only. |
| `export.ts` | **B\*** | Each exports its own data. |
| `delete-account.ts` | **B\*** | S: keeps existing group/expense/contact logic **unchanged** (§8.4). M: `finance.deleteMany` + `users.deleteOne`. |
| `db.ts` | **B\*** | Split `UserDoc`, `collections()`, `buildState`, `ClientState`. `claimReceipt/releaseReceipt`, `baselinedCards` → M; `knownUids`, `addContact`, `realUids`, orphan self-heal → S. |
| `types.ts` | **B\*** | S: Person, Split, Expense (no `accountId`), Group, Invite, Balance, PendingInvite, CategoryKey. M: FinanceEntry, Recurring, Budget, Account, Liability, Emergency, DebtPlanData, investment types, CategoryKey. |
| `api.ts` (+test) | **B\*** | S: invites/friends/settle/state. M: EMI confirm/decline/receipt/state. `token()`, `deleteAccount` in both. |
| `categories.ts` | B | Expense categories in both; income categories M only. |
| `utils.ts` (+test), `version.ts`, `celebrate.ts` | B | |
| `auth-server.ts`, `firebase.ts`, `mongodb.ts`, `rate-limit.ts`, `api-helpers.ts` | B | `mongodb.ts` in M: db name + global cache key. |
| `email.ts`, `notify.ts`, `webpush.ts` (+test) | B | |
| `sync-queue.ts`, `idb-storage.ts` | B | Distinct IDB names in M. |
| `seed.ts` | to verify; likely ✗ | |

### 5.4 Components

| Component | Alloc |
|---|---|
| `components/ui/*`, `components/charts/*`, `components/theme-provider.tsx` | B |
| `app/app-chrome, app-shell, auth-listener, bottom-nav, install-prompt, login-screen, logo, menu-drawer, month-nav, notification-prompt, page-grid, page-header, push-auto, sidebar, sync-manager, tally-loader, theme-toggle, top-bar` | B (branding & nav per app) |
| `app/nav-items.ts`, `app/command-palette.tsx` | **B\*** |
| `features/add-expense-sheet` | S (remove `AccountPicker` + `accountId` state) |
| `features/settle-sheet` | S (remove `AccountPicker` + `accountId` state) |
| `features/balance-hero, create-group-sheet, delete-group-dialog, direct-card, expense-detail-sheet, expense-row, group-card, group-settings-sheet, invite-dialog, pending-splits-card, person-balance-row, person-debt-row, split-overview-card, upi-qr, who-owes-whom-sheet` | S |
| `features/account-detail-sheet, account-picker, add-money-sheet, bank-badge, budget-sheet, card-dashboard-sheet, emergency-sheet, emi-confirm, investment-sheet, money-row, reconcile-sheet, recurring-sheet, transfer-sheet, wealth-sheet` | M |
| `features/park-sheet` | M if it still parks money between own accounts; ✗ if it only handled settlements received (C4). To verify. |
| `features/delete-account-dialog, support-sheet` | B (delete-dialog copy differs) |

### 5.5 Hooks, stores, scripts, config

| Item | Alloc |
|---|---|
| `hooks/*` | B (`use-presence` likely S only, Pusher) |
| `store/useStore.ts` | **B\***, split into two stores |
| `store/useUI.ts` | **B\***, split sheets per domain |
| `src/proxy.ts` | B |
| `scripts/gen-icons.mjs` | B (M gets its own mark/colour) |
| `scripts/shots*.mjs` | B\* (routes differ) |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `vitest.config.ts` | B |
| `vercel.json` | B\* (cron paths) |
| `sonar-project.properties` | B\* (new project key in M) |
| `.github/*` | B\* (badges, CODEOWNERS, FUNDING) |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `AGENTS.md`, `CLAUDE.md` | B\* |
| `.env.local.example` | B\* (see §6.4) |

### 5.6 Dependencies after the split

| Package | S | M |
|---|---|---|
| `pusher`, `pusher-js` | ✓ | ✗ |
| `uqr`, `jsqr` (dev) | ✓ | ✗ |
| `react-day-picker` | check | ✓ |
| `canvas-confetti` | check | ✓ |
| everything else | ✓ | ✓ |

Confirm with `npx depcheck` after pruning each repo.

## 6. Data model & database split

### 6.1 Tally (splits): existing cluster, db `tally`, data stays in place

| Collection | Action |
|---|---|
| `groups` | **Untouched.** |
| `expenses` | **Untouched**, except an optional, backed-up `$unset: { accountId: "" }` in Phase 4 (§8.5). The app simply stops reading and writing it. |
| `invites` | **Untouched.** |
| `users` | Keep `_id`, `name`, `email`, `photoURL`, `avatarColor`, `upiId`, `contacts`, `removedFriends`, `pushSubs`, `updatedAt`. In Phase 4, `$unset` only the allowlisted money fields: `budget`, `accounts`, `liabilities`, `emergency`, `recurrings`, `debtPlan`, `receiptKeys`, `moneyMode`. |
| `finance` | Test data. Back it up, then **drop** in Phase 4. |

### 6.2 Money Ledger: new cluster B, db `money_ledger`, empty at launch

| Collection | Shape |
|---|---|
| `users` | `_id` (Firebase uid), `name`, `email`, `photoURL`, `avatarColor`, `pushSubs`, `budget`, `accounts`, `liabilities`, `emergency`, `recurrings`, `debtPlan`, `receiptKeys`, `updatedAt`. Created on first sign-in by `upsertUser`. |
| `finance` | Existing `FinanceDoc`, minus anything split-related. |

**No data is copied from the existing database.** Test money data is left
behind. If you want to keep your own test setup (a few accounts and loans), §7
Phase 3 has an optional one-off copy for a single uid.

### 6.3 Indexes

Add `scripts/ensure-indexes.mjs` to each repo and run it on first deploy:
- Tally: confirm existing indexes (`groups.memberUids`, `expenses.memberUids + date`,
  `expenses.recurring`, `invites.*`, `users.contacts.id`). **Read and compare only;
  never drop.**
- Money: `finance.uid + date`.

### 6.4 Environment variables

| Variable | Tally | Money |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | unchanged | new Firebase project config |
| `MONGODB_URI` | unchanged | cluster B |
| `NEXT_PUBLIC_APP_URL` | unchanged | new domain |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | unchanged | new key/sender |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `PUSHER_APP_ID`, `PUSHER_SECRET` | unchanged | ✗ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | unchanged | **new** keypair |
| `CRON_SECRET` | unchanged | **new** secret |

## 7. Phased execution plan

The idea is the same as v1: **decouple inside the current repo first**, where one
test suite and one deploy protect you. The repo split then becomes a mechanical
copy-and-delete. Every phase that touches Tally is gated by the split-history
checks in §8.

### Phase 0: Decouple in place (in `tally`, branches off `develop`)

**0.0 Safety net first (before any code change)** → see §8.2 and §8.3
- Confirm Atlas backups (or set up scheduled `mongodump`).
- Write `scripts/ledger-snapshot.mjs` and take the **baseline snapshot** from production.
- Pin the split tests: `balances.test.ts`, `upi.test.ts`, `api.test.ts`,
  `cron-daily.test.ts` (split parts) must stay green with **unchanged assertions**
  for the whole project.

**0.1 Remove the account-linking feature (C1, C2, C4)**: own PR, `feat/remove-split-account-link`
- UI: remove `AccountPicker` and `accountId` state from `add-expense-sheet.tsx`
  and `settle-sheet.tsx`.
- Store: stop sending `accountId` in `addExpense` / `settleUp`.
- API: `expenses` and `settle` routes stop *writing* `accountId`, but **ignore**
  it in input (don't reject it), so cached old clients keep working.
- `accounts.ts`: drop the `expenses` loop from `linkedDelta`, the `expenses` param
  from `liveBalance` / `accountTransactions` / `withLiveBalances`; delete
  `unparkedAmount` and its UI (park nudge on money/report pages; `park-sheet` if
  it only served that).
- `liabilities.ts`: drop `expenses` from `liveLiabilityOutstanding` /
  `withLiveOutstanding` / `cardStatus`.
- Update every call site; update `card-balance` / `card-baseline` tests that
  asserted split→card effects (test data only, so changed numbers are expected).
- **Gate:** ledger snapshot diff is empty (§8.3). Splits must be byte-for-byte
  identical in balances.

**0.3 Cut split spend out of money logic (C3)**
- `monthlyMoney`, `spendByCategory`, `insights`, `health`, `budget-alerts` take
  `finance` only: drop the `expenses` parameter, `splitSpend`, and every
  `myShare` import from `balances.ts`. Spend means personal entries only.
- `budget-alerts.ts` stops querying the `expenses` collection.
- Money's analytics and report pages show personal spend only. Split spend stays
  visible in Tally's own Insights page (category donut + trend from `balances.ts`).

**0.2, 0.4–0.7 (moved to Phase 2):** splitting server state, client stores, the
cron, activity, export and delete-account happens at the cut. Each repo deletes
the other domain's code, and `tsc --noEmit` failing on any dangling import is the
fence. The rules from v3 still apply when doing it there:
- Tally's `buildState` keeps the orphan self-heal and person resolution exactly as is (§8.4).
- `repeatExpenses` and its `recurringLast` stamps move **unchanged** (§8.4).
- Persisted client cache: bump the `persist` `version` with a `migrate` that drops
  the old shape, so the client refetches.

**0.8 Remove the mode heuristic (C10) and split navigation (C12)**
- Delete `money-mode.ts` (+test) and `moneyMode` from types/store/profile API.

**Phase 0 exit criteria**
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` green.
- [ ] Ledger snapshot diff empty after each merged PR (§8.3).
- [ ] Production stable for ≥ 1 week.

### Phase 1: Provision infrastructure for Money

- [ ] GitHub repo `money-ledger` (private until launch).
- [ ] Atlas: new project + cluster B, DB user, network access, backups enabled.
- [ ] Firebase: create a **new project**, add a Web App, enable Google sign-in, add the new domain to Authorized domains.
- [ ] Vercel: new project linked to `money-ledger`, Production Branch `main`, branch previews disabled.
- [ ] New domain DNS + Vercel domain.
- [ ] Resend: verify sender for new domain; new API key.
- [ ] New VAPID keypair, new `CRON_SECRET`.
- [ ] SonarCloud project B; CodeQL enabled.

Nothing in this phase touches Tally.

### Phase 2: Cut the repositories

**2.1 Create `money-ledger` with history**
```bash
git clone --bare git@github.com:biswajitdas-007/tally.git
cd tally.git && git push --mirror git@github.com:biswajitdas-007/money-ledger.git
```
Only `main` and `develop` are pushed (not dependabot/feature branches).
Then in `money-ledger`, branch `feature/extract-money`:
- Delete split routes/APIs/components/libs, Pusher, UPI, invite emails.
- Split state, store, UI store, cron, activity, export, delete-account down to money only.
- Rebrand: `package.json` name/version (`1.0.0`), manifest, icons, metadata,
  README, badges, `.env.local.example`, `vercel.json` cron, sonar key, FUNDING, CODEOWNERS.
- `mongodb.ts`: db `money_ledger`, global cache key `_moneyLedgerMongo`.
- IDB / localStorage keys prefixed `money_ledger_`.
- `npx depcheck` → prune.

**2.2 Prune `tally`**, branch `feature/extract-splits`
- Delete money routes/APIs/components/libs and money emails.
- Split state, store, UI store, cron, activity, export, delete-account down to splits only.
- Remove `Expense.accountId` from the TS types. `ExpenseDoc` keeps it as
  `/** @deprecated legacy, ignored */ accountId?: string` until Phase 4.
- Redirects in `next.config.ts`: `/money`, `/wealth`, `/debt`, `/report` → new
  domain (302 while transitioning).
- Dismissible banner: "Money tools now live in Money Ledger →". Since money data is
  only test data, show it to everyone once.
- Prune deps.
- **Gate:** ledger snapshot diff empty against a preview deployment pointed at a
  restored copy of production (§8.3).

### Phase 3: Launch & cut over

Much simpler than v1: **no data migration.**
1. Deploy Money Ledger to the new domain (empty database).
2. Merge `feature/extract-splits` → `main` (Tally deploys without money).
3. Optional: a one-off `scripts/copy-test-money.mjs --uid <your uid>` if you want
   your own test accounts and loans in the new app. Otherwise start fresh.
See §9 for the runbook.

### Phase 4: Cleanup (≈ 30 days after cutover)

All destructive steps run through the allowlisted cleanup script (§8.5), after a fresh backup.
- [ ] Redirects 302 → 301; remove banner later.
- [ ] Drop `finance` collection on the Tally cluster.
- [ ] `$unset` the allowlisted money fields on Tally `users`.
- [ ] Optional: `$unset` `expenses.accountId`.
- [ ] Remove legacy `accountId` input tolerance in the Split API.
- [ ] Remove `/api/cron/emi` alias if unused.

## 8. Protecting split history

**Rule: friends, groups, expenses and settlements are production data and must
come out of every phase identical.** This section covers how that's guaranteed.

### 8.1 What counts as split history

| Data | Where |
|---|---|
| Groups and members (incl. pending placeholders, offline members) | `groups` (`members`, `memberUids`, `offlineIds`) |
| Expenses, splits, notes, categories, dates | `expenses` |
| Settlements | `expenses` with `isSettlement: true` |
| Direct (non-group) splits | `expenses` with `groupId: null` |
| Repeating splits & their run stamps | `expenses.recurring`, `expenses.recurringLast` |
| Friends | `users.contacts`, `users.removedFriends` |
| Pending and accepted invites, invite links | `invites`; `/join/[id]` route on the existing domain |
| Profile shown to friends | `users.name`, `photoURL`, `avatarColor`, `upiId` |
| Push subscriptions | `users.pushSubs` (bound to the existing domain, so they keep working) |

### 8.2 Structural protections

1. **Split data never moves.** Same cluster, same DB, same collections, same
   domain. The split is done by *removing money code from Tally*, not by moving
   split data anywhere.
2. **No script writes to `groups`, `expenses` or `invites`** during Phases 0–3.
   The only planned write is the optional `$unset accountId` in Phase 4, which
   doesn't affect any balance (`balances.ts` never reads `accountId`).
3. **Allowlisted cleanup.** `npm run ledger:cleanup` (`scripts/ledger/cleanup.ts`, allowlist in `src/lib/ledger-cleanup.ts`) has a hard-coded
   allowlist of the 8 money field names on `users` and the `finance` collection.
   It refuses to run without `--confirm`, requires a backup file path that
   exists, and logs counts before and after.
4. **Backups.**
   - Check the Atlas tier: **M0/free clusters have no automated backups.** If so,
     upgrade for the project's duration or run `mongodump` before every Tally deploy.
   - Take a full `mongodump` before Phase 0.1, before Phase 2 merge, before Phase 4.
     Keep them for 90 days, off the laptop (encrypted cloud storage).
   - Do one test restore into a scratch cluster, so you know the backup actually works.
5. **Split logic is frozen.** `balances.ts`, the split parts of `db.ts` (orphan
   self-heal, `knownUids`, person resolution), `repeatExpenses`, `remindToSettle`
   and split `delete-account` logic are **moved, never rewritten**. PRs that
   change their behaviour are out of scope for this project.

### 8.3 Ledger snapshot: the gate for every phase

`scripts/ledger-snapshot.mjs`, read-only, takes `MONGODB_URI`:

For **every user**, it records:
- counts: groups, expenses, settlements, direct splits, contacts, invites (pending/accepted)
- `scopedDebts(expenses, uid)`: what each friend owes / is owed, per group and direct
- `splitOverview(expenses, uid)` and `scopedTotals`
- per group: `memberNet(expenses)` and `simplifiedPlan(expenses)`
- a stable hash of each `groups` / `expenses` / `invites` doc **excluding `accountId`**
  (and excluding `updatedAt` if added later)

Output: `snapshot-<label>-<timestamp>.json` (kept out of git, contains personal data).

`scripts/ledger-diff.mjs before.json after.json` → **must print "no differences"**.

| When | Compare |
|---|---|
| Before Phase 0.1 | take **baseline** |
| After each Phase 0 PR is deployed | baseline vs now. Only new expenses created by real users in between are allowed, so the diff restricts to docs that exist in both |
| Phase 2 rehearsal | baseline vs restored-copy + new Tally build (computed with the **new** code's `balances.ts`) |
| After cutover | pre-cutover vs post-cutover |
| Before & after Phase 4 cleanup | must be identical |

The snapshot runs `balances.ts` from **both** the old and new code against the
same data, so it catches logic regressions as well as data changes.

### 8.4 Code-level guards

- Pinned tests (§7 Phase 0.0) with unchanged assertions.
- New test: an expense/settlement **with** a legacy `accountId` produces exactly
  the same balances as without one.
- New test: Split API accepts a request containing `accountId` (old cached client)
  and stores the expense without it.
- Persisted client cache gets a version bump + `migrate` → refetch. IndexedDB is
  never the only copy.
- `buildSplitState` keeps: orphan self-heal, placeholder members, contacts merge,
  "Someone" fallback for unknown ids, newest-first group order.
- Split `delete-account` keeps: unsettled-balance gate, solo vs shared expense
  handling, leaving groups, deleting empty groups, removing from others' contacts.

### 8.5 Phase 4 cleanup procedure

1. Fresh `mongodump` + verify it restores.
2. `ledger-snapshot` → `pre-cleanup.json`.
3. `npm run ledger:cleanup` (dry run), review counts.
4. `npm run ledger:cleanup -- --confirm --backup <path> --unset-account-id` (snapshots and compares before/after itself).
5. `ledger-snapshot` → `post-cleanup.json`; `ledger-diff` must be empty.

## 9. Cutover runbook

No data migration, so no maintenance mode is needed. Target a low-traffic window.

| Step | Action | Check |
|---|---|---|
| T-7d | Restore prod dump to scratch; run Tally prune build against it; snapshot diff | empty diff |
| T-2d | Deploy Money Ledger to the new domain behind Vercel Deployment Protection; smoke test | §13.4 |
| T-0 | `mongodump` Tally cluster; take `pre-cutover` snapshot | backup verified |
| T+5 | Remove protection on Money Ledger (goes live) | |
| T+10 | Merge `feature/extract-splits` → `main`; Tally deploys | build green |
| T+20 | Smoke tests both apps (§13.4); `/money` etc. redirect | |
| T+25 | `post-cutover` snapshot; diff vs `pre-cutover` | **empty**, or roll back (§14) |
| T+30 | Trigger both crons manually; verify no duplicate repeated splits | |
| T+24h | Monitor errors, cron logs, email bounces; snapshot diff again | |

## 10. Out of scope: no integration between the apps

Tally and Money Ledger are **two independent applications**. After the split:

- No API calls between them, in either direction (no feed, no webhooks, no sync).
- No shared database, collections, Firebase project, Pusher app, VAPID keys,
  Resend key or cron secret.
- No shared runtime code. Common UI/utility code is *copied* at the cut and then
  evolves independently in each repo (§15).
- Split spend is **not** counted in Money's spend, budget, insights or health
  score, and Money accounts are **not** affected by splits or settlements.
- A person using both apps signs in to each separately (both use Google, so it's
  one tap each) and has two separate accounts.

The only things that cross over are user-facing pointers: the temporary
redirects and the "Money tools now live in Money Ledger" banner in Tally (§7 Phase 2.2).

Any future integration would be a new project with its own plan.

## 11. Decisions needed before starting

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| ~~D-acct~~ | ~~Account linking for splits~~ | | **Decided: removed.** |
| ~~D-migr~~ | ~~Migrate money data~~ | | **Decided: no, test data only.** |
| **D1** | Identity | (a) One Firebase project, two Web Apps · (b) Two Firebase projects | **(b)**: with no link between the apps there's no need for a shared uid. Tally keeps its existing project untouched; Money gets its own. Users still sign in with Google in both. |
| ~~D-link~~ | ~~Integration between the apps~~ | | **Decided: none** (§10). |
| ~~D3~~ | ~~Money app name~~ | | **Decided: Money Ledger**, repo `money-ledger`. Domain still to choose. |
| **D4** | Money repo visibility & licence | public MIT / private | Your call. |
| **D5** | Shared UI code | copy / npm package / submodule | **Copy** now. |
| **D6** | Versions | Tally `2.0.0`, Money `1.0.0` | Recommended. |
| **D7** | Keep your own test money setup? | copy for one uid / start fresh | Start fresh. |

## 12. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Split balances or history change** | **Critical** | Data never moves; split logic frozen; ledger snapshot gate on every deploy; pinned tests; backups + tested restore (§8). |
| Accidental write/delete on split collections | Critical | No scripts touch `groups`/`expenses`/`invites`; cleanup script allowlist + `--confirm` + backup requirement. |
| No backups on free Atlas tier | High | Check tier in Phase 0.0; upgrade or `mongodump` before each deploy. |
| Old cached clients send `accountId` | Low | API ignores it for one release. |
| Persisted IDB cache shape changes | Low | Persist version bump + refetch. |
| Repeating splits run twice after cron split | Med | `repeatExpenses` moved unchanged with its `recurringLast` stamps; manual trigger + check at cutover. |
| Invite links break | Med | Tally keeps the domain and `/join/[id]`; `invites` untouched. |
| Users can't find money features | Low | Redirects + banner. |
| Installed PWA shows cached money pages | Low | Bump service-worker version; redirects. |
| Shared UI drifts | Low | Accepted; quarterly diff (§15). |

## 13. Testing strategy

### 13.1 Unit (vitest)
- Port each test to the repo that owns its subject (§5).
- Split tests pinned with unchanged assertions (§8.4), plus the new `accountId`
  tolerance tests.
- Money tests updated for "no split input": `card-balance`, `card-baseline`,
  `money`, `health`, `liabilities`.

### 13.2 Split-history verification
- `ledger-snapshot` / `ledger-diff` scripts with their own fixture test: a
  synthetic dataset with groups, direct splits, settlements, repeating splits,
  pending members, removed friends and legacy `accountId`. Proves the diff
  catches a deliberately changed amount.
- Rehearsal on a restored production dump before cutover.

### 13.3 Integration
- Each API route: auth required, uid scoping.
- Split APIs accept a legacy `accountId`.

### 13.4 Smoke tests at cutover
- **Tally:** existing groups and friends visible with **the same balances as the
  pre-cutover screenshot** · history scrolls back to the oldest expense · add
  equal & exact split · settle via UPI copy (no account picker shown) · invite +
  accept via an old invite link · push received by another member · realtime
  sync · `/money` redirects.
- **Money:** sign in with the same Google account · empty state · add account,
  income, expense, transfer · add loan + confirm EMI · recurring rule fires
  (manual cron) · budget · report prints · export JSON · enable push.

### 13.5 Visual
- `scripts/shots*.mjs` before/after for both apps, light + dark, mobile + desktop.

## 14. Rollback plan

| Stage | Rollback |
|---|---|
| Any Phase 0 PR | Vercel instant rollback / git revert. Split data is untouched by code-only changes. |
| Cutover | Vercel instant rollback of Tally to the pre-merge deployment. Split data was never moved, so no restore is needed. Money Ledger can stay up or be re-protected. |
| Snapshot diff not empty at any point | Stop. Roll back the deploy; investigate before retrying. If data was actually changed (shouldn't be possible), restore affected docs from the latest `mongodump`. |
| Phase 4 cleanup | Restore removed fields/collection from the pre-cleanup dump (they're test data anyway). |

## 15. Post-split maintenance model

- **Branching:** both repos keep Git Flow (`develop` → `main`), per CONTRIBUTING.
- **Releases:** independent semver; Tally `2.x`, Money `1.x`.
- **Shared code hygiene:** quarterly `diff -r` of `components/ui`, `globals.css`,
  `lib/{utils,auth-server,email,webpush,rate-limit}`; port fixes both ways.
  Extract `@biswajitdas-007/tally-ui` (GitHub Packages) if drift gets painful.
- **Security:** separate SECURITY.md/advisories; dependabot in both.
- **Keep `ledger-snapshot` in Tally permanently**: it's a cheap regression
  check for any future change to balance logic.

## 16. Housekeeping found during review

Fix in Phase 2 (each repo's new docs):

- README & `.env.local.example` describe **Gmail SMTP / Nodemailer**
  (`GMAIL_USER`, `GMAIL_APP_PASSWORD`), but the code uses **Resend**
  (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
- **Pusher** env vars (`NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`,
  `PUSHER_APP_ID`, `PUSHER_SECRET`) are undocumented.
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is in the example but never read.
- `/api/cron/emi` is a legacy alias; confirm no external scheduler uses it.
- `src/lib/seed.ts`: README says no seeded data; check if still referenced.
- To verify during Phase 0: whether `categorise.ts` is used by the split
  add-expense sheet, and whether `park-sheet` has uses beyond C4.

## 17. Master checklist

_Status as of 2026-11-19._

**Phase 0: decouple in place** — done (#263, #264, #265)
- [x] Ledger snapshot / diff / verify tooling; baseline snapshot taken; `ledger:verify` on `develop` reports no differences
- [x] 0.1 account-linking feature removed (C1, C2, C4)
- [x] 0.3 split spend cut from money logic (C3)
- [x] 0.8 money-mode removed
- [ ] Atlas backups confirmed (tier check / scheduled `mongodump`)

**Phase 1: Money Ledger infrastructure** — owner
- [x] Repo `money-ledger` (private)
- [ ] Atlas cluster, Firebase project, Vercel project + domain, Resend, VAPID, `CRON_SECRET`, SonarCloud

**Phase 2: cut**
- [x] `tally` pruned to splits, v2.0.0, redirects + banner (#266)
- [ ] `money-ledger` extraction merged (money-ledger #1, then #2, #3)
- [ ] Logo, icons and OG images for Money Ledger

**Phase 3: launch** — owner
- [ ] Deploy Money Ledger; set `NEXT_PUBLIC_MONEY_LEDGER_URL` in Tally
- [ ] Release Tally 2.0.0 (`develop` → `main`)
- [ ] `ledger:snapshot -- post-cutover` + `ledger:diff` against the baseline: no errors

**Phase 4: cleanup (≈30 days after launch)**
- [x] Allowlisted cleanup script: `npm run ledger:cleanup` (dry run by default)
- [ ] `mongodump`, then `npm run ledger:cleanup -- --confirm --backup <dump> --unset-account-id`
- [ ] Redirects 302 → 301; remove the banner
- [ ] Remove legacy `accountId` input tolerance in the expenses/settle APIs and the `/api/cron/emi` alias
