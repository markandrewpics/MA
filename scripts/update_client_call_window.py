"""Refresh the Michiana offer's static month labels; the browser also rolls them forward."""
import argparse
import calendar
from datetime import datetime
from pathlib import Path
import re
from zoneinfo import ZoneInfo


def window_label(now):
    months = [divmod(now.year * 12 + now.month - 1 + offset, 12) for offset in range(3)]
    crosses_year = months[0][0] != months[-1][0]
    names = [calendar.month_name[month + 1] + (f" {year}" if crosses_year else "") for year, month in months]
    return f"{names[0]}, {names[1]}, and {names[2]}" + ("" if crosses_year else f" {now.year}")


def update(page, now):
    text = page.read_text()
    label = window_label(now)
    span = f'<span data-offer-window>{label}</span>'
    if 'data-offer-window' not in text:
        replacements = {
            '<p class="hero-details">': f'<p class="hero-details"><strong>For shoots in {span} only.</strong></p>\n        <p class="hero-details">',
            'Complimentary session · <strong>$499 value</strong> · Application required': f'{span} shoots only · <strong>$499 value</strong> · Application required',
            "We're only looking for a few new faces for our portfolio. If you're selected, your images may become part of our new studio samples. Once those places are filled, applications for this offer close.": f"We're selecting five women for new studio samples, including handcrafted albums, wall art, and fine art prints. This offer is only for shoots taking place in {span}. Apply to be considered for an available date in this window.",
            '<h3>Once they\'re gone, <span class="accent">they\'re gone.</span></h3>': '<h3>Five new faces. <span class="accent">Limited shoot dates.</span></h3>',
            'Limited session dates · Granger, South Bend &amp; Michiana': f'Shoots in {span} only · The South Bend studio',
            '<summary class="faq-q">"Why are you offering complimentary sessions?"</summary>': '<summary class="faq-q">"Why are you offering complimentary sessions?"</summary>',
        }
        for old, new in replacements.items():
            assert old in text, f'Missing expected copy: {old[:80]}'
            text = text.replace(old, new, 1)
        anchor = '      <details class="faq-item">\n        <summary class="faq-q">"How long will the session last?"</summary>'
        assert anchor in text
        faq = f'''      <details class="faq-item">
        <summary class="faq-q">"Which shoot dates qualify for this offer?"</summary>
        <div class="faq-a">This offer applies only to sessions photographed in {span}, subject to selection and available dates. The session must take place within that window; applying during it does not make a later shoot eligible. We'll confirm your eligible shoot date before you book.</div>
      </details>
'''
        text = text.replace(anchor, faq + anchor, 1)
    text, count = re.subn(r'(<span data-offer-window>)[^<]*(</span>)', lambda m: m[1] + label + m[2], text)
    assert count == 5, f'Expected 5 offer-window labels, found {count}'
    script = '<script src="/client-call-michiana/offer-window.js" defer></script>'
    if script not in text:
        text = text.replace('</head>', '  ' + script + '\n</head>', 1)
    if text != page.read_text():
        page.write_text(text)
    print(f'{page}: {label} ({count} labels)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--page', type=Path, default=Path(__file__).resolve().parents[1] / 'client-call-michiana/index.html')
    args = parser.parse_args()
    update(args.page, datetime.now(ZoneInfo('America/New_York')))
