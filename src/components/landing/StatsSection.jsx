const STATS = [
  { value: "10k+", label: "Teachers onboard" },
  { value: "500k+", label: "Lessons generated" },
  { value: "4.9/5", label: "Average rating" },
  { value: "120+", label: "Countries" },
];

export default function StatsSection() {
  return (
    <section className="border-y border-slate-200 bg-white hidden">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:px-8 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
