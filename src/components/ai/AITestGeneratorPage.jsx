"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { LuDownload, LuPrinter } from "react-icons/lu";
import { FiRefreshCcw } from "react-icons/fi";
import {
  HiCheck,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineListBullet,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { toast } from "react-toastify";
import { fetchLessonPlan } from "@/src/utils/ai/lessonPlanApi";
import { BOARD_OPTIONS } from "@/src/utils/ai/boards";
import { UserContext } from "@/src/utils/userContext";
import DashboardNavbar from "@/src/components/dashboard/DashboardNavbar";
import SelectDropdown from "@/src/components/ui/SelectDropdown";
import AuthModal from "../AuthModal";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "@/src/utils/guestAiUsage";
import { getUserSubscriptionStatus } from "@/src/utils/subscriptionApi";

// `short` is the label used where space is tight (the results rail and legend);
// `dot` keys the type to its colour in the question map.
const QUESTION_TYPES = [
  {
    key: "MCQ",
    label: "MCQ",
    short: "MCQ",
    dot: "#FF3B30",
    desc: "Four options, one correct answer",
    icon: HiOutlineListBullet,
  },
  {
    key: "TF",
    label: "True / False",
    short: "T/F",
    dot: "#A95CFF",
    desc: "A statement to judge as true or false",
    icon: HiOutlineCheckCircle,
  },
  {
    key: "DESC",
    label: "Descriptive",
    short: "Descriptive",
    dot: "#24C27A",
    desc: "Written long-form answers",
    icon: HiOutlinePencilSquare,
  },
];
const LANGUAGES = ["English", "Hindi", "Telugu"];
const CLASS_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));
const LANGUAGE_OPTIONS = LANGUAGES.map((language) => ({
  value: language,
  label: language,
}));
const BLOOMS = [
  { value: "Remember", description: "Recall facts and basic concepts" },
  { value: "Understand", description: "Explain ideas or concepts" },
  { value: "Apply", description: "Use information in new situations" },
  { value: "Analyze", description: "Draw connections among ideas" },
  { value: "Evaluate", description: "Justify a stand or decision" },
  { value: "Create", description: "Produce new or original work" },
];
const BLOOM_OPTIONS = BLOOMS.map((bloom) => ({
  value: bloom.value,
  label: bloom.value,
  description: bloom.description,
}));
const OPTION_LABELS = ["A", "B", "C", "D"];

const toInt = (value) => {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MCQ_TF_MIN_MARK = 1;
const MCQ_TF_MAX_MARK = 2;
const DESC_MIN_MARK = 3;
const DESC_MAX_MARK = 5;

const isValidTotalMarks = (value) => {
  const marks = toInt(value);
  return marks >= 20 && marks <= 100 && marks % 5 === 0;
};

const calculateMarksBounds = (nonDescCount, descCount) => {
  const minNonDescTotal = nonDescCount * MCQ_TF_MIN_MARK;
  const maxNonDescTotal = nonDescCount * MCQ_TF_MAX_MARK;
  const minDescTotal = descCount * DESC_MIN_MARK;
  const maxDescTotal = descCount * DESC_MAX_MARK;
  return {
    minTotal: minNonDescTotal + minDescTotal,
    maxTotal: maxNonDescTotal + maxDescTotal,
    minNonDescTotal,
    maxNonDescTotal,
    minDescTotal,
    maxDescTotal,
  };
};

const buildQuestionBasedTypeCounts = (totalQuestions, selectedTypes) => {
  const counts = { MCQ: 0, TF: 0, DESC: 0 };
  if (!selectedTypes.length || totalQuestions <= 0) return counts;

  const activeCount = Math.min(totalQuestions, selectedTypes.length);
  const activeTypes = selectedTypes.slice(0, activeCount);
  const base = Math.floor(totalQuestions / activeTypes.length);
  let remaining = totalQuestions % activeTypes.length;

  activeTypes.forEach((type) => {
    counts[type] = base + (remaining > 0 ? 1 : 0);
    if (remaining > 0) remaining -= 1;
  });

  return counts;
};

const pickCountsForTotalMarks = (totalQuestions, totalMarks, selectedTypes) => {
  const counts = buildQuestionBasedTypeCounts(totalQuestions, selectedTypes);
  const nonDescCount = toInt(counts.MCQ) + toInt(counts.TF);
  const descCount = toInt(counts.DESC);
  const bounds = calculateMarksBounds(nonDescCount, descCount);
  return {
    counts,
    bounds,
    resolvedTotalMarks: clamp(totalMarks, bounds.minTotal, bounds.maxTotal),
  };
};

const splitNonDescTypeMarks = (counts, nonDescTarget) => {
  const types = ["MCQ", "TF"].filter((type) => toInt(counts[type]) > 0);
  const marksByType = {};

  let baseTotal = 0;
  types.forEach((type) => {
    const count = toInt(counts[type]);
    marksByType[type] = count * MCQ_TF_MIN_MARK;
    baseTotal += marksByType[type];
  });

  let extras = Math.max(0, nonDescTarget - baseTotal);
  const order = [...types].sort((a, b) => toInt(counts[b]) - toInt(counts[a]));

  while (extras > 0 && order.length) {
    for (let i = 0; i < order.length && extras > 0; i += 1) {
      const type = order[i];
      const maxForType = toInt(counts[type]) * MCQ_TF_MAX_MARK;
      if (marksByType[type] < maxForType) {
        marksByType[type] += 1;
        extras -= 1;
      }
    }
  }

  return marksByType;
};

const normalizeType = (value) => {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["TF", "T/F", "TRUEFALSE", "TRUE/FALSE", "TRUE FALSE"].includes(v))
    return "TF";
  if (["DESC", "DESCRIPTIVE"].includes(v)) return "DESC";
  return "MCQ";
};

const normalizeAnswerIndex = (answerIndex, options = []) => {
  if (typeof answerIndex === "number" && answerIndex >= 0 && answerIndex <= 3) {
    return answerIndex;
  }
  const s = String(answerIndex ?? "")
    .trim()
    .toUpperCase();
  const letter = OPTION_LABELS.indexOf(s);
  if (letter >= 0) return letter;
  return options.findIndex(
    (opt) =>
      String(opt ?? "")
        .trim()
        .toLowerCase() === s.toLowerCase(),
  );
};

const parseJsonPayload = (response) => {
  if (
    response &&
    typeof response === "object" &&
    response.meta &&
    response.questions
  ) {
    return response;
  }

  const raw = Array.isArray(response?.text)
    ? response.text.map((x) => x?.text || "").join("\n\n")
    : typeof response === "string"
      ? response
      : typeof response?.text === "string"
        ? response.text
        : "";

  const text = String(raw ?? "").trim();
  if (!text) throw new Error("AI response was empty.");

  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let candidate = (codeBlock?.[1] || text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("AI response was not valid JSON.");
  }
};

const parseSingleQuestionPayload = (response) => {
  if (response && typeof response === "object" && response.type) {
    return response;
  }
  if (
    response &&
    typeof response === "object" &&
    Array.isArray(response.questions) &&
    response.questions.length
  ) {
    return response.questions[0];
  }

  const parsed = parseJsonPayload(response);
  if (Array.isArray(parsed?.questions) && parsed.questions.length) {
    return parsed.questions[0];
  }
  if (parsed && typeof parsed === "object" && parsed.type) {
    return parsed;
  }
  throw new Error("Could not parse regenerated question.");
};

