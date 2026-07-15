# LessonPilot

**LessonPilot** is an AI-powered web app that helps teachers **plan lessons and
generate tests faster**. It ships with a public marketing landing page, a full
authentication flow (email/password), and a login-gated
dashboard that hosts the AI teaching tools.

> **Brand vs. module:** *LessonPilot* is the product/company brand (logo wordmark,
> metadata, marketing). *"AI Tools"* is the internal module — the set of tools
> surfaced on the `/dashboard` (Lesson Plan Generator + Test Generator).
> The repository itself is named `lesson_pilot` (github.com/salmanui/lesson_pilot).

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS 3.4 (+ `@tailwindcss/typography`) |
| Icons | `react-icons` (Feather `fi`, Bootstrap `bs`, Google `fc`) |
| HTTP | `axios` |
| Auth state | React Context + `localStorage` |
| Fonts | Poppins (body) |
| Path alias | `@/*` → project root (see `jsconfig.json`) |

---

## Site structure & routing

| Route | Page | Access |
|-------|------|--------|
| `/` | Public marketing landing page | **Public** |
| `/login` | Sign in (email/password) | Public |
| `/register` | Create account | Public |
| `/dashboard` | AI Tools home (tool launcher) | **Gated** |
| `/ai-test-generator` | AI Test Generator tool | **Gated** |
| `/ai/lesson-plan-generator` | Lesson Plan Generator tool | **Gated** |
| `/ai/teacher/lesson-plan-generator` | Teacher lesson plan view/export | **Gated** |

**Gated** = wrapped in `RequireAuth`; an unauthenticated visitor is redirected to `/login`.

### End-to-end user flow

```
Visitor opens  /  (public landing)
        │  clicks "Get started" / "Log in"
        ▼
   /login  or  /register
        │  successful auth  → user saved to context + localStorage
        ▼
   /dashboard  (AI Tools)
        │  "Sign out"  → clears session
        ▼
   redirected back to /login
```

The landing nav is **auth-aware**: when a session exists it shows **"Go to Dashboard"**;
otherwise it shows **"Log in"** and **"Get started"**.

---

## Authentication

### What was built
- A dedicated, premium **login/register page** — left showcase panel + right form,
  fully responsive (showcase hides below `lg`, form goes full-width on tablet/mobile).
- A single `AuthPage` component with a **Sign in / Register** segmented toggle,
  mounted at both `/login` and `/register` (each route sets the initial mode).
- **Email/password login** and **registration** reusing the existing API utils.
- **Route gating** so tools are only reachable after login.

### Login
- Fields: **Email or phone** + **Password** (with show/hide toggle, "Remember me").
- Calls `loginUser({ emailOrPhone, password })` → `POST /api/auth/signin`.
- Success returns `{ success, message, accessToken, expiresAtUtc, user }`; the
  profile and token are flattened by `buildUserPayload` and stored in `localStorage`.
- Inactive accounts are rejected with **403** even when the password is correct.

### Register
Fields collected (all validated):
- **User Name**
- **Email ID**
- **Phone Number**
- **School / Organization Name**
- **Password** (with a live strength meter)

Calls `registerUser({ email, userName, phoneNumber, schoolOrganization, password })`
→ `POST /api/auth/register`. Password must be at least 8 characters.

> **Registration is not a sign-in.** The API returns `{ success, message }` with no
> user object and no token: new accounts stay **inactive until an administrator
> activates them**, and signing in before then fails with 403. The register screens
> therefore show the API's message and switch to the sign-in form rather than
> redirecting into the app.

### Session model (important)
- Auth state lives in **`UserContext`** and is persisted to **`localStorage`** under
  the `user` key. It is **client-side** — the guard protects the UI, not the server
  response. When the backend is ready, true server-side protection would use cookies
  + Next.js middleware (not yet implemented).
- `UserContext` exposes `hasLoadedUser` so the guard waits for `localStorage` to
  resolve before deciding (prevents a wrong-redirect flash on first paint).

---

## Landing page (`/`)

Public marketing page describing the product, built from reusable section components:

| Section | Component | Purpose |
|---------|-----------|---------|
| Sticky nav | `LandingNav` | Auth-aware, blurred, with a mobile hamburger menu + smooth-scroll anchors |
| Hero | `HeroSection` | Headline, CTAs, animated "app preview" mock card + floating badges + blobs |
| Stats strip | `StatsSection` | Social-proof numbers *(placeholder values)* |
| Features | `FeaturesSection` | 6 cards describing what the app does (hover lift + gradient icons) |
| How it works | `HowItWorksSection` | 3-step process |
| Testimonials | `TestimonialsSection` | 3 quotes with star ratings + avatars *(placeholder content)* |
| CTA banner | `CtaSection` | Gradient call-to-action |
| Footer | `SiteFooter` | Link columns + copyright |

