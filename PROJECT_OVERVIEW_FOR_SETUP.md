# Learning Scores — Project Overview for Setup (Claude)

This document explains the **Learning Scores** project so Claude (or another assistant) can help with environment setup, dependencies, and configuration.

---

## What This Project Is

**Learning Scores** is a web app for tracking and analyzing student learning scores. The folder is:

`c:\Users\rober\Desktop\McGuire Develops Files\Learning Scores`

---

## Tech Stack & Dependencies

- **Language/runtime:** Node.js
- **Framework:** Next.js 14 (App Router), React
- **Package manager:** npm
- **Database:** Firebase (Firestore, Auth)
- **Hosting:** Vercel
- **Other:** Stripe, Figma (MCPs available in workspace)

---

## How to Set Up (For Claude)

1. **Clone/open** this repo in the `Learning Scores` folder.
2. **Install dependencies:** `npm install`
3. **Environment:** Copy `.env.local.example` to `.env.local`, fill in Firebase config from Firebase Console.
4. **Database:** Firebase Firestore — enable in Firebase Console; no migrations needed.
5. **Run the app:** `npm run dev`

---

## Project Structure

```
Learning Scores/
├── src/
│   ├── app/          # Next.js App Router (layout, page)
│   └── lib/          # Firebase config, utilities
├── .env.local.example
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## Notes for Setup Help

- **OS:** Windows (10/11), Shell: PowerShell.
- Git repo is initialized in the Learning Scores folder.
- If something fails, note the exact command and error for debugging.
