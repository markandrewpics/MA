---
name: aeo-blog-from-transcript
description: Turn a recorded interview or Mark's dictated answers into a finished, AEO-optimized blog post for blog.markandrewboudoir.com and queue it to publish. Trigger on "make this a blog", "turn this transcript into a blog", "write the blog from my recording", "build the blog from [name]'s interview", "here are my answers, write the blog", or any time Mark hands over interview/transcript text meant to become a blog post. This is for the AEO auto-publish pipeline (blog.json + template.html), NOT the older React-template new-blog-post flow.
---

# AEO Blog From Transcript

Read `CLAUDE.md` at the repo root first — it has the studio facts, schema, brand tokens, booking embed, image rules, and git workflow. Mark is non-technical; just do the work and report plainly.

## What this skill does
Takes Mark's recorded answers (a client interview transcript, or him answering interview prompts) and produces a finished blog: a `blog.json` draft, queued in `publish-schedule.json`, with horizontal images, schema, and the booking CTA — committed and pushed so it auto-publishes on its date.

## Step 1 — Get the raw material
- The transcript may be: pasted in chat, in an Apple Note, in the Brain2 vault, or a file on the Desktop. If it's a large Apple Note, read it in chunks.
- If there are two halves (e.g. "this part is for my blog… this part is for you"), only use the half meant for the blog. Confirm the split point if unclear.

## Step 2 — Pick the topic + real search questions
- Each blog = ONE topic. The H2 sections should be **real questions people Google**, pulled from `.github/blog-drafts/_topic-clusters.json` or the Brain2 dataset (`Brain2/Content Creation/AEO Boudoir — Top 12 Questions per Blog Topic.md`).
- Collapse local variants (South Bend / Mishawaka / Granger / Niles…) into ONE blog; weave towns into body copy. Never make near-duplicate doorway pages.
- Dedupe against what already exists: check `posts/`, the standalone page folders, and `publish-schedule.json` so you don't rewrite a live topic.

## Step 3 — Write it in Mark's voice (current format)
**Cohesive single-voice. Mark is the author.** Do NOT use the old visible "answer box vs. prose" split.
- Under each `h2`, the first paragraph (`answer`) is a tight **40–60 word direct answer** — declarative, first person, what an AI engine will extract. Then `prose` flows straight on as Mark's continuous expert voice.
- Weave Mark's actual recorded words/stories in — that's the point. Clean up ums and repetition; keep his phrasing, opinions, and real anecdotes. Don't invent facts; use the studio facts in `CLAUDE.md`.
- Fill every `blog.json` field (see schema in `CLAUDE.md`): metadata, `directAnswer`, `sections`, `faqs` (for FAQPage schema), `closer*`, and `social` (Instagram caption, YouTube description, 12 hashtags incl. local, tweet).

## Step 4 — Images
- Use the `blog-images` skill if Mark has a folder of shoot images for this post.
- **`cardImage` and `heroImage` MUST be horizontal (width > height)** — the publisher guard rejects vertical. Verify with `sips -g pixelWidth -g pixelHeight <file>`.
- Add `bodyImages` between sections for visual rhythm (single + two-col). URL-encode spaces (`%20`).

## Step 5 — Schedule + queue
- Add an entry to `.github/blog-drafts/publish-schedule.json` with the next open slot. Cadence is **Sun/Tue/Thu** going forward (older entries were Sun/Wed).
- Add the matching `.github/blog-drafts/<slug>/blog.json`.

## Step 6 — Test, commit, push
- Sanity-render locally before committing:
  ```
  python3 -c "import sys,json; sys.path.insert(0,'.github/scripts'); import publish_next as p; print(len(p.render_post_html(json.load(open('.github/blog-drafts/<slug>/blog.json')))))"
  ```
  It must not raise (the horizontal guard runs here) and produce no `{{ }}` placeholders.
- Commit + push per `CLAUDE.md` (set git identity if needed; `pull --rebase`; `push origin HEAD:main`). The Action publishes on the scheduled date; to publish immediately use `gh workflow run publish-blog.yml -f force_slug=<slug>`.
- Optionally add a ~10am ET review reminder on the "To Do List" calendar.

## Report back
Tell Mark: the post title, its publish date, and that it's queued. Note if images are placeholders awaiting his real shots.
