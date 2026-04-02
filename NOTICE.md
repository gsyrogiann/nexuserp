# NOTICE

This repository contains the NexusERP application codebase and related
integration logic.

## Third-Party Software

NexusERP depends on third-party open source packages that remain subject to
their respective licenses, copyright notices, and attribution requirements.

The repository currently tracks these dependencies through `package.json`,
`package-lock.json`, and the generated baseline inventory artifact at
`artifacts/sbom-baseline.json`.

This baseline inventory supports internal release review, but a formal SPDX or
CycloneDX SBOM and final license review should still be completed before
General Availability.

## Generated and Platform-Integrated Code

Parts of the application are Base44-generated or Base44-integrated. Ownership,
commercial usage rights, and redistribution terms for generated code should be
confirmed as part of the GA legal review before commercial launch.

## Pending GA Legal Artifacts

The following items remain part of the GA legal/compliance checklist and should
be finalized before commercial release:

* final commercial approval of `LICENSE`
* final legal approval of `EULA.md`
* formal SPDX or CycloneDX SBOM export
* signed dependency license review
* Privacy/compliance release notes where applicable
