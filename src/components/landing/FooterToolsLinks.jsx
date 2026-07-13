"use client";

import { useContext } from "react";
import Link from "next/link";
import { UserContext } from "@/src/utils/userContext";

const TOOLS = ["Lesson Plan Generator", "Test Generator"];

/**
 * Footer "Tools" links. They point to the gated dashboard only when the user
 * is signed in; otherwise they route to /login so the dashboard never opens
 * without authentication. (After login the user is sent on to /dashboard.)
 */
export default function FooterToolsLinks() {
  const { user, hasLoadedUser } = useContext(UserContext);
  const href = hasLoadedUser && user ? "/dashboard" : "/login";

  return (
    <ul className="mt-4 space-y-2.5">
      {TOOLS.map((label) => (
        <li key={label}>
          <Link
            href={href}
            className="text-sm text-slate-500 transition hover:text-indigo-600"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
