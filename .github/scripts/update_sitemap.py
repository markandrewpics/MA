"""Add published article URLs; preserve existing public routes and keep drafts private."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET
NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ET.register_namespace('', NS)
ROOT = Path(__file__).resolve().parents[2]

def update_sitemap(root=ROOT, modified=()):
    path = root / 'sitemap.xml'
    tree = ET.parse(path)
    entries = {node.find(f'{{{NS}}}loc').text: node for node in tree.getroot()}
    today = datetime.now(ZoneInfo('America/Indiana/Indianapolis')).date().isoformat()
    urls = {'https://www.markandrewboudoir.com/' + p.parent.relative_to(root).as_posix() + '/' for p in (root / 'posts').glob('*/index.html') if 'noindex' not in p.read_text().lower()}
    touched = set(modified)
    for url in sorted(urls - entries.keys()):
        node = ET.SubElement(tree.getroot(), f'{{{NS}}}url')
        ET.SubElement(node, f'{{{NS}}}loc').text = url
        entries[url] = node
        touched.add(url)
    for url in touched:
        if url not in entries: continue
        node = entries[url].find(f'{{{NS}}}lastmod')
        if node is None: node = ET.SubElement(entries[url], f'{{{NS}}}lastmod')
        node.text = today
    ET.indent(tree, space='  ')
    tree.write(path, encoding='utf-8', xml_declaration=True)
    return path

if __name__ == '__main__':
    update_sitemap()
