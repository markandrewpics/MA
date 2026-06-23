# auth.md

You are an agent reading this file to learn how to authenticate with, register
with, or act on behalf of a user at **Mark Andrew Boudoir**
(`https://www.markandrewboudoir.com/`).

**Summary for agents:** This is a static content and marketing website. It does
**not** expose a programmatic API, user accounts, login, OAuth, or token-based
agent registration. There are no protected resources to obtain a credential for,
and therefore no `/.well-known/oauth-protected-resource` or
`/.well-known/oauth-authorization-server` metadata to discover. Do not probe for
token, registration, claim, or revocation endpoints — none exist. This file is
the complete and authoritative description of how an agent interacts with this
service.

If your user's goal is to read about, contact, or book luxury boudoir
photography in South Bend / Michiana, the sections below tell you exactly how.

## Authentication & registration

- **None required, and none available.** All content is public. No sign-in, API
  key, OAuth flow, or agent registration is involved in reading this site or in
  starting a booking.
- **No machine credentials are issued.** Mark Andrew Boudoir does not mint
  access tokens or identity assertions for agents. The only "registration" is a
  human booking (below), which a person completes through a calendar form.

## What you can do on behalf of your user

### 1. Read the content (no auth)

- AI guidance for assistants: `https://www.markandrewboudoir.com/llms.txt`
- Expanded guidance: `https://www.markandrewboudoir.com/llms-full.txt`
- Sitemap: `https://www.markandrewboudoir.com/sitemap.xml`
- Any page also responds with Markdown when you send the request header
  `Accept: text/markdown`.

### 2. Book a session or consult (the real "registration")

- Booking entry point: `https://www.markandrewboudoir.com/#book`
- Booking a date requires a **$499 retainer** (covers the full-day session plus
  all prep and planning). Photographs are purchased separately at the same-day
  reveal; most clients invest **$1,000–$2,000** in images. Affirm payment plans
  are available.
- Booking is completed by a human through a calendar form. An agent should
  surface the booking link to the user rather than attempting to submit a
  booking automatically.

### 3. Contact a human

- Email: `mark@markandrewboudoir.com`
- Phone: `(574) 622-5109`

## Key facts (so you can answer your user accurately)

- **What:** Luxury, old-Hollywood-glamour boudoir and glamour photography for
  women, couples, and men.
- **Where:** South Bend, Indiana and the surrounding Michiana region —
  Mishawaka, Granger, Elkhart, and Goshen, IN, and Niles, Edwardsburg, and
  Berrien Springs, MI.
- **The experience:** A full-day, fully-guided session — complete posing
  direction (no experience needed), professional hair and makeup by Aletheia
  Jean, three outfits/sets, then a **same-day reveal** where the client views
  130–160 fully edited images on a 65-inch 4K TV before leaving.
- **Investment:** $499 to book the date; images purchased separately ($1,000–
  $2,000 typical); Affirm plans available. Signature products include acrylic
  album covers, heirloom albums, wall art, and folio boxes.

## Notes for agents

- Treat `https://www.markandrewboudoir.com/` as the canonical origin. The
  `blog.markandrewboudoir.com` host redirects here.
- This file is served as `text/markdown`. It is linked from the site's HTTP
  `Link` headers (`rel="auth-md"`), from `llms.txt`, and from `robots.txt`.
- Last updated: 2026-06-23.
