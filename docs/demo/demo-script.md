# Demo Scenario Narrative

Purpose: provide the presenter script for the multi-step investor demo narrative.
Audience: anyone recording or presenting the demo.
Status: current

This document is a detailed demo script guide for the Sesame Street private markets debt monitoring demo.

It is written for recording a demo video, running a live product demo, or handing the story to another presenter.

The scenarios are designed as one continuous narrative, not eight unrelated feature tours.

The core idea is:

`quarter-end readiness week at Sesame Asset Management`

The audience should feel that the platform is being used by a real team, on real work, under time pressure, with linked operational consequences.

---

## 1. Narrative Spine

Sesame Asset Management is preparing for quarter-end readiness week across its infrastructure credit book.

Two live deals are already under active monitoring:

- `Aurora Prime Data Campus`
- `Ion Harbor`

At the same time, the team is preparing to onboard a new allocation:

- `Apollo Edge Campus`

The pressure points during the week are:

1. Incoming borrower packages must be ingested and reviewed.
2. A key deal shows deterioration after the latest reporting package.
3. A borrower consent / waiver request must be decided and translated into live monitoring terms.
4. Forecast expectations need to be refreshed.
5. Committee and reporting materials need to be produced.
6. A new client allocation must be configured and activated cleanly.

The platform should feel like one operating system that connects all of these activities.

---

## 2. Cast of Characters

Use these names consistently in narration.

### Internal team

- `Daniel Ross`
  Portfolio Manager for infrastructure credit. He starts from the portfolio view, monitors risk, and needs decision-ready summaries.

- `Priya Shah`
  Asset Monitoring Analyst. She works intake, review, compliance, and evidence-heavy workflows.

- `Maya Chen`
  Head of Asset Management. She makes or oversees key decisions on waivers, amendments, and escalations.

- `Elena Ruiz`
  Reporting Lead. She is responsible for committee packs, report release, and delivery tracking.

### Borrower-side actor

- `James Porter`
  CFO of Aurora Prime Data Campus. He submits the borrower package and later requests relief via a consent / waiver path.

### Client / hierarchy actors

- `Harborview Retirement System`
  A new institutional client to be configured in the hierarchy.

- `Harborview Core Infrastructure Sleeve`
  The account to be created under Harborview for the new allocation.

---

## 3. Core Objects To Reuse Throughout The Demo

Keep these names stable across the full video.

### Existing monitored deals

- `Aurora Prime Data Campus`
  Primary stressed live deal in the story.

- `Ion Harbor`
  Secondary live deal, useful for showing that the platform handles multiple positions and requests.

### New deal to set up

- `Apollo Edge Campus`
  New deal introduced later in the narrative through the setup workflow.

### New hierarchy items

- `Harborview Retirement System`
- `Harborview Core Infrastructure Sleeve`

---

## 4. Demo Preconditions

Before recording, verify these conditions.

### Platform condition

- The app is running cleanly.
- `Portfolio`, `Intake`, `Review`, `Configuration`, `Reports`, `Activity`, and `Work` all load.
- The `Aurora Prime Data Campus` deal page is available.

### Clock condition

Set the demo clock to quarter-end readiness week.

Recommended framing:

- `currentDemoDate`: use the seeded quarter-end readiness week date already in the demo
- `clockLabel`: `Quarter-end readiness week`

### Intake condition

Make sure the watcher has at least one Aurora-related incoming file available in `Intake`.

Ideal visible outcome:

- One Aurora package already classified and matched
- At least one extracted field routed to review

### Workflow condition

Make sure the `Activation / approval layer` has some pre-existing setup workflows.

This is useful because it shows:

- activation queue behavior
- tasks
- activation history

### Report / pack condition

Make sure memo packs and reports exist for at least one live deal so the reporting scenarios feel real.

---

## 5. Recommended Video Structure

Recommended total runtime:

- `12 to 18 minutes`

Recommended order:

1. Portfolio control-tower opening
2. Intake and processing
3. Review and commit
4. Deal-level decisioning
5. Borrower request and amendment
6. Forecast refresh
7. Reporting and committee output
8. New configuration / activation flow

---

## 6. Scenario 1: Start The Week From The Portfolio Control Tower

### Purpose

Show that the platform starts from portfolio operating reality, not isolated deal screens.

### Business problem

Daniel Ross needs to know what matters this week:

- what is due
- what is overdue
- which deals are under stress
- which cycles are blocked
- what requires escalation

Without a unified portfolio control view, he would be bouncing between spreadsheets, emails, and separate workflows.

