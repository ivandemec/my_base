# MyBase — Obsidian Vault Graph & Wiki

MyBase is a Flask web app for visualizing and browsing an
[Obsidian](https://obsidian.md/) vault as a linked knowledge graph. It walks
every `.md` file, extracts
`[[wikilinks]]`, Markdown links and embeds to build edges, collects tags (from
YAML frontmatter and inline `#tags`), and reads node colors from your Obsidian
`.obsidian/graph.json` color groups.

## Requirements

- Python 3.8+
- Dependencies from `requirements.txt`:

```bash
pip install -r requirements.txt
```

`flask`, `markdown`, and `pymdown-extensions` power the web app and Markdown
rendering.

## Features

`app.py`

A Flask app that serves your vault as a browsable wiki:

- The landing page (`/`) renders the interactive D3 graph.
- Hovering a node shows a live preview of the note.
- Clicking a node opens the note (`/note/<id>`) with its Markdown rendered,
  including fenced code, tables, footnotes and internal `[[wikilinks]]` rewritten
  to working links.

## Usage

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

By default the app serves the `Random thoughts` folder in the project root.
Click **Open vault** in the graph toolbar and choose another directory in the
native Windows, macOS, or Linux folder picker to switch vaults while the app is
running. You can also choose the startup vault with the `VAULT_DIR` environment
variable:

```bash
VAULT_DIR=/path/to/your/vault python app.py
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Interactive graph landing page. |
| `/vault` | Selects and loads an existing vault directory. |
| `/note/<id>` | Rendered note view. |
| `/api/preview/<id>` | JSON preview snippet used for hover cards. |
| `/reload` | Re-parses the vault without restarting the server. |