**Interactivity/polish:** smooth-scroll anchor navigation, CSS entrance/float/blob
animations, hover transitions throughout, fully responsive layouts. Consistent
indigo → blue → sky theme shared with the auth pages.

> **Placeholder content:** stats numbers, testimonial names and quotes are sample
> data — swap in real values when available.

---

## File map (what was added / changed)

### Added — auth
```
app/(auth)/login/page.js              # /login route  → AuthPage (login)
app/(auth)/register/page.js           # /register route → AuthPage (register)

src/components/auth/AuthPage.jsx       # orchestrator: toggle, submit logic, redirects
src/components/auth/AuthShowcase.jsx   # left promo panel (gradient, blobs, features)
src/components/auth/LoginForm.jsx      # login fields + validation
src/components/auth/RegisterForm.jsx   # register fields + validation
src/components/auth/InputField.jsx     # reusable input (icon, error, password toggle)
src/components/auth/SubmitButton.jsx   # gradient button + loading spinner
src/components/auth/StatusBanner.jsx   # success/error banner
src/components/auth/PasswordStrength.jsx # live password strength meter
src/components/auth/RequireAuth.jsx    # route guard (loader → redirect if no user)

src/utils/auth/validators.js          # email/phone/password validation + strength
src/utils/auth/userPayload.js         # normalizes the API response → user object
```

### Added — landing & dashboard
```
app/dashboard/page.js                 # /dashboard route → RequireAuth + TeacherToolsHome

src/components/landing/LandingNav.jsx
src/components/landing/HeroSection.jsx
src/components/landing/StatsSection.jsx
src/components/landing/FeaturesSection.jsx
src/components/landing/HowItWorksSection.jsx
src/components/landing/TestimonialsSection.jsx
src/components/landing/CtaSection.jsx
src/components/landing/SiteFooter.jsx
src/components/landing/SectionHeading.jsx  # reusable eyebrow/title/subtitle
```

### Changed
```
app/(home)/page.js            # was AI Tools → now the public landing page
app/ai-test-generator/page.js # wrapped in RequireAuth
app/ai/lesson-plan-generator/page.js            # wrapped in RequireAuth
app/ai/teacher/lesson-plan-generator/page.js    # wrapped in RequireAuth
src/components/TeacherToolsHome.jsx  # added header: greeting + "Sign out" button
src/utils/userContext.js      # exposed `hasLoadedUser` for the guard
tailwind.config.js            # added keyframes/animations: blob, float, fade-in, fade-in-up, shimmer
styles/globals.css            # added html { scroll-behavior: smooth }
```

---

## API integration

Auth runs on its **own host**, separate from AI generation:

- `NEXT_PUBLIC_AUTH_API_URL` — auth service; serves only `/api/auth/*`.
- `NEXT_PUBLIC_API_URL` — Qeeb backend; serves lesson-plan/test generation.

The two are **not interchangeable** — the auth host 404s on the generation
endpoints and vice versa, so keep them as separate variables.

| Action | Util | Endpoint | Payload |
|--------|------|----------|---------|
| Login | `loginUser` (`src/utils/getUserLogin.js`) | `POST /api/auth/signin` | `{ emailOrPhone, password }` |
| Register | `registerUser` (`src/utils/userRegistration.js`) | `POST /api/auth/register` | `{ email, userName, phoneNumber, schoolOrganization, password }` |

Both go through `postAuth()` (`src/utils/auth/authClient.js`), which unwraps the
`{ success, message, ... }` envelope and preserves the API's own message
("Email is already registered.", "Inactive user.") for the UI to show.

### Why auth is proxied (CORS)

