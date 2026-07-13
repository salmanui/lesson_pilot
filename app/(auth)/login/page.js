import AuthPage from "@/src/components/auth/AuthPage";

export const metadata = {
  title: "Sign in",
  description: "Sign in to LessonPilot to plan lessons and generate tests with AI.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function LoginRoute() {
  return <AuthPage initialMode="login" />;
}
