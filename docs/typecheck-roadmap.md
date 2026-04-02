# NexusERP Typecheck Roadmap

## Purpose

NexusERP is primarily a JavaScript and JSX codebase with substantial legacy
`checkJs` noise. The immediate release goal is to keep a trustworthy baseline
typecheck signal without allowing long-standing non-release-critical inference
issues to block every delivery.

## Current Policy

* `npm run typecheck` is the baseline verification command for release hygiene.
* `npm run typecheck:strict` now passes and can be used as a stronger quality
  signal for future changes.
* New work should avoid reintroducing broad ambient typing debt into shared
  components or page-level workflows.

## Why This Split Was Added

The strict split was introduced because the codebase previously had:

* weak prop inference from shared JavaScript UI components
* legacy page-level JSX components without explicit prop contracts
* pre-existing custom component mismatches unrelated to recent release fixes

That staged approach made it possible to restore a trustworthy strict pass
without blocking the release-hardening work.

## Near-Term Plan

1. Keep `typecheck` green for reliable baseline automation.
2. Keep `typecheck:strict` green as part of ongoing quality control.
3. Prioritize shared primitives and shared components first when new typing
   regressions appear, because they remove many downstream errors at once.
4. Treat new strict failures as actionable regressions instead of background
   noise.

## Practical Next Targets

* Keep shared UI shims and shared component contracts aligned with actual usage
* Prevent regressions in core flows like customers, invoices, inventory, and AI
  assistant tooling
* Consider adding `typecheck:strict` to CI once the team is comfortable making
  it an enforced gate
