import { FiStar } from "react-icons/fi";
import SectionHeading from "./SectionHeading";

const TESTIMONIALS = [
  {
    quote:
      "I used to spend my Sunday evenings writing lesson plans. Now it takes me ten minutes and the quality is better than ever.",
    name: "Aisha Rahman",
    role: "Science Teacher, Grade 8",
    initial: "A",
    color: "from-indigo-500 to-blue-500",
  },
  {
    quote:
      "The test generator is a lifesaver. Questions, answer keys, marks — all done. My whole department switched to it.",
    name: "Marcus Lee",
    role: "Head of Mathematics",
    initial: "M",
    color: "from-sky-500 to-cyan-500",
  },
  {
    quote:
      "It just gets what a classroom needs. The plans are practical, age-appropriate and ready to print. I'm hooked.",
    name: "Sofia Alvarez",
    role: "Primary School Teacher",
    initial: "S",
    color: "from-violet-500 to-fuchsia-500",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="scroll-mt-20 bg-[#f7fbff]">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by teachers everywhere"
          subtitle="Educators around the world are reclaiming their time with LessonPilot."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure
              key={item.name}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="mb-4 flex gap-1">
                {[0, 1, 2, 3, 4].map((star) => (
                  <FiStar key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-6 text-slate-700">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-sm font-bold text-white`}
                >
                  {item.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
