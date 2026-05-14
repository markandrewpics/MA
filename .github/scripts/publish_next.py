#!/usr/bin/env python3
"""Publish the next queued blog draft.

Workflow (called by .github/workflows/publish-blog.yml):
  1. Load .github/blog-drafts/publish-schedule.json
  2. Pick the draft to publish:
     - If $FORCE_SLUG is set, use that slug (manual override)
     - Otherwise, find the first entry whose scheduledDate <= today AND status == 'queued'
  3. Render the draft's blog.json into a full HTML page using template.html
  4. Write it to posts/<slug>/index.html
  5. Inject a card into blog/index.html POSTS array (right after the featured entry)
  6. Mark the queue entry as 'published' with publishedAt timestamp
  7. git add + commit (workflow pushes separately)

If there's nothing to publish, exits 0 silently. The workflow handles the "no commit
to push" case by diffing HEAD against HEAD~1.

The script is pure stdlib — no pip install needed in the workflow.
"""

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from html import escape
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DRAFTS_DIR = REPO_ROOT / ".github" / "blog-drafts"
SCHEDULE_FILE = DRAFTS_DIR / "publish-schedule.json"
TEMPLATE_FILE = DRAFTS_DIR / "template.html"
HUB_FILE = REPO_ROOT / "blog" / "index.html"
POSTS_DIR = REPO_ROOT / "posts"


def log(msg):
    print(f"[publish_next] {msg}", flush=True)


# -- Load queue ---------------------------------------------------------------

def load_schedule():
    if not SCHEDULE_FILE.exists():
        log(f"FATAL: schedule file missing at {SCHEDULE_FILE}")
        sys.exit(1)
    with open(SCHEDULE_FILE) as f:
        return json.load(f)


def save_schedule(data):
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def pick_entry(schedule, force_slug=None):
    if force_slug:
        for entry in schedule["queue"]:
            if entry["slug"] == force_slug:
                return entry
        log(f"FATAL: forced slug '{force_slug}' not found in queue")
        sys.exit(1)
    today = datetime.now(timezone.utc).date().isoformat()
    for entry in schedule["queue"]:
        if entry["status"] == "queued" and entry["scheduledDate"] <= today:
            return entry
    return None


# -- Render the post HTML -----------------------------------------------------

def render_section(section):
    """Render one H2 section: question + direct-answer block + prose paragraphs."""
    h2 = escape(section["h2"])
    answer = section["answer"]  # rendered as-is to allow <strong>, <em>
    prose_html = "\n      ".join(f"<p>{p}</p>" for p in section.get("prose", []))
    bullets_html = ""
    if section.get("bullets"):
        items = "\n        ".join(f"<li>{b}</li>" for b in section["bullets"])
        bullets_html = f"<ul>\n        {items}\n      </ul>"
    return f"""    <h2>{h2}</h2>
    <div class="section-answer">
      <p>{answer}</p>
    </div>
      {prose_html}
      {bullets_html}
"""


def render_faqs(faqs):
    """Render FAQ schema JSON-LD block."""
    if not faqs:
        return ""
    entries = [
        {
            "@type": "Question",
            "name": faq["q"],
            "acceptedAnswer": {"@type": "Answer", "text": faq["a"]},
        }
        for faq in faqs
    ]
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": entries,
    }
    return f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>'


def render_article_schema(blog):
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": blog["title"],
        "description": blog["metaDescription"],
        "author": {"@type": "Person", "name": "Mark Andrew"},
        "publisher": {"@id": "https://www.markandrewboudoir.com/#business"},
        "datePublished": blog["datePublished"],
    }
    if blog.get("heroImage"):
        schema["image"] = f"https://blog.markandrewboudoir.com{blog['heroImage']}"
    return f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>'


def render_post_html(blog):
    """Fill the template with a blog dict."""
    with open(TEMPLATE_FILE) as f:
        template = f.read()

    sections_html = "\n".join(render_section(s) for s in blog["sections"])
    faqs_html = render_faqs(blog.get("faqs", []))
    article_schema = render_article_schema(blog)

    hero_block = ""
    if blog.get("heroImage"):
        hero_block = f"""  <figure class="hero-image">
    <div class="frame">
      <img src="{escape(blog['heroImage'])}" alt="{escape(blog.get('heroAlt', blog['title']))}" loading="lazy" />
    </div>
    {f'<figcaption>{escape(blog["heroCaption"])}</figcaption>' if blog.get('heroCaption') else ''}
  </figure>
"""

    og_image_path = blog.get("heroImage") or blog.get("cardImage") or "/uploads/Boudoir PNG.png"
    og_image_url = f"https://blog.markandrewboudoir.com{og_image_path}"

    replacements = {
        "{{TITLE}}": escape(blog["title"]),
        "{{META_DESCRIPTION}}": escape(blog["metaDescription"]),
        "{{CANONICAL}}": f"https://blog.markandrewboudoir.com/posts/{blog['slug']}/",
        "{{OG_IMAGE}}": og_image_url,
        "{{BREADCRUMB_CATEGORY}}": escape(blog.get("breadcrumbCategory", blog["categoryLabel"])),
        "{{EYEBROW}}": escape(blog.get("eyebrow", "the journal")),
        "{{H1}}": blog["h1"],  # raw, can contain <em>
        "{{SUBTITLE}}": blog["subtitle"],  # raw, can contain <em>
        "{{DIRECT_ANSWER}}": blog["directAnswer"],
        "{{HERO_BLOCK}}": hero_block,
        "{{SECTIONS}}": sections_html,
        "{{FAQ_SCHEMA}}": faqs_html,
        "{{ARTICLE_SCHEMA}}": article_schema,
        "{{CLOSER_EYEBROW}}": escape(blog.get("closerEyebrow", "the studio is open")),
        "{{CLOSER_H3}}": blog.get("closerH3", "Ready to feel different?"),
        "{{CLOSER_BODY}}": blog.get(
            "closerBody",
            "If something in this post hit a nerve — let's talk. No pressure, no commitment, just a real conversation.",
        ),
    }

    out = template
    for needle, value in replacements.items():
        out = out.replace(needle, value)
    return out


