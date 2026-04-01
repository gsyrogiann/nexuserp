# Security Policy

## Scope

This repository contains the NexusERP application and related integration code.
Security issues affecting authentication, authorization, secrets handling, data
exposure, dependency risk, webhook integrity, or production operations should be
reported through a private channel and should not be opened as public issues.

## Reporting a Vulnerability

If you discover a vulnerability:

1. Do not disclose it publicly.
2. Send a private report to the repository owner or designated security contact.
3. Include reproduction steps, impact, affected files or flows, and any known
   mitigations.
4. If secrets may be exposed, rotate them immediately in the relevant
   environment before wider investigation continues.

Until a dedicated security inbox is established, treat direct owner contact as
the temporary reporting path and migrate to a monitored shared inbox before GA.

## Response Expectations

Target response and handling expectations:

* Acknowledge receipt within 2 business days.
* Triage severity within 5 business days.
* Start remediation immediately for Critical and High findings.
* Do not ship a GA release while any unresolved Critical or High finding
  remains open.

## Supported Security Posture

NexusERP is currently in release-hardening mode toward `v1.0.0`.

The following controls are expected for production readiness:

* Secrets stored only in secure server-side environment configuration
* No hard-coded privileged identities or credential bypasses
* CI validation on pull requests and the main branch
* Dependency scanning and routine patching
* Authenticated webhook entry points
* Actionable auditability for critical operational failures

## Out of Scope for Public Disclosure

The following should not be posted publicly:

* Bot tokens, API keys, webhook secrets, access tokens, or session artifacts
* Customer data samples that contain personal or business-sensitive information
* Production endpoints, internal infrastructure details, or privileged emails

## Release Gate Reminder

NexusERP must not be considered GA-ready if any Critical or High security issue
remains unresolved.
