# NexusERP Release Checklist

## Release Goal

Use this checklist before any candidate that is intended to move the repository
toward NexusERP `v1.0.0` release readiness.

## Security

* `npm audit` reports no unresolved Critical or High vulnerabilities
* No hard-coded tokens, secrets, privileged emails, or admin bypasses remain
* Telegram and VoIP secrets exist only in secure environment configuration
* Webhook secrets are configured for all externally exposed event handlers
* Any newly discovered security findings are triaged and recorded

## CI and Build

* GitHub Actions CI passed on the candidate branch
* GitHub Actions CI passed on `main` after merge
* `npm run lint` passes
* `npm run build` passes
* Build output is reproducible from a clean checkout

## Core Product Flows

* Login works for the intended roles
* Customers and suppliers load without unintended filtering or truncation
* Invoices can be created and saved successfully
* Reports render with validated sample data
* Gmail matching and VoIP flows are smoke-tested
* AI and Telegram integrations fail with actionable messages when misconfigured

## Operations

* Environment variables required for the target deployment are documented
* Release notes are drafted
* Known issues and residual risks are documented
* Rollback owner and release owner are explicitly assigned
* Incident runbook is available to the deployment team

## Legal and Compliance

* `SECURITY.md` is present and current
* `NOTICE.md` is present and current
* `LICENSE` decision is finalized
* `EULA` decision is finalized
* SBOM and dependency license review are available for the candidate

## Pilot and Launch Readiness

* Pilot onboarding checklist is current
* Support path and escalation path are documented
* Blocking pilot feedback is reviewed before release sign-off
* Final go/no-go review is recorded