The auth API sends **no `Access-Control-Allow-Origin` header** and answers preflight
`OPTIONS` with **405**, so a direct browser call is blocked and surfaces as an
opaque axios `Network Error`. (curl/Node are unaffected — they don't enforce CORS.)

`next.config.js` therefore rewrites `/api/auth/:path*` to the auth host, so browser
requests stay **same-origin** and never trigger CORS. `postAuth()` uses a relative
URL in the browser and the absolute host only on the server.

> This means `NEXT_PUBLIC_AUTH_API_URL` **must be set in the deployment environment**
> (e.g. Vercel) — the rewrite is skipped when it is missing and `/api/auth/*` 404s.
>
> The proper fix is enabling CORS on the API for the site's origins, after which the
> rewrite can be removed and the client can call the host directly.

The response is normalized by `buildUserPayload()` so varying API field names
(`name`/`fullName`/`userName`, `mobileNumber`/`phoneNumber`,
`organizationName`/`schoolOrganization`, `id`/`userId`/`sub`) map to one
consistent user object, with `accessToken`/`expiresAtUtc` lifted off the envelope.

> The API also exposes `POST /api/auth/google-signin` (`{ idToken }`), which the
> app does not currently use. There is **no change-password endpoint**.

---

## Environment variables

`.env` (project root):

```bash
# Backend that serves AI generation (lesson plans, tests).
NEXT_PUBLIC_API_URL=https://devapi.qeeb.in
# Auth service — separate host, serves only /api/auth/*.
NEXT_PUBLIC_AUTH_API_URL=https://lessionplanapi.runasp.net
# Public site origin — used for canonical URLs, Open Graph, sitemap & JSON-LD.
# NEXT_PUBLIC_SITE_URL=https://lessonpilot.com
```

- `NEXT_PUBLIC_API_URL` — base URL for AI generation calls (lesson plans, tests).
- `NEXT_PUBLIC_AUTH_API_URL` — base URL for all auth calls (`/api/auth/*`).
- `NEXT_PUBLIC_SITE_URL` — **production origin** (no trailing slash). Drives canonical
  URLs, Open Graph/Twitter tags, the sitemap and JSON-LD `@id`s. Falls back to
  `http://localhost:3000` in development. **Set this before going live.**

---

## SEO & structured data

SEO config is centralized in `lib/site.js` (name, tagline, description, keywords,
socials) and consumed across the metadata and JSON-LD layers.

**Metadata** (`app/layout.js`, via the Next.js Metadata API):
- Title template `%s | LessonPilot`, rich description & keywords, `authors`/`creator`/`publisher`.
- Canonical URLs, `robots` (with `googleBot` `max-image-preview: large`), `themeColor`.
- Open Graph (`website`, locale, image) and Twitter (`summary_large_image`) cards.
- Per-page overrides: **auth pages are `noindex, follow`**; the **dashboard & AI tools
  are `noindex, nofollow`** (login-gated); the landing page is fully indexable.

**Dynamically generated images** (via `next/og` — no binary assets needed):
- `app/icon.js` → favicon (`/icon`, gradient "L").
- `app/opengraph-image.js` → 1200×630 social card (`/opengraph-image`).
- `app/twitter-image.js` → reuses the OG renderer.

**JSON-LD** (`lib/jsonld.js`, injected with `src/components/seo/JsonLd.jsx`):
- Site-wide (root layout): `Organization` + `WebSite`.
- Home page: `SoftwareApplication` (category `EducationalApplication`, free `Offer`,
  `featureList`). No `aggregateRating`/`review` — testimonials are placeholders, and
  fabricated review markup violates Google's guidelines.

**Crawling:** `app/robots.js` (`/robots.txt`) and `app/sitemap.js` (`/sitemap.xml`,
public URLs only — gated/auth routes are excluded since they're `noindex`).

> After deploying, set `NEXT_PUBLIC_SITE_URL`, then validate with Google's
> [Rich Results Test](https://search.google.com/test/rich-results) and submit the
> sitemap in Search Console. Update `TWITTER_HANDLE` / `SITE_SOCIALS` in `lib/site.js`
> with real profiles.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

- Open `http://localhost:3000` → you land on the public marketing page.
- Click **Get started** / **Log in** → complete auth → you're taken to `/dashboard`.
- Use **Sign out** in the dashboard header to return to `/login`.

Other scripts:

```bash
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

---

## Design system notes

- **Theme:** indigo → blue → sky gradients, slate text, light `#f7fbff` surfaces.
- **Custom animations** (in `tailwind.config.js`): `animate-blob`, `animate-float`,
  `animate-fade-in`, `animate-fade-in-up`, `animate-shimmer`.
- **Reusable UI:** `InputField`, `SubmitButton`, `StatusBanner`, `PasswordStrength`,
  `SectionHeading`, `RequireAuth`.
- **Validation, loading & feedback:** every form validates per-field, disables inputs
  and shows a spinner while submitting, and surfaces success/error banners.
- **Responsiveness:** all pages tested across desktop / tablet / mobile breakpoints.

---

## Known TODOs / follow-ups

- [ ] Replace landing **placeholder** stats & testimonials with real content.
- [ ] Wire the **Forgot password** link (needs a backend endpoint — the auth API
      does not currently expose one).
- [ ] (Optional) Add server-side protection (cookies + Next.js middleware) once the
      backend issues real sessions/tokens.
- [ ] Confirm the `organizationName` signup field name with the backend.

---

## Deployment (GitHub → Vercel production)

The project uses Vercel's native GitHub integration:

- A push to `main` creates a Vercel **production** deployment.
- A pull request creates a Vercel preview deployment.
- `.github/workflows/ci.yml` independently runs lint and the production build.

No Vercel token or project-ID secrets are required in GitHub Actions. In the
Vercel project, keep `salmanui/lesson_pilot` connected under **Settings → Git**
and set `main` as the production branch. Automatic Git deployments are enabled
by default; do not add `"git": { "deploymentEnabled": false }` to
`vercel.json`.

If Vercel reports that it cannot verify the commit author, connect the GitHub
account under **Vercel Account Settings → Authentication**, and ensure the
commit email belongs to that GitHub account.