### Screens to show

- `Miscellaneous`
- `Portfolio`
- `Portfolio Calendar`

### Step-by-step demo flow

1. Open `Miscellaneous`.
2. Show the `Demo clock`.
3. Explain that the schedule is fixed, but the operating date is movable for demo purposes.
4. Move to `Portfolio`.
5. Read the top metrics as Daniel's first-minute health check.
6. Call out:
   - scoped exposure
   - distinct deals
   - alerts
   - review / obligation / risk indicators
7. Show the operating calendar panel or open the full calendar view.
8. Point to blocked, due, and overdue cycle items.
9. Show holdings and the covenant heatmap.

### Narration guide

Suggested wording:

> "Daniel starts his day by moving the operating date into quarter-end readiness week. He is not rewriting the schedule. He is asking the system: given the same obligations and milestones, what is now due, overdue, blocked, or ready? In one place, he can see the health of the portfolio, the cycle pressure, and which deals deserve attention before committee."

### What the audience should understand

- The platform has a coherent portfolio operating layer.
- Date-sensitive status is driven by the demo clock, not by manually editing each item.
- The user can start from the book and drill into any specific issue.

### Transition to next scenario

Use Aurora as the lead-in:

> "Aurora Prime Data Campus is one of the deals attracting attention this week. Let's see why."

---

## 7. Scenario 2: A Borrower Package Lands In Intake

### Purpose

Show that raw documents enter a visible, auditable processing pipeline.

### Business problem

James Porter at Aurora sends a package. Priya needs to answer:

- did the system see it
- where is it in the pipeline
- how far did automation get
- can she trust the AI output

### Screens to show

- `Intake`

### Step-by-step demo flow

1. Open `Intake`.
2. Start at the KPI row and watcher status.
3. Explain that files are being observed from a watched directory.
4. Move to `Pipeline posture`.
5. Click a stage bubble such as `classified`, `matched`, or `review`.
6. Show that the selected stage filters the list immediately below.
7. Open the Aurora document from the stage list.
8. In the document viewer, expand:
   - `AI audit log`
   - `Extraction proposals`
   - `Stage timeline`

### Narration guide

Suggested wording:

> "Priya does not need to guess whether the file was picked up. The system shows exactly where the document sits in the intake pipeline. The audit trail shows the classification, matching, extraction, and routing stages. She can inspect not only what the AI concluded, but how it got there and what evidence it used."

### What to point out visually

- Stage bubbles act like operational counters.
- Clicking a stage filters documents.
- Clicking a document opens the full metadata and evidence context.
- The AI audit log is compact but expandable.
- Supporting citations sit under the relevant audit entry, not as a disconnected list.

### What the audience should understand

- Intake is an operating workflow, not just a document folder.
- AI is used as a proposal engine.
- The system preserves traceability from raw file to proposed facts.

### Transition to next scenario

Use the routed Aurora fact:

> "One of the Aurora extracted facts was important enough to route for human review. Let's move to that approval step."

---

## 8. Scenario 3: Human Review Before Facts Become Canonical

### Purpose

Show the human control point between AI extraction and system-of-record updates.

### Business problem

Not every extracted field should be auto-committed.

Priya must decide:

- is the extracted number right
- is it supported by the source
- what would change if it is approved
- should it be corrected or rejected

### Screens to show

- `Review`
- optionally return to the same document in `Intake` for continuity

### Step-by-step demo flow

1. Open `Review`.
2. Locate the Aurora item.
3. Open the collapsible review row.
4. Show:
   - source evidence
   - proposed value
   - prior period comparison
   - impact-oriented detail
5. Approve and commit, if the current environment is safe for interactive demo.
6. If you do not want to mutate live state during recording, describe the action instead of clicking it.

### Narration guide

Suggested wording:

> "This is the point where AI stops and controlled operations begin. Priya can compare the proposed fact to the cited source, see how it differs from prior information, and then decide whether it should become canonical. The system is helping her move quickly, but the approval decision stays with the human operator."

### What the audience should understand

- There is a defined review checkpoint.
- Human approval is part of the workflow, not an afterthought.
- Review is tied to evidence, not just to abstract workflow tasks.

### Transition to next scenario

Move directly into the deal outcome:

> "Once that package is committed, the real question is not the number itself, but what it means for the deal."

---

## 9. Scenario 4: The Deal TopSheet Explains The Credit Story

### Purpose

Show how the platform converts committed operational data into a decision-ready deal view.

### Business problem

