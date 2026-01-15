"use strict";

(() => {
  /* =========================
     CONFIG
  ========================= */
  const WATERMARK_SRC = "assets/logo.jpg"; // change if needed

  const FEEDBACK_QUESTIONS_KEY = "iqra_feedback_questions_v1";
  const FEEDBACK_ANSWERS_KEY = "iqra_feedback_answers_v1";

  let subjectsTbody = null;
  let planTbody = null;

  /* =========================
     Small helpers
  ========================= */
  const $ = (id) => document.getElementById(id);
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return alert(msg);
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  /* =========================
     Validation UI (red borders + messages)
  ========================= */
  function clearValidationUI() {
    document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    document.querySelectorAll(".field-error, .cell-error").forEach((el) => el.remove());
  }

  function showErrorUnderInput(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("is-invalid");

    const wrap = inputEl.closest(".field") || inputEl.parentElement;
    if (wrap) wrap.querySelectorAll(".field-error").forEach((e) => e.remove());

    const msg = document.createElement("div");
    msg.className = "field-error";
    msg.textContent = message;

    if (wrap) wrap.appendChild(msg);
    else inputEl.insertAdjacentElement("afterend", msg);
  }

  function showErrorUnderGroup(els, message) {
    const list = els.filter(Boolean);
    list.forEach((el) => el.classList.add("is-invalid"));

    const wrap = list[0]?.closest(".field") || list[0]?.parentElement;
    if (!wrap) return;

    wrap.querySelectorAll(".field-error").forEach((e) => e.remove());
    const msg = document.createElement("div");
    msg.className = "field-error";
    msg.textContent = message;
    wrap.appendChild(msg);
  }

  function showErrorInTableCell(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("is-invalid");

    const td = inputEl.closest("td");
    if (!td) return;

    td.querySelectorAll(".cell-error").forEach((e) => e.remove());
    const msg = document.createElement("div");
    msg.className = "cell-error";
    msg.textContent = message;
    td.appendChild(msg);
  }

  function enableLiveValidationClear() {
    document.body.addEventListener(
      "input",
      (e) => {
        const el = e.target;
        if (el?.classList?.contains("is-invalid")) {
          el.classList.remove("is-invalid");
          el.closest(".field")?.querySelectorAll(".field-error").forEach((n) => n.remove());
          el.closest("td")?.querySelectorAll(".cell-error").forEach((n) => n.remove());
        }
      },
      true
    );

    document.body.addEventListener(
      "change",
      (e) => {
        const el = e.target;
        if (el?.classList?.contains("is-invalid")) {
          el.classList.remove("is-invalid");
          el.closest(".field")?.querySelectorAll(".field-error").forEach((n) => n.remove());
          el.closest("td")?.querySelectorAll(".cell-error").forEach((n) => n.remove());
        }
      },
      true
    );
  }

  function validateBeforePDF_UI() {
    clearValidationUI();

    let firstBad = null;
    let hasErrors = false;

    // Required fields
    const studentNameEl = $("studentName");
    const teacherNameEl = $("teacherName");
    const meetingDateEl = $("meetingDate");

    if (!v("studentName")) {
      hasErrors = true;
      firstBad ||= studentNameEl;
      showErrorUnderInput(studentNameEl, "Student Name is required.");
    }

    if (!v("teacherName")) {
      hasErrors = true;
      firstBad ||= teacherNameEl;
      showErrorUnderInput(teacherNameEl, "Teacher Name is required.");
    }

    if (!v("meetingDate")) {
      hasErrors = true;
      firstBad ||= meetingDateEl;
      showErrorUnderInput(meetingDateEl, "Meeting Date is required.");
    }

    // Duration required (month+year)
    const mFrom = $("reportMonthFrom");
    const yFrom = $("reportYearFrom");
    const mTo = $("reportMonthTo");
    const yTo = $("reportYearTo");

    if (!mFrom?.value || !yFrom?.value || !mTo?.value || !yTo?.value) {
      hasErrors = true;
      firstBad ||= mFrom || yFrom || mTo || yTo;
      showErrorUnderGroup([mFrom, yFrom, mTo, yTo], "Report Duration (From Month/Year to To Month/Year) is required.");
    }

    // Progress Summary rows
    const rows = Array.from(document.querySelectorAll("#subjectsTable tbody tr"));
    let anyRowStarted = false;

    rows.forEach((tr, i) => {
      const subjectSel = tr.querySelector(".subject");
      const otherInp = tr.querySelector(".subject-other");
      const topicsInp = tr.querySelector(".topics-value") || tr.querySelector(".topics");
      const progressSel = tr.querySelector(".progress");

      const subjectVal = (subjectSel?.value || "").trim();
      const otherVal = (otherInp?.value || "").trim();
      const topicsVal = (topicsInp?.value || "").trim();
      const progressVal = (progressSel?.value || "").trim();

      const started = subjectVal || otherVal || topicsVal || progressVal;
      if (started) anyRowStarted = true;

      if (started) {
        const finalSubject = subjectVal.toLowerCase() === "other" ? otherVal : subjectVal;

        if (!finalSubject) {
          hasErrors = true;
          firstBad ||= otherInp || subjectSel;
          showErrorInTableCell(otherInp || subjectSel, `Row ${i + 1}: Subject is required.`);
        }

        if (!topicsVal) {
          hasErrors = true;
          firstBad ||= topicsInp;
          showErrorInTableCell(topicsInp, `Row ${i + 1}: Topics Covered is required.`);
        }

        if (!progressVal) {
          hasErrors = true;
          firstBad ||= progressSel;
          showErrorInTableCell(progressSel, `Row ${i + 1}: Status is required.`);
        }
      }
    });

    if (!anyRowStarted) {
      const firstSubject = document.querySelector("#subjectsTable tbody tr .subject");
      hasErrors = true;
      firstBad ||= firstSubject;
      if (firstSubject) showErrorInTableCell(firstSubject, "Add at least 1 Subject row before generating PDF.");
    }

    return { ok: !hasErrors, firstBad };
  }

  /* =========================
     Subjects / Plan tables
  ========================= */
  function ensureSubjectOptions() {
    if (!Array.isArray(window.subjectOptions) || !window.subjectOptions.length) {
      window.subjectOptions = ["Qaida", "Nazira", "Hifz", "Tajweed", "Duas", "Other"];
    }
    if (!window.subjectOptions.map((s) => s.toLowerCase()).includes("other")) {
      window.subjectOptions.push("Other");
    }
  }

function buildRemark(subject, status, topics) {
  const s = (subject || "").trim();
  const t = (topics || "").trim();
  const topicLine = t ? ` Topics covered: ${t}.` : "";

  switch ((status || "").trim()) {
    case "Excellent":
      return `Excellent progress in ${s}.${topicLine} The student demonstrates strong understanding and consistent practice. Keep up the excellent work.`;

    case "Good":
      return `Good progress in ${s}.${topicLine} The student is developing well. Continued regular practice will strengthen consistency and accuracy.`;

    case "Satisfactory":
      return `Satisfactory progress in ${s}.${topicLine} With more regular revision and guided practice, the student can improve confidence and performance.`;

    case "Needs Improvement":
      return `Needs improvement in ${s}.${topicLine} Please focus on daily practice, revision of fundamentals, and completing assigned work.`;

    default:
      return t ? `Progress recorded in ${s}.${topicLine}` : `Progress recorded in ${s}.`;
  }
}


function addSubjectRow() {
  const tr = document.createElement("tr");

  const options = (window.subjectOptions || [])
    .map((s) => `<option value="${s}">${s}</option>`)
    .join("");

  tr.innerHTML = `
    <td>
      <select class="cell-input subject">
        <option value="">Select subject</option>
        ${options}
        <option value="Other">Other</option>
      </select>

      <input
        class="cell-input subject-other"
        placeholder="Type other subject..."
        style="display:none; margin-top:8px;"
      />
    </td>

    <td>
      <input class="cell-input topics" placeholder="Topics covered..." />
    </td>

    <td>
      <select class="cell-input progress" disabled>
        <option value="">Select status</option>
        <option>Excellent</option>
        <option>Good</option>
        <option>Satisfactory</option>
        <option>Needs Improvement</option>
      </select>
    </td>

    <td>
      <input class="cell-input remarks" placeholder="Remarks will appear after selecting status..." disabled />
    </td>

    <td style="text-align:right;">
      <button class="icon-btn" type="button" title="Remove row">
        <i class="fa-solid fa-trash"></i>
      </button>
    </td>
  `;

  subjectsTbody.appendChild(tr);

  const subjectSelect = tr.querySelector(".subject");
  const otherInput = tr.querySelector(".subject-other");
  const topicsInput = tr.querySelector(".topics");
  const progressSelect = tr.querySelector(".progress");
  const remarksInput = tr.querySelector(".remarks");

  // Helper: get final subject (normal or other)
  function getFinalSubject() {
    const sel = (subjectSelect.value || "").trim();
    if (!sel) return "";
    if (sel.toLowerCase() === "other") return (otherInput.value || "").trim();
    return sel;
  }

  // Helper: should we auto-update remarks?
  function isAutoRemark() {
    return remarksInput.dataset.auto === "1";
  }

  function setAutoRemarkFlag(on) {
    remarksInput.dataset.auto = on ? "1" : "0";
  }

  // Main: enable/disable based on Subject + Status
  function updateRowState({ forceRewriteRemark = false } = {}) {
    const subject = getFinalSubject();
    const status = (progressSelect.value || "").trim();
    const topics = (topicsInput.value || "").trim();

    // If NO subject -> disable everything + clear
    if (!subject) {
      progressSelect.value = "";
      progressSelect.disabled = true;

      remarksInput.value = "";
      remarksInput.disabled = true;
      setAutoRemarkFlag(true);
      return;
    }

    // Subject selected -> enable status
    progressSelect.disabled = false;

    // If NO status -> disable remarks + clear (so it never mixes)
    if (!status) {
      remarksInput.value = "";
      remarksInput.disabled = true;
      setAutoRemarkFlag(true);
      return;
    }

    // Status selected -> enable remarks
    remarksInput.disabled = false;

    // Generate remark (overwrite old one, no mixing)
    if (forceRewriteRemark || isAutoRemark()) {
      remarksInput.value = buildRemark(subject, status, topics);
      setAutoRemarkFlag(true);
    }
  }

  // Subject change: show/hide Other + refresh row state
  subjectSelect.addEventListener("change", () => {
    const isOther = (subjectSelect.value || "").toLowerCase() === "other";
    otherInput.style.display = isOther ? "block" : "none";
    if (!isOther) otherInput.value = "";

    // If subject changes, rewrite remark (overwrite old one)
    updateRowState({ forceRewriteRemark: true });
  });

  // Other subject typing (if status selected, rewrite)
  otherInput.addEventListener("input", () => {
    updateRowState({ forceRewriteRemark: true });
  });

  // Status change: enable remarks + regenerate
  progressSelect.addEventListener("change", () => {
    updateRowState({ forceRewriteRemark: true });
  });

  // Topics change: update remark only if it's still auto
  topicsInput.addEventListener("input", () => {
    updateRowState({ forceRewriteRemark: false });
  });

  // If user manually edits remarks, stop auto-overwriting
  remarksInput.addEventListener("input", () => {
    setAutoRemarkFlag(false);
  });

  // Remove row button
  tr.querySelector(".icon-btn").addEventListener("click", () => {
    if (confirm("Remove this subject row?")) tr.remove();
  });

  // Start with correct disabled state
  setAutoRemarkFlag(true);
  updateRowState({ forceRewriteRemark: false });
}
  function addPlanRow() {
    ensureSubjectOptions();
    if (!planTbody) planTbody = document.querySelector("#nextPlanTable tbody");
    if (!planTbody) return;

    const tr = document.createElement("tr");
    const options = window.subjectOptions.map((s) => `<option value="${s}">${s}</option>`).join("");

    tr.innerHTML = `
      <td>
        <select class="cell-input plan-subject">
          <option value="">Select subject</option>
          ${options}
        </select>
        <input class="cell-input plan-subject-other" placeholder="Type other subject..." style="display:none; margin-top:8px;" />
      </td>

      <td>
        <input class="cell-input plan-topics" placeholder="Upcoming topics / skills..." />
      </td>

      <td>
        <input type="date" class="cell-input plan-deadline" />
      </td>

      <td style="text-align:right;">
        <button class="icon-btn" type="button" title="Remove row">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    planTbody.appendChild(tr);

    const select = tr.querySelector(".plan-subject");
    const other = tr.querySelector(".plan-subject-other");

    select.addEventListener("change", () => {
      const isOther = (select.value || "").toLowerCase() === "other";
      other.style.display = isOther ? "block" : "none";
      if (!isOther) other.value = "";
    });

    tr.querySelector(".icon-btn").addEventListener("click", () => {
      if (confirm("Remove this plan row?")) tr.remove();
    });
  }

  /* =========================
     Feedback Questions UI (FIXED)
  ========================= */
  function defaultFeedbackQuestions() {
    return [
      {
        id: "learning",
        title: "Learning & Progress",
        questions: [
          "Student understands lessons clearly.",
          "Student completes practice regularly.",
          "Student shows improvement over time."
        ]
      },
      {
        id: "behavior",
        title: "Behavior & Discipline",
        questions: [
          "Student behaves respectfully in class.",
          "Student listens and follows instructions."
        ]
      },
      {
        id: "communication",
        title: "Communication",
        questions: [
          "Teacher communication is clear and helpful.",
          "We get updates about progress on time."
        ]
      }
    ];
  }

  function loadFeedbackQuestions() {
    const raw = localStorage.getItem(FEEDBACK_QUESTIONS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return window.defaultFeedbackQuestions || defaultFeedbackQuestions();
  }

  function saveFeedbackQuestions(qs) {
    localStorage.setItem(FEEDBACK_QUESTIONS_KEY, JSON.stringify(qs));
  }

  function loadFeedbackAnswers() {
    const raw = localStorage.getItem(FEEDBACK_ANSWERS_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {};
  }

  function saveFeedbackAnswers(a) {
    localStorage.setItem(FEEDBACK_ANSWERS_KEY, JSON.stringify(a));
  }

function initFeedbackUI() {
  const wrap = $("feedbackAccordion");
  if (!wrap) return;

  const toggle = $("editFeedbackToggle");
  const ratings = window.feedbackRatings || ["Excellent", "Good", "Satisfactory", "Needs Improvement"];

  // force defaults if storage is empty
  const qs = loadFeedbackQuestions();
  saveFeedbackQuestions(qs);

  function render() {
    const editOn = !!toggle?.checked;
    const questions = loadFeedbackQuestions();
    const answers = loadFeedbackAnswers();

    wrap.innerHTML = "";

    questions.forEach((sec, secIndex) => {
      const box = document.createElement("div");
      box.className = "fb-section";

      box.innerHTML = `
        <div class="fb-header">
          <h3>${sec.title}</h3>
          <i class="fa-solid fa-chevron-down"></i>
        </div>
        <div class="fb-body"></div>
      `;

      const header = box.querySelector(".fb-header");
      const body = box.querySelector(".fb-body");

      // ✅ Always start collapsed
      body.style.display = "none";
      box.classList.remove("open");

      header.addEventListener("click", () => {
        const open = body.style.display !== "none";
        body.style.display = open ? "none" : "block";
        box.classList.toggle("open", !open);
      });

      (sec.questions || []).forEach((qText, qIndex) => {
        const key = `${sec.id}__${qIndex}`;
        const selected = answers[key] || "";

        const qDiv = document.createElement("div");
        qDiv.className = "fb-question";

        if (!editOn) {
          qDiv.innerHTML = `
            <p class="fb-qtext">${qText}</p>
            <div class="fb-options">
              ${ratings.map(r => `
                <label class="fb-opt">
                  <input type="radio" name="${key}" value="${r}" ${selected === r ? "checked" : ""} />
                  <span>${r}</span>
                </label>
              `).join("")}
            </div>
          `;

          qDiv.querySelectorAll("input[type=radio]").forEach((radio) => {
            radio.addEventListener("change", () => {
              answers[key] = radio.value;
              saveFeedbackAnswers(answers);
            });
          });
        } else {
          qDiv.innerHTML = `
            <div class="fb-edit-row">
              <input class="input fb-edit-input" value="${qText}" />
              <button class="small-btn danger" type="button" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;

          const input = qDiv.querySelector(".fb-edit-input");
          const del = qDiv.querySelector(".small-btn.danger");

          input.addEventListener("input", () => {
            questions[secIndex].questions[qIndex] = input.value;
          });

          del.addEventListener("click", () => {
            if (!confirm("Delete this question?")) return;
            questions[secIndex].questions.splice(qIndex, 1);
            saveFeedbackQuestions(questions);
            render();
          });
        }

        body.appendChild(qDiv);
      });

      if (editOn) {
        const actions = document.createElement("div");
        actions.className = "fb-edit-actions";
        actions.innerHTML = `
          <button class="small-btn" type="button">
            <i class="fa-solid fa-plus"></i> Add Question
          </button>
          <button class="small-btn primary" type="button">
            <i class="fa-solid fa-floppy-disk"></i> Save Changes
          </button>
        `;

        const [btnAdd, btnSave] = actions.querySelectorAll("button");

        btnAdd.addEventListener("click", () => {
          questions[secIndex].questions.push("New question...");
          saveFeedbackQuestions(questions);
          render();
        });

        btnSave.addEventListener("click", () => {
          saveFeedbackQuestions(questions);
          toast("Saved successfully ✅");
        });

        body.appendChild(actions);
      }

      wrap.appendChild(box);
    });

    // ✅ IMPORTANT: We removed “open first section automatically”
    // So everything stays collapsed after refresh.
  }

  toggle?.addEventListener("change", render);
  render();
}

  /* =========================
     PDF (FULL: attendance + parent feedback)
  ========================= */
  let watermarkDataUrl = null;

  async function loadWatermark() {
    if (watermarkDataUrl) return watermarkDataUrl;
    try {
      const r = await fetch(WATERMARK_SRC);
      if (!r.ok) return null;
      const blob = await r.blob();

      watermarkDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      return watermarkDataUrl;
    } catch (e) {
      return null;
    }
  }

  function badgeForStatus(status) {
    const t = (status || "").toLowerCase();
    if (t.includes("excellent")) return { fill: [225, 245, 231], text: [31, 122, 60] };
    if (t.includes("good")) return { fill: [232, 244, 253], text: [35, 102, 153] };
    if (t.includes("satisfactory")) return { fill: [255, 245, 230], text: [163, 102, 24] };
    if (t.includes("needs")) return { fill: [255, 230, 230], text: [153, 45, 45] };
    return { fill: [242, 245, 248], text: [85, 95, 105] };
  }

  async function generatePDF() {
    const check = validateBeforePDF_UI();
    if (!check.ok) {
      toast("Please fix the highlighted fields.");
      check.firstBad?.scrollIntoView({ behavior: "smooth", block: "center" });
      check.firstBad?.focus?.();
      return;
    }

    if (!window.jspdf?.jsPDF) {
      alert("jsPDF not loaded. Refresh the page.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    if (typeof doc.autoTable !== "function") {
      alert("AutoTable not loaded. Refresh the page.");
      return;
    }

    const wm = await loadWatermark();

    const THEME = {
      navy: [18, 43, 69],
      navy2: [30, 61, 94],
      teal: [45, 156, 156],
      tealSoft: [230, 250, 248],
      soft: [247, 250, 252],
      line: [226, 236, 244],
      text: [25, 32, 40],
      muted: [105, 120, 135],
      white: [255, 255, 255],
    };

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 14;
    const marginR = 14;
    const nowStr = new Date().toLocaleString();

    const safe = (x) => (x && String(x).trim() ? String(x).trim() : "N/A");

    function addHeader() {
      doc.setFillColor(...THEME.navy);
      doc.rect(0, 0, pageW, 26, "F");
      doc.setFillColor(...THEME.teal);
      doc.rect(0, 26, pageW, 2.2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Iqra Virtual School (Qur'an Department)", pageW / 2, 11, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(235, 245, 255);
      doc.text("Student Progress Report", pageW / 2, 18.5, { align: "center" });
    }

    function addFooter(pageNo, totalPages) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...THEME.muted);
      doc.text("© 2026 Iqra Virtual School. All Rights Reserved.", marginL, pageH - 9);
      doc.text(`Generated: ${nowStr}`, marginL, pageH - 5);
      doc.text(`Page ${pageNo} of ${totalPages}`, pageW - marginR, pageH - 7, { align: "right" });
    }

    function addWatermark() {
      if (!wm) return;
      const wmW = pageW * 0.62;
      const wmH = wmW;
      const x = (pageW - wmW) / 2;
      const y = (pageH - wmH) / 2 + 8;

      if (doc.GState && doc.setGState) {
        doc.saveGraphicsState();
        const g = new doc.GState({ opacity: 0.04 });
        doc.setGState(g);
        doc.addImage(wm, "JPEG", x, y, wmW, wmH, undefined, "FAST");
        doc.restoreGraphicsState();
      } else {
        doc.addImage(wm, "JPEG", x, y, wmW, wmH);
      }
    }

    function ensureSpace(need, y) {
      if (y + need > pageH - 18) {
        doc.addPage();
        addHeader();
        return 36;
      }
      return y;
    }

    function sectionTitle(title, y) {
      y = ensureSpace(16, y);

      doc.setFillColor(...THEME.tealSoft);
      doc.setDrawColor(...THEME.line);
      doc.setLineWidth(0.25);
      doc.roundedRect(marginL, y - 4.5, pageW - marginL - marginR, 11, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...THEME.navy);
      doc.text(title, marginL + 6, y + 2.8);

      doc.setFillColor(...THEME.teal);
      doc.circle(marginL + 3.2, y + 0.8, 1.3, "F");

      return y + 14;
    }

    // Start PDF
    addHeader();
    let y = 36;

    // Student info
    const studentName = v("studentName");
    const teacherName = v("teacherName");
    const meetingDate = v("meetingDate");
    const classTimeFrom = v("classTimeFrom");
    const classTimeTo = v("classTimeTo");
    const reportMonthFrom = v("reportMonthFrom");
    const reportYearFrom = v("reportYearFrom");
    const reportMonthTo = v("reportMonthTo");
    const reportYearTo = v("reportYearTo");

    const duration =
      reportMonthFrom && reportYearFrom && reportMonthTo && reportYearTo
        ? `${reportMonthFrom} ${reportYearFrom} to ${reportMonthTo} ${reportYearTo}`
        : "N/A";

    y = ensureSpace(44, y);
    doc.setDrawColor(...THEME.line);
    doc.setFillColor(...THEME.white);
    doc.roundedRect(marginL, y, pageW - marginL - marginR, 34, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...THEME.navy);
    doc.text("Student & Class Information", marginL + 6, y + 8);

    doc.setDrawColor(...THEME.line);
    doc.line(marginL + 6, y + 10.5, pageW - marginR - 6, y + 10.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.navy2);
    doc.text("Student:", marginL + 6, y + 18);
    doc.text("Teacher:", marginL + 100, y + 18);
    doc.text("Duration:", marginL + 6, y + 26);
    doc.text("Timing:", marginL + 100, y + 26);
    doc.text("Meeting:", marginL + 6, y + 32);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.text);
    doc.text(safe(studentName), marginL + 36, y + 18);
    doc.text(safe(teacherName), marginL + 130, y + 18);
    doc.text(safe(duration), marginL + 36, y + 26);
    doc.text(safe(classTimeFrom && classTimeTo ? `${classTimeFrom} - ${classTimeTo}` : ""), marginL + 130, y + 26);
    doc.text(safe(meetingDate), marginL + 36, y + 32);

    y += 44;

    // Progress Summary
    y = sectionTitle("Progress Summary", y);

    const subjects = [];
    document.querySelectorAll("#subjectsTable tbody tr").forEach((tr) => {
      const sel = tr.querySelector(".subject");
      const other = tr.querySelector(".subject-other");
      let subject = (sel?.value || "").trim();
      if (subject.toLowerCase() === "other") subject = (other?.value || "Other").trim();

      const topics =
        (tr.querySelector(".topics-value")?.value || "").trim() ||
        (tr.querySelector(".topics")?.value || "").trim();

      const status = (tr.querySelector(".progress")?.value || "").trim();
      const remarks = (tr.querySelector(".remarks")?.value || "").trim();

      if (subject || topics || status || remarks) subjects.push([subject || "—", topics || "—", status || "—", remarks || "—"]);
    });
    if (!subjects.length) subjects.push(["—", "—", "—", "—"]);

    const tableW = pageW - marginL - marginR;
    const col0 = 32, col1 = 60, col2 = 35, col3 = tableW - col0 - col1 - col2;

    doc.autoTable({
      startY: y,
      head: [["Subject", "Topics Covered", "Status", "Remarks"]],
      body: subjects,
      theme: "grid",
      margin: { left: marginL, right: marginR },
      tableWidth: tableW,
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        cellWidth: "wrap",
        valign: "top",
        lineWidth: 0.2,
        lineColor: THEME.line,
        textColor: THEME.text,
      },
      headStyles: { fillColor: THEME.teal, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: THEME.soft },
      columnStyles: {
        0: { cellWidth: col0 },
        1: { cellWidth: col1 },
        2: { cellWidth: col2, halign: "center", valign: "middle" },
        3: { cellWidth: col3 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) data.cell.text = [""];
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const text = String(data.cell.raw || "").trim() || "—";
          const box = badgeForStatus(text);

          const pad = 1.2;
          const bx = data.cell.x + pad;
          const by = data.cell.y + pad;
          const bw = data.cell.width - pad * 2;
          const bh = data.cell.height - pad * 2;

          doc.setFillColor(...box.fill);
          doc.roundedRect(bx, by, bw, bh, 2.5, 2.5, "F");

          doc.setTextColor(...box.text);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text(text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
            align: "center",
            baseline: "middle",
          });

          doc.setTextColor(...THEME.text);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }
      },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ✅ Attendance & Behavior (ALWAYS included)
    y = sectionTitle("Attendance & Behavior Assessment", y);

    const attendance = v("attendance");
    const classParticipation = v("classParticipation");
    const homeworkSubmission = v("homeworkSubmission");
    const mannersRespect = v("mannersRespect");

