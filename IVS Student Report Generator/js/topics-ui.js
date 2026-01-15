// topics-ui.js (FULL WORKING FILE)
// Supports:
// - Qaida Nooraniyya: lessons + lines 1–50 (no reverse)
// - Nazira Quran / Quran Memorization: By Juz / By Surah + search + verse from-to (no reverse)
// - Tajweed: multi-select chapters
// - Duas & Sunnah: multi-select duas
(function () {
  const QAIDA_SUBJECT = "Qaida Nooraniyya";
  const QURAN_SUBJECTS = ["Nazira Quran", "Quran Memorization"];
  const TAJWEED_SUBJECT = "Tajweed";
  const DUAS_SUBJECT = "Duas & Sunnah";

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
// ===== Topics Covered Collapsible Wrapper =====
function mountTopicsCollapsible(cell, summaryText) {
  cell.innerHTML = `
    <div class="tc-wrap">
      <button type="button" class="tc-summary">
        <div class="left">
          <div class="tc-badge"><i class="fa-solid fa-list-check"></i></div>
          <div class="tc-text">
            <div class="tc-title">Topics Covered</div>
            <div class="tc-value">${escapeHtml(summaryText || "Select topic...")}</div>
          </div>
        </div>
        <div class="tc-right"><i class="fa-solid fa-chevron-down"></i></div>
      </button>
      <div class="tc-content"></div>
    </div>
  `;

  const wrap = cell.querySelector(".tc-wrap");
  const btn = cell.querySelector(".tc-summary");
  const valueEl = cell.querySelector(".tc-value");
  const content = cell.querySelector(".tc-content");

  btn.addEventListener("click", () => {
    wrap.classList.toggle("open");
  });

  // One-time outside click handler (closes any open topics panels)
  if (!window.__tcOutsideBound) {
    window.__tcOutsideBound = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".tc-wrap.open").forEach(w => {
        if (!w.contains(e.target)) w.classList.remove("open");
      });
    });
  }

  return {
    wrap,
    content,
    setSummary(text) {
      valueEl.textContent = text && text.trim() ? text : "Select topic...";
    },
    close() { wrap.classList.remove("open"); },
    open() { wrap.classList.add("open"); }
  };
}

  function makeOptions(from, to) {
    let html = "";
    for (let i = from; i <= to; i++) html += `<option value="${i}">${i}</option>`;
    return html;
  }

  function enforceMinMax(fromSel, toSel) {
    const f = parseInt(fromSel.value || "1", 10);
    const t = parseInt(toSel.value || "1", 10);
    if (t < f) toSel.value = String(f);

    [...toSel.options].forEach((opt) => {
      const v = parseInt(opt.value, 10);
      if (!Number.isNaN(v)) opt.disabled = v < f;
    });
  }

  function getRow(el) {
    return el.closest("tr");
  }

  function getTopicsCell(row) {
    return row.querySelector("td:nth-child(2)");
  }

  function setTopicsValue(row, text) {
    const topicsInput = row.querySelector(".topics");
    if (topicsInput) topicsInput.value = text;
  }

  function clearTopicsUI(row) {
    const cell = getTopicsCell(row);
    if (!cell) return;

    const existingUI = cell.querySelector(".topics-ui");
    if (existingUI) existingUI.remove();

    if (!cell.querySelector(".topics")) {
      cell.innerHTML = `<input class="cell-input topics" placeholder="Topics covered..." />`;
    }
  }

  // ---------------- QAIDA UI ----------------
