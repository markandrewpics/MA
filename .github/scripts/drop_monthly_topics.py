#!/usr/bin/env python3
"""Drop the next 8 queued blog topics into a monthly batch file + GitHub Issue.

Workflow (called by .github/workflows/monthly-topic-drop.yml on the first
Monday of each month):

  1. Load .github/blog-drafts/_topic-clusters.json
  2. Find the first 8 clusters with status == 'queued'
  3. Write .github/blog-drafts/_monthly-batches/YYYY-MM.md with each
     cluster's title + interview questions + blank space for Mark's answers
  4. Flip those 8 clusters' status to 'topics-dropped' in the cluster file
  5. git add + commit (workflow pushes separately)
  6. Open a GitHub Issue titled "[Month YYYY] Your 8 boudoir blog topics
     are ready" with the same content as the markdown file (plus a link
     to it). The issue notification is the reminder.

If fewer than 8 clusters are queued, drop whatever's left and flag in the
output that the cluster queue needs refilling.

If zero clusters are queued, open an issue titled "Topic queue is empty —
time for another 80-query research pull" and exit without dropping
anything.

Pure stdlib — no extra dependencies. GitHub Issue creation uses `gh` CLI
(pre-installed on ubuntu-latest runners).
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CLUSTERS_FILE = REPO_ROOT / ".github" / "blog-drafts" / "_topic-clusters.json"
BATCHES_DIR = REPO_ROOT / ".github" / "blog-drafts" / "_monthly-batches"

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def log(msg):
    print(f"[drop_monthly_topics] {msg}", flush=True)


# -- Load / save clusters -----------------------------------------------------

def load_clusters():
    if not CLUSTERS_FILE.exists():
        log(f"FATAL: cluster file missing at {CLUSTERS_FILE}")
        sys.exit(1)
    with open(CLUSTERS_FILE) as f:
        return json.load(f)


def save_clusters(data):
    with open(CLUSTERS_FILE, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


# -- Build the monthly batch markdown -----------------------------------------

def build_batch_markdown(year_month_label, dropped_clusters, queue_empty_warning=None):
    lines = [
        f"# Boudoir blog topics for {year_month_label}",
        "",
        "Eight new blog topics, dropped automatically by the 1st-of-month "
        "GitHub Action. Each one is one blog. Each one ranks for multiple "
        "local-variant search queries (South Bend, Mishawaka, Granger, Niles, "
        "Edwardsburg, Berrien Springs, Michiana) via natural body content — "
        "do NOT write a separate blog per town. Google penalizes that.",
        "",
        "## How to use this file",
        "",
        "1. Dictate or type your answers directly under each interview "
        "question below. WhisperFlow works great — just talk and let it "
        "transcribe.",
        "2. When you've finished answering all 8 sets, ping me in Claude "
        "Code: *\"build the blogs from this month's batch.\"*",
        "3. I'll read this file, turn each set of answers into a finished "
        "`blog.json`, and queue them for publishing on the next available "
        "Sunday / Wednesday slots.",
        "",
        "---",
        "",
    ]

    if queue_empty_warning:
        lines.extend([
            f"> **Queue running low:** {queue_empty_warning}",
            "",
            "---",
            "",
        ])

    for i, cluster in enumerate(dropped_clusters, start=1):
        lines.append(f"## {i}. {cluster['title']}")
        lines.append("")
        if cluster.get("rationale"):
            lines.append(f"*Why this one:* {cluster['rationale']}")
            lines.append("")
        if cluster.get("searchQueries"):
            lines.append("**Ranks for these search queries:**")
            for q in cluster["searchQueries"]:
                lines.append(f"- {q}")
            lines.append("")
        lines.append("**Interview questions:**")
        lines.append("")
        for j, q in enumerate(cluster["interviewQuestions"], start=1):
            lines.append(f"### Q{j}. {q}")
            lines.append("")
            lines.append("_(your answer here)_")
            lines.append("")
        lines.append("---")
        lines.append("")

    lines.append(
        "When all 8 sets above are filled in, ping me. I'll build the blogs "
        "and queue them for the next Sun/Wed publish slots."
    )
    lines.append("")
    return "\n".join(lines)


# -- GitHub Issue -------------------------------------------------------------

def open_github_issue(title, body):
    """Use gh CLI (pre-installed on ubuntu-latest) to open an issue."""
    result = subprocess.run(
        ["gh", "issue", "create", "--title", title, "--body", body],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log(f"WARNING: failed to open GitHub issue: {result.stderr}")
        log("Continuing — the commit will still land, you just won't get an email.")
        return None
    issue_url = result.stdout.strip()
    log(f"Opened issue: {issue_url}")
    return issue_url


# -- Main ---------------------------------------------------------------------

def main():
    data = load_clusters()
    queued = [c for c in data["clusters"] if c.get("status") == "queued"]

    today = datetime.now(timezone.utc)
    year_month_slug = today.strftime("%Y-%m")
    year_month_label = f"{MONTH_NAMES[today.month]} {today.year}"

    # Zero queued -> open warning issue and exit
    if not queued:
        log("No queued clusters available. Topic queue is empty.")
        title = f"Topic queue is empty — time for another 80-query research pull"
        body = (
            "The monthly topic drop ran but found zero queued clusters in "
            "`.github/blog-drafts/_topic-clusters.json`.\n\n"
            "**Action required:** open Perplexity, ask for ~80 more boudoir / "
            "branding / luxury-portrait search queries for the Michiana market, "
            "paste them to Claude in your next session, and I'll re-cluster them "
            "into a fresh batch of blog topics.\n\n"
            "Until the queue is refilled, no new blogs will be drafted."
        )
        open_github_issue(title, body)
        return 0

    # Pick the next 8
    dropped = queued[:8]
    warning = None
    if len(queued) < 8:
        warning = (
            f"Only {len(queued)} clusters were left in the queue this month "
            f"— next month's batch will be empty unless you provide a fresh "
            f"research pull before then."
        )
        log(f"WARNING: only {len(queued)} clusters available, dropping all of them.")
    elif len(queued) - 8 < 8:
        warning = (
            f"Only {len(queued) - 8} clusters remain in the queue after this "
            f"drop. Plan to refresh the topic source soon (paste a new 80-query "
            f"list from Perplexity into Claude)."
        )

    # Build markdown
    md = build_batch_markdown(year_month_label, dropped, queue_empty_warning=warning)
    BATCHES_DIR.mkdir(parents=True, exist_ok=True)
    batch_path = BATCHES_DIR / f"{year_month_slug}.md"
    batch_path.write_text(md)
    log(f"Wrote batch markdown to {batch_path}")

    # Flip statuses
    dropped_slugs = {c["slug"] for c in dropped}
    for c in data["clusters"]:
        if c["slug"] in dropped_slugs:
            c["status"] = "topics-dropped"
            c["droppedAt"] = today.isoformat()
    save_clusters(data)
    log(f"Marked {len(dropped)} clusters as 'topics-dropped' in cluster file.")

    # Stage and commit (workflow pushes)
    subprocess.run(
        ["git", "add",
         str(batch_path.relative_to(REPO_ROOT)),
         str(CLUSTERS_FILE.relative_to(REPO_ROOT))],
        check=True, cwd=REPO_ROOT,
    )
    commit_msg = (
        f"Auto-drop: {len(dropped)} boudoir blog topics for {year_month_label}\n\n"
        f"Fired by .github/workflows/monthly-topic-drop.yml on the first "
        f"Monday of {year_month_label}.\n\n"
        f"Dropped clusters:\n"
        + "\n".join(f"- {c['slug']}" for c in dropped)
    )
    result = subprocess.run(
        ["git", "commit", "-m", commit_msg],
        cwd=REPO_ROOT, capture_output=True, text=True,
    )
    if result.returncode != 0:
        if "nothing to commit" in (result.stdout + result.stderr).lower():
            log("Nothing to commit — already up to date.")
            return 0
        log(f"git commit failed: {result.stdout}\n{result.stderr}")
        sys.exit(1)
    log("Committed.")

    # Open GitHub issue with the same content
    repo_relative_path = batch_path.relative_to(REPO_ROOT)
    issue_title = f"[{year_month_label}] Your 8 boudoir blog topics are ready"
    issue_body = (
        f"Eight new blog topics for **{year_month_label}** have been auto-dropped.\n\n"
        f"**Open the batch file to dictate your answers:** "
        f"[`{repo_relative_path}`](../blob/main/{repo_relative_path})\n\n"
        f"---\n\n"
        f"{md}\n\n"
        f"---\n\n"
        f"When all 8 sets of answers are filled in, ping me in Claude Code "
        f"with *\"build the blogs from {year_month_label}'s batch\"* and I'll "
        f"generate the blog drafts, queue them, and set up your calendar "
        f"reminders.\n"
    )
    open_github_issue(issue_title, issue_body)

    return 0


if __name__ == "__main__":
    sys.exit(main())