// ✅ Attendance bar (clean + clear + modern)
y = ensureSpace(24, y);

doc.setFont("helvetica", "bold");
doc.setFontSize(9.5);
doc.setTextColor(...THEME.navy2);
doc.text("Attendance", marginL + 1, y);

// value
const hasAttendance = (attendance || "").trim() !== "";
const pct = hasAttendance ? Math.max(0, Math.min(100, parseInt(attendance, 10))) : null;

// layout
const barX = marginL + 28;
const barY = y - 5.8;              // aligns nicely with the label line
const barW = pageW - marginL - marginR - 28;
const barH = 8;                     // slightly taller but crisp

// --- Track (very clean) ---
doc.setFillColor(246, 248, 251);    // light track (almost white)
doc.setDrawColor(210, 222, 232);    // clear border
doc.setLineWidth(0.45);
doc.roundedRect(barX, barY, barW, barH, 4, 4, "FD");

// --- Fill ---
if (pct !== null) {
  const innerPad = 0.9;            // keeps fill inside border = crisp
  const innerX = barX + innerPad;
  const innerY = barY + innerPad;
  const innerW = barW - innerPad * 2;
  const innerH = barH - innerPad * 2;

  const fillW = Math.max(1.5, (innerW * pct) / 100);

  // subtle shadow under fill (fake but looks nice)
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.setFillColor(...THEME.teal);
  doc.roundedRect(innerX, innerY + 0.4, fillW, innerH, 3.2, 3.2, "F");
  doc.restoreGraphicsState();

  // main fill (solid, clean)
  doc.setFillColor(...THEME.teal);
  doc.roundedRect(innerX, innerY, fillW, innerH, 3.2, 3.2, "F");

  // glossy highlight strip (makes it feel “premium”)
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.20 }));
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(innerX + 0.8, innerY + 0.7, Math.max(0, fillW - 1.6), 2.2, 2, 2, "F");
  doc.restoreGraphicsState();

  // small end dot (nice finishing touch)
  const dotX = innerX + fillW;
  const dotY = innerY + innerH / 2;
  doc.setFillColor(255, 255, 255);
  doc.circle(Math.min(dotX, innerX + innerW) - 1.2, dotY, 0.8, "F");
}

