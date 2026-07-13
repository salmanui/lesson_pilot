"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { RiAiGenerate2 } from "react-icons/ri";
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
      <div className="w-full overflow-hidden font-lato">
        <div className="h-screen overflow-auto py-6 px-3 md:p-10 relative z-[1]">
          <div className="bg-white max-w-3xl mx-auto rounded-lg">
            <div className="bg-[#e4d7ff] md:p-8 p-6 rounded-t-lg">
              <div className="flex flex-col items-center">
                <RiAiGenerate2 size={48} />
                <h1 className="text-3xl md:text-4xl font-semibold text-black my-3 text-center">
                  AI Lesson Plan Generator
                </h1>
                <p className="md:text-base text-sm font-normal text-center max-w-xl">
                  Turn your teaching ideas into engaging, classroom-ready
                  lesson plans.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md mx-auto py-5 md:py-10 px-5 sm:px-0"
            >
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-5">
                <div className="md:col-span-3 col-span-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Board
                  </label>
                  <input
                    type="text"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    placeholder="e.g., CBSE"
                    className="w-full rounded-lg text-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  {!board.trim() && error("Please enter a board.")}
                </div>

                <div className="md:col-span-4 col-span-8">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Class
                  </label>
                  <select
                    value={klass}
                    onChange={(e) => setKlass(e.target.value)}
                    className="w-full rounded-lg text-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Select class</option>
                    {CLASS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {!klass.trim() && error("Please choose a class.")}
                </div>

                <div className="md:col-span-5 col-span-12">
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Physics"
                    className="w-full rounded-lg border text-sm border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  {!subject.trim() && error("Please enter a subject.")}
                </div>

                {/* Topic */}
                <div className="col-span-12">
                  <label className="block leading-4 text-sm font-semibold text-gray-800">
                    Describe the topic
                  </label>
                  <p className="text-gray-600 leading-6 text-sm">
                    What are you planning to teach?
                  </p>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Newton's Laws of Motion"
                    className="w-full mt-2 rounded-lg border text-sm border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  {!topic.trim() && error("Please enter a topic.")}
                </div>
              </div>

              {/* Format */}
              <div className="mt-6">
                <span className="block leading-4 text-sm font-semibold text-gray-800">
                  Format
                </span>
                <p className="text-gray-600 leading-6 text-sm mb-2">
                  What format would you prefer?
                </p>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {FORMATS.map((f) => {
                    const active = format === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setFormat(f.key);
                          if (!FORMATS_WITH_HIGH_DETAIL.has(f.key))
                            setDetailLevel("Outline");
                        }}
                        className={`text-left rounded-lg border p-4 transition ${
                          active
                            ? "border-violet-600 bg-violet-50"
                            : "border-gray-300 hover:border-violet-400"
                        }`}
                        aria-pressed={active}
                      >
                        <div
                          className={`font-semibold text-base ${
                            active ? "text-violet-600" : ""
                          }`}
                        >
                          {f.key}
                        </div>
                        <div className="md:text-sm text-xs text-gray-700 mt-2 md:leading-6 leading-5">
                          {f.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail (display-only; not in prompt) */}
              <div className="mt-6">
                <span className="block text-sm font-semibold text-gray-800">
                  Level of detail
                </span>
                <p className="text-gray-600 leading-6 text-sm mb-2">
                  {FORMATS_WITH_HIGH_DETAIL.has(format)
                    ? "What level of detail would you like?"
                    : "Only Outline is available for this format."}
                </p>
                <div className="flex gap-5">
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
                        className={`rounded-lg w-full text-base border px-6 py-3 font-medium transition ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-300 bg-white text-violet-800 hover:border-violet-400"
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
                {apiError && <p className="text-sm text-red-600">{apiError}</p>}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  className={`rounded-lg w-full justify-center flex items-center gap-2 px-10 py-3 font-medium ${
                    isValid
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  } ${loading ? "cursor-wait" : ""}`}
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-t-transparent" />
                      Generating...<BsStars size={20} className="ml-1" />
                    </>
                  ) : (
                    <>
                      Generate <BsStars size={20} className="ml-1" />
                    </>
                  )}
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

