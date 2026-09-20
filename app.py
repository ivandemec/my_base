"""Wiki-style web app for an Obsidian vault.

Landing page renders the interactive D3 graph. Hovering a node shows a live
preview of the note; clicking a node opens the note with its Markdown rendered.
"""

import colorsys
import hashlib
import json
import os
import platform
import re
import subprocess
from collections import defaultdict
from urllib.parse import quote

import markdown
from flask import (Flask, abort, jsonify, redirect, render_template, request,
                   send_file, url_for)
from werkzeug.utils import secure_filename

# Vault directory: the folder that contains the notes. It can be overridden at
# startup or changed from the graph view while the app is running.
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_VAULT_DIR = os.path.join(APP_ROOT, 'Random thoughts')
VAULT_DIR = os.path.realpath(os.environ.get('VAULT_DIR', DEFAULT_VAULT_DIR))

app = Flask(__name__, static_folder='scripts', static_url_path='/scripts')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

IMAGE_SIGNATURES = {
    '.gif': (b'GIF87a', b'GIF89a'),
    '.jpg': (b'\xff\xd8\xff',),
    '.jpeg': (b'\xff\xd8\xff',),
    '.png': (b'\x89PNG\r\n\x1a\n',),
    '.webp': (b'RIFF',),
}


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


def extract_topics(content):
    """Return topic wikilinks from the Topics frontmatter property."""
    frontmatter = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not frontmatter:
        return []

    lines = frontmatter.group(1).split('\n')
    topic_values = []
    for property_index, line in enumerate(lines):
        match = re.match(r'^topics\s*:\s*(.*)$', line, re.IGNORECASE)
        if not match:
            continue
        topic_values.append(match.group(1))
        for continuation in lines[property_index + 1:]:
            if not re.match(r'^\s+', continuation):
                break
            topic_values.append(continuation)
        break

    topics = []
    for value in topic_values:
        links = re.findall(r'\[\[([^\]|#]+)', value)
        if links:
            topics.extend(link.strip() for link in links)
            continue
        cleaned = re.sub(r'^\s*-\s*', '', value).strip(' []\'"')
        if cleaned:
            topics.extend(part.strip(' \'"') for part in cleaned.split(','))

    return list(dict.fromkeys(topic for topic in topics if topic))


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


def get_tag_color(tag_id, color_groups):
    expected_query = f"tag:{tag_id}".casefold()
    for group in color_groups:
        if group.get('query', '').strip().casefold() == expected_query:
            return group['color']

    digest = hashlib.sha256(tag_id.casefold().encode('utf-8')).digest()
    hue = int.from_bytes(digest[:2], 'big') / 65535
    saturation = 0.55 + digest[2] / 1275
    value = 0.75 + digest[3] / 1700
    red, green, blue = colorsys.hsv_to_rgb(hue, saturation, value)
    channels = (round(red * 255), round(green * 255), round(blue * 255))
    return f"#{channels[0]:02x}{channels[1]:02x}{channels[2]:02x}"


