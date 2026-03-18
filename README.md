# 📝 NoteNest — Your Personal Thought Space

NoteNest is a beautifully crafted, fully offline notes application built on vanilla web standards. It combines the warmth of a handwritten notebook with the precision of a professional digital tool — no frameworks, no dependencies, just clean HTML, CSS, and JavaScript.

> Capture ideas. Stay organised. Think clearly.

---

## 🔗 Live Preview

Open `index.html` directly in any modern browser. No server required.

---

## ✨ Features

### Core (as required)
- **Create notes** with a title and rich body content
- **Display notes** in a responsive masonry-style grid
- **Delete notes** with a confirmation dialog before removal
- **Persist notes** via `localStorage` — your notes survive browser restarts

### Beyond Requirements
- **Edit existing notes** — re-open any card to update it
- **Pin notes** — star important notes for quick access
- **Image support** — insert images directly into your notes
- **Interactive checklists** — add to-do items with checkboxes
- **Custom note colors** — choose from a warm palette for each note
- **Archive system** — move old notes to a dedicated archive section
- **Category system** — Personal, Work, Ideas with colour-coded cards
- **Full-text search** — debounced live search across title and body
- **Sort modes** — Newest, Oldest, Pinned First
- **Formatting toolbar** — Bold, Italic, Underline, Bullet list, Divider via `execCommand`
- **Live word and character count** in the editor
- **Sidebar stats** — total note count and total word count
- **Category badge counts** — live counts on each sidebar filter (including Archived)
- **Empty state** — context-aware messages per filter/search (Fixed visibility)
- **Toast notifications** — non-blocking feedback for save, delete, pin, archive actions
- **Three seeded example notes** on first launch
- **Keyboard shortcuts:** `Ctrl+S` save, `Ctrl+N` new note, `Esc` close modal
- **Sidebar toggle** — collapse on desktop, overlay on mobile
- **Timestamps** — relative dates ("2h ago", "3d ago") per card

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure, ARIA roles, contenteditable editor |
| **CSS3** | Full design system, CSS variables, Grid, Flexbox, animations |
| **Vanilla JavaScript (ES6+)** | OOP notes engine, localStorage, DOM rendering |
| **Google Fonts** | Playfair Display (headings) · Lora (note body) · Inter (UI) |
| **Web Crypto API** | Cryptographically random note IDs |

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| Base | `#faf6f0` | Page background (warm cream) |
| Sidebar | `#1c1409` | Deep ink dark |
| Accent | `#c4832a` | Amber gold primary accent |
| Personal | `#d97706` | Category colour |
| Work | `#2563eb` | Category colour |
| Ideas | `#7c3aed` | Category colour |

**Typography:** Playfair Display (headings) · Inter (UI) · Lora (note body)

---

## 📁 Project Structure

```text
NoteNest/
├── index.html             ← Full semantic structure, editor modal, dialogs
├── css/
│   ├── style.css          ← Complete design system and component styles
│   └── animations.css     ← All keyframes and motion utilities
└── js/
    ├── notes.js           ← NotesEngine class (CRUD, localStorage, query)
    └── main.js            ← App controller, rendering, UI bindings
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + N` | Open new note editor |
| `Ctrl + S` | Save the current note |
| `Esc` | Close active modal or editor |

---

## 🚀 Setup

```bash
# Clone the repository
git clone https://github.com/bmcouma/SoftGrowTech_Notes_Website-NoteNest-.git

# Navigate into the project
cd SoftGrowTech_Notes_Website-NoteNest-

# Open in browser
open index.html
```

No internet connection required after initial font load.

---

## 📄 License

Open source under the MIT License.  
Typography from [Google Fonts](https://fonts.google.com) under the Open Font License.
