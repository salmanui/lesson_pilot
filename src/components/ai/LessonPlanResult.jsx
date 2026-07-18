"use client";

import React, {
  useCallback,
  useContext,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { IoArrowBack } from "react-icons/io5";
import {
  LuPrinter,
  LuCopy,
  LuCheck,
  LuChevronDown,
  LuListTree,
  LuTarget,
  LuPackage,
  LuLightbulb,
  LuFlaskConical,
  LuMessagesSquare,
  LuRocket,
  LuClipboardCheck,
  LuBookOpen,
} from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import DashboardNavbar from "@/src/components/dashboard/DashboardNavbar";
import { UserContext } from "../../utils/userContext";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "../../utils/guestAiUsage";
import { getUserSubscriptionStatus } from "../../utils/subscriptionApi";
import { accentForIndex } from "../../utils/ai/lessonPlanExportHtml";
import {
  prepareLessonMarkdown,
  splitIntoSections,
} from "../../utils/ai/lessonPlanMarkdown";

const ExportMenu = dynamic(() => import("../qeeb-deck/ExportMenu"), {
  ssr: false,
});

/* ---------- Section identity ---------- */
/**
 * Maps a section heading to an icon. Keyed on the 5E phases plus the headings
 * the generator commonly emits; order matters because "explain" would otherwise
 * also match "explore".
 */
const SECTION_ICONS = [
  [/engage/i, LuLightbulb],
  [/explore/i, LuFlaskConical],
  [/explain/i, LuMessagesSquare],
  [/elaborate|extend/i, LuRocket],
  [/evaluate|assess|check/i, LuClipboardCheck],
  [/objective|outcome|goal/i, LuTarget],
  [/material|resource/i, LuPackage],
];

function iconForSection(title = "") {
  const hit = SECTION_ICONS.find(([pattern]) => pattern.test(title));
  return hit ? hit[1] : LuBookOpen;
}

/* ---------- Markdown component overrides ---------- */
const mdComponents = {
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full table-auto text-sm text-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-indigo-100 bg-indigo-50/70 text-indigo-900">
      {children}
    </thead>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-slate-200 bg-white transition-colors last:border-0 hover:bg-indigo-50/40">
      {children}
    </tr>
  ),
  th: ({ node, ...props }) => (
    <th
      {...props}
      style={node?.properties?.style || {}}
      className="px-4 py-2.5 text-left font-semibold"
    />
  ),
  td: ({ node, ...props }) => (
    <td {...props} style={node?.properties?.style || {}} className="px-4 py-2.5 align-top" />
  ),
};

/* ---------- Typing banner ---------- */
const TypingBanner = ({ show = false }) =>
  show ? (
    <>
      <div className="lp-no-print sticky top-0 z-20 -mx-1 mb-3 rounded-xl bg-indigo-50/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <span>Writing your lesson plan</span>
          <span className="ml-1 inline-flex items-center gap-1">
            <span className="qeeb-dot" />
            <span className="qeeb-dot delay-200" />
            <span className="qeeb-dot delay-400" />
          </span>
        </div>
      </div>
      <style>{`
        .qeeb-dot{width:6px;height:6px;border-radius:9999px;background:rgb(109 40 217);opacity:.25;display:inline-block;animation:qeebBlink 1s infinite;}
        .qeeb-dot.delay-200{animation-delay:.2s}.qeeb-dot.delay-400{animation-delay:.4s}
        @keyframes qeebBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
      `}</style>
    </>
  ) : null;

/* ---------- Typewriter ---------- */
function useTypewriter(text, { speed = 16, startDelay = 0 } = {}) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const delayRef = useRef(null);

  useEffect(() => {
    setOut("");
    setDone(false);
    if (!text) return;
    const start = () => {
      let i = 0;
      intervalRef.current = setInterval(() => {
        const step = text.length > 1200 ? 3 : text.length > 400 ? 2 : 1;
        i = Math.min(text.length, i + step);
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDone(true);
        }
      }, speed);
    };
    if (startDelay > 0) delayRef.current = setTimeout(start, startDelay);
    else start();
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, startDelay]);

  return { out, done };
}

