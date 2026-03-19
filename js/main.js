/**
 * NoteNest — main.js
 *
 * Application controller. Responsible for:
 *   1. Instantiating NotesEngine
 *   2. Rendering note cards to the grid
 *   3. Opening and closing the editor modal
 *   4. Saving new and updated notes
 *   5. Deleting notes with confirmation dialog
 *   6. Pinning / unpinning from card and editor
 *   7. Category filter and sort controls
 *   8. Live search with debounce
 *   9. Sidebar toggle (desktop collapse + mobile overlay)
 *  10. Formatting toolbar (bold, italic, underline, bullet, hr)
 *  11. Live character and word count in editor
 *  12. Sidebar badge counts and stats
 *  13. Toast notification system
 *  14. Empty state management
 *  15. Seeding three example notes on first launch
 *  16. Keyboard shortcuts (Ctrl+S save, Escape close)
 *
 * Dependencies: notes.js (NotesEngine must be loaded first)
 */

"use strict";

(function () {

  /* ============================================================
     STATE
  ============================================================ */

  let engine;
  let activeNoteId   = null;    /* ID of note currently in editor (null = new) */
  let currentSearch   = "";
  let sidebarOpen     = true;
  let selectedNotes   = new Set(); /* For multi-select */
  let isSelectMode    = false;
  let currentTheme    = localStorage.getItem("notenest_theme") || "warm";
  let masterPassword  = localStorage.getItem("notenest_pass") || "";
  let isLocked        = Boolean(masterPassword);

  /* ============================================================
     DOM SHORTCUTS
  ============================================================ */

  const $ = (id) => document.getElementById(id);

  const els = {
    notesGrid:        $("notesGrid"),
    emptyState:       $("emptyState"),
    emptyTitle:       $("emptyTitle"),
    emptySubtitle:    $("emptySubtitle"),
    emptyCreateBtn:   $("emptyCreateBtn"),
    searchInput:      $("searchInput"),
    searchClear:      $("searchClear"),
    newNoteBtn:       $("newNoteBtn"),
    topbarNewBtn:     $("topbarNewBtn"),
    topbarTitle:      $("topbarTitle"),
    resultsCount:     $("resultsCount"),
    sidebarToggle:    $("sidebarToggle"),
    sidebar:          $("sidebar"),
    categoryList:     $("categoryList"),
    sortBtns:         document.querySelectorAll(".sort-btn"),
    countAll:         $("countAll"),
    countPinned:      $("countPinned"),
    countPersonal:    $("countPersonal"),
    countWork:        $("countWork"),
    countIdeas:       $("countIdeas"),
    countArchived:    $("countArchived"),
    statTotal:        $("statTotal"),
    statWords:        $("statWords"),
    // Selection Bar
    selectionBar:     $("selectionBar"),
    selectionCount:   $("selectionCount"),
    cancelSelect:     $("cancelSelect"),
    bulkDelete:       $("bulkDelete"),
    bulkArchive:      $("bulkArchive"),
    // Editor
    editorOverlay:    $("editorOverlay"),
    editorTitle:      $("editorTitle"),
    editorBody:       $("editorBody"),
    editorCategory:   $("noteCategory"),
    editorTags:       $("noteTags"),
    editorClose:      $("editorClose"),
    editorSave:       $("editorSave"),
    editorCancel:     $("editorCancel"),
    editorCharCount:  $("editorCharCount"),
    editorWordCount:  $("editorWordCount"),
    editorTimestamp:  $("editorTimestamp"),
    editorReminder:   $("noteReminder"),
    pinBtn:           $("pinBtn"),
    archiveBtn:       $("archiveBtn"),
    deleteEditorBtn:  $("deleteEditorBtn"),
    // Format tools
    insertImageBtn:   $("insertImageBtn"),
    imageInput:       $("imageInput"),
    insertChecklistBtn: $("insertChecklistBtn"),
    colorPicker:      $("colorPicker"),
    // Settings
    settingsBtn:      $("settingsBtn"),
    settingsOverlay:  $("settingsOverlay"),
    themeToggle:      $("themeToggle"),
    exportJson:       $("exportJson"),
    importFile:       $("importFile"),
    importBtn:        $("importBtn"),
    // Confirm
    confirmOverlay:   $("confirmOverlay"),
    confirmCancel:    $("confirmCancel"),
    confirmDelete:    $("confirmDelete"),
    // Toast
    toastContainer:   $("toastContainer"),
  };

  /* ============================================================
     INIT
  ============================================================ */

  function init() {
    if (typeof NotesEngine === "undefined") {
      console.error("[main.js] NotesEngine not found.");
      return;
    }

    engine = new NotesEngine();
    applyTheme(currentTheme);
    if (isLocked) promptPassword();
 
    /* Seed example notes on first launch */
    if (engine.getTotal() === 0) seedExamples();

    bindEvents();
    render();
    setInterval(checkReminders, 60 * 1000); // Check reminders every minute

    console.info("[NoteNest] Initialised. Notes:", engine.getTotal());
  }

  /* ============================================================
     SEED EXAMPLES
  ============================================================ */  function seedExamples() {
    engine.create({
      title:    "✨ Welcome to NoteNest Ultimate",
      body:     "<p>Welcome to your upgraded thought space! You can now do more than ever:</p><div class=\"checklist-item\" contenteditable=\"false\"><input type=\"checkbox\" class=\"checklist-checkbox\" checked id=\"chk-wel-1\"><label class=\"checklist-text\" for=\"chk-wel-1\" contenteditable=\"true\">Try out the new Themes</label></div><div class=\"checklist-item\" contenteditable=\"false\"><input type=\"checkbox\" class=\"checklist-checkbox\" id=\"chk-wel-2\"><label class=\"checklist-text\" for=\"chk-wel-2\" contenteditable=\"true\">Set a Master Password</label></div><div class=\"checklist-item\" contenteditable=\"false\"><input type=\"checkbox\" class=\"checklist-checkbox\" id=\"chk-wel-3\"><label class=\"checklist-text\" for=\"chk-wel-3\" contenteditable=\"true\">Attach your first image</label></div>",
      bodyText: "Welcome to your upgraded thought space! Try out Themes, Set a Password, Attach images.",
      category: "personal",
      pinned:   true,
      color:    "green",
      tags:     ["welcome", "guide"]
    });
 
    engine.create({
      title:    "🚀 Project NoteNest V2",
      body:     "<p>Next steps for the ultimate expansion:</p><ul><li>Implement Cloud Sync</li><li>Add Mobile App wrapper</li><li>Multi-user collaboration</li></ul>",
      bodyText: "Next steps: Cloud Sync, Mobile wrapper, Collaboration.",
      category: "work",
      pinned:   false,
      color:    "blue",
      tags:     ["roadmap", "future"]
    });
 
    engine.create({
      title:    "💡 Brilliant App Idea",
      body:     "<p>What if there was an app that could...</p><p>Wait, I'm already using it! NoteNest is exactly what I needed.</p>",
      bodyText: "NoteNest is exactly what I needed.",
      category: "ideas",
      pinned:   false,
      color:    "yellow",
      tags:     ["app", "meta"]
    });
 
    render();
    updateCounts();
    showToast("Example notes restored.", "info");
  }

  /* ============================================================
     RENDER — main grid
  ============================================================ */

  function render() {
    const notes = engine.query({
      category: currentCategory,
      search:   currentSearch,
      sort:     currentSort,
    });

    renderGrid(notes);
    updateCounts();
    updateStats();
    updateTopbarTitle();
    updateResultsCount(notes.length);
  }

  function renderGrid(notes) {
    els.notesGrid.innerHTML = "";

    if (notes.length === 0) {
      els.emptyState.hidden = false;

      if (currentSearch) {
        els.emptyTitle.textContent    = "No results found";
        els.emptySubtitle.textContent = "Try a different search term.";
      } else if (currentCategory === "pinned") {
        els.emptyTitle.textContent    = "No pinned notes";
        els.emptySubtitle.textContent = "Pin a note using the star icon.";
      } else {
        els.emptyTitle.textContent    = "No notes yet";
        els.emptySubtitle.textContent = "Create your first note to get started.";
      }
      return;
    }

    els.emptyState.hidden = true;

    notes.forEach(function (note, i) {
      const card = buildNoteCard(note, i);
      els.notesGrid.appendChild(card);
    });
  }

  /* ============================================================
     BUILD NOTE CARD
  ============================================================ */

  function buildNoteCard(note, index) {
    const card = document.createElement("article");
    card.className    = "note-card" + (note.pinned ? " pinned" : "");
    card.dataset.id   = note.id;
    card.dataset.category = note.category;
    if (note.color) card.classList.add("color-" + note.color);
    if (selectedNotes.has(note.id)) card.classList.add("selected");
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", note.title || "Untitled note");
    card.style.animationDelay = (index * 45) + "ms";
 
    /* Checkbox overlay for select mode */
    const selOverlay = document.createElement("div");
    selOverlay.className = "card-selection-overlay";
    selOverlay.innerHTML = '<span class="selection-indicator"></span>';
    card.appendChild(selOverlay);

    /* Category dot */
    const dot = document.createElement("span");
    dot.className   = "card-category-dot";
    dot.setAttribute("aria-hidden", "true");
    dot.title = note.category;

    /* Title */
    const title = document.createElement("h3");
    title.className   = "card-title";
    title.textContent = note.title || "Untitled";

    /* Body preview */
    const body = document.createElement("p");
    body.className   = "card-body";
    body.textContent = note.bodyText || "";

    /* Footer */
    const footer = document.createElement("div");
    footer.className = "card-footer";

    const date = document.createElement("span");
    date.className   = "card-date";
    date.textContent = formatDate(note.updatedAt);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    /* Pin button */
    const pinBtn = document.createElement("button");
    pinBtn.className = "card-action-btn";
    pinBtn.setAttribute("aria-label", note.pinned ? "Unpin note" : "Pin note");
    pinBtn.title     = note.pinned ? "Unpin" : "Pin";
    pinBtn.innerHTML = note.pinned
      ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (note.pinned) pinBtn.style.color = "var(--clr-accent)";

    pinBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      handlePinFromCard(note.id);
    });

    /* Delete button */
    const delBtn = document.createElement("button");
    delBtn.className = "card-action-btn danger";
    delBtn.setAttribute("aria-label", "Delete note");
    delBtn.title     = "Delete";
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round"/></svg>';

    delBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openConfirmDelete(note.id);
    });

    actions.appendChild(pinBtn);
    actions.appendChild(delBtn);
    footer.appendChild(date);
    footer.appendChild(actions);

    card.appendChild(dot);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(footer);

    /* Open editor on card click or Enter (unless in select mode) */
    card.addEventListener("click", function (e) { 
      if (isSelectMode || e.ctrlKey || e.metaKey) {
        toggleNoteSelection(note.id);
      } else {
        openEditor(note.id); 
      }
    });
    
    card.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      toggleNoteSelection(note.id);
    });
 
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isSelectMode) toggleNoteSelection(note.id);
        else openEditor(note.id);
      }
    });

    return card;
  }

  /* ============================================================
     EDITOR — open / close / save
  ============================================================ */

  function openEditor(noteId) {
    activeNoteId = noteId || null;
    const note   = noteId ? engine.getById(noteId) : null;

    /* Populate fields */
    els.editorTitle.value          = note ? note.title    : "";
    els.editorBody.innerHTML       = note ? note.body     : "";
    els.editorCategory.value       = note ? note.category : "personal";
    els.editorTags.value           = note ? (note.tags || []).join(", ") : "";
    els.editorReminder.value       = note ? (note.reminder || "") : "";

    /* Pin button state */
    const isPinned = note ? note.pinned : false;
    els.pinBtn.classList.toggle("pinned", isPinned);
    els.pinBtn.setAttribute("aria-pressed", String(isPinned));
    els.pinBtn.setAttribute("aria-label", isPinned ? "Unpin note" : "Pin note");
 
    /* Archive button state */
    const isArchived = note ? note.archived : false;
    els.archiveBtn.classList.toggle("archived", isArchived);
    els.archiveBtn.setAttribute("aria-label", isArchived ? "Unarchive note" : "Archive note");
 
    /* Color state */
    const color = note ? note.color : "";
    updateEditorColor(color);
 
    /* Delete button — only for existing notes */
    els.deleteEditorBtn.hidden = !noteId;

    /* Timestamp */
    els.editorTimestamp.textContent = note
      ? "Updated " + formatDate(note.updatedAt)
      : "New note";

    /* Live counts */
    updateEditorCounts();

    /* Show modal */
    els.editorOverlay.classList.add("open");
    els.editorOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    /* Focus title */
    setTimeout(function () { els.editorTitle.focus(); }, 80);
  }

  function closeEditor() {
    els.editorOverlay.classList.remove("open");
    els.editorOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    activeNoteId = null;
    els.editorOverlay.className = "modal-overlay"; // reset colors
  }
 
  function updateEditorColor(color) {
    /* Update UI */
    els.editorOverlay.querySelector(".editor-modal").className = "editor-modal" + (color ? " color-" + color : "");
    els.colorPicker.querySelectorAll(".color-dot").forEach(dot => {
      const isActive = dot.dataset.color === color;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-checked", String(isActive));
    });
  }

  function saveNote() {
    const title    = els.editorTitle.value.trim();
    const body     = els.editorBody.innerHTML;
    const bodyText = els.editorBody.innerText || els.editorBody.textContent || "";
    const category = els.editorCategory.value;
    const tags     = els.editorTags.value.split(",").map(s => s.trim()).filter(Boolean);
    const reminder = els.editorReminder.value;
    const pinned   = els.pinBtn.classList.contains("pinned");
    const archived = els.archiveBtn.classList.contains("archived");
    const color    = els.colorPicker.querySelector(".color-dot.active").dataset.color;
 
    if (!title && !bodyText.trim()) {
      showToast("Please add a title or some content before saving.", "error");
      els.editorTitle.focus();
      return;
    }
 
    if (activeNoteId) {
      engine.update(activeNoteId, { title, body, bodyText, category, tags, reminder, pinned, archived, color });
      showToast("Note updated.", "success");
    } else {
      engine.create({ title, body, bodyText, category, tags, reminder, pinned, archived, color });
      showToast("Note saved.", "success");
    }

    closeEditor();
    render();
  }

  /* ============================================================
     PIN
  ============================================================ */

  function handlePinFromCard(id) {
    const updated = engine.togglePin(id);
    if (updated) {
      showToast(updated.pinned ? "Note pinned." : "Note unpinned.", "info");
      render();
    }
  }

  function handlePinInEditor() {
    const isPinned = els.pinBtn.classList.contains("pinned");
    const newState = !isPinned;
    els.pinBtn.classList.toggle("pinned", newState);
    els.pinBtn.setAttribute("aria-pressed", String(newState));
    els.pinBtn.setAttribute("aria-label", newState ? "Unpin note" : "Pin note");
  }
 
  function handleArchiveInEditor() {
    const isArchived = els.archiveBtn.classList.contains("archived");
    const newState = !isArchived;
    els.archiveBtn.classList.toggle("archived", newState);
    els.archiveBtn.setAttribute("aria-label", newState ? "Unarchive note" : "Archive note");
    showToast(newState ? "Note archived." : "Note restored.", "info");
    
    // If we're in a filtered view, we might want to auto-save and close
    if (activeNoteId) {
      saveNote();
    }
  }

  /* ============================================================
     DELETE
  ============================================================ */

  function openConfirmDelete(id) {
    pendingDeleteId = id;
    els.confirmOverlay.classList.add("open");
    els.confirmOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(function () { els.confirmDelete.focus(); }, 80);
  }

  function closeConfirmDelete() {
    pendingDeleteId = null;
    els.confirmOverlay.classList.remove("open");
    els.confirmOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function executeDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;

    /* Animate the card out before removing */
    const card = els.notesGrid.querySelector('[data-id="' + id + '"]');
    if (card) {
      card.style.animation = "cardDelete 0.35s var(--ease) forwards";
      setTimeout(function () {
        engine.delete(id);
        closeConfirmDelete();
        closeEditor();
        render();
        showToast("Note deleted.", "info");
      }, 320);
    } else {
      engine.delete(id);
      closeConfirmDelete();
      closeEditor();
      render();
      showToast("Note deleted.", "info");
    }
  }

  /* ============================================================
     FORMATTING TOOLBAR
  ============================================================ */

  document.querySelectorAll(".fmt-btn").forEach(function (btn) {
    btn.addEventListener("mousedown", function (e) {
      e.preventDefault();   /* Prevent editor losing focus */
      const format = btn.dataset.format;
      applyFormat(format);
    });
  });

  function applyFormat(format) {
    els.editorBody.focus();

    if (format === "bold")      { document.execCommand("bold",      false, null); return; }
    if (format === "italic")    { document.execCommand("italic",    false, null); return; }
    if (format === "underline") { document.execCommand("underline", false, null); return; }

    if (format === "bullet") {
      /* Insert a simple unordered list item or toggle */
      document.execCommand("insertUnorderedList", false, null);
      return;
    }

    if (format === "hr") {
      document.execCommand("insertHorizontalRule", false, null);
      return;
    }
  }
 
  /* ============================================================
     PRIVACY / LOCK
  ============================================================ */
 
  function promptPassword() {
    const entry = prompt("Enter Master Password to unlock NoteNest:");
    if (entry === masterPassword) {
      isLocked = false;
      showToast("App unlocked.", "success");
    } else {
      alert("Incorrect password. Access denied.");
      document.body.innerHTML = '<div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column; background:var(--clr-base); color:var(--clr-text)"><h1>🔒 Locked</h1><button onclick="location.reload()">Try Again</button></div>';
    }
  }
 
  function setMasterPassword(newPass) {
    masterPassword = newPass;
    localStorage.setItem("notenest_pass", newPass);
    showToast(newPass ? "Master Password set." : "Master Password removed.", "info");
  }
 
  /* ============================================================
     REMINDERS
  ============================================================ */
 
  function checkReminders() {
    const now = new Date().toISOString();
    const notesWithReminders = engine.query({ archived: false }).filter(n => n.reminder && !n.reminderFired);
    
    notesWithReminders.forEach(note => {
      if (note.reminder <= now) {
        showToast(`🔔 Reminder: ${note.title || "Untitled note"}`, "success");
        engine.update(note.id, { reminderFired: true });
        
        /* Optional: Browser notification */
        if (Notification.permission === "granted") {
          new Notification("NoteNest Reminder", {
            body: note.title || "Untitled note",
            icon: "favicon.ico"
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    });
  }
 
  /* ============================================================
     SELECTION MODE
  ============================================================ */
 
  function toggleNoteSelection(id) {
    if (selectedNotes.has(id)) {
      selectedNotes.delete(id);
    } else {
      selectedNotes.add(id);
    }
 
    isSelectMode = selectedNotes.size > 0;
    updateSelectionUI();
    render();
  }
 
  function updateSelectionUI() {
    if (isSelectMode) {
      els.selectionBar.classList.add("open");
      els.selectionCount.textContent = selectedNotes.size + " selected";
    } else {
      els.selectionBar.classList.remove("open");
      selectedNotes.clear();
    }
  }
 
  function cancelSelection() {
    isSelectMode = false;
    selectedNotes.clear();
    updateSelectionUI();
    render();
  }
 
  function bulkArchive() {
    selectedNotes.forEach(id => {
      engine.update(id, { archived: true });
    });
    showToast(`${selectedNotes.size} notes archived.`, "info");
    cancelSelection();
  }
 
  function bulkDelete() {
    if (confirm(`Delete ${selectedNotes.size} notes permanently?`)) {
      selectedNotes.forEach(id => {
        engine.delete(id);
      });
      showToast(`${selectedNotes.size} notes deleted.`, "info");
      cancelSelection();
    }
  }
 
  /* ============================================================
     SETTINGS & THEME
  ============================================================ */
 
  function openSettings() {
    els.settingsOverlay.classList.add("open");
    els.themeToggle.value = currentTheme;
  }
 
  function closeSettings() {
    els.settingsOverlay.classList.remove("open");
  }
 
  function applyTheme(theme) {
    currentTheme = theme;
    document.body.className = "theme-" + theme;
    localStorage.setItem("notenest_theme", theme);
  }
 
  function handleExport() {
    const url = engine.exportData();
    const a = document.createElement("a");
    a.href = url;
    a.download = "notenest_backup.json";
    a.click();
    showToast("Exporting data...", "info");
  }
 
  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const success = await engine.importData(evt.target.result);
      if (success) {
        showToast("Data imported successfully!", "success");
        render();
        closeSettings();
      } else {
        showToast("Import failed. Check file format.", "error");
      }
    };
    reader.readAsText(file);
  }
 
  /* ============================================================
     IMAGE HANDLING
  ============================================================ */
 
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
 
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.", "error");
      return;
    }
 
    const reader = new FileReader();
    reader.onload = async function(event) {
      const base64 = event.target.result;
      /* Store blob in IndexedDB for the full image */
      const imageId = "img-" + Date.now();
      await engine.saveImage(imageId, file);
      
      insertImageAtCursor(base64, imageId);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = "";
  }
 
  function insertImageAtCursor(base64, id) {
    els.editorBody.focus();
    const img = `<img src="${base64}" data-id="${id}" alt="Note image" style="max-width:100%; border-radius:8px; margin: 8px 0;">`;
    document.execCommand("insertHTML", false, img);
    updateEditorCounts();
  }
 
  /* ============================================================
     CHECKLIST HANDLING
  ============================================================ */
 
  function insertChecklist() {
    els.editorBody.focus();
    const id = "chk-" + Math.random().toString(36).substr(2, 9);
    const item = `
      <div class="checklist-item" contenteditable="false">
        <input type="checkbox" class="checklist-checkbox" id="${id}">
        <label class="checklist-text" for="${id}" contenteditable="true">List item</label>
      </div>
    `;
    document.execCommand("insertHTML", false, item);
    
    // We need to bind the checkbox change event if possible, or handle it via delegation
    updateEditorCounts();
  }

  /* ============================================================
     EDITOR COUNTS
  ============================================================ */

  function updateEditorCounts() {
    const text     = els.editorBody.innerText || els.editorBody.textContent || "";
    const chars    = text.length;
    const words    = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

    els.editorCharCount.textContent = chars + " char" + (chars !== 1 ? "s" : "");
    els.editorWordCount.textContent = words + " word" + (words !== 1 ? "s" : "");
  }

  /* ============================================================
     SIDEBAR COUNTS & STATS
  ============================================================ */

  function updateCounts() {
    const counts = engine.getCounts();
    els.countAll.textContent      = counts.all;
    els.countPinned.textContent   = counts.pinned;
    els.countPersonal.textContent = counts.personal;
    els.countWork.textContent     = counts.work;
    els.countIdeas.textContent    = counts.ideas;
    if (els.countArchived) els.countArchived.textContent = counts.archived;
  }

  function updateStats() {
    els.statTotal.textContent = engine.getTotal();
    els.statWords.textContent = engine.getTotalWordCount().toLocaleString();
  }

  function updateTopbarTitle() {
    const labels = {
      all:      "All Notes",
      pinned:   "Pinned",
      personal: "Personal",
       work:     "Work",
       ideas:    "Ideas",
       archived: "Archived",
     };
     if (els.topbarTitle) {
      els.topbarTitle.textContent = currentSearch
        ? "Search: " + currentSearch
        : (labels[currentCategory] || "All Notes");
    }
  }

  function updateResultsCount(count) {
    if (!els.resultsCount) return;
    els.resultsCount.textContent = count + " note" + (count !== 1 ? "s" : "");
  }

  /* ============================================================
     TOAST
  ============================================================ */

  function showToast(message, type) {
    type = type || "info";
    const toast = document.createElement("div");
    toast.className   = "toast " + type;
    toast.textContent = message;
    toast.setAttribute("role", "status");

    els.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("hiding");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, 2800);
  }

  /* ============================================================
     UTILITY
  ============================================================ */

  function formatDate(ts) {
    const now  = Date.now();
    const diff = now - ts;
    const sec  = Math.floor(diff / 1000);
    const min  = Math.floor(sec / 60);
    const hr   = Math.floor(min / 60);
    const day  = Math.floor(hr / 24);

    if (sec < 60)   return "Just now";
    if (min < 60)   return min + "m ago";
    if (hr < 24)    return hr + "h ago";
    if (day < 7)    return day + "d ago";

    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  let searchTimer;
  function debounce(fn, delay) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fn, delay);
  }

  /* ============================================================
     EVENT BINDING
  ============================================================ */

  function bindEvents() {

    /* New note buttons */
    [els.newNoteBtn, els.topbarNewBtn, els.emptyCreateBtn].forEach(function (btn) {
      if (btn) btn.addEventListener("click", function () { openEditor(null); });
    });

    /* Editor close */
    if (els.editorClose)  els.editorClose.addEventListener("click",  closeEditor);
    if (els.editorCancel) els.editorCancel.addEventListener("click", closeEditor);
    if (els.editorSave)   els.editorSave.addEventListener("click",   saveNote);

    /* Editor overlay click-outside */
    if (els.editorOverlay) {
      els.editorOverlay.addEventListener("click", function (e) {
        if (e.target === els.editorOverlay) closeEditor();
      });
    }

    /* Pin in editor */
    if (els.pinBtn) els.pinBtn.addEventListener("click", handlePinInEditor);
    if (els.archiveBtn) els.archiveBtn.addEventListener("click", handleArchiveInEditor);
 
    /* Image and Checklist */
    if (els.insertImageBtn) {
      els.insertImageBtn.addEventListener("click", () => els.imageInput.click());
    }
    if (els.imageInput) {
      els.imageInput.addEventListener("change", handleImageUpload);
    }
    if (els.insertChecklistBtn) {
      els.insertChecklistBtn.addEventListener("click", insertChecklist);
    }
 
    /* Color picker */
    if (els.colorPicker) {
      els.colorPicker.addEventListener("click", function(e) {
        const dot = e.target.closest(".color-dot");
        if (dot) {
          updateEditorColor(dot.dataset.color);
        }
      });
    }
 
    /* Delete from editor */
    if (els.deleteEditorBtn) {
      els.deleteEditorBtn.addEventListener("click", function () {
        if (activeNoteId) openConfirmDelete(activeNoteId);
      });
    }
 
    /* Selection Bar Actions */
    if (els.cancelSelect) els.cancelSelect.addEventListener("click", cancelSelection);
    if (els.bulkArchive)  els.bulkArchive.addEventListener("click",  bulkArchive);
    if (els.bulkDelete)   els.bulkDelete.addEventListener("click",   bulkDelete);
 
    /* Settings */
    if (els.settingsBtn)  els.settingsBtn.addEventListener("click",  openSettings);
    if (els.themeToggle)  els.themeToggle.addEventListener("change", (e) => applyTheme(e.target.value));
 
    /* Password */
    const passInput = document.getElementById("masterPassInput");
    if (passInput) {
      passInput.value = masterPassword;
      passInput.addEventListener("change", (e) => setMasterPassword(e.target.value));
    }
 
    if (els.exportJson)   els.exportJson.addEventListener("click",   handleExport);
    if (els.importBtn)    els.importBtn.addEventListener("click",    () => els.importFile.click());
    if (els.importFile)   els.importFile.addEventListener("change",  handleImport);
    
    /* Restore Examples */
    const restoreBtn = $("restoreExamplesBtn");
    if (restoreBtn) restoreBtn.addEventListener("click", seedExamples);
 
    if (els.settingsOverlay) {
      els.settingsOverlay.addEventListener("click", e => {
        if (e.target === els.settingsOverlay) closeSettings();
      });
    }
 
    /* Live editor counts */
    if (els.editorBody) {
      els.editorBody.addEventListener("input", updateEditorCounts);
    }

    /* Category filter */
    document.querySelectorAll(".cat-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentCategory = btn.dataset.category;
        document.querySelectorAll(".cat-btn").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        render();
      });
    });

    /* Sort */
    els.sortBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentSort = btn.dataset.sort;
        els.sortBtns.forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        render();
      });
    });

    /* Search */
    if (els.searchInput) {
      els.searchInput.addEventListener("input", function () {
        const val = els.searchInput.value;
        currentSearch = val;
        if (els.searchClear) els.searchClear.hidden = !val;
        debounce(render, 250);
      });
    }

    if (els.searchClear) {
      els.searchClear.addEventListener("click", function () {
        els.searchInput.value = "";
        currentSearch         = "";
        els.searchClear.hidden = true;
        render();
        els.searchInput.focus();
      });
    }

    /* Confirm delete */
    if (els.confirmCancel) els.confirmCancel.addEventListener("click", closeConfirmDelete);
    if (els.confirmDelete) els.confirmDelete.addEventListener("click", executeDelete);
    if (els.confirmOverlay) {
      els.confirmOverlay.addEventListener("click", function (e) {
        if (e.target === els.confirmOverlay) closeConfirmDelete();
      });
    }

    /* Sidebar toggle */
    if (els.sidebarToggle && els.sidebar) {
      els.sidebarToggle.addEventListener("click", function () {
        const isMobile = window.innerWidth <= 860;

        if (isMobile) {
          els.sidebar.classList.toggle("mobile-open");
          const isOpen = els.sidebar.classList.contains("mobile-open");
          els.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
        } else {
          sidebarOpen = !sidebarOpen;
          els.sidebar.classList.toggle("collapsed", !sidebarOpen);
          els.sidebarToggle.setAttribute("aria-expanded", String(sidebarOpen));
        }
      });

      /* Mobile: close sidebar on category click */
      document.querySelectorAll(".cat-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (window.innerWidth <= 860) {
            els.sidebar.classList.remove("mobile-open");
          }
        });
      });
    }

    /* Keyboard shortcuts */
    document.addEventListener("keydown", function (e) {
      /* Escape — close any open modal */
      if (e.key === "Escape") {
        if (els.confirmOverlay.classList.contains("open")) {
          closeConfirmDelete();
        } else if (els.editorOverlay.classList.contains("open")) {
          closeEditor();
        }
      }

      /* Ctrl/Cmd + S — save note (when editor is open) */
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (els.editorOverlay.classList.contains("open")) {
          e.preventDefault();
          saveNote();
        }
      }

      /* Ctrl/Cmd + N — new note (when editor is not open) */
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        if (!els.editorOverlay.classList.contains("open")) {
          e.preventDefault();
          openEditor(null);
        }
      }
    });

  }

  /* ============================================================
     BOOT
  ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