// --- % INSIDE the pill bar (no outside badge) ---
const label = pct === null ? "N/A" : `${pct}%`;

// size of the little inner chip (auto width)
doc.setFont("helvetica", "bold");
doc.setFontSize(9);

const textW = doc.getTextWidth(label);
const chipPadX = 4;
const chipW = textW + chipPadX * 2;
const chipH = 6.6;

// place it inside the bar on the right side
const chipX = barX + barW - chipW - 1.4;      // inside border
const chipY = barY + (barH - chipH) / 2;      // vertically centered

// soft glass chip inside the bar (looks premium, not a separate badge)
doc.saveGraphicsState();
doc.setGState(new doc.GState({ opacity: 0.55 }));
doc.setFillColor(255, 255, 255);
doc.roundedRect(chipX, chipY, chipW, chipH, 3.3, 3.3, "F");
doc.restoreGraphicsState();

// text on top of the chip
doc.setTextColor(...THEME.navy);
doc.text(label, chipX + chipW / 2, chipY + chipH / 2 + 0.2, {
  align: "center",
  baseline: "middle"
});

y += 10;

    doc.autoTable({
      startY: y,
      head: [["Assessment", "Rating / Status"]],
      body: [
        ["Class Participation", safe(classParticipation)],
        ["Homework Submission", safe(homeworkSubmission)],
        ["Manners & Respect", safe(mannersRespect)],
      ],
      theme: "grid",
      margin: { left: marginL, right: marginR },
      tableWidth: tableW,
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        overflow: "linebreak",
        cellWidth: "wrap",
        lineWidth: 0.2,
        lineColor: THEME.line,
        textColor: THEME.text,
      },
      headStyles: { fillColor: THEME.teal, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: THEME.soft },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: tableW - 60 } },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ✅ Parent Comments (textarea) included if filled
    const parentComments = v("parentFeedback");
    if (parentComments) {
      y = sectionTitle("Additional Parent Comments", y);

      y = ensureSpace(30, y);
      doc.setDrawColor(...THEME.line);
      doc.setFillColor(...THEME.white);
      doc.roundedRect(marginL, y, pageW - marginL - marginR, 26, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.text);
      const lines = doc.splitTextToSize(parentComments, pageW - marginL - marginR - 10);
      doc.text(lines, marginL + 5, y + 8);

      y += 34;
    }

    // ✅ Parent Feedback Questionnaire (ONLY answered questions)
