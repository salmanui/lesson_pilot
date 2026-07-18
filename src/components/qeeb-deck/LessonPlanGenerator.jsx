"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineSquares2X2,
  HiOutlineBeaker,
  HiOutlineMagnifyingGlass,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiCheck,
} from "react-icons/hi2";
import { fetchLessonPlan } from "../../utils/ai/lessonPlanApi";
import { BOARD_OPTIONS } from "../../utils/ai/boards";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from "../../utils/ai/languages";
import { useRouter } from "next/navigation";
import { UserContext } from "../../utils/userContext";
import AuthModal from "../AuthModal";
import DashboardNavbar from "@/src/components/dashboard/DashboardNavbar";
import SelectDropdown from "@/src/components/ui/SelectDropdown";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "../../utils/guestAiUsage";
import { getUserSubscriptionStatus } from "../../utils/subscriptionApi";

const CLASS_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const value = String(i + 1);
  return { value, label: `Class ${value}` };
});

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

// The model has no clock, so without an explicit date it emits an unfilled
// "Date: [Date]" placeholder. Computed per submit, not at module load, so a tab
// left open overnight still stamps the day the plan was actually generated.
const formatGenerationDate = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const DEFAULT_SPACE = "K-12 School";
const DEFAULT_TONE = ["Informative", "Academic", "Direct"];
const DEFAULT_WC = "400+-50";

const TIPS = [
  "Name the exact concept, not just the chapter — “Newton’s Third Law” beats “Motion”.",
  "5-Part and 4-Part support High Detail; the rest generate as an outline.",
  "Your board choice pins the plan to that syllabus.",
];

/* ---------- Small building blocks ---------- */

const SectionHeading = ({ step, title, hint }) => (
  <div className="mb-4 flex items-start gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-[11px] font-bold text-white shadow-sm shadow-indigo-500/30">
      {step}
    </span>
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-sm leading-6 text-slate-500">{hint}</p>}
    </div>
  </div>
);

