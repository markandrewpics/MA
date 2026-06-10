# CLAUDE.md — Mark Andrew Boudoir blog

This is the cheat sheet for the blog at **blog.markandrewboudoir.com**. Read it before doing blog work so you start with the facts instead of relearning them. Mark is non-technical — explain in plain language, don't dump options, and just do the work.

## The business

- **Mark Andrew Boudoir** — luxury boudoir + glamour photography.
- **Two studios:** South Bend, IN and Beaufort, SC. Always confirm which studio a post/campaign is for if it matters; don't assume.
- **Hair & makeup:** Aletheia Jean (camera-ready soft glam → bold maximalism).
- **Signature style:** old-Hollywood glamour — bold lighting, statement jewelry, painted backdrops, fur coats, gowns. Timeless, not trendy. "Look how good Grandma looked in 30 years," not cringe.

### Studio facts (reuse these in content — they're true and on-brand)
- Full-day experience: ~9am arrival → hair & makeup → 3 outfits/3 sets, 90 min shooting → lunch → **same-day reveal** 1–3pm.
- **Same-day reveal:** 130–160 fully edited images shown on a 65-inch TV in 4K, same afternoon. Most studios take 2–4 weeks; Mark shoots print-ready in-camera so editing finishes over lunch.
- Typical investment is a real number (more than clients expect); **Affirm payment plans** available.
- **Acrylic album covers** are the signature product. Albums, wall art, metal prints, folio boxes, digitals.
- Tasteful/classy by default; can go spicier if the client wants.

### Local SEO geography (work these into body copy naturally — never as separate doorway pages)
- **Michiana (South Bend):** South Bend, Mishawaka, Granger, Elkhart, Goshen IN; Niles, Edwardsburg, Berrien Springs MI.
- **Lowcountry (Beaufort):** Beaufort, Bluffton, Hilton Head, Savannah, Charleston.

## The site / repo

- **Repo:** `markandrewpics/MA` on GitHub. **Live host:** Vercel (auto-deploys on push to `main`).
- **Blog hub:** `blog/index.html` — contains a `POSTS` array (JS). Every new post needs a card added here.
- **Published posts:** `posts/<slug>/index.html`.
- **Standalone pages:** `is-boudoir-awkward/`, `what-to-wear-boudoir-session/`, `boudoir-photography-cost-south-bend/`, `lingerie-guide/`, etc.
- **Brand tokens (don't change):** bg `#0c1322`, accent/peach `#f09a69`, text `#eef0f5`. Fonts: Cormorant Garamond (headings), Great Vibes (script), Jost (body).
- **Booking calendar embed (use in every post CTA):**
  `https://link.disruptormarketing.io/widget/booking/b7eSmyInmj2pwqIQesEp`
  Pattern: a `<section id="book">` with the iframe + the `#book` smooth-scroll script + nav "Work With Me" → `#book`.

## The AEO auto-publish system

Posts are written as data, then a scheduled GitHub Action renders + publishes them.

- `.github/blog-drafts/template.html` — the shared HTML shell (brand styles, nav, booking section, schema).
- `.github/blog-drafts/<slug>/blog.json` — the content for one post (schema below).
- `.github/blog-drafts/publish-schedule.json` — the queue; each entry flips `queued` → `published`.
- `.github/blog-drafts/_topic-clusters.json` — backlog of topics + interview questions.
- `.github/blog-drafts/_topic-source.json` + the Brain2 dataset — raw keyword research.
- `.github/scripts/publish_next.py` — renders the next due draft, injects a hub card, marks it published, commits.
- `.github/scripts/drop_monthly_topics.py` — first-Monday topic drop → GitHub issue.
- `.github/workflows/publish-blog.yml` — cron `47 9 * * 0,3` (note: cadence is moving to **Sun/Tue/Thu** going forward — update the cron + schedule when building the next batch). `workflow_dispatch` with `force_slug` lets you publish one now.
- `.github/workflows/monthly-topic-drop.yml` — first-Monday cron.
- `.github` paths are excluded from Vercel via `.vercelignore`.

### blog.json schema
```
slug, title, h1 (may contain <em>), subtitle, metaDescription, datePublished,
breadcrumbCategory, eyebrow, category, categoryLabel,
cardTitle, cardExcerpt, cardDate, cardImage, heroImage, heroAlt, heroCaption,
directAnswer,
sections: [ { h2, answer, prose:[...], bullets:[...] } ],   // see format rule below
faqs: [ { q, a } ],
bodyImages: [ { afterSection:<0-based>, type:"single"|"two-col", src, alt, caption, images:[{src,alt}] } ],
closerEyebrow, closerH3, closerBody,
social: { instagramCaption, youtubeDescription, hashtags:[...], tweet }
```

## Hard rules (these caused real problems — don't break them)

1. **Hub card + hero images MUST be horizontal (width > height).** Cards crop 16:10 — vertical images chop off heads and feet. `publish_next.py` has a guard that refuses to publish a vertical `cardImage`/`heroImage`. Verify aspect before assigning any thumbnail.
2. **Image paths are URL-encoded.** Spaces become `%20` (e.g. `/uploads/Use%20These%20Images/foo.jpg`). The guard URL-decodes before checking disk. Images may live in `/uploads/` or `/uploads/Use These Images/`.
3. **AEO format (current standard):** Each `h2` is a real question people Google. Lead with a tight **40–60 word direct answer** (this is what AI engines extract), then flow into cohesive first-person prose **as if Mark wrote it himself**. Do NOT use the old visible "answer box vs. prose" split — one continuous expert voice. Add `faqs` for FAQPage schema.
4. **Don't feed AI with AI.** Real blogs come from Mark's recorded answers (interview prompts → he records → weave his words in). Don't ghost-write 12 pure-AI posts and call it done.
5. **One topic per blog, sub-questions as H2s.** Collapse local variants ("cost in South Bend", "cost near Mishawaka") into ONE blog that mentions the towns in body copy. Never make near-duplicate doorway pages.

## Git workflow

- Work happens in a git worktree under `.claude/worktrees/`. Main branch is `main`.
- If commit fails with "Author identity unknown": `git config user.email "markandrewpics@gmail.com" && git config user.name "Mark Boughton"`.
- Commit, then `git pull --rebase origin main`, then `git push origin HEAD:main`. Vercel deploys on push. Only commit/push blog work when the task calls for it.
- `.gitignore` note: `/blog-drafts/` is anchored so it does NOT ignore `.github/blog-drafts/`.

## Calendar / reminders

- "To Do List" calendar ID: `vkq7egbqrbklhm10dmqtq097es@group.calendar.google.com`.
- Review reminders for auto-published posts go here as timed events (~10am ET) with popup reminders.

## Related skills

- `aeo-blog-from-transcript` — turn a recorded interview into a finished, queued blog.
- `aeo-interview-prompts` — generate the record-in-your-own-words questions for a topic.
- `blog-images` — rename/verify/wire shoot images into a post (enforces horizontal covers).
- `blog-publish-doctor` — diagnose & fix a blog that didn't publish.
- `new-blog-post` — the older interactive React-template post flow (different system; prefer the AEO pipeline above for new content).
- `mark-andrew-pdf` — branded PDFs (use for interview-prompt PDFs and client docs).
