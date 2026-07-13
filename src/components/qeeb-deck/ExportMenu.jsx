import React, { useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";

/* ---- PDF helpers ---- */
function cloneForPdf(el) {
  const clone = el.cloneNode(true);

  // kill animations + fades
  clone.querySelectorAll("*").forEach(n => {
    n.style.animation = "none";
    n.style.transition = "none";
    n.style.opacity = "1";
    n.style.color = "#111111";
    n.style.textShadow = "none";
  });

  // remove the outer card border/shadow ONLY
  const root = clone.querySelector("[data-export-root]");
  if (root) {
    root.style.border = "none";
    root.style.boxShadow = "none";
    root.style.borderRadius = "0";
    root.style.padding = "24px"; // keep spacing after removing card styles
    root.style.background = "#ffffff";
  }

  // images
  clone.querySelectorAll("img").forEach(img => {
    try { if (img.getAttribute("src")) { img.src = new URL(img.getAttribute("src"), window.location.href).href; } } catch {}
    img.removeAttribute("loading"); img.removeAttribute("decoding");
    img.style.maxWidth = "100%"; img.style.height = "auto";
  });

  // print css (keeps table borders)
  const style = document.createElement("style");
  style.textContent = `
    *{font-family: Arial, Helvetica, sans-serif !important;}
    body{background:#fff !important;color:#111 !important;}
    /* nuke any residual shadows globally */
    [class*="shadow"]{box-shadow:none !important;}
    h1,h2,h3{margin:0 0 8px 0;} p{margin:0 0 8px 0;}
    ul,ol{margin:0 0 8px 20px;}
    table{border-collapse:collapse;width:100%;margin:8px 0;}
    th,td{border:1px solid #d1d5db;padding:6px 8px;font-size:12pt;}
    thead th{background:#f8fafc;}
    .page-break{page-break-before:always;}
    .print\\:hidden{display:none !important;}
    :where(*):not(table):not(th):not(td){ border:none !important; }
    border, [class*="border-"]{ border-width:0 !important; }
    [class*="rounded"]{ border-radius:0 !important; }
  `;
  const wrap = document.createElement("div");
  wrap.appendChild(style);
  wrap.appendChild(clone);
  return wrap;
}


function exportPDF(targetRef, filename) {
  const el = targetRef?.current;
  if (!el) return;
  const clean = cloneForPdf(el);
  const scale = Math.min(4, (window.devicePixelRatio || 1) * 2);

  const opt = {
    margin: [10, 12, 10, 12],
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      letterRendering: true,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  html2pdf().set(opt).from(clean).save();
}

/* ---- DOCX helper ---- */
function buildExportHtml(el) {
  const css = `
    <style>
      *{font-family: Arial, Helvetica, sans-serif;}
      body{margin:16px;}
      h1,h2,h3{margin:0 0 8px 0;}
      p{margin:0 0 8px 0;}
      ul,ol{margin:0 0 8px 20px;}
      table{border-collapse:collapse;width:100%;margin:8px 0;}
      th,td{border:1px solid #d1d5db;padding:6px 8px;font-size:12pt;}
      thead th{background:#f8fafc;}
      img{max-width:100%;height:auto;}
    </style>`;
  const clone = el.cloneNode(true);
  clone.querySelectorAll("*").forEach((n) => n.removeAttribute("class"));
  clone.querySelectorAll("img").forEach((img) => {
    try {
      if (img.src)
        img.src = new URL(img.getAttribute("src"), window.location.href).href;
    } catch {}
    img.removeAttribute("loading");
    img.removeAttribute("decoding");
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${css}</head><body>${clone.innerHTML}</body></html>`;
}

const ExportMenu = ({
  targetRef,
  filename = "lesson-plan",
  canDownload = true,
  onRequirePremium,
  onRequestAccess,
}) => {
  const [open, setOpen] = useState(false);

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

  const exportDOCX = () => {
    if (!requireDownloadAccess()) return;
    const el = targetRef?.current;
    if (!el) return;
    const html = buildExportHtml(el);
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    saveAs(blob, `${filename}.doc`);
    setOpen(false);
  };

  const exportPDFHandler = () => {
    if (!requireDownloadAccess()) return;
    exportPDF(targetRef, filename);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs md:text-sm font-medium text-violet-600 border border-violet-900"
        title="Export"
      >
        Export
        <IoChevronDown size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg z-10"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
            onClick={exportDOCX}
          >
            Microsoft Word (.doc)
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
            onClick={exportPDFHandler}
          >
            PDF Document (.pdf)
          </button>
        </div>
      )}
    </div>
  );
};
export default ExportMenu;

