import RequireAuth from "@/src/components/auth/RequireAuth";
import TeacherLessonPlanPage from "@/src/components/ai/TeacherLessonPlanPage";

export const metadata = {
  title: "Teacher Lesson Plan",
  description: "Review and export the generated teacher lesson plan.",
  robots: { index: false, follow: false },
};

export default function TeacherLessonPlanRoute() {
  return (
    <RequireAuth>
      <TeacherLessonPlanPage />
    </RequireAuth>
  );
}
