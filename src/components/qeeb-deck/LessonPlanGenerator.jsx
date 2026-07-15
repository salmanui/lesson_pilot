"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { RiAiGenerate2 } from "react-icons/ri";
import {
  HiOutlineBuildingLibrary,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlinePencilSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineSquares2X2,
  HiOutlineBeaker,
  HiOutlineMagnifyingGlass,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiChevronDown,
  HiCheck,
} from "react-icons/hi2";
import { fetchLessonPlan } from "../../utils/ai/lessonPlanApi";
import { useRouter } from "next/navigation";
import { UserContext } from "../../utils/userContext";
import AuthModal from "../AuthModal";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "../../utils/guestAiUsage";
import {
  consumeGenerationForUser,
  getUserSubscriptionStatus,
} from "../../utils/subscriptionApi";

const CLASS_OPTIONS = [
  ...Array.from({ length: 12 }, (_, i) => String(i + 1)), // "1".."12"
  "UG",
  "PG",
];

// keep this exactly as an ARRAY (used by UI .map)
const FORMATS = [
  {
    key: "5-Part",
    desc: "Objectives, Intro, Instruction, Practice, Assessment",
  },
  { key: "4-Part", desc: "Warm Up, Activities, Synthesis, Cool Down" },
  { key: "5E", desc: "Engage, Explore, Explain, Elaborate, Evaluate" },
  { key: "Inquiry-Based", desc: "Questioning, Investigation, Discovery" },
  { key: "UDL", desc: "Universal Design for Learning" },
];

const DETAIL = ["High Detail", "Outline"]; // kept only for UI; not used in prompt line
const FORMATS_WITH_HIGH_DETAIL = new Set(["5-Part", "4-Part"]);

// UI-only: icon per format (keyed by FORMATS[].key, does not affect prompt)
const FORMAT_ICONS = {
  "5-Part": HiOutlineClipboardDocumentList,
  "4-Part": HiOutlineSquares2X2,
  "5E": HiOutlineBeaker,
  "Inquiry-Based": HiOutlineMagnifyingGlass,
  UDL: HiOutlineAcademicCap,
};

const DEFAULT_SPACE = "K-12 School";
const DEFAULT_TONE = ["Informative", "Academic", "Direct"];
const DEFAULT_WC = "400+-50";

