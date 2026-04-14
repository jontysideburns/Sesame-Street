// Worked-example scenario: Gatwick capital stack where the MidCo £475m debt
// is secured on GIP's 49.99% shareholding only (asymmetric shareholder-level
// financing). Outputs docs/gatwick-capital-stack-gip-financing-scenario.docx.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType,
} = require("docx");

const ACCENT = "1F6FA5";
const ACCENT_LIGHT = "D6E4F0";
const GREY_LINE = "CCCCCC";
const GOOD_GREEN = "2F8B72";
const WARNING_ORANGE = "C97F1F";
const CRITICAL_RED = "D65454";

const thin = { style: BorderStyle.SINGLE, size: 4, color: GREY_LINE };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

const CONTENT_WIDTH = 9360; // US Letter portrait, 1" margins

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, font: "Arial", size: 22, ...(opts.run || {}) })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: ACCENT })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });
}

function mono(text, size = 18) {
  return new TextRun({ text, font: "Consolas", size });
}

function codeLine(text) {
  return new Paragraph({ spacing: { after: 40 }, children: [mono(text)] });
}

function cellP(text, opts = {}) {
  const align = opts.align ? { alignment: opts.align } : {};
  return new Paragraph({
    spacing: { after: 0 },
    ...align,
    children: [new TextRun({
      text,
      font: "Arial",
      size: opts.size || 20,
      bold: opts.bold || false,
      color: opts.color || "000000",
    })],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.w, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [cellP(text, opts)],
  });
}

function headerCell(text, w) {
  return cell(text, { w, fill: ACCENT_LIGHT, bold: true, size: 19 });
}

// ────────────────────────────────────────────────────────────────────────────
// Corporate structure
// ────────────────────────────────────────────────────────────────────────────
const corpCols = [3200, 2000, 1500, 2660];
const corpTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: corpCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Entity", corpCols[0]),
        headerCell("Role", corpCols[1]),
        headerCell("Jurisdiction", corpCols[2]),
        headerCell("Parent", corpCols[3]),
      ],
    }),
    ...[
      ["Gatwick Airport Limited", "OpCo (asset)", "GB", "Ivy Holdco Limited"],
      ["Gatwick Funding Limited", "Issuer SPV", "GB", "Ivy Holdco Limited"],
      ["Ivy Holdco Limited", "BidCo", "GB", "GAF plc"],
      ["Gatwick Airport Finance plc (GAF)", "MidCo (common)", "GB", "VINCI Airports 50.01 / GIP Gatwick Holdings 49.99"],
      ["VINCI Airports", "HoldCo", "FR", "VINCI SA"],
      ["GIP Gatwick Holdings Ltd", "MidCo (GIP-only) \u2014 £475m debt here", "GB", "GIP / Blackrock funds"],
      ["Global Infrastructure Partners (Blackrock)", "Ultimate parent", "US", "\u2014"],
      ["VINCI SA", "Ultimate parent", "FR", "\u2014"],
    ].map((row) =>
      new TableRow({
        children: [
          cell(row[0], { w: corpCols[0] }),
          cell(row[1], { w: corpCols[1] }),
          cell(row[2], { w: corpCols[2] }),
          cell(row[3], { w: corpCols[3] }),
        ],
      })
    ),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// OpCo debt — unchanged from Rev.2
