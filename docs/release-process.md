# NexusERP Release Process

## Goal

Create a repeatable release candidate flow for NexusERP while the repository is
moving toward `v1.0.0`.

## Candidate Preparation

1. Confirm the release checklist is reviewed.
2. Confirm `npm run lint`, `npm run build`, and `npm audit` are passing.
3. Confirm any environment or webhook changes are documented.
4. Record known issues and residual risks for the candidate.

## Tagging Convention

Use semantic version tags in the form:

* `v0.x.y` for pre-GA candidates
* `v1.0.0-rc.N` for release candidates approaching GA
* `v1.0.0` for the final GA tag

## Automation

The repository includes:

* CI workflow for pull requests and branch validation
* CodeQL workflow for static security scanning
* Dependabot for dependency and GitHub Actions updates
* Release workflow that builds and uploads a packaged `dist` artifact on tags

## Current Limitations

The current release workflow improves repeatability, but the following items are
still open before final GA:

* signed artifacts
* provenance or attestation
* formal SBOM generation
* final license and EULA decisions

## Operator Notes

Before creating a release tag:

* verify the intended deployment environment has the required secrets
* assign a release owner
* assign a rollback owner
* capture the final go/no-go decision in writing