try {
  const qs = loadFeedbackQuestions();
  const ans = loadFeedbackAnswers();

  const feedbackRows = [];

  qs.forEach((sec) => {
    (sec.questions || []).forEach((qText, i) => {
      const key = `${sec.id}__${i}`;
      const a = (ans[key] || "").trim();

      // ✅ If not answered, skip it (do not show in PDF)
      if (!a) return;

      feedbackRows.push([sec.title || "Section", qText || "", a]);
    });
  });

  // ✅ If NOTHING answered, do not show this section at all
  if (feedbackRows.length) {
    y = sectionTitle("Parent Feedback Questionnaire", y);

    doc.autoTable({
      startY: y,
      head: [["Category", "Question", "Rating"]],
      body: feedbackRows,
      theme: "grid",
      margin: { left: marginL, right: marginR },
      tableWidth: tableW,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        cellWidth: "wrap",
        valign: "top",
        lineWidth: 0.2,
        lineColor: THEME.line,
        textColor: THEME.text,
      },
      headStyles: { fillColor: THEME.teal, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: THEME.soft },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 115 },
        2: { cellWidth: 22 },
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }
} catch (e) {
  // If anything goes wrong, silently skip feedback in PDF
  console.warn("Feedback PDF skipped:", e);
}


    // Next Plan
    y = sectionTitle("Next 1-Month Target Plan", y);

    const plans = [];
    document.querySelectorAll("#nextPlanTable tbody tr").forEach((tr) => {
      const sel = tr.querySelector(".plan-subject");
      const other = tr.querySelector(".plan-subject-other");
      let subject = (sel?.value || "").trim();
      if (subject.toLowerCase() === "other") subject = (other?.value || "Other").trim();

      const topics = (tr.querySelector(".plan-topics")?.value || "").trim();
      const dl = (tr.querySelector(".plan-deadline")?.value || "").trim();

      if (subject || topics || dl) plans.push([subject || "—", topics || "—", dl || "—"]);
    });

    if (!plans.length) plans.push(["No plan added.", "—", "—"]);

    doc.autoTable({
      startY: y,
      head: [["Subject Area", "Upcoming Topics / Skills", "Target Deadline"]],
      body: plans,
      theme: "grid",
      margin: { left: marginL, right: marginR },
      tableWidth: tableW,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
        cellWidth: "wrap",
        lineWidth: 0.2,
        lineColor: THEME.line,
        textColor: THEME.text,
      },
      headStyles: { fillColor: THEME.teal, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: THEME.soft },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 105 }, 2: { cellWidth: 33 } },
    });

    // Watermark + footer all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addWatermark();
      addFooter(i, totalPages);
    }

    const filename = `Student_Progress_Report_${(studentName || "Student").replace(/\s+/g, "_")}.pdf`;
    doc.save(filename);