# -- Hub card injection -------------------------------------------------------

def inject_hub_card(blog):
    """Insert a new card into the POSTS array in blog/index.html.

    Inserts the new card as the second entry (right after the featured first one)
    so the latest post is most visible.
    """
    if not HUB_FILE.exists():
        log(f"FATAL: hub file missing at {HUB_FILE}")
        sys.exit(1)

    with open(HUB_FILE) as f:
        hub = f.read()

    # The POSTS array always starts with `const POSTS = [` followed by entries.
    # We want to insert right after the first entry's closing `},` line.
    marker = "const POSTS = ["
    idx = hub.find(marker)
    if idx == -1:
        log("FATAL: could not find POSTS array in hub")
        sys.exit(1)

    # Find the end of the first entry (the featured one) — first `},\n` after marker
    first_entry_end = hub.find("},\n", idx)
    if first_entry_end == -1:
        log("FATAL: could not find end of first POSTS entry")
        sys.exit(1)
    insert_at = first_entry_end + len("},\n")

    excerpt = blog["cardExcerpt"].replace("'", "\\'")
    title = blog["cardTitle"].replace("'", "\\'")
    new_card = f"""      {{
        slug: '{blog['slug']}',
        title: '{title}',
        excerpt: '{excerpt}',
        category: '{blog['category']}',
        categoryLabel: '{blog['categoryLabel']}',
        date: '{blog['cardDate']}',
        image: '{blog['cardImage']}',
        url: '/posts/{blog['slug']}/'
      }},
"""

    new_hub = hub[:insert_at] + new_card + hub[insert_at:]
    with open(HUB_FILE, "w") as f:
        f.write(new_hub)
    log(f"Inserted hub card for '{blog['slug']}'")


# -- Main ---------------------------------------------------------------------

def main():
    force_slug = os.environ.get("FORCE_SLUG", "").strip() or None

    schedule = load_schedule()
    entry = pick_entry(schedule, force_slug)

    if entry is None:
        log("Nothing to publish — queue empty or no entries due today.")
        return 0

    slug = entry["slug"]
    log(f"Publishing draft: {slug}")

    draft_dir = DRAFTS_DIR / slug
    blog_json_path = draft_dir / "blog.json"
    if not blog_json_path.exists():
        log(f"FATAL: draft blog.json missing at {blog_json_path}")
        sys.exit(1)

    with open(blog_json_path) as f:
        blog = json.load(f)

    # Render the post
    post_html = render_post_html(blog)
    out_dir = POSTS_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "index.html"
    out_path.write_text(post_html)
    log(f"Wrote {out_path}")

    # Inject hub card
    inject_hub_card(blog)

    # Mark entry as published in the queue
    now = datetime.now(timezone.utc).isoformat()
    for q in schedule["queue"]:
        if q["slug"] == slug:
            q["status"] = "published"
            q["publishedAt"] = now
            break
    save_schedule(schedule)
    log(f"Marked '{slug}' as published in schedule")

    # Stage and commit
    subprocess.run(["git", "add",
                    str(out_path.relative_to(REPO_ROOT)),
                    str(HUB_FILE.relative_to(REPO_ROOT)),
                    str(SCHEDULE_FILE.relative_to(REPO_ROOT))],
                   check=True, cwd=REPO_ROOT)
    commit_msg = f"Auto-publish: {blog['title']}\n\nFired by scheduled GitHub Action."
    result = subprocess.run(
        ["git", "commit", "-m", commit_msg],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        if "nothing to commit" in result.stdout.lower() or "nothing to commit" in result.stderr.lower():
            log("Nothing to commit — already up to date.")
            return 0
        log(f"git commit failed: {result.stdout}\n{result.stderr}")
        sys.exit(1)
    log("Committed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