Daniel does not want to read raw package fields. He wants to know:

- is compliance current
- how are the covenants performing
- what does the new period imply for risk
- is distribution still allowed

### Screens to show

- `Aurora Prime Data Campus` deal page
- optionally `Deal Calendar`

### Step-by-step demo flow

1. Open `Aurora Prime Data Campus`.
2. Walk the TopSheet layout in business order:
   - overview and narrative
   - compliance update
   - investment update
   - key metrics
   - credit metrics table
   - deal snapshot
   - risk snapshot
3. Highlight any change driven by the newly reviewed document.
4. Open the deal calendar if you want to reinforce milestone readiness.

### Narration guide

Suggested wording:

> "This is Daniel's operating factsheet for Aurora. The platform is no longer showing just a processed document. It is showing the current credit state of the deal: compliance, covenant performance, risk posture, and whether the borrower remains clear to distribute."

### What to point out visually

- The covenant table is not generic reporting; it is threshold-aware.
- The TopSheet is a compact credit monitoring screen, not a document viewer.
- This is where portfolio management decisions become possible.

### What the audience should understand

- The platform moves from data ingestion to credit meaning.
- The TopSheet is the center of the single-deal workspace.

### Transition to next scenario

Use the emerging pressure as the lead-in:

> "And when the borrower needs relief from those terms, the system handles that as a governed request, not a side email."

---

## 10. Scenario 5: Borrower Request, Voting, Decision, And Amendment

### Purpose

Show that borrower requests are handled as tracked business decisions with downstream effects.

### Business problem

Aurora requests a waiver or consent.

Maya needs to know:

- what the borrower is asking for
- who has voted and how
- what the current decision state is
- what terms will change if the request is approved

### Screens to show

- `Aurora -> Requests`
- `Aurora -> Amendments`
- optionally `Aurora -> Snapshots`

### Step-by-step demo flow

1. Open `Requests` for Aurora.
2. Show the active request, its summary, due date, and vote posture.
3. Show the current decision or decision history.
4. Explain how the request outcome links to amendment creation.
5. Move to `Amendments`.
6. Show effective-dated rule versions and downstream impact.
7. Optionally show snapshots to reinforce that post-decision state is captured historically.

### Narration guide

Suggested wording:

> "Maya is not just recording that Aurora asked for something. She is managing a governed decision. The platform captures the request, the voting posture, the decision, and then translates that into live amendments with effective dates and downstream impact on monitoring."

### What the audience should understand

- Consent / waiver is integrated into the monitored operating model.
- A decision is not complete until it changes the monitored terms.
- The platform keeps the history of that change.

### Transition to next scenario

Move from legal term change to forward expectations:

> "But amended terms are only part of the story. The other question is whether the expected case for the deal still holds."

---

## 11. Scenario 6: Forecast Refresh And Downside Case Management

### Purpose

Show the forward-looking side of monitoring.

### Business problem

The latest results raise the question:

- is Aurora just having a weak quarter
- or has the expected path changed enough to require a new monitoring case

Daniel needs to compare:

- actuals
- current monitoring case
- downside case

### Screens to show

- `Aurora -> Forecasts`
- `Aurora -> Assessment`

### Step-by-step demo flow

1. Open `Forecasts`.
2. Explain the difference between base, management, and downside cases.
3. Show the active monitoring case.
4. Explain that activating a new case refreshes downstream monitoring context.
5. Move to `Assessment`.
6. Show how forecast context informs the qualitative and quantitative assessment.

### Narration guide

Suggested wording:

> "The platform is not just comparing reported versus prior. It is comparing reported versus the currently approved monitoring case. That is how Daniel distinguishes short-term noise from a broken credit thesis."

### What the audience should understand

- Forecasts are versioned and controlled.
- A refreshed case influences assessment and risk.
- The platform supports forward-looking monitoring, not only historical tracking.

### Transition to next scenario

Use committee prep as the next natural step:

> "Once the team understands the current state and the revised case, they need to turn that into something decision-makers can act on."

---

## 12. Scenario 7: Committee Packs, Reports, And Controlled Distribution

### Purpose

Show how the platform turns monitored state into formal output.

### Business problem

Elena must produce:

- an internal committee view
- a monitored reporting output
- evidence that the output was approved and delivered correctly

Without a controlled reporting workflow, the team would manually rebuild the story each cycle.

### Screens to show

- `Aurora -> Packs`
- `Reports`
- optionally `Notifications`, `Work`, or `Activity`

### Step-by-step demo flow

