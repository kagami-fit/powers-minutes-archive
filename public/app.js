const state = {
  records: [],
  selectedId: null,
};

const els = {
  archiveList: document.querySelector("#archiveList"),
  detailPane: document.querySelector("#detailPane"),
  refreshButton: document.querySelector("#refreshButton"),
  imageLightbox: document.querySelector("#imageLightbox"),
  lightboxImage: document.querySelector("#lightboxImage"),
  lightboxClose: document.querySelector("#lightboxClose"),
};

await init();

async function init() {
  els.refreshButton.addEventListener("click", () => loadRecords());
  els.detailPane.addEventListener("click", handleDetailClick);
  els.imageLightbox.addEventListener("click", handleLightboxClick);
  els.lightboxClose.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", handleDocumentKeydown);
  await loadRecords();
}

async function loadRecords() {
  state.records = await fetchRecords();
  renderArchive();

  if (!state.records.length) {
    renderEmpty();
    return;
  }

  const selectedStillExists = state.records.some((record) => record.id === state.selectedId);
  await selectRecord(selectedStillExists ? state.selectedId : state.records[0].id, { keepScroll: true });
}

async function fetchRecords() {
  const response = await fetch(`./records.json?v=${Date.now()}`);
  if (response.ok) {
    const records = await response.json();
    return normalizeRecords(records);
  }

  const fallback = await fetch("./api/records");
  if (!fallback.ok) return [];
  return normalizeRecords(await fallback.json());
}

function normalizeRecords(records) {
  return [...(records || [])].sort((a, b) => {
    const left = `${b.meetingDate || ""}${b.createdAt || ""}`;
    const right = `${a.meetingDate || ""}${a.createdAt || ""}`;
    return left.localeCompare(right);
  });
}

async function selectRecord(id, options = {}) {
  state.selectedId = id;
  renderArchive();
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    renderEmpty();
    return;
  }

  renderDetail(record);
  if (!options.keepScroll) {
    els.detailPane.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderArchive() {
  if (!state.records.length) {
    els.archiveList.innerHTML = `<div class="date-heading">まだ公開済みの議事録がありません</div>`;
    return;
  }

  const groups = groupByDate(state.records);
  els.archiveList.innerHTML = Object.entries(groups)
    .map(([date, records]) => {
      const buttons = records
        .map(
          (record) => `
          <button class="record-button ${record.id === state.selectedId ? "active" : ""}" type="button" data-id="${escapeHtml(record.id)}">
            <span class="record-title">${escapeHtml(record.title)}</span>
            <span class="record-meta">
              <span class="status-dot"></span>
              ${escapeHtml(record.category || "議事録")}
              ${record.participants?.length ? ` / ${escapeHtml(record.participants.join(", "))}` : ""}
            </span>
          </button>`
        )
        .join("");
      return `<div class="date-group"><div class="date-heading">${escapeHtml(formatDate(date))}</div>${buttons}</div>`;
    })
    .join("");

  els.archiveList.querySelectorAll(".record-button").forEach((button) => {
    button.addEventListener("click", () => selectRecord(button.dataset.id));
  });
}

function renderDetail(record) {
  const minutes = record.minutes || {};
  els.detailPane.classList.remove("empty-state");
  els.detailPane.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(record.category || "Meeting Minutes")}</p>
        <h2>${escapeHtml(record.title)}</h2>
        <div class="detail-meta">
          <span class="pill">${escapeHtml(formatDate(record.meetingDate))}</span>
          ${record.participants?.length ? `<span class="pill">${escapeHtml(record.participants.join(" / "))}</span>` : ""}
          ${record.location ? `<span class="pill">${escapeHtml(record.location)}</span>` : ""}
        </div>
      </div>
      ${record.notes ? `<p class="lead">${escapeHtml(record.notes)}</p>` : ""}
    </div>
    <div class="detail-body">
      ${diagramSection(record)}
      <div class="insight-grid">
        ${listPanel("要約", minutes.summary)}
        ${listPanel("議題", minutes.agenda)}
        ${listPanel("決定事項", minutes.decisions)}
        ${actionPanel(minutes.actionItems)}
        ${listPanel("課題・懸念", minutes.risks)}
        ${listPanel("次回までに", minutes.nextSteps)}
      </div>
      ${transcriptSection(record.transcriptText)}
    </div>
  `;
}

function listPanel(title, items = []) {
  const body = (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <section class="insight-panel">
      <h3>${escapeHtml(title)}</h3>
      <ul>${body || "<li>未記載</li>"}</ul>
    </section>
  `;
}

