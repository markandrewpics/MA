---
name: aeo-interview-prompts
description: Generate the record-in-your-own-words interview prompts Mark reads aloud and answers (into WhisperFlow) so his blogs are written from his real expertise, not AI. Trigger on "make me interview questions about X", "give me prompts for the blog", "interview questions for [topic/client]", "questions to record for my next blogs", "build me a prompt sheet", or any request for the questions that come BEFORE writing a blog. Output is a prompt doc (markdown, optionally a branded PDF). The companion to aeo-blog-from-transcript (which writes the blog from the answers).
---

# AEO Interview Prompts

Read `CLAUDE.md` first for studio facts, geography, and the AEO format. Mark is non-technical; hand him a clean doc he can read off and record.

## What this skill does
Produces the questions Mark answers out loud so the eventual blog is in his voice. Works for: a single blog topic, a batch of blogs, a client interview (e.g. Katherine/Heidi/Becky), or a niche piece.

## Step 1 — Source the real questions
- Pull from the Brain2 dataset: `Brain2/Content Creation/AEO Boudoir — Top 12 Questions per Blog Topic.md` (real Google-autocomplete questions ranked by popularity), or `.github/blog-drafts/_topic-clusters.json`, or a dataset Mark names.
- If Mark gives a fresh keyword list, cluster it: one blog = one topic, with the related questions as that blog's H2 sub-questions. The COST example: pillar "How much are boudoir photos?" with sub-qs about albums, couples, session+album, etc.

## Step 2 — Dedupe against existing content
- Check `posts/`, the standalone page folders, and `publish-schedule.json`. Pick angles that DON'T cannibalize live posts (e.g. a general-intent cost pillar is distinct from the local cost page). Flag overlaps to Mark.

## Step 3 — Write the prompts
For each blog:
- **Title** (working) + **publish date** if scheduling.
- **"Ranks for"** — the real search questions it targets (these become the H2s).
- **6–8 record-in-your-own-words prompts** — phrased to make Mark rant. Ground them in his real specifics (Aletheia, same-day reveal, 130–160 images, Affirm, acrylic albums, old-Hollywood style, both studios) so his answers come out concrete, not generic.
- Tell him: ramble freely, ums are fine, answer in full sentences when he can, skip any that don't hit.
- Flag the sensitive/high-value ones (e.g. faith topics) that need extra time and only work in his voice.

## Step 4 — Deliver
- Save the markdown to `~/Desktop/AEO/` (where the other prompt docs live).
- Offer a branded PDF via the `mark-andrew-pdf` skill so he can read off-screen while recording.
- Close with the handoff: he records → sends transcripts → `aeo-blog-from-transcript` writes + queues them.

## Scope note
This is the FRONT half of the pipeline. Don't write the actual blogs here — that's `aeo-blog-from-transcript`, after Mark records. The whole point is to avoid feeding AI with AI.
