/**
 * Builds a standalone, richly styled HTML document from the rendered lesson
 * plan, which html2pdf rasterises into the .pdf export.
 *
 * Word gets a real .docx from `lessonPlanDocx.js` instead -- an HTML file named
 * ".doc" opens behind a format warning and loses most of this styling.
 *
 * The accent palette lives here because both exporters and the on-screen cards
 * colour their sections from it.
 */

export const SECTION_ACCENTS = [
  { key: "indigo", solid: "#4f46e5", soft: "#eef2ff", text: "#312e81" },
  { key: "sky", solid: "#0284c7", soft: "#e0f2fe", text: "#075985" },
  { key: "emerald", solid: "#059669", soft: "#ecfdf5", text: "#065f46" },
  { key: "amber", solid: "#d97706", soft: "#fffbeb", text: "#92400e" },
  { key: "rose", solid: "#e11d48", soft: "#fff1f2", text: "#9f1239" },
  { key: "violet", solid: "#7c3aed", soft: "#f5f3ff", text: "#5b21b6" },
];

export function accentForIndex(index) {
  return SECTION_ACCENTS[index % SECTION_ACCENTS.length];
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Absolutize image srcs and drop attributes that break offline documents. */
function normalizeFragment(html) {
  if (typeof window === "undefined") return html;
  const holder = document.createElement("div");
  holder.innerHTML = html;

  holder.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) {
      try {
        img.src = new URL(src, window.location.href).href;
      } catch {
        /* leave the original src if it will not resolve */
      }
    }
    img.removeAttribute("loading");
    img.removeAttribute("decoding");
    img.removeAttribute("class");
  });

  // Interactive-only chrome has no meaning in an exported document.
  holder
    .querySelectorAll("[data-lp-omit-from-export], button, .lp-no-print")
    .forEach((node) => node.remove());

  return holder.innerHTML;
}

/**
 * Reads the sections the result page marks up with data attributes.
 * Falls back to the whole markdown body when no sections are present.
 */
export function collectSections(root) {
  if (!root) return [];
  const nodes = Array.from(root.querySelectorAll("[data-lp-section]"));

  if (nodes.length) {
    return nodes.map((node, index) => ({
      title: node.getAttribute("data-lp-title") || "",
      accent: accentForIndex(Number(node.getAttribute("data-lp-index")) || index),
      html: normalizeFragment(node.querySelector(".mark-down")?.innerHTML || ""),
    }));
  }

  const markdown = Array.from(root.querySelectorAll(".mark-down"))
    .map((n) => n.innerHTML)
    .join("");

  // Last resort: export whatever the container holds rather than a blank file.
  const body = markdown || root.innerHTML || "";
  return body ? [{ title: "", accent: accentForIndex(0), html: normalizeFragment(body) }] : [];
}

function metaRows(meta = {}) {
  const entries = [
    ["Board", meta.board],
    ["Class", meta.className],
    ["Subject", meta.subject],
    ["Topic", meta.topic],
    ["Format", meta.format],
    ["Level of detail", meta.detailLevel],
  ].filter(([, value]) => Boolean(value));

  if (!entries.length) return "";

  const cells = entries
    .map(
      ([label, value]) => `
        <td class="meta-cell">
          <span class="meta-label">${escapeHtml(label)}</span><br />
          <span class="meta-value">${escapeHtml(value)}</span>
        </td>`
    )
    .join("");

  // A table (not flexbox) keeps the meta strip intact inside Word.
  return `<table class="meta-table" cellspacing="0" cellpadding="0"><tr>${cells}</tr></table>`;
}