def generate_graph_data(notes, links, note_tags, color_groups, show_tags=True):
    nodes = [{
        "id": note,
        "label": capitalize_first_letter(os.path.splitext(note)[0]),
        "content": notes[note]["content"],
        "topics": extract_topics(notes[note]["content"]),
        "tags": note_tags.get(note, []),
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
                        "color": get_tag_color(tag_id, color_groups),
                        "type": "tag"}
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
    VAULT['note_tags'] = note_tags
    VAULT['color_groups'] = color_groups


def note_summary(key):
    """Return a link-ready descriptor for a note key."""
    return {
        'id': key,
        'title': capitalize_first_letter(os.path.splitext(key)[0]),
        'url': url_for('note', note_id=key),
    }


def notes_for_tag(tag):
    """Return note summaries for every note carrying the given tag."""
    tag_key = tag.lower().lstrip('#')
    matches = [note_summary(key)
               for key, tags in VAULT['note_tags'].items()
               if any(t.lower() == tag_key for t in tags)]
    matches.sort(key=lambda n: n['title'].lower())
    return matches


def related_notes(key):
    """Return (linked, backlinks) note summaries connected to the given note."""
    note_ids = set(VAULT['notes'].keys())
    linked, backlinks = set(), set()
    for edge in VAULT['edges']:
        src, dst = edge['source'], edge['target']
        if src == key and dst in note_ids and dst != key:
            linked.add(dst)
        elif dst == key and src in note_ids and src != key:
            backlinks.add(src)

    def fmt(ids):
        return sorted((note_summary(k) for k in ids),
                      key=lambda n: n['title'].lower())

    return fmt(linked), fmt(backlinks)


def local_graph_data(key):
    """Return the note and its directly connected graph nodes and edges."""
    if key.startswith('#'):
        tag = key[1:].casefold()
        note_ids = {
            note_id for note_id, tags in VAULT['note_tags'].items()
            if any(note_tag.casefold() == tag for note_tag in tags)
        }
        nodes = [node.copy() for node in VAULT['nodes']
                 if node['id'] in note_ids]
        tag_node = next(
            (node.copy() for node in VAULT['nodes'] if node['id'] == key),
            {
                'id': key,
                'label': key,
                'link_count': len(note_ids),
                'color': get_tag_color(key, VAULT['color_groups']),
                'type': 'tag',
            },
        )
        nodes.append(tag_node)
        edges = [{'source': note_id, 'target': key}
                 for note_id in sorted(note_ids)]
        return nodes, edges

    edges = [edge.copy() for edge in VAULT['edges']
             if edge['source'] == key or edge['target'] == key]
    node_ids = {key}
    for edge in edges:
        node_ids.update((edge['source'], edge['target']))
    nodes = [node.copy() for node in VAULT['nodes']
             if node['id'] in node_ids]
    return nodes, edges


def resolve_note_key(note_id):
    """Resolve a URL note id to the notes dict key, tolerating a missing extension."""
    note_id = note_id.lower()
    for candidate in (note_id, note_id + '.md', os.path.splitext(note_id)[0] + '.md'):
        if candidate in VAULT['notes']:
            return candidate
    return None


def resolve_vault_asset(asset_id, source_path=None):
    """Resolve a note-relative or vault-relative asset within the vault."""
    vault_root = os.path.realpath(VAULT_DIR)
    candidates = []
    if source_path:
        candidates.append(os.path.join(os.path.dirname(source_path), asset_id))
    candidates.append(os.path.join(vault_root, asset_id))

    for candidate in candidates:
        real_path = os.path.realpath(candidate)
        if (os.path.commonpath([real_path, vault_root]) == vault_root
                and os.path.isfile(real_path)):
            return os.path.relpath(real_path, vault_root)
    return None


def render_markdown(content, source_path=None):
    """Render Obsidian markdown to HTML, resolving wiki links to internal routes."""

    # Python-Markdown accepts headings without a separating space, unlike
    # Obsidian. Protect leading tag tokens so only "# Heading" becomes an H1.
    content = re.sub(
        r'(?m)^([ \t]{0,3})(#{1,6})(?=[^#\s])', r'\1\\\2', content)

    def wikilink(match):
        raw = match.group(1)
        target, _, alias = raw.partition('|')
        target = target.split('#')[0].strip()
        text = alias.strip() if alias else target
        key = resolve_note_key(target)
        if key:
            return f'[{text}](/note/{quote(key)})'
        return text

    def embed(match):
        raw = match.group(1)
        target, _, alias = raw.partition('|')
        target = target.strip()
        asset_path = resolve_vault_asset(target, source_path)
        if asset_path and target.lower().endswith(
                ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')):
            alt = (alias.strip()
                   if alias and not alias.strip().isdigit() else target)
            return f'![{alt}](/media/{quote(asset_path)})'
        return wikilink(match)

    content = re.sub(r'!\[\[(.*?)\]\]', embed, content)
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


def editor_property_data(exclude_key=None):
    tag_options = sorted(
        {tag for tags in VAULT['note_tags'].values() for tag in tags},
        key=str.casefold)
    note_options = sorted(
        (capitalize_first_letter(os.path.splitext(note_key)[0])
         for note_key in VAULT['notes'] if note_key != exclude_key),
        key=str.casefold)
    topic_options = sorted(
        {topic
         for note in VAULT['notes'].values()
         for topic in extract_topics(note['content'])},
        key=str.casefold)
    return {
        'options': {'tags': tag_options, 'topics': note_options},
        'wikiOptions': {
            'notes': note_options,
            'topics': topic_options,
            'tags': tag_options,
        },
    }


def note_filename(title):
    """Return a vault-root Markdown filename derived from a user title."""
    title = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '-', title.strip())
    title = re.sub(r'\.md$', '', title, flags=re.IGNORECASE).rstrip(' .')
    reserved_names = {'con', 'prn', 'aux', 'nul'}
    reserved_names.update(f'{prefix}{number}'
                          for prefix in ('com', 'lpt')
                          for number in range(1, 10))
    if (not title or title in ('.', '..')
            or title.casefold() in reserved_names):
        return None
    return title + '.md'


def choose_vault_directory(initial_dir):
    """Open the operating system's directory picker for the local app."""
    system = platform.system()
    if system == 'Windows':
        env = os.environ.copy()
        env['MYBASE_INITIAL_DIR'] = initial_dir
        script = (
            'Add-Type -AssemblyName System.Windows.Forms; '
            '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog; '
            '$dialog.Description = "Select vault directory"; '
            '$dialog.SelectedPath = $env:MYBASE_INITIAL_DIR; '
            'if ($dialog.ShowDialog() -eq '
            '[System.Windows.Forms.DialogResult]::OK) '
            '{ $dialog.SelectedPath }'
        )
        result = subprocess.run(
            ['powershell.exe', '-NoProfile', '-NonInteractive', '-STA',
             '-Command', script],
            capture_output=True,
            text=True,
            check=False,
            env=env,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
        )
        return result.stdout.strip() if result.returncode == 0 else ''

    if system == 'Darwin':
        script = (
            'on run argv\n'
            'set selectedFolder to choose folder with prompt '
            '"Select vault directory" default location '
            'POSIX file (item 1 of argv)\n'
            'return POSIX path of selectedFolder\n'
            'end run'
        )
        result = subprocess.run(
            ['osascript', '-e', script, initial_dir],
            capture_output=True,
            text=True,
            check=False,
        )
        return result.stdout.strip() if result.returncode == 0 else ''

    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes('-topmost', True)
    except tk.TclError:
        pass
    try:
        return filedialog.askdirectory(
            parent=root,
            initialdir=initial_dir,
            title='Select vault directory',
        )
    finally:
        root.destroy()


@app.route('/')
def index():
    return render_template(
        'graph.html',
        nodes=json.dumps(VAULT['nodes']),
        links=json.dumps(VAULT['edges']),
        color_groups=json.dumps(VAULT['color_groups']),
        vault_dir=VAULT_DIR,
    )


@app.route('/vault', methods=['POST'])
def select_vault():
    global VAULT_DIR

    selected_dir = choose_vault_directory(VAULT_DIR)
    if not selected_dir:
        return redirect(url_for('index'))
    if not os.path.isdir(selected_dir):
        abort(400, description='Selected vault directory does not exist.')

    VAULT_DIR = os.path.realpath(selected_dir)
    load_vault()
    return redirect(url_for('index'))


@app.route('/note/<path:note_id>')
def note(note_id):
    key = resolve_note_key(note_id)
    if not key:
        abort(404)
    content = strip_frontmatter(VAULT['notes'][key]['content'])
    html = render_markdown(content, VAULT['notes'][key]['path'])
    title = capitalize_first_letter(os.path.splitext(key)[0])
    linked, backlinks = related_notes(key)
    tags = VAULT['note_tags'].get(key, [])
    local_nodes, local_links = local_graph_data(key)
    return render_template(
        'note.html', title=title, body=html, note_id=key,
        linked=linked, backlinks=backlinks, tags=tags,
        local_nodes=json.dumps(local_nodes),
        local_links=json.dumps(local_links))


@app.route('/media/<path:asset_path>')
def media(asset_path):
    resolved_path = resolve_vault_asset(asset_path)
    if not resolved_path:
        abort(404)
    return send_file(os.path.join(VAULT_DIR, resolved_path))


@app.route('/api/images', methods=['POST'])
def upload_image():
    image = request.files.get('image')
    if not image or not image.filename:
        return jsonify(error='Choose an image to upload.'), 400

    filename = secure_filename(image.filename)
    stem, extension = os.path.splitext(filename)
    extension = extension.lower()
    signatures = IMAGE_SIGNATURES.get(extension)
    if not stem or not signatures:
        return jsonify(error='Use a PNG, JPEG, GIF, or WebP image.'), 400

    header = image.stream.read(12)
    image.stream.seek(0)
    valid_signature = any(header.startswith(signature)
                          for signature in signatures)
    if extension == '.webp':
        valid_signature = (header.startswith(b'RIFF')
                           and header[8:12] == b'WEBP')
    if not valid_signature:
        return jsonify(error='The selected file is not a valid image.'), 400

    images_dir = os.path.realpath(os.path.join(VAULT_DIR, 'images'))
    vault_root = os.path.realpath(VAULT_DIR)
    if os.path.commonpath([images_dir, vault_root]) != vault_root:
        abort(403)
    os.makedirs(images_dir, exist_ok=True)

    destination = os.path.join(images_dir, stem + extension)
    suffix = 2
    while os.path.exists(destination):
        destination = os.path.join(
            images_dir, f'{stem}-{suffix}{extension}')
        suffix += 1

    image.save(destination)
    relative_path = os.path.relpath(destination, vault_root)
    relative_path = relative_path.replace(os.sep, '/')
    return jsonify(
        embed=f'![[{relative_path}]]',
        path=relative_path,
        url=url_for('media', asset_path=relative_path),
    ), 201


@app.route('/tag/<path:tag>')
def tag_view(tag):
    tag_key = tag.lower().lstrip('#')
    matches = notes_for_tag(tag_key)
    if not matches:
        abort(404)
    tag_id = '#' + tag_key
    local_nodes, local_links = local_graph_data(tag_id)
    return render_template(
        'tag.html', tag=tag_id, notes=matches,
        local_nodes=json.dumps(local_nodes),
        local_links=json.dumps(local_links))


@app.route('/create', methods=['GET', 'POST'])
def create_note():
    title = request.form.get('title', '') if request.method == 'POST' else ''
    content = (request.form.get('content', '')
               if request.method == 'POST' else '')
    error = None

    if request.method == 'POST':
        filename = note_filename(title)
        if not filename:
            error = 'Enter a valid note title.'
        elif filename.lower() in VAULT['notes']:
            error = 'A note with that title already exists.'
        else:
            vault_root = os.path.realpath(VAULT_DIR)
            file_path = os.path.realpath(os.path.join(vault_root, filename))
            if os.path.commonpath([file_path, vault_root]) != vault_root:
                abort(403)
            if os.path.exists(file_path):
                error = 'A note with that title already exists.'
            else:
                with open(file_path, 'x', encoding='utf-8') as note_file:
                    note_file.write(content.replace('\r\n', '\n'))
                load_vault()
                return redirect(url_for('note', note_id=filename.lower()))

    property_data = editor_property_data()
    property_data['values'] = {'tags': [], 'topics': []}
    response = render_template(
        'edit.html', title=title, note_id=None, content=content,
        error=error, is_create=True, property_data=property_data)
    return response, 400 if error else 200


@app.route('/edit/<path:note_id>', methods=['GET', 'POST'])
def edit(note_id):
    key = resolve_note_key(note_id)
    if not key:
        abort(404)
    file_path = VAULT['notes'][key]['path']
    # Confine writes to the vault: reject any path escaping VAULT_DIR.
    real_path = os.path.realpath(file_path)
    vault_root = os.path.realpath(VAULT_DIR)
    if os.path.commonpath([real_path, vault_root]) != vault_root:
        abort(403)
    title = capitalize_first_letter(os.path.splitext(key)[0])

    if request.method == 'POST':
        content = request.form.get('content', '')
        content = content.replace('\r\n', '\n')
        with open(real_path, 'w', encoding='utf-8') as f:
            f.write(content)
        load_vault()
        return redirect(url_for('note', note_id=key))

    content = VAULT['notes'][key]['content']
    frontmatter = re.match(r'^---\s*\n.*?\n---', content, re.DOTALL)
    property_tags = extract_tags(frontmatter.group(0)) if frontmatter else []
    property_data = editor_property_data(exclude_key=key)
    property_data['values'] = {
        'tags': property_tags,
        'topics': extract_topics(content),
    }

    return render_template(
        'edit.html', title=title, note_id=key,
        content=content, error=None, is_create=False,
        property_data=property_data)


@app.route('/delete/<path:note_id>', methods=['POST'])
def delete_note(note_id):
    key = resolve_note_key(note_id)
    if not key:
        abort(404)
    real_path = os.path.realpath(VAULT['notes'][key]['path'])
    vault_root = os.path.realpath(VAULT_DIR)
    if os.path.commonpath([real_path, vault_root]) != vault_root:
        abort(403)

    os.remove(real_path)
    load_vault()
    return redirect(url_for('index'))


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
        'html': render_markdown(snippet, VAULT['notes'][key]['path']),
        'url': url_for('note', note_id=key),
    }


@app.route('/api/search')
def search_notes():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify(results=[])

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    results = []
    for key, note_data in VAULT['notes'].items():
        title = capitalize_first_letter(os.path.splitext(key)[0])
        content = strip_frontmatter(note_data['content'])
        matches = list(pattern.finditer(content))
        if not matches and not pattern.search(title):
            continue

        snippets = []
        for match in matches[:3]:
            start = max(0, match.start() - 70)
            end = min(len(content), match.end() + 110)
            snippet = re.sub(r'\s+', ' ', content[start:end]).strip()
            snippets.append({
                'text': (('…' if start else '') + snippet
                         + ('…' if end < len(content) else '')),
            })

        results.append({
            'id': key,
            'title': title,
            'url': url_for('note', note_id=key),
            'snippets': snippets,
            'match_count': len(matches),
        })

    results.sort(
        key=lambda result: (-result['match_count'],
                            result['title'].casefold()))
    return jsonify(results=results[:100])


@app.route('/reload')
def reload_vault():
    load_vault()
    return {'status': 'reloaded', 'notes': len(VAULT['notes'])}


load_vault()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
