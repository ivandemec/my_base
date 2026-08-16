"""Wiki-style web app for an Obsidian vault.

Landing page renders the interactive D3 graph. Hovering a node shows a live
preview of the note; clicking a node opens the note with its Markdown rendered.
"""

import json
import os
import re
from collections import defaultdict
from urllib.parse import quote

import markdown
from flask import Flask, abort, render_template, url_for

# Vault directory: the folder that contains the notes. Defaults to the folder
# this script lives in, matching how vault_graph.html was generated.
VAULT_DIR = os.environ.get(
    "VAULT_DIR", os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)


def extract_tags(content):
    """Return Obsidian tags for a note: YAML frontmatter `tags:` plus inline #tags."""
    tags = []

    body = content
    fm_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if fm_match:
        body = content[fm_match.end():]
        fm_lines = fm_match.group(1).split('\n')
        i = 0
        while i < len(fm_lines):
            key_match = re.match(r'^(?:tags|Tags)\s*:\s*(.*)$', fm_lines[i])
            if key_match:
                inline = key_match.group(1).strip()
                if inline and inline.lower() not in ('null', '~', '[]'):
                    for t in inline.strip('[]').split(','):
                        t = t.strip().strip('\'"').lstrip('#')
                        if t:
                            tags.append(t)
                j = i + 1
                while j < len(fm_lines) and re.match(r'^\s*-\s+', fm_lines[j]):
                    t = re.sub(r'^\s*-\s+', '',
                               fm_lines[j]).strip().strip('\'"').lstrip('#')
                    if t:
                        tags.append(t)
                    j += 1
                i = j
                continue
            i += 1

    body_no_code = re.sub(r'`[^`]*`', ' ', body)
    for match in re.finditer(r'(?<!\w)#([^\W\d][\w/\-]*)', body_no_code):
        tags.append(match.group(1))

    seen = set()
    result = []
    for t in tags:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            result.append(t)
    return result


def parse_vault(vault_dir):
    """Walk the vault and return notes, links and tags keyed by lowercased filename."""
    notes = {}
    links = defaultdict(list)
    note_tags = {}

    for root, _, files in os.walk(vault_dir):
        if os.path.basename(root).startswith('.'):
            continue
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                key = file.lower()
                notes[key] = {"content": content, "path": file_path}

                link_patterns = [
                    r'\[\[(.*?)\]\]',
                    r'\[([^\]]+)\]\(([^)]+)\)',
                    r'!\[\[(.*?)\]\]'
                ]
                for pattern in link_patterns:
                    for match in re.finditer(pattern, content):
                        link = match.group(1)
                        link = link.split('|')[0]
                        link = link.split('#')[0]
                        link = link.strip().lower()
                        links[key].append(link)

                note_tags[key] = extract_tags(content)

    return notes, links, note_tags


def capitalize_first_letter(s):
    return s[0].upper() + s[1:] if s else s


def get_node_color(content, color_groups):
    for group in color_groups:
        if group.get('query') and re.search(group['query'], content, re.IGNORECASE):
            return group['color']
    return "#7f7f7f"


def generate_graph_data(notes, links, note_tags, color_groups, show_tags=True):
    nodes = [{
        "id": note,
        "label": capitalize_first_letter(os.path.splitext(note)[0]),
        "content": notes[note]["content"],
    } for note in notes.keys()]
    edges = []

    node_link_count = defaultdict(int)
    for src, dst_list in links.items():
        node_link_count[src] += len(dst_list)
        for dst in dst_list:
            potential_targets = [dst, dst + '.md',
                                 os.path.splitext(dst)[0] + '.md']
            for target in potential_targets:
                if target in notes:
                    edges.append({"source": src, "target": target})
                    node_link_count[target] += 1
                    break

    for node in nodes:
        node['link_count'] = node_link_count[node['id']]
        node['color'] = get_node_color(node['content'], color_groups)
        node['type'] = 'note'

    for node in nodes:
        del node['content']

    if show_tags:
        tag_nodes = {}
        for note, tags in note_tags.items():
            for tag in tags:
                tag_id = '#' + tag
                if tag_id not in tag_nodes:
                    tag_nodes[tag_id] = {
                        "id": tag_id, "label": tag_id, "link_count": 0,
                        "color": "#4caf50", "type": "tag"}
                edges.append({"source": note, "target": tag_id})
                tag_nodes[tag_id]['link_count'] += 1
                node_link_count[note] += 1

        for node in nodes:
            node['link_count'] = node_link_count[node['id']]

        nodes.extend(tag_nodes.values())

    return nodes, edges