// ────────────────────────────────────────────────────────────────────────────
const opcoDebtCols = [3400, 1300, 1300, 1300, 2060];
const opcoDebtTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: opcoDebtCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Layer", opcoDebtCols[0]),
        headerCell("Total (\u00A3m)", opcoDebtCols[1]),
        headerCell("Our holding (\u00A3m)", opcoDebtCols[2]),
        headerCell("% of OpCo EV", opcoDebtCols[3]),
        headerCell("Priority", opcoDebtCols[4]),
      ],
    }),
    new TableRow({
      children: [
        cell("Class A bonds \u2014 11 tranches, pari-passu", { w: opcoDebtCols[0] }),
        cell("3,364.6", { w: opcoDebtCols[1], align: AlignmentType.RIGHT }),
        cell("125.0", { w: opcoDebtCols[2], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("51.8%", { w: opcoDebtCols[3], align: AlignmentType.RIGHT }),
        cell("Rank 1 (our position)", { w: opcoDebtCols[4], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// GIP-level debt table
// ────────────────────────────────────────────────────────────────────────────
const gipDebtCols = [3400, 1300, 1300, 1300, 2060];
const gipDebtTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: gipDebtCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Layer", gipDebtCols[0]),
        headerCell("Total (\u00A3m)", gipDebtCols[1]),
        headerCell("Our holding (\u00A3m)", gipDebtCols[2]),
        headerCell("% of GIP stake", gipDebtCols[3]),
        headerCell("Priority", gipDebtCols[4]),
      ],
    }),
    new TableRow({
      children: [
        cell("GIP Gatwick Holdings \u2014 \u00A3475m NAV facility", { w: gipDebtCols[0] }),
        cell("475.0", { w: gipDebtCols[1], align: AlignmentType.RIGHT }),
        cell("0.0", { w: gipDebtCols[2], align: AlignmentType.RIGHT }),
        cell("30.3%", { w: gipDebtCols[3], align: AlignmentType.RIGHT }),
        cell("Rank 1 at GIP only", { w: gipDebtCols[4], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Full capital stack — asymmetric by shareholder
// ────────────────────────────────────────────────────────────────────────────
const stackCols = [3400, 1300, 1300, 1300, 2060];
const stackTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: stackCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Layer (bottom = first claim)", stackCols[0]),
        headerCell("Total (\u00A3m)", stackCols[1]),
        headerCell("Our holding (\u00A3m)", stackCols[2]),
        headerCell("% of EV", stackCols[3]),
        headerCell("Priority", stackCols[4]),
      ],
    }),
    // VINCI equity — unencumbered
    new TableRow({
      children: [
        cell("VINCI residual equity (unencumbered)", { w: stackCols[0], color: GOOD_GREEN }),
        cell("1,568.4", { w: stackCols[1], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("0.0", { w: stackCols[2], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("24.1%", { w: stackCols[3], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("Rank \u221E (clean)", { w: stackCols[4], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
      ],
    }),
    // GIP net equity — after NAV facility
    new TableRow({
      children: [
        cell("GIP residual equity (net of NAV facility)", { w: stackCols[0], color: GOOD_GREEN }),
        cell("1,092.0", { w: stackCols[1], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("0.0", { w: stackCols[2], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("16.8%", { w: stackCols[3], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("Rank \u221E (on GIP stake)", { w: stackCols[4], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
      ],
    }),
    // GIP NAV debt — parallel claim, only on GIP's shares
    new TableRow({
      children: [
        cell("GIP Gatwick Holdings \u00A3475m facility  \u2014  parallel claim on GIP\u2019s 49.99% only", { w: stackCols[0], color: WARNING_ORANGE }),
        cell("475.0", { w: stackCols[1], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("0.0", { w: stackCols[2], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("7.3%", { w: stackCols[3], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("Rank 1 at GIP HoldCo (not in CTA group)", { w: stackCols[4], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
      ],
    }),
    // OpCo senior debt — our position
    new TableRow({
      children: [
        cell("Class A senior secured (11 bonds, pari-passu)", { w: stackCols[0], bold: true, color: ACCENT }),
        cell("3,364.6", { w: stackCols[1], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("125.0", { w: stackCols[2], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("51.8%", { w: stackCols[3], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("Rank 1 (our position)", { w: stackCols[4], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
      ],
    }),
    // EV
    new TableRow({
      children: [
        cell("Enterprise Value (assumed, OpCo-level)", { w: stackCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("6,500.0", { w: stackCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("125.0", { w: stackCols[2], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("100.0%", { w: stackCols[3], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("", { w: stackCols[4], fill: ACCENT_LIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Shareholder asymmetry table
// ────────────────────────────────────────────────────────────────────────────
const shCols = [3600, 1300, 1400, 1500, 1560];
const shTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: shCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Shareholder", shCols[0]),
        headerCell("Ownership", shCols[1]),
        headerCell("Gross equity (\u00A3m)", shCols[2]),
        headerCell("Debt on stake (\u00A3m)", shCols[3]),
        headerCell("Net equity (\u00A3m)", shCols[4]),
      ],
    }),
    new TableRow({
      children: [
        cell("VINCI Airports (VINCI SA)", { w: shCols[0] }),
        cell("50.01%", { w: shCols[1], align: AlignmentType.RIGHT }),
        cell("1,568.4", { w: shCols[2], align: AlignmentType.RIGHT }),
        cell("0.0", { w: shCols[3], align: AlignmentType.RIGHT }),
        cell("1,568.4", { w: shCols[4], bold: true, color: GOOD_GREEN, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Global Infrastructure Partners (Blackrock)", { w: shCols[0] }),
        cell("49.99%", { w: shCols[1], align: AlignmentType.RIGHT }),
        cell("1,567.0", { w: shCols[2], align: AlignmentType.RIGHT }),
        cell("(475.0)", { w: shCols[3], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("1,092.0", { w: shCols[4], bold: true, color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Total", { w: shCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("100.00%", { w: shCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("3,135.4", { w: shCols[2], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("(475.0)", { w: shCols[3], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("2,660.4", { w: shCols[4], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Metrics — deal view vs our view
// ────────────────────────────────────────────────────────────────────────────
const metricsCols = [4200, 2500, 2660];
const metricsTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: metricsCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Metric", metricsCols[0]),
        headerCell("Deal (consolidated group)", metricsCols[1]),
        headerCell("Our exposure view", metricsCols[2]),
      ],
    }),
    ...[
      ["Senior LTV (Class A / EV)", "51.8%", "51.8% (we\u2019re senior)"],
      ["Consolidated LTV (group debt only)", "51.8%", "n/a \u2014 we hold only senior"],
      ["Consolidated leverage (Class A / EBITDA)", "5.89\u00D7", "5.89\u00D7"],
      ["GIP HoldCo debt counted in group leverage?", "No \u2014 outside CTA", "No"],
      ["Debt senior to us", "\u00A30 (we\u2019re at rank 1)", "\u00A30"],
      ["Subordinated cushion below us (consolidated group)", "\u2014", "\u00A30 \u2014 no MidCo debt in CTA chain"],
      ["Shareholder-level debt on GIP stake (separate claim pool)", "\u00A3475m", "Does not reduce our cushion; acts as change-of-control risk"],
      ["True equity cushion below us", "\u2014", "\u00A33,135m (same as Rev.2)"],
      ["VINCI attributable equity (unencumbered)", "\u2014", "\u00A31,568m"],
      ["GIP attributable equity (after NAV facility)", "\u2014", "\u00A31,092m"],
    ].map(([k, a, b]) =>
      new TableRow({
        children: [
          cell(k, { w: metricsCols[0] }),
          cell(a, { w: metricsCols[1], align: AlignmentType.RIGHT }),
          cell(b, { w: metricsCols[2], align: AlignmentType.RIGHT }),
        ],
      })
    ),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Observations table
// ────────────────────────────────────────────────────────────────────────────
const obsCols = [2800, 6560];
const obsTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: obsCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Theme", obsCols[0]),
        headerCell("Observation", obsCols[1]),
      ],
    }),
    ...[
      ["The £475m sits outside the consolidated group", "Unlike the actual Rev.2 structure where the GAF bond is MidCo debt inside the corporate chain, here the £475m is at a GIP-specific SPV that holds GIP\u2019s shareholder stake. It is neither above nor below the OpCo senior in the same priority stack \u2014 it is a parallel claim on GIP\u2019s shares only. Consolidated group leverage is unchanged from the senior-only case."],
      ["Asymmetric shareholder positions", "VINCI owns its 50.01% clean; GIP owns its 49.99% encumbered. VINCI\u2019s effective equity is £1,568m; GIP\u2019s is £1,092m. Change of control is concentrated on the GIP side \u2014 an enforcement event against GIP\u2019s shares could transfer the 49.99% to the NAV lender."],
      ["Our £125m senior is structurally the same", "Rank 1 position unchanged. The \u00A3475m is not economically a cushion below us in this structure; it is a separate debt secured on a claim pool we do not touch. Our LTV to the senior is still 51.8% and our consolidated leverage is still 5.89\u00D7."],
      ["But risk profile shifts", "Change of control (partial, 49.99%) becomes more likely than in Rev.2 because GIP can default on its NAV facility without distressing the operating company. In Rev.2, a GAF default would trigger a GF lock-up; here, a GIP HoldCo default does not touch the CTA at all. Worth flagging in the change-of-control regime in Tab 1."],
      ["No impact on Fitch ratings", "Rating is on the OpCo (GF) group and on GAF (MidCo). In this scenario GAF has no debt, so there is no MidCo rating issue. The GIP HoldCo NAV facility would be rated separately by its own lenders based on the value and volatility of the GIP stake, not on CTA group performance."],
      ["How the spec must handle it", "The Capital Stack engine must be able to represent debt at an entity that is NOT in the consolidated chain \u2014 e.g. a GIP-specific holding vehicle. This is done by marking the entity\u2019s within_security_perimeter=No on Tab 7. Its debt appears in the stack as a parallel claim, visually offset or tagged so it\u2019s clear the debt does not sit in the group leverage."],
    ].map(([k, v]) =>
      new TableRow({
        children: [
          cell(k, { w: obsCols[0], bold: true }),
          cell(v, { w: obsCols[1] }),
        ],
      })
    ),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Document
// ────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Sesame Street",
  title: "Gatwick Capital Stack \u2014 GIP-Secured MidCo Scenario",
  description: "Worked example: MidCo debt secured on GIP's 49.99% shareholding only.",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 32, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 26, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 22, bold: true },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      // ─── Title ──────────────────────────────────────────────────────
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "SESAME STREET  \u2014  SCENARIO ANALYSIS", font: "Arial", size: 18, color: "888888", bold: true, characterSpacing: 40 })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "Capital Stack \u2014 GIP-Secured MidCo Variant", font: "Arial", size: 40, bold: true, color: ACCENT })],
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: "Gatwick Airport  \u00B7  Hypothetical scenario  \u00B7  For review", font: "Arial", size: 22, italics: true, color: "666666" })],
      }),

      // ─── Scenario note ──────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 0, after: 120 },
        shading: { fill: "FFF7E0", type: ShadingType.CLEAR },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: WARNING_ORANGE, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: WARNING_ORANGE, space: 4 },
        },
        children: [
          new TextRun({ text: "Scenario: ", font: "Arial", size: 20, bold: true, color: WARNING_ORANGE }),
          new TextRun({ text: "This document is a hypothetical variant of the Rev.2 Gatwick worked example. The actual Gatwick structure has a MidCo (GAF plc) with a \u00A3475m 6% 2030 bond that ranks above the shareholders and is effectively backed by both shareholders\u2019 stakes pro-rata. In this variant we assume the \u00A3475m debt sits instead at a GIP-specific holding vehicle and is secured only on GIP\u2019s 49.99% shareholding. VINCI\u2019s 50.01% stake is unencumbered. This is a common pattern for shareholder-level NAV financings.", font: "Arial", size: 20 }),
        ],
      }),
      p(""),

      // ─── Purpose ────────────────────────────────────────────────────
      h2("Purpose"),
      p("The purpose of this variant is to demonstrate how the Capital Stack engine must handle debt that sits outside the consolidated deal group. The same OpCo senior debt (\u00A33,364.6m Class A bonds) and the same OpCo Enterprise Value (\u00A36,500m) apply. What changes is: (a) the \u00A3475m of MidCo-level debt moves out of the consolidated chain into a GIP-specific SPV, (b) the security package is limited to GIP\u2019s 49.99% stake, and (c) the shareholder positions become asymmetric."),

      // ─── 1. Corporate structure ────────────────────────────────────
      h2("1. Corporate structure"),
      p("The GAF MidCo shell is retained as a common holding layer, but now carries no external debt. A new entity \u2014 GIP Gatwick Holdings Ltd \u2014 sits in parallel and holds GIP\u2019s 49.99% stake. The \u00A3475m NAV facility is at this GIP-only vehicle."),
      corpTable,
      p(""),

      // ─── 2. Debt tables ────────────────────────────────────────────
      h2("2. Debt inventory"),
      h3("OpCo / Issuer debt (unchanged)"),
      opcoDebtTable,
      p(""),
      h3("GIP-level debt (new in this scenario)"),
      p("Secured only on GIP Gatwick Holdings Ltd\u2019s 49.99% stake in GAF. Not within the CTA ring-fence. Not an obligation of VINCI, GAF, Ivy Holdco, or the OpCo/Issuer."),
      gipDebtTable,
      p(""),

      // ─── 3. Valuation ──────────────────────────────────────────────
      h2("3. Valuation (unchanged from Rev.2)"),
      p("OpCo Enterprise Value assumed \u00A36,500m (FY2024 EBITDA \u00A3571m \u00D7 \u223C11.4\u00D7). The GIP NAV facility is advanced against 30.3% of the estimated value of GIP\u2019s gross stake (\u00A3475m / \u00A31,567m gross equity)."),

      // ─── 4. Walked stack ───────────────────────────────────────────
      h2("4. The walked capital stack"),
      p("Walked bottom-up from the operating asset. Note that below the Class A line, the stack is no longer purely sequential \u2014 the GIP NAV debt sits in a parallel claim pool, not stacked above or below the other layers in the same sense."),
      h3("Step 1 \u2014 OpCo / Issuer (CTA ring-fenced group)"),
      bullet("Class A bonds (total): \u00A33,364.6m"),
      bullet("OpCo residual equity flowing up: \u00A36,500m \u2212 \u00A33,364.6m = \u00A33,135.4m"),

      h3("Step 2 \u2014 GAF MidCo"),
      p("No external debt in this scenario. GAF is a pass-through for both shareholders."),

      h3("Step 3 \u2014 Shareholder level (asymmetric)"),
      p("GAF residual equity \u00A33,135.4m splits pro-rata along the 50.01 / 49.99 JV, but the \u00A3475m NAV facility lands exclusively on GIP\u2019s stake:"),
      shTable,
      p(""),
      p("VINCI carries no debt on its stake: full \u00A31,568m. GIP\u2019s \u00A31,567m gross stake is reduced by the \u00A3475m NAV facility to \u00A31,092m net. Total residual equity is unchanged from Rev.2 (\u00A32,660m) but the allocation has shifted \u00A3237m from GIP to VINCI.", { run: { italics: true } }),

      // ─── 5. Full stack with two columns ────────────────────────────
      h2("5. Full stack \u2014 two columns (total and our holding)"),
      stackTable,
      p(""),
      p("Note the visual structure: the GIP NAV debt is coloured differently and flagged as a parallel claim \u2014 it is not part of the priority waterfall on OpCo cashflows. In a rendered UI it would be offset or tagged to make this distinction obvious.", { run: { italics: true } }),

      // ─── 6. Metrics ────────────────────────────────────────────────
      h2("6. Derived metrics \u2014 deal view vs our view"),
      metricsTable,
      p(""),

      // ─── 7. Visual ─────────────────────────────────────────────────
      h2("7. Visual stack summary"),
      codeLine("\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513        \u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513"),
      codeLine("\u2503 VINCI (50.01%)                        \u2503        \u2503 GIP (49.99%)      \u2503"),
      codeLine("\u2503   Unencumbered equity          \u00A31,568m \u2503        \u2503   Net equity       \u2503"),
      codeLine("\u2503                                       \u2503        \u2503            \u00A31,092m \u2503"),
      codeLine("\u2503                                       \u2503        \u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503                                       \u2503        \u2503 GIP NAV \u00A3475m bond \u2503  \u2190 parallel"),
      codeLine("\u2503                                       \u2503        \u2503 (secured on GIP   \u2503      claim"),
      codeLine("\u2503                                       \u2503        \u2503  shares only)     \u2503      (not in CTA)"),
      codeLine("\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B        \u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B"),
      codeLine("                 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"),
      codeLine("                            \u25BC"),
      codeLine("                 \u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513"),
      codeLine("                 \u2503 GAF MidCo (pass-through, no external debt)   \u2503"),
      codeLine("                 \u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("                 \u2503 Ivy Holdco  (BidCo, pass-through)             \u2503"),
      codeLine("                 \u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("                 \u2503 OPCO / ISSUER  (CTA ring-fence)               \u2503"),
      codeLine("                 \u2503   Class A bonds  \u00A33,365m  Rank 1 (our \u00A3125m) \u2503"),
      codeLine("                 \u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B"),
      codeLine("                                      Enterprise Value = \u00A36,500m"),
      p(""),

      // ─── 8. Our position ───────────────────────────────────────────
      h2("8. Our position (unchanged in rank; altered in context)"),
      bullet("Priority rank: 1 \u2014 first claim on OpCo cashflows, pari-passu with every other Class A bondholder."),
      bullet("Senior LTV: 51.8% (unchanged from Rev.2)."),
      bullet("Consolidated leverage: 5.89\u00D7 (unchanged from Rev.2; the GIP NAV facility is outside the CTA group and does not count)."),
      bullet("True equity cushion below us: \u00A33,135m (unchanged from Rev.2 in aggregate, though the distribution between VINCI and GIP is different)."),
      bullet("Change-of-control exposure: elevated. An enforcement event against GIP\u2019s shares by the NAV lender could transfer 49.99% of the equity to a different party. This does not breach the CTA automatically but may trigger change-of-control tests in the OpCo finance documents."),

      // ─── 9. Observations ──────────────────────────────────────────
      h2("9. Observations"),
      obsTable,
      p(""),

      // ─── 10. Implications for spec ─────────────────────────────────
      h2("10. Implications for the Capital Stack specification"),
      p("This variant surfaces two requirements that were not visible in Rev.2:"),
      bullet("Entities outside the consolidated chain must render in the stack but should not feed the consolidated leverage metrics. Use Tab 7 within_security_perimeter=No as the flag. The engine should tag any debt on a non-perimeter entity as a \u201cparallel claim\u201d rather than stacking it in the main priority waterfall."),
      bullet("Shareholder asymmetry must be captured. The VINCI / GIP split is 50.01 / 49.99 in ownership, but their net equity positions differ materially after shareholder-level debt. The Tab 7 entity for GIP Gatwick Holdings should carry its own 49.99% ownership_pct linked to Ivy Holdco, and Tab 2 should reference that entity as the entity_level for the NAV facility."),
      bullet("Change-of-control risk becomes a first-class output. When shareholder-level debt exists on part of the ownership, the engine should compute and surface the change-of-control coverage \u2014 i.e. the LTV on the pledged shareholding (30.3% here). A spike in that coverage is a lead indicator of potential partial change-of-control before any operating distress."),
      bullet("The stack UI needs a \u201cparallel claim\u201d visual treatment. In Rev.2 the stack is linear. In this scenario it branches on the shareholder row \u2014 VINCI\u2019s stake runs clean while GIP\u2019s stake carries its own debt. A well-drawn stack makes the asymmetry immediately obvious."),
      p(""),
      p("Once the spec handles this scenario cleanly, the Capital Stack feature is complete for the realistic range of infrastructure structures: single-level, multi-level consolidated (Rev.2), and shareholder-level parallel (this variant).", { run: { italics: true } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", "gatwick-capital-stack-gip-financing-scenario.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Saved to", outPath);
});
