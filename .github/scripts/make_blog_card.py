#!/usr/bin/env python3
"""Generate a branded hub-card thumbnail: a horizontal photo with the blog's
short title set over it, in the Mark Andrew brand style.

Used by the `todays-blog` skill so every post's thumbnail on blog/index.html is
(1) horizontal, (2) unique, and (3) carries the post's name as an overlay.

Output is a 1600x1000 (16:10) JPEG — exactly the ratio the hub crops cards to
(.card-image { aspect-ratio: 16/10; object-fit: cover }), so the text never gets
cropped. Pure Pillow; the brand serif (Cormorant Garamond) is bundled in
fonts/ttf/.

Usage:
  python3 .github/scripts/make_blog_card.py \
      --src "uploads/Use These Images/foo.jpg" \
      --out "uploads/blog-cards/my-slug-card.jpg" \
      --title "Are Boudoir Photos a Good Idea?" \
      --eyebrow "Boudoir"
"""

import argparse
import sys
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[2]
FONT_PATH = REPO_ROOT / "fonts" / "ttf" / "CormorantGaramond-Variable.ttf"

# Brand tokens
NAVY = (12, 19, 34)
PEACH = (240, 154, 105)
TEXT = (245, 244, 246)

W, H = 1600, 1000
MARGIN_X = 150          # safe horizontal margin for text
MAX_TITLE_LINES = 3
BOTTOM_PAD = 120        # gap from bottom edge to the text block


def _load_font(size, variation="SemiBold"):
    f = ImageFont.truetype(str(FONT_PATH), size)
    try:
        f.set_variation_by_name(variation)
    except Exception:
        pass
    return f


def _cover_crop(img):
    """Resize+center-crop the source to exactly WxH (16:10), covering the box."""
    img = img.convert("RGB")
    sw, sh = img.size
    scale = max(W / sw, H / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - W) // 2
    top = (nh - H) // 2
    return img.crop((left, top, left + W, top + H))


def _scrim(base):
    """Darken for legibility: a light overall tint + a strong bottom gradient."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = overlay.load()
    for y in range(H):
        # overall 14% navy, ramping to ~84% navy across the lower 60%
        frac = max(0.0, (y / H - 0.40) / 0.60)
        a = int((0.14 + frac * 0.70) * 255)
        a = min(a, 214)
        for x in range(W):
            px[x, y] = (NAVY[0], NAVY[1], NAVY[2], a)
    return Image.alpha_composite(base.convert("RGBA"), overlay)


def _wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _fit_title(draw, text, max_w):
    """Largest font size (<=3 lines, fits width). Returns (font, lines, line_h)."""
    for size in range(118, 49, -4):
        font = _load_font(size, "SemiBold")
        lines = _wrap(draw, text, font, max_w)
        if len(lines) > MAX_TITLE_LINES:
            continue
        if all(draw.textlength(ln, font=font) <= max_w for ln in lines):
            asc, desc = font.getmetrics()
            return font, lines, int((asc + desc) * 1.04)
    font = _load_font(52, "SemiBold")
    lines = _wrap(draw, text, font, max_w)[:MAX_TITLE_LINES]
    asc, desc = font.getmetrics()
    return font, lines, int((asc + desc) * 1.04)


def _draw_tracked_caps(draw, text, font, cy, fill, tracking):
    """Draw letter-spaced uppercase text, horizontally centered at width W."""
    chars = list(text.upper())
    widths = [draw.textlength(c, font=font) for c in chars]
    total = sum(widths) + tracking * (len(chars) - 1)
    x = (W - total) / 2
    asc, desc = font.getmetrics()
    for c, cw in zip(chars, widths):
        draw.text((x, cy), c, font=font, fill=fill)
        x += cw + tracking
    return asc + desc


def make_card(src, out, title, eyebrow=None):
    src_path = Path(src)
    if not src_path.exists():
        src_path = Path(unquote(src))
    if not src_path.exists():
        print(f"FATAL: source image not found: {src}", file=sys.stderr)
        sys.exit(1)
    if not FONT_PATH.exists():
        print(f"FATAL: brand font missing: {FONT_PATH}", file=sys.stderr)
        sys.exit(1)

    base = _cover_crop(Image.open(src_path))
    base = _scrim(base)
    draw = ImageDraw.Draw(base)

    max_w = W - 2 * MARGIN_X
    title_font, lines, line_h = _fit_title(draw, title, max_w)

    eyebrow_font = _load_font(30, "Medium")
    eyebrow_h = (eyebrow_font.getmetrics()[0] + eyebrow_font.getmetrics()[1]) if eyebrow else 0
    rule_gap, rule_h, rule_w = 26, 2, 70

    block_h = len(lines) * line_h
    if eyebrow:
        block_h += eyebrow_h + rule_gap + rule_h + rule_gap
    top = H - BOTTOM_PAD - block_h

    y = top
    if eyebrow:
        _draw_tracked_caps(draw, eyebrow, eyebrow_font, y, PEACH, tracking=8)
        y += eyebrow_h + rule_gap
        draw.rectangle([(W - rule_w) / 2, y, (W + rule_w) / 2, y + rule_h], fill=PEACH)
        y += rule_h + rule_gap

    # soft drop shadow for the title, then crisp text on top
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    yy = y
    for ln in lines:
        lw = draw.textlength(ln, font=title_font)
        sdraw.text(((W - lw) / 2, yy + 3), ln, font=title_font, fill=(0, 0, 0, 170))
        yy += line_h
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    base = Image.alpha_composite(base, shadow)
    draw = ImageDraw.Draw(base)

    yy = y
    for ln in lines:
        lw = draw.textlength(ln, font=title_font)
        draw.text(((W - lw) / 2, yy), ln, font=title_font, fill=TEXT)
        yy += line_h

    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out_path, "JPEG", quality=88, optimize=True)
    print(f"OK wrote {out_path} ({W}x{H})  title={title!r}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="source photo (filesystem path)")
    ap.add_argument("--out", required=True, help="output card path")
    ap.add_argument("--title", required=True, help="short overlay title")
    ap.add_argument("--eyebrow", default=None, help="small label above the title (e.g. category)")
    args = ap.parse_args()
    make_card(args.src, args.out, args.title, args.eyebrow)


if __name__ == "__main__":
    main()
