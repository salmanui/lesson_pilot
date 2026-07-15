"use client";

import React, {
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
import { LuPrinter } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { UserContext } from "../../utils/userContext";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "../../utils/guestAiUsage";
import { getUserSubscriptionStatus } from "../../utils/subscriptionApi";

const ExportMenu = dynamic(
  () => import("../qeeb-deck/ExportMenu"),
  { ssr: false }
);

/* ---------- Table styling ---------- */
const mdTableComponents = {
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-[720px] w-full table-auto text-sm text-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 text-slate-600 border-b">{children}</thead>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-slate-200 last:border-0 bg-white hover:bg-slate-50/60 transition-colors">
      {children}
    </tr>
  ),
  th: ({ node, ...props }) => {
    const style = node?.properties?.style || {};
    return (
      <th
        {...props}
        style={style}
        className="px-4 py-3 text-left font-semibold whitespace-nowrap"
      />
    );
  },
  td: ({ node, ...props }) => {
    const style = node?.properties?.style || {};
    return (
      <td
        {...props}
        style={style}
        className="px-4 py-3 align-top whitespace-nowrap"
      />
    );
  },
};

/* ---------- Typing banner ---------- */
const TypingBanner = ({ show = false }) =>
  show ? (
    <>
      <div className="sticky top-0 left-0 right-0 lg:p-6 p-4 z-20 w-full bg-[#e4d7ff]/80 backdrop-blur">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-700 text-base font-semibold">
            <span>AI is typing</span>
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="qeeb-dot" />
              <span className="qeeb-dot delay-200" />
              <span className="qeeb-dot delay-400" />
            </span>
          </div>
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
    if (startDelay > 0) {
      delayRef.current = setTimeout(start, startDelay);
    } else {
      start();
    }
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
    <div className="mt-3 space-y-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-4 rounded bg-slate-200 animate-pulse"
          style={{ width: widths[idx % widths.length] }}
        />
      ))}
    </div>
  );
};

/* ---------- Markdown that types & auto-scrolls with content (robust) ---------- */
const TypingMarkdown = ({
  text,
  speed = 30,
  startDelay = 0,
  active = true,
  onTick,
  onDone,
  scrollParentRef,
}) => {
  const hasTable = /\n\|.*\|\s*\n\|[-| :]+\|/m.test(text || "");

  // 👇 NEW: detect when the page is going to print
  const [isPrinting, setIsPrinting] = React.useState(false);
  useEffect(() => {
    const mql = window.matchMedia && window.matchMedia("print");
    const onMedia = (e) => setIsPrinting(!!e.matches);
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);

    if (mql) {
      if (mql.addEventListener) mql.addEventListener("change", onMedia);
      else mql.addListener(onMedia); // Safari/old Chrome
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

  // If printing, we do NOT type — we render the full text
  const shouldType = active && !isPrinting;

  const { out, done } = useTypewriter(shouldType ? text || "" : "", {
    speed,
    startDelay,
  });

  // If printing (or table present), always use the full text
  const renderText = hasTable || !shouldType ? text || "" : out;

  const endRef = React.useRef(null);
  const blockRef = React.useRef(null);
  const prevScrollH = React.useRef(0);

  const isNearBottom = React.useCallback((el, thresh = 160) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - thresh;
  }, []);

  const scrollToMe = React.useCallback(() => {
    const parent = scrollParentRef?.current;
    if (!parent || isPrinting) return; // 👈 don't auto-scroll while printing
    if (!isNearBottom(parent)) return;

    let r1 = requestAnimationFrame(() => {
      let r2 = requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        const grew = parent.scrollHeight > prevScrollH.current;
        if (grew) {
          parent.scrollTop = parent.scrollHeight;
          prevScrollH.current = parent.scrollHeight;
        }
      });
      r1 = r2;
    });
    return () => cancelAnimationFrame(r1);
  }, [scrollParentRef, isNearBottom, isPrinting]);

  useEffect(() => {
    if (shouldType) onTick?.(out);
  }, [out, shouldType, onTick]);

  useLayoutEffect(() => {
    if (!shouldType) return;
    const cleanup = scrollToMe();
    return () => cleanup && cleanup();
  }, [out, shouldType, scrollToMe]);

  useEffect(() => {
    if (!shouldType) return;
    const parent = scrollParentRef?.current;
    const node = blockRef.current;
    if (!parent || !node) return;
    prevScrollH.current = parent.scrollHeight;
    const ro = new ResizeObserver(() => requestAnimationFrame(scrollToMe));
    ro.observe(node);
    return () => ro.disconnect();
  }, [shouldType, scrollParentRef, scrollToMe]);

  useEffect(() => {
    if (done && shouldType) onDone?.();
  }, [done, shouldType, onDone]);

  return (
    <div ref={blockRef} className="mark-down markdown-fade-in relative">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={mdTableComponents}
      >
        {renderText}
      </ReactMarkdown>

      {/* hide typing hints in print */}
      {!hasTable && shouldType && !done ? (
        <div className="print:hidden">
          <SkeletonLines rows={5} />
        </div>
      ) : null}

      <span ref={endRef} />
    </div>
  );
};

