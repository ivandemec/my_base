# MyBase — Obsidian Vault Graph & Wiki

Two Python tools for visualizing and browsing an [Obsidian](https://obsidian.md/)
vault as a linked knowledge graph.

- **Graph Generator** — a desktop tool that exports a self-contained interactive
  HTML graph of your vault.
- **Wiki Web App** — a Flask server that renders the same graph as a live landing
  page and lets you read notes with their Markdown rendered.

Both tools parse the vault the same way: they walk every `.md` file, extract
`[[wikilinks]]`, Markdown links and embeds to build edges, collect tags (from
YAML frontmatter and inline `#tags`), and read node colors from your Obsidian
`.obsidian/graph.json` color groups.

## Requirements

- Python 3.8+
- Dependencies from `requirements.txt`:

```bash
pip install -r requirements.txt
```

`markdown` and `pymdown-extensions` are used for rendering; `flask` is only
needed for the web app. The graph generator's GUI uses `tkinter`, which ships
with most Python installations.

## Graph Generator

`Obsidian-Vault-HTML-Graph-Generator.py`

A small Tkinter desktop app that turns a vault into a standalone
`vault_graph.html` file. The output embeds a [D3.js](https://d3js.org/)
force-directed graph with zoom, drag, node sizing by link count, and
color-coded nodes — no server required to view it.

### Usage

```bash
python Obsidian-Vault-HTML-Graph-Generator.py
```

1. Click **Select Vault Directory** and choose your Obsidian vault.
2. Click **Select Output Directory** and choose where to save the file.
3. Click **Create HTML** to generate `vault_graph.html`.

Open the generated `vault_graph.html` in any browser to explore the graph.

## Wiki Web App

`app.py`

A Flask app that serves your vault as a browsable wiki:

- The landing page (`/`) renders the interactive D3 graph.
- Hovering a node shows a live preview of the note.
- Clicking a node opens the note (`/note/<id>`) with its Markdown rendered,
  including fenced code, tables, footnotes and internal `[[wikilinks]]` rewritten
  to working links.

### Usage

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

By default the app serves the folder it lives in. Point it at a different vault
with the `VAULT_DIR` environment variable:

```bash
VAULT_DIR=/path/to/your/vault python app.py
```

### Routes

| Route | Description |
| --- | --- |
| `/` | Interactive graph landing page. |
| `/note/<id>` | Rendered note view. |
| `/api/preview/<id>` | JSON preview snippet used for hover cards. |
| `/reload` | Re-parses the vault without restarting the server. |
