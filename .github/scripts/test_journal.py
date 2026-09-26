"""Regression checks for crawlable journal cards and future scheduled publications."""
import json
from pathlib import Path
import tempfile
import unittest
import publish_next
from render_hub import render_hub

ROOT = Path(__file__).resolve().parents[2]

class JournalChecks(unittest.TestCase):
    def test_checked_in_cards_match_data(self):
        html = (ROOT / 'blog/index.html').read_text()
        self.assertEqual(render_hub(html), html)

    def test_publish_keeps_crawlable_cards_and_escapes_titles(self):
        original = publish_next.HUB_FILE
        try:
            with tempfile.TemporaryDirectory() as directory:
                hub = Path(directory) / 'index.html'
                hub.write_text(original.read_text())
                publish_next.HUB_FILE = hub
                draft = dict(slug='test-only', cardTitle='Reader\'s <script> question',
                             cardExcerpt='A "quoted" answer', category='tips-and-prep',
                             categoryLabel='Tips & Prep', cardDate='Sep 26, 2026',
                             cardImage='/uploads/test.jpg')
                publish_next.inject_hub_card(draft)
                publish_next.inject_hub_card(draft)
                result = hub.read_text()
                self.assertEqual(result.count('href="/posts/test-only/"'), 1)
                self.assertIn('&lt;script&gt;', result)
                self.assertIn('\\u003cscript>', result)
        finally:
            publish_next.HUB_FILE = original

    def test_future_article_uses_main_host_and_named_calendar(self):
        path = next((ROOT / '.github/blog-drafts').glob('*/blog.json'))
        html = publish_next.render_post_html(json.loads(path.read_text()))
        self.assertNotIn('https://blog.markandrewboudoir.com', html)
        self.assertIn('title="Book your consultation', html)
        self.assertIn('https://www.markandrewboudoir.com/posts/', html)

if __name__ == '__main__':
    unittest.main()