const mergeRegeneratedQuestion = (oldQuestion, newQuestion) => {
  const type = oldQuestion.type;
  if (type === "MCQ") {
    const options = Array.isArray(newQuestion.options)
      ? newQuestion.options.slice(0, 4)
      : oldQuestion.options;
    while (options.length < 4) options.push("");
    return {
      ...oldQuestion,
      question: newQuestion.question || oldQuestion.question,
      options,
      answerIndex:
        typeof newQuestion.answerIndex === "number" &&
        newQuestion.answerIndex >= 0 &&
        newQuestion.answerIndex <= 3
          ? newQuestion.answerIndex
          : oldQuestion.answerIndex,
      marks: oldQuestion.marks,
      type: oldQuestion.type,
    };
  }

  if (type === "TF") {
    return {
      ...oldQuestion,
      statement: newQuestion.statement || oldQuestion.statement,
      answer:
        typeof newQuestion.answer === "boolean"
          ? newQuestion.answer
          : oldQuestion.answer,
      marks: oldQuestion.marks,
      type: oldQuestion.type,
    };
  }

  return {
    ...oldQuestion,
    question: newQuestion.question || oldQuestion.question,
    answerKeyPoints:
      Array.isArray(newQuestion.answerKeyPoints) &&
      newQuestion.answerKeyPoints.length
        ? newQuestion.answerKeyPoints
        : oldQuestion.answerKeyPoints,
    sampleAnswer: newQuestion.sampleAnswer || oldQuestion.sampleAnswer,
    marks: oldQuestion.marks,
    type: oldQuestion.type,
  };
};

const buildDistribution = ({ totalMarks, totalQuestions, qTypes }) => {
  const M = toInt(totalMarks);
  const Q = toInt(totalQuestions);
  const types = Array.isArray(qTypes) ? qTypes : [];

  if (M <= 0 || Q <= 0 || types.length === 0) {
    return {
      isReady: false,
      error: "Please complete Step 2 details.",
      counts: {},
      typeMarks: {},
      totalQuestions: Q,
      totalMarks: M,
    };
  }

  const baseQ = Math.floor(Q / types.length);
  const remQ = Q % types.length;
  const counts = {};
  types.forEach((t, idx) => {
    counts[t] = baseQ + (idx < remQ ? 1 : 0);
  });

  const baseMark = Math.floor(M / Q);
  let remMark = M % Q;
  const typeMarks = {};
  types.forEach((t) => {
    typeMarks[t] = 0;
  });

  for (const t of types) {
    for (let i = 0; i < counts[t]; i += 1) {
      const m = baseMark + (remMark > 0 ? 1 : 0);
      if (remMark > 0) remMark -= 1;
      typeMarks[t] += m;
    }
  }

  return {
    isReady: true,
    error: "",
    counts,
    typeMarks,
    totalQuestions: Q,
    totalMarks: M,
  };
};

const normalizeQuestions = (payload, fallbackMeta) => {
  const rawQuestions = Array.isArray(payload?.questions)
    ? payload.questions
    : [];
  const normalized = rawQuestions
    .map((q, idx) => {
      const type = normalizeType(q?.type || q?.QuestionType);
      const marks = toInt(q?.marks ?? q?.QuestionMarks ?? 1);
      if (type === "MCQ") {
        const options = (
          Array.isArray(q?.options)
            ? q.options
            : [q?.optionA, q?.optionB, q?.optionC, q?.optionD]
        )
          .slice(0, 4)
          .map((x) => String(x ?? "").trim());
        while (options.length < 4) options.push("");
        return {
          id: q?.id ?? idx + 1,
          type,
          question: String(q?.question ?? q?.QuestionText ?? "").trim(),
          options,
          answerIndex: normalizeAnswerIndex(
            q?.answerIndex ?? q?.CorrectAnswer ?? q?.answer,
            options,
          ),
          marks,
        };
      }
      if (type === "TF") {
        const answer = q?.answer;
        return {
          id: q?.id ?? idx + 1,
          type,
          statement: String(
            q?.statement ?? q?.question ?? q?.QuestionText ?? "",
          ).trim(),
          answer:
            typeof answer === "boolean"
              ? answer
              : String(answer ?? q?.CorrectAnswer ?? "")
                  .trim()
                  .toLowerCase() === "true",
          marks,
        };
      }
      const answerKeyPoints = Array.isArray(q?.answerKeyPoints)
        ? q.answerKeyPoints
        : String(q?.answerKeyPoints ?? q?.sampleAnswer ?? "")
            .split(/\r?\n|;/g)
            .map((x) => x.trim())
            .filter(Boolean);
      return {
        id: q?.id ?? idx + 1,
        type,
        question: String(q?.question ?? q?.QuestionText ?? "").trim(),
        answerKeyPoints,
        sampleAnswer: String(q?.sampleAnswer ?? q?.answer ?? "").trim(),
        marks,
      };
    })
    .filter((q) => (q.type === "TF" ? !!q.statement : !!q.question));

  return {
    meta: { ...(payload?.meta || {}), ...fallbackMeta },
    questions: normalized,
  };
};

const enforceMarksRules = (questions, requestedTotalMarks) => {
  const list = Array.isArray(questions) ? questions.map((q) => ({ ...q })) : [];
  if (!list.length) return { questions: [], totalMarks: 0 };

  const mcqIndices = [];
  const tfIndices = [];
  const descIndices = [];
  list.forEach((q, idx) => {
    if (q.type === "MCQ") mcqIndices.push(idx);
    else if (q.type === "TF") tfIndices.push(idx);
    else descIndices.push(idx);
  });

  const nonDescIndices = [...mcqIndices, ...tfIndices];
  const nonDescCount = nonDescIndices.length;
  const descCount = descIndices.length;
  const totalQuestions = list.length;
  const bounds = calculateMarksBounds(nonDescCount, descCount);

  let targetTotal = toInt(requestedTotalMarks);
  if (targetTotal <= 0) targetTotal = sumMarks(list) || bounds.minTotal;
  targetTotal = clamp(targetTotal, bounds.minTotal, bounds.maxTotal);

  let nonDescTarget = 0;
  if (nonDescCount > 0) {
    if (descCount === 0) {
      nonDescTarget = targetTotal;
    } else {
      const minNonDesc = Math.max(
        bounds.minNonDescTotal,
        targetTotal - bounds.maxDescTotal,
      );
      const maxNonDesc = Math.min(
        bounds.maxNonDescTotal,
        targetTotal - bounds.minDescTotal,
      );
      const proportional = Math.round(
        (targetTotal * nonDescCount) / totalQuestions,
      );
      nonDescTarget = clamp(proportional, minNonDesc, maxNonDesc);
    }

    // Set all MCQ/T-F to 1 mark, then promote some to 2 marks.
    nonDescIndices.forEach((idx) => {
      list[idx].marks = MCQ_TF_MIN_MARK;
    });
    let extras = nonDescTarget - bounds.minNonDescTotal;
    const ordered = [...nonDescIndices].sort(
      (a, b) => toInt(questions[b]?.marks) - toInt(questions[a]?.marks),
    );
    for (let i = 0; i < ordered.length && extras > 0; i += 1) {
      list[ordered[i]].marks = MCQ_TF_MAX_MARK;
      extras -= 1;
    }
  }

  if (descCount > 0) {
    const descTarget = targetTotal - nonDescTarget;
    const orderedDesc = [...descIndices].sort(
      (a, b) => toInt(questions[b]?.marks) - toInt(questions[a]?.marks),
    );
    descIndices.forEach((idx) => {
      list[idx].marks = DESC_MIN_MARK;
    });
    let extras = descTarget - bounds.minDescTotal;
    const rounds = DESC_MAX_MARK - DESC_MIN_MARK;
    for (let round = 0; round < rounds && extras > 0; round += 1) {
      for (let i = 0; i < orderedDesc.length && extras > 0; i += 1) {
        list[orderedDesc[i]].marks += 1;
        extras -= 1;
      }
    }
  }

  return {
    questions: list,
    totalMarks: sumMarks(list),
  };
};

