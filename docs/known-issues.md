# NexusERP Known Issues

## Release Hardening Snapshot

This file tracks currently known issues that remain open after the latest
release-hardening pass.

## Open Technical Issues

* `npm run typecheck:strict` still fails on a reduced set of page-level and
  domain-level JavaScript typing issues.
* Some shared page flows still rely on weak JavaScript inference around
  mutation results and rich form state.
* Production error tracking is not yet wired to an external monitoring system.

## Open Release Gaps

* `LICENSE` is not finalized
* `EULA` is not finalized
* Signed release artifacts are not yet implemented
* SBOM generation and dependency license review are not yet automated
* Pilot validation evidence is not yet available

## Guidance

These known issues should be reviewed during each release checkpoint and moved
either into active remediation, accepted pre-GA limitations, or blocked launch
criteria depending on their impact.