const LessonPlanGenerator = ({ onSubmit }) => {
  const {
    user,
    openSignInModal,
    openSubscriptionModal: openGlobalSubscriptionModal,
    isSubscriptionModalOpen,
    hasActiveSubscription,
    subscriptionStatusLoading,
  } = useContext(UserContext);
  const [board, setBoard] = useState("");
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("5-Part");
  const [detailLevel, setDetailLevel] = useState("High Detail"); // not used in prompt
  const role = "teacher";
  const [touched, setTouched] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAutoOpenedLimitModal, setHasAutoOpenedLimitModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(() =>
    getUserSubscriptionStatus(user),
  );
  const router = useRouter();

  useEffect(() => {
    setSubscriptionStatus(getUserSubscriptionStatus(user));
    setHasAutoOpenedLimitModal(false);
  }, [subscriptionStatusLoading, user]);

  useEffect(() => {
    if (subscriptionStatusLoading) return;
    if (!user || hasAutoOpenedLimitModal) return;
    if (hasActiveSubscription !== false) return;
    if (subscriptionStatus.isPremium) return;
    if (subscriptionStatus.remainingGenerations > 0) return;
    if (isSubscriptionModalOpen) return;
    openGlobalSubscriptionModal({
      reason: "generation_limit",
      sourceTool: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
    });
    setHasAutoOpenedLimitModal(true);
  }, [
    hasAutoOpenedLimitModal,
    hasActiveSubscription,
    isSubscriptionModalOpen,
    openGlobalSubscriptionModal,
    subscriptionStatus.isPremium,
    subscriptionStatus.remainingGenerations,
    subscriptionStatusLoading,
    user,
  ]);

  const isValid = useMemo(
    () =>
      board.trim() &&
      klass.trim() &&
      subject.trim() &&
      topic.trim() &&
      format &&
      detailLevel,
    [board, klass, subject, topic, format, detailLevel]
  );

  const error = (msg) =>
    touched ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

  // UI-only: progress across the four required text fields
  const filledCount = [board, klass, subject, topic].filter((v) =>
    v.trim()
  ).length;
  const progress = (filledCount / 4) * 100;

  // Shared input styling (leading icon padding baked in via pl-10)
  const inputBase =
    "w-full rounded-xl border border-gray-200 bg-white/80 pl-10 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15";

  const requireGenerationAccess = () => {
    if (!user) return false;
    const status = getUserSubscriptionStatus(user);
    setSubscriptionStatus(status);
    if (status.canGenerate) return false;
    openGlobalSubscriptionModal({
      reason: "generation_limit",
      sourceTool: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
    });
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setApiError("");
    if (!isValid || loading) return;
    if (!user && !canUseAiToolAsGuest(GUEST_AI_TOOL_KEYS.LESSON_PLAN)) {
      openSignInModal?.();
      return;
    }
    if (requireGenerationAccess()) return;

    const payload = {
      board: board.trim(),
      className: klass.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      format,
      detailLevel, // only for display on result page
      role,
    };
    onSubmit?.(payload);

    // Put this near the top of LessonPlanGenerator.jsx (outside the component)
    function getIncludeLine(board) {
      const b = (board || "").trim();
      if (!b) return "Aligned with latest syllabus";

      const s = b.toLowerCase();

      // CBSE -> CBSE-NCERT
      if (/cbse/.test(s)) return "Aligned with latest CBSE-NCERT syllabus";

      // ICSE/ISC -> CISCE
      if (/(icse|cisce)/.test(s))
        return "Aligned with latest CISCE (ICSE) syllabus";
      if (/\bisc\b/.test(s)) return "Aligned with latest CISCE (ISC) syllabus";

      // SSC (state boards). If a state is included, reflect it nicely.
      if (/\bssc\b/.test(s) || /state\s*board/.test(s)) {
        // Try to extract state name, e.g., "Maharashtra SSC" -> "Maharashtra"
        const state = b
          .replace(/ssc|state\s*board/gi, "")
          .replace(/-/g, " ")
          .trim();
        return state
          ? `Aligned with latest ${state} SSC (State Board) syllabus`
          : "Aligned with latest SSC (State Board) syllabus";
      }

      // Fallback for anything else (e.g., "IB", "Cambridge", custom labels)
      return `Aligned with latest ${b} syllabus`;
    }

    const includeLine = getIncludeLine(payload.board);

    // Treat numeric classes (1-12) as K-12; UG/PG are higher-ed
    const isK12 = /^\d+$/.test(payload.className);

    const prompt =
      `Generate a Lesson Plan of ${payload.topic} | ` +
      `for ${isK12 ? `Grade ${payload.className}` : payload.className} | ` +
      `${isK12 ? `space ${DEFAULT_SPACE} | ` : ""}` +
      `WC: ${DEFAULT_WC} | ` +
      `TONE: [${DEFAULT_TONE.join(", ")} ] | ` +
      `INCLUDE: ${includeLine} | Format: ${payload.format}`;

    try {
      setLoading(true);
      const data = await fetchLessonPlan(prompt);

      const dest = "/ai/teacher/lesson-plan-generator";
      const navKey = "qeeb:lp:teacher";
      try {
        sessionStorage.setItem(
          navKey,
          JSON.stringify({
            aiResponse: data,
            form: payload,
            prompt,
            ts: Date.now(),
          })
        );
      } catch {}

      if (!user) {
        consumeAiToolGuestUse(GUEST_AI_TOOL_KEYS.LESSON_PLAN);
      } else {
        const nextStatus = consumeGenerationForUser({
          user,
          toolKey: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
        });
        setSubscriptionStatus(nextStatus);
        if (!nextStatus.canGenerate) {
          openGlobalSubscriptionModal({
            reason: "generation_limit",
            sourceTool: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
          });
          setHasAutoOpenedLimitModal(true);
        }
      }
      router.push(dest);
    } catch (err) {
      setApiError(
        err.message || "Could not generate the lesson plan. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative w-full overflow-hidden font-lato">
        {/* Decorative animated background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50 to-sky-100" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-300/40 blur-3xl animate-blob [animation-delay:3s]" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-80 w-80 rounded-full bg-blue-300/40 blur-3xl animate-blob [animation-delay:6s]" />

        <div className="relative z-[1] h-screen overflow-auto px-3 py-8 md:p-10">
          <div className="mx-auto max-w-3xl animate-fade-in-up overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-[0_20px_60px_-15px_rgba(76,29,149,0.25)] backdrop-blur-xl">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-7 text-center md:p-10">
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
              <div className="pointer-events-none absolute -top-10 right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-float" />
              <div className="relative flex flex-col items-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/40 backdrop-blur-sm animate-float">
                  <RiAiGenerate2 size={34} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white md:text-[2.6rem]">
                  AI Lesson Plan Generator
                </h1>
                <p className="mt-3 max-w-xl text-sm font-normal text-white/85 md:text-base">
                  Turn your teaching ideas into engaging, classroom-ready lesson
                  plans.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/30">
                  <HiOutlineSparkles className="h-3.5 w-3.5" />
                  Powered by AI
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 md:py-10"
            >
              {/* Progress */}
              <div className="mb-7">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                  <span>Lesson details</span>
                  <span>{filledCount}/4 completed</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                <div className="col-span-4 md:col-span-3">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <HiOutlineBuildingLibrary className="h-4 w-4 text-indigo-500" />
                    Board
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
                      <HiOutlineBuildingLibrary className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                      placeholder="e.g., CBSE"
                      className={`${inputBase} pr-3`}
                    />
                  </div>
                  {!board.trim() && error("Please enter a board.")}
                </div>

                <div className="col-span-8 md:col-span-4">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <HiOutlineUserGroup className="h-4 w-4 text-indigo-500" />
                    Class
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
                      <HiOutlineUserGroup className="h-4 w-4" />
                    </span>
                    <select
                      value={klass}
                      onChange={(e) => setKlass(e.target.value)}
                      className={`${inputBase} cursor-pointer appearance-none pr-9`}
                    >
                      <option value="">Select class</option>
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <HiChevronDown className="h-4 w-4" />
                    </span>
                  </div>
                  {!klass.trim() && error("Please choose a class.")}
                </div>

                <div className="col-span-12 md:col-span-5">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <HiOutlineBookOpen className="h-4 w-4 text-indigo-500" />
                    Subject
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
                      <HiOutlineBookOpen className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Physics"
                      className={`${inputBase} pr-3`}
                    />
                  </div>
                  {!subject.trim() && error("Please enter a subject.")}
                </div>

                {/* Topic */}
                <div className="col-span-12">
                  <label className="flex items-center gap-1.5 text-sm font-semibold leading-4 text-gray-800">
                    <HiOutlinePencilSquare className="h-4 w-4 text-indigo-500" />
                    Describe the topic
                  </label>
                  <p className="text-sm leading-6 text-gray-600">
                    What are you planning to teach?
                  </p>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Newton's Laws of Motion"
                      className={`${inputBase} pr-3`}
                    />
                  </div>
                  {!topic.trim() && error("Please enter a topic.")}
                </div>
              </div>

              {/* Format */}
              <div className="mt-7">
                <span className="flex items-center gap-1.5 text-sm font-semibold leading-4 text-gray-800">
                  <HiOutlineSparkles className="h-4 w-4 text-indigo-500" />
                  Format
                </span>
                <p className="mb-3 text-sm leading-6 text-gray-600">
                  What format would you prefer?
                </p>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {FORMATS.map((f) => {
                    const active = format === f.key;
                    const Icon = FORMAT_ICONS[f.key] || HiOutlineSparkles;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setFormat(f.key);
                          if (!FORMATS_WITH_HIGH_DETAIL.has(f.key))
                            setDetailLevel("Outline");
                        }}
                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                          active
                            ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-sky-50 shadow-md ring-1 ring-indigo-300"
                            : "border-gray-200 bg-white/70 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                        }`}
                        aria-pressed={active}
                      >
                        {active && (
                          <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <HiCheck className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div
                          className={`mt-3 text-base font-semibold ${
                            active ? "text-indigo-700" : "text-gray-900"
                          }`}
                        >
                          {f.key}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-gray-600 md:text-sm">
                          {f.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail (display-only; not in prompt) */}
              <div className="mt-7">
                <span className="block text-sm font-semibold text-gray-800">
                  Level of detail
                </span>
                <p className="mb-2 text-sm leading-6 text-gray-600">
                  {FORMATS_WITH_HIGH_DETAIL.has(format)
                    ? "What level of detail would you like?"
                    : "Only Outline is available for this format."}
                </p>
                <div className="flex gap-3">
                  {(FORMATS_WITH_HIGH_DETAIL.has(format)
                    ? DETAIL
                    : ["Outline"]
                  ).map((d) => {
                    const active = detailLevel === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDetailLevel(d)}
                        className={`flex-1 rounded-xl border px-6 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-transparent bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-md"
                            : "border-indigo-200 bg-white/70 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                        aria-pressed={active}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Errors + Submit */}
              <div className="mt-4">
                {apiError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {apiError}
                  </p>
                )}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  className={`group relative w-full overflow-hidden rounded-xl px-10 py-3.5 font-semibold text-white transition ${
                    isValid
                      ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
                      : "cursor-not-allowed bg-gray-300 text-gray-500 shadow-none"
                  } ${loading ? "cursor-wait" : ""}`}
                  disabled={!isValid || loading}
                >
                  {isValid && !loading && (
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-t-transparent" />
                        Generating...
                        <BsStars size={20} className="ml-1" />
                      </>
                    ) : (
                      <>
                        Generate <BsStars size={20} className="ml-1" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <AuthModal />
    </>
  );
};

export default LessonPlanGenerator;