const sumMarks = (questions) =>
  questions.reduce((s, q) => s + toInt(q.marks), 0);

const countByType = (questions) =>
  questions.reduce(
    (acc, q) => {
      if (acc[q.type] != null) acc[q.type] += 1;
      return acc;
    },
    { MCQ: 0, TF: 0, DESC: 0 },
  );

const marksByType = (questions) =>
  questions.reduce(
    (acc, q) => {
      if (acc[q.type] != null) acc[q.type] += toInt(q.marks);
      return acc;
    },
    { MCQ: 0, TF: 0, DESC: 0 },
  );

const mapChipClass = (type, selected) => {
  if (!selected) return "border-slate-200 bg-slate-50 text-slate-400";
  if (type === "MCQ") return "border-[#FF5E5E] bg-[#FFE8E8] text-[#C23D3D]";
  if (type === "TF") return "border-[#BA7BFF] bg-[#F1E8FF] text-[#7E47C5]";
  return "border-[#2EDB8C] bg-[#E7FFF3] text-[#14774B]";
};

// DESC is the fallback: normalizeType() only ever emits MCQ, TF or DESC.
const questionTypeMeta = (type) =>
  QUESTION_TYPES.find((entry) => entry.key === type) || QUESTION_TYPES[2];

const filenameSafe = (value) =>
  String(value ?? "ai-test")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ai-test";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fallbackDescHeight = (question) => {
  const marks = Math.max(1, toInt(question?.marks));
  return Math.max(240, Math.min(560, marks * 52));
};

