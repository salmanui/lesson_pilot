// Shared by the lesson plan and AI test generators so the two tools always
// offer the same boards.
//
// Values stay human-readable because getIncludeLine() in LessonPlanGenerator
// parses them to build the syllabus alignment line sent to the model.
export const BOARD_OPTIONS = [
  {
    // Keep the value bare: getIncludeLine() treats whatever precedes "SSC" as a
    // state name, so "SSC Board" would read "Board SSC (State Board)".
    value: "SSC",
    label: "SSC",
    description: "State Board — Secondary School Certificate",
  },
  {
    value: "CBSE",
    label: "CBSE",
    description: "Central Board of Secondary Education",
  },
  {
    value: "ICSE",
    label: "ICSE",
    description: "CISCE — Indian Certificate of Secondary Education",
  },
  {
    value: "ISC",
    label: "ISC",
    description: "CISCE — Indian School Certificate",
  },
  {
    value: "IB",
    label: "IB",
    description: "International Baccalaureate",
  },
  {
    value: "Cambridge (CAIE)",
    label: "Cambridge (CAIE)",
    description: "IGCSE and A-Levels",
  },
  {
    value: "NIOS",
    label: "NIOS",
    description: "National Institute of Open Schooling",
  },
  {
    value: "Maharashtra SSC",
    label: "Maharashtra SSC",
    description: "Maharashtra State Board",
  },
  {
    value: "Tamil Nadu State Board",
    label: "Tamil Nadu State Board",
    description: "Samacheer Kalvi",
  },
  {
    value: "Karnataka State Board",
    label: "Karnataka State Board",
    description: "KSEEB",
  },
  {
    value: "UP Board",
    label: "UP Board",
    description: "Uttar Pradesh Madhyamik Shiksha Parishad",
  },
];
