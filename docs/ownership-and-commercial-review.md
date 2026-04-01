# NexusERP Ownership and Commercial Review Baseline

## Purpose

This document records the minimum ownership and commercialization assumptions
that must be explicitly confirmed before NexusERP is treated as GA-ready or is
sold beyond controlled pilot use.

## Current Baseline Assumptions

* The repository owner controls the current NexusERP source repository.
* Third-party open source packages remain subject to their own licenses.
* Parts of the codebase are Base44-generated or Base44-integrated and may carry
  platform-specific usage or redistribution conditions.
* NexusERP is currently in release-hardening mode rather than fully approved
  commercial GA mode.

## Decisions That Must Be Confirmed

### Ownership Chain

Confirm in writing:

* who owns the repository and product IP;
* whether any contractors or contributors retain rights;
* whether all contributor work is covered by assignment or services terms; and
* whether any customer-specific code has leaked into the core product.

### Base44 Commercial Rights

Confirm in writing:

* whether Base44-generated code may be commercially hosted and sold;
* whether redistribution or on-prem delivery is restricted;
* whether any platform dependency creates downstream contractual obligations; and
* whether continued Base44 account access is required for supported operation.

### Deployment Model

Before GA, explicitly choose one of:

* SaaS
* on-prem
* hybrid

This decision changes contract language, support scope, pricing, operational
commitments, and security obligations.

### Data and Compliance Scope

Confirm whether the product will process:

* personally identifiable information;
* customer and supplier accounting records;
* call recordings or call metadata;
* AI-processed content; or
* regulated tax/reporting data such as myDATA exports.

If yes, the commercial package should include privacy, retention, incident, and
processor-controller role decisions before broad rollout.

## Minimum Commercial Pack Before Paid Launch

The repository should not move into paid launch mode until all of the following
exist:

* `LICENSE`
* `EULA.md`
* `NOTICE.md`
* `SECURITY.md`
* documented support process
* documented release process
* dependency inventory / SBOM baseline
* written ownership and deployment-model decision

## Open Questions

* Is NexusERP initially offered only as SaaS for tighter operational control?
* Will pilot customers receive a special agreement distinct from GA customers?
* Is a Data Processing Addendum required for the first commercial cohort?
* Are there trademark, branding, or domain assets that need separate ownership review?
* Is there any contractual restriction from Base44 or other providers that affects resale?

## Recommended Sign-Off Owners

* Product owner
* Technical lead
* Security owner
* Legal or external legal reviewer
* Commercial owner or founder
