import {
  FiClipboard,
  FiFileText,
  FiCheckSquare,
  FiDownload,
  FiBookOpen,
  FiZap,
} from "react-icons/fi";
import SectionHeading from "./SectionHeading";

const FEATURES = [
  {
    icon: FiClipboard,
    title: "AI Lesson Plans",
    text: "Generate structured plans with objectives, activities, assessment ideas and classroom flow in seconds.",
  },
  {
    icon: FiFileText,
    title: "Smart Test Generator",
    text: "Build MCQs, true/false and descriptive questions tailored to any topic and grade level.",
  },
  {
    icon: FiCheckSquare,
    title: "Answer Keys & Marks",
    text: "Every test comes with a ready answer key and mark allocation — no manual work required.",
  },
  {
    icon: FiBookOpen,
    title: "Curriculum Aligned",
    text: "Content adapts to your subject, grade and topic so it fits right into your teaching plan.",
  },
  {
    icon: FiDownload,
    title: "Export to PDF",
    text: "Download clean, print-ready documents you can hand out in class or share digitally.",
  },
  {
    icon: FiZap,
    title: "Lightning Fast",
    text: "What used to take hours now takes a minute — so you can focus on your students.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-[#f7fbff]">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to prep faster"
          subtitle="A complete AI toolkit built for teachers — from the first idea to the printed handout."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-sky-500 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="lg:text-lg text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 lg:text-sm text-xs leading-5 lg:leading-6 text-slate-600">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