// Removes chatty prefaces and anything before the first real heading.
function stripChattyPreface(md = "") {
  if (!md) return "";

  // If there’s any H2/H3 ahead, cut everything before it
  const idx = md.search(/^\s{0,3}#{2,3}\s+/m);
  if (idx > 0) md = md.slice(idx);

  // Kill common preface patterns (case-insensitive, tolerant)
  md = md
    // “Okay, here's…”, “Here is…”, “Sure, here is…”
    .replace(/^(okay|sure|alright)[^.\n]*\.\s*$/gim, "")
    .replace(/^\s*here(?:'s| is)\s+a?\s*lesson plan.*$/gim, "")
    .replace(/^\s*formatted\s+as\s+requested.*$/gim, "")
    // Bold headlines like "**Lesson Plan: ....**"
    .replace(/^\s*\*{1,2}\s*lesson plan:[^\n]*\*{0,2}\s*$/gim, "")
    // “Note:” headers
    .replace(/^\s*note:\s.*$/gim, "")
    // “Standards:” lines if present
    .replace(/^\s*standards:\s.*$/gim, "");

  // ---- NEW: strip top "metadata" rows no matter their styling/bullets ----
  // Handles:
  //   Subject: ...
  //   **Subject:** ...
  //   - Subject: ...
  //   * **Grade Level:** 10
  //   Time Allotment: 1 Week...
  //   Word Count:, Tone:, School:
  const META_KEYS =
    "(Subject|Grade\\s*Level|Class\\/Grade|School|Time\\s*Allotment|Word\\s*Count|Tone|Duration|Alignment|Board)";
  md = md.replace(
    new RegExp(
      String.raw`^\s*(?:[-*]\s*)?(?:\*\*)?\s*${META_KEYS}\s*:?(?:\*\*)?\s*.*$`,
      "gmi"
    ),
    ""
  );

  // Remove the placeholder token if it sneaks in
  md = md.replace(/\[Space\s*K-?12\s*School\]/gi, "");

  // Collapse multiple blank lines
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}

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
  const [subscriptionStatus, setSubscriptionStatus] = useState(() =>
    getUserSubscriptionStatus(user),
  );

  const [typingCount, setTypingCount] = useState(0);
  const isTyping = typingCount > 0;

  const handleTick = () => {};
  const handleDone = () => setTypingCount((c) => Math.max(0, c - 1));

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

  const handlePrint = () => {
    if (!requestLessonPlanDownloadAccess({ consumeGuestUse: true })) return;
    // If you ever render only part of the page, you can clone printAreaRef into a new window.
    // For now, the global print is perfect because we hide non-print stuff with CSS.
    window.print();
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

  // Use API markdown AS-IS (no normalization/reordering)
  const rawJoined = useMemo(
    () =>
      (data?.text || [])
        .map((t) => t?.text || "")
        .join("\n\n")
        .trim(),
    [data]
  );

  // ✨ new: strip the preface, but don't reorder
  const cleanedMd = useMemo(() => stripChattyPreface(rawJoined), [rawJoined]);

  // If you still want type-by-section, split on H2 sections; otherwise render `cleanedMd` directly.
  const blocks = useMemo(
    () => (cleanedMd ? cleanedMd.split(/\n(?=##\s+)/g) : []),
    [cleanedMd]
  );

  useEffect(() => {
    if (blocks.length) setTypingCount(blocks.length);
  }, [blocks.length]);

  const baseSpeed = 16;
  const blockDelays = useMemo(() => {
    let acc = 0;
    return blocks.map((b, idx) => {
      const estMs = Math.max(600, Math.min(6000, b.length * baseSpeed * 0.7));
      const d = acc;
      acc += estMs;
      return d + idx * 120;
    });
  }, [blocks]);

  const titleText = useMemo(() => {
    const t = form?.topic?.trim();
    if (t) return `${t}`;
    const s = form?.subject?.trim();
    return s ? `Lesson plan for ${s}` : null;
  }, [form]);

  return (
    <>
      <div className="w-full overflow-hidden font-lato">
        <div
          ref={scrollRef}
          id="lp-scroll"
          className="h-screen overflow-auto relative z-[1]"
        >
          <div className="max-w-5xl mx-auto py-6 px-3 md:p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl font-semibold flex items-center gap-2">
                {data && (
                  <Link
                    href="/ai/generator-lesson-plan"
                    className="text-indigo-600 hover:underline text-sm print:hidden"
                    aria-label="Back to generator"
                    title="Back"
                  >
                    <IoArrowBack size={22} />
                  </Link>
                )}
                {titleText && (
                  <h1 className="text-xl md:text-3xl leading-tight font-semibold text-slate-900">
                    {titleText}
                  </h1>
                )}
              </div>
              <div className="flex space-x-4">
                {/* Print button (hidden in print) */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="print:hidden inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs md:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700"
                  title="Print lesson plan"
                >
                  <LuPrinter size={16} />
                  Print
                </button>
                <div className="print:hidden">
                  <ExportMenu
                    targetRef={printAreaRef}
                    filename={titleText || "lesson-plan"}
                    canDownload={subscriptionStatus.canDownload}
                    onRequestAccess={() =>
                      requestLessonPlanDownloadAccess({ consumeGuestUse: true })
                    }
                  />
                </div>
              </div>
            </div>

            {form && (
              <div className="text-xs md:text-base text-gray-800 font-medium mb-3 leading-5">
                • Board:{" "}
                <span className="font-semibold capitalize">{form.board}</span> •
                Class: <span className="font-semibold">{form.className}</span> •{" "}
                Subject: <span className="font-semibold">{form.subject}</span> •
                Topic: <span className="font-semibold">{form.topic}</span> •
                Format: <span className="font-semibold">{form.format}</span> •
                Level of detail:{" "}
                <span className="font-semibold">{form.detailLevel}</span>
              </div>
            )}

            <TypingBanner show={isTyping} />

            <div
              ref={printAreaRef}
              id="lp-scroll"
              data-export-root
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8 relative"
            >
              {!data ? (
                <div className="flex flex-col justify-center items-center h-40">
                  <p className="text-gray-700 text-lg">
                    No lesson plan data found. Please go back and generate a
                    plan.
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/ai/generator-lesson-plan"
                      className="inline-flex px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Open Generator
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {data.imageUrl ? (
                    <img
                      src={data.imageUrl}
                      alt="Lesson visual"
                      className="rounded-lg mb-5 max-h-64 w-full object-cover"
                    />
                  ) : null}

                  {blocks.map((block, i) => (
                    <div key={`md-block-${i}`} className="mb-8 last:mb-0">
                      <TypingMarkdown
                        text={block}
                        speed={baseSpeed}
                        startDelay={blockDelays[i]}
                        onTick={handleTick}
                        onDone={handleDone}
                        scrollParentRef={scrollRef}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LessonPlanResult;
