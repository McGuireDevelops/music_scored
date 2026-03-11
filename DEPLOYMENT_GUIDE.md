# Learning Scores – Vercel & Firebase Setup Guide

Use this guide for **music-scored** (`C:\Users\rober\expo-projects\music-scored`).

---

## 1. Vercel Deployment

### Import from GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your **Git** repositories
3. Select **McGuireDevelops/music_scored**
4. Vercel will read `vercel.json` automatically:
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `apps/web/dist`
   - **Install Command:** `pnpm install`
5. Before deploying, add Environment Variables (see below)
6. Click **Deploy**

### Environment variables for the web app (Vite)

Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

Get these from [Firebase Console](https://console.firebase.google.com) → your project → **Project settings** (gear) → **General** → **Your apps** → Web app config.

---

## 2. Firebase Setup

### Update project ID

1. Open `.firebaserc` in the project root
2. Replace `"your-project-id"` with your Firebase project ID

### Deploy Firebase

```powershell
cd C:\Users\rober\expo-projects\music-scored
cd functions
npm install
npm run build
cd ..
firebase deploy
```

### Enable Google Sign-In

1. Firebase Console → **Authentication** → **Sign-in method**
2. Click **Google** → **Enable** → **Save**

### Add Vercel domain to Firebase Auth

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain (e.g. `music-scored.vercel.app` or your custom domain)

---

## 3. Local `.env` for web app

Create `apps/web/.env` (copy from example below). This file is gitignored.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 4. Verify

- **Web:** Run `pnpm run dev:web` → open http://localhost:5173
- **Vercel:** Push to `main` → auto-deploy
- **Firebase:** `firebase deploy` deploys Firestore rules, Storage rules, Functions, and Hosting (optional if using Vercel)
