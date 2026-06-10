---
name: blog-publish-doctor
description: Diagnose and fix a blog that was supposed to auto-publish but didn't show up on blog.markandrewboudoir.com. Trigger on "today's blog didn't post", "the blog didn't publish", "why isn't my blog live", "check on today's post", "the scheduled blog is missing", or any report that a queued/scheduled blog failed to go live. Runs the checklist of known failure modes, fixes the cause, and force-publishes the catch-up.
---

# Blog Publish Doctor

Read `CLAUDE.md` first (the publish system, image rules, git workflow). Mark is non-technical; diagnose, fix, and tell him plainly what happened.

## What this skill does
Figures out why a scheduled blog didn't publish, fixes it, and gets the post live.

## Step 1 — Confirm the situation
- `date` — what day is it, and what was supposed to publish?
- Inspect the queue: which entries are `queued` vs `published` in `.github/blog-drafts/publish-schedule.json`.
- `git pull --rebase origin main` first so you're looking at the real latest state (the Action commits to `main`).

## Step 2 — Check the Action run
```
gh run list --workflow=publish-blog.yml --limit 6
```
- If the run shows `failure`, get the reason:
  ```
  gh run view <run-id> --log-failed | grep -iE "FATAL|error" | head
  ```
- If there's NO run at the expected time: GitHub cron can delay or skip on heavy load, and Actions disable themselves after ~60 days of repo inactivity. Note which.

## Step 3 — The known failure modes (most common first)
1. **Vertical image** — guard refuses to publish if `cardImage`/`heroImage` is taller than wide. Fix: swap to a horizontal image (verify with `sips -g pixelWidth -g pixelHeight`).
2. **Missing image on disk** — uploads got reorganized and the path in `blog.json` no longer exists (e.g. files moved into `uploads/Use These Images/`). Fix: repoint `cardImage`/`heroImage` to the real location; URL-encode spaces as `%20`.
3. **`.gitignore` swallowing files** — an unanchored rule (e.g. `blog-drafts/`) can block `.github/blog-drafts/` from being staged. Fix: anchor it (`/blog-drafts/`).
4. **Git identity error** — "Author identity unknown": set `user.email`/`user.name` (see `CLAUDE.md`).
5. **Push rejected / stale ref** — `pull --rebase` and retry; remove any stray Finder-duplicate refs like `refs/heads/...keen-driscoll 2`.

## Step 4 — Fix + force-publish
- Apply the fix, commit, push (`CLAUDE.md` workflow).
- Verify the fix locally if it's image/render related (render the `blog.json` through `publish_next.render_post_html`).
- Publish the catch-up now instead of waiting:
  ```
  gh workflow run publish-blog.yml -f force_slug=<slug>
  gh run watch <run-id> --exit-status
  ```
- Confirm the post is live at `blog.markandrewboudoir.com/posts/<slug>/` and the queue entry flipped to `published`.

## Report back
Plain-English: what broke, what you fixed, and that the post is now live. If the root cause could recur (e.g. a guard gap or path convention), say what you hardened so it won't happen again.