function renderQaidaUI(row) {
  const cell = getTopicsCell(row);
  if (!cell) return;

  const lessons = window.qaidaLessons || [];
  if (!lessons.length) {
    clearTopicsUI(row);
    return;
  }

  const ui = mountTopicsCollapsible(cell, "");
  const root = ui.content;

  root.innerHTML = `
    <div class="topics-ui">
      <div class="q-panel">
        <div class="mini">Qaida Nooraniyya</div>

        <select class="cell-input qaida-lesson">
          <option value="">Select Lesson</option>
          ${lessons.map((l, idx) => `<option value="${idx}">${escapeHtml(l)}</option>`).join("")}
        </select>

        <div class="qaida-lines" style="display:none; margin-top:10px;"></div>

        <input class="cell-input topics" style="display:none;" />
        <div class="mini qaida-preview">Select lesson and lines.</div>
      </div>
    </div>
  `;

  const lessonSel = root.querySelector(".qaida-lesson");
  const linesWrap = root.querySelector(".qaida-lines");
  const preview = root.querySelector(".qaida-preview");

  function setFinal(text) {
    setTopicsValue(row, text);
    preview.textContent = text || "Select lesson and lines.";
    ui.setSummary(text || "");
    function setFinal(text) {
  setTopicsValue(row, text);
  preview.textContent = text || "Select lesson and lines.";
  ui.setSummary(text || "");
  // do NOT auto close here
}

  }

  function buildLineSelectors() {
    linesWrap.style.display = "block";
    linesWrap.innerHTML = `
      <div class="q-verse-grid">
        <div>
          <div class="mini">From line</div>
          <select class="cell-input qaida-from">${makeOptions(1, 50)}</select>
        </div>
        <div>
          <div class="mini">To line</div>
          <select class="cell-input qaida-to">${makeOptions(1, 50)}</select>
        </div>
      </div>
    `;

    const fromSel = linesWrap.querySelector(".qaida-from");
    const toSel = linesWrap.querySelector(".qaida-to");
    fromSel.value = "1";
    toSel.value = "1";
    enforceMinMax(fromSel, toSel);

    function update() {
      enforceMinMax(fromSel, toSel);

      const idx = parseInt(lessonSel.value || "-1", 10);
      if (idx < 0) return;

      const lessonName = lessons[idx];
      setFinal(`${lessonName} (Lines ${fromSel.value}-${toSel.value})`);
    }

    fromSel.addEventListener("change", update);
    toSel.addEventListener("change", update);

    update();
  }

  lessonSel.addEventListener("change", () => {
    setFinal("");
    linesWrap.style.display = "none";
    linesWrap.innerHTML = "";

    if (!lessonSel.value) {
      preview.textContent = "Select lesson and lines.";
      ui.setSummary("");
      return;
    }

    buildLineSelectors();
  });
}


  // ---------------- MULTI-SELECT UI (Tajweed / Duas) ----------------
  function renderMultiPickUI(row, title, items) {
  const cell = getTopicsCell(row);
  if (!cell) return;

  const ui = mountTopicsCollapsible(cell, "");
  const root = ui.content;

  root.innerHTML = `
    <div class="topics-ui">
      <div style="display:grid; gap:10px;">
        <div class="mini">${escapeHtml(title)} (select multiple)</div>

        <input class="cell-input mp-search" placeholder="Search..." />

        <div class="mp-list" style="border:1px solid #d6e4ea; border-radius:16px; padding:10px; max-height:220px; overflow:auto; background:#fff;">
          ${items.map((name) => `
            <label style="display:flex; gap:10px; align-items:flex-start; padding:10px 8px;">
              <input type="checkbox" class="mp-item" value="${escapeHtml(name)}" style="margin-top:3px;">
              <span>${escapeHtml(name)}</span>
            </label>
          `).join("")}
        </div>

        <input class="cell-input topics" style="display:none;" />
        <div class="mini mp-preview">No selection yet.</div>
      </div>
    </div>
  `;

  const search = root.querySelector(".mp-search");
  const list = root.querySelector(".mp-list");
  const checks = [...root.querySelectorAll(".mp-item")];
  const preview = root.querySelector(".mp-preview");

  function makeSummary(selected) {
    if (!selected.length) return "";
    if (selected.length <= 2) return selected.join(", ");
    return `${selected[0]}, ${selected[1]} +${selected.length - 2} more`;
  }

  function update() {
    const selected = checks.filter(c => c.checked).map(c => c.value);
    const text = selected.join(", ");

    setTopicsValue(row, text);
    preview.textContent = selected.length ? `${selected.length} selected` : "No selection yet.";

    ui.setSummary(makeSummary(selected));
    // For multi-select we don't auto-close on every tick.
    // Clicking outside will close automatically (because of the global handler).
  }

  checks.forEach(c => c.addEventListener("change", update));

  search.addEventListener("input", () => {
    const q = (search.value || "").toLowerCase();
    [...list.querySelectorAll("label")].forEach(lbl => {
      const txt = lbl.textContent.toLowerCase();
      lbl.style.display = txt.includes(q) ? "flex" : "none";
    });
  });

  update();
}



  // ---------------- QURAN UI ----------------
