/**
 * Builds a genuine .docx (Office Open XML) for the lesson plan.
 *
 * The earlier exporter shipped an HTML file named ".doc". Word opens those
 * behind a "file format and extension don't match" warning and silently drops
 * most of the styling, so this writes real Word paragraphs instead: shaded
 * section banners, coloured headings and native numbering all survive a round
 * trip through Word, Google Docs and LibreOffice.
 *
 * `docx` is imported lazily by the caller so it stays out of the page bundle.
 */

import { parseBlocks } from "./lessonPlanMarkdown";
import { accentForIndex } from "./lessonPlanExportHtml";

/** Word wants bare RRGGBB, the shared palette stores CSS hex. */
const hex = (value) => String(value || "").replace("#", "").toUpperCase();

const FONT = "Segoe UI";
/** docx sizes are half-points; spacing is twentieths of a point (twips). */
const pt = (n) => n * 2;
const TWIP = (n) => Math.round(n * 20);

const INK = "1E293B";
const HEADING_INK = "0F172A";
const MUTED = "64748B";
const BORDER = "E2E8F0";
const CODE_INK = "BE123C";
const CODE_BG = "F1F5F9";

/** Maps parsed inline runs onto Word text runs. */
function toTextRuns(runs, docx, { color = INK, bold = false, size = pt(10.5) } = {}) {
  const { TextRun } = docx;
  return runs.map((run) => {
    const isCode = Boolean(run.code);
    return new TextRun({
      text: run.text,
      bold: bold || Boolean(run.bold),
      italics: Boolean(run.italic),
      color: isCode ? CODE_INK : bold || run.bold ? HEADING_INK : color,
      size,
      font: isCode ? "Consolas" : FONT,
      shading: isCode
        ? { type: docx.ShadingType.CLEAR, fill: CODE_BG, color: "auto" }
        : undefined,
    });
  });
}

/** Heading scale for markdown levels inside a section body. */
function headingStyle(level, accent) {
  if (level <= 2) return { size: pt(13), color: HEADING_INK };
  if (level === 3) return { size: pt(11.5), color: hex(accent.text) };
  return { size: pt(10.5), color: hex(accent.solid) };
}

function blockToParagraphs(block, docx, accent, numbering) {
  const { Paragraph } = docx;

  if (block.type === "heading") {
    const style = headingStyle(block.level, accent);
    return [
      new Paragraph({
        keepNext: true, // never strand a heading at the foot of a page
        spacing: { before: TWIP(10), after: TWIP(4) },
        children: toTextRuns(block.runs, docx, {
          bold: true,
          color: style.color,
          size: style.size,
        }),
      }),
    ];
  }

  if (block.type === "list") {
    return block.items.map(
      (item) =>
        new Paragraph({
          spacing: { before: TWIP(1), after: TWIP(1), line: 276 },
          ...(block.ordered
            ? { numbering: { reference: numbering.ordered, level: 0 } }
            : { bullet: { level: 0 } }),
          children: toTextRuns(item, docx),
        })
    );
  }

  return [
    new Paragraph({
      spacing: { after: TWIP(5), line: 276 },
      children: toTextRuns(block.runs, docx),
    }),
  ];
}

/** Full-width shaded banner used for the cover and each section header. */
function bannerTable(docx, { fill, children, padding = 140 }) {
  const { Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = docx;
  const none = { style: BorderStyle.NONE, size: 0, color: "auto" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill, color: "auto" },
            margins: { top: padding, bottom: padding, left: 180, right: 180 },
            children,
          }),
        ],
      }),
    ],
  });
}

