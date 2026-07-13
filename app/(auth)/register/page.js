import AuthPage from "@/src/components/auth/AuthPage";

export const metadata = {
  title: "Create account",
  description: "Create your LessonPilot account to start planning lessons with AI.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/register" },
};

export default function RegisterRoute() {
  return <AuthPage initialMode="register" />;
}
