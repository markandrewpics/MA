---
name: new-blog-post
description: Create a new blog post for blog.markandrewboudoir.com. Trigger on phrases like "new blog post", "create a blog post about", "write a post about", "new post for the blog", or any request to add a blog entry. Handles the entire workflow — gathering content, generating the post folder, updating the blog hub, previewing locally, and pushing to live.
---

# New Blog Post Workflow

When the user asks to create a new blog post, follow this workflow exactly. The user is non-technical — guide them, don't dump options on them.

## Step 1: Gather post details

Ask the user for these in a single message (numbered list, friendly tone):

1. **Title** — full post title (e.g., "What to Wear for Your First Boudoir Photoshoot")
2. **Category** — must be one of: `boudoir`, `glamour`, `couples`, `bridal-boudoir`, `behind-the-scenes`, `tips-and-prep`, `featured-sessions`
3. **Excerpt** — 1–2 sentence summary for the hub card (or say "you write it" and draft one for them based on title)
4. **Photos** — which filenames in `/uploads/` to use, including which is the **hero**. If they have new photos to upload, ask them to drop into `/uploads/` first.
5. **Body content** — they can either:
   - Write the full draft themselves
   - Give bullet-point key points and ask Claude to draft → user reviews/edits
6. **CTA type** — `form` (reuse the form from `posts/what-is-boudoir-photography/index.html`) or `calendar` (paste GHL embed code)
7. **CTA heading + button text** — e.g., "Ready to book your session?" / "Schedule a Consultation"

## Step 2: Generate the post

**File location:** `posts/{slug}/index.html` where `{slug}` is the kebab-case version of the title (e.g., `what-to-wear-for-your-first-boudoir-photoshoot`).

**Use the existing post as the template:** read `posts/what-is-boudoir-photography/index.html` and adapt it. That post is the canonical structural reference — same React/Babel inline pattern, same brand tokens, same section order.

**Brand tokens (do not change):**
- Body bg: `#0c1322`
- Card/nav rgba: `rgba(16, 22, 38, ...)`
- Text: `#eef0f5`
- Accent: `#f09a69` (warm peach)
- Strong text: `#f2f4f8`
- Body font: `Jost`
- Display font: `Cormorant Garamond`
- Script accent: `Great Vibes`

**Fixed sections (replicate exactly, vary only labels/links if specified):**
- Top nav with headshot logo (`/uploads/Boudoir PNG.png`) — links to home/sections
- Hero with eyebrow tag + title + date + author byline
- Footer
- Recommended Posts section (3 cards, same brand styling) — pick 3 most recent published posts from same/related categories

**Variable sections (regenerate per post):**
- Title, date, eyebrow tag, body content
- Hero image
- Photo gallery (scales: 6–10 photos = standard editorial layout; 20+ photos = masonry/grid layout — adapt visually to count)
- CTA section (either reuse the existing form OR paste in user's GHL calendar embed)

**Image paths must always be absolute starting with `/`:** `/uploads/filename.jpg`. The tweaks-panel script must reference `/tweaks-panel.jsx`.

**Headshot placement:** the existing post uses `/uploads/MarkAndrewHeadshot-b27ac26c.jpg` in the byline area near the top. Keep this convention for new posts unless told otherwise.

## Step 3: Update the blog hub

Edit `index.html` (root) — find the `POSTS` array in the inline script. Two cases:

**Case A: There's a "coming soon" card with matching category:**
- Replace that placeholder with the real post entry (title, excerpt, image, url, date, no `coming` flag)
- Move the new post to position 0 (top) so it becomes the **featured** card
- Move the previously-featured post out of position 0 (set its `featured: false`, leave at position 1)

**Case B: No matching coming-soon card:**
- Add a new entry at position 0 with `featured: true`
- Demote the previously-featured post (`featured: false`)

Always: only ONE post should have `featured: true` at a time.

## Step 4: Preview

Tell the user the new post is visible at:
- Hub: http://localhost:8000
- Post: http://localhost:8000/posts/{slug}/

Ask them to look at both and approve before pushing.

## Step 5: Commit and push

When user approves, run:

```bash
cd "/Users/markboughton/Desktop/Lull Website" && git add -A && git -c user.email="markandrewpics@users.noreply.github.com" -c user.name="markandrewpics" commit -m "Add new blog post: {title}" && PATH="$HOME/.local/bin:$PATH" git push
```

Tell user it'll be live at `blog.markandrewboudoir.com/posts/{slug}/` within ~30 seconds via Vercel auto-deploy.

## Notes

- **Image compression:** if the user uploads new photos, check file sizes. Anything over ~1MB per image should be flagged — recommend running through tinypng.com or similar before commit (don't auto-compress without asking).
- **SEO basics:** every post should have a unique `<title>` tag and `<meta name="description">` based on the excerpt. The existing post already does this — just adapt.
- **Don't break the canonical post:** if you need to look at structure, READ `posts/what-is-boudoir-photography/index.html` — don't modify it as part of creating a new one.

## REQUIRED: Open Graph + Twitter Card tags

**Every new blog post MUST include OG and Twitter Card meta tags pointing to a CONTENT image (not the logo)**. Without these, Facebook / iMessage / LinkedIn previews fall back to scraping the nav logo, which looks terrible when shared.

Insert this block in the `<head>` immediately after the existing `<meta name="description">` tag. Replace `{TITLE}`, `{DESC}`, `{SLUG}`, and `{HERO_IMAGE_FILENAME}` with the post's values:

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="article" />
<meta property="og:url" content="https://www.markandrewboudoir.com/posts/{SLUG}/" />
<meta property="og:title" content="{TITLE}" />
<meta property="og:description" content="{DESC}" />
<meta property="og:image" content="https://www.markandrewboudoir.com/uploads/{HERO_IMAGE_FILENAME}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="800" />
<meta property="og:site_name" content="Mark Andrew Boudoir" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://www.markandrewboudoir.com/posts/{SLUG}/" />
<meta name="twitter:title" content="{TITLE}" />
<meta name="twitter:description" content="{DESC}" />
<meta name="twitter:image" content="https://www.markandrewboudoir.com/uploads/{HERO_IMAGE_FILENAME}" />
```

**Hero image selection rules:**
- Must be the post's primary content image, NOT the nav logo.
- Should be horizontal (landscape) if available — Facebook crops vertical images awkwardly. If only vertical is available, use it but note that previews may show a tall crop.
- Use a fully-qualified absolute URL (`https://www.markandrewboudoir.com/uploads/...`), not a relative path. Facebook caches by absolute URL.
- File should already exist in `/uploads/` and be committed before pushing — otherwise Facebook scrapes a 404.

**After publishing:** tell the user to refresh Facebook's cached preview at https://developers.facebook.com/tools/debug/ — paste the post URL, click "Scrape Again." Otherwise the OLD preview lingers for ~24 hours.
