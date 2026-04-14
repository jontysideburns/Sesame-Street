// Generate an implementation plan Word doc for the Capital Stack feature.
// Output: docs/capital-stack-implementation-plan.docx

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
} = require("docx");

const ACCENT = "1F6FA5";
const ACCENT_LIGHT = "D6E4F0";
const GREY_LINE = "CCCCCC";
const GOOD_GREEN = "2F8B72";
const WARNING_ORANGE = "C97F1F";
const CRITICAL_RED = "D65454";

const thin = { style: BorderStyle.SINGLE, size: 4, color: GREY_LINE };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const CONTENT_WIDTH = 9360;

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 }, ...opts,
    children: [new TextRun({ text, font: "Arial", size: 22, ...(opts.run || {}) })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 140 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: ACCENT })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });
}
function code(text) {
  return new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text, font: "Consolas", size: 18 })] });
}
function cellP(text, opts = {}) {
  const align = opts.align ? { alignment: opts.align } : {};
  return new Paragraph({
    spacing: { after: 0 }, ...align,
    children: [new TextRun({
      text, font: "Arial", size: opts.size || 20,
      bold: opts.bold || false, color: opts.color || "000000",
      italics: opts.italics || false,
    })],
  });
}
function cell(text, opts = {}) {
  return new TableCell({
    borders, width: { size: opts.w, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [cellP(text, opts)],
  });
}
function headerCell(text, w) {
  return cell(text, { w, fill: ACCENT_LIGHT, bold: true, size: 19 });
}

// ── Tables ───────────────────────────────────────────────────────────────────

// Gap analysis
const gapCols = [3000, 3180, 3180];
const gapTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: gapCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Requirement", gapCols[0]),
      headerCell("Current state (v8)", gapCols[1]),
      headerCell("Gap to close", gapCols[2]),
    ]}),
    ...[
      ["Multi-level entity structure (OpCo / MidCo / HoldCo)", "Captured. Tab 7 Corporate Entities + entity_level on Tab 2.", "None \u2014 v8 already supports."],
      ["Cashflow priority rank per instrument", "Captured + auto-assigned by capital_structure_engine.assign_cashflow_priority_ranks().", "None."],
      ["Within-security-perimeter flag (CTA in / out)", "Captured. corporate_entities.within_security_perimeter.", "None."],
      ["Proportional consolidation engine", "Built. proportional_consolidation() helper.", "None for proportional ratios. NEW: a wrapper that runs it per shareholder for the asymmetric view."],
      ["Validation rules (pari-passu, missing entity_level, HoldCo-at-rank-1)", "validate_capital_structure() exists.", "Add: checks for shareholder-level debt without ownership_pct, missing valuation."],
      ["Enterprise Value per deal", "Column exists on deals; populated for 0 / 12 deals.", "(a) Populate. (b) Capture valuation date / method / entity."],
      ["Our holding per instrument", "our_holding column exists on capital_structure_instruments.", "Ensure populated on Gatwick + ingestion pipeline writes it."],
      ["Two-column display (Total / Our holding)", "Not built. Existing TopSheet block doesn\u2019t render a stack.", "NEW UI block."],
      ["Walked stack (bottom-up through entity chain)", "No engine helper.", "NEW: build_capital_stack() in capital_structure_engine.py."],
      ["Parallel-claim handling for non-perimeter debt", "No.", "NEW: branch the stack visualisation, exclude from CTA leverage."],
      ["Grossed-up consolidated-equivalent leverage", "Not computed.", "NEW: gross_up_factor = 1 / ownership_pct_at_debtor; equivalent_debt = face \u00D7 gross_up_factor."],
      ["Change-of-control coverage on pledged shares", "Not computed.", "NEW: when shareholder-level debt exists, output debt / value_of_pledged_stake."],
      ["API endpoint for the rendered stack", "None.", "NEW: GET /api/deals/{slug}/capital-stack."],
      ["UI block on Deal TopSheet page", "None.", "NEW: visual stack + tables + metrics."],
    ].map(([k, a, b]) => new TableRow({ children: [
      cell(k, { w: gapCols[0], bold: true }),
      cell(a, { w: gapCols[1] }),
      cell(b, { w: gapCols[2] }),
    ]})),
  ],
});