// ✅ Clear saved draft + feedback answers so refresh doesn't restore anything
if (window.clearDraft) window.clearDraft();
localStorage.removeItem("iqra_feedback_answers_v1");

// ✅ Collapse feedback UI before refresh (we’ll add this function in step 2)
if (window.collapseFeedbackUI) window.collapseFeedbackUI();

// ✅ Refresh ONLY after successful save (no refresh if PDF fails)
setTimeout(() => window.location.reload(), 700);

  }

  /* =========================
     INIT on page load
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    // Set meeting date to today
    const today = new Date().toISOString().split("T")[0];
    if ($("meetingDate")) $("meetingDate").value = today;

    // Fill years
    const yFrom = $("reportYearFrom");
    const yTo = $("reportYearTo");
    if (yFrom && yTo) {
      const currentYear = new Date().getFullYear();
      const start = currentYear - 1;
      const end = currentYear + 10;

      yFrom.innerHTML = `<option value="">From Year</option>`;
      yTo.innerHTML = `<option value="">To Year</option>`;

      for (let y = start; y <= end; y++) {
        const o1 = document.createElement("option");
        o1.value = y; o1.textContent = y;

        const o2 = document.createElement("option");
        o2.value = y; o2.textContent = y;

        if (y === currentYear) { o1.selected = true; o2.selected = true; }

        yFrom.appendChild(o1);
        yTo.appendChild(o2);
      }
    }
    // Auto select current month (so duration warning doesn't show incorrectly)
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const cm = monthNames[new Date().getMonth()];
    if ($("reportMonthFrom") && !$("reportMonthFrom").value) $("reportMonthFrom").value = cm;
    if ($("reportMonthTo") && !$("reportMonthTo").value) $("reportMonthTo").value = cm;

    subjectsTbody = document.querySelector("#subjectsTable tbody");
    planTbody = document.querySelector("#nextPlanTable tbody");

    // Add first rows
    addSubjectRow();
    addPlanRow();

    // Buttons
    $("addSubjectBtn")?.addEventListener("click", addSubjectRow);
    $("addPlanBtn")?.addEventListener("click", addPlanRow);
    $("autoRemarkBtn")?.addEventListener("click", autoRemarks);
    $("generateBtn")?.addEventListener("click", generatePDF);

    enableLiveValidationClear();
    initFeedbackUI();
  });
})();