1. Open `Aurora -> Packs`.
2. Show that the platform already knows how to assemble a deal committee view.
3. Open `Reports`.
4. Show generated report exports.
5. Show review / approval / release state.
6. Show schedule, distribution, delivery logs, and exceptions.
7. Optionally show `Activity` to reinforce that reporting is part of the audit trail.

### Narration guide

Suggested wording:

> "Elena is not copying information into a deck by hand. The platform already has the current TopSheet, requests, amendments, risks, and forecast context. Reporting becomes a controlled output workflow with release state, delivery tracking, and exceptions."

### What the audience should understand

- The same monitored state powers reporting.
- Reporting has workflow, approval, and audit.
- The platform reduces reconstruction work.

### Transition to next scenario

Move from operating an existing book to setting up new business:

> "So far we've stayed inside an active portfolio. Now let's show how Sesame brings a new allocation into the live operating model."

---

## 13. Scenario 8: Configure And Activate A New Allocation

### Purpose

Show that the demo supports controlled setup of new hierarchy and investment elements, not just viewing existing ones.

### Business problem

Sesame is adding a new client allocation for `Harborview Retirement System` into `Apollo Edge Campus`.

The team needs:

- a clear setup order
- controlled creation of hierarchy elements
- a workflow before activation
- a visible activation queue

### Screens to show

- `Configuration`

### Step-by-step demo flow

1. Open `Configuration`.
2. Explain that this is now a creation/editing flow, not a viewing registry.
3. In `Step 1`, create or select `Harborview Retirement System`.
4. In `Step 2`, create `Harborview Core Infrastructure Sleeve` and capture owner information as required by the current hierarchy model.
5. In `Step 3`, enter the new holding amount.
6. In `Step 4`, create or select `Apollo Edge Campus`.
7. In `Step 5`, fill:
   - workflow status
   - workflow owner
   - target go-live date
   - summary
8. Click `Open setup workflow`.
9. Show the success message.
10. Move down to `Activation / approval layer`.
11. Open the newly created queue item.
12. Show tasks, summary, and activation history.
13. Click `Activate workflow`, if the demo environment is intended to be mutated live.

### Narration guide

Suggested wording:

> "This final scenario shows the setup side of the platform. Sesame can create a new operating packet in the correct order - organisation, account, holding, deal - open a formal setup workflow, and then activate it into the live hierarchy. This is how the platform supports controlled growth, not just monitoring of the existing book."

### What the audience should understand

- Configuration follows a logical sequence.
- Workflow creation and activation are separate steps.
- The same operating platform governs both live monitoring and new setup.

### Closing line

Suggested closing:

> "That is the full operating loop: portfolio oversight, document intake, review, deal-level decisioning, requests and amendments, forecast refresh, reporting, and controlled setup of new allocations."

---

## 14. Presenter Notes

### Keep the story anchored on Aurora

Aurora should be the main thread through the first seven scenarios.

That makes the story feel cumulative:

- package arrives
- facts are reviewed
- deal deteriorates
- request is raised
- terms are amended
- forecasts are refreshed
- committee material is generated

### Use Ion Harbor sparingly

Ion Harbor is useful to prove this is a portfolio platform, not a single-deal prototype.

Use it for:

- a second request
- a second risk item
- a second portfolio datapoint

Do not let it become the primary narrative thread.

### Use Apollo Edge Campus only in the final scenario

Apollo should feel like:

- "what happens next"
- "how the platform scales"

It is the right setup story because it naturally contrasts with Aurora, which is already live and under stress.

### Do not narrate the UI mechanically

Avoid saying:

- "here is a button"
- "here is a panel"
- "here is another screen"

Prefer business-language narration:

- "Daniel is checking portfolio pressure"
- "Priya is validating extracted evidence"
- "Maya is making a governed decision"
- "Elena is preparing release-ready reporting"

---

## 15. Short Version For A Tight Demo

If you only have `6 to 8 minutes`, use this compressed sequence:

1. `Portfolio`
   Show operating pressure and alerts.
2. `Intake`
   Show Aurora package in pipeline.
3. `Review`
   Show extracted fact approval.
4. `Aurora TopSheet`
   Show impact on covenant / risk / distribution.
5. `Requests`
   Show borrower request and decisioning.
6. `Reports`
   Show committee / reporting output.
7. `Configuration`
   Show new allocation workflow creation.

This shorter version still preserves the core narrative:

`raw intake -> approved fact -> deal insight -> governed decision -> output -> controlled new setup`