// Tab 1 new section
const tab1Cols = [2400, 1500, 5460];
const tab1Table = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: tab1Cols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Field", tab1Cols[0]),
      headerCell("Type", tab1Cols[1]),
      headerCell("Purpose / guidance", tab1Cols[2]),
    ]}),
    ...[
      ["Enterprise Value *", "Currency", "Anchor for the whole stack. Single most important field. Tag with valuation method below."],
      ["Valuation Date *", "Date", "When the EV was struck. Stacks drift over time \u2014 stale dates should warn."],
      ["Valuation Method *", "Enum", "transaction | dcf | multiples | appraisal | mark_to_model | book"],
      ["Valuation Entity", "Text (Tab 7 ref)", "Which entity in Tab 7 the EV is measured at. Defaults to OpCo."],
      ["Equity Invested at Origination", "Currency", "Initial sponsor cheque. Used for IRR / MOIC tracking. Optional but recommended."],
    ].map(([k, t, v]) => new TableRow({ children: [
      cell(k, { w: tab1Cols[0], bold: true }),
      cell(t, { w: tab1Cols[1] }),
      cell(v, { w: tab1Cols[2] }),
    ]})),
  ],
});

// Tab 2 / instruments — what to populate or add
const tab2Cols = [3000, 1800, 4560];
const tab2Table = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: tab2Cols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Field on Tab 2", tab2Cols[0]),
      headerCell("Status", tab2Cols[1]),
      headerCell("Action", tab2Cols[2]),
    ]}),
    ...[
      ["our_holding (column N)", "Already exists", "Ensure populated when ingesting deals. For Gatwick: set to 125 across the Class A bonds (pro-rata)."],
      ["entity_level, entity_name, ownership_pct", "Already exists (v8)", "Required for the stack walker. Already proven in Rev.2 Gatwick test."],
      ["cashflow_priority_rank", "Already exists, auto-assigned", "Engine fills it in if blank. No extra capture."],
      ["pledged_share_entity (NEW)", "Not present", "OPTIONAL. Where a debt is secured only on a specific shareholding (e.g. GIP-only NAV facility), this points to the shareholder entity in Tab 7. Drives the parallel-claim treatment."],
      ["pledged_share_pct (NEW)", "Not present", "OPTIONAL. Percentage of that entity\u2019s ownership pledged (usually 100% of the shareholder\u2019s stake). Drives the gross-up factor."],
    ].map(([k, t, v]) => new TableRow({ children: [
      cell(k, { w: tab2Cols[0], bold: true }),
      cell(t, { w: tab2Cols[1] }),
      cell(v, { w: tab2Cols[2] }),
    ]})),
  ],
});

// Database migration summary
const dbCols = [2800, 1600, 4960];
const dbTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: dbCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Table", dbCols[0]),
      headerCell("Column", dbCols[1]),
      headerCell("Type / notes", dbCols[2]),
    ]}),
    ...[
      ["deals", "valuation_date", "DATE NULL"],
      ["deals", "valuation_method", "VARCHAR(20) — CHECK constraint on 6 values"],
      ["deals", "valuation_entity", "TEXT NULL — soft FK to corporate_entities.entity_name (per deal)"],
      ["deals", "equity_invested", "NUMERIC NULL — origination sponsor equity (optional)"],
      ["capital_structure_instruments", "pledged_share_entity", "TEXT NULL — entity name when debt is secured on a specific stake only"],
      ["capital_structure_instruments", "pledged_share_pct", "NUMERIC(5,2) NULL — percentage pledged (drives gross-up)"],
    ].map(([k, c, t]) => new TableRow({ children: [
      cell(k, { w: dbCols[0] }),
      cell(c, { w: dbCols[1], bold: true }),
      cell(t, { w: dbCols[2] }),
    ]})),
  ],
});

