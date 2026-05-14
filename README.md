# BigUp Marketing Website

Bilingual (FR/EN) single-page marketing site for **BigUp V5** — a verified-skills marketplace for French-speaking West African talent. Replaces https://big-up.ai/.

Built per the BigUp V5 brief: HTML + Tailwind CSS + vanilla JS, no framework. Stakeholder-demo cut, designed so the future multi-page production site does **not** need a redesign.

---

## Prerequisites

- **Node.js** ≥ 18 (tested on Node 22)
- **npm** ≥ 9
- A static file server for local preview (`npx serve`, VS Code Live Server, or any equivalent)

> No backend. The Early Access form posts to a static-form host (Formspree / Getform / Netlify Forms) — see "Plug in the placeholders" below.

---

## Local development

```bash
# 1. Install Tailwind
npm install

# 2. Build CSS once (writes assets/tailwind.css)
npm run build

# 3. Or watch mode while editing styles/HTML
npm run dev
```

Then in another terminal:

```bash
npm run serve   # serves at http://localhost:5173
```

Open `http://localhost:5173/` in your browser.

> The dev/watch task only rebuilds CSS. Edits to `index.html`, the i18n JSON, or the vanilla JS in `<script>` are picked up on a hard refresh.

---

## Plug in the placeholders

Before deploying, replace these three tokens. They are intentionally left as `{{…}}` so it's obvious what's missing.

| Placeholder | Where | What to put |
|---|---|---|
| `{{FORM_ENDPOINT}}` | `index.html` → `<form id="early-access-form" action="…">` | Your Formspree / Getform / Netlify Forms endpoint URL. (Leaving it as a placeholder will simulate success in the UI for demo purposes — it does **not** actually send anywhere.) |
| `{{CALENDLY_URL}}` | `index.html` → `<a id="recruiter-cta" data-calendly-url="…">` | A Calendly (or equivalent) URL for the Recruiter "Book a 15-min call" CTA. Falls back to a `mailto:` if left blank. |
| `{{DEMO_VIDEO_URL}}` | `index.html` → `<video><source src="…">` inside the demo modal | A 30–60s screen-recorded demo of the Talent app onboarding → home flow. MP4 (`video/mp4`) recommended. |

You can do all three with a single editor "Find & Replace" across `index.html`.

### Optional assets

| File | Purpose | If missing |
|---|---|---|
| `assets/v3-home-mockup.png` | Founder's S24 Ultra screenshot of the Talent app Home screen. Drops into the hero. | A stylized purple phone frame (no fake UI) is rendered instead. |
| `assets/mission-photo.jpg` | Optional photo for the "Our commitment" section. | The section renders text-only. **Do not** use stock photography. |
| `assets/og-image.png` | 1200 × 630 social preview. | Hero will be used by some scrapers, but explicit OG image is recommended. |

> If you drop `assets/v3-home-mockup.png` into place later, swap the stylized phone-frame markup in the hero `<section>` for an `<img>` (or hold the frame and place the image inside).

---

## Bilingual (FR / EN) — how it works

- Default load language detected from `navigator.language`: French if `fr-*`, English otherwise.
- The header has a `FR ↔ EN` toggle pill. Choice is persisted in `localStorage` under `bigup.lang`.
- All visible strings live in `i18n/fr.json` and `i18n/en.json`. Edit those files to change copy — **never** edit text directly in `index.html`.
- The HTML uses two attribute patterns the JS picks up:
  - `data-i18n="key"` → replaces the element's text content
  - `data-i18n-attr="attribute:key"` → sets a translatable attribute (placeholder, alt, aria-label, etc.). Multiple pairs separated by `;`.
- `<html lang="…">` updates on toggle for screen readers and search engines.

To add a new string:

1. Add `"my.new.key": "Texte FR"` to `i18n/fr.json`
2. Add `"my.new.key": "English text"` to `i18n/en.json` (same key)
3. In HTML: `<span data-i18n="my.new.key"></span>`

---

## Deploy — Netlify

The site is fully static. Two ways to deploy:

### Drag & drop

