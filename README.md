# LessonPilot

**LessonPilot** is an AI-powered web app that helps teachers **plan lessons and
generate tests faster**. It ships with a public marketing landing page, a full
authentication flow (email/password + Google SSO / One Tap), and a login-gated
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
| `/login` | Sign in (email/password + Google) | Public |
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
- **Google SSO + Google One Tap** via Google Identity Services (GSI).
- **Route gating** so tools are only reachable after login.

### Login
- Fields: **Email or phone** + **Password** (with show/hide toggle, "Remember me").
- Calls `loginUser({ userName, password })` → `POST /api/Registration/QeebLogin`.

### Register
Fields collected (all validated):
- **User Name**
- **Email ID**
- **Phone Number**
- **School / Organization Name**
- **Password** (with a live strength meter)

Calls `registerUser({ name, email, mobileNumber, organizationName, password })`
→ `POST /api/Registration/QeebSignup`.

> Note: `organizationName` is a **new field** added to the signup payload for the
> School/Organization requirement. Confirm/adjust the field name once the backend
> contract is finalized.

### Google SSO / One Tap
- Implemented in `src/components/auth/GoogleAuthButton.jsx`.
- Loads the GSI script, renders the official Google button, and triggers **One Tap**
  (`google.accounts.id.prompt()`).
- On credential, `AuthPage` decodes the Google ID token (JWT) for the profile and
  calls `googleLogin(idToken)` → `POST /api/Registration/QeebGoogleLogin` *(placeholder
  endpoint — update when backend is ready)*.
- **Graceful fallbacks:**
  - No `NEXT_PUBLIC_GOOGLE_CLIENT_ID` configured → a styled "Continue with Google"
    button shows and explains SSO isn't set up yet.
  - Backend endpoint not ready → the verified Google profile (name/email/picture)
    is used so the flow still completes end-to-end during development.

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
src/components/auth/GoogleAuthButton.jsx # Google SSO + One Tap (with fallbacks)
src/components/auth/RequireAuth.jsx    # route guard (loader → redirect if no user)

src/utils/auth/validators.js          # email/phone/password validation + strength
src/utils/auth/googleAuth.js          # decodeJwt() + googleLogin() API util
src/utils/auth/userPayload.js         # normalizes API/Google response → user object
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
.env                          # documented NEXT_PUBLIC_GOOGLE_CLIENT_ID (commented placeholder)
```

---

## API integration

All auth calls use `axios` and read the base URL from `NEXT_PUBLIC_API_URL`.

| Action | Util | Endpoint | Payload |
|--------|------|----------|---------|
| Login | `loginUser` (`src/utils/getUserLogin.js`) | `POST /api/Registration/QeebLogin` | `{ userName, password }` |
| Register | `registerUser` (`src/utils/userRegistration.js`) | `POST /api/Registration/QeebSignup` | `{ name, email, mobileNumber, organizationName, password }` |
| Change password | `updateUserPassword` (`src/utils/updateUserPassword.js`) | `POST /api/Registration/QeebChangePassword` | `{ userName, oldPassword, newPassword }` |
| Google login | `googleLogin` (`src/utils/auth/googleAuth.js`) | `POST /api/Registration/QeebGoogleLogin` *(placeholder)* | `{ idToken }` |

The response shape is normalized by `buildUserPayload()` so varying API/Google field
names (`name`/`fullName`, `mobileNumber`/`phoneNumber`, `id`/`userId`/`sub`, etc.)
map to one consistent user object.

---

## Environment variables

`.env` (project root):

```bash
NEXT_PUBLIC_API_URL=https://devapi.qeeb.in
# Public site origin — used for canonical URLs, Open Graph, sitemap & JSON-LD.
# NEXT_PUBLIC_SITE_URL=https://lessonpilot.com
# Google SSO / One Tap — set this to enable the Google Sign-In button.
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

- `NEXT_PUBLIC_API_URL` — backend base URL for all auth calls.
- `NEXT_PUBLIC_SITE_URL` — **production origin** (no trailing slash). Drives canonical
  URLs, Open Graph/Twitter tags, the sitemap and JSON-LD `@id`s. Falls back to
  `http://localhost:3000` in development. **Set this before going live.**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — required to activate Google SSO / One Tap.
  Until set, the fallback Google button is shown.

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
  `GoogleAuthButton`, `SectionHeading`, `RequireAuth`.
- **Validation, loading & feedback:** every form validates per-field, disables inputs
  and shows a spinner while submitting, and surfaces success/error banners.
- **Responsiveness:** all pages tested across desktop / tablet / mobile breakpoints.

---

## Known TODOs / follow-ups

- [ ] Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and confirm the Google login endpoint/payload.
- [ ] Replace landing **placeholder** stats & testimonials with real content.
- [ ] Wire the **Forgot password** link (a `updateUserPassword` util already exists).
- [ ] (Optional) Add server-side protection (cookies + Next.js middleware) once the
      backend issues real sessions/tokens.
- [ ] Confirm the `organizationName` signup field name with the backend.

---

## Deployment (GitHub → Vercel production)

Every push to `main` runs two GitHub Actions workflows:

| Workflow | File | What it does |
| --- | --- | --- |
| Next.js CI | `.github/workflows/ci.yml` | Lint + build check (no deploy) |
| Vercel Production Deployment | `.github/workflows/vercel.yml` | Builds and deploys to Vercel **production** |

Vercel's own Git integration is intentionally disabled in `vercel.json`
(`"git": { "deploymentEnabled": false }`) so the GitHub Action is the single
deploy path — no duplicate deployments.

### Required GitHub Actions secrets

Set these under **Repo → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token (scope: full account) |
| `VERCEL_ORG_ID` | Vercel project → Settings → General (or `.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID` | Same place as `VERCEL_ORG_ID` |

> ⚠️ **Never commit tokens to this repo.** Tokens belong only in GitHub
> Actions secrets. If a token is ever exposed, revoke it immediately at
> vercel.com/account/tokens and create a new one.
