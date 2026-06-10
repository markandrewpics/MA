---
name: blog-images
description: Take a folder of shoot photos and wire them into a blog post correctly — SEO-friendly filenames, horizontal-only thumbnails, copied into uploads, and placed into the post as hero/inline images. Trigger on "add these photos to the blog", "the images are in [folder], wire them up", "use these pictures for [post]", "put [client]'s photos in the blog", "swap the blog image", or any request to get shoot images onto a post. Enforces Mark's hard rule: hub card + hero covers are ALWAYS horizontal so no heads/feet get cropped.
---

# Blog Images

Read `CLAUDE.md` first (image rules, brand, repo layout). Mark is non-technical; just place the images well and report.

## What this skill does
Takes a folder of a client's shoot images and gets them onto a blog: renamed for SEO, verified horizontal where it matters, copied into `uploads/`, and laid into the post (hero, two-col, framed inline) — committed and pushed.

## Step 1 — Find + look at the images
- Mark drops folders like `Becky Blog/` under the project, or names a path. `find` it.
- **Actually view the images** (Read tool) to caption/alt them accurately and to spot which are horizontal vs vertical. Note distinct shoots/sets (e.g. studio boudoir vs angel-wings vs glamour) so the layout tells a story.

## Step 2 — Rename for SEO
- Descriptive, hyphenated, keyworded slugs: subject + wardrobe + light/prop + "boudoir/intimate portraits" + town.
  e.g. `becky-red-lace-pearls-looking-up-boudoir-south-bend-in.jpg`
- Copy (don't move) into `uploads/<client>-blog/` (or the right uploads subfolder). Keep originals intact.

## Step 3 — THE HARD RULE: horizontal covers
- The hub `cardImage` and the post `heroImage` MUST be **horizontal (width > height)**. Vertical thumbnails crop 16:10 and chop heads/feet — this has burned us repeatedly and the publisher guard now rejects it.
- Verify every candidate: `sips -g pixelWidth -g pixelHeight "<file>"`. Only assign a landscape image as card/hero. Verticals are fine as inline `bodyImages`.

## Step 4 — Place them in the post
- **Hero:** one strong horizontal at top (framed). **Inline:** `bodyImages` between sections — `single` for emphasis, `two-col` for pairs/variety. Give each real alt text + a short caption.
- For posts built from `blog.json`, add to the `bodyImages` array (`afterSection` is 0-based). For already-rendered `posts/<slug>/index.html`, insert the framed-figure / two-col markup directly and add the `.frame`/`.framed-image`/`.two-col` CSS if missing.
- Update `cardImage`, `heroImage`, and the OG/Twitter image refs together so the share preview matches.
- URL-encode spaces in paths (`/uploads/Use%20These%20Images/...`).

## Step 5 — Commit + push
- Per `CLAUDE.md` (git identity if needed, `pull --rebase`, `push origin HEAD:main`). Vercel redeploys.

## Report back
List which images went where (hero, which sections), and confirm every thumbnail is horizontal. If Mark only wanted a single swap (e.g. "change the cover photo"), do just that and confirm it's landscape.
