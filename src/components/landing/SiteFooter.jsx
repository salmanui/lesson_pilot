import Link from "next/link";
import { BsStars } from "react-icons/bs";
import ScrollLink from "./ScrollLink";
import FooterToolsLinks from "./FooterToolsLinks";

// Section anchors (smooth-scroll, no URL hash).
const PRODUCT_LINKS = [
  { to: "features", label: "Features" },
  { to: "how-it-works", label: "How it works" },
  { to: "testimonials", label: "Testimonials" },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr] pt-12">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white">
                <BsStars className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-slate-900">LessonPilot</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              AI lesson plans and printable tests for teachers — classroom-ready in minutes.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Product</p>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <ScrollLink
                    to={link.to}
                    className="cursor-pointer text-sm text-slate-500 transition hover:text-indigo-600"
                  >
                    {link.label}
                  </ScrollLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Tools</p>
            <FooterToolsLinks />
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 py-6 text-center text-sm text-slate-400">
          © {year} LessonPilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