function renderQuranUI(row) {
  const cell = getTopicsCell(row);
  if (!cell) return;

  const surahs = window.quranSurahs || [];
  const juzData = window.quranJuzData || [];

  if (!surahs.length || !juzData.length) {
    clearTopicsUI(row);
    return;
  }

const ui = mountTopicsCollapsible(cell, "");
ui.content.innerHTML = `
  <div class="topics-ui">
    <div class="q-box">
      <div class="q-top">
        <div class="q-modes">
          <label class="q-radio">
            <input type="radio" name="qmode-${Date.now()}" value="surah" checked>
            <span>By Surah</span>
          </label>
          <label class="q-radio">
            <input type="radio" name="qmode-${Date.now()}" value="juz">
            <span>By Juz</span>
          </label>
        </div>

        <div class="q-search">
      <i class="fa-solid fa-magnifying-glass search-ico" aria-hidden="true"></i>
          <input class="cell-input q-search-input" placeholder="         Search surah or juz..." />
        </div>
      </div>

      <div class="q-body">
        <div class="q-left">
          <div class="mini">Select</div>
          <select class="cell-input q-select"></select>
        </div>

        <div class="q-right" style="display:none;">
          <div class="mini">Surah in Juz</div>
          <select class="cell-input q-surah-in-juz"></select>
        </div>

        <div class="q-verses" style="display:none;"></div>

        <input class="cell-input topics" style="display:none;" />
        <div class="mini q-preview">Select to generate topic.</div>
      </div>
    </div>
  </div>
`;


  const modeRadios = [...cell.querySelectorAll('input[type="radio"]')];
  const searchInput = cell.querySelector(".q-search-input");
  const mainSelect = cell.querySelector(".q-select");
  const rightBox = cell.querySelector(".q-right");
  const surahInJuz = cell.querySelector(".q-surah-in-juz");
  const versesBox = cell.querySelector(".q-verses");
  const preview = cell.querySelector(".q-preview");

  function setPreview(text) {
  setTopicsValue(row, text);
  preview.textContent = text || "Select to generate topic.";
  ui.setSummary(text);
  function setPreview(text) {
  setTopicsValue(row, text);
  preview.textContent = text || "Select to generate topic.";
  ui.setSummary(text);
  // do NOT auto close here
}

}


  function makeOpt(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  function resetVerses() {
    versesBox.style.display = "none";
    versesBox.innerHTML = "";
  }

  function buildVerseSelectors(minV, maxV) {
    versesBox.style.display = "block";
    versesBox.innerHTML = `
      <div class="q-verse-grid">
        <div>
          <div class="mini">From</div>
          <select class="cell-input q-from">${makeOptions(minV, maxV)}</select>
        </div>
        <div>
          <div class="mini">To</div>
          <select class="cell-input q-to">${makeOptions(minV, maxV)}</select>
        </div>
      </div>
    `;

    const fromSel = versesBox.querySelector(".q-from");
    const toSel = versesBox.querySelector(".q-to");

    fromSel.value = String(minV);
    toSel.value = String(minV);

    enforceMinMax(fromSel, toSel);

    return { fromSel, toSel };
  }

  function getMode() {
    return modeRadios.find(r => r.checked)?.value || "surah";
  }

  function fillMainSelectSurah(query = "") {
    mainSelect.innerHTML = "";
    mainSelect.appendChild(makeOpt("", "Select a Surah"));

    const q = query.toLowerCase();
    surahs.forEach(s => {
      const label = `${s.number}. ${s.name}${s.arabicName ? ` (${s.arabicName})` : ""}`
      if (!q || label.toLowerCase().includes(q)) {
        mainSelect.appendChild(makeOpt(String(s.number), label));
      }
    });
  }

  function fillMainSelectJuz(query = "") {
    mainSelect.innerHTML = "";
    mainSelect.appendChild(makeOpt("", "Select a Juz"));

    const q = query.toLowerCase();
    juzData.forEach(j => {
      const label = `Juz ${j.juz}`;
      if (!q || label.toLowerCase().includes(q)) {
        mainSelect.appendChild(makeOpt(String(j.juz), label));
      }
    });
  }

  function fillSurahInJuz(juzNo, query = "") {
    surahInJuz.innerHTML = "";
    surahInJuz.appendChild(makeOpt("", "Select Surah"));

    const juzObj = juzData.find(x => x.juz === juzNo);
    if (!juzObj) return;

    const q = query.toLowerCase();

    juzObj.surahs.forEach(entry => {
      const full = surahs.find(s => s.number === entry.surahNumber);
      const label = full
  ? `${full.number}. ${full.name}`
  : `${entry.surahNumber}. ${entry.surahName}`;


      if (!q || label.toLowerCase().includes(q)) {
        const opt = makeOpt(String(entry.surahNumber), label);
        opt.dataset.start = String(entry.startVerse);
        opt.dataset.end = String(entry.endVerse);
        surahInJuz.appendChild(opt);
      }
    });
  }

  function renderMode() {
    setPreview("");
    resetVerses();

    const mode = getMode();
    const q = searchInput.value || "";

    if (mode === "surah") {
      rightBox.style.display = "none";
      fillMainSelectSurah(q);
    } else {
      rightBox.style.display = "block";
      fillMainSelectJuz(q);
      surahInJuz.innerHTML = `<option value="">Select Surah</option>`;
      surahInJuz.disabled = true;
    }
  }

  // Events
  modeRadios.forEach(r => r.addEventListener("change", renderMode));

  searchInput.addEventListener("input", () => {
    renderMode();

    // If in juz mode and a juz is already selected, also filter surah list
    if (getMode() === "juz") {
      const juzNo = parseInt(mainSelect.value || "0", 10);
      if (juzNo) fillSurahInJuz(juzNo, searchInput.value || "");
    }
  });

  mainSelect.addEventListener("change", () => {
    setPreview("");
    resetVerses();

    const mode = getMode();

    if (mode === "surah") {
      const no = parseInt(mainSelect.value || "0", 10);
      if (!no) return;

      const s = surahs.find(x => x.number === no);
      const { fromSel, toSel } = buildVerseSelectors(1, s.verseCount);

      function update() {
        enforceMinMax(fromSel, toSel);
        const label = mainSelect.options[mainSelect.selectedIndex]?.textContent || s.name;
        setPreview(`${label} (Verses ${fromSel.value}-${toSel.value})`);
      }

      fromSel.addEventListener("change", update);
      toSel.addEventListener("change", update);
      update();
    } else {
      const juzNo = parseInt(mainSelect.value || "0", 10);
      if (!juzNo) {
        surahInJuz.disabled = true;
        surahInJuz.innerHTML = `<option value="">Select Surah</option>`;
        return;
      }

      surahInJuz.disabled = false;
      fillSurahInJuz(juzNo, searchInput.value || "");
    }
  });

  surahInJuz.addEventListener("change", () => {
    setPreview("");
    resetVerses();

    const juzNo = parseInt(mainSelect.value || "0", 10);
    const opt = surahInJuz.options[surahInJuz.selectedIndex];
    if (!juzNo || !opt || !opt.value) return;

    const startV = parseInt(opt.dataset.start || "1", 10);
    const endV = parseInt(opt.dataset.end || "1", 10);

    const { fromSel, toSel } = buildVerseSelectors(startV, endV);

    function update() {
      enforceMinMax(fromSel, toSel);
      setPreview(`Juz ${juzNo} - ${opt.textContent} (Verses ${fromSel.value}-${toSel.value})`);
    }

    fromSel.addEventListener("change", update);
    toSel.addEventListener("change", update);
    update();
  });

  // init
  renderMode();
}


  // -------- Main handler --------
  function onSubjectChange(e) {
    if (!e.target.classList.contains("subject")) return;

    const row = getRow(e.target);
    if (!row) return;

    const subject = (e.target.value || "").trim();

    clearTopicsUI(row);
    setTopicsValue(row, "");

    if (subject === QAIDA_SUBJECT) {
      renderQaidaUI(row);
      return;
    }

    if (QURAN_SUBJECTS.includes(subject)) {
      renderQuranUI(row);
      return;
    }

    if (subject === TAJWEED_SUBJECT) {
      renderMultiPickUI(row, "Tajweed Chapters", window.tajweedChapters || []);
      return;
    }

    if (subject === DUAS_SUBJECT) {
      renderMultiPickUI(row, "Masnoon Duas", window.duaChapters || []);
      return;
    }

    // Other subjects = manual topics input
  }

  window.initTopicsUI = function initTopicsUI() {
    const table = document.getElementById("subjectsTable");
    if (!table) return;
    table.addEventListener("change", onSubjectChange);
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.initTopicsUI();
  });
})();
