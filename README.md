# Gmail Daily Summary

Next.js (App Router) starter for a Gmail daily digest: connect a Google account with OAuth, store tokens in SQLite, fetch recent mail, and summarize with OpenAI. This repository is the **base scaffold**—API routes and UI for Gmail, summarization, and the cron job are added in follow-up work.

## Prerequisites

- Node.js 20+ and npm
- A [Google Cloud](https://console.cloud.google.com/) project with the Gmail API enabled
- An [OpenAI API key](https://platform.openai.com/api-keys)
- (Production) A [Vercel](https://vercel.com/) account for deployment and scheduled cron

## Google Cloud Console — Gmail OAuth setup

1. **Create or select a project**  
   In [Google Cloud Console](https://console.cloud.google.com/), pick the project that will own this app.

2. **Enable the Gmail API**  
   Go to **APIs & Services → Library**, search for **Gmail API**, and click **Enable**.

3. **Configure the OAuth consent screen**  
   - **APIs & Services → OAuth consent screen**  
   - Choose **External** (or **Internal** if Workspace-only).  
   - Fill in app name, support email, and developer contact.  
   - Add scopes your app will request (typical minimum for read-only digest):  
     - `https://www.googleapis.com/auth/gmail.readonly`  
   - Add test users while the app is in **Testing** mode (required for non-Workspace accounts until published).

4. **Create OAuth 2.0 credentials**  
   - **APIs & Services → Credentials → Create credentials → OAuth client ID**  
   - Application type: **Web application**  
   - **Authorized JavaScript origins** (examples):  
     - `http://localhost:3000` (local dev)  
     - `https://your-production-domain.vercel.app` (after deploy)  
   - **Authorized redirect URIs** must include the exact callback URL your app uses, for example:  
     - Local: `http://localhost:3000/api/auth/google/callback`  
     - Production: `https://your-production-domain.vercel.app/api/auth/google/callback`  
   - Copy the **Client ID** and **Client secret** into your environment (see below).

5. **Keep credentials out of git**  
   Never commit `.env` or client secrets. Use `.env.example` as a template only.

## Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| -------- | ----------- |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Must match one authorized redirect URI (e.g. `http://localhost:3000/api/auth/google/callback`) |
| `OPENAI_API_KEY` | OpenAI API key for summarization |
| `CRON_SECRET` | Random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when invoking the daily job |
| `DATABASE_PATH` | Filesystem path to the SQLite database (e.g. `./data/app.db` locally) |

On Vercel, set the same variables under **Project → Settings → Environment Variables**. Use production URLs for `GOOGLE_REDIRECT_URI` in the Production environment.

## Local development

Install dependencies (already listed in `package.json`):

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default page is the stock Next.js welcome screen until app-specific UI is implemented.

Other scripts:

- `npm run build` — production build  
- `npm run start` — serve production build  
- `npm run lint` — ESLint  

Ensure `.env.local` is loaded (Next.js loads it automatically). Create the directory for SQLite if needed, e.g. `mkdir -p data`, and align `DATABASE_PATH` with that location.

## Daily cron on Vercel

`vercel.json` registers a Vercel Cron job:

- **Schedule:** `0 8 * * *` (08:00 UTC every day)  
- **Path:** `/api/cron/daily`

When implemented, that route should:

1. Verify the request is from Vercel Cron (e.g. compare `Authorization: Bearer <CRON_SECRET>` to the `CRON_SECRET` env var).  
2. Load stored OAuth refresh tokens from the database.  
3. Fetch the day’s Gmail messages, run summarization via OpenAI, and persist or deliver the digest.

Cron runs only on **production** deployments on Vercel plans that support Cron. Adjust the schedule in `vercel.json` if you want a different timezone (cron uses UTC unless you document offset logic in the handler).

To test the cron handler locally before the route exists, you can simulate a request:

```bash
curl -X GET http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Project layout (scaffold)

- `src/app/` — App Router pages and (future) API routes  
- `public/` — static assets  
- `vercel.json` — cron configuration  
- `.env.example` — documented environment template  

## Dependencies (beyond Next.js)

- `googleapis` — Gmail API client  
- `openai` — OpenAI SDK  
- `better-sqlite3` — SQLite for tokens and summary storage (native module; requires build tools on install)

## License

Private / unlicensed unless you add a license file.
