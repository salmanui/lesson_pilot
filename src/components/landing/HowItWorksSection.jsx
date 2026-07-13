import SectionHeading from "./SectionHeading";

const STEPS = [
  {
    number: "01",
    title: "Tell us your topic",
    text: "Enter the subject, grade level and topic — that's all it takes to get started.",
  },
  {
    number: "02",
    title: "AI builds it for you",
    text: "Get a full lesson plan or a complete test with questions, answer keys and marks in seconds.",
  },
  {
    number: "03",
    title: "Review & export",
    text: "Tweak anything you like, then download a polished, print-ready PDF for your classroom.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From topic to classroom in 3 steps"
          subtitle="No setup, no learning curve. Just tell it what you need and let the AI do the heavy lifting."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-slate-200 bg-[#f7fbff] p-7 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
