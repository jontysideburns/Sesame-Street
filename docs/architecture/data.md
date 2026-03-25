# Data Architecture

Purpose: describe the high-level data model and processing shape of the platform.
Audience: architecture and implementation planning work.
Status: reference

This is a conceptual summary. It is meant to explain how information moves through the system and what kinds of objects the platform needs to manage.

## Data Flow

The intended data flow is straightforward:

1. raw borrower documents and incoming events enter the platform
2. the system classifies, extracts, and validates proposed facts
3. approved facts become canonical deal data
4. downstream views project that data into portfolio, covenant, compliance, and reporting outputs

The important idea is that the user-facing outputs are projections over approved data, not manually maintained spreadsheets.

## Processing Layers

- raw intake layer
Stores incoming source material and preserves original evidence.

- proposal layer
Holds extracted or system-generated proposals that are not yet canonical.

- canonical layer
Stores approved deal, period, covenant, obligation, and assessment state.

- serving layer
Presents the data through screens, reports, alerts, packs, and derived summaries.

## Core Entity Groups

The platform needs a small set of conceptual entity groups:

- hierarchy entities such as client, organisation, account, holding, and investment
- source entities such as documents, events, and evidence references
- monitoring entities such as periods, obligations, fulfilments, covenants, and assessments
- workflow entities such as proposals, review items, cases, alerts, and approvals
- output entities such as snapshots, reports, packs, and activity history

## Evidence Model

Every important output should be explainable from source material. At a high level, that means:

- keeping the source document or incoming record
- storing enough citation context to explain where a value came from
- preserving the approval or derivation path that turned a proposal into canonical state
- exposing that lineage back through the user interface

## Access Model

Access should be constrained by client and portfolio boundaries.

Some data is shared at the deal level. Other data, especially ownership and holding context, is private to a narrower scope. The architecture assumes those boundaries are structural, not optional.

## Design Constraints

- source material should be retained and not silently overwritten
- AI-assisted outputs should remain proposals until committed by rules or approval
- state changes should be auditable
- the model should support both single-deal depth and portfolio aggregation
- the conceptual model should be richer than the current demo schema so the product can grow into it
