/**
 * NoteNest — notes.js
 *
 * NotesEngine: A fully self-contained, OOP notes management engine.
 *
 * Responsibilities:
 *   - Create, read, update, delete (CRUD) notes
 *   - localStorage persistence with JSON serialisation
 *   - Note schema validation and ID generation
 *   - Filter by category (all, pinned, personal, work, ideas)
 *   - Full-text search across title and body
 *   - Sort: newest, oldest, pinned-first
 *   - Pin / unpin toggle
 *   - Word count and character count per note
 *   - Category counts for sidebar badge updates
 *   - Total word count across all notes
 *
 * Note Schema:
 * {
 *   id:        string   — Unique 8-char hex ID
 *   title:     string   — Note title (max 120 chars)
 *   body:      string   — Note content (HTML from contenteditable)
 *   bodyText:  string   — Plain-text version of body (for search/count)
 *   category:  string   — "personal" | "work" | "ideas"
 *   pinned:    boolean  — Whether note is starred/pinned
 *   archived:  boolean  — Whether note is archived
 *   color:     string   — Custom hex or class name for note color
 *   tags:      Array    — List of string tags
 *   createdAt: number   — Unix timestamp (ms)
 *   updatedAt: number   — Unix timestamp (ms)
 *   wordCount: number   — Word count of bodyText
 *   charCount: number   — Char count of bodyText
 * }
 *
 * Dependencies: None. Vanilla JS (ES6+). Uses localStorage for persistence.
 * IndexedDB is used for storing image blobs (Base64 is still used for small previews).
 */

"use strict";

class NotesEngine {

  /* ============================================================
     CONSTANTS
  ============================================================ */

  static STORAGE_KEY = "notenest_v1";
  static CATEGORIES  = ["personal", "work", "ideas"];
  static SORT_MODES  = ["newest", "oldest", "pinned"];

  /* ============================================================
     CONSTRUCTOR
  ============================================================ */

  constructor() {
    /** @type {Array} Internal in-memory store */
    this._notes = [];
    this._db = null;
    this._initPromise = this._initDb();
    this._load();
  }
 
