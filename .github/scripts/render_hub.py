"""Keep the journal's initial HTML in sync with its filterable card data."""
import json,re
from html import escape
from pathlib import Path

def render_hub(html):
    match = re.search(r'const POSTS = (\[[\s\S]*?\]);', html)
    if not match:
        raise ValueError('Journal POSTS data missing')
    posts = json.loads(match[1])
    cards = []
    for post in posts:
        e = lambda key: escape(str(post.get(key, '')), quote=True)
        classes = 'card' + (' featured' if post.get('featured') else '') + (' coming' if post.get('coming') else '')
        excerpt = f'<p class="card-excerpt">{e("excerpt")}</p>' if post.get('excerpt') else '<p class="card-excerpt coming-text">A new post is on the way.</p>'
        content = f'''<div class="card-image"><img src="{e('image')}" alt="{e('title')}" loading="lazy" /><span class="tag">{e('categoryLabel')}</span></div>
<div class="card-body"><h2 class="card-title">{e('title')}</h2>{excerpt}<div class="card-meta"><span>{e('date') or 'Coming Soon'}</span>{'' if post.get('coming') else '<span class="card-read">Read</span>'}</div></div>'''
        inner = f'<div class="card-inner">{content}</div>' if post.get('coming') else f'<a href="{e("url")}">{content}</a>'
        cards.append(f'<article class="{classes}" data-cat="{e("category")}">{inner}</article>')
    replacement = '<main class="grid" id="grid">\n'+'\n'.join(cards)+'\n</main>'
    html, count = re.subn(r'<main class="grid" id="grid">[\s\S]*?</main>',lambda _:replacement,html,count=1)
    if count != 1:
        raise ValueError('Journal card container missing')
    return html

if __name__ == '__main__':
    path = Path(__file__).resolve().parents[2] / 'blog/index.html'
    path.write_text(render_hub(path.read_text()))