/* ---------- Skeleton ---------- */
const SkeletonLines = ({ rows = 4 }) => {
  const widths = ["100%", "92%", "85%", "70%", "95%", "80%"];
  return (
    <div className="mt-3 space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-3.5 animate-pulse rounded bg-slate-200"
          style={{ width: widths[idx % widths.length] }}
        />
      ))}
    </div>
  );
};

/* ---------- Markdown that types & auto-scrolls with content ---------- */
const TypingMarkdown = ({
  text,
  speed = 30,
  startDelay = 0,
  active = true,
  forceFull = false,
  onDone,
  scrollParentRef,
}) => {
  const hasTable = /\n\|.*\|\s*\n\|[-| :]+\|/m.test(text || "");

  // Typing must never swallow content when the page is being printed.
  const [isPrinting, setIsPrinting] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia?.("print");
    const onMedia = (e) => setIsPrinting(!!e.matches);
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);

    if (mql) {
      if (mql.addEventListener) mql.addEventListener("change", onMedia);
      else mql.addListener(onMedia);
    }
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);

    return () => {
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener("change", onMedia);
        else mql.removeListener(onMedia);
      }
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  /**
   * Typing is a one-way latch. Without this, anything that flips `isPrinting`
   * (the browser's own beforeprint/afterprint, or closing the print dialog)
   * feeds the typewriter its text again and it replays from an empty string --
   * so the plan re-types itself after every print, and an export taken in that
   * window captures half-typed content.
   */
  const [settled, setSettled] = useState(false);
  const shouldType = active && !isPrinting && !forceFull && !settled;

  const { out, done } = useTypewriter(shouldType ? text || "" : "", {
    speed,
    startDelay,
  });

  useEffect(() => {
    if (done) setSettled(true);
  }, [done]);

  // Showing the full text for print also ends typing for good.
  useEffect(() => {
    if (isPrinting || forceFull) setSettled(true);
  }, [isPrinting, forceFull]);

  const renderText = hasTable || !shouldType ? text || "" : out;

  const endRef = useRef(null);
  const blockRef = useRef(null);
  const prevScrollH = useRef(0);

  const isNearBottom = useCallback(
    (el, thresh = 160) => el.scrollTop + el.clientHeight >= el.scrollHeight - thresh,
    []
  );

  const scrollToMe = useCallback(() => {
    const parent = scrollParentRef?.current;
    if (!parent || isPrinting) return undefined;
    if (!isNearBottom(parent)) return undefined;

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const grew = parent.scrollHeight > prevScrollH.current;
        if (grew) {
          parent.scrollTop = parent.scrollHeight;
          prevScrollH.current = parent.scrollHeight;
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollParentRef, isNearBottom, isPrinting]);

  useLayoutEffect(() => {
    if (!shouldType) return undefined;
    const cleanup = scrollToMe();
    return () => cleanup && cleanup();
  }, [out, shouldType, scrollToMe]);

  useEffect(() => {
    if (!shouldType) return undefined;
    const parent = scrollParentRef?.current;
    const node = blockRef.current;
    if (!parent || !node) return undefined;
    prevScrollH.current = parent.scrollHeight;
    const ro = new ResizeObserver(() => requestAnimationFrame(scrollToMe));
    ro.observe(node);
    return () => ro.disconnect();
  }, [shouldType, scrollParentRef, scrollToMe]);

  useEffect(() => {
    if (!shouldType) {
      onDone?.();
      return;
    }
    if (done) onDone?.();
  }, [done, shouldType, onDone]);

  return (
    <div ref={blockRef} className="mark-down markdown-fade-in relative">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={mdComponents}
      >
        {renderText}
      </ReactMarkdown>

      {!hasTable && shouldType && !done ? (
        <div className="lp-no-print">
          <SkeletonLines rows={4} />
        </div>
      ) : null}

      <span ref={endRef} />
    </div>
  );
};