def rgb_to_hex(rgb):
    return f"#{rgb:06x}"


def get_obsidian_colors(vault_dir):
    graph_config_path = os.path.join(vault_dir, '.obsidian', 'graph.json')
    try:
        with open(graph_config_path, 'r') as f:
            graph_config = json.load(f)
        color_groups = graph_config.get('colorGroups', [])
        for group in color_groups:
            group['color'] = rgb_to_hex(group['color']['rgb'])
        show_tags = graph_config.get('showTags', True)
        return color_groups, show_tags
    except Exception:
        return [], True


# ---------------------------------------------------------------------------
# Vault state (loaded once at startup, refreshable via /reload)
# ---------------------------------------------------------------------------

VAULT = {}


def load_vault():
    notes, links, note_tags = parse_vault(VAULT_DIR)
    color_groups, show_tags = get_obsidian_colors(VAULT_DIR)
    nodes, edges = generate_graph_data(
        notes, links, note_tags, color_groups, show_tags)
    VAULT['notes'] = notes
    VAULT['nodes'] = nodes
    VAULT['edges'] = edges
    VAULT['color_groups'] = color_groups


def resolve_note_key(note_id):
    """Resolve a URL note id to the notes dict key, tolerating a missing extension."""
    note_id = note_id.lower()
    for candidate in (note_id, note_id + '.md', os.path.splitext(note_id)[0] + '.md'):
        if candidate in VAULT['notes']:
            return candidate
    return None


def render_markdown(content):
    """Render Obsidian markdown to HTML, resolving wiki links to internal routes."""

    def wikilink(match):
        raw = match.group(1)
        target, _, alias = raw.partition('|')
        target = target.split('#')[0].strip()
        text = alias.strip() if alias else target
        key = resolve_note_key(target)
        if key:
            return f'[{text}](/note/{quote(key)})'
        return text

    # ![[embed]] and [[wikilink]] -> markdown links to internal notes.
    content = re.sub(r'!\[\[(.*?)\]\]', wikilink, content)
    content = re.sub(r'\[\[(.*?)\]\]', wikilink, content)

    # Rewrite plain markdown links pointing at local .md files to internal routes.
    def mdlink(match):
        text, target = match.group(1), match.group(2)
        if re.match(r'^[a-z]+://', target) or target.startswith('#') or target.startswith('/'):
            return match.group(0)
        key = resolve_note_key(target.split('#')[0].strip())
        if key:
            return f'[{text}](/note/{quote(key)})'
        return match.group(0)

    content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', mdlink, content)

    html = markdown.markdown(
        content,
        extensions=['fenced_code', 'tables',
                    'nl2br', 'sane_lists', 'footnotes'],
    )
    return html


def strip_frontmatter(content):
    fm_match = re.match(r'^---\s*\n.*?\n---\s*\n?', content, re.DOTALL)
    if fm_match:
        return content[fm_match.end():]
    return content


@app.route('/')
def index():
    return render_template(
        'graph.html',
        nodes=json.dumps(VAULT['nodes']),
        links=json.dumps(VAULT['edges']),
        color_groups=json.dumps(VAULT['color_groups']),
    )


@app.route('/note/<path:note_id>')
def note(note_id):
    key = resolve_note_key(note_id)
    if not key:
        abort(404)
    content = strip_frontmatter(VAULT['notes'][key]['content'])
    html = render_markdown(content)
    title = capitalize_first_letter(os.path.splitext(key)[0])
    return render_template('note.html', title=title, body=html)


@app.route('/api/preview/<path:note_id>')
def preview(note_id):
    key = resolve_note_key(note_id)
    if not key:
        abort(404)
    content = strip_frontmatter(VAULT['notes'][key]['content'])
    # Trim to a short preview for hover cards.
    snippet = content.strip()
    if len(snippet) > 800:
        snippet = snippet[:800].rsplit(' ', 1)[0] + ' …'
    title = capitalize_first_letter(os.path.splitext(key)[0])
    return {
        'title': title,
        'html': render_markdown(snippet),
        'url': url_for('note', note_id=key),
    }


@app.route('/reload')
def reload_vault():
    load_vault()
    return {'status': 'reloaded', 'notes': len(VAULT['notes'])}


load_vault()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
