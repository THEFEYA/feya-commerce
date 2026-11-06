#!/usr/bin/env python3
"""Read-only raw-HTML collection crawl. No browser, credentials or Google writes.

Capture the current immutable membership before a release, then verify that
real next-page anchors on a preview/production expose that exact membership.
Uses Python's standard library; never executes page scripts.
"""
import argparse
import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

PUBLIC_ORIGIN = 'https://thefeya.com'
GRID_CLASSES = {'grid', 'grid-cols-1', 'gap-x-4', 'gap-y-8'}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.grid_depth = 0
        self.cards = []
        self.canonical = None
        self.robots = None
        self.links = []
        self.link = None
        self.ld = None
        self.schemas = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'div':
            if self.grid_depth:
                self.grid_depth += 1
            elif GRID_CLASSES <= set(a.get('class', '').split()):
                self.grid_depth = 1
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical = a.get('href')
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content')
        if tag == 'a':
            self.link = {'href': a.get('href', ''), 'text': ''}
            path = urlsplit(a.get('href', '')).path
            if self.grid_depth and path.startswith('/shop/'):
                self.cards.append(path)
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.ld = ''

    def handle_endtag(self, tag):
        if tag == 'div' and self.grid_depth:
            self.grid_depth -= 1
        if tag == 'a' and self.link is not None:
            self.links.append(self.link)
            self.link = None
        if tag == 'script' and self.ld is not None:
            self.schemas.append(json.loads(self.ld))
            self.ld = None

    def handle_data(self, data):
        if self.link is not None:
            self.link['text'] += data
        if self.ld is not None:
            self.ld += data


def read(url, deployment=None):
    req = Request(url, headers={'User-Agent': 'TheFEYA-ReadOnly-Collection-QA/1.0'})
    with urlopen(req, timeout=45) as response:
        assert response.status == 200, (url, response.status)
        assert response.geturl() == url, ('unexpected redirect', url, response.geturl())
        data = response.read(2_000_001)
    assert len(data) <= 2_000_000, 'oversized HTML'
    text = data.decode('utf-8')
    if deployment:
        assert deployment in text, ('unexpected deployment', url)
    return Page(text), hashlib.sha256(data).hexdigest()


def capture(origin, deployment):
    with urlopen(origin + '/sitemap.xml', timeout=30) as response:
        sitemap = ET.fromstring(response.read())
    paths = [urlsplit(x.text).path for x in sitemap.iter() if x.tag.endswith('loc')
             and urlsplit(x.text).path.startswith('/collections/')]
    assert len(paths) == 10, ('expected ten governed collections', len(paths))

    def one(path):
        page, digest = read(origin + path, deployment)
        schema = next(s for s in page.schemas if s.get('@type') == 'CollectionPage')
        members = [urlsplit(i['url']).path for i in schema['mainEntity']['itemListElement']]
        assert len(members) == schema['mainEntity']['numberOfItems']
        assert len(members) == len(set(members))
        assert page.cards == members[:20], ('first-page order differs', path)
        return {'path': path, 'membership': members, 'html_sha256': digest}

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        collections = list(pool.map(one, sorted(paths)))
    return {'version': 'collection_membership_baseline_v1', 'observed_at': now(),
            'origin': origin, 'deployment_id': deployment, 'collections': collections}


def verify(origin, baseline, deployment, root_index):
    def one(collection):
        path = collection['path']
        target = path
        visited, cards, pages = set(), [], []
        for number in range(1, 20):
            assert target not in visited, ('pagination loop', target)
            visited.add(target)
            page, digest = read(origin + target, deployment)
            assert page.cards == collection['membership'][(number-1)*20:number*20], ('wrong members/order', target)
            canonical = urlsplit(page.canonical or '')
            assert canonical.path + ('?' + canonical.query if canonical.query else '') == target, ('wrong canonical', target, page.canonical)
            tokens = {s.strip() for s in (page.robots or '').split(',')}
            assert 'nofollow' not in tokens
            assert ('index' if number == 1 and root_index else 'noindex') in tokens, ('robots', target, page.robots)
            next_links = [l['href'] for l in page.links if l['text'].strip() == 'Show 20 more']
            previous = [l['href'] for l in page.links if l['text'].strip() == 'Previous 20']
            if number > 1:
                assert previous == [path if number == 2 else path + '?page=' + str(number-1)]
            pages.append({'path': target, 'cards': len(page.cards), 'canonical': page.canonical,
                          'robots': page.robots, 'html_sha256': digest})
            cards.extend(page.cards)
            if number * 20 >= len(collection['membership']):
                assert not next_links, ('unexpected extra page', target)
                break
            expected = path + '?page=' + str(number+1)
            assert next_links == [expected], ('missing/wrong next anchor', target, next_links)
            target = expected
        assert cards == collection['membership'], ('incomplete collection', path)
        assert len(cards) == len(set(cards)), ('duplicate cards', path)
        return {'path': path, 'members': len(cards), 'pages': pages}

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        collections = list(pool.map(one, baseline['collections']))
    all_members = {p for c in baseline['collections'] for p in c['membership']}
    return {'version': 'collection_pagination_qa_v1', 'observed_at': now(),
            'origin': origin, 'deployment_id': deployment, 'verdict': 'PASS',
            'collections': collections, 'unique_products': len(all_members),
            'pages_crawled': sum(len(c['pages']) for c in collections)}


def now():
    return datetime.now(timezone.utc).isoformat()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default=PUBLIC_ORIGIN)
    parser.add_argument('--deployment')
    parser.add_argument('--capture-baseline', action='store_true')
    parser.add_argument('--baseline')
    parser.add_argument('--root-index', action='store_true')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    assert urlsplit(args.origin).scheme == 'https' and not urlsplit(args.origin).query
    result = capture(args.origin, args.deployment) if args.capture_baseline else verify(
        args.origin, json.loads(Path(args.baseline).read_text()), args.deployment, args.root_index)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'collections'}))
