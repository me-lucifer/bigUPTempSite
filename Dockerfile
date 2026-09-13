# BigUp public marketing website — Railway static-site image (18A-5).
# -----------------------------------------------------------------------------
#   builder  — node:22-alpine; `npm ci` then `npm run build` (Tailwind only).
#   runtime  — caddy:2-alpine; serves this directory on :8080.
#
# ─── WHY CADDY AND NOT A NODE SERVER ────────────────────────────────────────
#
# The architect's generic advice was "a twenty-line node:http static server,
# because every other surface here is Node". The repository disagrees, and it
# wins: `apps/talent-web`, `apps/recruiter-web` and `admin` ALL ship
# `node:22-alpine` builder -> `caddy:2-alpine` runtime, and their Caddyfiles are
# deliberate copies of each other so the web surfaces cannot drift apart on
# caching or security headers. A fourth pattern here would be the only one of
# its kind to maintain.
#
# ─── WHY `railway.json` PINS THE BUILDER ────────────────────────────────────
#
# Both web services stopped deploying on 2026-09-04 and it took two wrong
# theories to find out why: every deployment on RAILPACK failed, every one on
# DOCKERFILE succeeded. Railpack surfaces its refusal as "Failed to create code
# snapshot", which reads like an upload fault and is not one. `railway.json`
# pins the builder so detection cannot drift — but note it is INSURANCE, not the
# remedy: a config file inside the source cannot be read by a step that never
# reads the source. If this service ever fails to build, check the Builder on
# the SERVICE in the dashboard first. No CLI command exposes it.
#
# ─── WHAT THIS IMAGE IS NOT ─────────────────────────────────────────────────
#
# There is no SPA fallback. This is a genuinely static site: `index.html`, four
# legal pages, and JSON the page fetches at runtime. A `try_files` rewrite would
# turn a typo'd URL into the home page rather than a 404, which is worse for a
# marketing site — a wrong link should look wrong.
#
# ─── WHAT THE VERCEL CONFIG WAS DOING, AND WHERE IT WENT ────────────────────
#
# `vercel.json` set `X-Content-Type-Options: nosniff`, `Referrer-Policy:
# strict-origin-when-cross-origin`, and long-lived caching on /assets with a
# short TTL on /i18n. Deleting that file without moving those headers would have
# quietly dropped them. They are in the Caddyfile, plus the three the house
# config carries that Vercel's did not.
# -----------------------------------------------------------------------------

FROM node:22-alpine AS builder

WORKDIR /app

# `npm ci` fails on any drift between package.json and the lock, which is the
# point. This site is not a workspace member, so its lock is already standalone.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Emits assets/tailwind.css, which is gitignored and therefore MUST be built
# here — the repository deliberately does not track build output.
RUN npm run build

FROM caddy:2-alpine AS runtime

# The whole site is the artefact: index.html, assets/, i18n/, legal/.
COPY --from=builder /app/index.html /usr/share/caddy/index.html
COPY --from=builder /app/assets /usr/share/caddy/assets
COPY --from=builder /app/i18n /usr/share/caddy/i18n
COPY --from=builder /app/legal /usr/share/caddy/legal
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 8080
