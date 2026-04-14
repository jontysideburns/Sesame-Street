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
      ["Gatwick Funding Limited", "Issuer SPV", "GB", "Ivy Holdco Limited"],
      ["Ivy Holdco Limited", "BidCo", "GB", "VINCI Airports / GIP (50.01 / 49.99)"],
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
// Debt table (all 11 bonds)
// ────────────────────────────────────────────────────────────────────────────
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
const bondCols = [3200, 1400, 1400, 1800, 1560];
const bondTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: bondCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Bond", bondCols[0]),
        headerCell("Drawn (\u00A3m)", bondCols[1]),
        headerCell("Coupon", bondCols[2]),
        headerCell("Maturity", bondCols[3]),
        headerCell("Class", bondCols[4]),
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
        ],
      })
    ),
    new TableRow({
      children: [
        cell("Total Class A bonds", { w: bondCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("3,364.6", { w: bondCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("", { w: bondCols[2], fill: ACCENT_LIGHT }),
        cell("all pari-passu", { w: bondCols[3], fill: ACCENT_LIGHT, bold: true }),
        cell("rank 1", { w: bondCols[4], fill: ACCENT_LIGHT, bold: true }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// OpCo stack table
// ────────────────────────────────────────────────────────────────────────────
const opcoCols = [4500, 1600, 1600, 1660];
const opcoTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: opcoCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Layer", opcoCols[0]),
        headerCell("\u00A3m", opcoCols[1]),
        headerCell("% of EV", opcoCols[2]),
        headerCell("Priority", opcoCols[3]),
      ],
    }),
    new TableRow({
      children: [
        cell("Class A senior secured (11 bonds, pari-passu)", { w: opcoCols[0] }),
        cell("3,364.6", { w: opcoCols[1], align: AlignmentType.RIGHT }),
        cell("51.8%", { w: opcoCols[2], align: AlignmentType.RIGHT }),
        cell("Rank 1", { w: opcoCols[3], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("OpCo equity value (residual)", { w: opcoCols[0], bold: true, color: GOOD_GREEN }),
        cell("3,135.4", { w: opcoCols[1], bold: true, color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("48.2%", { w: opcoCols[2], bold: true, color: GOOD_GREEN, align: AlignmentType.RIGHT }),
        cell("Rank \u221E", { w: opcoCols[3], bold: true, color: GOOD_GREEN, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Enterprise Value (assumed)", { w: opcoCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("6,500.0", { w: opcoCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("100.0%", { w: opcoCols[2], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("", { w: opcoCols[3], fill: ACCENT_LIGHT }),
      ],
    }),
  ],
});

// ────────────────────────────────────────────────────────────────────────────
// Shareholder split table
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
        cell("1,568.4", { w: shCols[2], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Global Infrastructure Partners (Blackrock)", { w: shCols[0] }),
        cell("49.99%", { w: shCols[1], align: AlignmentType.RIGHT }),
        cell("1,567.0", { w: shCols[2], align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Total equity attributable", { w: shCols[0], fill: ACCENT_LIGHT, bold: true }),
        cell("100.00%", { w: shCols[1], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
        cell("3,135.4", { w: shCols[2], fill: ACCENT_LIGHT, bold: true, align: AlignmentType.RIGHT }),
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
      ["Structural clarity", "Flat stack — all external debt sits at one level (the CTA-linked OpCo/Issuer). No HoldCo leverage. Simple from a lender perspective."],
      ["Equity cushion", "48% of EV. This is strong for regulated airport paper; typical airport LTVs run 55\u201365%."],
      ["Ownership visibility", "The 50.01/49.99 JV split only matters for events that reach up to shareholder behaviour (change of control, shareholder support undertakings, dilution tests). It does not affect our first-claim position on operating cashflows."],
      ["Gap in current DB", "The \u00A3300m RCF and any non-bond facilities are not yet captured in capital_structure_instruments. Once added they would sit as Class A pari-passu alongside the bonds."],
      ["Data we\u2019re missing for a true live stack", "Just one field \u2014 Enterprise Value on Tab 1. With that populated, every other number in this example is derived from the v8 taxonomy (Tabs 2 and 7)."],
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
        children: [new TextRun({ text: "Gatwick Airport  \u00B7  April 2026  \u00B7  For review", font: "Arial", size: 22, italics: true, color: "666666" })],
      }),

      // ─── Purpose ────────────────────────────────────────────────────
      h2("Purpose"),
      p("This note walks the capital stack for Gatwick Airport end-to-end using the v8 TopSheet taxonomy. It demonstrates how ownership percentages and entity levels flow through to an economic picture of each claimant\u2019s position. The methodology is agnostic to Gatwick \u2014 the same engine is intended to run on every deal in the portfolio."),
      p("All debt figures below are live from the database. The only input that is not yet in our data model is Enterprise Value; this is the single field proposed to be added to Tab 1 of the TopSheet."),

      // ─── 1. Real data ───────────────────────────────────────────────
      h2("1. Real Gatwick data from our system"),
      h3("Corporate structure (Tab 7 \u2014 corporate_entities)"),
      corpTable,
      p(""),
      p("The operating company (Gatwick Airport Limited) and the issuer SPV (Gatwick Funding Limited) are economically a single unit under the 2011 Common Terms Agreement \u2014 they are joint debtors, and bonds issued by Gatwick Funding are secured by the assets and cashflows of the operating company."),

      h3("Debt (Tab 2 \u2014 capital_structure_instruments)"),
      bondTable,
      p(""),
      p("All 11 bonds are Class A, pari-passu with one another, and would be assigned cashflow_priority_rank = 1 by the v8 auto-ranking engine. Weighted average coupon \u2248 3.9%; weighted average life \u2248 11.5 years."),

      // ─── 2. Valuation assumption ────────────────────────────────────
      h2("2. Valuation assumption (the missing piece)"),
      p("Gatwick does not yet have an Enterprise Value on file. For this example the working assumption is \u00A36,500m, built from two cross-checks:"),
      bullet("FY2024 EBITDA of \u00A3571m at an EV/EBITDA multiple of \u223C11.4\u00D7 (midpoint of the UK regulated airport peer range) \u2192 \u00A36.5bn."),
      bullet("VINCI paid \u00A32.9bn for 50.01% in 2019, which implied \u00A35.8bn total. Post-Covid passenger recovery to 43.2m in 2024 and the refinancing of the capital structure would lift that materially."),
      p("In a live deal this single number would be stamped on Tab 1 with a valuation method (transaction / DCF / multiples / appraisal / mark-to-model) and valuation date. Every subsequent number on this page is derived from it."),

      // ─── 3. Walked capital stack ────────────────────────────────────
      h2("3. The walked capital stack"),
      h3("Step 1 \u2014 OpCo / Issuer combined (the asset level)"),
      p("This is where the operating cashflow lives and where all external debt is secured. For Gatwick, the CTA makes OpCo and the Issuer a single economic unit."),
      opcoTable,
      p(""),
      p("Leverage metrics at this level:"),
      bullet("LTV (bonds \u00F7 EV) = 51.8%."),
      bullet("Net Debt \u00F7 EBITDA = \u00A33,364.6m \u00F7 \u00A3571m = 5.89\u00D7."),
      bullet("Equity cushion below the bonds = \u00A33,135m."),

      h3("Step 2 \u2014 Ivy Holdco (BidCo)"),
      p("Ivy Holdco owns 100% of both the OpCo and the Issuer. There is no external debt at Ivy level. Ivy Holdco is a pass-through: all \u00A33,135.4m of OpCo equity flows up without dilution and without being absorbed by debt."),

      h3("Step 3 \u2014 Shareholder level (VINCI / GIP)"),
      p("The Ivy Holdco equity splits along the 50.01 / 49.99 JV:"),
      shTable,
      p(""),

      // ─── 4. Visual ──────────────────────────────────────────────────
      h2("4. Visual stack summary"),
      p("The full stack from bottom (first claim on cashflows) to top (residual claim):"),
      codeLine("\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513"),
      codeLine("\u2503 SHAREHOLDERS  (50.01 / 49.99 JV \u2014 ownership split)              \u2503"),
      codeLine("\u2503   VINCI Airports          \u00A31,568m   50.01%                      \u2503"),
      codeLine("\u2503   GIP / Blackrock         \u00A31,567m   49.99%                      \u2503"),
      codeLine("\u2503   Equity attributable     \u00A33,135m    48% of EV                  \u2503"),
      codeLine("\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503 IVY HOLDCO  (100% owner of OpCo)         [pass-through]          \u2503"),
      codeLine("\u2503   No external debt                                                \u2503"),
      codeLine("\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B"),
      codeLine("\u2503 OPCO / ISSUER  (CTA-linked debtor group)                          \u2503"),
      codeLine("\u2503   Class A bonds (11 tranches)  \u00A33,365m   52%   Rank 1 (pari)     \u2503"),
      codeLine("\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B"),
      codeLine("                                     Enterprise Value = \u00A36,500m"),
      p(""),

      // ─── 5. Our position ────────────────────────────────────────────
      h2("5. Our position (as a \u00A3125m Class A bondholder)"),
      bullet("Priority rank: 1 \u2014 first claim on OpCo cashflows, pari-passu with every other Class A bondholder."),
      bullet("Total pari-passu debt ahead of us: \u00A33,240m (the other bonds)."),
      bullet("Equity cushion below the most senior debt the lender is exposed to: \u00A33,135m."),
      bullet("LTV to our level: 51.8%."),
      bullet("There is no HoldCo debt, no mezzanine, and no contractually subordinated instrument \u2014 the only structural layer above the bonds is sponsor equity."),

      // ─── 6. Observations ────────────────────────────────────────────
      h2("6. Observations"),
      obsTable,
      p(""),

      // ─── 7. Proposed implementation ─────────────────────────────────
      h2("7. Proposed implementation"),
      p("To produce this view automatically on every deal:"),
      bullet("Add 3 new columns to the deals table: valuation_date, valuation_method, valuation_entity. enterprise_value already exists."),
      bullet("Add a VALUATION & EQUITY section to Tab 1 of the TopSheet collecting those four inputs (EV, Date, Method, Entity)."),
      bullet("Extend server/capital_structure_engine.py with a build_capital_stack(deal, instruments, entities, ev) helper that walks the ownership chain and returns a tiered stack structure ready for rendering."),
      bullet("Add a Capital Stack block to the Deal TopSheet page rendering the visual layers, ownership splits, and attributable-equity numbers."),
      bullet("Bump the Excel template to v9."),
      p(""),
      p("Once Enterprise Value is populated for each deal, every other number on this page becomes derived, consistent across the portfolio, and comparable across deals regardless of how many corporate layers sit between the operating asset and the ultimate sponsor.", { run: { italics: true } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", "gatwick-capital-stack-worked-example.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Saved to", outPath);
});
