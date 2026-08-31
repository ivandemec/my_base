# Project Guidelines

MyBase is a Flask web app that recreates the core of [Obsidian](https://obsidian.md/):
browse a vault as an interactive graph, read notes, and (in progress) edit notes,
create new notes, and link them to topics and tags.

## Architecture

- [app.py](../app.py) is the whole server. Keep it single-file unless a module clearly earns its place.
- The vault is a folder of `.md` files (defaults to the app's own folder; override with the `VAULT_DIR` env var). Notes live in the workspace root and subfolders like [Random thoughts/](../Random%20thoughts/).
- Parsing pipeline (all in `app.py`): `parse_vault` walks `.md` files → `extract_tags` (YAML frontmatter `tags:` + inline `#tags`) → `generate_graph_data` builds nodes/edges → `get_obsidian_colors` reads `.obsidian/graph.json` color groups.
- Parsed state is cached in the module-global `VAULT` dict, built by `load_vault()` at startup and rebuilt by the `/reload` route. After any change that writes to disk, refresh `VAULT` so the graph and links stay in sync.
- Rendering: `render_markdown` rewrites `[[wikilinks]]`, `![[embeds]]` and local `.md` markdown links to `/note/<id>` routes before handing off to `python-markdown`. `strip_frontmatter` hides YAML before rendering.
- Views live in [templates/](../templates): `graph.html` (D3 force graph landing page) and `note.html` (rendered note). The D3 graph code originated from [Obsidian-Vault-HTML-Graph-Generator.py](../Obsidian-Vault-HTML-Graph-Generator.py); keep the two graph renderers visually consistent.

## Conventions

- Notes are keyed by **lowercased filename** (e.g. `belief.md`) throughout `VAULT`, links, and routes. Always resolve incoming ids through `resolve_note_key`, which tolerates a missing `.md` extension — never index `VAULT['notes']` with a raw user value.
- Tags are node ids prefixed with `#` and colored `#4caf50`; notes default to `#7f7f7f`. Preserve this so graph colors keep meaning.
- Keep the parsing regexes for links/tags identical between `app.py` and the graph generator so both produce the same graph.

## Roadmap (implement toward this)

- **Editable notes**: an edit view + route that writes markdown back to the note's file (the `.md` files are the single source of truth — no database), then reloads `VAULT`.
- **New notes**: a create route that writes a new `.md` file into `VAULT_DIR`.
- **Linking**: let new/edited notes reference topics (other notes via `[[wikilinks]]`) and tags (inline `#tag` or frontmatter), which must show up as edges after reload.
- **Editing UX**: aim for a live/WYSIWYG editing experience like Obsidian's edit mode, but keep the stack server-rendered Jinja + light vanilla JS — do not introduce a JS framework (React/Vue/etc.). Save the underlying raw markdown to disk.

## Security

- Any route that reads or writes a file from a user-supplied id is a path-traversal risk. Confine writes to `VAULT_DIR`: resolve the final path with `os.path.realpath` and reject anything that escapes the vault root. Prefer deriving filenames from `resolve_note_key` / a sanitized slug over trusting the request path.

## Run and reload

```bash
pip install -r requirements.txt
python app.py            # serves http://127.0.0.1:5000
```

- `/reload` re-parses the vault without restarting. `debug=True` is on, so file edits to `app.py` auto-restart.