// Engine functions
const engCols = [3200, 6160];
const engTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: engCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("New function in capital_structure_engine.py", engCols[0]),
      headerCell("Purpose", engCols[1]),
    ]}),
    ...[
      ["build_capital_stack(deal, instruments, entities, ev, our_holdings)", "Top-level helper. Returns a structured StackView with: tiered layers (entity \u2192 debt rows + equity row), totals, our-holding subset, parallel claims, derived metrics. Walks bottom-up through the ownership chain, subtracts debt at each level."],
      ["walk_ownership_chain(entities)", "Returns the ordered chain from the asset (root in security perimeter) up to ultimate parents. Handles branching at shareholder level."],
      ["compute_attributable_equity(entities, instruments, ev)", "For each entity: enterprise value at that level, debt absorbed at that level, residual equity. Pass-through for zero-debt entities."],
      ["gross_up_facility(instrument, debtor_ownership_pct)", "Returns equivalent_consolidated_face = face / ownership_pct. Used for shareholder-level debt at <100%-owned entities."],
      ["build_metrics(stack)", "Produces the multi-lens metrics: senior LTV, CTA-consolidated leverage, sponsor proportional leverage per shareholder, grossed-up consolidated-equivalent."],
      ["change_of_control_coverage(instrument, pledged_value)", "When a debt is secured on a specific stake: returns LTV on the pledged value. Spike alert flag if > 50% LTV on pledge."],
      ["validate_capital_stack(stack)", "Extends existing validate_capital_structure() with: missing EV, stale valuation date (> 12 months), shareholder-level debt with no pledged_share_pct, etc."],
    ].map(([k, v]) => new TableRow({ children: [
      cell(k, { w: engCols[0], bold: true, size: 19 }),
      cell(v, { w: engCols[1] }),
    ]})),
  ],
});

// API response shape
const apiCols = [2200, 7160];
const apiTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: apiCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Field", apiCols[0]),
      headerCell("Description", apiCols[1]),
    ]}),
    ...[
      ["deal", "Deal slug, name, currency, EV, valuation date / method / entity"],
      ["levels", "Ordered list (bottom \u2192 top): {entity_name, entity_level, debt[], residual_equity_total, residual_equity_our_view, ownership_split[]}"],
      ["parallel_claims", "List of debts at non-perimeter entities (e.g. shareholder-level NAV) with grossed-up equivalent face value"],
      ["metrics", "{senior_ltv, consolidated_leverage, sponsor_proportional[], grossed_up_equivalent_leverage, change_of_control_coverage[]}"],
      ["our_position", "{rank, total_pari_passu, debt_senior_to_us, subordinated_cushion, true_equity_cushion, total_cushion}"],
      ["warnings", "validate_capital_stack() output \u2014 missing EV, stale date, shareholder debt without pledged_share_pct, etc."],
    ].map(([k, v]) => new TableRow({ children: [
      cell(k, { w: apiCols[0], bold: true }),
      cell(v, { w: apiCols[1] }),
    ]})),
  ],
});

