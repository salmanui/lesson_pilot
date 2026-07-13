/**
 * Reusable section header: small uppercase eyebrow, title and optional subtitle.
 */
export default function SectionHeading({ eyebrow, title, subtitle, center = true }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 md:text-base text-sm leading-6 lg:leading-8 text-slate-600">{subtitle}</p>}
    </div>
  );
}
