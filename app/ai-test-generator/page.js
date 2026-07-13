import RequireAuth from "@/src/components/auth/RequireAuth";
import AITestGeneratorPage from "@/src/components/ai/AITestGeneratorPage";

export const metadata = {
  title: "AI Test Generator",
  description: "Generate printable classroom tests and answer keys with AI.",
  robots: { index: false, follow: false },
};

export default function AITestGeneratorRoute() {
  return (
    <RequireAuth>
      <AITestGeneratorPage />
    </RequireAuth>
  );
}