/* ---------- Section card ---------- */
const SectionCard = ({
  index,
  title,
  body,
  accent,
  speed,
  startDelay,
  forceFull,
  onDone,
  scrollParentRef,
  registerRef,
}) => {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const Icon = iconForSection(title);

  const copySection = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure origin or denied permission) */
    }
  };

  return (
    <section
      id={`lp-section-${index}`}
      ref={registerRef}
      data-lp-section=""
      data-lp-index={index}
      data-lp-title={title}
      className="lp-section scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {title ? (
        <header
          className="flex items-center gap-3 border-b px-4 py-3 sm:px-5"
          style={{ background: accent.soft, borderColor: `${accent.solid}22` }}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: accent.solid }}
          >
            <Icon size={17} />
          </span>

          <h2
            className="flex-1 text-sm font-bold leading-tight sm:text-base"
            style={{ color: accent.text }}
          >
            {title}
          </h2>

          <div className="lp-no-print flex items-center gap-1">
            <button
              type="button"
              onClick={copySection}
              title="Copy this section"
              aria-label={`Copy ${title}`}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
            >
              {copied ? (
                <LuCheck size={15} className="text-emerald-600" />
              ) : (
                <LuCopy size={15} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              title={open ? "Collapse section" : "Expand section"}
              aria-expanded={open}
              aria-controls={`lp-body-${index}`}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
            >
              <LuChevronDown
                size={16}
                className={`transition-transform ${open ? "" : "-rotate-90"}`}
              />
            </button>
          </div>
        </header>
      ) : null}

      {/* Hidden rather than unmounted: exports read this subtree from the DOM,
          and `@media print` forces .lp-body visible, so a section collapsed on
          screen still prints and exports in full. Collapsing is therefore purely
          `open` — never `forceFull`, which latches on at print and would leave
          the toggle permanently stuck open afterwards. */}
      <div
        id={`lp-body-${index}`}
        className={`lp-body px-4 py-4 sm:px-5 sm:py-5 ${open ? "" : "hidden"}`}
      >
        <TypingMarkdown
          text={body}
          speed={speed}
          startDelay={startDelay}
          forceFull={forceFull}
          onDone={onDone}
          scrollParentRef={scrollParentRef}
        />
      </div>
    </section>
  );
};

/* ---------- Meta chips ---------- */
const META_FIELDS = [
  ["Board", "board"],
  ["Class", "className"],
  ["Subject", "subject"],
  ["Lesson", "lessonName"],
  ["Topic", "topic"],
  ["Language", "language"],
  ["Format", "format"],
  ["Detail", "detailLevel"],
  ["Date", "generatedOn"],
];

const MetaChips = ({ form }) => (
  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
    {META_FIELDS.map(([label, key]) =>
      form?.[key] ? (
        <span
          key={key}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[11px] shadow-sm backdrop-blur sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs"
        >
          <span className="font-medium uppercase tracking-wide text-slate-400">
            {label}
          </span>
          {/* Long values (a full topic) must ellipsize instead of forcing the
              chip onto a row of its own. */}
          <span className="truncate font-semibold capitalize text-slate-800">
            {form[key]}
          </span>
        </span>
      ) : null
    )}
  </div>
);

