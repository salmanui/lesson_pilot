/**
 * Turns the raw markdown returned by the lesson-plan generator into structured
 * sections the result page and the exporters can both consume.
 */

/** Removes chatty prefaces and the metadata rows the page header already shows. */
export function stripChattyPreface(md = "") {
  if (!md) return "";

  const idx = md.search(/^\s{0,3}#{2,3}\s+/m);
  if (idx > 0) md = md.slice(idx);

  md = md
    .replace(/^(okay|sure|alright)[^.\n]*\.\s*$/gim, "")
    .replace(/^\s*here(?:'s| is)\s+a?\s*lesson plan.*$/gim, "")
    .replace(/^\s*formatted\s+as\s+requested.*$/gim, "")
    .replace(/^\s*\*{1,2}\s*lesson plan:[^\n]*\*{0,2}\s*$/gim, "")
    .replace(/^\s*note:\s.*$/gim, "")
    .replace(/^\s*standards:\s.*$/gim, "");

  const META_KEYS =
    "(Subject|Grade\\s*Level|Class\\/Grade|School|Time\\s*Allotment|Word\\s*Count|Tone|Duration|Alignment|Board)";
  md = md.replace(
    new RegExp(
      String.raw`^\s*(?:[-*]\s*)?(?:\*\*)?\s*${META_KEYS}\s*:?(?:\*\*)?\s*.*$`,
      "gmi"
    ),
    ""
  );

  md = md.replace(/\[Space\s*K-?12\s*School\]/gi, "");
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * The generator writes section titles as bold lines ("**II. Materials:**",
 * "**1. ENGAGE (5 minutes)**") instead of markdown headings, which is why the
 * output renders as an undifferentiated wall of text. Promoting those lines to
 * real headings is what gives the page and the exports their structure.
 *
 * A bold *prefix* followed by prose ("**Activity:** Begin by asking...") is a
 * label rather than a heading, and is deliberately left alone.
 */
export function normalizeLessonMarkdown(md = "") {
  if (!md) return "";

  const out = [];

  for (const line of md.split("\n")) {
    if (/^\s{0,3}#{1,6}\s+/.test(line)) {
      out.push(line); // already a heading
      continue;
    }

    // "**III. 5E Lesson Plan:** trailing text" -> heading plus the trailing text.
    const numbered = line.match(
      /^\s*\*\*\s*((?:[IVXLC]+|\d+)[.)]\s*[^*]+?)\s*:?\s*\*\*\s*(.*)$/
    );
    if (numbered) {
      const label = numbered[1].trim();
      const rest = numbered[2].trim();
      // Roman numerals are the top-level outline; digits are the 5E phases.
      const level = /^[IVXLC]+[.)]/.test(label) ? "##" : "###";
      out.push(`${level} ${label.replace(/:$/, "")}`);
      if (rest) out.push("", rest);
      continue;
    }

    // A line that is bold end to end is a sub-heading.
    const wholeLineBold = line.match(/^\s*\*\*([^*]{2,80}?)\s*:?\s*\*\*\s*$/);
    if (wholeLineBold) {
      out.push(`#### ${wholeLineBold[1].trim().replace(/:$/, "")}`);
      continue;
    }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Strips markdown syntax so a heading can be used as a plain-text label. */
export function headingText(md = "") {
  const first = md.split("\n").find((l) => /^\s{0,3}#{1,6}\s+/.test(l));
  if (!first) return "";
  return first
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

/** Drops the leading heading line; the card renders it as a styled header. */
export function bodyWithoutHeading(md = "") {
  const lines = md.split("\n");
  const idx = lines.findIndex((l) => /^\s{0,3}#{1,6}\s+/.test(l));
  if (idx === -1) return md.trim();
  return [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n").trim();
}

/**
 * @returns {Array<{index:number,title:string,body:string}>} One entry per H2
 * section, in document order.
 */
export function splitIntoSections(md = "") {
  if (!md) return [];
  return md
    .split(/\n(?=##\s+)/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => ({
      index,
      // Text ahead of the first heading is the plan's preamble; it still needs
      // a title so the card renders a header and the TOC has a label.
      title: headingText(chunk) || (index === 0 ? "Overview" : ""),
      body: bodyWithoutHeading(chunk),
    }))
    .filter((section) => section.title || section.body);
}

/** Full pipeline: raw generator markdown -> clean, section-ready markdown. */
export function prepareLessonMarkdown(raw = "") {
  return normalizeLessonMarkdown(stripChattyPreface(raw));
}

/* ---------------------------------------------------------------------------
   Block / inline parsing
   The .docx writer builds real Word paragraphs rather than scraping rendered
   HTML, so it needs the markdown as structured blocks.
   --------------------------------------------------------------------------- */

/**
 * Splits a line into styled runs.
 * @returns {Array<{text:string,bold?:boolean,italic?:boolean,code?:boolean}>}
 */
export function parseInline(text = "") {
  const runs = [];
  // Bold wins over italic so "**a**" is not read as an italic "*a*" pair.
  const pattern = /(\*\*|__)(.+?)\1|(`)([^`]+?)\3|(\*|_)(.+?)\5/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      runs.push({ text: text.slice(last, match.index) });
    }
    if (match[2] !== undefined) runs.push({ text: match[2], bold: true });
    else if (match[4] !== undefined) runs.push({ text: match[4], code: true });
    else if (match[6] !== undefined) runs.push({ text: match[6], italic: true });
    last = pattern.lastIndex;
  }

  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}

const BULLET_RE = /^\s{0,6}[-*+]\s+(.*)$/;
const ORDERED_RE = /^\s{0,6}(\d+)[.)]\s+(.*)$/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*)$/;

/**
 * Parses a section body into blocks.
 * @returns {Array<{type:'heading'|'paragraph'|'list',level?:number,
 *   ordered?:boolean,runs?:Array,items?:Array}>}
 */
export function parseBlocks(md = "") {
  const blocks = [];
  const lines = md.split("\n");
  let list = null;
  let para = null;

  const closeList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  // A blank line ends the paragraph. Without this the writer folds every
  // paragraph in a section into one run-on block.
  const closePara = () => {
    para = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      closeList();
      closePara();
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      closeList();
      closePara();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        runs: parseInline(heading[2].trim()),
      });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      closePara();
      if (!list || list.ordered) {
        closeList();
        list = { type: "list", ordered: false, items: [] };
      }
      list.items.push(parseInline(bullet[1]));
      continue;
    }

    const ordered = line.match(ORDERED_RE);
    if (ordered) {
      closePara();
      if (!list || !list.ordered) {
        closeList();
        list = { type: "list", ordered: true, items: [] };
      }
      list.items.push(parseInline(ordered[2]));
      continue;
    }

    // Consecutive plain lines are one soft-wrapped paragraph; a blank line
    // between them starts a new one.
    closeList();
    if (para) {
      para.runs.push({ text: " " }, ...parseInline(line.trim()));
    } else {
      para = { type: "paragraph", runs: parseInline(line.trim()) };
      blocks.push(para);
    }
  }

  closeList();
  return blocks;
}
