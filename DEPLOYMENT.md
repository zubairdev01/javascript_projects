# Deployment Guide: PSX Trading Mentor CRM (Vercel + Neon Postgres)

This guide covers deploying the app to Vercel with Neon Postgres so authentication and data work in production.

## 1. Create a Neon Postgres Database

1. Go to [neon.tech](https://neon.tech/) and sign up (free tier is sufficient).
2. Create a new project (e.g., `psx-trading-mentor`).
3. Copy the connection string (it will look like: `postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require`).
4. Keep this safe - you'll need it for both local dev and Vercel.

## 2. Update Local Environment

1. Open `PSX_TradingMentorCRM/server/.env` (create if it doesn't exist).
2. Update DATABASE_URL to your Neon connection string:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
   JWT_SECRET=your-secure-random-string-here
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```
3. Generate Prisma client and sync schema to Neon:
   ```bash
   npm --prefix ./PSX_TradingMentorCRM/server run generate
   npm --prefix ./PSX_TradingMentorCRM/server run db:push
   ```
4. Seed the database (one-time):
   ```bash
   npm --prefix ./PSX_TradingMentorCRM/server run seed
   ```
5. Test locally:
   ```bash
   npm run dev
   ```
   Frontend: http://localhost:5173, API: http://localhost:3001/api/health

## 3. Deploy to Vercel

1. Push your code to GitHub (this repo is already initialized).
2. Go to [vercel.com](https://vercel.com/) → New Project → Import your repo.
3. **IMPORTANT**: Set Root Directory to `.` (repo root), NOT `PSX_TradingMentorCRM/client`. This is required for `vercel.json` and the `/api` directory to work.
4. Framework Preset: Vercel will auto-detect (Other/Build Output). Don't override.
5. Build Command: `npm run build` (uses the root build script we configured).
6. Output Directory: `PSX_TradingMentorCRM/client/dist` (from vercel.json).
7. Install Command: `npm install` (from vercel.json).

## 4. Add Environment Variables in Vercel

In Project Settings → Environment Variables, add:

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...neon.tech/... ?sslmode=require` | Same Neon connection string |
| `JWT_SECRET` | Secure random string | Use the same as local or generate a new one |
| `CORS_ORIGIN` | `https://your-app-name.vercel.app` | Or comma-separated if multiple origins |

> Note: For Vercel previews, you can also add `*.vercel.app` to CORS_ORIGIN if needed, but it's safer to be explicit.

## 5. Deploy & Verify

1. Click Deploy. Vercel will install, generate Prisma client, build the frontend.
2. After deployment, test:
   - `https://your-app.vercel.app/api/health` should return `{"status":"ok",...}`
   - Sign up/login should work without white screen.
   - Dashboard should load data correctly.

## 6. Important Notes

- **Data**: Your local SQLite (`dev.db`) data won't transfer. You'll need to register users and seed again against Neon.
- **Root Directory**: If you previously had Root Directory set to `PSX_TradingMentorCRM/client`, you MUST clear it and set to repo root for serverless functions to work.
- **Prisma**: We changed provider from `sqlite` to `postgresql`. Local `.env` must use Neon URL.
- **Seed**: `prisma.seed` is NOT run during build - run it manually once per environment (local + Neon).
- **CORS**: Update `CORS_ORIGIN` in Vercel if you add custom domains.

## 7. Troubleshooting

- **Blank white screen on login**: Usually means API returned HTML (SPA fallback). Check `/api/health` returns JSON. Also verify Root Directory is set correctly.
- **401 redirect loops**: We hardened the client to avoid redirect loops; ensure CORS is correct.
- **Prisma errors on Vercel build**: Build runs `prisma generate` - this requires `DATABASE_URL` not strictly needed for generate, but schema is valid.
- **Functions 404**: Ensure `/api/[...path].js` and `/api/index.js` exist at repo root, and `vercel.json` rewrites include `/api/(.*) → /api`.