const Field = ({ label, hint, children, error }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-gray-800">
      {label}
    </label>
    {hint && <p className="mb-1.5 text-xs leading-5 text-slate-500">{hint}</p>}
    {children}
    {error}
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
    <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </span>
    <span
      className={`min-w-0 truncate text-right text-sm ${
        value ? "font-semibold text-slate-800" : "text-slate-300"
      }`}
    >
      {value || "—"}
    </span>
  </div>
);

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
  const [lessonName, setLessonName] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
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
    if (subscriptionStatus.canGenerate) return;
    if (isSubscriptionModalOpen) return;
    openGlobalSubscriptionModal({
      reason: "trial_expired",
      sourceTool: GUEST_AI_TOOL_KEYS.LESSON_PLAN,
    });
    setHasAutoOpenedLimitModal(true);
  }, [
    hasAutoOpenedLimitModal,
    hasActiveSubscription,
    isSubscriptionModalOpen,
    openGlobalSubscriptionModal,
    subscriptionStatus.canGenerate,
    subscriptionStatus.isPremium,
    subscriptionStatusLoading,
    user,
  ]);

  const isValid = useMemo(
    () =>
      board.trim() &&
      klass.trim() &&
      subject.trim() &&
      lessonName.trim() &&
      language &&
      format &&
      detailLevel,
    [board, klass, subject, lessonName, language, format, detailLevel]
  );

  const error = (msg) =>
    touched ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

  // UI-only: progress across the four required fields
  const filledCount = [board, klass, subject, lessonName].filter((v) =>
    v.trim()
  ).length;
  const progress = (filledCount / 4) * 100;

  const classLabel =
    CLASS_OPTIONS.find((option) => option.value === klass)?.label || "";

  // Shared input styling
  const inputBase =
    "w-full rounded-xl border border-gray-200 bg-white/80 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition hover:border-indigo-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15";

  const requireGenerationAccess = () => {
    if (!user) return false;
    const status = getUserSubscriptionStatus(user);
    setSubscriptionStatus(status);
    if (status.canGenerate) return false;
    openGlobalSubscriptionModal({
      reason: "trial_expired",
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
      lessonName: lessonName.trim(),
      topic: topic.trim(),
      language,
      generatedOn: formatGenerationDate(new Date()),
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
      `from the lesson ${payload.lessonName} | ` +
      `for ${isK12 ? `Grade ${payload.className}` : payload.className} | ` +
      `${isK12 ? `space ${DEFAULT_SPACE} | ` : ""}` +
      `WC: ${DEFAULT_WC} | ` +
      `TONE: [${DEFAULT_TONE.join(", ")} ] | ` +
      `INCLUDE: ${includeLine} | Format: ${payload.format} | ` +
      `DATE: ${payload.generatedOn} — use this exact date wherever the plan ` +
      `shows a date; never output a placeholder such as [Date] | ` +
      // Last so it is the closest instruction to the model's turn; the whole
      // plan (headings included) must come back in the chosen language.
      `LANGUAGE: Write the entire lesson plan in ${payload.language}`;

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
        // The trial is time-based, so generating costs nothing — but re-read it
        // anyway to catch a trial that lapsed while this session was open.
        const nextStatus = getUserSubscriptionStatus(user);
        setSubscriptionStatus(nextStatus);
        if (!nextStatus.canGenerate) {
          openGlobalSubscriptionModal({
            reason: "trial_expired",
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
      <main className="relative min-h-screen bg-[#f7fbff] font-lato text-slate-950">
        <DashboardNavbar />

        {/* Decorative background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 overflow-hidden"
        >
          <div className="mx-auto flex max-w-6xl justify-between">
            <div className="h-72 w-72 -translate-x-24 rounded-full bg-indigo-300/25 blur-3xl animate-blob" />
            <div className="h-72 w-72 translate-x-24 rounded-full bg-sky-300/25 blur-3xl animate-blob [animation-delay:3s]" />
          </div>
        </div>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {/* Page header */}
          <div className="mb-6 animate-fade-in-up sm:mb-8">
            <div>
              <Link
                href="/dashboard"
                className="inline-block text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
              >
                &larr; Back to dashboard
              </Link>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
              <HiOutlineSparkles className="h-4 w-4" />
              Powered by LessonPilot AI
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl md:text-5xl">
              AI Lesson Plan Generator
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Turn your teaching ideas into engaging, classroom-ready lesson
              plans. Fill in the details below and generate in seconds.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            {/* ---------- Form ---------- */}
            <form
              id="lp-form"
              onSubmit={handleSubmit}
              className="animate-fade-in-up lg:col-span-8"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <span
                  aria-hidden="true"
                  className="block h-1 bg-gradient-to-r from-indigo-600 to-sky-500"
                />

                <div className="p-5 sm:p-7">
                  {/* Step 1 — details */}
                  <SectionHeading
                    step="1"
                    title="Lesson details"
                    hint="Tell us what you are teaching and to whom."
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label="Board"
                      error={!board.trim() && error("Please choose a board.")}
                    >
                      <SelectDropdown
                        value={board}
                        onChange={setBoard}
                        options={BOARD_OPTIONS}
                        placeholder="Select board"
                        ariaLabel="Board"
                        invalid={touched && !board.trim()}
                      />
                    </Field>

                    <Field
                      label="Class"
                      error={!klass.trim() && error("Please choose a class.")}
                    >
                      <SelectDropdown
                        value={klass}
                        onChange={setKlass}
                        options={CLASS_OPTIONS}
                        placeholder="Select class"
                        ariaLabel="Class"
                        invalid={touched && !klass.trim()}
                      />
                    </Field>

                    <Field
                      label="Subject"
                      error={!subject.trim() && error("Please enter a subject.")}
                    >
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Physics"
                        className={inputBase}
                      />
                    </Field>

                    <Field
                      label="Lesson name"
                      error={
                        !lessonName.trim() &&
                        error("Please enter a lesson name.")
                      }
                    >
                      <input
                        type="text"
                        value={lessonName}
                        onChange={(e) => setLessonName(e.target.value)}
                        placeholder="e.g., Force and Laws of Motion"
                        className={inputBase}
                      />
                    </Field>

                    <Field label="Topic">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Newton's Laws of Motion"
                        className={inputBase}
                      />
                    </Field>

                    <Field
                      label="Language"
                      error={!language && error("Please choose a language.")}
                    >
                      <SelectDropdown
                        value={language}
                        onChange={setLanguage}
                        options={LANGUAGE_OPTIONS}
                        placeholder="Select language"
                        ariaLabel="Language"
                        invalid={touched && !language}
                      />
                    </Field>
                  </div>

                  <div className="my-7 border-t border-dashed border-slate-200" />

                  {/* Step 2 — format */}
                  <SectionHeading
                    step="2"
                    title="Format"
                    hint="What structure would you prefer?"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
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
                              : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
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

                  <div className="my-7 border-t border-dashed border-slate-200" />

                  {/* Step 3 — detail (display-only; not in prompt) */}
                  <SectionHeading
                    step="3"
                    title="Level of detail"
                    hint={
                      FORMATS_WITH_HIGH_DETAIL.has(format)
                        ? "How deep should the plan go?"
                        : "Only Outline is available for this format."
                    }
                  />

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
                              : "border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
                          }`}
                          aria-pressed={active}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  {apiError && (
                    <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {apiError}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit — mobile keeps it inline under the card */}
              <div className="mt-5 lg:hidden">
                <GenerateButton isValid={isValid} loading={loading} />
              </div>
            </form>

            {/* ---------- Summary rail ---------- */}
            <aside className="animate-fade-in-up lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 px-5 py-4">
                    <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
                    <div className="relative">
                      <p className="text-sm font-bold text-white">Your plan</p>
                      <p className="mt-0.5 text-xs text-white/80">
                        {filledCount}/3 details completed
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3">
                    <SummaryRow label="Board" value={board} />
                    <SummaryRow label="Class" value={classLabel} />
                    <SummaryRow label="Subject" value={subject.trim()} />
                    <SummaryRow label="Lesson" value={lessonName.trim()} />
                    <SummaryRow label="Topic" value={topic.trim()} />
                    <SummaryRow label="Language" value={language} />
                    <SummaryRow label="Format" value={format} />
                    <SummaryRow label="Detail" value={detailLevel} />
                  </div>

                  <div className="hidden px-5 pb-5 lg:block">
                    <GenerateButton isValid={isValid} loading={loading} />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm font-bold text-slate-900">
                    Tips for a better plan
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {TIPS.map((tip) => (
                      <li
                        key={tip}
                        className="flex gap-2.5 text-xs leading-5 text-slate-600"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <AuthModal />
    </>
  );
};

/* Rendered twice — inline under the card on mobile, in the summary rail on
   desktop. The rail copy sits outside the <form>, so both rely on form="lp-form"
   to submit. */
const GenerateButton = ({ isValid, loading }) => (
  <button
    type="submit"
    form="lp-form"
    className={`group relative w-full overflow-hidden rounded-xl px-8 py-3.5 font-semibold text-white transition ${
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
);

export default LessonPlanGenerator;