  async _initDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("notenest_media", 1);
      request.onerror = e => reject("DB error: " + e.target.errorCode);
      request.onsuccess = e => {
        this._db = e.target.result;
        resolve();
      };
      request.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images");
        }
      };
    });
  }
 
  async ready() {
    return this._initPromise;
  }

  /* ============================================================
     PUBLIC API — CRUD
  ============================================================ */

  /**
   * Create a new note.
   * @param {{ title, body, bodyText, category, pinned }} data
   * @returns {Object}  The newly created note
   */
  create({ title = "", body = "", bodyText = "", category = "personal", pinned = false, archived = false, color = "", tags = [] } = {}) {
    this._validateCategory(category);

    const now  = Date.now();
    const note = {
      id:        this._generateId(),
      title:     this._sanitiseString(title, 120),
      body:      body,
      bodyText:  bodyText,
      category:  category,
      pinned:    Boolean(pinned),
      archived:  Boolean(archived),
      color:     color,
      tags:      Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      wordCount: this._countWords(bodyText),
      charCount: bodyText.length,
    };

    this._notes.unshift(note);
    this._save();
    return this._clone(note);
  }

  /**
   * Update an existing note by ID.
   * @param {string} id
   * @param {{ title, body, bodyText, category, pinned }} updates
   * @returns {Object|null}  Updated note or null if not found
   */
  update(id, updates = {}) {
    const idx = this._findIndex(id);
    if (idx === -1) return null;

    const note = this._notes[idx];

    if (typeof updates.title    !== "undefined") note.title    = this._sanitiseString(updates.title, 120);
    if (typeof updates.body     !== "undefined") note.body     = updates.body;
    if (typeof updates.bodyText !== "undefined") {
      note.bodyText  = updates.bodyText;
      note.wordCount = this._countWords(updates.bodyText);
      note.charCount = updates.bodyText.length;
    }
    if (typeof updates.category !== "undefined") {
      this._validateCategory(updates.category);
      note.category = updates.category;
    }
    if (typeof updates.pinned !== "undefined") {
      note.pinned = Boolean(updates.pinned);
    }
    if (typeof updates.archived !== "undefined") {
      note.archived = Boolean(updates.archived);
    }
    if (typeof updates.color !== "undefined") {
      note.color = updates.color;
    }
    if (typeof updates.tags !== "undefined") {
      note.tags = Array.isArray(updates.tags) ? updates.tags : [];
    }
 
    note.updatedAt = Date.now();
    this._notes[idx] = note;
    this._save();
    return this._clone(note);
  }

  /**
   * Delete a note by ID.
   * @param {string} id
   * @returns {boolean}  True if deleted, false if not found
   */
  delete(id) {
    const idx = this._findIndex(id);
    if (idx === -1) return false;
    this._notes.splice(idx, 1);
    this._save();
    return true;
  }

  /**
   * Toggle the pinned state of a note.
   * @param {string} id
   * @returns {Object|null}  Updated note or null if not found
   */
  togglePin(id) {
    const idx = this._findIndex(id);
    if (idx === -1) return null;
    this._notes[idx].pinned = !this._notes[idx].pinned;
    this._notes[idx].updatedAt = Date.now();
    this._save();
    return this._clone(this._notes[idx]);
  }

  /**
   * Retrieve a single note by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    const note = this._notes.find(function (n) { return n.id === id; });
    return note ? this._clone(note) : null;
  }

  /* ============================================================
     PUBLIC API — QUERY
  ============================================================ */

  /**
   * Query notes with optional category filter, search term, and sort.
   * @param {{
   *   category?: string,
   *   search?:   string,
   *   sort?:     string
   * }} options
   * @returns {Array}  Filtered, searched, and sorted note array (cloned)
   */
  query({ category = "all", search = "", sort = "newest" } = {}) {
    let results = this._notes.slice();

    /* Filter by category */
    if (category === "pinned") {
      results = results.filter(function (n) { return n.pinned && !n.archived; });
    } else if (category === "archived") {
      results = results.filter(function (n) { return n.archived; });
    } else if (category !== "all") {
      results = results.filter(function (n) { return n.category === category && !n.archived; });
    } else {
      /* Show all unarchived notes */
      results = results.filter(function (n) { return !n.archived; });
    }

    /* Full-text search */
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(function (n) {
        return (
          n.title.toLowerCase().includes(term) ||
          n.bodyText.toLowerCase().includes(term)
        );
      });
    }

    /* Sort */
    results = this._sort(results, sort);

    return results.map((n) => this._clone(n));
  }

  /**
   * Get count for each category.
   * @returns {{ all, pinned, personal, work, ideas }}
   */
  getCounts() {
    const counts = {
      all:      0,
      pinned:   0,
      personal: 0,
      work:     0,
      ideas:    0,
      archived: 0,
    };

    this._notes.forEach(function (n) {
      if (n.archived) {
        counts.archived++;
        return;
      }
      counts.all++;
      if (n.pinned) counts.pinned++;
      if (n.category === "personal") counts.personal++;
      if (n.category === "work")     counts.work++;
      if (n.category === "ideas")    counts.ideas++;
    });

    return counts;
  }

  /**
   * Get total word count across all notes.
   * @returns {number}
   */
  getTotalWordCount() {
    return this._notes.reduce(function (sum, n) { return sum + n.wordCount; }, 0);
  }

  /**
   * Get total number of notes.
   * @returns {number}
   */
  getTotal() {
    return this._notes.length;
  }

  /* ============================================================
     PRIVATE — STORAGE
  ============================================================ */

  _save() {
    try {
      localStorage.setItem(NotesEngine.STORAGE_KEY, JSON.stringify(this._notes));
    } catch (e) {
      console.warn("[NotesEngine] localStorage write failed:", e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(NotesEngine.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          /* Migrate any older notes missing new fields */
          this._notes = parsed.map(function (n) {
            return Object.assign({
              wordCount: 0,
              charCount: 0,
              bodyText:  "",
              pinned:    false,
              archived:  false,
              color:     "",
              tags:      [],
            }, n);
          });
        }
      }
    } catch (e) {
      console.warn("[NotesEngine] localStorage read failed:", e);
      this._notes = [];
    }
  }

  /* ============================================================
     PRIVATE — UTILITIES
  ============================================================ */

  /** Generate a random 8-character hex ID */
  _generateId() {
    const arr = new Uint8Array(4);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  /** Find a note's index by ID */
  _findIndex(id) {
    for (let i = 0; i < this._notes.length; i++) {
      if (this._notes[i].id === id) return i;
    }
    return -1;
  }

  /** Deep-clone a note object (prevents external mutation of internal state) */
  _clone(note) {
    return Object.assign({}, note);
  }

  /** Trim and truncate a string */
  _sanitiseString(str, maxLen) {
    return String(str).trim().slice(0, maxLen);
  }

  /** Count words in a plain-text string */
  _countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /** Validate a category value */
  _validateCategory(category) {
    if (!NotesEngine.CATEGORIES.includes(category)) {
      throw new Error("Invalid category: " + category + ". Must be one of: " + NotesEngine.CATEGORIES.join(", "));
    }
  }

  /** Sort an array of notes by the given mode */
  _sort(notes, sort) {
    const arr = notes.slice();

    if (sort === "newest") {
      arr.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    } else if (sort === "oldest") {
      arr.sort(function (a, b) { return a.updatedAt - b.updatedAt; });
    } else if (sort === "pinned") {
      arr.sort(function (a, b) {
        if (a.pinned === b.pinned) return b.updatedAt - a.updatedAt;
        return a.pinned ? -1 : 1;
      });
    }

    return arr;
  }
 
  /* ============================================================
     MEDIA — IndexedDB
  ============================================================ */
 
  async saveImage(id, blob) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction("images", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject();
      tx.objectStore("images").put(blob, id);
    });
  }
 
  async getImage(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction("images", "readonly");
      const request = tx.objectStore("images").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject();
    });
  }
 
  /* ============================================================
     EXPORT / IMPORT
  ============================================================ */
 
  exportData() {
    const data = {
      version: 2,
      notes: this._notes,
      exportedAt: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    return URL.createObjectURL(blob);
  }
 
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.notes)) {
        this._notes = data.notes;
        this._save();
        return true;
      }
    } catch (e) {
      console.error("Import failed:", e);
    }
    return false;
  }

}

/* Export for module environments */
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = NotesEngine;
}
