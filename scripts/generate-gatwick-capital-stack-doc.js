// Generate a Word document containing the Gatwick capital stack worked example
// for client review. Outputs to docs/gatwick-capital-stack-worked-example.docx.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, PageOrientation, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak,
} = require("docx");

const ACCENT = "1F6FA5";
const ACCENT_LIGHT = "D6E4F0";
const GREY_LINE = "CCCCCC";
const STACK_GREY = "F5F5F0";
const GOOD_GREEN = "2F8B72";
const CRITICAL_RED = "D65454";
const WARNING_ORANGE = "C97F1F";

const thin = { style: BorderStyle.SINGLE, size: 4, color: GREY_LINE };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, font: "Arial", size: 22, ...(opts.run || {}) })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: ACCENT })],
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

function bullet(text, runs) {
  const children = runs
    ? runs
    : [new TextRun({ text, font: "Arial", size: 22 })];
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children,
  });
}

function mono(text, size = 18) {
  return new TextRun({ text, font: "Consolas", size });
}

function codeLine(text) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [mono(text)],
  });
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
// Page geometry — US Letter portrait
// ────────────────────────────────────────────────────────────────────────────
const CONTENT_WIDTH = 9360; // 12240 - 2*1440 margins

// ────────────────────────────────────────────────────────────────────────────
// Corporate structure table
// ────────────────────────────────────────────────────────────────────────────
const corpCols = [3000, 1800, 2000, 2560];
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
      ["Gatwick Funding Limited", "Issuer SPV (OpCo-level)", "GB", "Ivy Holdco Limited"],
      ["Ivy Holdco Limited", "BidCo", "GB", "Gatwick Airport Finance plc"],
      ["Gatwick Airport Finance plc (GAF)", "MidCo / Debt HoldCo", "GB", "VINCI Airports / GIP (50.01 / 49.99)"],
      ["VINCI Airports", "HoldCo", "FR", "VINCI SA"],
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
// OpCo / Issuer Debt — 11 Class A bonds issued by Gatwick Funding Ltd
// ────────────────────────────────────────────────────────────────────────────
// Our client holds £125m of the Class A bonds — assume pari-passu allocation
// across the 11 tranches (for presentation we show the total at the bottom).
const bondData = [
  ["Class A 6.125% 2026 Bond", "300.0", "6.125%", "Mar 2026", "A"],
  ["Class A 2.5% 2030 Bond", "300.0", "2.50%", "Apr 2030", "A"],
  ["Class A SLB 3.625% 2033 Bond", "627.2", "3.625%", "Oct 2033", "A (SLB)"],
  ["Class A 4.625% 2034 Bond", "350.0", "4.625%", "Mar 2034", "A"],
  ["Class A 5.75% 2037 Bond", "300.0", "5.75%", "Jan 2037", "A"],
  ["Class A 3.125% 2039 Bond", "350.0", "3.125%", "Sep 2039", "A"],
  ["Class A 5.5% 2040 Bond", "250.0", "5.50%", "Apr 2040", "A"],
  ["Class A 6.5% 2041 Bond", "300.0", "6.50%", "Mar 2041", "A"],
  ["Class A 2.625% 2046 Bond", "180.1", "2.625%", "Oct 2046", "A"],
  ["Class A 3.25% 2048 Bond", "203.3", "3.25%", "Feb 2048", "A"],
  ["Class A 2.875% 2049 Bond", "204.0", "2.875%", "Jul 2049", "A"],
];
const bondCols = [2800, 1200, 1100, 1500, 1100, 1660];
const bondTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: bondCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Bond", bondCols[0]),
        headerCell("Total (\u00A3m)", bondCols[1]),
        headerCell("Coupon", bondCols[2]),
        headerCell("Maturity", bondCols[3]),
        headerCell("Class", bondCols[4]),
        headerCell("Our holding (\u00A3m)", bondCols[5]),
      ],
    }),
    ...bondData.map((row) =>
      new TableRow({
        children: [
          cell(row[0], { w: bondCols[0] }),
          cell(row[1], { w: bondCols[1], align: AlignmentType.RIGHT }),
          cell(row[2], { w: bondCols[2], align: AlignmentType.RIGHT }),
          cell(row[3], { w: bondCols[3] }),
          cell(row[4], { w: bondCols[4] }),
          cell("pro-rata", { w: bondCols[5], align: AlignmentType.RIGHT }),
        ],
      })
    ),
    new TableRow({
      children: [
        cell("Total Class A bonds (OpCo)", { w: bondCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("3,364.6", { w: bondCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("", { w: bondCols[2], fill: ACCENT_LIGHT }),
        cell("all pari-passu", { w: bondCols[3], fill: ACCENT_LIGHT, bold: true }),
        cell("rank 1", { w: bondCols[4], fill: ACCENT_LIGHT, bold: true }),
        cell("125.0", { w: bondCols[5], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// MidCo Debt — Gatwick Airport Finance plc (GAF) bond
// Per Fitch rating action, 21 Nov 2025. Rated BB / Stable. Not currently in DB.
// ────────────────────────────────────────────────────────────────────────────
const midcoDebtCols = [2800, 1200, 1100, 1500, 1100, 1660];
const midcoDebtTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: midcoDebtCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Bond", midcoDebtCols[0]),
        headerCell("Total (\u00A3m)", midcoDebtCols[1]),
        headerCell("Coupon", midcoDebtCols[2]),
        headerCell("Maturity", midcoDebtCols[3]),
        headerCell("Rating", midcoDebtCols[4]),
        headerCell("Our holding (\u00A3m)", midcoDebtCols[5]),
      ],
    }),
    new TableRow({
      children: [
        cell("GAF 6% 2030 Bond (XS3221827911)", { w: midcoDebtCols[0] }),
        cell("475.0", { w: midcoDebtCols[1], align: AlignmentType.RIGHT }),
        cell("6.00%", { w: midcoDebtCols[2], align: AlignmentType.RIGHT }),
        cell("Nov 2030", { w: midcoDebtCols[3] }),
        cell("BB / Stable", { w: midcoDebtCols[4] }),
        cell("0.0", { w: midcoDebtCols[5], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Total MidCo debt", { w: midcoDebtCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("475.0", { w: midcoDebtCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("", { w: midcoDebtCols[2], fill: ACCENT_LIGHT }),
        cell("structurally subordinated", { w: midcoDebtCols[3], fill: ACCENT_LIGHT, bold: true }),
        cell("rank 2", { w: midcoDebtCols[4], fill: ACCENT_LIGHT, bold: true }),
        cell("0.0", { w: midcoDebtCols[5], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Full capital stack — multi-level, two columns (Total / Our Holding)
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
    // Top-of-stack: residual equity attributable to shareholders
    new TableRow({
      children: [
        cell("Residual equity (VINCI 50.01% / GIP 49.99%)", { w: stackCols[0], color: GOOD_GREEN }),
        cell("2,660.4", { w: stackCols[1], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("0.0", { w: stackCols[2], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("40.9%", { w: stackCols[3], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("Rank \u221E", { w: stackCols[4], color: GOOD_GREEN, align: AlignmentType.RIGHT }),
      ],
    }),
    // MidCo debt
    new TableRow({
      children: [
        cell("MidCo (GAF) 6% 2030 bond  \u2014  structurally subordinated", { w: stackCols[0], color: WARNING_ORANGE }),
        cell("475.0", { w: stackCols[1], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("0.0", { w: stackCols[2], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("7.3%", { w: stackCols[3], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
        cell("Rank 2", { w: stackCols[4], color: WARNING_ORANGE, align: AlignmentType.RIGHT }),
      ],
    }),
    // OpCo debt (our position)
    new TableRow({
      children: [
        cell("Class A senior secured (11 bonds, pari-passu)", { w: stackCols[0], bold: true, color: ACCENT }),
        cell("3,364.6", { w: stackCols[1], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("125.0", { w: stackCols[2], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("51.8%", { w: stackCols[3], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
        cell("Rank 1  (our position)", { w: stackCols[4], bold: true, color: ACCENT, align: AlignmentType.RIGHT }),
      ],
    }),
    // EV total
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
// Derived leverage metrics — both the deal's and our attributable view
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
        headerCell("Deal (total)", metricsCols[1]),
        headerCell("Our exposure view", metricsCols[2]),
      ],
    }),
    ...[
      ["Senior LTV (Class A / EV)", "51.8%", "51.8% (we\u2019re senior)"],
      ["Total LTV (Class A + GAF / EV)", "59.1%", "n/a \u2014 we hold only senior"],
      ["Senior leverage (Class A / EBITDA)", "5.89\u00D7", "5.89\u00D7"],
      ["Consolidated leverage inc. GAF", "6.72\u00D7", "n/a"],
      ["Debt senior to us", "\u00A30 (we\u2019re at rank 1)", "\u00A30"],
      ["Subordinated cushion below us", "\u2014", "\u00A3475m (MidCo debt acts as a first-loss layer above equity)"],
      ["Equity cushion below us", "\u2014", "\u00A32,660m (true equity after MidCo debt)"],
      ["Total cushion below our position", "\u2014", "\u00A33,135m (48.2% of EV)"],
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
// Shareholder split — on MidCo equity (after GAF bond)
// ────────────────────────────────────────────────────────────────────────────
const shCols = [4200, 2000, 3160];
const shTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: shCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Shareholder", shCols[0]),
        headerCell("Ownership", shCols[1]),
        headerCell("Attributable equity (\u00A3m)", shCols[2]),
      ],
    }),
    new TableRow({
      children: [
        cell("VINCI Airports (VINCI SA)", { w: shCols[0] }),
        cell("50.01%", { w: shCols[1], align: AlignmentType.RIGHT }),
        cell("1,330.5", { w: shCols[2], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Global Infrastructure Partners (Blackrock)", { w: shCols[0] }),
        cell("49.99%", { w: shCols[1], align: AlignmentType.RIGHT }),
        cell("1,329.9", { w: shCols[2], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Total residual equity (after GAF debt)", { w: shCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("100.00%", { w: shCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("2,660.4", { w: shCols[2], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
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
      ["Multi-level structure", "Two external debt levels: OpCo/Issuer (CTA, Class A, \u00A33,365m) and MidCo/GAF (BB, \u00A3475m). The MidCo debt was introduced in Nov 2025 to refinance the Apr 2026 bond. Fitch rates GAF two notches below the consolidated group profile due to structural subordination."],
      ["Senior position is strong", "Senior LTV 51.8%, 48.2% total cushion, of which \u00A3475m is first-loss MidCo debt that sits between us and the equity. Typical airport senior debt runs 55\u201365% LTV \u2014 Gatwick is tighter."],
      ["MidCo discipline", "GAF debt service depends on dividends upstreamed from the ring-fenced group. Fitch notes shareholders have committed to holding 6 months of debt service as cash. For OpCo bondholders this is credit-positive: any distress will trigger a GF lock-up before the senior coupon is at risk."],
      ["Ownership visibility matters structurally", "The 50.01/49.99 JV split is economically close to a deadlock \u2014 change-of-control and shareholder-support undertakings matter more here than in a sponsor-controlled deal. Proportional consolidation is not needed because ultimate equity control is combined, but the split must still be visible."],
      ["Data currently missing from our DB", "(a) Enterprise Value on Tab 1 (1 cell). (b) The GAF \u00A3475m bond as a Tab 2 row with entity_level=\u2018midco\u2019 and cashflow_priority_rank=2. (c) The \u00A3300m RCF and any other non-bond OpCo facilities."],
      ["Why the two-column display matters", "The stack has to speak two audiences at once: the structural picture (total market position \u2014 how the deal is put together) and our client\u2019s slice (what piece of which layer they hold). Same data, two lenses, one table."],
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
  title: "Gatwick Capital Stack \u2014 Worked Example",
  description: "Multi-level capital stack walked through using the v8 taxonomy.",
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
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter portrait
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      // ─── Title ──────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [new TextRun({ text: "SESAME STREET", font: "Arial", size: 18, color: "888888", bold: true, characterSpacing: 40 })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "Capital Stack \u2014 Worked Example", font: "Arial", size: 40, bold: true, color: ACCENT })],
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: "Gatwick Airport  \u00B7  Rev. 2 \u2014 April 2026  \u00B7  For review", font: "Arial", size: 22, italics: true, color: "666666" })],
      }),

      // ─── Purpose ────────────────────────────────────────────────────
      h2("Purpose"),
      p("This note walks the capital stack for Gatwick end-to-end using the v8 TopSheet taxonomy, now including the MidCo debt layer at Gatwick Airport Finance plc (GAF). It demonstrates how the stack should present two views side-by-side: the total deal position (structural picture), and our client\u2019s holding (their specific slice)."),
      p("Every debt figure below is either live from our database or sourced from the Fitch rating action dated 21 November 2025 for the MidCo bond. The remaining input needed to produce this view programmatically is a single Enterprise Value on Tab 1 of the TopSheet."),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        shading: { fill: "FFF7E0", type: ShadingType.CLEAR },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: WARNING_ORANGE, space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 6, color: WARNING_ORANGE, space: 4 } },
        children: [
          new TextRun({ text: "Correction to Rev. 1: ", font: "Arial", size: 20, bold: true, color: WARNING_ORANGE }),
          new TextRun({ text: "the previous version treated Gatwick as a single-level debt structure. Fitch\u2019s 21 Nov 2025 rating action on the new \u00A3475m GAF 6% 2030 bond confirms a distinct MidCo debt level at Gatwick Airport Finance plc, two notches below the GF ring-fenced group. This revision adds that layer.", font: "Arial", size: 20 }),
        ],
      }),
      p(""),

      // ─── 1. Real data ───────────────────────────────────────────────
      h2("1. The Gatwick structure"),
      h3("Corporate structure"),
      corpTable,
      p(""),
      p("Gatwick Airport Finance plc (GAF) is the MidCo that sits between the shareholders and the Ivy Holdco / OpCo sub-group. GAF issues its own debt, secured on its only asset (the equity in the OpCo group)."),
      p("The operating company (Gatwick Airport Limited) and the issuer SPV (Gatwick Funding Limited) are economically a single unit under the 2011 Common Terms Agreement \u2014 they are joint debtors, and bonds issued by Gatwick Funding are secured by the assets and cashflows of the operating company. Together they form the \u201cring-fenced group.\u201d GAF debt is structurally subordinated to this ring-fence."),

      h3("OpCo debt \u2014 Class A bonds (Gatwick Funding Ltd)"),
      p("Our client holds \u00A3125m of the Class A bonds. All tranches are pari-passu."),
      bondTable,
      p(""),

      h3("MidCo debt \u2014 Gatwick Airport Finance plc (GAF)"),
      p("Our client holds nothing at MidCo. Fitch rating action of 21 November 2025 confirms the new \u00A3475m bond:"),
      midcoDebtTable,
      p(""),
      p("Fitch notes: \u201cThe \u2018BB\u2019 rating on GAF\u2019s notes reflects the structural subordination of its debt to the ring-fenced Gatwick Funding Limited (GF) group\u2026 GAF\u2019s debt rating is notched down twice from the group\u2019s consolidated profile.\u201d Shareholders have publicly committed to maintaining six months of debt service as cash at GAF to mitigate the absence of a dedicated liquidity line.", { run: { italics: true, color: "666666" } }),

      // ─── 2. Valuation assumption ────────────────────────────────────
      h2("2. Valuation assumption (the missing input)"),
      p("Gatwick does not yet have an Enterprise Value on file. For this example the working assumption is \u00A36,500m, triangulated from:"),
      bullet("FY2024 EBITDA of \u00A3571m at an EV/EBITDA multiple of \u223C11.4\u00D7 (midpoint of the UK regulated airport peer range) \u2192 \u00A36.5bn."),
      bullet("VINCI paid \u00A32.9bn for 50.01% in 2019, implying \u00A35.8bn total. Post-Covid passenger recovery to 43.2m in 2024 and the recent refinancing justify a step up."),
      bullet("Sense-check against Fitch: consolidated Net Debt/EBITDA peaks at 7.2\u00D7 in 2027 under their rating case. With \u00A33,839.6m of debt today that implies 2027 EBITDA \u2248 \u00A3533m, and on an 11-12\u00D7 multiple an EV in the \u00A35.9\u20136.4bn range."),
      p("In a live deal this single number goes on Tab 1 with a valuation method (transaction / DCF / multiples / appraisal / mark-to-model) and valuation date. Every other number on this page is derived from it."),

      // ─── 3. Walked capital stack ────────────────────────────────────
      h2("3. The walked capital stack"),
      p("The stack is walked bottom-up \u2014 starting at the asset and ending at the ultimate shareholders. Each layer absorbs debt at its own level; the residual flows up through the ownership chain."),

      h3("Step 1 \u2014 OpCo / Issuer (CTA ring-fenced group)"),
      p("This is where the operating cashflow lives and where our \u00A3125m exposure sits. All Class A debt is pari-passu, rank 1."),
      bullet("Class A bonds (total): \u00A33,364.6m"),
      bullet("OpCo residual equity value: \u00A36,500m \u2212 \u00A33,364.6m = \u00A33,135.4m"),
      bullet("This residual flows up through Ivy Holdco (100% owner, no debt) to the MidCo."),

      h3("Step 2 \u2014 MidCo (GAF)"),
      p("The MidCo receives \u00A33,135.4m of OpCo equity value and absorbs its own \u00A3475m bond. The MidCo bond is senior to equity but structurally subordinated to all OpCo debt (rank 2 in the v8 priority framework)."),
      bullet("OpCo equity flowing in: \u00A33,135.4m"),
      bullet("Less MidCo external debt: \u00A3475m"),
      bullet("MidCo residual equity: \u00A32,660.4m"),

      h3("Step 3 \u2014 Shareholders (VINCI / GIP)"),
      p("The MidCo residual splits along the 50.01 / 49.99 JV:"),
      shTable,
      p(""),

      // ─── 4. Full stack table (two columns) ─────────────────────────
      h2("4. Full stack \u2014 two columns (total and our holding)"),
      p("The proposed Capital Stack display: every layer on one row, with the total market position and our client\u2019s slice side-by-side. Zeros in the right column make our position visually obvious."),
      stackTable,
      p(""),

      // ─── 5. Leverage metrics ──────────────────────────────────────
      h2("5. Derived metrics \u2014 deal view vs our view"),
      p("The two-column structure carries through to the ratios. Deal-level metrics describe how the deal is put together; our-view metrics describe where our claim sits within it."),
      metricsTable,
      p(""),
      p("Interpretation: our \u00A3125m is at rank 1 with a 48.2% total cushion below us. Of that cushion, \u00A3475m of MidCo debt acts as a first-loss layer \u2014 in any distress scenario the MidCo coupon cannot be paid until the GF group releases distributions, so the sponsors and MidCo creditors bear stress before our senior coupon is threatened.", { run: { italics: true } }),

      // ─── 6. Visual ──────────────────────────────────────────────────
      h2("6. Visual stack summary"),
      p("The full stack from bottom (first claim on cashflows) to top (residual claim):"),
      codeLine("\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513"),
      codeLine("\u2503 SHAREHOLDERS  (50.01 / 49.99 JV)                                  \u2503"),
      codeLine("\u2503   VINCI Airports               \u00A31,330m   50.01%  (our \u00A30)       \u2503"),
      codeLine("\u2503   GIP / Blackrock              \u00A31,330m   49.99%  (our \u00A30)       \u2503"),
      codeLine("\u2503   Residual equity              \u00A32,660m    41% of EV             \u2503"),
      codeLine("\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503 GATWICK AIRPORT FINANCE PLC (MidCo)                              \u2503"),
      codeLine("\u2503   GAF 6% 2030 bond              \u00A3475m    7%   Rank 2  (our \u00A30)   \u2503"),
      codeLine("\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503 IVY HOLDCO  (BidCo \u2014 pass-through, no debt)                      \u2503"),
      codeLine("\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503 OPCO / ISSUER  (CTA-linked ring-fenced group)                    \u2503"),
      codeLine("\u2503   Class A bonds (11 tranches) \u00A33,365m   52%   Rank 1 (our \u00A3125m) \u2503"),
      codeLine("\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B"),
      codeLine("                                     Enterprise Value = \u00A36,500m"),
      p(""),

      // ─── 7. Observations ────────────────────────────────────────────
      h2("7. Observations"),
      obsTable,
      p(""),

      // ─── 8. Spec implications ──────────────────────────────────────
      h2("8. Implications for the Capital Stack specification"),
      p("The Gatwick walk-through clarifies four things about the final spec:"),
      bullet("Two-column structure is the default. Every row in the stack has a Total column (the whole market tranche) and an Our Holding column (our client\u2019s slice, zero for layers we don\u2019t hold). This is not an optional view \u2014 it is the primary display."),
      bullet("Multi-level debt is the norm, not the exception. Gatwick has two external debt levels; M6 Toll and Getlink will likely have the same pattern. The engine must handle this end-to-end without special casing."),
      bullet("Subordinated debt is part of the cushion, not part of the debt. From the senior bondholder\u2019s perspective the \u00A3475m GAF debt is economically equivalent to equity (it can only be paid if the senior is whole). The ratios panel should show \u201cSubordinated cushion\u201d and \u201cTrue equity cushion\u201d as distinct lines."),
      bullet("Ownership splits need to be visible even when they don\u2019t affect priority. The 50.01/49.99 JV does not change our senior position, but it changes who we\u2019d negotiate with in a restructuring and who can block a change-of-control consent."),

      // ─── 9. Proposed implementation ─────────────────────────────────
      h2("9. Proposed implementation"),
      p("To produce this view automatically on every deal:"),
      bullet("Add 3 new columns to the deals table: valuation_date, valuation_method, valuation_entity. enterprise_value already exists."),
      bullet("Add a VALUATION & EQUITY section to Tab 1 of the TopSheet collecting those four inputs (EV, Date, Method, Entity)."),
      bullet("Ensure the Tab 2 row for MidCo debt is populated with entity_level=\u2018midco\u2019, entity_name pointing to the MidCo entity in Tab 7, and either a manually set cashflow_priority_rank=2 or a blank (the v8 engine will auto-assign it)."),
      bullet("Extend server/capital_structure_engine.py with a build_capital_stack(deal, instruments, entities, ev, our_holdings) helper. our_holdings is a dict keyed by instrument id \u2192 amount we hold. The helper returns a tiered stack structure with both total and our-holding figures per layer."),
      bullet("Add a Capital Stack block to the Deal TopSheet page rendering the two-column table + visual layers + derived metrics (deal view / our view)."),
      bullet("Bump the Excel template to v9."),
      p(""),
      p("Once Enterprise Value is populated and the GAF bond is added as a Tab 2 row, every other number on this page becomes derived, consistent across the portfolio, and comparable across deals regardless of how many corporate layers sit between the operating asset and the ultimate sponsor.", { run: { italics: true } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", "gatwick-capital-stack-worked-example.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Saved to", outPath);
});