1. `npm run build` (produces `assets/tailwind.css`)
2. Zip the entire `bigup-website/` folder (or just drag the folder into the Netlify dashboard's *Deploys* tab)
3. Done. Configure your custom domain in **Domain management**.

### Git-based

1. Push this folder to a GitHub repo
2. In Netlify, **New site → Import from Git**
3. **Build command:** `npm run build`
4. **Publish directory:** `bigup-website` (or `.` if `bigup-website` IS your repo root)
5. (Optional) Add the form endpoint as an environment-variable-driven replacement, or just commit it directly into the HTML for v1.

### Netlify Forms (no third-party form service needed)

If you want to skip Formspree/Getform entirely and use Netlify's built-in form handling:

1. Add `name="early-access" netlify` to the `<form>` tag (and replace `{{FORM_ENDPOINT}}` with `/`)
2. Add a hidden input: `<input type="hidden" name="form-name" value="early-access" />`
3. Submissions show up in your Netlify dashboard under **Forms**

---

## Deploy — other hosts

The output is plain static files. Any of these work without modification: Vercel, Cloudflare Pages, GitHub Pages, S3 + CloudFront, Azure Static Web Apps. Just upload everything in `bigup-website/` after running `npm run build`.

---

## Project structure

```
bigup-website/
├── index.html              # The single page
├── tailwind.config.js      # Brand tokens (colors, fonts, radii, shadow)
├── package.json            # Tailwind build scripts
├── README.md               # ← you are here
├── styles/
│   └── tailwind.css        # Source CSS (compiled to assets/tailwind.css)
├── i18n/
│   ├── fr.json             # French dictionary
│   └── en.json             # English dictionary
├── assets/
│   ├── tailwind.css        # Compiled CSS (build output — gitignore optional)
│   ├── favicon.svg         # Gold bolt
│   ├── v3-home-mockup.png  # (optional, user-provided)
│   ├── mission-photo.jpg   # (optional, user-provided)
│   └── og-image.png        # (recommended, user-generated)
└── legal/
    ├── mentions.html       # Stub — required for launch
    ├── privacy.html        # Stub
    └── cgu.html            # Stub
```

---

## Accessibility (WCAG 2.1 AA)

- Skip-to-main link as first focusable element
- `<html lang>` updates on language toggle
- Visible focus rings (gold, works on light + dark backgrounds)
- Tap targets ≥ 48 × 48 px
- Form labels (no placeholder-only inputs); `aria-required` on required fields
- Language toggle uses `<button aria-pressed>` pattern
- `prefers-reduced-motion` honoured (reveals disabled, smooth-scroll switched to instant)
- Decorative elements (blobs, phone frame) marked `aria-hidden="true"`
- Single `<h1>`; `<h2>` per section; no level skipping

If you change colors, recheck gold-button contrast: gold (`#F5A623`) on white fails AA for body text — gold is **only** used as a button fill behind dark text and as a small accent on large headings.

---

## Trust signal slots (hidden today)

Four sections are scaffolded but hidden (`display: none`) until there's something real to show. Look for these comments in `index.html`:

- `<!-- TRUST-SLOT: recruiter-logo-wall — un-hide when 5+ logos exist -->`
- `<!-- TRUST-SLOT: testimonial-carousel — un-hide after first 3 hires -->`
- `<!-- TRUST-SLOT: stats-counter — un-hide when "X talents placed" is non-trivial -->`
- `<!-- TRUST-SLOT: press-mentions — un-hide when any exist -->`

To un-hide, remove the `style="display:none;"` attribute on the corresponding `<section>`.

---

## What's deliberately NOT here (and why)

- ❌ Login / Sign In / Register buttons — auth is mobile-only this phase
- ❌ App Store / Play Store badges — app is sideloaded for now
- ❌ Pricing — not finalized
- ❌ Stock photos of generic Black professionals in suits — kills credibility faster than no photos
- ❌ Newsletter sign-up — the Early Access form captures intent better
- ❌ Analytics / chat widgets — to add in a follow-up PR

---

## License & ownership

Internal project for BigUp. Copy and design are not for redistribution.

For questions: **contact@big-up.ai**