// Phased plan
const phaseCols = [800, 2200, 4760, 1600];
const phaseTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: phaseCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Ph", phaseCols[0]),
      headerCell("Theme", phaseCols[1]),
      headerCell("Deliverables", phaseCols[2]),
      headerCell("Demoable result", phaseCols[3]),
    ]}),
    ...[
      ["1", "Foundation \u2014 data model + template",
        "Migration: 4 columns on deals (valuation_date / method / entity / equity_invested), 2 on capital_structure_instruments (pledged_share_entity / pct). Tab 1 VALUATION & EQUITY section. Bump template to v9.",
        "v9 Excel template in docs/. Migration applied to running DB."],
      ["2", "Seed data \u2014 Gatwick + 1 control",
        "Populate Gatwick EV (\u00A36,500m), valuation method, valuation entity. Add the GAF MidCo bond as a Tab 2 row (entity_level=midco, ownership_pct=100). Populate our_holding for the Class A bonds. Pick 1 simpler deal (e.g. Wigmore Solar) as a single-level control case.",
        "psql query returns the populated stack inputs."],
      ["3", "Engine \u2014 walked stack + metrics",
        "build_capital_stack(), walk_ownership_chain(), compute_attributable_equity(), gross_up_facility(), build_metrics(), change_of_control_coverage(). Unit tests for the 5 spec test cases plus the two Gatwick scenarios.",
        "Python tests pass; engine returns matching numbers to the worked-example docs."],
      ["4", "API \u2014 endpoint",
        "GET /api/deals/{slug}/capital-stack. Wires engine output through scope filtering. Reuses existing FX layer if currency conversion needed.",
        "curl returns the StackView JSON for any deal."],
      ["5", "UI \u2014 Capital Stack block",
        "New block on /deals/[slug]/topsheet (and /deals/[slug] summary). Renders: (a) two-column layered stack table, (b) visual horizontal-bar stack with branching for parallel claims, (c) metrics panel showing all leverage lenses, (d) our-position summary.",
        "Stack visible on Gatwick deal page in the browser preview."],
      ["6", "Validation, scenarios, docs",
        "validate_capital_stack() warnings surface in the UI. Add the GIP-only NAV scenario as a togglable view (illustrative). Update Analytics page rules. Update CLAUDE.md, topsheet-template-instructions.md, topsheet-complete-specification.md.",
        "Analytics page has Capital Stack rule. Docs published."],
    ].map(([n, t, d, r]) => new TableRow({ children: [
      cell(n, { w: phaseCols[0], bold: true, align: AlignmentType.CENTER, fill: ACCENT_LIGHT }),
      cell(t, { w: phaseCols[1], bold: true }),
      cell(d, { w: phaseCols[2], size: 19 }),
      cell(r, { w: phaseCols[3], italics: true, size: 19 }),
    ]})),
  ],
});

// Test cases
const tcCols = [600, 2400, 6360];
const tcTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: tcCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("#", tcCols[0]),
      headerCell("Case", tcCols[1]),
      headerCell("What it tests", tcCols[2]),
    ]}),
    ...[
      ["1", "Wigmore Solar (single-level OpCo)", "Pure OpCo deal with senior debt only. No MidCo, no HoldCo. Verifies the engine handles the simplest case without errors and reports rank 1, no parallel claims, no gross-up needed."],
      ["2", "Gatwick Rev.2 (actual GAF MidCo)", "Two external debt levels in the consolidated chain (OpCo Class A + MidCo GAF). Verifies multi-level walk, subordinated cushion calculation, two-column display, consolidated leverage 6.72\u00D7."],
      ["3", "Gatwick GIP-only NAV variant", "Shareholder-level debt outside the CTA ring-fence. Verifies parallel-claim handling, grossed-up consolidated-equivalent leverage 7.56\u00D7, asymmetric shareholder positions, change-of-control coverage."],
      ["4", "Project Alpha Port (HoldCo + OpCo with full ownership)", "MidCo above OpCo with HoldCo debt at 100% ownership. Verifies ranks 1 and 2 assigned correctly, no gross-up needed (ownership 100%)."],
      ["5", "Hypothetical: 75% majority HoldCo (Test Case D from v8 spec)", "OpCo + MajHoldCo at 75% with both debt levels. Verifies the 75% partial-ownership case without an EV anchor mismatch."],
      ["6", "Hypothetical: pari-passu group with mismatched ranks", "Negative test \u2014 should fail validation with an ERROR per the v8 validate_capital_structure() rules."],
    ].map(([n, c, t]) => new TableRow({ children: [
      cell(n, { w: tcCols[0], bold: true, align: AlignmentType.CENTER, fill: ACCENT_LIGHT }),
      cell(c, { w: tcCols[1], bold: true }),
      cell(t, { w: tcCols[2], size: 19 }),
    ]})),
  ],
});

