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
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_BASE44_FUNCTIONS_BASE_URL=https://your-app.base44.app/functions

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
VITE_BASE44_FUNCTIONS_BASE_URL=https://my-to-do-list-81bfaad7.base44.app/functions
```

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

Run the app: `npm run dev`

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
* `docs/ownership-and-commercial-review.md`
* `docs/dependency-license-review.md`
* `LICENSE`
* `EULA.md`
* `SECURITY.md`
* `NOTICE.md`