/* ---------- Page ---------- */
const LessonPlanResult = ({ role = "teacher" }) => {
  const {
    user,
    openSignInModal,
    openSubscriptionModal,
    subscriptionStatusLoading,
  } = useContext(UserContext);

  const navKey = "qeeb:lp:teacher";
  const scrollRef = useRef(null);
  const printAreaRef = useRef(null);
  const sectionRefs = useRef([]);

  const [subscriptionStatus, setSubscriptionStatus] = useState(() =>
    getUserSubscriptionStatus(user)
  );
  const [typingCount, setTypingCount] = useState(0);
  const [forceFull, setForceFull] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);

  const isTyping = typingCount > 0;
  const handleDone = useCallback(
    () => setTypingCount((c) => Math.max(0, c - 1)),
    []
  );

  useEffect(() => {
    setSubscriptionStatus(getUserSubscriptionStatus(user));
  }, [subscriptionStatusLoading, user]);

  const requestLessonPlanDownloadAccess = ({ consumeGuestUse = false } = {}) => {
    if (!user) {
      if (canUseAiToolAsGuest(GUEST_AI_TOOL_KEYS.LESSON_PLAN_EXPORT)) {
        if (consumeGuestUse) {
          consumeAiToolGuestUse(GUEST_AI_TOOL_KEYS.LESSON_PLAN_EXPORT);
        }
        return true;
      }
      openSignInModal?.("signup");
      return false;
    }
    const status = getUserSubscriptionStatus(user);
    setSubscriptionStatus(status);
    if (status.canDownload) return true;
    openSubscriptionModal({
      reason: "download_locked",
      sourceTool: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
    });
    return false;
  };

  const persisted = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(navKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [navKey]);

  const data = persisted?.aiResponse;
  const form = persisted?.form;

  const rawJoined = useMemo(
    () =>
      (data?.text || [])
        .map((t) => t?.text || "")
        .join("\n\n")
        .trim(),
    [data]
  );

  const cleanedMd = useMemo(() => prepareLessonMarkdown(rawJoined), [rawJoined]);

  const sections = useMemo(
    () =>
      splitIntoSections(cleanedMd).map((section) => ({
        ...section,
        accent: accentForIndex(section.index),
      })),
    [cleanedMd]
  );

  useEffect(() => {
    setTypingCount(sections.length);
  }, [sections.length]);

  const baseSpeed = 16;
  const sectionDelays = useMemo(() => {
    let acc = 0;
    return sections.map((section, idx) => {
      const estMs = Math.max(
        600,
        Math.min(6000, section.body.length * baseSpeed * 0.7)
      );
      const delay = acc;
      acc += estMs;
      return delay + idx * 120;
    });
  }, [sections]);

  const titleText = useMemo(() => {
    const t = form?.topic?.trim();
    if (t) return t;
    const s = form?.subject?.trim();
    return s ? `Lesson plan for ${s}` : null;
  }, [form]);

  /* Print: settle every section's text in full before handing off to the
     browser. Sections collapsed on screen need no help here — `@media print`
     forces .lp-body visible. */
  const handlePrint = () => {
    if (!requestLessonPlanDownloadAccess({ consumeGuestUse: true })) return;
    setForceFull(true);
    setTypingCount(0);
    // Two frames so React commits the fully-typed tree before the print dialog.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.print())
    );
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(cleanedMd);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  /* Highlight the section currently in view within the scroll container. */
  useEffect(() => {
    const parent = scrollRef.current;
    if (!parent || !sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActiveSection(Number(visible.target.dataset.lpIndex) || 0);
        }
      },
      { root: parent, rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    sectionRefs.current.filter(Boolean).forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections.length]);

  const jumpTo = (index) => {
    sectionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const exportMeta = useMemo(
    () => ({
      board: form?.board,
      className: form?.className,
      subject: form?.subject,
      lessonName: form?.lessonName,
      topic: form?.topic,
      language: form?.language,
      format: form?.format,
      detailLevel: form?.detailLevel,
      generatedOn: form?.generatedOn,
    }),
    [form]
  );

  return (
    <main className="min-h-screen bg-[#f7fbff] font-lato text-slate-950">
      <DashboardNavbar />

      {/* dvh, not vh: a phone's collapsing URL bar makes 100vh overshoot and
          leaves the last section unreachable. */}
      <div
        ref={scrollRef}
        id="lp-page"
        className="relative h-[calc(100dvh-133px)] lg:h-[calc(100dvh-115px)] overflow-auto"
      >
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 md:py-8">
          {/* ---- Header ---- */}
          <div className="lp-no-print mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/60 p-3 shadow-sm sm:mb-5 sm:p-5">
            {/* Column on phones so the title owns a full-width row; the toolbar
                is shrink-0 and would otherwise squeeze it to a few characters. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {data && (
                    <Link
                      href="/ai/generator-lesson-plan"
                      className="-ml-1 shrink-0 rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50"
                      aria-label="Back to generator"
                      title="Back to generator"
                    >
                      <IoArrowBack size={20} />
                    </Link>
                  )}
                  {titleText && (
                    <h1 className="min-w-0 flex-1 truncate text-lg font-bold leading-tight text-slate-900 sm:text-xl md:text-2xl">
                      {titleText}
                    </h1>
                  )}
                </div>
                {form && <MetaChips form={form} />}
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                {cleanedMd && (
                  <button
                    type="button"
                    onClick={copyAll}
                    title="Copy the whole plan"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 sm:flex-none sm:py-1.5 md:text-sm"
                  >
                    {copiedAll ? (
                      <LuCheck size={15} className="text-emerald-600" />
                    ) : (
                      <LuCopy size={15} />
                    )}
                    {copiedAll ? "Copied" : "Copy"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-700 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:flex-none sm:py-1.5 md:text-sm"
                  title="Print lesson plan"
                >
                  <LuPrinter size={15} />
                  Print
                </button>
                <div className="flex-1 sm:flex-none">
                  <ExportMenu
                    targetRef={printAreaRef}
                    filename={titleText || "lesson-plan"}
                    title={titleText || "Lesson Plan"}
                    meta={exportMeta}
                    sections={sections}
                    canDownload={subscriptionStatus.canDownload}
                    onRequestAccess={() =>
                      requestLessonPlanDownloadAccess({ consumeGuestUse: true })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <TypingBanner show={isTyping} />

          {/* lp-plan-layout: print flattens this row to a block. Its only
              printing child is the plan itself (the TOC is lp-no-print), and a
              flex container paginates its items unreliably. */}
          <div className="lp-plan-layout flex gap-6">
            {/* ---- Table of contents ---- */}
            {sections.length > 1 && (
              <aside className="lp-no-print hidden w-60 shrink-0 lg:block">
                <nav className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <LuListTree size={14} />
                    Sections
                  </p>
                  <ul className="space-y-0.5">
                    {sections.map((section) => {
                      const isActive = activeSection === section.index;
                      return (
                        <li key={section.index}>
                          <button
                            type="button"
                            onClick={() => jumpTo(section.index)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                              isActive
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                background: isActive
                                  ? section.accent.solid
                                  : "#cbd5e1",
                              }}
                            />
                            <span className="truncate">
                              {section.title || `Part ${section.index + 1}`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </aside>
            )}

            {/* ---- Plan ---- */}
            <div
              ref={printAreaRef}
              id="lp-print-area"
              data-export-root
              className="min-w-0 flex-1"
            >
              {!data ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="text-lg text-slate-700">
                    No lesson plan data found. Please go back and generate a plan.
                  </p>
                  <Link
                    href="/ai/generator-lesson-plan"
                    className="mt-4 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition hover:bg-indigo-700"
                  >
                    Open Generator
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Print-only cover: the on-screen header is hidden on paper. */}
                  <div className="hidden print:mb-4 print:block">
                    {titleText && (
                      <h1 className="text-2xl font-bold text-slate-900">
                        {titleText}
                      </h1>
                    )}
                    {form && (
                      <p className="mt-1 text-xs text-slate-600">
                        {META_FIELDS.map(([label, key]) =>
                          form[key] ? `${label}: ${form[key]}` : null
                        )
                          .filter(Boolean)
                          .join("  •  ")}
                      </p>
                    )}
                    <hr className="mt-3 border-slate-300" />
                  </div>

                  {data.imageUrl ? (
                    <img
                      src={data.imageUrl}
                      alt="Lesson visual"
                      className="max-h-64 w-full rounded-2xl object-cover shadow-sm"
                    />
                  ) : null}

                  {sections.map((section) => (
                    <SectionCard
                      key={`lp-section-${section.index}`}
                      index={section.index}
                      title={section.title}
                      body={section.body}
                      accent={section.accent}
                      speed={baseSpeed}
                      startDelay={sectionDelays[section.index]}
                      forceFull={forceFull}
                      onDone={handleDone}
                      scrollParentRef={scrollRef}
                      registerRef={(node) => {
                        sectionRefs.current[section.index] = node;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LessonPlanResult;
