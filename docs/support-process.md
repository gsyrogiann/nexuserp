# NexusERP Support Process

## Goal

Define the minimum support and escalation process required for pilot customers
and early commercial operation.

## Support Roles

* Release owner: approves deployment and release-state decisions
* Technical owner: investigates bugs, incidents, and regressions
* Security owner: handles exposure, credential, and auth-related incidents
* Product owner: prioritizes customer-visible impact and rollout decisions

## Intake Channels

At minimum, support should be able to receive issues through:

* pilot feedback channel
* direct customer escalation contact
* operational monitoring or observability alerts

## Severity Expectations

* Sev 1: acknowledge immediately and begin active response
* Sev 2: acknowledge the same business day
* Sev 3: review in normal triage cadence

## Required Context for Every Ticket

* affected customer or rollout wave
* impacted workflow
* reproduction steps if known
* timestamps
* screenshots or payload samples where safe
* whether the issue is blocking, degraded, or cosmetic

## Escalation Rules

Escalate immediately when:

* login or authorization is broken
* customer or financial data appears missing or corrupted
* Telegram, Gmail, VoIP, or webhook flows fail repeatedly
* the issue affects multiple users or a pilot rollout
* secrets or privileged access may be exposed

## Resolution Expectations

* record mitigation and final fix
* record whether rollback was considered
* update known issues or release readiness if needed
* create follow-up hardening work when root cause reveals systemic risk
