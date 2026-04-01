# NexusERP Typecheck Roadmap

## Purpose

NexusERP is primarily a JavaScript and JSX codebase with substantial legacy
`checkJs` noise. The immediate release goal is to keep a trustworthy baseline
typecheck signal without allowing long-standing non-release-critical inference
issues to block every delivery.

## Current Policy

* `npm run typecheck` is the baseline verification command for release hygiene.
* `npm run typecheck:strict` preserves visibility into the broader legacy
  JavaScript typing debt.
* Failing `typecheck:strict` should not be ignored forever, but it is not yet a
  release gate until the shared component and page typing surface is reduced.

## Why This Split Exists

The current strict pass is dominated by:

* weak prop inference from shared JavaScript UI components
* legacy page-level JSX components without explicit prop contracts
* pre-existing custom component mismatches unrelated to recent release fixes

Without a staged approach, the repository gets a noisy failure that is hard to
act on and easy to ignore.

## Near-Term Plan

1. Keep `typecheck` green for reliable baseline automation.
2. Use `typecheck:strict` as the backlog signal for incremental cleanup.
3. Prioritize shared primitives and shared components first, because they remove
   many downstream errors at once.
4. Promote stricter checks into release gates only after the noisy baseline is
   materially reduced.

## Practical Next Targets

* Add explicit prop typing to frequently used shared UI wrappers
* Normalize shared dashboard and shared form component prop contracts
* Reduce page-level strict errors in high-value flows first
* Revisit whether `typecheck:strict` can become CI-gated after the error volume
  drops to an actionable level