const buildFallbackPaperHtml = (meta, questions, withAnswers) => {
  const counts = countByType(questions);
  const typeMarks = marksByType(questions);
  const totalMarks = sumMarks(questions);
  const classWithSection = [meta?.className, meta?.section]
    .filter(Boolean)
    .join("-");

  const instructionLines = [
    `This Question paper contains ${questions.length} Questions.`,
    counts.MCQ
      ? `There are ${counts.MCQ} MCQs (${typeMarks.MCQ} marks total).`
      : "",
    counts.TF
      ? `There are ${counts.TF} T/F questions (${typeMarks.TF} marks total).`
      : "",
    counts.DESC
      ? `There are ${counts.DESC} descriptive questions (${typeMarks.DESC} marks total).`
      : "",
    counts.MCQ || counts.TF ? "MCQ/T/F questions carry 1-2 marks each." : "",
    counts.DESC ? "Descriptive questions carry 3-5 marks each." : "",
    `The duration of the test is ${toInt(meta?.durationMins) || "NA"} minutes.`,
  ].filter(Boolean);

  const questionHtml = questions
    .map((question, index) => {
      const qType = String(question?.type || "").toUpperCase();
      const questionMarks = toInt(question?.marks);
      const marksLabel = `${questionMarks} ${
        questionMarks === 1 ? "Mark" : "Marks"
      }`;
      const qHeader = `<div class="q-head"><span>Question ${
        index + 1
      }</span><span>${marksLabel}</span></div>`;

      if (qType === "MCQ") {
        const options = Array.isArray(question?.options)
          ? [...question.options]
          : [];
        while (options.length < 4) options.push("-");
        const optionsHtml = options
          .slice(0, 4)
          .map((opt, optionIndex) => {
            const isCorrect =
              withAnswers &&
              toInt(question?.answerIndex) === optionIndex &&
              String(opt).trim() !== "-";
            return `<div class="opt ${isCorrect ? "opt-correct" : ""}"><span class="opt-prefix">${
              OPTION_LABELS[optionIndex]
            }.</span> ${escapeHtml(opt)}</div>`;
          })
          .join("");
        return `<div class="q-card">${qHeader}<div class="q-text">${escapeHtml(
          question?.question || "-",
        )}</div><div class="opt-grid">${optionsHtml}</div></div>`;
      }

      if (qType === "TF") {
        const tfOptions = [
          {
            label: "A",
            value: "True",
            correct: withAnswers && question?.answer === true,
          },
          {
            label: "B",
            value: "False",
            correct: withAnswers && question?.answer === false,
          },
        ];
        const optionsHtml = tfOptions
          .map(
            (opt) =>
              `<div class="opt ${opt.correct ? "opt-correct" : ""}"><span class="opt-prefix">${
                opt.label
              }.</span> ${opt.value}</div>`,
          )
          .join("");
        return `<div class="q-card">${qHeader}<div class="q-text">${escapeHtml(
          question?.statement || "-",
        )}</div><div class="opt-grid">${optionsHtml}</div></div>`;
      }

      const points = Array.isArray(question?.answerKeyPoints)
        ? question.answerKeyPoints
            .map((point) => `<li>${escapeHtml(point)}</li>`)
            .join("")
        : "";
      const sampleAnswer = question?.sampleAnswer
        ? `<div class="sample-answer"><strong>Sample Answer:</strong> ${escapeHtml(
            question.sampleAnswer,
          )}</div>`
        : "";
      const answerBlock = `<div class="answer-card px-5 pb-5 pt-3">${
        points ? `<ul>${points}</ul>` : "<div>- No key points provided.</div>"
      }${sampleAnswer}</div>`;
      const blankBlock = `<div class="desc-space" style="height:${fallbackDescHeight(
        question,
      )}px;"></div>`;
      return `<div class="q-card">${qHeader}<div class="q-text">${escapeHtml(
        question?.question || "-",
      )}</div>${withAnswers ? answerBlock : blankBlock}</div>`;
    })
    .join("");

  return `
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #143f77;
        font-family: "Poppins", sans-serif;
      }
      .paper {
        width: 100%;
        max-width: 750px;
        margin: 0 auto;
        padding: 8px;
      }
      .mode {
        display: inline-block;
        margin: 0 0 8px auto;
        border: 1px solid #d2e0fb;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        color: #6e86a7;
        background: #f4f8ff;
      }
      .head {
        display: grid;
        grid-template-columns: 32% 36% 32%;
        align-items: start;
        gap: 10px;
        margin-bottom: 14px;
      }
      .head-col {
        font-size: 13px;
        font-weight: 700;
        color: #1b3f73;
        line-height: 1.45;
        word-break: break-word;
      }
      .head-col.right { text-align: right; }
      .title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        color: #113d77;
        line-height: 1.2;
        word-break: break-word;
      }
      .subtitle {
        margin-top: 4px;
        text-align: center;
        font-size: 11px;
        color: #6e86a7;
        font-weight: 700;
        word-break: break-word;
      }
      .instruction-card {
        border: 1px solid #d2dffc;
        border-radius: 16px;
        background: #e8eef8;
        padding: 14px 16px;
        margin-bottom: 14px;
      }
      .instruction-title {
        margin: 0 0 8px;
        font-size: 15px;
        color: #6f88aa;
        font-weight: 700;
      }
      .instruction-list {
        margin: 0;
        padding-left: 20px;
        color: #4f688d;
        font-size: 13px;
        line-height: 1.55;
      }
      .q-card {
        border: 0px solid #c8d9fb;
        border-radius: 16px;
        padding: 0px;
        margin-bottom: 20px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .q-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
        color: #859bbe;
        font-size: 14px;
        font-weight: 500;
      }
      .q-text {
        font-size: 14px;
        color: #123d76;
        font-weight: 500;
        line-height: 1.42;
        margin-bottom: 14px;
      }
      .opt-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .opt {
        border: 0px solid #a8c1f5;
        border-radius: 10px;
        background: #fff;
        padding: 0px;
        color: #143f77;
        font-size: 14px;
        font-weight: 500;
        word-break: break-word;
      }
      .opt-prefix { font-weight: 500; }
      .opt-correct {
        border-color: #42d961;
        background: #e7f8e8;
        height: 38px;
        padding-left: 8px;
        padding-right: 8px;
      }
      .answer-card {
        border: 1px solid #95de9f;
        border-radius: 10px;
        background: #fff;
        height: auto;
        color: #000;
        font-size: 14px;
        line-height: 1.5;
      }
      .answer-card ul {
        margin: 0;
        padding-left: 10px;
        list-style-type: disc;
      }
      .sample-answer { margin-top: 8px; }
      .desc-space {
        border: 0px solid #b6caef;
        border-radius: 10px;
        background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 23px, #dbe7fb 24px);
      }
      @page { size: A4; margin: 4mm; }
    </style>
    <div class="paper">
      ${
        withAnswers
          ? ""
          : `<div class="mb-3">
      <p class="text-gray-600 text-sm mb-1.5">Name:</p>
      <p class="text-gray-600 text-sm">Roll Number:</p>
      </div>`
      }
      <div class="grid grid-cols-12 gap-2 mb-6">
        <div class="col-span-3">
          <div class="text-sm font-medium text-gray-800">Class: ${escapeHtml(classWithSection || "NA")}</div>
          <div class="text-sm font-medium text-gray-800">Subject: ${escapeHtml(meta?.subject || "NA")}</div>
        </div>
        <div class="col-span-6">
          <div class="text-2xl font-medium text-gray-800 text-center">${escapeHtml(meta?.testName || "AI Test")}</div>
        </div>
        <div class="col-span-3">
          <div class="text-sm font-medium text-gray-800">Duration: ${toInt(meta?.durationMins) || "NA"} Minutes</div>
          <div class="text-sm font-medium text-gray-800">Total Marks: ${totalMarks} Marks</div>
        </div>
      </div>
      <div class="border border-blue-50 bg-blue-100 rounded-lg px-4 pt-1 pb-4 mb-6">
        <div class="text-base font-medium text-gray-800">Test Instructions:</div>
        <ul class="mt-2 list-none text-sm text-slate-500">
          ${instructionLines.map((line, index) => `<li class="mb-1 leading-6">${index + 1}. ${escapeHtml(line)}</li>`).join("")}
        </ul>
      </div>
      ${questionHtml}
    </div>
  `;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition hover:border-indigo-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15";
const invalidInputClass =
  "w-full rounded-xl border border-red-300 bg-white/80 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-red-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/15";

const STEPS = [
  { id: 1, title: "Class details", hint: "Who the test is for" },
  { id: 2, title: "Test setup", hint: "Shape of the paper" },
];

/* ---------- Small building blocks ---------- */

const Stepper = ({ current }) => (
  <ol className="flex items-center gap-2 sm:gap-3">
    {STEPS.map((item, idx) => {
      const isDone = current > item.id;
      const isActive = current === item.id;
      return (
        <React.Fragment key={item.id}>
          <li className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                isDone || isActive
                  ? "bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-sm shadow-indigo-500/30"
                  : "border border-slate-200 bg-white text-slate-400"
              }`}
            >
              {isDone ? <HiCheck className="h-4 w-4" /> : item.id}
            </span>
            {/* Phones only have room for one label, so the inactive step keeps
                just its badge; both labels return from sm up. */}
            <span className={`min-w-0 ${isActive ? "" : "hidden sm:block"}`}>
              <span
                className={`block truncate text-sm font-bold ${
                  isActive ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {item.title}
              </span>
              <span className="hidden truncate text-xs text-slate-400 sm:block">
                {item.hint}
              </span>
            </span>
          </li>
          {idx < STEPS.length - 1 ? (
            <li
              aria-hidden="true"
              className={`h-0.5 w-8 shrink-0 rounded-full sm:w-16 ${
                current > item.id
                  ? "bg-gradient-to-r from-indigo-600 to-sky-500"
                  : "bg-slate-200"
              }`}
            />
          ) : null}
        </React.Fragment>
      );
    })}
  </ol>
);

const SectionHeading = ({ step, title, hint }) => (
  <div className="mb-5 flex items-start gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-[11px] font-bold text-white shadow-sm shadow-indigo-500/30">
      {step}
    </span>
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        {title}
      </h2>
      {hint ? (
        <p className="mt-0.5 text-sm leading-6 text-slate-500">{hint}</p>
      ) : null}
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-gray-800">
      {label}
    </label>
    {children}
    {hint ? (
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>
    ) : null}
  </div>
);

/** One answer option. Shared by MCQ choices and the True/False pair. */
const OptionRow = ({ label, text, correct }) => (
  <div
    className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
      correct
        ? "border-emerald-300 bg-emerald-50 font-semibold text-slate-900"
        : "border-slate-200 bg-white text-slate-700"
    }`}
  >
    <span
      className={`font-bold ${correct ? "text-emerald-700" : "text-slate-400"}`}
    >
      {label}.
    </span>
    <span className="min-w-0 flex-1 break-words">{text}</span>
    {correct ? (
      <HiCheck
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        aria-label="Correct answer"
      />
    ) : null}
  </div>
);

const StepProgress = ({ filled, total }) => (
  <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-500 ease-out"
        style={{ width: `${(filled / total) * 100}%` }}
      />
    </div>
    <span className="text-xs font-semibold tabular-nums text-slate-500">
      {filled}/{total}
    </span>
  </div>
);

const AITestGeneratorPage = () => {
  const {
    user,
    openSignInModal,
    openSubscriptionModal: openGlobalSubscriptionModal,
    isSubscriptionModalOpen,
    hasActiveSubscription,
    subscriptionStatusLoading,
  } = useContext(UserContext);
  const previewRef = useRef(null);
  const [step, setStep] = useState(1);
  const [board, setBoard] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [testName, setTestName] = useState("");
  const [language, setLanguage] = useState("English");
  const [blooms, setBlooms] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [noOfQuestions, setNoOfQuestions] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [qTypes, setQTypes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(-1);
  const [aiResult, setAiResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hasAutoOpenedLimitModal, setHasAutoOpenedLimitModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(() =>
    getUserSubscriptionStatus(user),
  );

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
      sourceTool: GUEST_AI_TOOL_KEYS.AI_TEST,
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

  const distribution = useMemo(
    () =>
      buildDistribution({
        totalMarks,
        totalQuestions: noOfQuestions,
        qTypes,
      }),
    [noOfQuestions, qTypes, totalMarks],
  );

  const prompt = useMemo(
    () => `
Generate an assessment test in JSON format.
Context:
- Board: ${board || "NA"}
- Class: ${className || "NA"}
- Section: ${section || "NA"}
- Subject: ${subject || "NA"}
- Topic: ${topic || "NA"}
- Test Name: ${testName || "NA"}
- Language: ${language || "NA"}
- Bloom's Level: ${blooms || "NA"}
- Duration (minutes): ${durationMins || "NA"}
- Total Questions: ${distribution.totalQuestions}
- User Total Marks Target: ${toInt(totalMarks) || "NA"}
- Question Types: ${JSON.stringify(qTypes)}
- Type-wise Questions: ${JSON.stringify(distribution.counts)}
Return ONLY valid JSON:
{
  "meta": { "board":"...", "className":"...", "section":"...", "subject":"...", "topic":"...", "testName":"...", "durationMins":45, "totalMarks":100, "noOfQuestions":20 },
  "questions": [
    { "type":"MCQ", "question":"...", "options":["...","...","...","..."], "answerIndex":0, "marks":2 },
    { "type":"TF", "statement":"...", "answer":true, "marks":1 },
    { "type":"DESC", "question":"...", "answerKeyPoints":["..."], "sampleAnswer":"...", "marks":5 }
  ]
}
Rules: create exactly ${distribution.totalQuestions} questions and match all type-wise counts exactly.
- MCQ and T/F must be only 1 or 2 marks per question.
- Descriptive questions must be only 3, 4, or 5 marks each.
`,
    [
      board,
      blooms,
      className,
      distribution.counts,
      distribution.totalQuestions,
      durationMins,
      language,
      qTypes,
      section,
      subject,
      testName,
      totalMarks,
      topic,
    ],
  );

  const validateStepOne = () => {
    if (!board) return "Board is required.";
    if (!className.trim()) return "Class is required.";
    if (!section.trim()) return "Section is required.";
    if (!subject.trim()) return "Subject is required.";
    if (!topic.trim()) return "Topic is required.";
    if (!testName.trim()) return "Test name is required.";
    return "";
  };

  const validateStepTwo = () => {
    if (!blooms) return "Bloom's taxonomy is required.";
    if (!language) return "Language is required.";
    if (toInt(durationMins) <= 0) return "Duration must be a positive number.";
    if (toInt(noOfQuestions) <= 0)
      return "No. of questions must be a positive number.";
    if (!isValidTotalMarks(totalMarks))
      return "Total marks must be 20 to 100 in steps of 5 (20, 25, 30 ... 100).";
    if (!qTypes.length) return "Select at least one question type.";
    if (!distribution.isReady)
      return distribution.error || "Marks distribution is not ready.";
    return "";
  };

  const validateBeforeGenerate = () => validateStepOne() || validateStepTwo();

  const toggleQType = (key) => {
    setQTypes((prev) =>
      prev.includes(key) ? prev.filter((type) => type !== key) : [...prev, key],
    );
  };

  const handleNextStep = () => {
    const message = validateStepOne();
    if (message) {
      toast.error(message);
      return;
    }
    setStep(2);
  };

  const handlePreviousStep = () => {
    setStep(1);
  };

  const requireLoginAfterFreeAttempt = () => {
    if (user) return false;
    if (canUseAiToolAsGuest(GUEST_AI_TOOL_KEYS.AI_TEST)) return false;
    openSignInModal?.();
    return true;
  };

  const requireGenerationAccess = () => {
    if (!user) return false;
    const status = getUserSubscriptionStatus(user);
    setSubscriptionStatus(status);
    if (status.canGenerate) return false;
    openGlobalSubscriptionModal({
      reason: "trial_expired",
      sourceTool: GUEST_AI_TOOL_KEYS.AI_TEST,
    });
    return true;
  };

  const requireDownloadAccess = () => {
    if (!user) {
      openSignInModal?.();
      toast.info("Please sign in and upgrade to Premium to download.");
      return true;
    }
    const status = getUserSubscriptionStatus(user);
    setSubscriptionStatus(status);
    if (status.canDownload) return false;
    openGlobalSubscriptionModal({
      reason: "download_locked",
      sourceTool: GUEST_AI_TOOL_KEYS.AI_TEST,
    });
    return true;
  };

  const handleGenerate = async () => {
    const message = validateBeforeGenerate();
    if (message) {
      toast.error(message);
      return;
    }
    if (requireLoginAfterFreeAttempt()) return;
    if (requireGenerationAccess()) return;

    setAiResult(null);
    setSelectedIds([]);
    setIsGenerating(true);
    try {
      const response = await fetchLessonPlan(prompt);
      const payload = parseJsonPayload(response);
      const normalized = normalizeQuestions(payload, {
        board,
        className,
        section,
        subject,
        topic,
        testName,
        language,
        blooms,
        durationMins: toInt(durationMins),
        totalMarks: toInt(totalMarks),
      });
      if (!normalized.questions.length)
        throw new Error("AI generated no questions.");

      const marksAdjusted = enforceMarksRules(normalized.questions);
      setAiResult({
        ...normalized,
        meta: {
          ...normalized.meta,
          board,
          totalMarks: marksAdjusted.totalMarks,
        },
        questions: marksAdjusted.questions,
      });
      setSelectedIds([]);
      if (!user) {
        consumeAiToolGuestUse(GUEST_AI_TOOL_KEYS.AI_TEST);
      } else {
        // The trial is time-based, so generating costs nothing — but re-read it
        // anyway to catch a trial that lapsed while this session was open.
        const nextStatus = getUserSubscriptionStatus(user);
        setSubscriptionStatus(nextStatus);
        if (!nextStatus.canGenerate) {
          openGlobalSubscriptionModal({
            reason: "trial_expired",
            sourceTool: GUEST_AI_TOOL_KEYS.AI_TEST,
          });
          setHasAutoOpenedLimitModal(true);
        }
      }

      setTimeout(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (e) {
      toast.error(e?.message || "Failed to generate AI test.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectQuestion = (questionId) => {
    const key = String(questionId);
    if (selectedIds.includes(key)) {
      setSelectedIds((prev) => prev.filter((id) => id !== key));
      return;
    }

    const question = aiResult?.questions?.find(
      (q, idx) => String(q?.id ?? idx + 1) === key,
    );
    const questionMarks = toInt(question?.marks);

    if (selectedMarks + questionMarks > targetTotalMarks) {
      toast.error(`You cannot select more than ${targetTotalMarks} marks.`);
      return;
    }

    setSelectedIds((prev) => [...prev, key]);
  };

  const jumpToQuestion = (questionId) => {
    const node = document.getElementById(`ai-question-${questionId}`);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRegenerateQuestion = async (index) => {
    const target = aiResult?.questions?.[index];
    if (!target || regeneratingIndex >= 0) return;
    if (requireLoginAfterFreeAttempt()) return;

    setRegeneratingIndex(index);

    const meta = aiResult?.meta || {};
    const baseContext = `
Board: ${meta.board || board || "NA"}
Class: ${meta.className || className || "NA"}
Section: ${meta.section || section || "NA"}
Subject: ${meta.subject || subject || "NA"}
Topic: ${meta.topic || topic || "NA"}
Test Name: ${meta.testName || testName || "NA"}
Language: ${meta.language || language || "NA"}
Bloom's Level: ${meta.blooms || blooms || "NA"}
`;

    const typeRules =
      target.type === "MCQ"
        ? `Return ONLY one JSON object:
{"type":"MCQ","question":"...","options":["...","...","...","..."],"answerIndex":0,"marks":${toInt(target.marks)}}
Rules: keep marks exactly ${toInt(target.marks)} and provide exactly 4 options.`
        : target.type === "TF"
          ? `Return ONLY one JSON object:
{"type":"TF","statement":"...","answer":true,"marks":${toInt(target.marks)}}
Rules: keep marks exactly ${toInt(target.marks)} and keep answer boolean.`
          : `Return ONLY one JSON object:
{"type":"DESC","question":"...","answerKeyPoints":["..."],"sampleAnswer":"...","marks":${toInt(target.marks)}}
Rules: keep marks exactly ${toInt(target.marks)} and provide meaningful answer points.`;

    const singlePrompt = `
Regenerate only one assessment question.
${baseContext}
Question Type: ${target.type}
Current Question: ${target.type === "TF" ? target.statement : target.question}
${typeRules}
No markdown. No extra text.
`;

    try {
      const response = await fetchLessonPlan(singlePrompt);
      const singlePayload = parseSingleQuestionPayload(response);
      const normalizedOne = normalizeQuestions(
        { questions: [singlePayload] },
        meta,
      ).questions[0];

      if (!normalizedOne)
        throw new Error("Could not regenerate this question.");

      setAiResult((prev) => {
        if (!prev?.questions) return prev;
        const nextQuestions = [...prev.questions];
        nextQuestions[index] = mergeRegeneratedQuestion(
          nextQuestions[index],
          normalizedOne,
        );
        return {
          ...prev,
          questions: nextQuestions,
          meta: {
            ...prev.meta,
            totalMarks: sumMarks(nextQuestions),
          },
        };
      });
    } catch (e) {
      toast.error(e?.message || "Failed to regenerate question.");
    } finally {
      setRegeneratingIndex(-1);
    }
  };

  const collectSelectedQuestions = () => {
    if (!aiResult?.questions?.length) return [];
    return aiResult.questions.filter((question, idx) =>
      selectedIds.includes(String(question?.id ?? idx + 1)),
    );
  };

  const exportSelectedQuestionsPdf = async ({
    withAnswers,
    filenameSuffix,
  }) => {
    if (!aiResult?.questions?.length || isPdfLoading) return;
    const selectedQuestions = collectSelectedQuestions();
    if (!selectedQuestions.length) {
      toast.error("Select at least one question to export PDF.");
      return;
    }
    const selectedTotalMarks = sumMarks(selectedQuestions);
    if (selectedTotalMarks < targetTotalMarks) {
      toast.error(
        `Selected questions are ${selectedTotalMarks} marks. Please select exactly ${targetTotalMarks} marks before download.`,
      );
      return;
    }
    if (selectedTotalMarks > targetTotalMarks) {
      toast.error(
        `Selected marks cannot exceed ${targetTotalMarks}. Please adjust selection.`,
      );
      return;
    }

    setIsPdfLoading(true);
    const filename = `${filenameSafe(aiResult.meta?.testName)}-${filenameSuffix}.pdf`;
    const exportWithHtmlFallback = async () => {
      const { default: html2pdf } = await import("html2pdf.js");
      const source = document.createElement("div");
      source.style.width = "730px";
      source.style.background = "#ffffff";
      source.style.margin = "0";
      source.style.padding = "0";
      source.innerHTML = buildFallbackPaperHtml(
        aiResult.meta,
        selectedQuestions,
        withAnswers,
      );
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: Math.min(4, (window.devicePixelRatio || 1) * 2),
            useCORS: true,
            backgroundColor: "#ffffff",
            letterRendering: true,
            logging: false,
            windowWidth: 730,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(source)
        .save();
    };

    try {
      const [{ pdf }, { default: AITestPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./AITestPdfDocument"),
      ]);
      const blob = await pdf(
        <AITestPdfDocument
          meta={aiResult.meta}
          questions={selectedQuestions}
          withAnswers={withAnswers}
        />,
      ).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const message = String(e?.message || "");
      if (message.toLowerCase().includes("unitsperem")) {
        try {
          await exportWithHtmlFallback();
          return;
        } catch (fallbackError) {
          toast.error(
            fallbackError?.message || "Could not export PDF. Please try again.",
          );
          return;
        }
      }
      toast.error(message || "Could not export PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrintWithAnswers = () => {
    if (requireDownloadAccess()) return;
    exportSelectedQuestionsPdf({
      withAnswers: true,
      filenameSuffix: "answer-key",
    });
  };

  const handleDownloadPdf = () => {
    if (requireDownloadAccess()) return;
    exportSelectedQuestionsPdf({
      withAnswers: false,
      filenameSuffix: "question-paper",
    });
  };

  const counts = aiResult?.questions
    ? countByType(aiResult.questions)
    : { MCQ: 0, TF: 0, DESC: 0 };
  const totalGeneratedMarks = aiResult?.questions
    ? sumMarks(aiResult.questions)
    : 0;
  const selectedQuestions = aiResult?.questions
    ? aiResult.questions.filter((question, idx) =>
        selectedIds.includes(String(question?.id ?? idx + 1)),
      )
    : [];
  const selectedCounts = selectedQuestions.length
    ? countByType(selectedQuestions)
    : { MCQ: 0, TF: 0, DESC: 0 };
  const selectedMarks = selectedQuestions.length
    ? sumMarks(selectedQuestions)
    : 0;
  const totalTypeMarks = aiResult?.questions
    ? marksByType(aiResult.questions)
    : { MCQ: 0, TF: 0, DESC: 0 };
  const selectedTypeMarks = selectedQuestions.length
    ? marksByType(selectedQuestions)
    : { MCQ: 0, TF: 0, DESC: 0 };

  // The paper must be selected to exactly this many marks before it can be
  // downloaded. Falls back to what was generated when step 2 asked for nothing.
  const targetTotalMarks = toInt(totalMarks) || totalGeneratedMarks;
  const marksToGo = Math.max(0, targetTotalMarks - selectedMarks);
  const isSelectionComplete =
    targetTotalMarks > 0 && selectedMarks === targetTotalMarks;
  const selectionPercent = targetTotalMarks
    ? Math.min(100, (selectedMarks / targetTotalMarks) * 100)
    : 0;

  const showMarksError =
    totalMarks.trim().length > 0 && !isValidTotalMarks(totalMarks);
  // Mirrors validateStepOne/validateStepTwo so the meter tracks what actually gates the step.
  const stepFields =
    step === 1
      ? [
          board,
          className,
          section.trim(),
          subject.trim(),
          topic.trim(),
          testName.trim(),
        ]
      : [
          blooms,
          language,
          durationMins,
          noOfQuestions,
          isValidTotalMarks(totalMarks) ? totalMarks : "",
          qTypes.length ? "set" : "",
        ];
  const stepFilled = stepFields.filter(Boolean).length;

  return (
    <>
      <main className="relative min-h-screen bg-[#f7fbff] text-slate-950">
        <DashboardNavbar />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 overflow-hidden"
        >
          <div className="mx-auto flex max-w-6xl justify-between">
            <div className="h-72 w-72 -translate-x-24 rounded-full bg-indigo-300/25 blur-3xl animate-blob" />
            <div className="h-72 w-72 translate-x-24 rounded-full bg-sky-300/25 blur-3xl animate-blob [animation-delay:3s]" />
          </div>
        </div>

        <section className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
          <div className="animate-fade-in-up">
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
              AI Test Generator
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Create AI tests, print answer keys, and download student question
              paper for exam.
            </p>
          </div>

          <div className="animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <span
              aria-hidden="true"
              className="block h-1 bg-gradient-to-r from-indigo-600 to-sky-500"
            />

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
              <Stepper current={step} />
              <StepProgress filled={stepFilled} total={stepFields.length} />
            </div>

            <div className="p-5 sm:p-7">
              {step === 1 ? (
                <>
                  <SectionHeading
                    step="1"
                    title="Which class is this for?"
                    hint="Select the class so the AI can generate questions aligned with that grade’s syllabus and level."
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Board">
                      <SelectDropdown
                        value={board}
                        onChange={setBoard}
                        options={BOARD_OPTIONS}
                        placeholder="Select Board"
                        ariaLabel="Board"
                      />
                    </Field>
                    <Field label="Class">
                      <SelectDropdown
                        value={className}
                        onChange={setClassName}
                        options={CLASS_OPTIONS}
                        placeholder="Select Class"
                        ariaLabel="Class"
                      />
                    </Field>
                    <Field label="Section">
                      <input
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. A"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Subject">
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Science"
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      label="Topic"
                      hint="Be specific — “Newton’s Third Law” beats “Motion”."
                    >
                      <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Newton's Laws of Motion"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Test Name">
                      <input
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="e.g. Motion Test - 1"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <SectionHeading
                    step="2"
                    title="How should the paper look?"
                    hint="Set the depth, length and question mix for this test."
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field
                      label="Bloom's Taxonomy"
                      hint="The thinking level the questions should target."
                    >
                      <SelectDropdown
                        value={blooms}
                        onChange={setBlooms}
                        options={BLOOM_OPTIONS}
                        placeholder="Select Bloom's"
                        ariaLabel="Bloom's taxonomy"
                      />
                    </Field>
                    <Field label="Language">
                      <SelectDropdown
                        value={language}
                        onChange={setLanguage}
                        options={LANGUAGE_OPTIONS}
                        placeholder="Select Language"
                        ariaLabel="Language"
                      />
                    </Field>
                    <Field label="Duration (mins)">
                      <input
                        value={durationMins}
                        onChange={(e) =>
                          setDurationMins(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="e.g. 45"
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="No. of Questions">
                      <input
                        value={noOfQuestions}
                        onChange={(e) =>
                          setNoOfQuestions(
                            e.target.value.replace(/[^0-9]/g, ""),
                          )
                        }
                        placeholder="e.g. 20"
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Total Marks" hint="20 to 100, in steps of 5.">
                      <input
                        value={totalMarks}
                        onChange={(e) =>
                          setTotalMarks(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="e.g. 25"
                        inputMode="numeric"
                        aria-invalid={showMarksError}
                        className={
                          showMarksError ? invalidInputClass : inputClass
                        }
                      />
                    </Field>
                  </div>

                  <div className="my-7 border-t border-dashed border-slate-200" />

                  <SectionHeading
                    step="3"
                    title="Question types"
                    hint="Pick one or more — questions are split evenly across the types you choose."
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {QUESTION_TYPES.map((type) => {
                      const active = qTypes.includes(type.key);
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleQType(type.key)}
                          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                            active
                              ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-sky-50 shadow-md ring-1 ring-indigo-300"
                              : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                          }`}
                        >
                          {active ? (
                            <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                              <HiCheck className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                              active
                                ? "bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-sm shadow-indigo-500/30"
                                : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span
                            className={`mt-3 block text-sm font-bold ${
                              active ? "text-indigo-700" : "text-slate-800"
                            }`}
                          >
                            {type.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                            {type.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* col-reverse on phones: DOM order stays Previous -> primary for
                  tab order, while the primary action sits on top of the stack. */}
              <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                {step === 2 ? (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-indigo-200 bg-white px-8 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto"
                  >
                    Previous
                  </button>
                ) : null}
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 sm:w-auto"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
                    <span className="relative">Next</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || isPdfLoading}
                    className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {!isGenerating ? (
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
                    ) : null}
                    <span className="relative flex items-center gap-2">
                      {isGenerating ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate Test <BsStars />
                        </>
                      )}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {aiResult?.questions?.length ? (
            <div
              ref={previewRef}
              className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <span
                  aria-hidden="true"
                  className="block h-1 bg-gradient-to-r from-indigo-600 to-sky-500"
                />

                <div className="p-4 sm:p-7">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handlePrintWithAnswers}
                      disabled={isPdfLoading}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <LuPrinter size={15} />
                      Answer Key
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isPdfLoading}
                      className="group relative inline-flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {!isPdfLoading ? (
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
                      ) : null}
                      <span className="relative flex items-center gap-2">
                        <LuDownload size={15} />
                        {isPdfLoading
                          ? "Preparing..."
                          : "Download Question Paper"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-5 text-center">
                    <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                      {aiResult.meta?.testName || "AI Test"}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {[
                        [
                          "Class",
                          `${aiResult.meta?.className || "NA"}${
                            aiResult.meta?.section
                              ? `-${aiResult.meta.section}`
                              : ""
                          }`,
                        ],
                        ["Subject", aiResult.meta?.subject || "NA"],
                        [
                          "Duration",
                          `${aiResult.meta?.durationMins || "NA"} min`,
                        ],
                        ["Total", `${totalGeneratedMarks} marks`],
                      ].map(([label, value]) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                        >
                          <span className="font-medium text-slate-400">
                            {label}
                          </span>
                          <span className="font-bold text-slate-700">
                            {value}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-sky-50/60 p-4 sm:p-5">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <HiOutlineClipboardDocumentList className="h-4 w-4 text-indigo-600" />
                      Test Instructions
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {[
                        `This question paper contains ${aiResult.questions.length} questions.`,
                        counts.MCQ
                          ? `There are ${counts.MCQ} MCQs (${totalTypeMarks.MCQ} marks total).`
                          : null,
                        counts.TF
                          ? `There are ${counts.TF} T/F questions (${totalTypeMarks.TF} marks total).`
                          : null,
                        counts.DESC
                          ? `There are ${counts.DESC} descriptive questions (${totalTypeMarks.DESC} marks total).`
                          : null,
                        counts.MCQ || counts.TF
                          ? "MCQ/T/F questions carry 1-2 marks each."
                          : null,
                        counts.DESC
                          ? "Descriptive questions carry 3-5 marks each."
                          : null,
                        `The duration of the test is ${
                          aiResult.meta?.durationMins || "NA"
                        } minutes.`,
                      ]
                        .filter(Boolean)
                        .map((line) => (
                          <li
                            key={line}
                            className="flex gap-2.5 text-sm leading-6 text-slate-600"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500" />
                            {line}
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="mt-6 space-y-3">
                    {aiResult.questions.map((question, idx) => {
                      const questionId = String(question.id || idx + 1);
                      const isSelected = selectedIds.includes(questionId);
                      const isRegenerating = regeneratingIndex === idx;
                      const questionMarks = toInt(question.marks);
                      const typeMeta = questionTypeMeta(question.type);
                      const disableSelection =
                        !isSelected &&
                        selectedMarks + questionMarks > targetTotalMarks;

                      return (
                        <div
                          id={`ai-question-${questionId}`}
                          key={questionId}
                          className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${
                            isSelected
                              ? "border-indigo-300 shadow-sm ring-1 ring-indigo-200"
                              : "border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <label
                                className={`inline-flex items-center gap-2.5 ${
                                  disableSelection
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                                title={
                                  disableSelection
                                    ? `Adding this would exceed ${targetTotalMarks} marks`
                                    : undefined
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={disableSelection}
                                  onChange={() =>
                                    toggleSelectQuestion(questionId)
                                  }
                                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed"
                                />
                                <span className="text-sm font-bold text-slate-700">
                                  Question {idx + 1}
                                </span>
                              </label>
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                  background: `${typeMeta.dot}14`,
                                  color: typeMeta.dot,
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: typeMeta.dot }}
                                />
                                {typeMeta.short}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-600">
                                {questionMarks}{" "}
                                {questionMarks === 1 ? "Mark" : "Marks"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRegenerateQuestion(idx)}
                                disabled={isRegenerating}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-7 sm:w-7"
                                title="Regenerate question"
                                aria-label={`Regenerate question ${idx + 1}`}
                              >
                                <FiRefreshCcw
                                  size={13}
                                  className={
                                    isRegenerating ? "animate-spin" : ""
                                  }
                                />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 break-words text-sm font-semibold text-slate-900 sm:text-base">
                            {question.type === "TF"
                              ? question.statement
                              : question.question}
                          </div>

                          {question.type === "MCQ" ? (
                            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                              {(question.options || []).map((option, i) => (
                                <OptionRow
                                  key={`${question.id || idx + 1}-opt-${i}`}
                                  label={OPTION_LABELS[i]}
                                  text={option || "-"}
                                  correct={question.answerIndex === i}
                                />
                              ))}
                            </div>
                          ) : null}

                          {question.type === "TF" ? (
                            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                              <OptionRow
                                label="A"
                                text="True"
                                correct={question.answer === true}
                              />
                              <OptionRow
                                label="B"
                                text="False"
                                correct={question.answer === false}
                              />
                            </div>
                          ) : null}

                          {question.type === "DESC" ? (
                            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                Answer key
                              </p>
                              {question.answerKeyPoints?.length ? (
                                <ul className="mt-2 space-y-1.5">
                                  {question.answerKeyPoints.map((point, i) => (
                                    <li
                                      key={`${question.id || idx + 1}-point-${i}`}
                                      className="flex gap-2.5 text-sm leading-6 text-slate-700"
                                    >
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                      <span className="min-w-0 break-words">
                                        {point}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-sm text-slate-400">
                                  No key points provided.
                                </p>
                              )}
                              {question.sampleAnswer ? (
                                <p className="mt-3 break-words border-t border-emerald-100 pt-2.5 text-sm leading-6 text-slate-700">
                                  <span className="font-bold text-slate-900">
                                    Sample answer:{" "}
                                  </span>
                                  {question.sampleAnswer}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* order-first on phones: stacked, the rail would otherwise land
                  below every question, hiding the marks target that gates the
                  download until you had scrolled past the whole paper. */}
              <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-6 lg:self-start">
                {/* Marks first: the paper must land on exactly the target before
                    it will download, so this is the rail's main job. */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div
                    className={`relative overflow-hidden px-4 py-4 transition-colors ${
                      isSelectionComplete
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                        : "bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
                    <div className="relative">
                      <p className="text-sm font-bold text-white">
                        Marks selected
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tabular-nums text-white">
                          {selectedMarks}
                        </span>
                        <span className="text-sm font-semibold text-white/75">
                          / {targetTotalMarks}
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                          style={{ width: `${selectionPercent}%` }}
                        />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/90">
                        {isSelectionComplete ? (
                          <>
                            <HiCheck className="h-3.5 w-3.5" />
                            Ready to download
                          </>
                        ) : (
                          `${marksToGo} more ${
                            marksToGo === 1 ? "mark" : "marks"
                          } to go`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>By type</span>
                    <span>Picked · Marks</span>
                  </div>
                  <div className="px-4">
                    {QUESTION_TYPES.map((type) => (
                      <div
                        key={`tally-${type.key}`}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 last:border-0"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: type.dot }}
                          />
                          {type.short}
                        </span>
                        <span className="flex items-center gap-2.5">
                          <span className="text-xs font-medium tabular-nums text-slate-400">
                            {selectedCounts[type.key]}/{counts[type.key]}
                          </span>
                          <span className="inline-flex h-6 min-w-[34px] items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-bold tabular-nums text-slate-700">
                            {selectedTypeMarks[type.key]}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">
                      Question map
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Click to jump. Colour marks the picked ones.
                    </p>
                  </div>
                  <div className="p-4">
                    {/* Denser on phones, where the rail spans the full width;
                        back to 5 once it is a 300px column. */}
                    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
                      {aiResult.questions.map((question, idx) => {
                        const qid = String(question.id || idx + 1);
                        return (
                          <button
                            key={`map-${qid}`}
                            type="button"
                            onClick={() => jumpToQuestion(qid)}
                            className={`rounded-lg border py-1.5 text-[11px] font-bold transition hover:-translate-y-0.5 ${mapChipClass(
                              question.type,
                              selectedIds.includes(qid),
                            )}`}
                          >
                            Q{idx + 1}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
                      {QUESTION_TYPES.map((type) => (
                        <span
                          key={`legend-${type.key}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: type.dot }}
                          />
                          {type.short}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
      <AuthModal />
    </>
  );
};

export default AITestGeneratorPage;
