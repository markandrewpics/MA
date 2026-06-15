---
name: todays-blog
description: Turn Mark's newest Apple Note titled "Today's Blog" into a finished, AEO-optimized blog post on blog.markandrewboudoir.com and PUBLISH IT LIVE IMMEDIATELY (not queued). Auto-picks 4+ topic-matching images from the library. Trigger on "do today's blog", "publish today's blog", "make today's blog live", "turn my Today's Blog note into a post", "post today's blog now", or any time Mark says the Today's Blog note is ready and wants it on the site right away. This is the IMMEDIATE-PUBLISH path (renders + pushes now). For future-dated queued posts use aeo-blog-from-transcript instead.
---

# Today's Blog → live, now

Read `CLAUDE.md` at the repo root first — studio facts, the blog.json schema, brand tokens, booking embed, image rules, git workflow. Mark is non-technical; just do the work and report plainly. The whole point of this blog is **SEO + AEO discovery — getting found in AI search engines.** That is the #1 goal of every choice you make.

## What this skill does
Reads the newest Apple Note whose title starts with **"Today's Blog"** (Mark records his answers there), turns it into one AEO blog post in his first-person voice, auto-selects 4+ images that actually match the topic, and **publishes it live right now** — renders the page, injects the hub card, updates the sitemap + llms.txt, commits and pushes. Vercel deploys on push.

This reuses the existing auto-publish machinery (`template.html` + `publish_next.py`) so the post is identical in structure to every other post on the site — it just ships immediately instead of waiting for the cron.

## Step 1 — Get the note
The exact title is whatever Mark typed on the first line, so don't match on the literal string "Today's Blog". Find the **newest** note whose title starts with that phrase (case-insensitive) and read its full body by ID — Apple Notes truncates titles, so the name-based MCP lookup fails:
```bash
# list candidates (newest first) — find the id of the "Today's blog…" note
osascript -e 'tell application "Notes" to get {name, id} of every note whose name starts with "Today"'
# then read the full body by that id:
osascript -e 'tell application "Notes" to return body of note id "x-coredata://…/ICNote/pXXXX"'
```
The note is usually an **interview**: a topic on the first line, then "Question one… Question two…" each followed by Mark's recorded answer. Use his actual words. If the note is empty or clearly not a blog, stop and tell Mark.

