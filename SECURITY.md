# Security Policy

We take the security of Tally seriously. Because Tally handles people's money
data (balances, UPI IDs, personal finances), we appreciate responsible
disclosure of any vulnerability you find.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's built-in flow:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (Private Vulnerability Reporting).
3. Describe the issue, the impact, and a reproduction if possible.

You'll get an acknowledgement within **72 hours**, and we aim to ship a fix (or
a clear mitigation plan) within **14 days** for confirmed high-severity issues.
We'll keep you updated throughout and credit you in the advisory unless you
prefer to stay anonymous.

## Scope

In scope:

- Authentication / authorization bypass (a user reading or writing another
  user's data).
- Injection (NoSQL, XSS in rendered content or emails, HTML injection).
- Secret or token leakage.
- CSRF / SSRF, insecure direct object references on API routes.

Out of scope:

- Findings that require a compromised device or physical access.
- Missing security headers on third-party domains.
- Automated scanner output without a demonstrated, realistic impact.
- Denial of service via volumetric traffic.

## Supported versions

Tally is a continuously deployed web app; the **latest release on `main`** (and
the live deployment) is the only supported version. Fixes ship forward — please
verify against the latest before reporting.

## Handling of secrets

No credentials live in this repository or its git history. All secrets
(`MONGODB_URI`, Gmail app password, VAPID private key, `CRON_SECRET`, Firebase
config) are injected via environment variables and `.env*` is git-ignored.
Server-side auth verifies Firebase ID tokens against Google's public JWKS — no
service-account key is stored anywhere. If you believe a secret has been
committed, treat it as a vulnerability and report it privately.