// Sign-off checklist
const signCols = [800, 8560];
const signTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: signCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("\u2713", signCols[0]),
      headerCell("Decision needed before kick-off", signCols[1]),
    ]}),
    ...[
      "Approve the four new fields on Tab 1 (Enterprise Value, Valuation Date, Valuation Method, Valuation Entity).",
      "Approve the two new optional fields on Tab 2 (pledged_share_entity, pledged_share_pct) for shareholder-level debt.",
      "Confirm the leverage lenses to publish: (a) CTA-consolidated headline, (b) sponsor proportional, (c) grossed-up consolidated-equivalent. Any others?",
      "Confirm the visual treatment: linear stack for consolidated debt, branched/parallel for shareholder-level debt with a visible gross-up factor.",
      "Confirm the gating threshold for change-of-control coverage warnings (proposed: amber > 30%, red > 50% LTV on pledged shares).",
      "Confirm Gatwick is the primary demo deal for the build, with Wigmore Solar as the simple-case control.",
      "Confirm the v9 Excel template is the right home for the new Tab 1 section (vs a separate addendum).",
    ].map((t) => new TableRow({ children: [
      cell("\u2610", { w: signCols[0], bold: true, align: AlignmentType.CENTER }),
      cell(t, { w: signCols[1] }),
    ]})),
  ],
});

