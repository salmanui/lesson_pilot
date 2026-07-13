import RequireAuth from "@/src/components/auth/RequireAuth";
import TeacherToolsHome from "@/src/components/TeacherToolsHome";

export const metadata = {
  title: "Dashboard",
  description: "Your AI teaching tools — lesson plans and test generator.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <RequireAuth>
      <TeacherToolsHome />
    </RequireAuth>
  );
}