function coverBlock(docx, title) {
  const { Paragraph, TextRun } = docx;
  const accent = accentForIndex(0);
  return bannerTable(docx, {
    fill: hex(accent.solid),
    padding: 200,
    children: [
      new Paragraph({
        spacing: { after: TWIP(3) },
        children: [
          new TextRun({
            text: "LESSON PLAN",
            bold: true,
            color: "E0E7FF",
            size: pt(8),
            font: FONT,
            characterSpacing: 30,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            color: "FFFFFF",
            size: pt(22),
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

/** Two-column label/value grid; a table is the only layout Word honours here. */
function metaTable(docx, meta) {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = docx;

  const entries = [
    ["Board", meta.board],
    ["Class", meta.className],
    ["Subject", meta.subject],
    ["Lesson", meta.lessonName],
    ["Topic", meta.topic],
    ["Language", meta.language],
    ["Format", meta.format],
    ["Level of detail", meta.detailLevel],
    ["Date", meta.generatedOn],
  ].filter(([, value]) => Boolean(value));

  if (!entries.length) return [];

  const edge = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  const cell = (label, value) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" },
      margins: { top: 90, bottom: 90, left: 140, right: 140 },
      children: [
        new Paragraph({
          spacing: { after: TWIP(1) },
          children: [
            new TextRun({
              text: String(label).toUpperCase(),
              bold: true,
              color: MUTED,
              size: pt(7),
              font: FONT,
              characterSpacing: 20,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: String(value), bold: true, color: HEADING_INK, size: pt(9.5), font: FONT }),
          ],
        }),
      ],
    });

  // Pairs per row keeps every value readable instead of squeezing six columns.
  const rows = [];
  for (let i = 0; i < entries.length; i += 2) {
    const pair = entries.slice(i, i + 2);
    const cells = pair.map(([l, v]) => cell(l, v));
    if (cells.length === 1) cells.push(cell("", ""));
    rows.push(new TableRow({ cantSplit: true, children: cells }));
  }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: edge, bottom: edge, left: edge, right: edge, insideHorizontal: edge, insideVertical: edge },
      rows,
    }),
  ];
}

function sectionHeader(docx, title, accent) {
  const { Paragraph, TextRun } = docx;
  return bannerTable(docx, {
    fill: hex(accent.solid),
    children: [
      new Paragraph({
        keepNext: true,
        children: [
          new TextRun({ text: title, bold: true, color: "FFFFFF", size: pt(12.5), font: FONT }),
        ],
      }),
    ],
  });
}

function spacer(docx, after = 6) {
  return new docx.Paragraph({ spacing: { after: TWIP(after) }, children: [] });
}

/**
 * @param {object}  options
 * @param {string}  options.title
 * @param {object}  options.meta      Board/class/subject/topic/format/detail.
 * @param {Array<{index:number,title:string,body:string}>} options.sections
 * @param {object}  options.docx      The loaded `docx` module.
 * @returns {Promise<Blob>} The .docx file.
 */
export async function buildLessonPlanDocxBlob({ title = "Lesson Plan", meta = {}, sections = [], docx }) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat } = docx;

  const numbering = { ordered: "lp-ordered" };
  const children = [coverBlock(docx, title), spacer(docx, 8), ...metaTable(docx, meta)];

  sections.forEach((section) => {
    const accent = accentForIndex(section.index);
    children.push(spacer(docx, 8));
    if (section.title) children.push(sectionHeader(docx, section.title, accent));
    children.push(spacer(docx, 4));
    parseBlocks(section.body).forEach((block) => {
      children.push(...blockToParagraphs(block, docx, accent, numbering));
    });
  });

  children.push(
    spacer(docx, 10),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: BORDER, space: 8 } },
      children: [
        new TextRun({ text: "Generated with LessonPilot", color: "94A3B8", size: pt(8), font: FONT }),
      ],
    })
  );

  const doc = new Document({
    creator: "LessonPilot",
    title,
    description: "AI generated lesson plan",
    numbering: {
      config: [
        {
          reference: numbering.ordered,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: TWIP(18), hanging: TWIP(12) } },
                run: { color: hex(accentForIndex(0).solid), bold: true },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: FONT, size: pt(10.5), color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: TWIP(48), bottom: TWIP(48), left: TWIP(48), right: TWIP(48) } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
