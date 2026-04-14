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
// Metrics — deal view vs our view (three lenses)
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
        headerCell("Deal (CTA-consolidated)", metricsCols[1]),
        headerCell("Our exposure view", metricsCols[2]),
      ],
    }),
    ...[
      ["Senior LTV (Class A / EV)", "51.8%", "51.8% (we\u2019re senior)"],
      ["Consolidated LTV (CTA group debt)", "51.8%", "n/a \u2014 we hold only senior"],
      ["Consolidated leverage (Class A / EBITDA)", "5.89\u00D7", "5.89\u00D7"],
      ["GIP HoldCo debt in CTA leverage?", "No \u2014 outside ring-fence", "No"],
      ["Debt senior to us", "\u00A30 (we\u2019re at rank 1)", "\u00A30"],
      ["Subordinated cushion (within CTA group)", "\u2014", "\u00A30 \u2014 no MidCo debt in CTA"],
      ["Shareholder-level debt on GIP stake", "\u00A3475m (parallel claim)", "See grossed-up view below"],
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
// Grossed-up leverage — the gearing effect of shareholder-only debt
// ────────────────────────────────────────────────────────────────────────────
const grossCols = [3800, 1800, 1800, 1960];
const grossTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: grossCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Leverage lens", grossCols[0]),
        headerCell("Debt numerator", grossCols[1]),
        headerCell("EBITDA basis", grossCols[2]),
        headerCell("Leverage ratio", grossCols[3]),
      ],
    }),
    new TableRow({
      children: [
        cell("(a) CTA consolidated group \u2014 headline", { w: grossCols[0] }),
        cell("\u00A33,364.6m", { w: grossCols[1], align: AlignmentType.RIGHT }),
        cell("\u00A3571m", { w: grossCols[2], align: AlignmentType.RIGHT }),
        cell("5.89\u00D7", { w: grossCols[3], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("(b) VINCI proportional (50.01%)", { w: grossCols[0] }),
        cell("\u00A31,682.5m", { w: grossCols[1], align: AlignmentType.RIGHT }),
        cell("\u00A3285.6m", { w: grossCols[2], align: AlignmentType.RIGHT }),
        cell("5.89\u00D7", { w: grossCols[3], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("(c) GIP proportional (49.99%) + NAV facility", { w: grossCols[0], bold: true, color: WARNING_ORANGE }),
        cell("\u00A32,157.1m", { w: grossCols[1], bold: true, color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("\u00A3285.4m", { w: grossCols[2], bold: true, color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("7.56\u00D7", { w: grossCols[3], bold: true, color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("(d) Grossed-up consolidated-equivalent", { w: grossCols[0], bold: true, color: CRITICAL_RED }),
        cell("\u00A34,315m", { w: grossCols[1], bold: true, color: CRITICAL_RED, align: AlignmentType.RIGHT }),
        cell("\u00A3571m", { w: grossCols[2], bold: true, color: CRITICAL_RED, align: AlignmentType.RIGHT }),
        cell("7.56\u00D7", { w: grossCols[3], bold: true, color: CRITICAL_RED, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Comparison: actual GAF MidCo (Rev.2) vs GIP-only NAV (this scenario)
// ────────────────────────────────────────────────────────────────────────────
const compCols = [3000, 3180, 3180];
const compTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: compCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Metric", compCols[0]),
        headerCell("Rev.2 \u2014 Common GAF MidCo", compCols[1]),
        headerCell("This scenario \u2014 GIP-only NAV", compCols[2]),
      ],
    }),
    ...[
      ["Debt face value", "\u00A3475m", "\u00A3475m"],
      ["Who services the debt", "Both shareholders pro-rata (via GAF)", "GIP only (from its 49.99%)"],
      ["Distributions required per \u00A31 of debt service", "\u00A31", "\u00A32  (grossed up 1 / 49.99%)"],
      ["Grossed-up consolidated equivalent", "\u00A3475m", "\u00A3950m"],
      ["Consolidated-equivalent leverage", "6.72\u00D7", "7.56\u00D7"],
      ["Rating impact on consolidated group", "Fitch: \u22120.7\u00D7 leverage", "None directly (outside CTA)"],
      ["Distribution lock-up pressure", "Pro-rata", "Asymmetric (GIP side under pressure first)"],
    ].map(([k, a, b]) =>
      new TableRow({
        children: [
          cell(k, { w: compCols[0], bold: true }),
          cell(a, { w: compCols[1] }),
          cell(b, { w: compCols[2] }),
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
      ["The £475m is legally outside the CTA group \u2026", "At a GIP-specific SPV holding the 49.99% stake. Not an obligation of GAF, Ivy Holdco, the OpCo, or the Issuer. Headline consolidated group leverage stays at 5.89\u00D7 senior only, which is the number a rating agency like Fitch would publish."],
      ["\u2026 but economically it has a larger leverage impact than a common MidCo debt of the same size", "\u00A3475m of debt at GIP HoldCo must be serviced out of distributions from GIP\u2019s 49.99% stake only. To get \u00A31 to GIP, Gatwick has to pay out \u00A32 total (the other half going to VINCI). The grossed-up consolidated-equivalent is \u00A3950m \u2014 meaning the facility has the same impact on required OpCo distributions as a \u00A3950m group-level facility would. Consolidated-equivalent leverage lifts to 7.56\u00D7, above even the 6.72\u00D7 of the actual Rev.2 GAF bond."],
      ["Asymmetric shareholder positions", "VINCI holds its 50.01% clean; GIP holds its 49.99% encumbered. Net equity: VINCI \u00A31,568m vs GIP \u00A31,092m. Change of control is concentrated on the GIP side \u2014 an enforcement event against GIP\u2019s shares could transfer the 49.99% to the NAV lender."],
      ["Our £125m senior is structurally unchanged \u2026", "Rank 1 position preserved. The \u00A3475m is not a priority-waterfall cushion in this structure; it is a separate debt secured on a claim pool we do not touch. Our LTV is still 51.8% and our consolidated leverage is still 5.89\u00D7."],
      ["\u2026 but distribution-coverage risk is meaningfully worse", "The grossed-up distribution demand means Gatwick has to distribute \u00A32 for every \u00A31 of GIP NAV debt service. This increases the likelihood of an OpCo distribution lock-up being triggered under stress, because distributions have to be higher than they would be under Rev.2. That can affect our coupon timing even though our rank is unchanged."],
      ["Risk profile shifts in two directions at once", "(a) Priority-stack cushion is unchanged \u2014 we still have \u00A33,135m below us. (b) Distribution-coverage cushion is worse because of the 2\u00D7 gross-up. (c) Change-of-control exposure is higher on GIP\u2019s side because an enforcement is isolated from the CTA. All three need to be visible in the dashboard."],
      ["Rating treatment", "Fitch rates the OpCo/GF group and (in Rev.2) the GAF MidCo. In this scenario GAF has no debt so the MidCo rating disappears. A separate lender would rate the GIP HoldCo NAV facility on the value and volatility of the GIP stake rather than on CTA group performance."],
      ["How the spec must handle it", "The Capital Stack engine must (i) represent debt at an entity that is outside the consolidated chain \u2014 flagged via Tab 7 within_security_perimeter=No \u2014 as a parallel claim, AND (ii) compute the grossed-up consolidated-equivalent leverage using the debtor entity\u2019s ownership share. The two leverage lenses (headline CTA-consolidated and grossed-up equivalent) must both be published."],
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
      new Paragraph({
        spacing: { before: 80, after: 120 },
        shading: { fill: "FDEDEE", type: ShadingType.CLEAR },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: CRITICAL_RED, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: CRITICAL_RED, space: 4 },
        },
        children: [
          new TextRun({ text: "Rev.2 of this scenario: ", font: "Arial", size: 20, bold: true, color: CRITICAL_RED }),
          new TextRun({ text: "v1 stated that consolidated leverage was unchanged from the senior-only case. That is only true of the legal / CTA-consolidated view. Economically the facility has to be serviced from GIP\u2019s 49.99% of distributions, so Gatwick has to distribute \u00A32 to put \u00A31 in GIP\u2019s hands. Grossed up, this \u00A3475m behaves like a \u00A3950m consolidated group facility, lifting the consolidated-equivalent leverage from 5.89\u00D7 to 7.56\u00D7. See Section 7 for the full gearing analysis.", font: "Arial", size: 20 }),
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

      // ─── 7. Grossed-up leverage ────────────────────────────────────
      h2("7. Grossed-up leverage \u2014 the gearing effect of shareholder-only debt"),
      p("The legal / CTA-consolidated view under-represents the economic leverage impact of shareholder-level debt because it ignores the fact that debt at a shareholder-specific vehicle must be serviced out of that shareholder\u2019s slice of distributions only."),
      p("Mechanism:"),
      bullet("The GIP HoldCo NAV facility pays interest out of dividends that GIP receives from its 49.99% stake."),
      bullet("For GIP to receive \u00A31 in dividends, Gatwick must distribute \u00A32 in total. Half goes to GIP (for debt service); half goes to VINCI (unrelated to this facility)."),
      bullet("So every \u00A31 of GIP NAV debt service \u201cuses up\u201d \u00A32 of OpCo distribution capacity."),
      bullet("Equivalently: \u00A3475m of debt at the 49.99% entity requires the same OpCo distribution support as \u00A3475m \u00F7 49.99% = \u00A3950m at the consolidated level."),
      p("This matters for the dividend lock-up test, the LLCR, and any scenario where the operating group has to maintain distributions to avoid tripping a covenant elsewhere in the structure."),
      h3("Four lenses on leverage"),
      grossTable,
      p(""),
      p("Interpretation: (a) and (b) are what Fitch and the market see \u2014 5.89\u00D7 on the CTA group. (c) and (d) are what credit analysts should see when the capital structure includes shareholder-level debt at a non-100%-owned entity: the grossed-up consolidated-equivalent leverage is 7.56\u00D7. That is above the 6.72\u00D7 of the actual Rev.2 GAF MidCo structure, despite the same \u00A3475m debt face value.", { run: { italics: true } }),

      h3("Counter-intuitive: GIP-only NAV has a LARGER leverage impact than the actual GAF MidCo bond"),
      p("Comparing the same \u00A3475m of debt placed at two different levels of the Gatwick structure:"),
      compTable,
      p(""),
      p("The common MidCo structure (Rev.2) shares the debt service burden pro-rata across shareholders, so there is no gross-up. The GIP-only structure (this scenario) concentrates the burden on a half-owner, so it does get grossed up. A lender who \u201cfeels better\u201d seeing debt outside the CTA ring-fence may actually be looking at a structure with MORE distribution-coverage pressure, not less.", { run: { italics: true } }),

      // ─── 8. Visual ─────────────────────────────────────────────────
      h2("8. Visual stack summary"),
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

      // ─── 9. Our position ───────────────────────────────────────────
      h2("9. Our position (unchanged in rank; altered in context)"),
      bullet("Priority rank: 1 \u2014 first claim on OpCo cashflows, pari-passu with every other Class A bondholder."),
      bullet("Senior LTV: 51.8% (unchanged from Rev.2)."),
      bullet("Headline consolidated leverage: 5.89\u00D7 (unchanged; the GIP NAV facility is outside the CTA group and does not enter the published ratio)."),
      bullet("Grossed-up consolidated-equivalent leverage: 7.56\u00D7. This is what credit analysts should treat as the \u201ceconomic\u201d leverage because it reflects the distribution support Gatwick has to provide to keep the GIP NAV facility solvent."),
      bullet("True equity cushion below us: \u00A33,135m in aggregate. The distribution between VINCI (\u00A31,568m unencumbered) and GIP (\u00A31,092m after NAV facility) differs materially from Rev.2."),
      bullet("Change-of-control exposure: elevated. An enforcement event against GIP\u2019s shares could transfer 49.99% of the equity to a different party without touching the CTA \u2014 which may nonetheless trigger change-of-control tests in the OpCo finance documents."),
      bullet("Distribution lock-up risk: worse than Rev.2 because the 2\u00D7 gross-up means Gatwick has to maintain higher distributions to keep the GIP NAV facility serviced, increasing the chance of a covenant trip in stress."),

      // ─── 10. Observations ──────────────────────────────────────────
      h2("10. Observations"),
      obsTable,
      p(""),

      // ─── 11. Implications for spec ─────────────────────────────────
      h2("11. Implications for the Capital Stack specification"),
      p("This variant surfaces five requirements that were not visible in Rev.2:"),
      bullet("Entities outside the consolidated chain must render in the stack but should not feed the CTA-consolidated leverage metrics. Use Tab 7 within_security_perimeter=No as the flag. The engine should tag any debt on a non-perimeter entity as a \u201cparallel claim\u201d rather than stacking it in the main priority waterfall."),
      bullet("The engine must compute a grossed-up consolidated-equivalent leverage whenever shareholder-level debt exists at a <100%-owned entity. Formula: gross_up_factor = 1 / ownership_pct at the debtor entity. Equivalent group debt = face_value \u00D7 gross_up_factor. Publish BOTH the headline CTA leverage and the grossed-up equivalent \u2014 they are both needed."),
      bullet("Shareholder asymmetry must be captured. The VINCI / GIP split is 50.01 / 49.99 in ownership, but their net equity positions differ materially after shareholder-level debt. The Tab 7 entity for GIP Gatwick Holdings should carry its own 49.99% ownership_pct linked to Ivy Holdco, and Tab 2 should reference that entity as the entity_level for the NAV facility."),
      bullet("Change-of-control risk becomes a first-class output. When shareholder-level debt exists on part of the ownership, the engine should compute and surface the change-of-control coverage \u2014 i.e. the LTV on the pledged shareholding (30.3% here). A spike in that coverage is a lead indicator of partial change-of-control before any operating distress."),
      bullet("The stack UI needs a \u201cparallel claim\u201d visual treatment. In Rev.2 the stack is linear. In this scenario it branches on the shareholder row \u2014 VINCI\u2019s stake runs clean while GIP\u2019s stake carries its own debt, with a visible 2\u00D7 gearing factor label."),
      p(""),
      p("Once the spec handles this scenario cleanly \u2014 including the grossed-up leverage lens \u2014 the Capital Stack feature is complete for the realistic range of infrastructure structures: single-level, multi-level consolidated (Rev.2), and shareholder-level parallel with gross-up (this variant).", { run: { italics: true } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", "gatwick-capital-stack-gip-financing-scenario.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Saved to", outPath);
});
