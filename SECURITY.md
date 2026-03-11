# Security

This document describes the security measures, architecture, and practices for Learning Scores.

## Overview

Learning Scores is a Firebase-backed learning platform with role-based access (student, teacher, admin), Stripe payments, and optional AI analysis. Security is enforced at multiple layers: authentication, authorization rules, input validation, rate limiting, and client-side protections.

## Authentication & Authorization

### Authentication

- **Firebase Auth** – Email/password and Google Sign-In (web). Tokens are managed by the Firebase SDK; we do not handle raw tokens.
- **Session persistence** – Firebase Auth maintains sessions; no custom session storage.
- **Route protection** – The `ProtectedRoute` component enforces signed-in state and optional role checks before rendering sensitive pages.

### Authorization Model

| Role | Capabilities |
|------|--------------|
| **Student** | Access classes with valid access grant; submit assignments and quizzes; read own feedback; view own portfolio |
| **Teacher** | Create/manage own classes; grade assignments; create quizzes; access analysis snapshots; connect Stripe for payouts |
| **Admin** | Full access; manage user roles; create access grants |

### Access Grants

- Class access is controlled by **access grants** in `users/{uid}/accessGrants/{classId}`.
- Grants have `validFrom` and `validTo` timestamps and are created **only by Cloud Functions** (e.g. after successful Stripe checkout).
- Clients cannot write to access grants; Firestore rules enforce `allow write: if false` for this subcollection.
- Students must also satisfy mandatory requirements (e.g. NDA, agreements) before accessing class content.

## Data Protection

### Firestore Security Rules

- **Role-based rules** – Every collection enforces access based on `userRole()`, `isClassTeacher()`, `studentCanAccessClassContent()`, etc.
- **Ownership checks** – Documents are scoped by `ownerId`, `teacherId`, or `userId` as appropriate.
- **Answer keys** – Quiz answer keys are teacher-only; students never read them.
- **Backend-only writes** – `users/{uid}/accessGrants` and `rateLimits` are writable only by the Admin SDK (Cloud Functions).
- **teacherProfiles** – Public read; write restricted to owner (for public teacher pages).

### Storage Security Rules

- **Metadata-based access** – Assignment submissions and feedback use custom metadata (`userid`, `teacherid`) to enforce read/write by student and class teacher.
- **File size limits**:
  - Assignment submissions: 50 MB
  - Teacher feedback: 50 MB
  - Class media: 100 MB
  - Analysis snapshots: 10 MB
- **Role checks** – Storage rules call Firestore to verify user role for teacher-only paths.

### Encryption

- **In transit** – All traffic uses HTTPS (Firebase Hosting, callables, Firestore, Storage).
- **At rest** – Firebase encrypts Firestore and Storage data at rest by default.
- **Secrets** – Stripe and Gemini API keys are server-side only; never exposed to clients.

## Cloud Functions Security

### Authentication

- All callable functions check `request.auth` and reject unauthenticated requests.
- Role checks are performed for teacher-only functions (e.g. `requestAnalysis`, `saveAnalysisSnapshot`, Stripe Connect).

### App Check

- Callables use `enforceAppCheck: true` to ensure requests come from registered app instances.
- Web app must initialize App Check with reCAPTCHA v3 (`VITE_APP_CHECK_RECAPTCHA_SITE_KEY`).
- See [Firebase App Check](https://firebase.google.com/docs/app-check) for setup.

### Input Validation

- **Zod schemas** – All callable inputs are validated with Zod before processing:
  - `createCheckoutSession` – `classId` required, max length 500
  - `submitQuizAttempt` – `quizId`, `answers` array (max 200 items), question IDs and types validated
  - `requestAnalysis` – `source`, `sourceId`, optional `mediaRef`
  - `saveAnalysisSnapshot` – `source`, `sourceId`, `payload` (max 100 KB)
- Invalid input returns `HttpsError("invalid-argument", ...)`.

### Rate Limiting

- **Firestore-backed rate limiter** – Applied to expensive callables:
  - `createCheckoutSession` – 10 calls per user per minute
  - `requestAnalysis` – 10 calls per user per minute
- Uses `rateLimits/{callableName}_{userId}` collection; clients cannot access it.

### Origin Validation

- Stripe redirect URLs (checkout success/cancel, Connect return/refresh) use **allowlisted origins**.
- `ALLOWED_ORIGINS` (comma-separated) configures valid origins; unknown origins fall back to first allowed (e.g. localhost).
- Protects against open redirect abuse via spoofed `Origin` header.

### Stripe Webhook

- Signature verified with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
- Raw body is required for verification; rejects requests without valid signature.

## Client-Side Protections

### XSS Mitigation

- **DOMPurify** – Lesson content is sanitized before rendering with `dangerouslySetInnerHTML`.
- Allowed tags: `p`, `b`, `i`, `u`, `em`, `strong`, `a`, `br`, `ul`, `ol`, `li`.
- Allowed attributes on links: `href`, `target`, `rel`.
- Scripts and event handlers are stripped.

### Security Headers (Firebase Hosting)

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Content-Security-Policy | Restricts script, style, connect, img, font, frame sources |

CSP is configured for Firebase Auth, Firestore, Storage, and Cloud Functions. See `firebase.json` for the full policy.

## CI/CD & Dependencies

- **`pnpm audit`** – Runs in CI (`.github/workflows/ci.yml`); fails on high/critical vulnerabilities.
- **Build and lint** – CI verifies project and functions build successfully.
- **Lockfile** – Use `pnpm install --frozen-lockfile` in CI for reproducible installs.

## Secrets Management

| Location | Secret | Notes |
|----------|--------|-------|
| Cloud Functions | STRIPE_SECRET_KEY | Stripe API secret |
| Cloud Functions | STRIPE_WEBHOOK_SECRET | Webhook signing secret |
| Cloud Functions | GEMINI_API_KEY | Optional; AI analysis |
| Cloud Functions | ALLOWED_ORIGINS | Comma-separated redirect origins |
| Web app (.env) | VITE_APP_CHECK_RECAPTCHA_SITE_KEY | App Check site key |

**Best practice:** Store sensitive Function secrets in [Firebase Secret Manager](https://firebase.google.com/docs/functions/config-env#secret-manager). Never commit `.env` files; use `.env.example` as a template.

## Vulnerability Reporting

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email the project maintainer or platform administrator with:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)
3. Allow reasonable time for a fix before public disclosure.

## Related Documents

- [PRIVACY.md](PRIVACY.md) – Data collection, retention, third parties, user rights
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) – Environment variables, App Check setup, secrets

---

*Last updated: March 2025*
