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
* optional forwarding to an external endpoint through environment config
* local in-browser rolling event buffer for recent diagnostics

## Environment Variables

The frontend observability layer can be configured through:

* `VITE_APP_ENVIRONMENT`
* `VITE_APP_RELEASE`
* `VITE_OBSERVABILITY_ENDPOINT`

If `VITE_OBSERVABILITY_ENDPOINT` is empty, events still remain visible through
structured console output and the local rolling buffer.

## What Gets Captured

* application crashes caught by the React error boundary
* `window.error`
* `window.unhandledrejection`
* React Query query failures
* React Query mutation failures
* selected mutation success events for operational tracing

## What Still Needs Improvement

* a durable backend sink or vendor-backed monitoring service
* alert routing for Sev 1 and Sev 2 conditions
* server-side integration of the same event taxonomy
* dashboards for release and pilot operations

## Recommended Next Step

Connect `VITE_OBSERVABILITY_ENDPOINT` to a monitored backend collector or
approved external error tracking system before broader pilot rollout.