const doc = new Document({
  creator: "Sesame Street",
  title: "Capital Stack \u2014 Implementation Plan",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 32, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 26, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 22, bold: true },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [{ reference: "bullets", levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }]}],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    children: [
      // Title
      new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: "SESAME STREET  \u2014  IMPLEMENTATION PLAN", font: "Arial", size: 18, color: "888888", bold: true, characterSpacing: 40 })],
      }),
      new Paragraph({ spacing: { after: 80 },
        children: [new TextRun({ text: "Capital Stack", font: "Arial", size: 40, bold: true, color: ACCENT })],
      }),
      new Paragraph({ spacing: { after: 240 },
        children: [new TextRun({ text: "TopSheet review, additional fields, engine scope, phased delivery  \u00B7  April 2026  \u00B7  For review", font: "Arial", size: 22, italics: true, color: "666666" })],
      }),

      // 1. Executive summary
      h2("1. Executive summary"),
      p("This plan delivers the Capital Stack feature, demonstrated in the two Gatwick worked-example documents. The build is intentionally narrow: it does not change how deals are graded, traded, or covenant-tested; it adds a single new lens on every deal that shows where each claim sits in the capital structure, what cushion sits below it, and how the leverage looks under the appropriate consolidation method."),
      p("The TopSheet (v8) already captures most of what is needed. The v8 capital structure taxonomy \u2014 entity_level, ownership_pct, cashflow_priority_rank, ratio_consolidation_level \u2014 was built precisely for this use case. To complete the picture we need only one new section on Tab 1 (Valuation & Equity, four fields) and two optional fields on Tab 2 for shareholder-level debt. Everything else is engine, API, and UI work."),
      p("Six phases. Each phase produces something demoable. Phase 1 unblocks all the others."),
      p("The two Gatwick worked examples define the test bed. All numbers in those documents must be reproducible by the engine."),

      // 2. Current state
      h2("2. Current state \u2014 what v8 already delivers"),
      p("The capital structure taxonomy added in TopSheet v8 (commit 9881762) covers the structural side of the problem:"),
      bullet("Tab 2 has 8 columns capturing entity level, ownership %, structural seniority, ratio consolidation level, intercompany lender, subordination agreement, and cashflow priority rank."),
      bullet("Tab 7 has 6 columns capturing ownership %, ownership type, control type, consolidation method, within-security-perimeter flag, and ratio level."),
      bullet("Tab 8 has the ratio_level column so covenants can be tagged to the entity level they\u2019re tested at."),
      bullet("server/capital_structure_engine.py implements assign_cashflow_priority_ranks() (auto-rank instruments), proportional_consolidation() (apply ownership % to both cashflows and debt), and validate_capital_structure() (cross-checks)."),
      bullet("The engine has been smoke-tested against the 5 spec test cases (A through E)."),
      p("What this means: the data model can already represent every structure in the two Gatwick worked examples. The work ahead is to use that data to render a stack, compute the metrics, and surface the result."),

      // 3. Gap analysis
      h2("3. Gap analysis"),
      gapTable, p(""),

      // 4. TopSheet additions
      h2("4. TopSheet additions"),
      h3("4.1  Tab 1 \u2014 new VALUATION & EQUITY section (4 fields)"),
      p("Insert as a new section on Tab 1, between RATINGS and FACILITY ECONOMICS. All fields are required for the stack to render; the build will degrade gracefully if any are missing but the deal will be flagged in the validation panel."),
      tab1Table, p(""),

      h3("4.2  Tab 2 \u2014 two optional fields for shareholder-level debt"),
      p("The bulk of Tab 2 is unchanged. Two new columns are added solely to handle the GIP-only NAV scenario class of structure (debt at a shareholder-level vehicle, secured on a specific stake). For deals without this pattern (the majority), both fields stay blank and the engine treats the debt as standard MidCo debt within the consolidated chain."),
      tab2Table, p(""),

      h3("4.3  Database migration"),
      p("All additions are idempotent column adds. No data movement, no breaking changes. Existing 12 deals continue to render with EV / valuation_date NULL until populated."),
      dbTable, p(""),

      // 5. Engine scope
      h2("5. Engine scope \u2014 capital_structure_engine.py extensions"),
      p("Build on the existing module. The engine is intentionally pure (no DB access in the helpers themselves) so the same code runs in unit tests, in the API endpoint, and could be invoked from the ingestion pipeline if needed."),
      engTable, p(""),
      p("Module layout after this work:"),
      code("server/capital_structure_engine.py"),
      code("  # existing (v8)"),
      code("    assign_cashflow_priority_ranks(instruments)"),
      code("    proportional_consolidation(entities)"),
      code("    validate_capital_structure(instruments, entities)"),
      code(""),
      code("  # new for capital stack"),
      code("    build_capital_stack(deal, instruments, entities, ev, our_holdings)  # top-level"),
      code("    walk_ownership_chain(entities)"),
      code("    compute_attributable_equity(entities, instruments, ev)"),
      code("    gross_up_facility(instrument, debtor_ownership_pct)"),
      code("    build_metrics(stack)"),
      code("    change_of_control_coverage(instrument, pledged_value)"),
      code("    validate_capital_stack(stack)  # extends validate_capital_structure"),
      p(""),

      // 6. API
      h2("6. API"),
      p("Single endpoint, returns the full StackView for any deal:"),
      code("GET /api/deals/{slug}/capital-stack"),
      code("GET /api/deals/{slug}/capital-stack?reporting_currency=GBP|USD|EUR  # optional"),
      p("Response shape (top-level):"),
      apiTable, p(""),
      p("Currency handling: the response stays in the deal\u2019s native currency by default (consistent with the rest of the deal-level API surface). The optional ?reporting_currency parameter triggers FX conversion at all monetary fields, reusing the FX engine added with the Market TopSheet feature."),

      // 7. UI
      h2("7. UI \u2014 Deal TopSheet page"),
      p("New Capital Stack block, anchored between Capital Structure Instruments and Reserves on the Deal TopSheet page. Composed of four parts:"),
      bullet("(a) Two-column layered table \u2014 each row is one layer of the stack, with Total (\u00A3m) and Our Holding (\u00A3m) columns. Mirrors the table in the worked-example documents."),
      bullet("(b) Visual horizontal-bar stack \u2014 each layer rendered as a coloured bar, sized in proportion to its contribution to the EV. Linear by default; branches at the shareholder row when shareholder-level debt is present (parallel claim)."),
      bullet("(c) Metrics panel \u2014 four leverage lenses on a single line: CTA-consolidated headline, sponsor-proportional per shareholder, grossed-up equivalent (when applicable), our-view senior LTV. Each lens has a tooltip explaining the formula."),
      bullet("(d) Our-position summary \u2014 a single sentence at the top: \u201cYou hold \u00A3125m of the \u00A33,365m Class A bonds at OpCo, ranked 1, with \u00A33,135m of cushion below you and \u00A30 senior to you.\u201d"),
      p("All four parts derive from the same StackView returned by the API \u2014 no client-side computation. The block degrades gracefully if EV is missing (shows the structural side of the stack with no LTV / leverage figures)."),

      // 8. Phased plan
      h2("8. Phased delivery plan"),
      p("Six phases, each with a demoable result. Sequential dependencies; no parallel work needed except inside a phase."),
      phaseTable, p(""),
      p("Critical path runs through engine work in Phase 3. Phases 1 and 2 unblock it; Phases 4 and 5 are pure consumers; Phase 6 is documentation. The whole sequence can run end-to-end without external dependencies.", { run: { italics: true } }),

      // 9. Test cases
      h2("9. Test cases"),
      p("Six test cases covering the realistic range of structures plus a negative test:"),
      tcTable, p(""),
      p("Cases 2 and 3 (the two Gatwick scenarios) are the headline tests \u2014 their numbers match the worked-example documents already shared, so reviewing the engine output against those documents is the acceptance criterion. Cases 4 and 5 are reused from the v8 capital structure engine smoke tests.", { run: { italics: true } }),

      // 10. Risks and dependencies
      h2("10. Risks and dependencies"),
      h3("Risks"),
      bullet("Enterprise Value quality. The engine\u2019s output is anchored to a single estimate. We need a clear convention on how often EVs are refreshed (proposed: at IC sign-off, at each annual review, on any restructuring) and how stale dates are flagged. Currently, no deal has an EV at all."),
      bullet("Cross-deal consistency. Each deal\u2019s EV will be struck on a different methodology (transaction, DCF, multiples, appraisal). The valuation_method field captures this; the UI should make the method visible alongside the EV so users don\u2019t inadvertently compare apples and oranges."),
      bullet("Multi-level structures at scale. Six of the 12 demo deals have a single-level structure; the others have varying degrees of layering. The Project Alpha Port and Getlink deals are the ones to validate after Gatwick because they have similar HoldCo / MidCo patterns."),
      bullet("Shareholder-level debt is rare but high-impact. Out of the 12 deals only the (hypothetical) Gatwick GIP variant exhibits it. The feature works without it; the UI will simply show no parallel-claim section. Worth specifying anyway because the moment one such structure appears in the book, the gross-up matters."),
      h3("Dependencies"),
      bullet("v8 capital structure taxonomy must be in place. It is. (Commit 9881762.)"),
      bullet("FX engine must be in place if the optional reporting_currency parameter is to work on the capital-stack endpoint. It is. (Commit c4b3611.)"),
      bullet("No new external libraries needed. All work uses existing Python (server) and React (client) stacks."),

      // 11. Decisions needed
      h2("11. Decisions needed before kick-off"),
      p("Each item below blocks at least one phase. Tick to confirm or note a different preference."),
      signTable, p(""),

      // 12. Out of scope
      h2("12. Explicitly out of scope for this build"),
      bullet("Live valuation feeds. EVs are entered manually via Tab 1; no integration with appraisal services or DCF models in this build."),
      bullet("Recovery analysis. The stack shows where claims sit, not how they would be paid in default. Recovery curves, post-default waterfalls, and intercreditor flows are a future feature."),
      bullet("Scenario / stress versions of the stack. The engine supports it (just re-run with a different EV) but the UI does not yet expose a side-by-side comparison."),
      bullet("Time-series of stack changes. The stack is a point-in-time view. Historical trend of LTV, equity cushion, gross-up factor over time would be a follow-on."),
      bullet("Editing capital structure from the UI. All inputs continue to flow through the TopSheet ingestion pipeline (Tab 1 + Tab 2 + Tab 7)."),

      // 13. Sign-off
      h2("13. Sign-off"),
      p("This plan is final once the decisions in Section 11 are confirmed. Engine work commences in Phase 3 once Phases 1 and 2 are complete. Acceptance criterion is that the engine output for Gatwick matches the figures in the two worked-example documents already shared (gatwick-capital-stack-worked-example.docx and gatwick-capital-stack-gip-financing-scenario.docx)."),
      p(""),
      p("Reviewer notes:", { run: { bold: true, color: ACCENT } }),
      p("\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014"),
      p(""),
      p("\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014"),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", "capital-stack-implementation-plan.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Saved to", outPath);
});
