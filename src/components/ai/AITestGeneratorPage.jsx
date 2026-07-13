"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { LuDownload, LuPrinter } from "react-icons/lu";
import { IoArrowBack } from "react-icons/io5";
import { FiRefreshCcw } from "react-icons/fi";
import { toast } from "react-toastify";
import { fetchLessonPlan } from "@/src/utils/ai/lessonPlanApi";
import { UserContext } from "@/src/utils/userContext";
import AuthModal from "../AuthModal";
import {
  GUEST_AI_TOOL_KEYS,
  canUseAiToolAsGuest,
  consumeAiToolGuestUse,
} from "@/src/utils/guestAiUsage";
import {
  consumeGenerationForUser,
  getUserSubscriptionStatus,
} from "@/src/utils/subscriptionApi";

const QUESTION_TYPES = [
  { key: "MCQ", label: "MCQ" },
  { key: "TF", label: "T/F" },
  { key: "DESC", label: "Descriptive" },
];
const LANGUAGES = ["English", "Hindi", "Telugu"];
const BOARD_OPTIONS = ["SSC", "CBSE", "ICSE"];
const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const BLOOMS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
];
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
  if (!selected) return "border-[#D1DFFC] bg-[#EAF0FA] text-[#8096B5]";
  if (type === "MCQ") return "border-[#FF5E5E] bg-[#FFE8E8] text-[#C23D3D]";
  if (type === "TF") return "border-[#BA7BFF] bg-[#F1E8FF] text-[#7E47C5]";
  return "border-[#2EDB8C] bg-[#E7FFF3] text-[#14774B]";
};

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
  "h-10 w-full rounded-lg border border-[#D1DFFC] bg-white px-3 text-sm font-medium text-[#193B68] outline-none placeholder:text-[#8FA4C3] focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-2 block text-sm font-medium text-[#193B68]";

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
    if (subscriptionStatus.remainingGenerations > 0) return;
    if (isSubscriptionModalOpen) return;
    openGlobalSubscriptionModal({
      reason: "generation_limit",
      sourceTool: GUEST_AI_TOOL_KEYS.AI_TEST,
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
      reason: "generation_limit",
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
        const nextStatus = consumeGenerationForUser({
          user,
          toolKey: GUEST_AI_TOOL_KEYS.AI_TEST,
        });
        setSubscriptionStatus(nextStatus);
        if (!nextStatus.canGenerate) {
          openGlobalSubscriptionModal({
            reason: "generation_limit",
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

    const targetTotalMarks = toInt(totalMarks) || totalGeneratedMarks;
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
    const targetTotalMarks = toInt(totalMarks) || totalGeneratedMarks;
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

  return (
    <>
      <div className="min-h-screen bg-[#D8DFEA] p-4 pb-10 md:p-6">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <header className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#c2d0eb] bg-white px-4 py-2 text-sm font-semibold text-[#193B68] hover:bg-[#f3f7ff]"
            >
              <IoArrowBack size={16} />
              Back to Home
            </Link>
          </header>

          <div>
            <h1 className="text-3xl font-semibold text-[#193B68]">
              AI Test Generator
            </h1>
            <p className="text-sm text-[#597295]">
              Create AI tests, print answer keys, and download student question
              paper for exam.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 md:rounded-[24px] md:p-8">
            <h2 className="text-2xl font-semibold text-[#193B68] md:text-3xl">
              Which class is this for?
            </h2>
            <p className="text-sm text-gray-500">
              Select the class so the AI can generate questions aligned with
              that grade’s syllabus and level.
            </p>

            {step === 1 ? (
              <div className="mt-6 grid gap-5 md:grid-cols-9 md:gap-8">
                <div className="md:col-span-3">
                  <label className={labelClass}>Board</label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Board</option>
                    {BOARD_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Class</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Class</option>
                    {CLASS_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Section</label>
                  <input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. A"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Science"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Test Name</label>
                  <input
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g. Motion Test - 1"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-12 md:gap-8">
                <div className="md:col-span-4">
                  <label className={labelClass}>Bloom&apos;s Taxonomy</label>
                  <select
                    value={blooms}
                    onChange={(e) => setBlooms(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Bloom&apos;s</option>
                    {BLOOMS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className={labelClass}>Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={inputClass}
                  >
                    {LANGUAGES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className={labelClass}>Duration (mins)</label>
                  <input
                    value={durationMins}
                    onChange={(e) =>
                      setDurationMins(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="e.g. 45"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className={labelClass}>No. of Questions</label>
                  <input
                    value={noOfQuestions}
                    onChange={(e) =>
                      setNoOfQuestions(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="e.g. 20"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Total Marks</label>
                  <input
                    value={totalMarks}
                    onChange={(e) =>
                      setTotalMarks(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="e.g. 25"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-5">
                  <label className={labelClass}>Question Types</label>
                  <div className="flex flex-wrap gap-3">
                    {QUESTION_TYPES.map((type) => {
                      const active = qTypes.includes(type.key);
                      return (
                        <button
                          key={type.key}
                          type="button"
                          onClick={() => toggleQType(type.key)}
                          className={`inline-flex items-center justify-center rounded-lg border px-5 py-3 text-sm font-medium leading-none ${
                            active
                              ? "border-[#4B85FF] bg-[#EAF2FF] text-[#2C5DAE]"
                              : "border-[#C8D9F8] bg-white text-[#3C5F8F] hover:bg-[#F5F8FF]"
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {step === 2 ? (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#2F6DE8] bg-white px-8 text-base font-medium text-[#2F6DE8] hover:bg-[#EEF4FF]"
                  >
                    Previous
                  </button>
                ) : null}
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#4282FF] px-8 text-base font-medium text-white hover:bg-[#2F6DE8]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || isPdfLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#4282FF] px-8 text-base font-medium text-white hover:bg-[#2F6DE8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
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
              <div className="rounded-xl border border-[#D1DFFC] bg-white p-4 md:rounded-[24px] md:p-7">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handlePrintWithAnswers}
                    disabled={isPdfLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2F6DE8] bg-white px-5 text-sm font-semibold text-[#2F6DE8] hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LuPrinter size={16} />
                    Download Answer Key
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isPdfLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2F6DE8] px-5 text-sm font-semibold text-white hover:bg-[#2458ba] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LuDownload size={16} />
                    {isPdfLoading
                      ? "Preparing For Download..."
                      : "Download Question Paper"}
                  </button>
                </div>

                <div className="mt-4 md:grid flex flex-col items-start gap-2 md:gap-4 md:grid-cols-[1fr_auto_1fr]">
                  <div className="text-[#193B68]">
                    <div className="text-base font-medium">
                      <span className="text-gray-500">Class: </span>
                      {aiResult.meta?.className || "NA"}
                      {aiResult.meta?.section
                        ? `-${aiResult.meta.section}`
                        : ""}
                    </div>
                    <div className="mt-1 text-base font-medium">
                      <span className="text-gray-500">Subject: </span>
                      {aiResult.meta?.subject || "NA"}
                    </div>
                  </div>

                  <div className="text-center text-3xl font-semibold leading-tight text-[#193B68]">
                    {aiResult.meta?.testName || "AI Test"}
                  </div>

                  <div className="md:justify-self-end md:text-right text-[#193B68]">
                    <div className="text-base font-medium">
                      <span className="text-gray-500">Duration:</span>{" "}
                      {aiResult.meta?.durationMins || "NA"} Minutes
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-indigo-50 p-4 md:rounded-2xl md:p-5">
                  <div className="text-lg font-medium text-[#7E91AF]">
                    Test Instructions:
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-500 md:pl-6 md:text-base">
                    <li>
                      This Question paper contains {aiResult.questions.length}{" "}
                      Questions.
                    </li>
                    {counts.MCQ ? (
                      <li>
                        There are {counts.MCQ} MCQs ({totalTypeMarks.MCQ} marks
                        total).
                      </li>
                    ) : null}
                    {counts.TF ? (
                      <li>
                        There are {counts.TF} T/F questions ({totalTypeMarks.TF}{" "}
                        marks total).
                      </li>
                    ) : null}
                    {counts.DESC ? (
                      <li>
                        There are {counts.DESC} descriptive questions (
                        {totalTypeMarks.DESC} marks total).
                      </li>
                    ) : null}
                    {counts.MCQ || counts.TF ? (
                      <li>MCQ/T/F questions carry 1-2 marks each.</li>
                    ) : null}
                    {counts.DESC ? (
                      <li>Descriptive questions carry 3-5 marks each.</li>
                    ) : null}
                    <li>
                      The duration of the test is{" "}
                      {aiResult.meta?.durationMins || "NA"} minutes.
                    </li>
                  </ul>
                </div>

                <div className="mt-6 space-y-4">
                  {aiResult.questions.map((question, idx) => {
                    const questionId = String(question.id || idx + 1);
                    const isSelected = selectedIds.includes(questionId);
                    const isRegenerating = regeneratingIndex === idx;
                    const targetTotalMarks =
                      toInt(totalMarks) || totalGeneratedMarks;
                    const disableSelection =
                      !isSelected &&
                      selectedMarks + toInt(question.marks) > targetTotalMarks;

                    return (
                      <div
                        id={`ai-question-${questionId}`}
                        key={questionId}
                        className={`rounded-xl border border-[#D1DFFC] bg-white p-4 md:rounded-[20px] md:p-5 ${
                          isSelected ? "" : "opacity-75"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegenerateQuestion(idx)}
                              disabled={isRegenerating}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#C8D9FA] text-[#315799] hover:bg-[#EDF4FF] disabled:cursor-not-allowed disabled:opacity-60"
                              title="Regenerate question"
                            >
                              <FiRefreshCcw
                                size={13}
                                className={isRegenerating ? "animate-spin" : ""}
                              />
                            </button>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disableSelection}
                              onChange={() => toggleSelectQuestion(questionId)}
                              className="h-5 w-5 rounded border border-[#BBD0F8] accent-[#2F6DE8]"
                            />
                            <div className="text-sm font-medium text-[#8A9CB5]">
                              Question {idx + 1}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-[#8A9CB5]">
                            {toInt(question.marks)} Marks
                          </div>
                        </div>

                        <div className="mt-3 text-sm font-semibold text-[#193B68] md:text-base">
                          {question.type === "TF"
                            ? question.statement
                            : question.question}
                        </div>

                        {question.type === "MCQ" ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {(question.options || []).map((option, i) => (
                              <div
                                key={`${question.id || idx + 1}-opt-${i}`}
                                className={`rounded-[10px] border px-4 py-3 text-sm font-medium ${
                                  question.answerIndex === i
                                    ? "border-[#42FF4F] bg-[#E7FFE9] text-[#193B68]"
                                    : "border-[#AFC7F6] bg-white text-[#193B68]"
                                }`}
                              >
                                {OPTION_LABELS[i]}. {option || "-"}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {question.type === "TF" ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div
                              className={`rounded-[10px] border px-4 py-3 text-sm font-medium ${
                                question.answer === true
                                  ? "border-[#42FF4F] bg-[#E7FFE9] text-[#193B68]"
                                  : "border-[#AFC7F6] bg-white text-[#193B68]"
                              }`}
                            >
                              True
                            </div>
                            <div
                              className={`rounded-[10px] border px-4 py-3 text-sm font-medium ${
                                question.answer === false
                                  ? "border-[#42FF4F] bg-[#E7FFE9] text-[#193B68]"
                                  : "border-[#AFC7F6] bg-white text-[#193B68]"
                              }`}
                            >
                              False
                            </div>
                          </div>
                        ) : null}

                        {question.type === "DESC" ? (
                          <div className="mt-3 rounded-xl bg-[#E1E7F3] p-3 md:p-4">
                            {question.answerKeyPoints?.length ? (
                              <ul className="list-disc space-y-1 pl-5 text-sm text-[#193B68] md:text-base">
                                {question.answerKeyPoints.map((point, i) => (
                                  <li
                                    key={`${question.id || idx + 1}-point-${i}`}
                                  >
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-[#8A9CB5]">
                                No key points provided.
                              </div>
                            )}
                            {question.sampleAnswer ? (
                              <div className="mt-3 text-sm text-[#193B68]">
                                <span className="font-semibold">
                                  Sample Answer:{" "}
                                </span>
                                {question.sampleAnswer}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                <div className="rounded-2xl border border-[#D1DFFC] bg-white p-4">
                  <div className="text-base font-semibold text-[#193B68]">
                    Question Map
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {aiResult.questions.map((question, idx) => {
                      const qid = String(question.id || idx + 1);
                      return (
                        <button
                          key={`map-${qid}`}
                          type="button"
                          onClick={() => jumpToQuestion(qid)}
                          className={`rounded-md border px-1 py-1 text-[11px] font-semibold transition ${mapChipClass(
                            question.type,
                            selectedIds.includes(qid),
                          )}`}
                        >
                          Q{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-1.5 text-xs text-[#193B68]">
                    <div className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF3B30]" />
                      <span className="font-medium">MCQ</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#A95CFF]" />
                      <span className="font-medium">T/F</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#24C27A]" />
                      <span className="font-medium">Descriptive</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D1DFFC] bg-white p-4">
                  <div className="text-base font-semibold text-[#193B68]">
                    Questions Selected
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">MCQ:</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold">
                          {selectedCounts.MCQ}
                        </span>
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold text-[#5A7498]">
                          {counts.MCQ}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">T/F:</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold">
                          {selectedCounts.TF}
                        </span>
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold text-[#5A7498]">
                          {counts.TF}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">Descriptive:</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold">
                          {selectedCounts.DESC}
                        </span>
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-[#E8EEF9] text-xs font-semibold text-[#5A7498]">
                          {counts.DESC}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D1DFFC] bg-white p-4">
                  <div className="text-base font-semibold text-[#193B68]">
                    Marks Allotted
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">MCQ:</span>
                      <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-md bg-[#E8EEF9] px-2 text-xs font-semibold">
                        {selectedTypeMarks.MCQ}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">T/F:</span>
                      <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-md bg-[#E8EEF9] px-2 text-xs font-semibold">
                        {selectedTypeMarks.TF}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#193B68]">
                      <span className="font-medium">Descriptive:</span>
                      <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-md bg-[#E8EEF9] px-2 text-xs font-semibold">
                        {selectedTypeMarks.DESC}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E4ECFB] pt-2 text-sm text-[#193B68]">
                      <span className="font-semibold">Total:</span>
                      <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-md bg-[#E8EEF9] px-2 text-xs font-semibold">
                        {selectedMarks}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
      <AuthModal />
    </>
  );
};

export default AITestGeneratorPage;
