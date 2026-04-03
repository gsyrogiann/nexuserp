# NexusERP Known Issues

## Release Hardening Snapshot

This file tracks currently known issues that remain open after the latest
release-hardening pass.

## Open Technical Issues

* The persistent observability sink exists, but dashboards and alert routing are
  not yet in place.
* The Base44 preview/editor shell can freeze or remain stuck on `Loading preview`
  for this application specifically, even when the published app continues to
  work normally. The Base44 in-editor chat can also become unresponsive in the
  same state. Until this is fully resolved, the published app URL should remain
  the source of truth for functional validation.

## Open Release Gaps

* `LICENSE` still needs final legal/commercial approval
* `EULA.md` still needs final legal/commercial approval
* Signed release artifacts are not yet implemented
* Formal SPDX or CycloneDX SBOM export is not yet implemented
* Dependency license review still needs human sign-off
* Pilot validation evidence is not yet available
* ICP, pricing, and pilot execution baselines exist, but no real pilot outcomes are recorded yet

## Guidance

These known issues should be reviewed during each release checkpoint and moved
either into active remediation, accepted pre-GA limitations, or blocked launch
criteria depending on their impact.
