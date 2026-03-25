# Business Architecture

Purpose: describe the platform at a business and workflow level.
Audience: product, design, architecture, and implementation planning work.
Status: reference

This is a high-level summary of what the platform is for, who uses it, and how work moves through it.

## Platform Goal

The platform is intended to help private markets debt teams monitor deals, control reporting cycles, review incoming information, and turn borrower activity into a consistent operating workflow.

It is not just a dashboard. It is meant to function as a monitoring system of record with evidence, approvals, and portfolio context.

## Main Users

- asset monitoring analysts who run intake, compliance, and review workflows
- portfolio managers who need portfolio and deal-level risk visibility
- credit analysts who need covenant, trend, and evidence detail
- reporting and operations users who prepare packs, reports, and controlled outputs
- admin or setup users who manage hierarchy, onboarding, and configuration

## Core Workflows

At a high level, the product revolves around a few repeatable flows:

1. Document intake
Incoming borrower material is received, classified, matched, and prepared for downstream processing.

2. Review and approval
Proposed facts are validated and either committed automatically or routed to a human reviewer.

3. Monitoring and assessment
Approved facts feed covenant views, compliance status, assessments, and portfolio rollups.

4. Escalation and decisioning
Exceptions, alerts, amendments, and borrower requests are surfaced to the right user with auditability.

5. Reporting and distribution
The system turns current monitored state into controlled outputs such as packs, reports, and activity views.

6. Setup and onboarding
New clients, accounts, holdings, and deals can be configured and activated in a controlled order.

## Operating Principles

- human approval remains in the loop where judgement matters
- deterministic logic owns compliance status, deadlines, and derived monitoring outputs
- AI may assist with extraction and summarization, but it should not silently write canonical state
- every important number or decision should be traceable back to source material
- portfolio context matters as much as single-deal detail

## Product Areas

The broader platform direction can be thought of in four layers:

- intake and review
- deal monitoring and evidence
- portfolio views and alerts
- configuration, reporting, and governance

The current runnable demo implements part of this shape, but not the full platform.
