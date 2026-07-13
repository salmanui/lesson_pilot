"use client";

import { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";

const GSI_SRC = "https://accounts.google.com/gsi/client";

/**
 * Module-level singletons.
 *
 * The GSI script is loaded once and the client is initialized once for the
 * entire app lifetime. This is what prevents the FedCM console errors:
 *
 *   • NotAllowedError: "Only one navigator.credentials.get request may be
 *     outstanding at one time." — caused by firing a second credentials.get()
 *     (via One Tap `prompt()`) while a previous one is still in flight, which
 *     happens whenever the component re-mounts (React StrictMode double-invokes
 *     effects in dev, and toggling Sign in/Register re-runs the effect).
 *
 *   • AbortError: "signal is aborted without reason." — caused by calling
 *     `initialize()` again, which aborts the previous in-flight FedCM request.
 *
 * Guarding init/load at module scope (so they survive re-mounts) removes both.
 */
let gsiScriptPromise = null;
let gsiInitializedFor = null; // the client_id the SDK was initialized with

function loadGsiScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GSI can only load in the browser"));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    // The script may already be loaded from an earlier mount — in that case the
    // "load" event won't fire again, so resolve immediately.
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        gsiScriptPromise = null; // allow a retry on the next mount
        reject(new Error("Failed to load Google Identity Services"));
      },
      { once: true }
    );
  });

  return gsiScriptPromise;
}

/**
 * Renders the official Google Identity Services button. Google Sign-In is
 * triggered by the user clicking the button (a single FedCM request at a time),
 * so it never collides with another outstanding credentials.get() call.
 *
 * When NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, it renders a styled fallback
 * button so the layout stays consistent while SSO is being set up. The
 * `onCredential` callback receives the Google ID token (JWT), or `null` from
 * the fallback button.
 */
export default function GoogleAuthButton({ onCredential, loading }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Keep the latest callback in a ref so the client can be initialized exactly
  // once with a stable callback that always sees the current handler — this
  // avoids re-initializing (and therefore aborting FedCM) when the prop changes.
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const gsiId = window.google.accounts.id;

        // Initialize the SDK once per client id. Re-initializing aborts any
        // in-flight FedCM request (AbortError), so we guard against it.
        if (gsiInitializedFor !== clientId) {
          gsiId.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential) onCredentialRef.current?.(response.credential);
            },
            auto_select: false,
            use_fedcm_for_prompt: true,
          });
          gsiInitializedFor = clientId;
        }

        // Rendering the button is idempotent and safe to repeat on re-mount.
        containerRef.current.innerHTML = "";
        const width = Math.min(400, containerRef.current.offsetWidth || 360);
        gsiId.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width,
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
        });

        setReady(true);
      })
      .catch(() => {
        // Network / SDK load failure — the styled placeholder keeps the layout
        // intact and the button simply won't appear.
        if (!cancelled) setReady(false);
      });

    // No cancel()/re-init on cleanup: there is no auto One Tap request in flight
    // to abort, so unmounting can't produce an AbortError.
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Fallback button when Google Sign-In isn't configured yet.
  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => onCredential?.(null)}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FcGoogle className="h-5 w-5" />
        Continue with Google
      </button>
    );
  }

  return (
    <div className="relative min-h-[44px] w-full">
      <div ref={containerRef} className="flex w-full justify-center [color-scheme:light]" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-400">
          <FcGoogle className="h-5 w-5" />
          Loading Google Sign-In...
        </div>
      )}
    </div>
  );
}