## Step 2 — Topic, slug, and real Google questions
- One blog = ONE topic (the first line of the note). Make a clean keyworded slug, e.g. `are-boudoir-photos-a-good-idea`.
- **Dedupe first:** check `posts/`, the standalone folders, and `.github/blog-drafts/publish-schedule.json` so you don't republish a live topic.
- Turn each interview answer into an **H2 that is a real question people Google** (not Mark's internal prompt). Aim for 6–8 H2s. Collapse local variants into ONE post; weave the Michiana towns (South Bend, Mishawaka, Granger, Elkhart, Goshen IN; Niles, Edwardsburg, Berrien Springs MI) into body copy — never doorway pages. Confirm which studio the note is about (Michiana vs Beaufort Lowcountry) and use that region's towns.

## Step 3 — Write it in Mark's voice (AEO format)
Single cohesive first-person voice — Mark is the author. Fill **every** `blog.json` field (schema in `CLAUDE.md`):
- Under each `h2`: the `answer` is a tight **40–60 word direct answer**, declarative, first person — this is what AI engines extract. Then `prose` flows on as Mark's continuous expert voice, weaving his real recorded words/stories (clean up ums and repetition; keep his phrasing and anecdotes). Don't invent facts — use the studio facts in `CLAUDE.md`.
- Write `directAnswer` (the top extract), `metaDescription` (~155 chars, keyworded), `faqs` (4–5 — powers FAQPage schema, distinct from the H2s), `closer*`, and the full `social` block (Instagram caption, YouTube description, 12 hashtags incl. local, tweet).
- `datePublished` and `cardDate` = today.

## Step 4 — Auto-pick 4+ images that match the topic
The image filenames are SEO-descriptive (subject + wardrobe + light/prop + "boudoir" + town), so match by reading the names. **Make the photos correspond to the subject** — men's boudoir → `mens-boudoir-*`; bridal → `bridal-*`/`*veil*`/`*bouquet*`; dramatic/dark moody → `*dramatic*`/`*shadow*`/`*theatrical*`/`*velvet-curtain*`; couples → `couples-*`; confidence/empowerment → `*empowering*`/`*velvet-curtain*`/`*fur-coat*`/`*gold*`.

- **THE HARD RULE: `cardImage` + `heroImage` MUST be horizontal (width > height).** The publisher guard rejects vertical (hub cards crop 16:10 → chopped heads/feet). Body images can be vertical. Get the horizontal palette first:
  ```bash
  find uploads -maxdepth 2 \( -iname "*.jpg" -o -iname "*.jpeg" \) ! -path "*Featured Logos*" | while read -r f; do
    dims=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w,h}')
    w=${dims% *}; h=${dims#* }
    [ -n "$w" ] && [ -n "$h" ] && [ "$w" -gt "$h" ] 2>/dev/null && echo "${w}x${h}  ${f#uploads/}"
  done | sort
  ```
- Pick a strong horizontal hero/card that matches the emotional theme. Add `bodyImages` between sections (`single` + one `two-col` pair) so there are **4+ images total**, each with real alt text + a short caption. Prefer images from **different Michiana towns** — it reinforces local SEO. Images live in `/uploads/` or `/uploads/Use These Images/`; **URL-encode spaces** (`/uploads/Use%20These%20Images/...`). `afterSection` is 0-based.
- If nothing in the library fits the subject, tell Mark rather than forcing an off-topic image.

## Step 5 — Publish immediately
1. Write `.github/blog-drafts/<slug>/blog.json`.
2. Add a queue entry to `.github/blog-drafts/publish-schedule.json`: `{"slug": "<slug>", "scheduledDate": "<today>", "status": "queued"}`.
3. Render + inject the hub card + mark published + commit, all via the existing publisher (the horizontal guard runs here):
   ```bash
   cd "<repo root>" && FORCE_SLUG=<slug> python3 .github/scripts/publish_next.py
   ```
   If it fails with "Author identity unknown": `git config user.email "markandrewpics@gmail.com" && git config user.name "Mark Boughton"`, then re-run.
4. **The publisher does NOT touch sitemap.xml or llms.txt — you must.** This is critical for the AI-search goal:
   - `sitemap.xml`: add a `<url>` for `https://www.markandrewboudoir.com/posts/<slug>/` (changefreq monthly, priority 0.7, lastmod today).
   - `llms.txt`: add the post under "## Articles (common questions answered)".
5. Fold those into the publish commit and fix the message (the script's default says "Fired by scheduled GitHub Action", which isn't true here):
   ```bash
   git add sitemap.xml llms.txt && git commit --amend -m "Publish today's blog: <title>"
   ```
6. `git pull --rebase origin main` then `git push origin HEAD:main`. Vercel redeploys.

## Step 6 — Verify before you call it done
- Sanity-render locally (also runs the horizontal guard); must not raise and must leave no `{{ }}` placeholders:
  ```bash
  python3 -c "import sys,json; sys.path.insert(0,'.github/scripts'); import publish_next as p; html=p.render_post_html(json.load(open('.github/blog-drafts/<slug>/blog.json'))); print('OK', len(html), 'placeholders:', html.count('{{'))"
  ```
- Confirm `posts/<slug>/index.html` exists, the hub card is in `blog/index.html`, the queue entry is `published`, and the new URL is in `sitemap.xml` + `llms.txt`.

## Report back
Give Mark: the post title, the live URL (`https://blog.markandrewboudoir.com/posts/<slug>/`), which images went where (confirm card/hero are horizontal), and that it's pushed and deploying. Optionally add a ~10am ET review reminder on the "To Do List" calendar.