function stylesheet() {
  return `
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
    }
    .doc { max-width: 100%; }

    /* ---- cover ---- */
    .cover {
      background: linear-gradient(135deg,#4f46e5 0%,#0ea5e9 100%);
      color: #ffffff;
      padding: 22px 24px;
      border-radius: 14px;
      margin-bottom: 18px;
    }
    .cover-eyebrow {
      font-size: 8.5pt;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: #e0e7ff;
      margin: 0 0 6px;
      font-weight: 700;
    }
    .cover-title {
      margin: 0;
      font-size: 22pt;
      line-height: 1.2;
      font-weight: 700;
      color: #ffffff;
    }

    /* ---- meta strip ---- */
    .meta-table { width: 100%; margin: 0 0 20px; border-collapse: collapse; }
    .meta-cell {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 7px 10px;
      vertical-align: top;
    }
    .meta-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #64748b;
      font-weight: 700;
    }
    .meta-value { font-size: 10pt; color: #0f172a; font-weight: 600; }

    /* ---- sections ----
       A long section must be allowed to flow across sheets. Forcing
       "page-break-inside: avoid" here pushes the whole block to the next page
       and leaves a large blank gap behind it; only the header is pinned to the
       content that follows it. */
    .section {
      margin: 0 0 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      page-break-inside: auto;
    }
    .section-head {
      padding: 9px 14px;
      font-size: 12.5pt;
      font-weight: 700;
      color: #ffffff;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .section-body { padding: 14px 16px; }

    /* ---- markdown body ----
       Weight and colour are set explicitly on every heading: preflight sets
       "font-weight: inherit" on h1-h6, so headings otherwise render at body
       weight. */
    h1, h2 { font-size: 15pt; font-weight: 700; color: #0f172a; margin: 14px 0 8px; page-break-after: avoid; }
    h3 { font-size: 12.5pt; font-weight: 700; color: #312e81; margin: 14px 0 6px; page-break-after: avoid; }
    h4 { font-size: 11pt; font-weight: 700; color: #4338ca; margin: 12px 0 5px; page-break-after: avoid; }
    p { margin: 0 0 8px; }
    strong { color: #0f172a; font-weight: 700; }
    a { color: #4f46e5; }

    /* Lists must be declared explicitly rather than left to browser defaults:
       this renders inside the app's own document, where Tailwind's preflight
       resets list-style to none and the markers silently vanish.

       html2canvas also draws native ::marker glyphs above the text baseline,
       so the markers are drawn here as positioned ::before content instead. */
    ul, ol { margin: 0 0 10px; padding-left: 20px; }
    li { margin: 4px 0; page-break-inside: avoid; }
    ul { list-style: none; }
    ol { list-style: none; counter-reset: lp-item; }
    li { position: relative; padding-left: 16px; }
    ol > li { counter-increment: lp-item; padding-left: 22px; }
    ul > li::before {
      content: "\\2022";
      position: absolute; left: 0; top: 0;
      color: #4f46e5; font-weight: 700;
    }
    ol > li::before {
      content: counter(lp-item) ".";
      position: absolute; left: 0; top: 0;
      color: #4f46e5; font-weight: 700;
    }
    hr { border: 0; border-top: 1px solid #e2e8f0; margin: 14px 0; }

    blockquote {
      margin: 10px 0;
      padding: 9px 12px;
      background: #eef2ff;
      border-left: 4px solid #a5b4fc;
      color: #3730a3;
    }

    code {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 1px 4px;
      color: #be123c;
      font-family: Consolas, "Courier New", monospace;
      font-size: 9.5pt;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 12px;
      overflow-x: auto;
      border-radius: 10px;
    }
    pre code { background: transparent; border: 0; color: #e2e8f0; }

    table { border-collapse: collapse; width: 100%; margin: 10px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 9px; font-size: 10pt; text-align: left; vertical-align: top; }
    thead th { background: #eef2ff; color: #312e81; font-weight: 700; }
    tbody tr:nth-child(even) td { background: #f8fafc; }

    img { max-width: 100%; height: auto; }

    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 8.5pt;
      text-align: center;
    }
  `;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.root   Rendered lesson plan container.
 * @param {string}      options.title  Document title.
 * @param {object}      options.meta   Board/class/subject/topic/format/detail.
 * @returns {string} A complete HTML document for html2pdf to rasterise.
 */
export function buildLessonPlanExportHtml({ root, title = "Lesson Plan", meta = {} }) {
  const sections = collectSections(root);

  const body = sections
    .map(({ title: sectionTitle, accent, html }) => {
      const head = sectionTitle
        ? `<div class="section-head" style="background:${accent.solid};">${escapeHtml(sectionTitle)}</div>`
        : "";
      return `<div class="section" style="border-color:${accent.soft};">
        ${head}
        <div class="section-body">${html}</div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${stylesheet()}</style>
</head>
<body>
<div class="doc">
  <div class="cover">
    <p class="cover-eyebrow">Lesson Plan</p>
    <h1 class="cover-title">${escapeHtml(title)}</h1>
  </div>
  ${metaRows(meta)}
  ${body}
  <div class="footer">Generated with LessonPilot</div>
</div>
</body>
</html>`;
}
