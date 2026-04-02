# NexusERP Dependency License Review Baseline

## Purpose

This document defines the minimum process for reviewing third-party dependency
licensing before NexusERP is commercially launched.

## Current State

The repository now includes a generated dependency inventory artifact at:

* `artifacts/sbom-baseline.json`

Generate or refresh it with:

```bash
npm run sbom:generate
```

The baseline inventory is derived from `package-lock.json` and is intended for
internal review. Replace or supplement it with a formal SPDX or CycloneDX SBOM
before final GA sign-off.

## Review Checklist

Confirm for all production and release-shipping dependencies:

* license type is identified;
* attribution obligations are known;
* copyleft obligations are understood;
* patent or notice requirements are tracked where relevant; and
* no commercial-distribution blocker is introduced.

## Minimum Review Workflow

1. Regenerate `artifacts/sbom-baseline.json` after dependency changes.
2. Review direct production dependencies first.
3. Review unusual or business-sensitive transitive dependencies next.
4. Record any unclear or custom licensing as a blocker until resolved.
5. Update `NOTICE.md` if attribution or notice obligations change.
6. Attach the reviewed inventory to the release candidate record.

## Known Limitations of the Baseline Artifact

* It is an inventory export, not a full legal opinion.
* It does not infer license text automatically.
* It does not replace external legal review for GA or on-prem distribution.
* It should be refreshed any time `package-lock.json` changes.

## Release Gate

Do not treat NexusERP as commercially ready until:

* the dependency inventory has been refreshed for the candidate build;
* unresolved license conflicts are `0`; and
* legal/commercial owners have signed off on the dependency posture.
