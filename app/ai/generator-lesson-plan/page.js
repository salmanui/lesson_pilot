import RequireAuth from "@/src/components/auth/RequireAuth";
import LessonPlanGenerator from "@/src/components/qeeb-deck/LessonPlanGenerator";

export const metadata = {
  title: "Generator Lesson Plan — LessonPilot",
  description: "Generate classroom-ready teacher lesson plans with AI.",
  robots: { index: false, follow: false },
};

export default function LessonPlanGeneratorRoute() {
  return (
    <RequireAuth>
      <LessonPlanGenerator />
    </RequireAuth>
  );
}
