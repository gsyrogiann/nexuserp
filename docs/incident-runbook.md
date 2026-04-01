# NexusERP Incident Runbook

## Purpose

This runbook covers the first response steps for incidents affecting the core
ERP experience, integrations, or production automation.

## Severity Model

### Sev 1

Production outage, customer data exposure, failed authentication across users,
or a broken payment/invoicing path.

### Sev 2

Core flow degraded, webhook backlog, sync failures, or repeated integration
errors with customer impact but partial availability.

### Sev 3

Localized bugs, recoverable background job failures, or degraded non-critical
features without material business impact.

## First 15 Minutes

* Confirm the incident scope and impacted workflow
* Identify whether the issue is active, intermittent, or already recovered
* Check the latest deployment and recent configuration changes
* Decide severity and assign an incident owner
* Preserve relevant logs, request payloads, and error traces

## Common Incident Types

### Auth or Access Regression

* Verify whether the user role model changed
* Check recent auth-related merges
* Confirm no privileged bypass logic was reintroduced

### Telegram or VoIP Webhook Failure

* Confirm the endpoint responds to health checks
* Verify `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
  `VOIP_API_KEY`, and `VOIP_WEBHOOK_SECRET`
* Inspect recent request failures and signature mismatches
* Determine whether the issue is code, secret rotation, or upstream outage

### Customer or Supplier Data Missing

* Validate API and UI filters first
* Check pagination assumptions
* Confirm records still exist in the source system
* Inspect any recent query helper or entity-client changes

### Build or Deployment Failure

* Review the latest CI run
* Verify dependency lockfile and environment configuration
* Attempt reproduction from a clean checkout
* Decide whether rollback is lower risk than forward-fix

## Escalation Path

Minimum incident roles for release-candidate operation:

* Incident owner
* Tech lead or maintainer on call
* Security owner for suspected exposure or credential compromise
* Product owner when customer-facing degradation is visible

## Resolution and Follow-Up

* Record the root cause
* Record the fix or mitigation
* Record any residual risk
* Open follow-up tasks for prevention work
* Update the release checklist if the incident changes release readiness
