"use client";

import React, { useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { LuFileText, LuFileDown, LuLoaderCircle } from "react-icons/lu";
import { saveAs } from "file-saver";
import { buildLessonPlanExportHtml } from "@/src/utils/ai/lessonPlanExportHtml";
import { buildLessonPlanDocxBlob } from "@/src/utils/ai/lessonPlanDocx";

/** A4 width at 96dpi minus the page margins, so the capture matches the sheet. */
const PDF_RENDER_WIDTH = 760;

/**
 * Flattens the export document into a `<style>` + markup fragment.
 *
 * html2pdf is handed this as a string rather than a detached node: it then
 * builds and positions its own capture container. Mounting our own offscreen
 * node instead renders a blank page, because html2canvas captures a viewport
 * of `windowWidth` from the origin and never sees a node parked off-screen.
 */
function toRenderableFragment(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const css = Array.from(parsed.querySelectorAll("style"))
    .map((node) => node.textContent)
    .join("\n");
  return `<style>${css}</style><div style="width:${PDF_RENDER_WIDTH}px;background:#ffffff;">${parsed.body.innerHTML}</div>`;
}

async function exportPDF({ root, title, meta, filename }) {
  const html = buildLessonPlanExportHtml({ root, title, meta });
  const { default: html2pdf } = await import("html2pdf.js");

  return html2pdf()
    .set({
      margin: [12, 12, 14, 12],
      filename: `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
        useCORS: true,
        backgroundColor: "#ffffff",
        letterRendering: true,
        logging: false,
      },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      // "avoid-all" would pin every element, bumping any section too tall for
      // the remaining space onto a fresh sheet and leaving a blank gap. Only
      // rows and list items are worth keeping whole.
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "li"] },
    })
    .from(toRenderableFragment(html), "string")
    .save();
}

async function exportDOCX({ title, meta, sections, filename }) {
  // Loaded on demand: the writer is only needed once someone exports.
  const docx = await import("docx");
  const blob = await buildLessonPlanDocxBlob({ title, meta, sections, docx });
  saveAs(blob, `${filename}.docx`);
}

const ExportMenu = ({
  targetRef,
  filename = "lesson-plan",
  title,
  meta,
  sections,
  canDownload = true,
  onRequirePremium,
  onRequestAccess,
  onError,
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const requireDownloadAccess = () => {
    if (typeof onRequestAccess === "function") {
      const isAllowed = onRequestAccess();
      if (!isAllowed) setOpen(false);
      return isAllowed;
    }
    if (canDownload) return true;
    onRequirePremium?.();
    setOpen(false);
    return false;
  };

  const safeName = (filename || "lesson-plan")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 80)
    .trim();

  const run = async (kind) => {
    if (busy) return;
    if (!requireDownloadAccess()) return;

    // The PDF is captured from the rendered card; the .docx is written from the
    // parsed markdown and needs no DOM.
    const root = targetRef?.current;
    if (kind === "pdf" && !root) return;
    if (kind === "docx" && !sections?.length) return;

    const payload = {
      root,
      title: title || safeName,
      meta: meta || {},
      sections: sections || [],
      filename: safeName,
    };

    setBusy(kind);
    try {
      if (kind === "pdf") await exportPDF(payload);
      else await exportDOCX(payload);
      setOpen(false);
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={Boolean(busy)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 sm:w-auto sm:py-1.5 md:text-sm"
        title="Export"
      >
        {busy ? (
          <LuLoaderCircle size={15} className="animate-spin" />
        ) : (
          <LuFileDown size={15} />
        )}
        {busy ? "Preparing…" : "Export"}
        <IoChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <button
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-indigo-50 disabled:opacity-60"
            onClick={() => run("docx")}
            disabled={Boolean(busy)}
          >
            <LuFileText size={16} className="text-sky-600" />
            <span>
              Microsoft Word
              <span className="block text-xs text-slate-400">.docx</span>
            </span>
          </button>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-indigo-50 disabled:opacity-60"
            onClick={() => run("pdf")}
            disabled={Boolean(busy)}
          >
            <LuFileDown size={16} className="text-rose-600" />
            <span>
              PDF Document
              <span className="block text-xs text-slate-400">.pdf</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
