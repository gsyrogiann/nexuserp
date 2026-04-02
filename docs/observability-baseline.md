# NexusERP Observability Baseline

## Goal

Provide a lightweight but production-serious observability foundation for the
release candidate without hard-binding the product to a single monitoring
vendor.

## Current Capabilities

The repository now includes:

* global browser error capture
* unhandled promise rejection capture
* React error boundary capture
* React Query query and mutation error reporting
* structured operational event reporting for key mutation flows
* baseline audit event reporting for selected create, update, link, and import actions
* a built-in backend collector function for persisting sanitized client telemetry
* optional forwarding to an external endpoint through environment config
* local in-browser rolling event buffer for recent diagnostics

## Environment Variables

The frontend observability layer can be configured through:

* `VITE_APP_ENVIRONMENT`
* `VITE_APP_RELEASE`
* `VITE_OBSERVABILITY_ENDPOINT`

If `VITE_OBSERVABILITY_ENDPOINT` is empty, events still remain visible through
structured console output and the local rolling buffer. The frontend now also
defaults to the built-in `observabilityIngest` function when a function URL can
be resolved.

Server-side allowlisting can be controlled through:

* `OBSERVABILITY_ALLOWED_ORIGINS`

## What Gets Captured

* application crashes caught by the React error boundary
* `window.error`
* `window.unhandledrejection`
* React Query query failures
* React Query mutation failures
* selected mutation success events for operational tracing
* selected audit events for critical write flows with basic redaction of secret-like fields
* persisted sanitized client telemetry through the `OperationalEvent` entity

## What Still Needs Improvement

* alert routing for Sev 1 and Sev 2 conditions
* server-side integration of the same taxonomy for backend functions
* dashboards for release and pilot operations
* retention, pruning, and archival policy for persisted telemetry

## Recommended Next Step

Connect the persisted event stream either to an approved external monitoring
service or to a reviewed operational dashboard before broader pilot rollout.