function actionPanel(items = []) {
  const rows = (items || [])
    .map(
      (item) => `
      <tr>
        <td data-label="担当">${escapeHtml(item.owner || "未設定")}</td>
        <td data-label="タスク">${escapeHtml(item.task || "")}</td>
        <td data-label="期限">${escapeHtml(item.due || "未設定")}</td>
      </tr>`
    )
    .join("");
  return `
    <section class="insight-panel">
      <h3>アクション</h3>
      <table class="action-table">
        <thead><tr><th>担当</th><th>タスク</th><th>期限</th></tr></thead>
        <tbody>${rows || `<tr><td data-label="担当">未設定</td><td data-label="タスク">未記載</td><td data-label="期限">未設定</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function diagramSection(record) {
  if (!record.diagramUrl) return "";
  const url = `${assetUrl(record.diagramUrl)}?v=${encodeURIComponent(record.updatedAt || "")}`;
  return `
    <section class="diagram-section">
      <div class="section-heading">
        <h3>図解画像</h3>
        ${record.diagramCaption ? `<p>${escapeHtml(record.diagramCaption)}</p>` : ""}
      </div>
      <div class="diagram-frame">
        <button class="diagram-zoom-button" type="button" data-lightbox-src="${escapeHtml(url)}" data-lightbox-alt="${escapeHtml(record.title)}の図解" aria-label="${escapeHtml(record.title)}の図解を拡大">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(record.title)}の図解" />
        </button>
      </div>
    </section>
  `;
}

function handleDetailClick(event) {
  const button = event.target.closest("[data-lightbox-src]");
  if (!button) return;
  openLightbox(button.dataset.lightboxSrc, button.dataset.lightboxAlt || "");
}

function openLightbox(src, alt) {
  els.lightboxImage.src = src;
  els.lightboxImage.alt = alt;
  els.imageLightbox.hidden = false;
  els.imageLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  els.lightboxClose.focus();
}

function closeLightbox() {
  els.imageLightbox.hidden = true;
  els.imageLightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  els.lightboxImage.removeAttribute("src");
}

function handleLightboxClick(event) {
  if (event.target.closest("[data-lightbox-close]")) {
    closeLightbox();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && !els.imageLightbox.hidden) {
    closeLightbox();
  }
}

function assetUrl(value) {
  const url = String(value || "");
  return url.startsWith("/") ? `.${url}` : url;
}

function transcriptSection(text) {
  if (!text) return "";
  return `
    <details class="transcript-section">
      <summary>文字起こし</summary>
      <div class="transcript-text">${escapeHtml(text)}</div>
    </details>
  `;
}

function renderEmpty() {
  els.detailPane.classList.add("empty-state");
  els.detailPane.innerHTML = `
    <div class="empty-copy">
      <h2>議事録を選択</h2>
      <p>日付別アーカイブから選ぶと、要約・決定事項・アクション・図解を表示します。</p>
    </div>
  `;
}

function groupByDate(records) {
  return records.reduce((groups, record) => {
    const date = record.meetingDate || "日付未設定";
    groups[date] ||= [];
    groups[date].push(record);
    return groups;
  }, {});
}

function formatDate(date) {
  if (!date || date === "日付未設定") return "日付未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
