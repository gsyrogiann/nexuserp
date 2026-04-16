**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the client-side environment variables

```
VITE_APP_RUNTIME=server
VITE_SERVER_API_URL=http://127.0.0.1:4000/api
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your_backend_url
VITE_BASE44_FUNCTIONS_BASE_URL=https://your-app.base44.app/functions
```

For a fully local development runtime outside Base44, use:

```
VITE_APP_RUNTIME=server
VITE_SERVER_API_URL=http://127.0.0.1:4000/api
VITE_APP_ENVIRONMENT=development
VITE_APP_RELEASE=owned-runtime
VITE_OBSERVABILITY_ENDPOINT=
DATABASE_URL="file:./dev.db"
PORT=4000
```

In `server` runtime mode:

* the React app talks to your own local Express API
* Prisma persists the data in a local SQLite database under `prisma/dev.db`
* auth, entities and `functions.invoke(...)` no longer depend on Base44 to boot the app
* you can inspect the owned runtime API at `http://127.0.0.1:4000/api/health`

Owned runtime commands:

* `npm run db:generate`
* `npm run db:push`
* `npm run db:seed`
* `npm run server:dev`
* `npm run dev:server -- --host 127.0.0.1`
* `npm run dev:owned -- --host 127.0.0.1`

The previous browser-only adapter is still available for demos and offline prototyping.

In `local` runtime mode:

* the app uses a built-in Base44-compatible local adapter
* auth, entities, email actions, AI helper replies and sync state are stored in browser `localStorage`
* the frontend no longer depends on the Base44 cloud backend to boot or render core flows
* you can reset/export the local dataset from the browser console through `window.__NEXUS_LOCAL_RUNTIME__`

Set Telegram secrets only in your backend/deployment environment:

```
TELEGRAM_BOT_TOKEN=your_new_bot_token
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
OPENAI_API_KEY=your_openai_api_key
VOIP_API_KEY=your_voip_api_key
VOIP_WEBHOOK_SECRET=your_voip_webhook_secret
VOIP_OLLAMA_HOST=http://localhost:11434
VOIP_WHISPER_HOST=http://localhost:9000
OBSERVABILITY_ALLOWED_ORIGINS=http://localhost:5173,https://your-app.base44.app
```

Do not store Telegram bot tokens in the browser or `localStorage`. Revoke any exposed token and rotate it through secure server-side environment configuration only.

Run the app locally outside Base44:

1. `npm install`
2. `npm run db:generate`
3. `npm run db:push`
4. `npm run db:seed`
5. `npm run dev:owned -- --host 127.0.0.1`

Useful local runtime commands:

* `npm run dev:local -- --host 127.0.0.1`
* `npm run build:local`
* `npm run preview:local -- --host 127.0.0.1`
* `npm run build:server`

Release verification: `npm run release:check`
Dependency inventory export: `npm run sbom:generate`

Observability defaults:

* If `VITE_OBSERVABILITY_ENDPOINT` is empty, the frontend now defaults to the built-in `observabilityIngest` function.
* Set `OBSERVABILITY_ALLOWED_ORIGINS` in the backend environment so only your app origins can submit telemetry.

Typecheck commands:

* `npm run typecheck`
* `npm run typecheck:strict`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

Repository release docs:

* `docs/nexuserp-ga-plan.md`
* `docs/15-day-execution-plan.md`
* `docs/commercialization-roadmap.md`
* `docs/icp-and-positioning.md`
* `docs/pilot-execution-pack.md`
* `docs/pricing-and-packaging-baseline.md`
* `docs/release-checklist.md`
* `docs/release-notes-template.md`
* `docs/release-process.md`
* `docs/pilot-readiness-checklist.md`
* `docs/incident-runbook.md`
* `docs/release-baseline-audit.md`
* `docs/typecheck-roadmap.md`
* `docs/known-issues.md`
* `docs/observability-baseline.md`
* `docs/support-process.md`
* `docs/base44-local-migration-map.md`
* `docs/ownership-and-commercial-review.md`
* `docs/dependency-license-review.md`
* `LICENSE`
* `EULA.md`
* `SECURITY.md`
* `NOTICE.md`
