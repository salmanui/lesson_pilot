import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const OPTION_LABELS = ["A", "B", "C", "D"];

const toInt = (value) => {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const safeText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E]/g, " ");

const sumMarks = (questions) =>
  questions.reduce((total, question) => total + toInt(question?.marks), 0);

const countByType = (questions) =>
  questions.reduce(
    (acc, question) => {
      if (acc[question?.type] != null) acc[question.type] += 1;
      return acc;
    },
    { MCQ: 0, TF: 0, DESC: 0 },
  );

const marksByType = (questions) =>
  questions.reduce(
    (acc, question) => {
      if (acc[question?.type] != null)
        acc[question.type] += toInt(question?.marks);
      return acc;
    },
    { MCQ: 0, TF: 0, DESC: 0 },
  );

const descriptiveLineCount = (question) => {
  const marks = Math.max(1, toInt(question?.marks));
  const answerHint = [
    ...(Array.isArray(question?.answerKeyPoints)
      ? question.answerKeyPoints
      : []),
    question?.sampleAnswer || "",
  ]
    .join(" ")
    .trim().length;
  const byMarks = marks * 2 + 2;
  const byHint = Math.ceil(answerHint / 80) + 4;
  return Math.max(6, Math.min(14, Math.max(byMarks, byHint)));
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingRight: 24,
    paddingBottom: 22,
    paddingLeft: 24,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#153f73",
    fontSize: 12,
  },
  pageNumber: {
    position: "absolute",
    right: 24,
    bottom: 12,
    color: "#7a93b7",
    fontSize: 9,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  modeBadge: {
    borderWidth: 1,
    borderColor: "#d4e2fb",
    borderRadius: 999,
    backgroundColor: "#f2f7ff",
    color: "#6e86a7",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerCol: {
    width: "30%",
  },
  headerColCenter: {
    width: "40%",
    alignItems: "center",
  },
  headerLeftText: {
    fontSize: 14,
    color: "#1b3f73",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.45,
  },
  headerRightText: {
    fontSize: 14,
    color: "#1b3f73",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.45,
    textAlign: "right",
  },
  testTitle: {
    fontSize: 30,
    color: "#113d77",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    textAlign: "center",
  },
  headerMeta: {
    marginTop: 5,
    fontSize: 11,
    color: "#6e86a7",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  instructionCard: {
    borderWidth: 1,
    borderColor: "#d2dffc",
    borderRadius: 16,
    backgroundColor: "#e8eef8",
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 14,
  },
  instructionTitle: {
    fontSize: 15,
    color: "#6f88aa",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  instructionItem: {
    fontSize: 12,
    color: "#4f688d",
    lineHeight: 1.55,
    marginBottom: 3,
  },
  qCard: {
    borderWidth: 1,
    borderColor: "#c8d9fb",
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 11,
  },
  qHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qNo: {
    fontSize: 13,
    color: "#859bbe",
    fontFamily: "Helvetica-Bold",
  },
  qMarks: {
    fontSize: 13,
    color: "#859bbe",
    fontFamily: "Helvetica-Bold",
  },
  qText: {
    fontSize: 15,
    color: "#123d76",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.42,
    marginBottom: 10,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionBox: {
    width: "48.8%",
    borderWidth: 1,
    borderColor: "#a8c1f5",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  optionCorrect: {
    borderColor: "#42d961",
    backgroundColor: "#e7f8e8",
  },
  optionText: {
    fontSize: 13,
    color: "#143f77",
    lineHeight: 1.35,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  answerCard: {
    borderWidth: 1,
    borderColor: "#95de9f",
    borderRadius: 10,
    backgroundColor: "#edfbf0",
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
  },
  answerPoint: {
    fontSize: 12,
    color: "#165b2e",
    lineHeight: 1.5,
    marginBottom: 3,
  },
  sampleAnswer: {
    fontSize: 12,
    color: "#165b2e",
    lineHeight: 1.5,
    marginTop: 6,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  descSpace: {
    borderWidth: 1,
    borderColor: "#b6caef",
    borderRadius: 10,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 7,
  },
  descLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#dbe7fb",
    height: 17,
    marginBottom: 4,
  },
  descLineLast: {
    marginBottom: 0,
  },
});

const OptionBox = ({ label, value, isCorrect }) => (
  <View style={[styles.optionBox, isCorrect ? styles.optionCorrect : null]}>
    <Text style={styles.optionText}>
      {label}. {value || "-"}
    </Text>
  </View>
);

export default function AITestPdfDocument({
  meta = {},
  questions = [],
  withAnswers = false,
}) {
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

  return (
    <Document
      title={`${meta?.testName || "AI Test"}${
        withAnswers ? " - Answer Key" : ""
      }`}
    >
      <Page size="A4" style={styles.page} wrap>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />

        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLeftText}>
              Class: {safeText(classWithSection || "NA")}
            </Text>
            <Text style={styles.headerLeftText}>
              Subject: {safeText(meta?.subject || "NA")}
            </Text>
            <Text style={styles.headerLeftText}>
              Board: {safeText(meta?.board || "NA")}
            </Text>
          </View>
          <View style={styles.headerColCenter}>
            <Text style={styles.testTitle}>
              {safeText(meta?.testName || "AI Test")}
            </Text>
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerRightText}>
              Duration: {toInt(meta?.durationMins) || "NA"} Minutes
            </Text>
            <Text style={styles.headerRightText}>
              Total Marks: {totalMarks}
            </Text>
          </View>
        </View>

        <View style={styles.instructionCard} wrap={false}>
          <Text style={styles.instructionTitle}>Test Instructions:</Text>
          {instructionLines.map((line, idx) => (
            <Text key={`instruction-${idx}`} style={styles.instructionItem}>
              - {safeText(line)}
            </Text>
          ))}
        </View>

        {questions.map((question, index) => {
          const id = question?.id || index + 1;
          if (question?.type === "MCQ") {
            const options = Array.isArray(question?.options)
              ? [...question.options]
              : [];
            while (options.length < 4) options.push("-");
            return (
              <View key={`q-${id}`} style={styles.qCard} wrap={false}>
                <View style={styles.qHead}>
                  <Text style={styles.qNo}>Question {index + 1}</Text>
                  <Text style={styles.qMarks}>
                    {toInt(question?.marks)} Marks
                  </Text>
                </View>
                <Text style={styles.qText}>
                  {safeText(question?.question || "-")}
                </Text>
                <View style={styles.optionGrid}>
                  {options.slice(0, 4).map((option, optionIndex) => (
                    <OptionBox
                      key={`q-${id}-opt-${optionIndex}`}
                      label={OPTION_LABELS[optionIndex]}
                      value={safeText(option)}
                      isCorrect={
                        withAnswers &&
                        toInt(question?.answerIndex) === optionIndex &&
                        option !== "-"
                      }
                    />
                  ))}
                </View>
              </View>
            );
          }

          if (question?.type === "TF") {
            const tfOptions = [
              {
                label: "A",
                value: "True",
                isCorrect: withAnswers && question?.answer === true,
              },
              {
                label: "B",
                value: "False",
                isCorrect: withAnswers && question?.answer === false,
              },
            ];
            return (
              <View key={`q-${id}`} style={styles.qCard} wrap={false}>
                <View style={styles.qHead}>
                  <Text style={styles.qNo}>Question {index + 1}</Text>
                  <Text style={styles.qMarks}>
                    {toInt(question?.marks)} Marks
                  </Text>
                </View>
                <Text style={styles.qText}>
                  {safeText(question?.statement || "-")}
                </Text>
                <View style={styles.optionGrid}>
                  {tfOptions.map((option, optionIndex) => (
                    <OptionBox
                      key={`q-${id}-tf-${optionIndex}`}
                      label={option.label}
                      value={option.value}
                      isCorrect={option.isCorrect}
                    />
                  ))}
                </View>
              </View>
            );
          }

          const answerKeyPoints = Array.isArray(question?.answerKeyPoints)
            ? question.answerKeyPoints
            : [];

          return (
            <View key={`q-${id}`} style={styles.qCard} wrap={false}>
              <View style={styles.qHead}>
                <Text style={styles.qNo}>Question {index + 1}</Text>
                <Text style={styles.qMarks}>
                  {toInt(question?.marks)} Marks
                </Text>
              </View>
              <Text style={styles.qText}>
                {safeText(question?.question || "-")}
              </Text>

              {withAnswers ? (
                <View style={styles.answerCard}>
                  {answerKeyPoints.length ? (
                    answerKeyPoints.map((point, pointIndex) => (
                      <Text
                        key={`q-${id}-point-${pointIndex}`}
                        style={styles.answerPoint}
                      >
                        - {safeText(point)}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.answerPoint}>
                      - No key points provided.
                    </Text>
                  )}
                  {question?.sampleAnswer ? (
                    <Text style={styles.sampleAnswer}>
                      <Text style={styles.bold}>Sample Answer: </Text>
                      {safeText(question.sampleAnswer)}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.descSpace}>
                  {Array.from({ length: descriptiveLineCount(question) }).map(
                    (_, lineIndex, arr) => (
                      <View
                        key={`q-${id}-line-${lineIndex}`}
                        style={[
                          styles.descLine,
                          lineIndex === arr.length - 1
                            ? styles.descLineLast
                            : null,
                        ]}
                      />
                    ),
                  )}
                </View>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
