# Learning Scores – Professional Film Music Learning Platform

Production-grade learning platform for film music education by McGuireDevelops. React 18 (web) + React Native (Expo), Firebase (Auth, Firestore, Storage, Cloud Functions), shared TypeScript models, MediaReference-first pedagogy, teacher-defined rubrics and quizzes, AI analysis (teacher-only), AccessGrant-based access.

## Structure

- **apps/web** – React 18 + Vite + TypeScript; student/teacher/admin routes; Firebase SDK
- **apps/mobile** – React Native (Expo) + TypeScript; shared logic via `@learning-scores/shared`
- **packages/shared** – Domain types, MediaReference, quiz/rubric schemas (Zod), resolution helpers
- **packages/firebase** – Firestore collection paths, data model doc, re-exports
- **functions** – Cloud Functions: auth trigger, AI analysis pipeline (requestAnalysis, saveAnalysisSnapshot)
- **firestore.rules** / **storage.rules** – Role + AccessGrant-based security

## Setup

1. **pnpm**
   ```bash
   pnpm install
   ```

2. **Firebase**
   - Create a Firebase project; set `firebase.json` / `.firebaserc` project id.
   - Copy `apps/web/.env.example` to `apps/web/.env` and set `VITE_FIREBASE_*`.
   - For Expo: set `EXPO_PUBLIC_FIREBASE_*` in env or app.config.js.

3. **Access grants**
   - Access is determined only by AccessGrant + role (no payment in access path).
   - For students to see a class, create a document at `users/{uid}/accessGrants/{classId}` with `validFrom`, `validTo` (UTC ms). Use Admin SDK or a Cloud Function triggered by payment.

## Deploy

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for Vercel and Firebase setup.

## Security & Privacy

See **[SECURITY.md](./SECURITY.md)** for security architecture, rules, and practices. See **[PRIVACY.md](./PRIVACY.md)** for data collection and user rights.

## Build & run

```bash
pnpm run build          # all packages
pnpm run dev:web        # Vite dev server (apps/web)
pnpm run dev:mobile     # Expo (apps/mobile)
```

**Firebase**
```bash
cd functions && npm install && npm run build
firebase deploy
```

## Conventions

- **MediaReference**: first-class; used in lessons, feedback, assignments. Types and resolver in `packages/shared`.
- **Quizzes**: structured answers only; no plain-string theory; multiple valid answers; partial credit.
- **Rubrics**: teacher-defined; qualitative criteria; partial satisfaction; edit history.
- **AI**: analyse-only; teacher-only visibility; editable before storage; stored in `analysisSnapshots`; never merged with feedback or grading.
