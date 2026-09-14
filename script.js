const page = document.body.dataset.page;
const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const setHtml = (el, html) => { if (el) el.innerHTML = html; };
const reportPageError = (error) => {
  console.error("TECHLAB: page render failed", error);
  showToast("Unable to load this page. Please refresh and try again.", "error");
};
const refreshPage = () => {
  initPage().catch(reportPageError);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  mountThemeToggle();
};
const refreshIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };
const themeStorageKey = "techlab_theme";
const themeModeKey = "techlab_theme_mode";

let appLatestCache = null;
const getAppLatest = async () => {
  if (appLatestCache === null) {
    try {
      const res = await fetch("/api/app/latest");
      appLatestCache = (await res.json()) || {};
    } catch {
      appLatestCache = {};
    }
  }
  return appLatestCache;
};
const isAppAvailable = async () => !!(await getAppLatest()).available;
const appDownloadMarkup = async (cls = "") => {
  const latest = await getAppLatest();
  if (!latest.available) return "";
  const ver = latest.version ? ` (v${latest.version})` : "";
  const builtAt = latest.builtAt ? `built ${new Date(latest.builtAt).toLocaleString()}` : "the latest TECHLAB Android app";
  return `<a class="${cls}" href="/api/app/download" title="Download ${builtAt}"><i data-lucide="smartphone" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Download App${ver}</a>`;
};

const showToast = (message, type = "info") => {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = "position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:6px;font-size:14px;z-index:9999;animation:slideIn .3s ease;max-width:300px;word-wrap:break-word";
  const colors = { info: "#3b82f6", success: "#22c55e", error: "#ef4444", warning: "#f59e0b" };
  toast.style.background = colors[type] || colors.info;
  toast.style.color = "#fff";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};
const toast = showToast;

// Ask whether the supplier was paid an advance at PO receive time.
// Returns { advanceAmount, advanceMode, advanceDate } or null if cancelled.
const promptAdvancePayment = () => {
  const amountStr = prompt("Advance paid to supplier? Enter amount, or 0 for none:", "0");
  if (amountStr === null) return null;
  const amount = Number(amountStr);
  if (!(amount > 0)) return { advanceAmount: 0, advanceMode: "Cash", advanceDate: new Date().toISOString().slice(0, 10) };
  const mode = prompt("Payment mode (Cash / UPI / Bank / Other):", "Cash") || "Cash";
  const date = prompt("Advance date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10)) || new Date().toISOString().slice(0, 10);
  return { advanceAmount: amount, advanceMode: mode.trim(), advanceDate: date };
};

const setLoading = (element, loading = true) => {
  if (!element) return;
  if (loading) {
    element.dataset.originalText = element.textContent;
    element.dataset.originalDisabled = element.disabled;
    element.disabled = true;
    element.textContent = "Loading...";
  } else {
    element.textContent = element.dataset.originalText || element.textContent;
    element.disabled = element.dataset.originalDisabled === "true";
  }
};

const getStoredTheme = () => localStorage.getItem(themeStorageKey) || "light";
const getStoredMode = () => localStorage.getItem(themeModeKey) || "auto";
const setStoredMode = (mode) => localStorage.setItem(themeModeKey, mode);
const getAutoTheme = () => {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 6) ? "dark" : "light";
};
const resolveInitialTheme = () => {
  return getStoredMode() === "manual" ? getStoredTheme() : getAutoTheme();
};
const applyTheme = (theme) => {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(themeStorageKey, theme);
};

const publicPages = ["home", "products", "services", "login"];

console.log("TECHLAB: Script loaded, page =", page);

window.addEventListener("error", (e) => {
  console.log("TECHLAB: JavaScript error:", e.message, e.filename);
});

if (!publicPages.includes(page)) {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted || (event.timeStamp && event.timeStamp > 0 && performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
      fetch("/api/me", { credentials: "include" })
        .then((res) => {
          if (!res.ok) setTimeout(() => { window.location.href = "login.html"; }, 0);
        })
        .catch(() => setTimeout(() => { window.location.href = "login.html"; }, 0));
    }
  });
}

const formatCurrency = (value) => `Rs. ${Number(value).toLocaleString("en-IN")}`;

const parseRequestedParts = (raw) => {
  if (!raw) return { inventory: [], procurement: "" };
  try {
    const o = JSON.parse(raw);
    if (o && Array.isArray(o.inventory)) {
      return { inventory: o.inventory, procurement: String(o.procurement || "") };
    }
  } catch (e) {}
  return { inventory: [], procurement: String(raw).trim() };
};

const formatRequestedParts = (raw) => {
  const p = parseRequestedParts(raw);
  const parts = [];
  if (p.inventory.length) parts.push(p.inventory.map((i) => `${Number(i.qty) || 1}x ${i.name}`).join(", "));
  if (p.procurement) parts.push("Not in stock: " + p.procurement);
  return parts.join(" | ");
};

const formatProductPrice = (product) => formatCurrency(product.finalPrice ?? product.price);
const formatRoleLabel = (role) => role === "employee" ? "Service Coordinator" : role === "technician" ? "Service Technician" : String(role).charAt(0).toUpperCase() + String(role).slice(1);
const getRequestSubjectLabel = (type) => {
  if (type === "owned-product") return "Owned Product";
  if (type === "wanted-product") return "Wanted Product";
  if (type === "wanted-service") return "Wanted Service";
  return "General Support";
};

const getRequestSubjectTone = (type) => {
  if (type === "owned-product") return "success";
  if (type === "wanted-product") return "info";
  if (type === "wanted-service") return "warning";
  return "danger";
};

const formatRequestSubject = (request) => {
  const label = getRequestSubjectLabel(request.request_subject_type);
  return request.request_subject_name
    ? `${escapeHtml(request.request_subject_name)} (${label})`
    : label;
};

const renderSurveyView = (survey, containerId, interactive = false, requestId = '', requestedPartsRaw = '') => {
  const container = document.getElementById(containerId);
  if (!container) return;

  let cameras = [];
  let cables = [];
  let mounting = {};
  let additionalParts = [];
  let nvrDvr = {};
  let photos = [];
  try { cameras = JSON.parse(survey.cameras || '[]'); } catch (e) {}
  try { cables = JSON.parse(survey.cables || '[]'); } catch (e) {}
  try { mounting = JSON.parse(survey.mounting || '{}'); } catch (e) {}
  try { additionalParts = JSON.parse(survey.additional_parts || '[]'); } catch (e) {}
  try { nvrDvr = JSON.parse(survey.nvr_dvr || '{}'); } catch (e) {}
  try { photos = JSON.parse(survey.photos || '[]'); } catch (e) {}

  let html = `<div class="survey-view">`;

  if (survey.is_existing_installation) {
    html += `<div class="survey-view-section"><h4>Existing Installation</h4>`;
    if (survey.existing_setup_notes) html += `<p><strong>Setup Notes:</strong> ${escapeHtml(survey.existing_setup_notes)}</p>`;
    if (survey.work_needed) html += `<p><strong>Work Needed:</strong> ${escapeHtml(survey.work_needed)}</p>`;
    html += `</div>`;
  }

  if (cameras.length) {
    html += `<div class="survey-view-section"><h4>Cameras (${survey.camera_count || cameras.reduce((s, c) => s + (c.count || 1), 0)} total)</h4>`;
    cameras.forEach(c => {
      const label = escapeHtml(c.formFactor || c.type || 'Camera');
      const tech = c.technology ? ` (${escapeHtml(c.technology)})` : '';
      html += `<div class="survey-view-item">${c.count || 1}x ${label}${tech} ${escapeHtml(c.resolution || '')} ${c.mounting ? '@ ' + escapeHtml(c.mounting) : ''}</div>`;
    });
    html += `</div>`;
  }

  if (nvrDvr.needed) {
    html += `<div class="survey-view-section"><h4>${escapeHtml(nvrDvr.type || 'NVR/DVR')}</h4>`;
    html += `<div class="survey-view-item">${escapeHtml(nvrDvr.channels || '-')} channels ${nvrDvr.brand ? '- ' + escapeHtml(nvrDvr.brand) : ''}</div>`;
    if (nvrDvr.power) {
      const powerLabel = nvrDvr.power.type === 'PoE' ? 'PoE Switch' : nvrDvr.power.type === 'SMPS' ? 'SMPS Power Supply' : escapeHtml(nvrDvr.power.type);
      html += `<div class="survey-view-item">${powerLabel} - ${escapeHtml(nvrDvr.power.channels || '-')} channels ${nvrDvr.power.brand ? '- ' + escapeHtml(nvrDvr.power.brand) : ''}</div>`;
    }
    html += `</div>`;
  }

  if (cables.length) {
    html += `<div class="survey-view-section"><h4>Cables</h4>`;
    cables.forEach((c, i) => {
      const cableType = escapeHtml(c.type);
      const boxInfo = (c.type === 'Cat6' || c.type === 'Cat6a') && c.boxes ? ` (${c.boxes} box${c.boxes > 1 ? 'es' : ''})` : '';
      const mtrsInfo = (c.type === 'Power Cable' || c.type === 'HDMI') && c.meters ? ` (${c.meters} mtrs)` : '';
      if (interactive) {
        html += `<div class="survey-view-item" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span>${cableType}${boxInfo}${mtrsInfo}</span>
          <label style="font-size:12px; white-space:nowrap;">Actual used (m): <input type="number" name="actual_meters[]" data-cable-index="${i}" min="0" class="survey-input-quarter" placeholder="0" style="width:70px;" /></label>
        </div>`;
      } else {
        const actualInfo = c.actual_meters != null ? ` | Used: ${c.actual_meters}m` : '';
        html += `<div class="survey-view-item">${cableType}${boxInfo}${mtrsInfo}${actualInfo}</div>`;
      }
    });
    html += `</div>`;
  }

  const mountItems = [];
  if (mounting.brackets) mountItems.push(`${mounting.brackets} brackets`);
  if (mounting.poles) mountItems.push(`${mounting.poles} poles`);
  if (mounting.boxes) mountItems.push(`${mounting.boxes} camera boxes`);
  if (mounting.other) mountItems.push(escapeHtml(mounting.other));
  if (mountItems.length) {
    html += `<div class="survey-view-section"><h4>Mounting Hardware</h4>`;
    html += `<div class="survey-view-item">${mountItems.join(', ')}</div>`;
    html += `</div>`;
  }

  if (additionalParts.length) {
    html += `<div class="survey-view-section"><h4>Additional Parts</h4>`;
    additionalParts.forEach(p => {
      html += `<div class="survey-view-item">${p.qty || 1}x ${escapeHtml(p.name)} ${p.notes ? '(' + escapeHtml(p.notes) + ')' : ''}</div>`;
    });
    html += `</div>`;
  }

  if (photos.length) {
    html += `<div class="survey-view-section"><h4>Photos</h4><div class="survey-photo-grid">`;
    photos.forEach(p => {
      html += `<div class="survey-photo-thumb"><img src="${escapeHtml(p)}" alt="Site photo" /></div>`;
    });
    html += `</div></div>`;
  }

  if (survey.notes) {
    html += `<div class="survey-view-section"><h4>Technician Notes</h4><p>${escapeHtml(survey.notes)}</p></div>`;
  }

  html += `<div class="survey-view-section"><h4>Submitted</h4><p>${survey.submitted_at ? new Date(survey.submitted_at).toLocaleString('en-IN') : '-'}</p></div>`;

  html += `<div style="margin-top:15px;">`;
  if (interactive) {
    html += `<button class="button button-primary" id="survey-job-complete-btn" data-request-id="${requestId}">Job Complete</button> `;
  }
  if (interactive) html += `<p id="survey-job-status" class="inline-status"></p>`;
  html += `</div>`;

  html += `</div>`;

  container.innerHTML = html;

  if (interactive) {
    const completeBtn = container.querySelector('#survey-job-complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        const statusEl = container.querySelector('#survey-job-status');
        const actualInputs = container.querySelectorAll('[name="actual_meters[]"]');
        const cableActuals = {};
        actualInputs.forEach(input => {
          cableActuals[input.dataset.cableIndex] = Number(input.value) || 0;
        });
        window.openUsedItemsModal(requestId, async (usedItems, conveyanceExpense) => {
          try {
            statusEl.textContent = 'Completing job...';
            await api(`/api/technician/service-requests/${requestId}/job-complete`, {
              method: 'POST',
              body: JSON.stringify({ actual_meter_usage: cableActuals, used_items: usedItems, conveyance_expense: conveyanceExpense }),
            });
            window.closeUsedItemsModal();
            statusEl.textContent = 'Job completed successfully!';
            setTimeout(() => refreshPage(), 1000);
          } catch (err) {
            statusEl.textContent = err.message;
          }
        }, requestedPartsRaw);
      });
    }
  }
};

const loadXlsxIfNeeded = async () => {
  if (typeof XLSX !== 'undefined') return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'xlsx.full.min.js';
    script.onload = () => {
      if (typeof XLSX !== 'undefined') { resolve(); }
      else { reject(new Error('Excel library failed to load. Check your network connection.')); }
    };
    script.onerror = () => reject(new Error('Could not download Excel library file. Place xlsx.full.min.js in the app folder.'));
    document.head.appendChild(script);
  });
};


const generateSurveyExcel = async (survey, requestId) => {
  await loadXlsxIfNeeded();

  let cameras = [], cables = [], mounting = {}, additionalParts = [], nvrDvr = {};
  try { cameras = JSON.parse(survey.cameras || '[]'); } catch (e) {}
  try { cables = JSON.parse(survey.cables || '[]'); } catch (e) {}
  try { mounting = JSON.parse(survey.mounting || '{}'); } catch (e) {}
  try { additionalParts = JSON.parse(survey.additional_parts || '[]'); } catch (e) {}
  try { nvrDvr = JSON.parse(survey.nvr_dvr || '{}'); } catch (e) {}

  let request = null;
  if (requestId) {
    try {
      const res = await api(`/api/sales/service-requests/${requestId}`);
      request = res.request || null;
    } catch (e) { /* context unavailable, report still generates */ }
  }

  const TOTAL = 6;
  const rows = [];
  const rowH = [];
  const merges = [];
  const push = (cells, hpt = 16) => {
    const line = [];
    for (let i = 0; i < TOTAL; i++) line.push(cells[i] == null ? '' : cells[i]);
    rows.push(line);
    rowH.push(hpt);
  };
  const merge = (r, c0, c1) => merges.push({ s: { r, c: c0 }, e: { r, c: c1 } });
  const banner = (text) => { const r = rows.length; push([text.toUpperCase()], 22); merge(r, 0, TOTAL - 1); };
  const kv = (label, value) => { const r = rows.length; push([label, value == null ? '' : String(value)], 18); merge(r, 1, TOTAL - 1); };
  const kvPair = (l1, v1, l2, v2) => push([l1, v1 == null ? '' : String(v1), '', l2, v2 == null ? '' : String(v2)], 18);
  const fullRow = (text) => { const r = rows.length; push([text == null ? '' : String(text)], 22); merge(r, 0, TOTAL - 1); };
  const blank = (hpt = 8) => push([], hpt);

  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };
  const fmtDay = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
  };
  const cableUnit = (type) => {
    if (type === 'Cat6' || type === 'Cat6a') return 'Box';
    if (type === 'Power Cable' || type === 'HDMI') return 'Mtrs';
    return '';
  };

  const shortId = requestId ? '#' + requestId.slice(-8) : '';
  const tech = request?.assigned_employee_name || request?.service_person || '';
  const visitDate = request?.scheduled_date || request?.preferred_date || '';

  const camTotal = cameras.reduce((s, c) => s + (Number(c.count) || 1), 0);
  const camSummary = cameras.length
    ? camTotal + ' total' + (cameras.map(c => `${c.count || 1}x ${c.formFactor || c.type || 'Camera'}`).join(', ') ? '  (' + cameras.map(c => `${c.count || 1}x ${c.formFactor || c.type || 'Camera'}`).join(', ') + ')' : '')
    : '';
  const cabSummary = cables.length
    ? cables.map(c => {
        const unit = cableUnit(c.type);
        return `${c.type}${unit === 'Box' && c.boxes ? ' ' + c.boxes + ' box' : unit === 'Mtrs' && c.meters ? ' ' + c.meters + ' mtrs' : ''}`;
      }).join(' | ')
    : '';
  const mItems = [];
  if (mounting.brackets) mItems.push(`${mounting.brackets} bracket${mounting.brackets > 1 ? 's' : ''}`);
  if (mounting.poles) mItems.push(`${mounting.poles} pole${mounting.poles > 1 ? 's' : ''}`);
  if (mounting.boxes) mItems.push(`${mounting.boxes} camera box${mounting.boxes > 1 ? 'es' : ''}`);
  if (mounting.other) mItems.push(String(mounting.other));
  const partsSummary = additionalParts.length ? additionalParts.map(p => `${p.qty || 1}x ${p.name || ''}`).join(' | ') : '';

  // ── Header ──
  const titleRow = rows.length;
  push(['SITE VISIT REPORT'], 42);
  merge(titleRow, 0, TOTAL - 1);
  const subRow = rows.length;
  push(['CCTV Installation Survey' + (shortId ? '   |   Ref: ' + shortId : '')], 18);
  merge(subRow, 0, TOTAL - 1);
  blank(10);

  // ── Prepared for ──
  banner('Prepared For');
  kvPair('Customer', request?.customer_name || '', 'Survey Date', fmt(survey.submitted_at));
  kvPair('Mobile', request?.customer_mobile || '', 'Technician', tech);
  kvPair('Requested', request?.request_subject_name || '', 'Visit Date', fmtDay(visitDate));
  if (request?.issue) fullRow('Reported Issue: ' + request.issue);
  blank(8);

  // ── 1. Requirements at a glance (boxed) ──
  const glanceLines = [];
  if (camSummary) glanceLines.push('Cameras'.padEnd(13) + ': ' + camSummary);
  if (nvrDvr.needed) glanceLines.push('Recorder'.padEnd(13) + ': ' + `${nvrDvr.channels || 0}ch ${nvrDvr.type || 'NVR/DVR'}${nvrDvr.brand ? ' - ' + nvrDvr.brand : ''}`);
  if (nvrDvr.power) glanceLines.push('Power Supply'.padEnd(13) + ': ' + `${nvrDvr.power.type || 'Power'} - ${nvrDvr.power.channels || 0}ch${nvrDvr.power.brand ? ' (' + nvrDvr.power.brand + ')' : ''}`);
  if (cabSummary) glanceLines.push('Cabling'.padEnd(13) + ': ' + cabSummary);
  if (mItems.length) glanceLines.push('Hardware'.padEnd(13) + ': ' + mItems.join(' | '));
  if (partsSummary) glanceLines.push('Parts'.padEnd(13) + ': ' + partsSummary);
  if (glanceLines.length) {
    const inner = ['1. REQUIREMENTS AT A GLANCE', ...glanceLines];
    const boxW = Math.max(60, Math.min(86, Math.max.apply(null, inner.map((s) => s.length)) + 4));
    const boxRow = (text) => { const r = rows.length; push([text], 18); merge(r, 0, TOTAL - 1); };
    boxRow('┌' + '─'.repeat(boxW) + '┐');
    boxRow('│' + ('  ' + inner[0]).padEnd(boxW) + '│');
    for (let i = 1; i < inner.length; i++) boxRow('│' + ('  ' + inner[i]).padEnd(boxW - 2) + '│');
    boxRow('└' + '─'.repeat(boxW) + '┘');
  } else {
    banner('1. Requirements at a Glance');
  }
  blank(8);

  // ── 2. Cameras ──
  if (cameras.length) {
    banner('2. Cameras');
    push(['#', 'Type', 'Technology', 'Count', 'Resolution', 'Mounting'], 18);
    cameras.forEach((c, i) => {
      push([i + 1, c.formFactor || c.type || 'Camera', c.technology || '', Number(c.count) || 1, c.resolution || '', c.mounting || ''], 18);
    });
    push(['Total Cameras', '', '', camTotal, '', ''], 18);
    blank(8);
  }

  // ── 3. Recording unit ──
  if (nvrDvr.needed) {
    banner('3. Recording Unit');
    kv('Type', nvrDvr.type || '');
    kv('Channels', nvrDvr.channels || '');
    kv('Brand / Model', nvrDvr.brand || '');
    blank(8);
  }

  // ── 4. Power supply ──
  if (nvrDvr.power) {
    banner('4. Power Supply');
    kv('Type', nvrDvr.power.type || '');
    kv('Channels', nvrDvr.power.channels || '');
    kv('Brand / Model', nvrDvr.power.brand || '');
    blank(8);
  }

  // ── 5. Cabling ──
  if (cables.length) {
    banner('5. Cabling');
    push(['#', 'Type', 'Unit', 'Required', 'Actual Used', ''], 18);
    let totBoxes = 0, totMtrs = 0;
    cables.forEach((c, i) => {
      const unit = cableUnit(c.type);
      const qty = unit === 'Box' ? Number(c.boxes) || 0 : unit === 'Mtrs' ? Number(c.meters) || 0 : '';
      if (unit === 'Box') totBoxes += Number(qty) || 0;
      if (unit === 'Mtrs') totMtrs += Number(qty) || 0;
      push([i + 1, c.type, unit, qty === '' ? '' : Number(qty), c.actual_meters != null ? Number(c.actual_meters) : ''], 18);
    });
    push(['Totals', '', '', [totBoxes && totBoxes + ' box', totMtrs && totMtrs + ' mtrs'].filter(Boolean).join(' + '), '', ''], 18);
    fullRow('Note: Cat6 / Cat6a cables are counted in boxes (305 m each); Power Cable and HDMI are measured in metres. "Actual Used" is filled after the job is done.'.toUpperCase(), 18);
    blank(8);
  }

  // ── 6. Hardware & parts ──
  if (mItems.length || additionalParts.length) {
    banner('6. Hardware & Additional Parts');
    push(['Item', 'Qty', '', '', '', 'Notes'], 18);
    if (mounting.brackets) push(['Brackets', Number(mounting.brackets) || 0]);
    if (mounting.poles) push(['Poles', Number(mounting.poles) || 0]);
    if (mounting.boxes) push(['Camera Box', Number(mounting.boxes) || 0]);
    if (mounting.other) push(['Other', String(mounting.other)]);
    additionalParts.forEach((p) => push([p.name || '', Number(p.qty) || 1, '', '', '', p.notes || '']));
    blank(8);
  }

  // ── 7. Existing setup ──
  if (survey.is_existing_installation) {
    banner('7. Existing Setup');
    if (survey.existing_setup_notes) kv('Setup Notes', survey.existing_setup_notes);
    if (survey.work_needed) kv('Work Needed', survey.work_needed);
    blank(8);
  }

  // ── 8. Technician notes ──
  if (survey.notes) {
    banner('8. Technician Notes');
    fullRow(survey.notes);
    blank(8);
  }

  // ── Footer ──
  kvPair('Prepared By', tech || 'Techlab Team', 'Prepared On', fmt(new Date().toISOString()));
  const footRow = rows.length;
  push(['Techlab  |  Report Ref: ' + (shortId || '-')], 16);
  merge(footRow, 0, TOTAL - 1);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 20 }
  ];
  ws['!rows'] = rowH.map(h => ({ hpt: h }));
  if (merges.length) ws['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws, 'Site Visit Report');
  XLSX.writeFile(wb, (requestId ? requestId.slice(-8) : 'survey') + '-site-visit-report.xlsx');
};

const renderRequestContextMarkup = (request) => `
  <span class="chip ${getRequestSubjectTone(request.request_subject_type)}">${getRequestSubjectLabel(request.request_subject_type)}</span>
  <br />
  <span class="inline-meta">${escapeHtml(request.request_subject_name || "No specific product or service named")}</span>
`;

const getWorkingDate = (daysToAdd) => {
  const date = new Date();
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) { // Skip Sundays
      added++;
    }
  }
  return date.toISOString().split("T")[0];
};

const addWorkingDays = (dateStr, daysToAdd) => {
  const parts = dateStr ? String(dateStr).split("-").map(Number) : [];
  const date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) { // Skip Sundays
      added++;
    }
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const api = async (url, options = {}) => {
  const { headers: optionHeaders = {}, ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && restOptions.body instanceof FormData;
  const requestOptions = {
    credentials: "include",
    ...restOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...optionHeaders,
    },
  };

  let response = await fetch(url, requestOptions);

  if (response.status === 401 && !url.startsWith("/api/auth/")) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (refreshResponse.ok) {
      response = await fetch(url, requestOptions);
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!isJson && url.includes("/api/")) {
     throw new Error("Server returned non-JSON response. You might have been logged out.");
  }
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload.error || payload || "Request failed");
  }

  return payload;
};

const getStatusTone = (status) => {
  const lower = String(status).toLowerCase();
  if (lower.includes("cancel")) return "danger";
  if (lower.includes("schedule") || lower.includes("order") || lower.includes("pending") || lower.includes("confirm")) return "info";
  if (lower.includes("progress") || lower.includes("quote")) return "warning";
  if (lower.includes("pack") || lower.includes("ship")) return "warning";
  if (lower.includes("done") || lower.includes("deliver") || lower.includes("complete")) return "success";
  return "neutral";
};

const logout = async () => {
  window.location.hash = '';
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error("Logout API failed", e);
  }
  window.location.href = "login.html";
};

const bindLogout = () => {
  document.querySelectorAll("[data-action='logout']").forEach((button) => {
    button.addEventListener("click", logout);
  });
};

const toggleDropdown = (e) => {
  const dropdown = e.target.closest(".dropdown");
  const menu = dropdown.querySelector(".dropdown-menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
};

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = "none");
  }
});

const mountThemeToggle = () => {
  // Remove any existing widget to prevent duplicates
  document.querySelectorAll(".theme-widget").forEach(w => w.remove());

  const widget = document.createElement("div");
  widget.className = "theme-widget";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "theme-toggle";
  toggle.setAttribute("aria-label", "Toggle dark mode");

  const autoBtn = document.createElement("button");
  autoBtn.type = "button";
  autoBtn.className = "theme-auto-btn";
  autoBtn.textContent = "Auto";
  autoBtn.setAttribute("title", "Switch theme automatically by time");

  const renderThemeLabel = () => {
    const isDark = document.body.dataset.theme === "dark";
    const isAuto = getStoredMode() === "auto";
    toggle.innerHTML = `
      <span class="theme-toggle-track">
        <span class="theme-toggle-thumb"></span>
      </span>
      <span class="theme-toggle-label">${isDark ? "Dark" : "Light"}</span>
    `;
    toggle.setAttribute("aria-pressed", String(isDark));
    autoBtn.classList.toggle("active", isAuto);
    autoBtn.style.display = isAuto ? "none" : "";
  };

  toggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    setStoredMode("manual");
    applyTheme(nextTheme);
    renderThemeLabel();
  });

  autoBtn.addEventListener("click", () => {
    setStoredMode("auto");
    applyTheme(getAutoTheme());
    renderThemeLabel();
  });

  renderThemeLabel();
  widget.appendChild(toggle);
  widget.appendChild(autoBtn);

  // Find Best Target
  const target = document.querySelector(".top-actions") ||
                 document.querySelector(".site-nav") ||
                 document.querySelector(".admin-top-strip > div:last-child");

  if (target) {
    target.appendChild(widget);
  } else {
    widget.classList.add("theme-widget-floating");
    document.body.appendChild(widget);
  }

  // Interval for auto mode
  if (!window._themeIntervalSet) {
    setInterval(() => {
      if (getStoredMode() !== "auto") return;
      const next = getAutoTheme();
      if (next !== document.body.dataset.theme) {
        applyTheme(next);
        renderThemeLabel();
      }
    }, 60000);
    window._themeIntervalSet = true;
  }
};

const renderMetricCards = (items) =>
  items
    .map(
      (item) => `
        <div class="stat stat-info">
          <span class="val">${item.value}</span>
          <span class="lbl">${item.label}</span>
          ${item.note ? `<p class="stat-note">${item.note}</p>` : ''}
        </div>
      `
    )
    .join("");

const renderProductManagementSection = (products, prefix, title) => {
  const discountedProducts = products.filter((product) => product.discountPercent > 0);
  const spotlightProduct = [...products].sort((a, b) => b.finalPrice - a.finalPrice)[0];
  const deepestDiscount = [...products].sort((a, b) => b.discountPercent - a.discountPercent)[0];
  const typeSummary = Object.entries(
    products.reduce((acc, product) => {
      acc[product.type] = (acc[product.type] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return `
    <section class="admin-product-workspace">
      <article class="admin-product-hero">
        <div class="admin-product-hero-copy">
          <p class="eyebrow">Catalog Control</p>
          <h2>${title}</h2>
          <p class="panel-copy">Shape the storefront from one place: watch catalog health, highlight pricing strategy, and publish or refine products without jumping between screens.</p>
          <div class="admin-product-tags">
            ${typeSummary.length ? typeSummary.map(([type, count]) => `<span class="admin-product-tag"><strong>${count}</strong>${escapeHtml(type)}</span>`).join("") : `<span class="admin-product-tag"><strong>0</strong>No categories yet</span>`}
          </div>
        </div>
        <div class="admin-product-spotlight">
          <p class="eyebrow">Pricing Spotlight</p>
          ${spotlightProduct ? `
            <h3>${escapeHtml(spotlightProduct.name)}</h3>
            <p>${escapeHtml(spotlightProduct.description)}</p>
            <div class="admin-product-price-row">
              <strong>${formatCurrency(spotlightProduct.finalPrice)}</strong>
              ${spotlightProduct.discountPercent ? `<span>${spotlightProduct.discountPercent}% promo applied</span>` : `<span>No promo running</span>`}
            </div>
            <div class="admin-product-mini-stats">
              <div><span>Category</span><strong>${escapeHtml(spotlightProduct.type)}</strong></div>
              <div><span>Updated By</span><strong>${escapeHtml(spotlightProduct.updated_by_employee_name || "Not set")}</strong></div>
            </div>
          ` : `
            <h3>No products published</h3>
            <p>Create the first catalog item to open the storefront inventory workspace.</p>
          `}
        </div>
      </article>

      <section class="admin-product-grid">
        <article class="dashboard-panel admin-product-panel">
          <div class="admin-product-panel-head">
            <div>
              <p class="eyebrow">Live Snapshot</p>
              <h3>Catalog mix</h3>
            </div>
            ${deepestDiscount ? `<span class="chip success">${deepestDiscount.discountPercent}% top discount</span>` : ""}
          </div>
          <div class="admin-product-kpis">
            <div class="admin-product-kpi">
              <span>Published</span>
              <strong>${products.length}</strong>
            </div>
            <div class="admin-product-kpi">
              <span>Discounted</span>
              <strong>${discountedProducts.length}</strong>
            </div>
            <div class="admin-product-kpi">
              <span>Highest Ticket</span>
              <strong>${spotlightProduct ? formatCurrency(spotlightProduct.finalPrice) : "Rs. 0"}</strong>
            </div>
          </div>
          <div class="admin-product-type-list">
            ${typeSummary.length ? typeSummary.map(([type, count]) => `
              <div class="admin-product-type-row">
                <span>${escapeHtml(type)}</span>
                <strong>${count} item${count === 1 ? "" : "s"}</strong>
              </div>
            `).join("") : `<p class="inline-meta">Type distribution appears here once products are added.</p>`}
          </div>
        </article>

        <article class="dashboard-panel admin-product-panel">
          <div class="admin-product-panel-head">
            <div>
              <p class="eyebrow">Add Product</p>
              <h3>Publish a new storefront item</h3>
            </div>
          </div>
          <form id="${prefix}-product-add-form" class="stack-form">
            <div class="field-grid">
              <label>Type<input name="type" type="text" required /></label>
              <label>Name<input name="name" type="text" required /></label>
            </div>
            <div class="field-grid">
              <label>Price<input name="price" type="number" min="1" step="1" required /></label>
              <label>Discount Percent<input name="discountPercent" type="number" min="0" max="80" step="1" required /></label>
            </div>
            <label>Description<textarea name="description" rows="4" required></textarea></label>
            <button class="button button-primary" type="submit">Add Product</button>
            <p id="${prefix}-product-add-status" class="inline-status"></p>
          </form>
        </article>

        <article class="dashboard-panel admin-product-panel">
          <div class="admin-product-panel-head">
            <div>
              <p class="eyebrow">Edit Product</p>
              <h3>Adjust pricing, copy, and offer depth</h3>
            </div>
          </div>
          <form id="${prefix}-product-edit-form" class="stack-form">
            <label>
              Product
              <select name="productId" required>
                ${products.map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`).join("")}
              </select>
            </label>
            <div class="field-grid">
              <label>Type<input name="type" type="text" required /></label>
              <label>Name<input name="name" type="text" required /></label>
            </div>
            <div class="field-grid">
              <label>Price<input name="price" type="number" min="1" step="1" required /></label>
              <label>Discount Percent<input name="discountPercent" type="number" min="0" max="80" step="1" required /></label>
            </div>
            <label>Description<textarea name="description" rows="4" required></textarea></label>
            <button class="button button-primary" type="submit">Save Changes</button>
            <p id="${prefix}-product-edit-status" class="inline-status"></p>
          </form>
        </article>
      </section>

      <article class="table-wrap admin-product-catalog">
        <div class="admin-product-catalog-head">
          <div>
            <p class="eyebrow">Catalog Surface</p>
            <h3>Published items</h3>
          </div>
          <p id="${prefix}-product-table-status" class="inline-status"></p>
        </div>
        <div class="admin-product-card-grid">
          ${products.length ? products.map((product) => {
            const pimg = product.imageUrl || product.image_url;
            return `
            <article class="admin-product-card">
              <div class="admin-product-card-top">
                <span class="chip info">${escapeHtml(product.type)}</span>
                ${product.discountPercent ? `<span class="chip success">${product.discountPercent}% off</span>` : `<span class="chip">Standard price</span>`}
              </div>
              ${pimg ? `<div class="admin-product-card-img"><img src="${escapeHtml(pimg)}" alt="" /></div>` : ''}
              <h4>${escapeHtml(product.name)}</h4>
              <p>${escapeHtml(product.description)}</p>
              <div class="admin-product-card-pricing">
                <strong>${formatCurrency(product.finalPrice)}</strong>
                ${product.discountPercent ? `<span class="is-compare">${formatCurrency(product.originalPrice)}</span>` : `<span class="is-base">Base ${formatCurrency(product.originalPrice)}</span>`}
              </div>
              <div class="admin-product-card-meta">
                <span>Updated by ${escapeHtml(product.updated_by_employee_name || "system")}</span>
              </div>
              <div class="action-stack">
                <button class="button button-secondary" type="button" data-remove-product="${product.id}">Remove</button>
              </div>
            </article>`;
          }).join("") : `<div class="empty-message">No products available.</div>`}
        </div>
      </article>
    </section>
  `;
};

const populateProductEditForm = (form, product) => {
  if (!form || !product) {
    return;
  }

  form.querySelector("[name='type']").value = product.type;
  form.querySelector("[name='name']").value = product.name;
  form.querySelector("[name='price']").value = product.originalPrice;
  form.querySelector("[name='discountPercent']").value = product.discountPercent;
  form.querySelector("[name='description']").value = product.description;
};

const mountProductManagement = (products, prefix) => {
  const addForm = document.querySelector(`#${prefix}-product-add-form`);
  const addStatus = document.querySelector(`#${prefix}-product-add-status`);
  const editForm = document.querySelector(`#${prefix}-product-edit-form`);
  const editStatus = document.querySelector(`#${prefix}-product-edit-status`);
  const tableStatus = document.querySelector(`#${prefix}-product-table-status`);

  if (addForm && addStatus) {
    addForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      addStatus.textContent = "";

      try {
        await api("/api/staff/products", {
          method: "POST",
          body: JSON.stringify({
            type: String(formData.get("type")),
            name: String(formData.get("name")),
            price: Number(formData.get("price")),
            discountPercent: Number(formData.get("discountPercent")),
            description: String(formData.get("description")),
          }),
        });
        addStatus.textContent = "Product added successfully.";
        window.setTimeout(() => refreshPage(), 500);
      } catch (error) {
        addStatus.textContent = error.message;
      }
    });
  }

  if (editForm && editStatus) {
    const productSelect = editForm.querySelector("[name='productId']");
    const syncProduct = () => {
      const product = products.find((item) => item.id === productSelect.value);
      populateProductEditForm(editForm, product);
    };

    productSelect.addEventListener("change", syncProduct);
    syncProduct();

    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      editStatus.textContent = "";

      try {
        await api(`/api/staff/products/${String(formData.get("productId"))}`, {
          method: "PATCH",
          body: JSON.stringify({
            type: String(formData.get("type")),
            name: String(formData.get("name")),
            price: Number(formData.get("price")),
            discountPercent: Number(formData.get("discountPercent")),
            description: String(formData.get("description")),
          }),
        });
        editStatus.textContent = "Product updated successfully.";
        window.setTimeout(() => refreshPage(), 500);
      } catch (error) {
        editStatus.textContent = error.message;
      }
    });
  }

  document.querySelectorAll("[data-remove-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Remove this product from the storefront?")) {
        return;
      }

      if (tableStatus) {
        tableStatus.textContent = "";
      }

      try {
        await api(`/api/staff/products/${button.dataset.removeProduct}`, {
          method: "DELETE",
        });
        if (tableStatus) {
          tableStatus.textContent = "Product removed successfully.";
        }
        window.setTimeout(() => refreshPage(), 400);
      } catch (error) {
        if (tableStatus) {
          tableStatus.textContent = error.message;
        }
      }
    });
  });
};

window.renderAnalyticsView = async (isSales = false) => {
  const containerId = isSales ? 'sales-analytics-container' : 'analytics-container';
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    container.innerHTML = `
      <div style="padding:60px; text-align:center;">
        <div class="spinner"></div>
        <p style="margin-top:15px; color:var(--text); font-weight:600;">Connecting to analytics engine...</p>
      </div>
    `;

    const data = await api('/api/admin/analytics');
    const prefix = isSales ? 'sales-' : 'admin-';

    container.innerHTML = `
      <div class="analytics-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px; padding:24px 0;">
        <div class="dashboard-panel">
          <p class="eyebrow">Revenue Trend</p>
          <h3 style="margin-bottom:15px;">Monthly Income</h3>
          <div style="position:relative; height:240px; width:100%;">
            <canvas id="${prefix}chart-revenue"></canvas>
          </div>
        </div>
        <div class="dashboard-panel">
          <p class="eyebrow">Team Efficiency</p>
          <h3 style="margin-bottom:15px;">Jobs by Technician</h3>
          <div style="position:relative; height:240px; width:100%;">
            <canvas id="${prefix}chart-tech"></canvas>
          </div>
        </div>
        <div class="dashboard-panel">
          <p class="eyebrow">Inventory Health</p>
          <h3 style="margin-bottom:15px;">Stock Distribution</h3>
          <div style="position:relative; height:240px; width:100%;">
            <canvas id="${prefix}chart-inventory"></canvas>
          </div>
        </div>
      </div>
    `;

    if (typeof Chart === 'undefined') {
      await loadChartJs();
    }

    setTimeout(() => {
      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#55657d', font: { size: 10, family: 'Manrope' }, usePointStyle: true, padding: 15 } }
        }
      };

      const revCanvas = document.getElementById(`${prefix}chart-revenue`);
      if (revCanvas && data.revenue) {
        new Chart(revCanvas, {
          type: 'line',
          data: {
            labels: data.revenue.map(r => {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const parts = r.month.split('-');
              return months[parseInt(parts[1]) - 1];
            }),
            datasets: [
              { label: 'Sales', data: data.revenue.map(r => r.sales), borderColor: '#1663ff', backgroundColor: 'rgba(22, 99, 255, 0.1)', fill: true, tension: 0.4 },
              { label: 'Services', data: data.revenue.map(r => r.services), borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.4 }
            ]
          },
          options: { ...commonOptions, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } }, x: { grid: { display: false } } } }
        });
      }

      const techCanvas = document.getElementById(`${prefix}chart-tech`);
      if (techCanvas && data.techPerf) {
        new Chart(techCanvas, {
          type: 'bar',
          data: {
            labels: data.techPerf.map(t => (t.name || 'Staff').split(' ')[0]),
            datasets: [{ label: 'Jobs', data: data.techPerf.map(t => t.count), backgroundColor: '#10284f', borderRadius: 4 }]
          },
          options: { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
        });
      }

      const invCanvas = document.getElementById(`${prefix}chart-inventory`);
      if (invCanvas && data.inventory) {
        new Chart(invCanvas, {
          type: 'doughnut',
          data: {
            labels: data.inventory.map(i => i.type),
            datasets: [{ data: data.inventory.map(i => i.stock), backgroundColor: ['#10284f', '#1663ff', '#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0 }]
          },
          options: { ...commonOptions, cutout: '70%' }
        });
      }
    }, 400);

  } catch (err) {
    console.error("TECHLAB Analytics Error:", err);
    container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--danger);">Failed to load analytics: ${escapeHtml(err.message)}</div>`;
  }
};

const loadChartJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') return resolve();
    // Check if script already exists in DOM
    const existing = document.querySelector('script[src*="chart.js"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const mountAdminViewTabs = () => {
  const buttons = document.querySelectorAll("[data-admin-view]");
  const panels = document.querySelectorAll("[data-admin-panel]");

  if (!buttons.length || !panels.length) {
    return;
  }

  const activate = (view) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.adminView === view;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.adminPanel === view);
    });

    if (view === 'intelligence') {
      window.renderAnalyticsView();
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => activate(button.dataset.adminView));
  });

  activate("service");
};

const mountServiceRequestForm = (formSelector, statusSelector) => {
  const form = document.querySelector(formSelector);
  const status = document.querySelector(statusSelector);

  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    status.textContent = "";

    try {
      await api("/api/public/service-requests", {
        method: "POST",
        body: JSON.stringify({
          customerName: String(formData.get("customerName")),
          mobile: String(formData.get("mobile")),
          deviceType: String(formData.get("deviceType")),
          preferredDate: String(formData.get("preferredDate")),
          issue: String(formData.get("issue")),
        }),
      });
      event.currentTarget.reset();
      status.textContent = "Service request submitted. Login with OTP to track it.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
};

const renderHomePage = async () => {
  const [productsPayload] = await Promise.allSettled([
    api("/api/public/products"),
  ]);

  const products =
    productsPayload.status === "fulfilled" ? productsPayload.value.products : [];
  const homeProductGrid = document.querySelector("#product-grid");

  if (homeProductGrid) {
    const highlightedProducts = products.slice(0, 3);
    homeProductGrid.innerHTML = highlightedProducts
      .map(
        (product) => `
          <article class="product-card">
            <div class="product-card-top">
              <span class="product-type">${escapeHtml(product.type)}</span>
              ${product.discountPercent ? `<span class="discount-pill">${product.discountPercent}% off</span>` : ""}
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="price-stack">
              <strong class="price">${formatProductPrice(product)}</strong>
              ${product.discountPercent ? `<span class="price-cut">${formatCurrency(product.originalPrice)}</span>` : ""}
            </div>
          </article>
        `
      )
      .join("");
  }

  // Animate stats numbers
  const stats = document.querySelectorAll(".stat-num");
  stats.forEach(stat => {
    const target = parseInt(stat.dataset.val);
    if (isNaN(target)) return;
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        stat.textContent = stat.textContent.includes('%') ? target + '%' : stat.textContent.includes('k') ? (target/1000).toFixed(0) + 'k+' : target + '+';
        clearInterval(timer);
      } else {
        stat.textContent = Math.floor(current) + (stat.textContent.includes('%') ? '%' : '+');
      }
    }, 30);
  });
};

const renderProductsPage = async () => {
  const productsPayload = await api("/api/public/products");
  const products = productsPayload.products || [];
  const productGrid = document.querySelector("#product-grid");
  
  if (!productGrid) return;
  
  const selectedProductIds = [];
  
  productGrid.innerHTML = products.map((product) => {
    const pimg = product.image_url || product.imageUrl;
    const pmin = product.min_stock || 5;
    const plow = product.stock <= pmin;
    return `
    <article class="product-card">
      ${pimg ? `<div class="product-card-img"><img src="${escapeHtml(pimg)}" alt="" /></div>` : ""}
      <div class="product-card-top">
        <span class="product-type">${escapeHtml(product.type)}</span>
        ${product.discountPercent ? `<span class="discount-pill">${product.discountPercent}% off</span>` : ""}
        ${plow ? `<span class="discount-pill danger">Low Stock</span>` : ""}
      </div>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.description)}</p>
      <div class="price-stack">
        <strong class="price">${formatProductPrice(product)}</strong>
        ${product.discountPercent ? `<span class="price-cut">${formatCurrency(product.originalPrice)}</span>` : ""}
      </div>
      <button class="button button-primary" data-add-cart="${product.id}">Add to Cart</button>
    </article>
  `;
  }).join("");
  
  const renderCart = () => {
    const cartList = document.querySelector("#cart-list");
    const cartCount = document.querySelector("#cart-count");
    const cartTotal = document.getElementById("cart-total");
    
    if (cartCount) cartCount.textContent = selectedProductIds.length;
    
    if (!cartList) return;
    
    if (!selectedProductIds.length) {
      cartList.innerHTML = `<div class="empty-message">No products in cart</div>`;
      if (cartTotal) cartTotal.textContent = "Rs. 0";
      return;
    }
    
    const items = selectedProductIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    const total = items.reduce((sum, item) => sum + (item.finalPrice ?? item.price), 0);
    
    cartList.innerHTML = items.map((item) => `
      <div class="cart-line">
        <span>${escapeHtml(item.name)}</span>
        <strong>${formatProductPrice(item)}</strong>
      </div>
    `).join("");
    
    if (cartTotal) cartTotal.textContent = formatCurrency(total);
  };
  
  productGrid.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedProductIds.push(button.dataset.addCart);
      renderCart();
    });
  });
  
  const checkoutForm = document.querySelector("#checkout-form");
  const checkoutStatus = document.querySelector("#checkout-status");
  
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(checkoutForm);
      
      if (!selectedProductIds.length) {
        checkoutStatus.textContent = "Select at least one product";
        return;
      }
      
      try {
        await api("/api/public/orders", {
          method: "POST",
          body: JSON.stringify({
            buyerName: String(formData.get("buyerName")),
            mobile: String(formData.get("mobile")),
            productIds: selectedProductIds,
          }),
        });
        selectedProductIds.length = 0;
        renderCart();
        checkoutForm.reset();
        checkoutStatus.textContent = "Order placed successfully!";
      } catch (error) {
        checkoutStatus.textContent = error.message;
      }
    });
  }
  
  renderCart();
};

const renderServicesPage = async () => {
  mountServiceRequestForm("#service-request-form", "#service-request-status");

  const loginState = document.querySelector("#service-login-state");
  const loginMessage = document.querySelector("#service-login-message");

  try {
    const { user } = await api("/api/me");
    if (loginState) {
      loginState.textContent = user.role === "customer" ? "Logged in" : "Staff session";
    }
    if (loginMessage) {
      loginMessage.textContent =
        user.role === "customer"
          ? `Logged in as ${escapeHtml(user.name)}. Your bookings will be easier to track.`
          : `Logged in as ${escapeHtml(user.name)}. You can still submit a customer service request here.`;
    }
  } catch {
    if (loginState) {
      loginState.textContent = "Optional";
    }
    if (loginMessage) {
      loginMessage.textContent = "You can book first and login later with mobile OTP to track the request.";
    }
  }
};

// ── Login Tab Logic ──
const renderLoginPage = () => {
  const lastTab = localStorage.getItem("techlab_login_tab") || "customer";

  const toggleTabs = (mode) => {
    const isStaff = mode === "staff";
    document.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.login === mode);
    });
    const customerLogin = document.getElementById("customer-login");
    const staffLogin = document.getElementById("staff-login");
    if (customerLogin) customerLogin.classList.toggle("hidden", isStaff);
    if (staffLogin) staffLogin.classList.toggle("hidden", !isStaff);
    localStorage.setItem("techlab_login_tab", mode);
  };

  const btnCustomer = document.getElementById("toggle-customer");
  const btnStaff = document.getElementById("toggle-staff");

  if (btnCustomer) {
    btnCustomer.onclick = () => { console.log("TECHLAB: customer click"); toggleTabs("customer"); };
  }
  if (btnStaff) {
    btnStaff.onclick = () => { console.log("TECHLAB: staff click"); toggleTabs("staff"); };
  }

  toggleTabs(lastTab);

  // Load app download link
  appDownloadMarkup("login-app-download-link").then(appDownload => {
    const downloadBox = document.getElementById("login-app-download");
    if (downloadBox && appDownload) {
      downloadBox.innerHTML = `<p class="eyebrow">Get the TECHLAB App</p>${appDownload}`;
    }
  });

  document.querySelector("#otp-request-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const mobile = document.querySelector("#otp-mobile").value.trim();
    const status = document.querySelector("#otp-status");
    try {
      const result = await api("/api/auth/customer/request-otp", { method: "POST", body: JSON.stringify({ mobile }) });
      status.textContent = result.otpPreview ? `Demo OTP sent: ${result.otpPreview}` : "OTP sent successfully.";
    } catch (error) { status.textContent = error.message; }
  });

  document.querySelector("#otp-verify-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const mobile = document.querySelector("#otp-mobile").value.trim();
    const otp = document.querySelector("#otp-code").value.trim();
    const status = document.querySelector("#otp-status");
    try {
      await api("/api/auth/customer/verify-otp", { method: "POST", body: JSON.stringify({ mobile, otp }) });
      window.location.href = "customer.html";
    } catch (error) { status.textContent = error.message; }
  });

  document.querySelector("#staff-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const status = document.querySelector("#staff-status");
    try {
      const result = await api("/api/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(formData.get("email")),
          password: String(formData.get("password")),
        }),
      });
      window.location.href = result.user.role === "admin" ? "admin.html" : result.user.role === "sales" ? "sales.html" : result.user.role === "technician" ? "technician.html" : "employee.html";
    } catch (error) { status.textContent = error.message; }
  });

  document.querySelectorAll(".demo-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const emailInput = document.querySelector("#staff-email");
      const passInput = document.querySelector("#staff-password");
      if (emailInput && passInput) {
        emailInput.value = chip.dataset.user;
        passInput.value = chip.dataset.pass;
        emailInput.focus();
        showToast(`Auto-filled: ${chip.textContent}`, "info");
      }
    });
  });
};

// ── Purchase Orders (PO) State & Logic ──
let poProducts = [];
let poItems = [];
const currentPoId = window.__poId = window.__poId || { value: null };

const poStatusChip = (status) => {
  const cls = status === "received" ? "success" : status === "cancelled" ? "danger" : "warning";
  const label = status === "received" ? "Received" : status === "cancelled" ? "Cancelled" : "Ordered";
  return `<span class="chip ${cls}">${label}</span>`;
};

const openPoView = async (poId) => {
  console.log("TECHLAB: Opening PO view for", poId);
  try {
    const res = await api(`/api/sales/purchase-orders/${poId}`);
    const po = res.purchaseOrder;
    const items = res.items || [];
    currentPoId.value = poId;

    const modal = document.getElementById("po-view-modal");
    if (!modal) {
      console.error("TECHLAB: po-view-modal not found in DOM");
      return;
    }

    document.getElementById("po-view-title").textContent = `Purchase Order ${po.po_number}`;
    document.getElementById("po-view-content").innerHTML = `
      <div class="detail-row"><span class="detail-label">Supplier</span><span class="detail-value">${escapeHtml(po.supplier_name || '')}</span></div>
      <div class="detail-row"><span class="detail-label">PO Date</span><span class="detail-value">${escapeHtml(po.po_date || '-')}</span></div>
      ${po.expected_date ? `<div class="detail-row"><span class="detail-label">Expected</span><span class="detail-value">${escapeHtml(po.expected_date)}</span></div>` : ''}
      ${po.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(po.notes)}</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${poStatusChip(po.status)}</span></div>
      ${po.advance_amount > 0 ? `<div class="detail-row"><span class="detail-label">Advance Paid</span><span class="detail-value" style="color:var(--success); font-weight:bold;">${formatCurrency(po.advance_amount)} (${escapeHtml(po.advance_mode || 'Cash')})</span></div>` : ''}
      <div style="overflow-x:auto; margin-top:12px;">
        <table class="data-table" style="font-size:12px;">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
          <tbody>${items.map(i => `
            <tr>
              <td>${escapeHtml(i.product_name)}</td>
              <td>${i.quantity}</td>
              <td>${formatCurrency(i.unit_cost)}</td>
              <td><strong>${formatCurrency(i.quantity * i.unit_cost)}</strong></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div style="text-align:right; margin-top:10px; font-weight:bold;">Total: ${formatCurrency(po.total_amount)}</div>
    `;

    const receiveBtn = document.getElementById("po-view-receive-btn");
    const deleteBtn = document.getElementById("po-view-delete-btn");

    if (receiveBtn) receiveBtn.style.display = po.status === "ordered" ? "" : "none";
    // Always show delete button in modal, but we'll handle the logic in the listener
    if (deleteBtn) deleteBtn.style.display = "";

    modal.classList.add("show");
  } catch (err) {
    console.error("TECHLAB: Failed to open PO view", err);
    alert(err.message);
  }
};

window.closePoViewModal = () => {
  const modal = document.getElementById("po-view-modal");
  if (modal) modal.classList.remove("show");
  currentPoId.value = null;
};

if (!window.__poViewModalBound) {
  window.__poViewModalBound = true;
  document.addEventListener("click", async (e) => {
    const receiveBtn = e.target.closest("#po-view-receive-btn");
    const deleteBtn = e.target.closest("#po-view-delete-btn");
    const rowViewBtn = e.target.closest(".po-view-btn");
    const rowRecvBtn = e.target.closest(".po-receive-btn");
    const rowDelBtn = e.target.closest(".po-delete-btn");

    if (rowViewBtn) return openPoView(rowViewBtn.dataset.poId);

    if (receiveBtn || rowRecvBtn) {
      const poId = receiveBtn ? currentPoId.value : rowRecvBtn.dataset.poId;
      if (!poId) return;
      if (!confirm("Mark this PO as received? Stock will be added and a purchase record created.")) return;
      const advance = promptAdvancePayment();
      if (advance === null) return;
      try {
        await api(`/api/sales/purchase-orders/${poId}/receive`, {
          method: "POST",
          body: JSON.stringify(advance),
        });
        toast(advance.advanceAmount > 0 ? "PO received, advance recorded, stock updated" : "PO received, stock updated", "success");
        closePoViewModal();
        refreshPage();
      } catch (err) { alert(err.message); }
    }

    if (deleteBtn || rowDelBtn) {
      const poId = deleteBtn ? currentPoId.value : rowDelBtn.dataset.poId;
      if (!poId) return;

      if (!confirm("Delete this Purchase Order? This action cannot be undone.")) return;

      try {
        const response = await fetch(`/api/sales/purchase-orders/${poId}`, { method: "DELETE" });
        const result = await response.json();

        if (!response.ok) {
          if (result.requiresForce) {
            if (confirm(`${result.error}\n\nDo you want to delete the PO anyway? (This will NOT reverse stock or delete the purchase records, only the PO itself.)`)) {
              const forceRes = await api(`/api/sales/purchase-orders/${poId}?force=true`, { method: "DELETE" });
              toast(forceRes.message || "PO force deleted", "success");
              closePoViewModal();
              refreshPage();
              return;
            }
          }
          throw new Error(result.error || "Failed to delete PO");
        }

        toast(result.message || "PO deleted successfully", "success");
        closePoViewModal();
        refreshPage();
      } catch (err) {
        console.error("TECHLAB: Delete PO error", err);
        alert(err.message);
      }
    }
  });
}

// ─────────────────────────────────────────────
//  Reports Center — shared, data-driven renderer
// ─────────────────────────────────────────────
const rcFmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rcToday = () => { const n = new Date(); n.setHours(0, 0, 0, 0); return n; };

const rcRangeFor = (mode, curr) => {
  const today = rcToday();
  if (mode === "daily") return { start: rcFmt(today), end: rcFmt(today) };
  if (mode === "weekly") {
    const dow = (today.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const mon = new Date(today);
    mon.setDate(today.getDate() - dow);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: rcFmt(mon), end: rcFmt(sun) };
  }
  if (mode === "monthly") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: rcFmt(first), end: rcFmt(last) };
  }
  // range handled by the date inputs
  return curr;
};

const mountReportsCenter = async (root, user) => {
  if (!root) return;
  const isAdmin = user && user.role === "admin";
  let groups = [];
  let reports = [];

  try {
    const res = await api("/api/admin/reports/meta");
    groups = res.groups || [];
    reports = res.reports || [];
  } catch (e) {
    root.innerHTML = '<p style="padding:20px; color:var(--muted);">Could not load reports.</p>';
    return;
  }

  const activeGroup = { id: reports.length ? (reports.find(r => r) ? groups[0]?.id || "sales" : "sales") : "sales" };
  const activeCat = { name: activeGroup.id };
  const reportState = {}; // id -> { mode, start, end }

  reports.forEach(r => {
    const today = rcToday();
    const monthly = rcRangeFor("monthly", null);
    reportState[r.id] = { mode: "monthly", start: monthly.start, end: monthly.end };
  });

  const catBar = () => `
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
      ${groups.map(g => `<button class="chip-tab rc-cat-btn ${g.id === activeCat.name ? 'active' : ''}" data-cat="${escapeHtml(g.id)}">${escapeHtml(g.label)}</button>`).join('')}
    </div>
  `;

  // ── Archived Reports → File Manager ──
  const archiveFiles = [];
  const arcGroups = [];
  let arcView = "list";
  let arcGroup = "";
  let arcQ = "";
  let arcFmt = "";
  let arcSort = "created_at";
  let arcSortDir = "desc";
  const arcSelected = new Set();

  const rcFmtSize = (b) => {
    if (!b && b !== 0) return "";
    if (b >= 1048576) return (b / 1048576).toFixed(2) + " MB";
    return (b / 1024).toFixed(1) + " KB";
  };

  const rcArcChipBg = (fmt) => (fmt === "pdf" ? "var(--primary-soft)" : "var(--success-soft, #e6f7ee)");
  const arcFileIcon = (f) => (f.format === "pdf" ? "file-text" : "table");
  const arcFileColor = (f) => (f.format === "pdf" ? "var(--danger)" : "var(--success)");

  const visibleArcFiles = () => {
    const q = arcQ.trim().toLowerCase();
    return archiveFiles.filter(f => {
      if (arcGroup && f.group !== arcGroup) return false;
      if (arcFmt && f.format !== arcFmt) return false;
      if (q) {
        const hay = `${f.display_name || ""} ${f.scope} ${f.group_label || ""} ${f.range_label || ""} ${f.month || ""} ${f.filename || ""} ${f.generated_by_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).map(f => ({ ...f, selected: arcSelected.has(f.id) }));
  };

  const sortArc = (files) => {
    const dir = arcSortDir === "asc" ? 1 : -1;
    return files.slice().sort((a, b) => {
      if (arcSort === "size") return dir * ((a.size || 0) - (b.size || 0));
      const av = String(a[arcSort] || ""), bv = String(b[arcSort] || "");
      return dir * av.localeCompare(bv);
    });
  };

  const arcRowHtml = (f) => `
    <tr data-rid="${f.id}">
      <td style="width:32px; vertical-align:middle;"><input type="checkbox" class="arc-chk" data-id="${f.id}" ${f.selected ? "checked" : ""} /></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <i data-lucide="${arcFileIcon(f)}" style="width:15px;height:15px;flex-shrink:0; color:${arcFileColor(f)};"></i>
          <span style="font-weight:600; word-break:break-word;">${escapeHtml(f.display_name || f.filename)}</span>
        </div>
      </td>
      <td><span class="chip" style="font-size:10px; background:${rcArcChipBg(f.format)};">${f.format.toUpperCase()}</span></td>
      <td>${escapeHtml(f.range_label || "-")}</td>
      <td style="white-space:nowrap;">${rcFmtSize(f.size) || "-"}</td>
      <td>${escapeHtml(f.generated_by_name || "-")}</td>
      <td style="white-space:nowrap;">${new Date(f.created_at).toLocaleDateString()} ${new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
      <td style="text-align:right; white-space:nowrap;">
        <a class="button button-primary button-small" href="/api/admin/reports/archive/download?id=${encodeURIComponent(f.id)}" target="_blank">Download</a>
        ${isAdmin ? `<button class="button button-danger button-small rc-archive-del" data-id="${f.id}">Delete</button>` : ""}
      </td>
    </tr>`;

  const arcTileHtml = (f) => `
    <div class="arc-tile" data-rid="${f.id}" style="position:relative; border:1px solid var(--line); border-radius:10px; padding:14px; background:var(--panel-bg, #fff);">
      ${isAdmin ? `<input type="checkbox" class="arc-chk" data-id="${f.id}" style="position:absolute; top:8px; right:8px;" ${f.selected ? "checked" : ""} />` : ""}
      <div style="text-align:center;"><i data-lucide="${arcFileIcon(f)}" style="width:34px;height:34px; color:${arcFileColor(f)};"></i></div>
      <div style="font-size:11px; text-align:center; margin-top:8px; font-weight:600; word-break:break-word;">${escapeHtml(f.display_name || f.filename)}</div>
      <div style="text-align:center; margin-top:4px;"><span class="chip" style="font-size:10px; background:${rcArcChipBg(f.format)};">${f.format.toUpperCase()}</span> <span style="color:var(--text-soft); font-size:11px;">${rcFmtSize(f.size)}</span></div>
      <div style="text-align:center; color:var(--text-soft); font-size:10px; margin-top:4px;">${new Date(f.created_at).toLocaleDateString()}</div>
      <div style="display:flex; gap:6px; justify-content:center; margin-top:10px;">
        <a class="button button-primary button-small" href="/api/admin/reports/archive/download?id=${encodeURIComponent(f.id)}" target="_blank">Open</a>
        ${isAdmin ? `<button class="button button-danger button-small rc-archive-del" data-id="${f.id}">Delete</button>` : ""}
      </div>
    </div>`;

  const renderArcBulk = () => {
    const bar = document.getElementById("rc-bulk");
    if (!bar) return;
    const n = arcSelected.size;
    if (n === 0 || !isAdmin) { bar.style.display = "none"; return; }
    bar.style.display = "flex";
    document.getElementById("rc-bulk-label").textContent = `${n} selected`;
  };

  const renderArcCounts = () => {
    const counts = {};
    archiveFiles.forEach(f => { counts[f.group] = (counts[f.group] || 0) + 1; });
    const all = document.getElementById("arc-count-all");
    if (all) all.textContent = `(${archiveFiles.length})`;
    arcGroups.forEach(g => {
      const el = document.getElementById(`arc-count-${g.id}`);
      if (el) el.textContent = `(${counts[g.id] || 0})`;
    });
  };

  const setArcSelectedWithinVisible = () => {
    visibleArcFiles().forEach(f => arcSelected.add(f.id));
  };

  const renderArchive = () => {
    const wrap = document.getElementById("rc-archive");
    if (!wrap) return;
    renderArcCounts();
    renderArcBulk();
    if (!archiveFiles.length) {
      wrap.innerHTML = '<p class="empty" style="padding:16px; font-size:12px;">No archived reports yet. Generate a report (PDF/CSV) and it will be stored here for instant re-download.</p>';
      return;
    }
    const files = sortArc(visibleArcFiles());
    if (!files.length) {
      wrap.innerHTML = '<p class="empty" style="padding:16px; font-size:12px;">No files match the current filters.</p>';
      return;
    }
    if (arcView === "grid") {
      wrap.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:12px;">${files.map(arcTileHtml).join("")}</div>`;
    } else {
      const allVisible = files.length === visibleArcFiles().length && files.every(f => f.selected);
      wrap.innerHTML = `
        <div style="border:1px solid var(--line); border-radius:10px; overflow:auto;">
          <table class="data-table" style="width:100%; min-width:760px;">
            <thead>
              <tr>
                <th style="width:32px;">${isAdmin ? `<input type="checkbox" id="arc-selall" ${allVisible ? "checked" : ""} />` : ""}</th>
                <th class="arc-sort ${arcSort === "display_name" ? "active" : ""}" data-sort="display_name">Name ${arcSort === "display_name" ? (arcSortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th>Format</th>
                <th class="arc-sort ${arcSort === "range_label" ? "active" : ""}" data-sort="range_label">Period ${arcSort === "range_label" ? (arcSortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th class="arc-sort ${arcSort === "size" ? "active" : ""}" data-sort="size">Size ${arcSort === "size" ? (arcSortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th>Generated by</th>
                <th class="arc-sort ${arcSort === "created_at" ? "active" : ""}" data-sort="created_at">Date ${arcSort === "created_at" ? (arcSortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>${files.map(arcRowHtml).join("")}</tbody>
          </table>
        </div>`;
    }
    if (typeof refreshIcons === "function") refreshIcons();
  };

  const loadArchive = () => {
    api("/api/admin/reports/archive").then(res => {
      archiveFiles.length = 0;
      (res.files || []).forEach(f => archiveFiles.push(f));
      arcGroups.length = 0;
      (res.groups || []).forEach(g => arcGroups.push(g));
      renderArcRail();
      renderArchive();
    }).catch(() => {});
  };

  const renderArcRail = () => {
    const rail = document.getElementById("rc-arc-rail");
    if (rail) {
      rail.innerHTML = `
        <button class="rc-folder ${arcGroup === "" ? "active" : ""}" data-group="">All files <span id="arc-count-all" style="opacity:.6;"></span></button>
        ${arcGroups.map(g => `<button class="rc-folder ${arcGroup === g.id ? "active" : ""}" data-group="${g.id}">${escapeHtml(g.label)} <span id="arc-count-${g.id}" style="opacity:.6;"></span></button>`).join("")}`;
    }
    const dd = document.getElementById("rc-archive-group");
    if (dd) {
      dd.innerHTML = `<option value="">All files</option>${arcGroups.map(g => `<option value="${g.id}" ${arcGroup === g.id ? "selected" : ""}>${escapeHtml(g.label)}</option>`).join("")}`;
    }
    const counts = {};
    archiveFiles.forEach(f => { counts[f.group] = (counts[f.group] || 0) + 1; });
    const all = document.getElementById("arc-count-all");
    if (all) {
      if (rail) all.textContent = `(${archiveFiles.length})`;
    }
    arcGroups.forEach(g => {
      const el = document.getElementById(`arc-count-${g.id}`);
      if (el) el.textContent = `(${counts[g.id] || 0})`;
    });
  };

  const renderCards = () => {
    const list = reports.filter(r => r.group === activeCat.name);
    const cards = list.map(r => {
      const st = reportState[r.id];
      const q = st ? `&start=${st.start}&end=${st.end}` : "";
      const url = `/api/admin/reports.pdf?scope=${r.id}${q}`;
      const csvUrl = `/api/admin/reports.csv?scope=${r.id}${q}`;

      if (r.id === "customer_ledger") {
        return `
          <div class="report-link-item report-link-accent">
            <div style="flex:1;">
              <strong>Customer / Party Ledger</strong>
              <p class="report-link-desc">Statement of account for a specific customer or supplier (searches parties).</p>
              <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                <input type="text" class="rc-ledger-search" data-id="${r.id}" placeholder="Search name or mobile..." style="flex:1; min-width:180px; padding:8px; border-radius:6px; border:1px solid var(--line);" />
                <button class="button button-primary button-small rc-ledger-btn" data-id="${r.id}">Download PDF</button>
              </div>
            </div>
          </div>`;
      }

      const dateControls = r.dated ? `
        <div class="rc-controls" data-id="${r.id}" style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${["daily", "weekly", "monthly", "range"].map(m => `<button class="chip-tab rc-pill ${st.mode === m ? 'active' : ''}" data-id="${r.id}" data-mode="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}
          </div>
          <div class="rc-date-fields" data-id="${r.id}" style="display:${st.mode === 'range' ? 'flex' : 'none'}; gap:8px; flex-wrap:wrap; align-items:center;">
            <input type="date" class="rc-start" data-id="${r.id}" value="${st.start}" style="padding:7px; border-radius:6px; border:1px solid var(--line);" />
            <span style="color:var(--text-soft);">to</span>
            <input type="date" class="rc-end" data-id="${r.id}" value="${st.end}" style="padding:7px; border-radius:6px; border:1px solid var(--line);" />
          </div>
          <div style="font-size:11px; color:var(--text-soft);" data-id="${r.id}">${escapeHtml(st.start)} → ${escapeHtml(st.end)}</div>
        </div>` : "";

      const actions = `
        <div style="display:flex; gap:8px; margin-top:8px;">
          <a class="button button-primary button-small rc-dl-pdf" data-id="${r.id}" href="${url}" target="_blank">PDF</a>
          <a class="button button-secondary button-small rc-dl-csv" data-id="${r.id}" href="${csvUrl}">CSV</a>
        </div>`;

      return `
        <div class="report-link-item ${r.adminOnly ? 'report-link-featured' : ''}">
          <div style="flex:1;">
            <strong>${escapeHtml(r.title)}</strong>
            <p class="report-link-desc">${escapeHtml(r.desc)}</p>
            ${dateControls}
          </div>
          ${actions}
        </div>`;
    }).join("");

    const catCards = document.getElementById("rc-cards");
    if (catCards) catCards.innerHTML = cards;
  };

  const render = () => {
    root.innerHTML = `
      ${isAdmin ? `<div style="margin-bottom:12px;"><a class="button button-accent button-small" href="/api/admin/company-profile.pdf" target="_blank">Download Company Profile</a></div>` : ""}
      ${catBar()}
      <div class="panel-grid" id="rc-cards"></div>
      <div class="dashboard-panel" style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <p class="eyebrow">File Manager</p>
            <p class="report-link-desc">Saved PDF/CSV reports you can re-download anytime.</p>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <div style="display:inline-flex; border:1px solid var(--line); border-radius:6px; overflow:hidden;">
              <button class="rc-view ${arcView === "list" ? "active" : ""}" data-view="list" title="List view" style="padding:6px 10px; border:none; background:none; cursor:pointer; font-size:12px;">List</button>
              <button class="rc-view ${arcView === "grid" ? "active" : ""}" data-view="grid" title="Grid view" style="padding:6px 10px; border:none; background:none; cursor:pointer; font-size:12px;">Grid</button>
            </div>
            <button class="button button-secondary button-small" id="rc-archive-refresh">Refresh</button>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; align-items:center;">
          <input type="text" id="rc-archive-search" placeholder="Search files..." style="flex:1; min-width:180px; padding:8px; border-radius:6px; border:1px solid var(--line); font-size:12px;" />
          <select id="rc-archive-fmt" style="padding:8px; border-radius:6px; border:1px solid var(--line); font-size:12px;">
            <option value="">All formats</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
          <select id="rc-archive-group" style="padding:8px; border-radius:6px; border:1px solid var(--line); font-size:12px;">
            <option value="">All files</option>
          </select>
          <select id="rc-archive-sort" style="padding:8px; border-radius:6px; border:1px solid var(--line); font-size:12px;">
            <option value="created_at">Newest</option>
            <option value="display_name">Name A–Z</option>
            <option value="size">Size</option>
            <option value="range_label">Period</option>
          </select>
        </div>
        <div id="rc-arc-rail" class="rc-rail" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;"></div>
        <div id="rc-bulk" class="rc-bulk-bar" style="display:none; align-items:center; gap:12px; margin-top:10px; padding:10px 12px; background:var(--primary-soft, #eef4ff); border-radius:8px;">
          <strong id="rc-bulk-label" style="font-size:12px;">0 selected</strong>
          <span style="flex:1;"></span>
          <button class="button button-accent button-small" id="rc-bulk-download">Download</button>
          <button class="button button-danger button-small" id="rc-bulk-delete">Delete</button>
        </div>
        <div id="rc-archive" style="margin-top:12px;"></div>
      </div>
    `;

    root.querySelectorAll(".rc-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCat.name = btn.dataset.cat;
        root.querySelectorAll(".rc-cat-btn").forEach(b => b.classList.toggle("active", b === btn));
        renderCards();
      });
    });

    renderCards();
    const re = document.getElementById("rc-archive-refresh");
    if (re) re.addEventListener("click", loadArchive);
    const f = document.getElementById("rc-archive-fmt");
    if (f) f.addEventListener("change", () => { arcFmt = f.value; setArcSelectedWithinVisible(); renderArchive(); });
    const s = document.getElementById("rc-archive-search");
    if (s) s.addEventListener("input", () => { arcQ = s.value; renderArchive(); });
    const dd = document.getElementById("rc-archive-group");
    if (dd) dd.addEventListener("change", () => { arcGroup = dd.value; renderArcRail(); renderArchive(); });
    const so = document.getElementById("rc-archive-sort");
    if (so) so.addEventListener("change", () => {
      const v = so.value;
      if (arcSort === v) arcSortDir = arcSortDir === "asc" ? "desc" : "asc";
      else { arcSort = v; arcSortDir = arcSort === "display_name" || arcSort === "range_label" ? "asc" : "desc"; }
      renderArchive();
    });
    loadArchive();
  };

  render();

  // Delegate: pill mode / date fields / download link refresh / ledger
  root.addEventListener("click", (e) => {
    const pill = e.target.closest(".rc-pill");
    if (pill) {
      e.preventDefault();
      const id = pill.dataset.id, mode = pill.dataset.mode;
      const st = reportState[id];
      st.mode = mode;
      if (mode !== "range") {
        const r = rcRangeFor(mode, st);
        st.start = r.start; st.end = r.end;
      }
      pill.closest(".rc-controls").querySelectorAll(".rc-pill").forEach(p => p.classList.toggle("active", p === pill));
      const fields = pill.closest(".rc-controls").querySelector(".rc-date-fields");
      fields.style.display = mode === "range" ? "flex" : "none";
      if (mode === "range") {
        const s = fields.querySelector(".rc-start").value = st.start;
        const en = fields.querySelector(".rc-end").value = st.end;
      }
      updateReportLinks(id);
      return;
    }

    const ledgerBtn = e.target.closest(".rc-ledger-btn");
    if (ledgerBtn) {
      e.preventDefault();
      const input = ledgerBtn.closest(".report-link-item").querySelector(".rc-ledger-search");
      const qraw = (input?.value || "").trim();
      if (!qraw) return toast("Enter a name or mobile", "warning");
      let q = qraw;
      const m = qraw.match(/\(([^)]+)\)/);
      if (m) q = m[1];
      const isMobile = /^[0-9]{10}$/.test(q);
      window.open(`/api/admin/customer-ledger.pdf?${isMobile ? 'mobile' : 'name'}=${encodeURIComponent(q)}`, "_blank");
      return;
    }

    const delBtn = e.target.closest(".rc-archive-del");
    if (delBtn) {
      e.preventDefault();
      const id = delBtn.dataset.id;
      if (confirm("Delete this archived report permanently?")) {
        api(`/api/admin/reports/archive/${encodeURIComponent(id)}`, { method: "DELETE" })
          .then(() => { toast("Archived report deleted", "success"); arcSelected.delete(id); loadArchive(); })
          .catch(() => toast("Failed to delete report", "error"));
      }
      return;
    }

    const viewBtn = e.target.closest(".rc-view");
    if (viewBtn) {
      arcView = viewBtn.dataset.view;
      root.querySelectorAll(".rc-view").forEach(b => b.classList.toggle("active", b.dataset.view === arcView));
      renderArchive();
      return;
    }

    const folderBtn = e.target.closest(".rc-folder");
    if (folderBtn) {
      arcGroup = folderBtn.dataset.group || "";
      renderArcRail();
      renderArchive();
      return;
    }

    const sortHead = e.target.closest(".arc-sort");
    if (sortHead) {
      const k = sortHead.dataset.sort;
      if (arcSort === k) arcSortDir = arcSortDir === "asc" ? "desc" : "asc";
      else { arcSort = k; arcSortDir = k === "display_name" || k === "range_label" ? "asc" : "desc"; }
      renderArchive();
      return;
    }

    const selAll = e.target.closest("#arc-selall");
    if (selAll) {
      if (selAll.checked) visibleArcFiles().forEach(f => arcSelected.add(f.id));
      else arcSelected.clear();
      renderArchive();
      return;
    }

    const chk = e.target.closest(".arc-chk");
    if (chk) {
      if (chk.checked) arcSelected.add(chk.dataset.id); else arcSelected.delete(chk.dataset.id);
      renderArchive();
      return;
    }

    const bulkDel = e.target.closest("#rc-bulk-delete");
    if (bulkDel) {
      e.preventDefault();
      const ids = Array.from(arcSelected);
      if (!ids.length) return;
      if (confirm(`Delete ${ids.length} archived file(s) permanently?`)) {
        api("/api/admin/reports/archive/batch-delete", { method: "POST", body: JSON.stringify({ ids }), headers: { "Content-Type": "application/json" } })
          .then(() => { toast("Files deleted", "success"); arcSelected.clear(); loadArchive(); })
          .catch(() => toast("Failed to delete files", "error"));
      }
      return;
    }

    const bulkDl = e.target.closest("#rc-bulk-download");
    if (bulkDl) {
      e.preventDefault();
      Array.from(arcSelected).forEach(id => {
        window.open(`/api/admin/reports/archive/download?id=${encodeURIComponent(id)}`, "_blank");
      });
      return;
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.classList.contains("rc-start") || e.target.classList.contains("rc-end")) {
      const id = e.target.dataset.id;
      const ctl = root.querySelector(`.rc-controls[data-id="${id}"]`);
      const start = ctl.querySelector(".rc-start").value;
      const end = ctl.querySelector(".rc-end").value;
      if (start && end) {
        const st = reportState[id];
        st.start = start; st.end = end; st.mode = "range";
        updateReportLinks(id);
      }
    }
  });

  const updateReportLinks = (id) => {
    const st = reportState[id];
    const ctl = root.querySelector(`.rc-controls[data-id="${id}"]`);
    if (!ctl) return;
    const q = `&start=${st.start}&end=${st.end}`;
    ctl.querySelector(".rc-dl-pdf").href = `/api/admin/reports.pdf?scope=${id}${q}`;
    ctl.querySelector(".rc-dl-csv").href = `/api/admin/reports.csv?scope=${id}${q}`;
    const lbl = ctl.querySelector('div[style*="font-size:11px"]');
    if (lbl) lbl.textContent = `${st.start} → ${st.end}`;
  };

  // Populate ledger datalist (datalist-less: we allow free text, fine)
};

const renderAdminPage = async () => {
  const root = document.querySelector("#admin-root");

  try {
    const { user } = await api("/api/me");
    if (user.role !== "admin") throw new Error("Unauthorized");
    const dashboard = await api("/api/admin/dashboard");
    const recentOrders = dashboard.orders.slice(0, 6);
    const recentRequests = dashboard.requests.slice(0, 6);

    root.innerHTML = `
      <aside class="admin-sidebar">
        <div class="admin-sidebar-brand">
          <p class="eyebrow" style="color:rgba(255,255,255,0.5); margin-bottom:4px;">Techlab Enterprise</p>
          <h2 style="font-family:'Space Grotesk'; font-size:22px;">Control Panel</h2>
        </div>

        <nav class="admin-nav-vertical">
          <button class="admin-nav-item active" data-admin-view="service"><i data-lucide="wrench" style="width:16px;height:16px;"></i> Operations</button>
          <button class="admin-nav-item" data-admin-view="products"><i data-lucide="package" style="width:16px;height:16px;"></i> Inventory</button>
          <button class="admin-nav-item" data-admin-view="staff"><i data-lucide="users" style="width:16px;height:16px;"></i> Staffing</button>
          <button class="admin-nav-item" data-admin-view="order"><i data-lucide="shopping-cart" style="width:16px;height:16px;"></i> Revenue</button>
          <button class="admin-nav-item" data-admin-view="suppliers"><i data-lucide="building" style="width:16px;height:16px;"></i> Parties</button>
          <button class="admin-nav-item" data-admin-view="purchase"><i data-lucide="file-text" style="width:16px;height:16px;"></i> Purchasing <span class="notification-badge" id="admin-purchase-badge" style="display:none; margin-left:auto;"></span></button>
          <button class="admin-nav-item" data-admin-view="intelligence"><i data-lucide="bar-chart-3" style="width:16px;height:16px;"></i> Intelligence</button>
          <button class="admin-nav-item" data-admin-view="reports"><i data-lucide="file-text" style="width:16px;height:16px;"></i> Reports</button>
        </nav>

        <div class="admin-sidebar-footer">
          <div class="growth-card-compact">
            <div class="growth-card-header">
              <span class="growth-card-label">MONTHLY GOAL</span>
              <span class="growth-card-pct">${Math.floor((dashboard.summary.revenue / 1000000) * 100)}%</span>
            </div>
            <div class="progress-container">
              <div class="progress-fill" style="width: ${Math.min(100, (dashboard.summary.revenue / 1000000) * 100)}%;"></div>
            </div>
          </div>
          <button class="admin-nav-item" data-action="logout" style="color:var(--danger);"><i data-lucide="log-out" style="width:16px;height:16px;"></i> Logout</button>
        </div>
      </aside>

      <main class="admin-content-area">
        <header class="admin-top-strip">
          <div>
            <h1 style="font-size:18px;">Welcome back, ${escapeHtml(user.name.split(' ')[0])}</h1>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <div class="admin-liquidity" style="text-align:right; line-height:1.2;">
              <span class="admin-liquidity-label">Daily Liquidity</span>
              <strong class="admin-liquidity-value">${formatCurrency((dashboard.summary.todayCash || 0) + (dashboard.summary.todayUpi || 0))}</strong>
            </div>
            <button class="button button-accent button-small" onclick="window.openDayEndModal()"><i data-lucide="banknote" style="width:12px;height:12px;"></i> Closing Report</button>
            <button class="button button-secondary button-small" onclick="openBusinessSettings()"><i data-lucide="settings" style="width:12px;height:12px;"></i> Settings</button>
          </div>
        </header>

        <div class="admin-main-scroll">
          <div class="admin-stats-strip">
            <div class="mini-stat"><span class="lbl">Services</span><span class="val">${dashboard.summary.serviceRequests}</span></div>
            <div class="mini-stat"><span class="lbl">Waitlist</span><span class="val">${dashboard.summary.pendingScheduling}</span></div>
            <div class="mini-stat"><span class="lbl">Fulfilled</span><span class="val">${dashboard.summary.completedVisits}</span></div>
            <div class="mini-stat"><span class="lbl">Orders</span><span class="val">${dashboard.summary.orders}</span></div>
            <div class="mini-stat" style="cursor:pointer;" onclick="openAdminPartiesModal()" title="View parties &amp; dues"><span class="lbl">Parties</span><span class="val">${dashboard.summary.partyCount}</span></div>
            <div class="mini-stat" style="cursor:pointer;" onclick="openAdminDueModal()" title="View all dues"><span class="lbl">Due</span><span class="val" style="color:var(--danger);">${formatCurrency(dashboard.summary.totalDues)}</span></div>
            <div class="mini-stat"><span class="lbl">Sales</span><span class="val">${formatCurrency(dashboard.summary.revenue)}</span></div>
          </div>

          <section class="admin-dashboard-panels">
        <section class="admin-view-panel is-active" data-admin-panel="service">
          <div class="dashboard-cards">
            ${renderMetricCards([
              { label: "Service Requests", value: dashboard.summary.serviceRequests, note: "Pending" },
              { label: "Pending", value: dashboard.summary.pendingScheduling, note: "Scheduling" },
              { label: "Completed", value: dashboard.summary.completedVisits, note: "Visits" },
              { label: "Active Customers", value: dashboard.summary.activeCustomers, note: "Total" },
            ])}
          </div>
          <article class="table-wrap">
            <p class="eyebrow">Recent Service Requests</p>
            <table>
              <thead><tr><th>Customer</th><th>Request Type</th><th>Request For</th><th>Status</th><th>Bill</th></tr></thead>
              <tbody>
                ${recentRequests.map((request) => `
                  <tr>
                    <td>${escapeHtml(request.customer_name)}</td>
                    <td>
                      ${escapeHtml(request.device_type)}
                      ${request.conveyance_expense > 0 ? `<br/><span class="inline-meta" style="color:var(--text-soft);">Exp: Rs. ${request.conveyance_expense}</span>` : ''}
                    </td>
                    <td>${renderRequestContextMarkup(request)}</td>
                    <td><span class="chip ${getStatusTone(request.status)}">${escapeHtml(request.status)}</span></td>
                    <td><span class="chip ${request.bill_status === 'billed' ? 'success' : 'neutral'}">${escapeHtml(request.bill_status || 'none')}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </article>
        </section>

        <section class="admin-view-panel" data-admin-panel="products">
          <div class="dashboard-cards">
            ${renderMetricCards([
              { label: "Products", value: dashboard.summary.products, note: "Total items" },
              { label: "Product Value", value: formatCurrency(dashboard.summary.productValue), note: "Stock value" },
            ])}
          </div>
          ${renderProductManagementSection(dashboard.products, "admin", "Product Catalog")}
        </section>

        <section class="admin-view-panel" data-admin-panel="staff">
          <div class="panel-grid">
            <article class="dashboard-panel admin-staff-form-panel">
              <p class="eyebrow">Create Staff Account</p>
              <h2>Add new staff</h2>
              <form id="staff-create-form" class="stack-form">
                <label>Name<input name="name" type="text" required /></label>
                <label>Email<input name="email" type="email" required /></label>
                <label>Mobile<input name="mobile" type="tel" required pattern="[0-9]{10}" /></label>
                <label>
                  Role
                  <select name="role" required>
                    <option value="employee">Service Coordinator</option>
                    <option value="sales">Sales</option>
                    <option value="technician">Service Technician</option>
                  </select>
                </label>
                <label>Password<input name="password" type="password" required /></label>
                <button class="button button-primary" type="submit">Create</button>
                <p id="staff-create-status" class="inline-status"></p>
              </form>
            </article>
            <article class="table-wrap">
              <p class="eyebrow">Staff List</p>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Mobile</th><th></th></tr></thead>
                <tbody>
                  ${dashboard.staff.map((staffMember) => `<tr><td>${staffMember.name}</td><td>${formatRoleLabel(staffMember.role)}</td><td>${staffMember.email}</td><td>${staffMember.mobile}</td><td class="action-stack"><button type="button" class="button button-secondary button-small" data-staff-reset="${staffMember.id}" data-staff-name="${escapeHtml(staffMember.name)}">Reset Password</button><button type="button" class="button button-small button-danger" data-staff-delete="${staffMember.id}">Remove</button></td></tr>`).join("")}
                </tbody>
              </table>
            </article>
          </div>
        </section>

        <section class="admin-view-panel" data-admin-panel="order">
          <div class="dashboard-cards">
            ${renderMetricCards([
              { label: "Orders", value: dashboard.summary.orders, note: "Total" },
              { label: "Revenue", value: formatCurrency(dashboard.summary.revenue), note: "Total" },
            ])}
          </div>
          <article class="table-wrap">
            <p class="eyebrow">Recent Product Orders</p>
            <table>
              <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${recentOrders.map((order) => `<tr><td>#${order.id.slice(-6)}</td><td>${escapeHtml(order.customer_name)}</td><td>${formatCurrency(order.total_amount)}</td><td><span class="chip ${getStatusTone(order.status)}">${escapeHtml(order.status)}</span></td><td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td></tr>`).join("")}
              </tbody>
            </table>
          </article>

          <article class="table-wrap" style="margin-top: 2rem;">
            <p class="eyebrow">Service Billing (Revenue from Service Requests)</p>
            <table>
              <thead><tr><th>Service ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${dashboard.requests.filter(r => r.bill_status === 'billed').map((req) => {
                  const amtPaid = Number(req.amount_paid) || 0;
                  const disc = Number(req.discount_amount) || 0;
                  const bal = (Number(req.bill_amount) || 0) - amtPaid - disc;
                  const statusChip = req.payment_status === 'paid'
                    ? '<span class="chip success">Paid</span>'
                    : amtPaid > 0
                      ? `<span class="chip warning">Partial</span>`
                      : '<span class="chip neutral">Pending</span>';
                  return `
                    <tr>
                      <td>#${req.id.slice(-6)}</td>
                      <td>${escapeHtml(req.customer_name)}</td>
                      <td>${formatCurrency(req.bill_amount)}${amtPaid > 0 || disc > 0 ? `<br/><span style="font-size:11px; color:var(--muted);">Paid ${formatCurrency(amtPaid)}${disc > 0 ? ` · Discount ${formatCurrency(disc)}` : ''}${bal > 0 ? ` · Balance ${formatCurrency(bal)}` : ''}</span>` : ''}</td>
                      <td>${statusChip}</td>
                      <td>${req.bill_date ? new Date(req.bill_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  `;
                }).join("") || '<tr><td colspan="5" style="text-align:center;">No billed services yet</td></tr>'}
              </tbody>
            </table>
          </article>
        </section>

        <section class="admin-view-panel" data-admin-panel="suppliers">
          <div class="sec-head">
            <h2>Parties</h2>
            <div style="display:flex; gap:8px; align-items:center;">
              <div class="admin-party-filter-chips" style="display:flex; gap:4px;">
                <button class="chip-btn active" data-admin-party-filter="all">All</button>
                <button class="chip-btn" data-admin-party-filter="supplier">Suppliers</button>
                <button class="chip-btn" data-admin-party-filter="customer">Customers</button>
              </div>
              <button class="btn" id="admin-add-party-btn">+ Add Party</button>
            </div>
          </div>
          <div id="admin-party-list" class="table-wrap"></div>
        </section>

        <section class="admin-view-panel" data-admin-panel="purchase">
          <div class="sec-head">
            <h2>Supplier Quotes — Approval</h2>
            <div style="display:flex; gap:8px; align-items:center;">
              <div class="admin-quote-filter-chips" style="display:flex; gap:4px;">
                <button class="chip-btn active" data-admin-quote-filter="all">All</button>
                <button class="chip-btn" data-admin-quote-filter="pending">Pending</button>
                <button class="chip-btn" data-admin-quote-filter="approved">Approved</button>
                <button class="chip-btn" data-admin-quote-filter="rejected">Rejected</button>
              </div>
            </div>
          </div>
          <p style="color:var(--muted); font-size:12px; margin: 4px 0 12px;">Approving a pending supplier quote converts it into a Purchase Order.</p>
          <article class="table-wrap">
            <table>
              <thead><tr><th>Quote #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Action</th></tr></thead>
              <tbody id="admin-quotes-tbody"><tr><td colspan="8" style="text-align:center;">Loading quotes...</td></tr></tbody>
            </table>
          </article>
          <article class="table-wrap" style="margin-top: 2rem;">
            <p class="eyebrow">Recent Purchase Orders</p>
            <table>
              <thead><tr><th>PO #</th><th>Date</th><th>Supplier</th><th>Total</th><th>Status</th></tr></thead>
              <tbody id="admin-po-tbody"><tr><td colspan="5" style="text-align:center;">Loading POs...</td></tr></tbody>
            </table>
          </article>
        </section>

        <section class="admin-view-panel" data-admin-panel="intelligence">
          <div id="analytics-container">
            <p style="padding:20px; color:var(--muted);">Loading Business Intelligence Visuals...</p>
          </div>
        </section>

        <section class="admin-view-panel" data-admin-panel="reports">
          <div class="sec-head">
            <h2>Reports Center</h2>
            <p style="color:var(--text-soft); font-size:12px;">Any report, any time frame — as PDF or CSV.</p>
          </div>
          <div id="reports-center"></div>
        </section>
      </section>
    `;

    // Mobile Bottom Nav for Admin
    const mobileNav = document.createElement("nav");
    mobileNav.className = "mobile-nav";
    mobileNav.innerHTML = `
        <div class="mobile-nav-item active" data-admin-nav="service"><i data-lucide="wrench"></i><span>Ops</span></div>
        <div class="mobile-nav-item" data-admin-nav="products"><i data-lucide="package"></i><span>Stock</span></div>
        <div class="mobile-nav-item" data-admin-nav="order"><i data-lucide="shopping-cart"></i><span>Sales</span></div>
        <div class="mobile-nav-item" data-admin-nav="intelligence"><i data-lucide="pie-chart"></i><span>Insights</span></div>
        <div class="mobile-nav-item" data-admin-nav="reports"><i data-lucide="file-text"></i><span>Docs</span></div>
    `;
    root.appendChild(mobileNav);

    mobileNav.addEventListener("click", (e) => {
      const item = e.target.closest(".mobile-nav-item");
      if (!item) return;
      const view = item.dataset.adminNav;
      const desktopBtn = root.querySelector(`.admin-nav-item[data-admin-view="${view}"]`);
      if (desktopBtn) desktopBtn.click();

      mobileNav.querySelectorAll(".mobile-nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
    });

    bindLogout();
    mountProductManagement(dashboard.products, "admin");
    mountAdminViewTabs();
    mountAdminSettingsHandlers();

    // ── Reports Center (admin) ──
    mountReportsCenter(document.getElementById("reports-center"), user);

    // ── Admin Parties ──
    let adminPartyFilter = 'all';

    const loadAdminParties = async () => {
      const typeParam = adminPartyFilter === 'all' ? '' : adminPartyFilter;
      const res = await api(`/api/parties${typeParam ? `?type=${typeParam}` : ''}`);
      const adminParties = res.parties || [];
      const list = document.getElementById("admin-party-list");
      if (!list) return;
      list.innerHTML = adminParties.length ? `
        <table class="data-table" style="table-layout:auto;">
          <thead>
            <tr>
              <th>Party</th>
              <th>Type</th>
              <th>Contact Person</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>GST</th>
              <th>Purchases</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            ${adminParties.map(p => {
              const badges = [];
              if (p.is_supplier) badges.push('<span class="chip" style="font-size:10px; background:var(--accent-soft);">Supplier</span>');
              if (p.is_customer) badges.push('<span class="chip" style="font-size:10px; background:var(--primary-soft);">Customer</span>');
              const due = p.dues || 0;
              return `
              <tr data-admin-view-party="${p.id}" style="cursor:pointer;">
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${badges.length ? badges.join(' ') : '-'}</td>
                <td>${p.contact_person ? escapeHtml(p.contact_person) : '-'}</td>
                <td>${p.mobile ? escapeHtml(p.mobile) : '-'}</td>
                <td>${p.email ? escapeHtml(p.email) : '-'}</td>
                <td>${p.gst_number ? escapeHtml(p.gst_number) : '-'}</td>
                <td>${formatCurrency(p.total_purchases || 0)}</td>
                <td style="${due > 0 ? 'color:var(--danger); font-weight:bold;' : ''}">${due > 0 ? formatCurrency(due) : '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>` : '<p class="empty">No parties found</p>';
    };
    await loadAdminParties();

    document.querySelector(".admin-party-filter-chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-admin-party-filter]");
      if (!btn) return;
      document.querySelectorAll("[data-admin-party-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      adminPartyFilter = btn.dataset.adminPartyFilter;
      loadAdminParties();
    });

    document.getElementById("admin-add-party-btn-quick")?.addEventListener("click", () => {
      document.getElementById("supplier-modal-title").textContent = "Add Party";
      document.getElementById("supplier-submit-btn").textContent = "Add Party";
      document.getElementById("supplier-form").reset();
      document.getElementById("supplier-modal").classList.add("show");
    });

    document.getElementById("admin-add-party-btn")?.addEventListener("click", () => {
      document.getElementById("supplier-modal-title").textContent = "Add Party";
      document.getElementById("supplier-submit-btn").textContent = "Add Party";
      document.getElementById("supplier-form").reset();
      document.getElementById("supplier-modal").classList.add("show");
    });

    document.getElementById("admin-party-list").addEventListener("click", async (e) => {
      const card = e.target.closest("[data-admin-view-party]");
      if (!card) return;
      const partyId = card.dataset.adminViewParty;
      try {
        const res = await api(`/api/parties/${partyId}`);
        const p = res.party;
        const purchases = res.purchases || [];
        currentViewPartyId = p.id;
        const viewModal = document.getElementById("supplier-view-modal");
        if (viewModal) viewModal.dataset.partyId = p.id;
        const badges = [];
        if (p.is_supplier) badges.push('<span class="chip" style="font-size:11px; background:var(--accent-soft);">Supplier</span>');
        if (p.is_customer) badges.push('<span class="chip" style="font-size:11px; background:var(--primary-soft);">Customer</span>');
        document.getElementById("supplier-view-title").innerHTML = `${escapeHtml(p.name)} ${badges.join(' ')}`;
        document.getElementById("supplier-view-content").innerHTML = `
          <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${escapeHtml(p.name)}</span></div>
          ${p.contact_person ? `<div class="detail-row"><span class="detail-label">Contact Person</span><span class="detail-value">${escapeHtml(p.contact_person)}</span></div>` : ""}
          ${p.mobile ? `<div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${escapeHtml(p.mobile)}</span></div>` : ""}
          ${p.email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(p.email)}</span></div>` : ""}
          ${p.address ? `<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${escapeHtml(p.address)}</span></div>` : ""}
          ${p.gst_number ? `<div class="detail-row"><span class="detail-label">GST Number</span><span class="detail-value">${escapeHtml(p.gst_number)}</span></div>` : ""}
          ${p.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(p.notes)}</span></div>` : ""}
        `;
        const outstanding = purchases.filter(pu => pu.payment_status === 'pending').reduce((sum, pu) => sum + (pu.total_cost || 0) + (pu.gst_total || 0), 0);
        document.getElementById("supplier-purchases-section").innerHTML = `
          <h4>Purchase History <span class="inline-meta">(${purchases.length} records)</span></h4>
          ${purchases.length ? `
          <table class="data-table" style="font-size:12px;">
            <thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Total (incl. GST)</th><th>Status</th></tr></thead>
            <tbody>${purchases.map(pu => `
              <tr>
                <td>${pu.purchase_date || '-'}</td>
                <td>${escapeHtml(pu.product_name)}</td>
                <td>${pu.quantity}</td>
                <td><strong>${formatCurrency((pu.total_cost || 0) + (pu.gst_total || 0))}</strong></td>
                <td><span class="chip ${pu.payment_status === 'paid' ? 'success' : 'warning'}">${pu.payment_status === 'paid' ? 'Paid' : 'Pending'}</span></td>
              </tr>
            `).join('')}</tbody>
          </table>` : '<p class="empty-message">No purchases recorded yet.</p>'}
        `;
        document.getElementById("supplier-view-modal").classList.add("show");
      } catch (err) { alert(err.message); }
    });

    window.closeSupplierViewModal = () => {
      document.getElementById("supplier-view-modal")?.classList.remove("show");
      currentViewPartyId = null;
    };

    if (!window.__adminSupplierFormBound) {
      window.__adminSupplierFormBound = true;

      document.getElementById("supplier-view-edit-btn")?.addEventListener("click", async () => {
        const viewModal = document.getElementById("supplier-view-modal");
        const partyId = viewModal?.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        viewModal?.classList.remove("show");
        try {
          const res = await api(`/api/parties/${partyId}`);
          const p = res.party;
          const form = document.getElementById("supplier-form");
          form.id.value = p.id;
          form.name.value = p.name;
          form.contactPerson.value = p.contact_person || "";
          form.mobile.value = p.mobile || "";
          form.email.value = p.email || "";
          form.address.value = p.address || "";
          form.gstNumber.value = p.gst_number || "";
          form.notes.value = p.notes || "";
          if (form.partyType) {
            form.partyType.value = p.is_supplier && p.is_customer ? "both" : p.is_supplier ? "supplier" : "customer";
          }
          document.getElementById("supplier-modal-title").textContent = "Edit Party";
          document.getElementById("supplier-submit-btn").textContent = "Save Changes";
          document.getElementById("supplier-modal").classList.add("show");
        } catch (err) { alert(err.message); }
      });

      document.getElementById("supplier-view-delete-btn")?.addEventListener("click", async () => {
        const viewModal = document.getElementById("supplier-view-modal");
        const partyId = viewModal?.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        if (!confirm("Delete this party permanently? Associated purchase records will also be deleted. This cannot be undone.")) return;
        try {
          await api(`/api/parties/${partyId}`, { method: "DELETE" });
          toast("Party deleted", "success");
          viewModal?.classList.remove("show");
          renderAdminPage();
        } catch (err) { alert(err.message); }
      });

      document.getElementById("supplier-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const title = document.getElementById("supplier-modal-title").textContent;
        const isEdit = title === "Edit Party";
        const partyType = (form.partyType && form.partyType.value) || "both";
        const payload = {
          name: form.name.value,
          contactPerson: form.contactPerson.value,
          mobile: form.mobile.value,
          email: form.email.value,
          address: form.address.value,
          gstNumber: form.gstNumber.value,
          notes: form.notes.value,
          isSupplier: partyType === "supplier" || partyType === "both",
          isCustomer: partyType === "customer" || partyType === "both"
        };
        const partyId = form.id.value || currentViewPartyId;
        try {
          if (isEdit && partyId) {
            await api(`/api/parties/${partyId}`, { method: "PATCH", body: JSON.stringify(payload) });
          } else {
            await api("/api/parties", { method: "POST", body: JSON.stringify(payload) });
          }
          closeSupplierModal();
          renderAdminPage();
        } catch (err) { alert(err.message); }
      });
    }

    document.querySelector("#staff-create-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const status = document.querySelector("#staff-create-status");
      status.textContent = "";
      try {
        await api("/api/admin/employees", {
          method: "POST",
          body: JSON.stringify({
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            mobile: String(formData.get("mobile")),
            role: String(formData.get("role")),
            password: String(formData.get("password")),
          }),
        });
        status.textContent = "Staff account created.";
        window.setTimeout(() => refreshPage(), 500);
      } catch (error) {
        status.textContent = error.message;
      }
    });

    root.querySelectorAll("[data-staff-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Remove this staff member? This cannot be undone.")) return;
        const status = document.querySelector("#staff-create-status");
        try {
          await api(`/api/admin/staff/${button.dataset.staffDelete}`, { method: "DELETE" });
          refreshPage();
        } catch (error) {
          status.textContent = error.message;
        }
      });
    });

    const resetModal = document.getElementById("password-reset-modal");
    const resetForm = document.getElementById("password-reset-form");
    const resetStatus = document.getElementById("password-reset-status");

    root.querySelectorAll("[data-staff-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        resetForm.staffId.value = button.dataset.staffReset;
        document.getElementById("password-reset-title").textContent = `Reset Password`;
        document.getElementById("password-reset-info").textContent = `Setting new password for: ${button.dataset.staffName}`;
        resetStatus.textContent = "";
        resetForm.reset();
        resetModal.classList.add("show");
      });
    });

    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const staffId = resetForm.staffId.value;
      const newPassword = resetForm.newPassword.value;
      resetStatus.textContent = "";
      try {
        await api(`/api/admin/staff/${staffId}/reset-password`, {
          method: "PATCH",
          body: JSON.stringify({ password: newPassword }),
        });
        resetStatus.textContent = "Password reset successfully.";
        setTimeout(() => {
          resetModal.classList.remove("show");
        }, 1200);
      } catch (error) {
        resetStatus.textContent = error.message;
      }
    });

    resetModal.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => resetModal.classList.remove("show"));
    });

    // ── Admin Purchase: supplier quotes approval ──
    const sqStatusChip = (status) => {
      const cls = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
      const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
      return `<span class="chip ${cls}">${label}</span>`;
    };

    const loadAdminQuotes = async (status = "") => {
      const tbody = document.getElementById("admin-quotes-tbody");
      if (!tbody) return;
      try {
        const res = await api(`/api/sales/quotes${status ? "?status=" + status : ""}`);
        const quotes = res.quotes || [];
        if (!quotes.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No quotes found.</td></tr>';
          return;
        }
        tbody.innerHTML = quotes.map(q => `
          <tr>
            <td><strong>${escapeHtml(q.quote_number)}</strong>${q.pdf_path ? ' <span class="chip info" title="PDF attached">PDF</span>' : ''}</td>
            <td>${escapeHtml(q.quote_date || '-')}</td>
            <td>${escapeHtml(q.supplier_name || '-')}</td>
            <td>${q.item_count || 0}</td>
            <td><strong>${formatCurrency(q.total_amount)}</strong></td>
            <td>${escapeHtml(q.valid_until || '-')}</td>
            <td>${sqStatusChip(q.status)}</td>
            <td class="action-stack">
              <button type="button" class="button button-small" data-admin-quote-view="${q.id}">View</button>
              ${q.status === "pending" ? `<button type="button" class="button button-small button-primary" data-admin-quote-approve="${q.id}">Approve</button><button type="button" class="button button-small button-danger" data-admin-quote-reject="${q.id}">Reject</button>` : '-'}
              </td>
            </tr>`).join('');
      } catch {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger);">Failed to load quotes.</td></tr>';
      }
      refreshPurchaseBadges();
    };

    const loadAdminPos = async () => {
      const tbody = document.getElementById("admin-po-tbody");
      if (!tbody) return;
      try {
        const res = await api("/api/sales/purchase-orders");
        const pos = (res.purchaseOrders || []).slice(0, 8);
        if (!pos.length) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No purchase orders yet.</td></tr>';
          return;
        }
        tbody.innerHTML = pos.map(o => `
          <tr>
            <td><strong>${escapeHtml(o.po_number)}</strong></td>
            <td>${escapeHtml(o.po_date || '-')}</td>
            <td>${escapeHtml(o.supplier_name || '-')}</td>
            <td><strong>${formatCurrency(o.total_amount)}</strong></td>
            <td><span class="chip ${o.status === "received" ? "success" : "warning"}">${o.status === "received" ? "Received" : o.status === "cancelled" ? "Cancelled" : "Ordered"}</span></td>
            <td class="action-stack">
              <button class="btn-sm button-accent po-view-btn" data-po-id="${o.id}">View</button>
              ${o.status !== "received" ? `<button class="btn-sm btn-danger po-delete-btn" data-po-id="${o.id}">Delete</button>` : ''}
            </td>
          </tr>`).join('');
      } catch {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger);">Failed to load POs.</td></tr>';
      }
    };

    const currentAdminQuoteId = window.__adminQuoteId = window.__adminQuoteId || { value: null };

    const openAdminQuoteView = async (quoteId) => {
      try {
        const res = await api(`/api/sales/quotes/${quoteId}`);
        const quote = res.quote;
        const items = res.items || [];
        currentAdminQuoteId.value = quoteId;
        document.getElementById("admin-quote-view-title").textContent = `Supplier Quote ${quote.quote_number}`;
        document.getElementById("admin-quote-view-content").innerHTML = `
          <div class="detail-row"><span class="detail-label">Supplier</span><span class="detail-value">${escapeHtml(quote.supplier_name || '')}</span></div>
          <div class="detail-row"><span class="detail-label">Quote Date</span><span class="detail-value">${escapeHtml(quote.quote_date || '-')}</span></div>
          ${quote.valid_until ? `<div class="detail-row"><span class="detail-label">Valid Until</span><span class="detail-value">${escapeHtml(quote.valid_until)}</span></div>` : ''}
          ${quote.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(quote.notes)}</span></div>` : ''}
          ${quote.pdf_path ? `<div class="detail-row"><span class="detail-label">PDF</span><span class="detail-value"><a href="/api/sales/quotes/${encodeURIComponent(quote.id)}/pdf" target="_blank" class="button button-small">Download original quote</a></span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${sqStatusChip(quote.status)}</span></div>
          ${quote.status === "pending" ? `<div style="margin-top:10px; padding:8px 10px; background:var(--bg-light); border:1px solid var(--border); border-radius:6px; font-size:12px; color:var(--muted);">Edit quantities or uncheck any items you don't want. Approving creates the Purchase Order with only the checked items.</div>` : ''}
          <div style="overflow-x:auto; margin-top:12px;">
            <table class="data-table" style="font-size:12px;">
              <thead><tr>${quote.status === "pending" ? '<th>Include</th>' : ''}<th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
              <tbody>${items.map(i => `
                <tr>
                  ${quote.status === "pending" ? `<td><input type="checkbox" class="admin-quote-item-include" data-item-id="${i.id}" data-qty="${i.quantity}" data-cost="${i.unit_cost}" checked /></td>` : ''}
                  <td>${escapeHtml(i.product_name)}</td>
                  ${quote.status === "pending"
                    ? `<td><input type="number" class="admin-quote-item-qty" min="1" step="1" value="${i.quantity}" style="width:64px; padding:4px 6px; border:1px solid var(--border); border-radius:4px;" /></td>`
                    : `<td>${i.quantity}</td>`}
                  <td>${formatCurrency(i.unit_cost)}</td>
                  <td><strong>${formatCurrency(i.quantity * i.unit_cost)}</strong></td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
          <div style="text-align:right; margin-top:10px; font-weight:bold;" id="admin-quote-approved-total">Total: ${formatCurrency(quote.total_amount)}</div>
        `;
        const approveBtn = document.getElementById("admin-quote-view-approve-btn");
        const rejectBtn = document.getElementById("admin-quote-view-reject-btn");
        if (approveBtn) approveBtn.style.display = quote.status === "pending" ? "" : "none";
        if (rejectBtn) rejectBtn.style.display = quote.status === "pending" ? "" : "none";
        if (quote.status === "pending") {
          const updateApprovedTotal = () => {
            let total = 0;
            document.querySelectorAll("#admin-quote-view-content .admin-quote-item-include:checked").forEach(cb => {
              const tr = cb.closest("tr");
              const qty = Number(tr.querySelector(".admin-quote-item-qty")?.value) || Number(cb.dataset.qty) || 0;
              total += qty * (Number(cb.dataset.cost) || 0);
            });
            const el = document.getElementById("admin-quote-approved-total");
            if (el) el.textContent = `PO Total: ${formatCurrency(total)}`;
          };
          document.querySelectorAll("#admin-quote-view-content .admin-quote-item-include").forEach(cb => cb.addEventListener("change", updateApprovedTotal));
          document.querySelectorAll("#admin-quote-view-content .admin-quote-item-qty").forEach(inp => inp.addEventListener("input", updateApprovedTotal));
          updateApprovedTotal();
        }
        document.getElementById("admin-quote-view-modal").classList.add("show");
      } catch (err) { alert(err.message); }
    };

    if (!window.__adminQuoteModalBound) {
      window.__adminQuoteModalBound = true;
      document.getElementById("admin-quote-view-approve-btn")?.addEventListener("click", async () => {
        if (!currentAdminQuoteId.value) return;
        const items = [...document.querySelectorAll("#admin-quote-view-content .admin-quote-item-include:checked")].map(cb => {
          const tr = cb.closest("tr");
          return { id: cb.dataset.itemId, quantity: Number(tr.querySelector(".admin-quote-item-qty")?.value) };
        });
        if (!items.length) return alert("Select at least one item to approve.");
        if (!confirm(`Approve this quote? A Purchase Order will be created with the ${items.length} checked item${items.length > 1 ? "s" : ""}.`)) return;
        try {
          const r = await api(`/api/sales/quotes/${currentAdminQuoteId.value}/approve`, { method: "POST", body: JSON.stringify({ items }) });
          closeAdminQuoteViewModal();
          toast(`Approved — ${r.poNumber} created`, "success");
          loadAdminQuotes();
          loadAdminPos();
        } catch (err) { alert(err.message); }
      });

      document.getElementById("admin-quote-view-reject-btn")?.addEventListener("click", async () => {
        if (!currentAdminQuoteId.value) return;
        if (!confirm("Reject this quote?")) return;
        try {
          await api(`/api/sales/quotes/${currentAdminQuoteId.value}/reject`, { method: "POST" });
          closeAdminQuoteViewModal();
          toast("Quote rejected", "success");
          loadAdminQuotes();
        } catch (err) { alert(err.message); }
      });
    }

    window.closeAdminQuoteViewModal = () => {
      document.getElementById("admin-quote-view-modal")?.classList.remove("show");
      currentAdminQuoteId.value = null;
    };

    document.getElementById("admin-quotes-tbody")?.addEventListener("click", async (e) => {
      const view = e.target.closest("[data-admin-quote-view]");
      const approve = e.target.closest("[data-admin-quote-approve]");
      const reject = e.target.closest("[data-admin-quote-reject]");
      if (view) return openAdminQuoteView(view.dataset.adminQuoteView);
      if (approve) {
        if (!confirm("Approve this quote? A Purchase Order will be created from it.")) return;
        try {
          const r = await api(`/api/sales/quotes/${approve.dataset.adminQuoteApprove}/approve`, { method: "POST" });
          toast(`Approved — ${r.poNumber} created`, "success");
          loadAdminQuotes();
          loadAdminPos();
        } catch (err) { alert(err.message); }
        return;
      }
      if (reject) {
        if (!confirm("Reject this quote?")) return;
        try {
          await api(`/api/sales/quotes/${reject.dataset.adminQuoteReject}/reject`, { method: "POST" });
          toast("Quote rejected", "success");
          loadAdminQuotes();
        } catch (err) { alert(err.message); }
      }
    });

    document.querySelector(".admin-quote-filter-chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-admin-quote-filter]");
      if (!btn) return;
      document.querySelectorAll("[data-admin-quote-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadAdminQuotes(btn.dataset.adminQuoteFilter === "all" ? "" : btn.dataset.adminQuoteFilter);
    });

    document.getElementById("admin-po-tbody")?.addEventListener("click", async (e) => {
      // Global listener on document handles .po-view-btn and .po-delete-btn
    });

    await loadAdminQuotes();
    await loadAdminPos();
  } catch {
    window.location.href = "login.html";
  }
};

const renderEmployeePage = async () => {
  const root = document.querySelector("#employee-root");

  try {
    const { user } = await api("/api/me");
    if (user.role !== "employee") throw new Error("Unauthorized");
    const dashboard = await api("/api/employee/dashboard");

    root.innerHTML = `
      <section class="dashboard-top">
        <div>
          <p class="eyebrow">Service Dashboard</p>
          <h1>${escapeHtml(user.name)}</h1>
          <p class="inline-meta">Schedule service persons, update service status, and generate technician reports.</p>
        </div>
        <div class="dashboard-nav">
          <a href="/api/employee/reports.pdf?scope=services" class="button button-secondary button-small">Daily Dispatch (PDF)</a>
          <a href="/api/employee/reports.csv?scope=services" class="button button-secondary button-small">Completion Log (CSV)</a>
          <button type="button" data-action="logout">Logout</button>
        </div>
      </section>
      <section class="dashboard-cards">
        ${renderMetricCards([
          { label: "Assigned Requests", value: dashboard.summary.assignedRequests, note: "All service tasks visible to the technician team" },
          { label: "Requested", value: dashboard.summary.requested, note: "New requests waiting to be scheduled" },
          { label: "Scheduled", value: dashboard.summary.scheduled, note: "Visits planned for dispatch and field work" },
          { label: "Completed", value: dashboard.summary.completed, note: "Visits successfully finished" },
        ])}
      </section>
      <section class="dashboard-layout">
        <article class="dashboard-panel">
          <p class="eyebrow">Technician Reports</p>
          <h2>Export daily service activity</h2>
          <p class="panel-copy">Generate print-ready PDF reports for field execution or export CSV for spreadsheet analysis.</p>
          <div class="report-actions">
            <a class="button button-primary" href="/api/employee/reports.pdf?scope=services">Daily Dispatch PDF</a>
            <a class="button button-secondary" href="/api/employee/reports.csv?scope=services">Completion CSV</a>
          </div>
        </article>
        <article class="dashboard-panel">
          <p class="eyebrow">Dispatch Snapshot</p>
          <h2>Service queue health</h2>
          <ul class="summary-list">
            <li>Waiting scheduling: ${dashboard.summary.requested}</li>
            <li>Already scheduled: ${dashboard.summary.scheduled}</li>
            <li>Closed visits: ${dashboard.summary.completed}</li>
            <li>Pending field work: ${dashboard.summary.assignedRequests - dashboard.summary.completed}</li>
          </ul>
        </article>
      </section>
      <section class="table-wrap">
        <p class="eyebrow">Service Requests</p>
        <table>
          <thead><tr><th>Customer</th><th>Request Type</th><th>Request For</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${dashboard.requests.map((request) => `
              <tr>
                <td>${escapeHtml(request.customer_name)}<br /><span class="inline-meta">${escapeHtml(request.customer_mobile)}</span></td>
                <td>
                  ${escapeHtml(request.device_type)}
                  ${request.conveyance_expense > 0 ? `<br/><span class="inline-meta" style="color:var(--text-soft);">Exp: Rs. ${request.conveyance_expense}</span>` : ''}
                  <br /><span class="inline-meta">${escapeHtml(request.issue)}</span>
                </td>
                <td>${renderRequestContextMarkup(request)}</td>
                <td>${request.scheduled_date || request.preferred_date}<br /><span class="inline-meta">${request.service_person || "Not scheduled"}</span></td>
                <td><span class="chip ${getStatusTone(request.status)}">${request.status}</span></td>
                <td class="action-stack">
                  ${request.status === 'Completed' || request.status === 'Canceled' ? '' :
                    request.status === 'Pending' ?
                    `<button class="button button-secondary" type="button" data-assign="${request.id}">Assign</button>
                    <button class="button button-secondary" type="button" data-schedule="${request.id}">Schedule</button>
                    <button class="button button-secondary" type="button" data-complete="${request.id}">Complete</button>` :
                    `<button class="button button-secondary" type="button" data-complete="${request.id}">Complete</button>`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `;

    bindLogout();

    const techniciansRes = await api("/api/admin/technicians");
    const technicians = techniciansRes.technicians;

    root.querySelectorAll("[data-assign]").forEach((button) => {
      button.addEventListener("click", async () => {
        const techId = prompt("Enter technician ID to assign:");
        if (!techId) return;
        const tech = technicians.find(t => t.id === techId);
        if (!tech) {
          window.alert("Technician not found");
          return;
        }
        try {
          await api(`/api/employee/service-requests/${button.dataset.assign}/assign`, {
            method: "PATCH",
            body: JSON.stringify({ technicianId: tech.id, technicianName: tech.name }),
          });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    root.querySelectorAll("[data-schedule]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await api(`/api/employee/service-requests/${button.dataset.schedule}/schedule`, { method: "PATCH" });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    root.querySelectorAll("[data-complete]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await api(`/api/employee/service-requests/${button.dataset.complete}/complete`, { method: "PATCH" });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });
  } catch {
    window.location.href = "login.html";
  }
};

const renderTechnicianPage = async () => {
  document.body.setAttribute("data-page", "technician");
  const root = document.querySelector("#technician-root");

  try {
    const { user } = await api("/api/me");
    if (user.role !== "technician") throw new Error("Unauthorized");
    const dashboard = await api("/api/technician/dashboard");
    const { requests, summary, availablePool } = dashboard;
    window.__techProducts = dashboard.products || [];

    const assignedRequests = requests.filter(r => r.status !== 'Completed');
    const completedRequests = requests.filter(r => r.status === 'Completed');
    const poolRequests = availablePool || [];
    const techInitials = (user.name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

    const getDraftsCount = () => {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('survey_draft_')) count++;
      }
      return count;
    };

    const draftsCount = getDraftsCount();
    let draftsNotice = '';
    if (draftsCount > 0) {
      draftsNotice = `<div class="card-alert warning" style="margin: 20px 0; border-radius:12px; display:flex; align-items:center; gap:12px; padding:15px 20px;">
              <span style="font-size:16px;"><i data-lucide="alert-triangle" style="width:18px;height:18px;color:var(--warning);"></i></span>
        <div>
          <strong style="display:block;">Unsynced Survey Drafts</strong>
          <span style="font-size:13px; opacity:0.9;">You have ${draftsCount} draft(s) saved locally. Open the jobs to submit them when online.</span>
        </div>
      </div>`;
    }

    root.innerHTML = `
      <div class="tech-hero">
        <div class="tech-hero-user">
          <div class="tech-avatar">${escapeHtml(techInitials)}</div>
          <div>
            <div class="tech-hello">Welcome back</div>
            <h1>${escapeHtml(user.name)}</h1>
            <div class="tech-role">
              <span class="chip info">Service Technician</span>
              <span class="tech-date">${escapeHtml(todayLabel)}</span>
            </div>
          </div>
        </div>
        <div class="top-actions">
          <button class="btn" data-action="logout">Logout</button>
        </div>
      </div>

      <div class="stats">
        <div class="stat stat-accent">
          <span class="stat-ico"><i data-lucide="wrench" style="width:18px;height:18px;"></i></span>
          <span class="val">${poolRequests.length}</span>
          <span class="lbl">Available Pool</span>
        </div>
        <div class="stat stat-info">
          <span class="stat-ico">📋</span>
          <span class="val">${summary.assignedRequests}</span>
          <span class="lbl">Assigned</span>
        </div>
        <div class="stat stat-warning">
          <span class="stat-ico">⏳</span>
          <span class="val">${summary.scheduled}</span>
          <span class="lbl">In Progress</span>
        </div>
        <div class="stat stat-success">
          <span class="stat-ico"><i data-lucide="check-circle-2" style="width:18px;height:18px;"></i></span>
          <span class="val">${summary.completed}</span>
          <span class="lbl">Completed</span>
        </div>
      </div>

      ${draftsNotice}

      <div class="chrome-tabs-container" style="margin-top:20px;">
        <div class="chrome-tabs">
          <div class="chrome-tab active" data-tab="active">
            <span class="tab-label">Active (${assignedRequests.length})</span>
          </div>
          <div class="chrome-tab" data-tab="available">
            <span class="tab-label">Available (${poolRequests.length})</span>
          </div>
          <div class="chrome-tab" data-tab="history">
            <span class="tab-label">History (${completedRequests.length})</span>
          </div>
          <div class="chrome-tab-end"></div>
        </div>
      </div>

      <div id="active-tasks" class="tab-pane active">
        <div class="section">
          <div class="sec-head"><h2>Active Tasks</h2></div>
          <div class="tech-card-grid">
            ${assignedRequests.length ? assignedRequests.map(r => renderTechCard(r)).join('') : '<div class="empty-message">No active tasks.</div>'}
          </div>
        </div>
      </div>

      <div id="available-tasks" class="tab-pane" style="display:none;">
        <div class="section">
          <div class="sec-head"><h2>Available Pool</h2></div>
          <div class="tech-card-grid">
            ${poolRequests.length ? poolRequests.map(r => renderTechCard(r, true)).join('') : '<div class="empty-message">No tasks available to accept.</div>'}
          </div>
        </div>
      </div>

      <div id="history-tasks" class="tab-pane" style="display:none;">
        <div class="section">
          <div class="sec-head" style="flex-direction:column; align-items:flex-start; gap:15px;">
            <h2>Service History</h2>
            <div class="search-box" style="width:100%;">
              <input type="text" id="history-search" placeholder="Search by name, ID, or device..." style="padding:10px 14px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text); width:100%; max-width:400px;" />
            </div>
          </div>

          <!-- Nested Tabs: Category Filter Chips -->
          <div class="filter-chips">
            <button class="chip-btn active" data-filter="all">All</button>
            <button class="chip-btn" data-filter="New Device Purchase">New Device</button>
            <button class="chip-btn" data-filter="Device Service">Device</button>
            <button class="chip-btn" data-filter="New Installation (Site Visit)">New Installation</button>
            <button class="chip-btn" data-filter="Installation Service">Installation</button>
          </div>

          <div class="tech-card-grid" id="history-grid">
            ${completedRequests.length ? completedRequests.map(r => renderTechCard(r)).join('') : '<div class="empty-message">No completed tasks yet.</div>'}
          </div>
        </div>
      </div>

      <!-- Site Visit Survey Modal -->
      <div id="survey-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:640px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h2 id="survey-modal-title">Site Visit Survey</h2>
            <button class="modal-close" id="survey-modal-close">&times;</button>
          </div>
          <form id="survey-form" class="stack-form" enctype="multipart/form-data">
            <input type="hidden" name="request_id" id="survey-request-id" />

            <div id="survey-existing-section" style="display:none;">
              <div class="survey-section-title">Existing Installation Details</div>
              <label>Existing Setup Notes<textarea name="existing_setup_notes" rows="2" placeholder="Describe what is already installed..."></textarea></label>
              <label>Work Needed<textarea name="work_needed" rows="2" placeholder="What needs to be added or replaced..."></textarea></label>
            </div>

            <div class="survey-section-title">Cameras</div>
            <div class="survey-camera-bar">
              <button type="button" class="chip-btn active" data-camera-type="Dome">Dome</button>
              <button type="button" class="chip-btn" data-camera-type="Bullet">Bullet</button>
              <button type="button" class="chip-btn" data-camera-type="PTZ">PTZ</button>
            </div>
            <div id="camera-rows"></div>

            <div class="survey-section-title">NVR / DVR</div>
            <div class="survey-field-row">
              <label style="flex:1;">Needed<select name="nvr_needed" id="nvr-needed"><option value="no">No</option><option value="yes">Yes</option></select></label>
              <label style="flex:1;">Type<select name="nvr_type" id="nvr-type"><option value="DVR">DVR</option><option value="NVR">NVR</option></select></label>
            </div>
            <div id="nvr-details" style="display:none;">
              <div class="survey-field-row">
                <label style="flex:1;">Channels<input name="nvr_channels" type="number" min="1" max="64" value="4" /></label>
                <label style="flex:1;">Brand / Model<input name="nvr_brand" type="text" placeholder="e.g. Hikvision" /></label>
              </div>
            </div>

            <div class="survey-section-title" id="power-section-title" style="display:none;">Power</div>
            <div id="power-section" style="display:none;">
              <div class="survey-field-row">
                <label style="flex:1;">Type<span id="power-type-display" class="survey-auto-value">—</span>
                  <input type="hidden" name="power_type" id="power-type-value" value="" />
                </label>
                <label style="flex:1;">Channels<input name="power_channels" type="number" min="1" max="64" value="4" /></label>
              </div>
              <div class="survey-field-row">
                <label style="flex:1;">Brand / Model<input name="power_brand" type="text" placeholder="e.g. Hikvision" /></label>
              </div>
            </div>

            <div class="survey-section-title">Cables</div>
            <div id="cable-rows"></div>
            <button type="button" class="button button-accent button-small" id="add-cable-row">+ Add Cable</button>

            <div class="survey-section-title">Mounting Hardware</div>
            <div class="survey-field-row">
              <label style="flex:1;">Brackets<input name="mount_brackets" type="number" min="0" value="0" /></label>
              <label style="flex:1;">Poles<input name="mount_poles" type="number" min="0" value="0" /></label>
            </div>
            <div class="survey-field-row">
              <label style="flex:1;">Camera Box<input name="mount_boxes" type="number" min="0" value="0" /></label>
              <label style="flex:1;">Other<input name="mount_other" type="text" placeholder="Other hardware" /></label>
            </div>

            <div class="survey-section-title">Additional Parts</div>
            <div id="parts-rows"></div>
            <button type="button" class="button button-accent button-small" id="add-part-row">+ Add Part</button>

            <div class="survey-section-title">Photos</div>
            <div class="survey-photo-upload">
              <label class="survey-photo-label">
                <input type="file" id="survey-photos" accept="image/*" multiple style="display:none;" />
                <span>+ Add Photos</span>
              </label>
              <div id="survey-photo-preview" class="survey-photo-grid"></div>
            </div>

            <label>Technician Notes<textarea name="notes" rows="3" placeholder="Any additional observations..."></textarea></label>

            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <button class="button button-primary" type="submit">Submit Survey</button>
              <button class="button button-secondary" type="button" id="survey-draft-btn">Save as Draft</button>
              <button type="button" class="btn" id="survey-cancel-btn">Cancel</button>
            </div>
            <p id="survey-status" class="inline-status"></p>
          </form>
        </div>
      </div>

      <!-- View Survey Modal (Tech Read-only) -->
      <div id="survey-view-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:640px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h2>Site Visit Survey</h2>
            <button class="modal-close" id="survey-view-close">&times;</button>
          </div>
          <div id="survey-view-content"></div>
        </div>
      </div>

      <!-- Request Parts Modal (Tech) -->
      <div id="tech-part-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:640px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h2>Request Parts</h2>
            <button class="modal-close" id="tech-part-modal-close">&times;</button>
          </div>
          <div class="stack-form">
            <label>Pick Parts from Inventory
              <input type="text" id="tech-part-search" placeholder="Search products..." />
            </label>
            <div id="tech-part-list" style="max-height:280px; overflow-y:auto; border:1px solid var(--line); border-radius:6px;"></div>
            <div id="tech-part-selected" style="margin-top:4px;"></div>
            <label>Parts Not in Inventory (for Procurement)
              <textarea id="tech-part-procurement" rows="2" placeholder="e.g. Hikvision 4MP Dome camera, 50m RG59 cable, connector set..."></textarea>
            </label>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <button class="button button-primary" type="button" id="tech-part-submit">Request Parts</button>
              <button type="button" class="btn" id="tech-part-cancel">Cancel</button>
            </div>
            <p id="tech-part-status" class="inline-status"></p>
          </div>
        </div>
      </div>

      <!-- Used Items Modal (Tech) -->
      <div id="used-items-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:520px; max-height:92vh; overflow-y:auto;">
          <div class="modal-header">
            <h2>Mark Job Complete</h2>
            <button class="modal-close" id="used-items-close">&times;</button>
          </div>
          <form id="used-items-form" class="stack-form">
            <p style="font-size:13px; color:var(--text-soft); margin-bottom:12px;">Requested parts are already listed below with their cost. Add a service charge and any extra items used on this job.</p>

            <div class="survey-section-title">Service Charge</div>
            <input type="number" id="used-service-charge" min="0" placeholder="Enter service charge (Rs.)" style="width:100%; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text);" />
            <span style="font-size:12px; color:var(--muted);">Adds a "Service charges" line to the job. You can adjust it in the list below.</span>

            <div class="survey-section-title" style="margin-top:14px;">Extra Services</div>
            <div id="used-services-chips" class="filter-chips" style="gap:6px; flex-wrap:wrap;"></div>

            <div class="survey-section-title" style="margin-top:14px;">Products</div>
            <input type="text" id="used-product-search" placeholder="Search products..." style="width:100%; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text);" />
            <div id="used-products-list" style="max-height:180px; overflow-y:auto; border:1px solid var(--line); border-radius:6px; margin-top:6px;"></div>

            <div class="survey-section-title" style="margin-top:14px;">Conveyance Expense (Fuel/Parking)</div>
            <input type="number" id="used-conveyance-expense" min="0" placeholder="0" style="width:100%; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text);" />

            <div class="survey-section-title" style="margin-top:14px;">Used On This Job</div>
            <div id="used-selected-items"></div>
            <p id="used-selected-empty" style="font-size:12px; color:var(--muted);">Nothing selected yet.</p>
            <p style="text-align:right; font-weight:bold; font-size:15px; margin-top:6px;">Total: Rs. <span id="used-items-total">0</span></p>

            <div style="display:flex; gap:10px; margin-top:16px;">
              <button class="button button-primary" type="submit" id="used-items-submit">Complete Job</button>
              <button type="button" class="btn" id="used-items-cancel">Cancel</button>
            </div>
            <p id="used-items-status" class="inline-status"></p>
          </form>
        </div>
      </div>
    `;

    function renderTechCard(r, isPool = false) {
      const isSiteVisit = r.device_type === 'New Installation (Site Visit)' || (r.device_type === 'Old Installation Service' || r.device_type === 'Installation Service');
      const surveyStatus = r.survey_status || 'none';

      let statusChip = '';
      if (r.status === 'Completed') statusChip = 'success';
      else if (isPool) statusChip = 'info';
      else statusChip = 'warning';

      let statusLabel = r.status === 'Pending' && isPool ? 'Available' : r.status;
      if (!isPool && isSiteVisit && surveyStatus === 'submitted') statusLabel += ' (Survey Done)';

      let cardTone = 'tone-pending';
      if (r.status === 'Completed') cardTone = 'tone-done';
      else if (r.status === 'Scheduled') cardTone = 'tone-progress';
      else if (isPool) cardTone = 'tone-pool';

      const custInitials = (r.customer_name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

      const callBtn = (mobile) => `<a href="tel:${encodeURIComponent(mobile)}" class="button button-secondary tech-call" style="text-decoration:none;"><i data-lucide="phone" style="width:12px;height:12px;"></i> Call</a>`;

      let actions = '';
      if (isPool) {
        actions = `<button class="button button-accent tech-accept" type="button" data-accept-task="${r.id}" style="width:100%;">✓ Accept Task</button>`;
      } else if (r.status === 'Completed') {
        actions = `<div class="tech-done-note"><i data-lucide="check-circle-2" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Completed on ${r.scheduled_date || r.preferred_date}</div>`;
        if (r.conveyance_expense > 0) {
          actions += `<div class="tech-done-note" style="margin-top:4px; font-size:13px; color:var(--text-soft);">Conveyance: Rs. ${r.conveyance_expense}</div>`;
        }
      } else if (isSiteVisit && surveyStatus === 'none') {
        actions = `
          <button class="button button-accent" type="button" data-fill-survey="${r.id}">Fill Site Survey</button>
          ${callBtn(r.customer_mobile)}
        `;
      } else if (isSiteVisit && (surveyStatus === 'submitted' || surveyStatus === 'reviewed')) {
        actions = `
          <button class="button button-primary" type="button" data-view-survey-tech="${r.id}">Complete Job</button>
          ${callBtn(r.customer_mobile)}
        `;
      } else {
        actions = `
          <button class="button button-primary" type="button" data-complete="${r.id}">Mark Complete</button>
          ${r.part_request_status === 'available' ? `
            <button class="button button-success" type="button" data-collect-part="${r.id}">Collect Part</button>
          ` : `
            <button class="button button-accent" type="button" data-request-parts="${r.id}">Request Parts</button>
          `}
          ${callBtn(r.customer_mobile)}
        `;
      }

      return `
        <div class="tech-card ${cardTone}">
          <div class="tech-card-top">
            <span class="tech-card-id">#${r.id.slice(-8)}</span>
            <span class="chip ${statusChip}">${statusLabel}</span>
          </div>
          <div class="tech-card-customer">
            <div class="tech-cust-avatar">${custInitials}</div>
            <div class="tech-cust-info">
              <div class="tech-card-customer-name">${escapeHtml(r.customer_name)}</div>
              <div class="tech-cust-mobile">${escapeHtml(r.customer_mobile || 'No contact')}</div>
            </div>
          </div>
          <div class="tech-card-meta">
              <span title="Request Type"><i data-lucide="wrench" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(r.device_type)}</span>
            <span title="Preferred Date">📅 ${escapeHtml(r.preferred_date)}</span>
          </div>
          <div class="tech-card-est">
            <span class="est-lbl">Estimated Cost</span>
            <strong>${formatCurrency(r.estimated_cost || 0)}</strong>
          </div>
          ${!isPool && r.requested_parts ? `
            <div class="tech-parts-row">🧩 ${escapeHtml(formatRequestedParts(r.requested_parts))}</div>
          ` : ''}
          ${!isPool && r.part_request_status === 'available' ? `
            <div class="card-alert success">
              <i data-lucide="check-circle-2" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Part Available — Collect from Sales Office
            </div>
          ` : ''}
          ${!isPool && r.part_request_status === 'requested' ? `
            <div class="card-alert warning">
              ⏳ Part Requested — Waiting for Procurement
            </div>
          ` : ''}
          <div class="tech-card-issue">${escapeHtml(r.issue)}</div>
          <div class="tech-card-actions">
            ${actions}
          </div>
        </div>
      `;
    }

    const historySearch = document.getElementById("history-search");
    const chipBtns = document.querySelectorAll(".chip-btn");
    let currentFilter = "all";

    const updateHistoryGrid = () => {
      const query = (historySearch?.value || "").toLowerCase();
      const grid = document.getElementById("history-grid");
      if (!grid) return;

      const filtered = completedRequests.filter(r => {
        const matchesSearch = (r.id || "").toLowerCase().includes(query) ||
                              (r.customer_name || "").toLowerCase().includes(query) ||
                              (r.device_type || "").toLowerCase().includes(query) ||
                              (r.issue || "").toLowerCase().includes(query);
        const matchesChip = currentFilter === "all" || r.device_type === currentFilter;
        return matchesSearch && matchesChip;
      });
      grid.innerHTML = filtered.length
        ? filtered.map(r => renderTechCard(r)).join('')
        : '<div class="empty-message">No matching history found.</div>';
    };

    if (historySearch) {
      historySearch.oninput = updateHistoryGrid;
    }

    chipBtns.forEach(btn => {
      btn.onclick = () => {
        chipBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        updateHistoryGrid();
      };
    });

    document.querySelectorAll(".chrome-tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll(".chrome-tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.style.display = "none");
        tab.classList.add("active");
        const paneId = tab.dataset.tab + "-tasks";
        const pane = document.getElementById(paneId);
        if (pane) pane.style.display = "block";
      };
    });

    bindLogout();

    document.querySelectorAll("[data-accept-task]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to accept this task? It will be assigned to you.")) return;
        try {
          await api(`/api/technician/service-requests/${button.dataset.acceptTask}/accept`, { method: "PATCH" });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    const techPartState = { selection: {}, products: [] };

    const renderTechPartSelected = () => {
      const container = document.getElementById("tech-part-selected");
      const rows = Object.values(techPartState.selection);
      container.innerHTML = rows.length ? `
        <div style="padding:10px; background:var(--surface); border:1px solid var(--line); border-radius:6px;">
          <strong style="display:block; margin-bottom:4px;">Selected Parts:</strong>
          ${rows.map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 0; border-top:1px dashed var(--line);">
              <span>${escapeHtml(s.product.name)} <span style="color:var(--text-soft);">@ ${formatCurrency(s.product.price)}</span></span>
              <span style="display:flex; align-items:center; gap:6px;">
                <button type="button" class="survey-row-btn" data-qty-dec="${s.product.id}">−</button>
                <strong>${s.qty}</strong>
                <button type="button" class="survey-row-btn" data-qty-inc="${s.product.id}">+</button>
                <button type="button" class="survey-row-btn" data-part-remove="${s.product.id}" title="Remove">&times;</button>
              </span>
            </div>
          `).join('')}
          <div style="margin-top:6px; text-align:right;"><strong>Total: ${formatCurrency(rows.reduce((t, s) => t + s.qty * s.product.price, 0))}</strong></div>
        </div>
      ` : '';
    };

    const renderTechPartList = () => {
      const list = document.getElementById("tech-part-list");
      const query = (document.getElementById("tech-part-search")?.value || "").toLowerCase();
      const filtered = techPartState.products.filter(p => p && ((p.name || "") + " " + (p.type || "")).toLowerCase().includes(query));
      list.innerHTML = filtered.length ? filtered.map(p => {
        const sel = techPartState.selection[p.id];
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--line);">
            <div>
              <strong>${escapeHtml(p.name)}</strong><br>
              <span style="font-size:12px; color:var(--text-soft);">${escapeHtml(p.type || '')} · ${formatCurrency(p.price)} · Stock: ${p.stock}</span>
            </div>
            ${sel ? `<button type="button" class="button button-small button-accent" data-part-add="${p.id}">Added (${sel.qty})</button>` : `<button type="button" class="button button-small button-primary" data-part-add="${p.id}">Add</button>`}
          </div>
        `;
      }).join('') : '<div class="empty-message" style="padding:14px;">No products in stock.</div>';
    };

    const openTechPartModal = (requestId) => {
      const modal = document.getElementById("tech-part-modal");
      if (!modal) return;
      techPartState.selection = {};
      techPartState.products = (window.__techProducts || []).filter(p => Number(p.stock) > 0);
      const search = document.getElementById("tech-part-search");
      if (search) search.value = "";
      const procurement = document.getElementById("tech-part-procurement");
      if (procurement) procurement.value = "";
      const status = document.getElementById("tech-part-status");
      if (status) status.textContent = "";
      renderTechPartList();
      renderTechPartSelected();
      modal.dataset.requestId = requestId;
      modal.style.display = "flex";
    };

    document.querySelectorAll("[data-request-parts]").forEach((button) => {
      button.addEventListener("click", () => openTechPartModal(button.dataset.requestParts));
    });

    const techPartListEl = document.getElementById("tech-part-list");
    const techPartSelectedEl = document.getElementById("tech-part-selected");
    techPartListEl?.addEventListener("click", (e) => {
      const add = e.target.closest("[data-part-add]");
      if (!add) return;
      const id = add.dataset.partAdd;
      const product = techPartState.products.find(p => p.id === id);
      if (!product) return;
      techPartState.selection[id] = { product, qty: (techPartState.selection[id]?.qty || 0) + 1 };
      renderTechPartList();
      renderTechPartSelected();
    });
    techPartSelectedEl?.addEventListener("click", (e) => {
      const inc = e.target.closest("[data-qty-inc]");
      const dec = e.target.closest("[data-qty-dec]");
      const remove = e.target.closest("[data-part-remove]");
      const id = (inc || dec || remove)?.dataset.qtyInc || (dec || remove)?.dataset.qtyDec || remove?.dataset.partRemove;
      if (!id || !techPartState.selection[id]) return;
      if (remove) {
        delete techPartState.selection[id];
      } else if (inc) {
        techPartState.selection[id].qty += 1;
      } else if (dec) {
        techPartState.selection[id].qty -= 1;
        if (techPartState.selection[id].qty <= 0) delete techPartState.selection[id];
      }
      renderTechPartList();
      renderTechPartSelected();
    });
    document.getElementById("tech-part-search")?.addEventListener("input", renderTechPartList);
    document.getElementById("tech-part-cancel")?.addEventListener("click", () => {
      document.getElementById("tech-part-modal").style.display = "none";
    });
    document.getElementById("tech-part-modal-close")?.addEventListener("click", () => {
      document.getElementById("tech-part-modal").style.display = "none";
    });
    document.getElementById("tech-part-submit")?.addEventListener("click", async () => {
      const modal = document.getElementById("tech-part-modal");
      const status = document.getElementById("tech-part-status");
      const inventory = Object.values(techPartState.selection).map(s => ({
        productId: s.product.id,
        name: s.product.name,
        qty: s.qty,
        unitPrice: s.product.price,
      }));
      const procurement = document.getElementById("tech-part-procurement")?.value.trim() || "";
      if (!inventory.length && !procurement) {
        status.textContent = "Add at least one part or a procurement note.";
        return;
      }
      status.textContent = "Submitting...";
      try {
        await api(`/api/technician/service-requests/${modal.dataset.requestId}/parts`, {
          method: "PATCH",
          body: JSON.stringify({ inventory, procurement }),
        });
        modal.style.display = "none";
        refreshPage();
      } catch (error) {
        status.textContent = error.message;
      }
    });

    document.querySelectorAll("[data-collect-part]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await api(`/api/technician/service-requests/${button.dataset.collectPart}/part-collected`, { method: "PATCH" });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-complete]").forEach((button) => {
      button.addEventListener("click", () => {
        const req = (requests || []).find((r) => r.id === button.dataset.complete) || {};
        openUsedItemsModal(button.dataset.complete, async (usedItems) => {
          try {
            await api(`/api/technician/service-requests/${button.dataset.complete}/status`, {
              method: "PATCH",
              body: JSON.stringify({ status: "Completed", used_items: usedItems }),
            });
            closeUsedItemsModal();
            refreshPage();
          } catch (error) {
            document.getElementById("used-items-status").textContent = error.message;
          }
        }, req.requested_parts);
      });
    });

    // Survey functionality
    const isSiteVisitType = (dt) => dt === 'New Installation (Site Visit)' || dt === 'Old Installation Service' || dt === 'Installation Service';

    const addCameraRow = (formFactor = 'Dome', count = 0, resolution = '', mounting = '') => {
      const container = document.getElementById('camera-rows');
      const row = document.createElement('div');
      row.className = 'survey-dynamic-row';
      row.dataset.formFactor = formFactor;

      const nvrNeeded = document.getElementById('nvr-needed')?.value === 'yes';
      const nvrType = document.getElementById('nvr-type')?.value;
      const technology = nvrNeeded ? (nvrType === 'NVR' ? 'IP' : 'Analog') : '';
      const showTechDropdown = !nvrNeeded;

      row.innerHTML = `
        <span class="survey-camera-label">${formFactor}</span>
        <input type="hidden" name="camera_form_factor[]" value="${formFactor}" />
        <input type="hidden" name="camera_technology[]" value="${technology}" />
        ${showTechDropdown ? `<select name="camera_tech_select[]" class="survey-input-quarter"><option value="IP">IP</option><option value="Analog">Analog</option><option value="Wireless">Wireless</option></select>` : ''}
        <button type="button" class="survey-row-btn" data-action="decrement">−</button>
        <input type="number" name="camera_count[]" value="${count}" min="0" class="survey-input-quarter" placeholder="Qty" />
        <button type="button" class="survey-row-btn" data-action="increment">+</button>
        <input type="text" name="camera_resolution[]" value="${resolution}" class="survey-input-quarter" placeholder="Resolution" />
        <input type="text" name="camera_mounting[]" value="${mounting}" class="survey-input-quarter" placeholder="Mount" />
        <button type="button" class="survey-row-remove" data-action="remove">&times;</button>
      `;

      row.querySelector('[data-action="increment"]').addEventListener('click', () => {
        const input = row.querySelector('[name="camera_count[]"]');
        input.value = Number(input.value) + 1;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      row.querySelector('[data-action="decrement"]').addEventListener('click', () => {
        const input = row.querySelector('[name="camera_count[]"]');
        const newVal = Number(input.value) - 1;
        if (newVal < 0) return;
        input.value = newVal;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      row.querySelector('[data-action="remove"]').addEventListener('click', () => row.remove());

      container.appendChild(row);
    };

    const addCableRow = (type = 'Cat6', boxes = '', mtrs = '') => {
      const container = document.getElementById('cable-rows');
      const row = document.createElement('div');
      row.className = 'survey-dynamic-row';
      row.innerHTML = `
        <select name="cable_type[]" class="survey-input-half">
          <option value="Cat6" ${type === 'Cat6' ? 'selected' : ''}>Cat6</option>
          <option value="Cat6a" ${type === 'Cat6a' ? 'selected' : ''}>Cat6a</option>
          <option value="Coaxial" ${type === 'Coaxial' ? 'selected' : ''}>Coaxial</option>
          <option value="Fiber" ${type === 'Fiber' ? 'selected' : ''}>Fiber Optic</option>
          <option value="Power Cable" ${type === 'Power Cable' ? 'selected' : ''}>Power Cable</option>
          <option value="HDMI" ${type === 'HDMI' ? 'selected' : ''}>HDMI</option>
          <option value="Other" ${type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        <input type="number" name="cable_boxes[]" value="${boxes || (type === 'Cat6' || type === 'Cat6a' ? 1 : '')}" min="1" class="survey-input-quarter" placeholder="Boxes" style="display:${type === 'Cat6' || type === 'Cat6a' ? 'inline-block' : 'none'};" />
        <input type="number" name="cable_mtrs[]" value="${mtrs}" min="0" step="0.5" class="survey-input-quarter" placeholder="Mtrs" style="display:${type === 'Power Cable' || type === 'HDMI' ? 'inline-block' : 'none'};" />
        <button type="button" class="survey-row-remove" onclick="this.parentElement.remove()">&times;</button>
      `;
      const typeSelect = row.querySelector('[name="cable_type[]"]');
      const boxesInput = row.querySelector('[name="cable_boxes[]"]');
      const mtrsInput = row.querySelector('[name="cable_mtrs[]"]');
      typeSelect.addEventListener('change', () => {
        const isCat = typeSelect.value === 'Cat6' || typeSelect.value === 'Cat6a';
        const isMtr = typeSelect.value === 'Power Cable' || typeSelect.value === 'HDMI';
        boxesInput.style.display = isCat ? 'inline-block' : 'none';
        mtrsInput.style.display = isMtr ? 'inline-block' : 'none';
        if (isCat && !boxesInput.value) boxesInput.value = 1;
        if (!isMtr) mtrsInput.value = '';
      });
      container.appendChild(row);
    };

    const addPartRow = (name = '', qty = 1, notes = '') => {
      const container = document.getElementById('parts-rows');
      const row = document.createElement('div');
      row.className = 'survey-dynamic-row';
      row.innerHTML = `
        <input type="text" name="part_name[]" value="${name}" class="survey-input-third" placeholder="Part name" />
        <input type="number" name="part_qty[]" value="${qty || 1}" min="1" class="survey-input-quarter" placeholder="Qty" />
        <input type="text" name="part_notes[]" value="${notes}" class="survey-input-third" placeholder="Notes" />
        <button type="button" class="survey-row-remove" onclick="this.parentElement.remove()">&times;</button>
      `;
      container.appendChild(row);
    };

    document.querySelectorAll('[data-camera-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.cameraType;
        const existingRow = document.querySelector(`#camera-rows [data-form-factor="${type}"]`);
        if (existingRow) {
          const input = existingRow.querySelector('[name="camera_count[]"]');
          input.value = Number(input.value) + 1;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          addCameraRow(type, 1);
        }
      });
    });

    document.getElementById('add-cable-row').addEventListener('click', () => addCableRow());
    document.getElementById('add-part-row').addEventListener('click', () => addPartRow());

    const nextPowerOf2 = (n) => {
      if (n <= 0) return 0;
      if (n <= 4) return 4;
      if (n <= 8) return 8;
      if (n <= 16) return 16;
      if (n <= 32) return 32;
      return 64;
    };

    const getTotalCameras = () => {
      let total = 0;
      document.querySelectorAll('[name="camera_count[]"]').forEach(input => {
        total += Number(input.value) || 0;
      });
      return total;
    };

    const updateAutomatedSurveyFields = () => {
      const total = getTotalCameras();

      // Update Junction Boxes automatically
      const boxesInput = document.querySelector('[name="mount_boxes"]');
      if (boxesInput) boxesInput.value = total;

      if (document.getElementById('nvr-needed').value !== 'yes') return;
      const channels = nextPowerOf2(total);
      if (channels > 0) {
        document.querySelector('[name="nvr_channels"]').value = channels;
        document.querySelector('[name="power_channels"]').value = channels;
      }
    };

    const updateCameraTechnology = () => {
      const nvrNeeded = document.getElementById('nvr-needed').value === 'yes';
      const nvrType = document.getElementById('nvr-type').value;
      const technology = nvrNeeded ? (nvrType === 'NVR' ? 'IP' : 'Analog') : '';

      document.querySelectorAll('#camera-rows .survey-dynamic-row').forEach(row => {
        row.querySelector('[name="camera_technology[]"]').value = technology;
        const techSelect = row.querySelector('[name="camera_tech_select[]"]');
        if (techSelect) techSelect.style.display = nvrNeeded ? 'none' : 'inline-block';
      });
    };

    const updatePowerType = () => {
      const nvrNeeded = document.getElementById('nvr-needed').value === 'yes';
      const nvrType = document.getElementById('nvr-type').value;
      const powerType = nvrNeeded ? (nvrType === 'NVR' ? 'PoE Switch' : 'SMPS Power Supply') : '';
      const powerTitle = document.getElementById('power-section-title');
      const powerSection = document.getElementById('power-section');
      if (nvrNeeded) {
        powerTitle.style.display = 'block';
        powerTitle.textContent = powerType;
        powerSection.style.display = 'block';
      } else {
        powerTitle.style.display = 'none';
        powerSection.style.display = 'none';
      }
      document.getElementById('power-type-value').value = nvrNeeded ? (nvrType === 'NVR' ? 'PoE' : 'SMPS') : '';
      document.getElementById('power-type-display').textContent = nvrNeeded ? (nvrType === 'NVR' ? 'PoE' : 'SMPS') : '—';
    };

    document.getElementById('camera-rows').addEventListener('input', (e) => {
      if (e.target.name === 'camera_count[]') updateAutomatedSurveyFields();
    });

    new MutationObserver(() => updateAutomatedSurveyFields()).observe(document.getElementById('camera-rows'), { childList: true });

    document.getElementById('nvr-needed').addEventListener('change', (e) => {
      document.getElementById('nvr-details').style.display = e.target.value === 'yes' ? 'block' : 'none';
      if (e.target.value === 'yes') {
        updateAutomatedSurveyFields();
        updateCameraTechnology();
        updatePowerType();
      } else {
        updateCameraTechnology();
        updatePowerType();
      }
    });

    document.getElementById('nvr-type').addEventListener('change', () => {
      updateCameraTechnology();
      updatePowerType();
    });

    // Photo preview
    const photoInput = document.getElementById('survey-photos');
    const photoPreview = document.getElementById('survey-photo-preview');
    let selectedPhotoFiles = [];

    const renderPhotoPreview = () => {
      photoPreview.innerHTML = selectedPhotoFiles.map((file, i) => {
        const url = URL.createObjectURL(file);
        return `<div class="survey-photo-thumb"><img src="${url}" alt="Photo ${i + 1}" /><button type="button" data-remove-photo="${i}" aria-label="Remove photo">&times;</button></div>`;
      }).join('');
    };

    photoInput.addEventListener('change', (e) => {
      selectedPhotoFiles = Array.from(e.target.files || []);
      renderPhotoPreview();
    });

    photoPreview.addEventListener('click', (e) => {
      const button = e.target.closest('[data-remove-photo]');
      if (!button) return;
      const index = Number(button.dataset.removePhoto);
      if (!Number.isInteger(index) || index < 0) return;
      selectedPhotoFiles.splice(index, 1);
      renderPhotoPreview();
    });

    // Open survey modal
    document.querySelectorAll("[data-fill-survey]").forEach((button) => {
      button.addEventListener("click", async () => {
        const requestId = button.dataset.fillSurvey;
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        document.getElementById('survey-request-id').value = requestId;
        document.getElementById('survey-modal-title').textContent = 'Site Visit Survey';
        document.getElementById('survey-status').textContent = '';

        const isExisting = request.device_type === 'Old Installation Service' || request.device_type === 'Installation Service';
        document.getElementById('survey-existing-section').style.display = isExisting ? 'block' : 'none';

        document.getElementById('camera-rows').innerHTML = '';
        document.getElementById('cable-rows').innerHTML = '';
        document.getElementById('parts-rows').innerHTML = '';
        photoPreview.innerHTML = '';
        selectedPhotoFiles = [];
        document.getElementById('survey-form').reset();

        addCameraRow('Dome', 0);
        addCableRow();

        document.getElementById('power-section').style.display = 'none';
        document.getElementById('power-section-title').style.display = 'none';

        const draft = loadSurveyDraft(requestId);
        if (draft) {
          if (confirm('A local draft was found for this survey. Would you like to restore it?')) {
            populateSurveyForm(draft);
          }
        }

        document.getElementById('survey-modal').style.display = 'flex';
      });
    });

    // View survey (tech read-only)
    document.querySelectorAll("[data-view-survey-tech]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const requestId = button.dataset.viewSurveyTech;
          const { survey } = await api(`/api/technician/service-requests/${requestId}/survey`);
          if (!survey) { window.alert('No survey found'); return; }
          const req = (requests || []).find((r) => r.id === requestId) || {};
          renderSurveyView(survey, 'survey-view-content', true, requestId, req.requested_parts);
          document.getElementById('survey-view-modal').style.display = 'flex';
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.getElementById('survey-modal-close').addEventListener('click', () => {
      document.getElementById('survey-modal').style.display = 'none';
    });
    document.getElementById('survey-cancel-btn').addEventListener('click', () => {
      document.getElementById('survey-modal').style.display = 'none';
    });
    document.getElementById('survey-view-close').addEventListener('click', () => {
      document.getElementById('survey-view-modal').style.display = 'none';
    });

    // Used Items modal (services + products consumed on this job)
    let usedItemsOnSave = null;
    let usedItemsState = [];

    const renderUsedSelectedItems = () => {
      const container = document.getElementById('used-selected-items');
      const empty = document.getElementById('used-selected-empty');
      if (!container) return;
      if (!usedItemsState.length) {
        container.innerHTML = '';
        if (empty) empty.style.display = '';
      } else {
        if (empty) empty.style.display = 'none';
        container.innerHTML = usedItemsState.map((item, idx) => `
          <div data-used-index="${idx}" style="display:flex; align-items:center; gap:8px; padding:7px 6px; border:1px solid var(--line); border-radius:8px; margin-bottom:6px; background:var(--surface);">
            <span style="flex:1; min-width:0; font-size:13px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</span>
            <input type="number" class="used-item-rate" value="${Number(item.price) || 0}" min="0" title="Rate (Rs.)" style="width:70px; padding:5px 6px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
            <button type="button" class="survey-row-btn" data-used-qty-minus="${idx}">−</button>
            <span style="min-width:26px; text-align:center; font-size:13px; font-weight:600;">${item.qty}</span>
            <button type="button" class="survey-row-btn" data-used-qty-plus="${idx}">+</button>
            <span style="min-width:82px; text-align:right; font-weight:700; font-size:13px;" class="used-item-amount">Rs. ${(Number(item.qty) || 1) * (Number(item.price) || 0)}</span>
            <button type="button" class="survey-row-remove" data-used-remove="${idx}" title="Remove">&times;</button>
          </div>
        `).join('');
      }
      container.querySelectorAll('[data-used-qty-minus]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.usedQtyMinus);
          if (usedItemsState[i].qty > 1) usedItemsState[i].qty -= 1;
          renderUsedSelectedItems();
        });
      });
      container.querySelectorAll('[data-used-qty-plus]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.usedQtyPlus);
          usedItemsState[i].qty += 1;
          renderUsedSelectedItems();
        });
      });
      container.querySelectorAll('[data-used-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          usedItemsState.splice(Number(btn.dataset.usedRemove), 1);
          renderUsedSelectedItems();
        });
      });
      container.querySelectorAll('.used-item-rate').forEach((input) => {
        input.addEventListener('input', () => {
          const item = usedItemsState[Number(input.closest('[data-used-index]').dataset.usedIndex)];
          if (!item) return;
          item.price = Number(input.value) || 0;
          const row = input.closest('[data-used-index]');
          const amt = row.querySelector('.used-item-amount');
          if (amt) amt.textContent = `Rs. ${(Number(item.qty) || 1) * item.price}`;
          updateUsedItemsTotal();
        });
      });
      updateUsedItemsTotal();
    };

    const updateUsedItemsTotal = () => {
      const totalEl = document.getElementById('used-items-total');
      if (!totalEl) return;
      const total = usedItemsState.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);
      totalEl.textContent = total;
    };

    const addUsedItem = (item) => {
      const existing = usedItemsState.find((x) => x.key === item.key);
      if (existing) {
        existing.qty += item.qty;
      } else {
        usedItemsState.push({ ...item });
      }
      renderUsedSelectedItems();
    };

    const renderUsedServiceChips = () => {
      const container = document.getElementById('used-services-chips');
      const products = window.__techProducts || [];
      const presets = [
        { name: 'Service & Labor', price: 0 },
        { name: 'Repair Charges', price: 0 },
        { name: 'AMC Service', price: 0 },
      ];
      products.forEach((p) => {
        if (p.type !== 'Service') return;
        if (!presets.some((s) => s.name === p.name)) {
          presets.push({ name: p.name, price: Number(p.price) || 0, product_id: p.id });
        }
      });
      container.innerHTML = presets.map((s) => `
        <button type="button" class="chip-btn" data-service-preset="${escapeHtml(s.name)}" data-service-price="${s.price || 0}" data-service-product="${s.product_id || ''}">${escapeHtml(s.name)}${s.price ? ` &middot; Rs. ${s.price}` : ''}</button>
      `).join('');
      container.querySelectorAll('[data-service-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          addUsedItem({
            type: 'service',
            name: btn.dataset.servicePreset,
            qty: 1,
            price: Number(btn.dataset.servicePrice) || 0,
            product_id: btn.dataset.serviceProduct || null,
            key: `service-${btn.dataset.servicePreset}`,
          });
        });
      });
    };

    const renderUsedProducts = (query = '') => {
      const list = document.getElementById('used-products-list');
      const products = (window.__techProducts || []).filter((p) => p.type !== 'Service');
      const q = (query || '').toLowerCase();
      const filtered = q ? products.filter((p) => p && (p.name || "").toLowerCase().includes(q)) : products;
      if (!filtered.length) {
        list.innerHTML = '<p style="font-size:12px; color:var(--muted); padding:8px;">No products found.</p>';
        return;
      }
      list.innerHTML = filtered.map((p) => `
        <button type="button" class="used-product-row" data-used-product="${escapeHtml(p.id)}" style="display:flex; align-items:center; gap:8px; padding:7px 8px; border:none; border-bottom:1px solid var(--line); background:none; cursor:pointer; text-align:left; width:100%; font-size:13px;">
          <span style="flex:1;">${escapeHtml(p.name)}${p.type === 'Service' ? ' (Service)' : ''}</span>
          <span style="color:var(--muted); font-size:12px;">Rs. ${p.price || 0}</span>
          <span style="color:var(--primary); font-weight:700;">+</span>
        </button>
      `).join('');
      list.querySelectorAll('[data-used-product]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const p = (window.__techProducts || []).find((x) => x.id === btn.dataset.usedProduct);
          if (!p) return;
          addUsedItem({
            type: 'product',
            name: p.name,
            qty: 1,
            price: Number(p.price) || 0,
            product_id: p.id,
            key: `product-${p.id}`,
          });
        });
      });
    };

    const openUsedItemsModal = (requestId, onSave, requestedPartsRaw) => {
      usedItemsOnSave = onSave;
      usedItemsState = [];
      if (requestedPartsRaw) {
        const reqParts = parseRequestedParts(requestedPartsRaw);
        reqParts.inventory.forEach((p) => {
          const id = p.productId || p.product_id || p.id;
          usedItemsState.push({
            type: 'product',
            name: String(p.name || '').trim(),
            qty: Math.max(1, Number(p.qty) || 1),
            price: Number(p.unitPrice ?? p.price) || 0,
            product_id: id || null,
            key: `part-${id || p.name}`,
          });
        });
        if (reqParts.procurement) {
          usedItemsState.push({
            type: 'product',
            name: 'Part (not in stock): ' + reqParts.procurement,
            qty: 1,
            price: 0,
            product_id: null,
            key: 'procurement',
          });
        }
      }
      const chargeInput = document.getElementById('used-service-charge');
      if (chargeInput) chargeInput.value = '';
      const expenseInput = document.getElementById('used-conveyance-expense');
      if (expenseInput) expenseInput.value = '';
      renderUsedSelectedItems();
      renderUsedServiceChips();
      renderUsedProducts();
      const search = document.getElementById('used-product-search');
      if (search) search.value = '';
      document.getElementById('used-items-status').textContent = '';
      document.getElementById('used-items-modal').style.display = 'flex';
    };
    window.openUsedItemsModal = openUsedItemsModal;

    const serviceChargeInput = document.getElementById('used-service-charge');
    if (serviceChargeInput) {
      serviceChargeInput.addEventListener('input', () => {
        const value = Number(serviceChargeInput.value) || 0;
        const idx = usedItemsState.findIndex((x) => x.key === 'service-charge');
        if (value > 0) {
          if (idx >= 0) {
            usedItemsState[idx].price = value;
          } else {
            usedItemsState.push({ type: 'service', name: 'Service charges', qty: 1, price: value, product_id: null, key: 'service-charge' });
          }
        } else if (idx >= 0) {
          usedItemsState.splice(idx, 1);
        }
        renderUsedSelectedItems();
      });
    }

    const closeUsedItemsModal = () => {
      document.getElementById('used-items-modal').style.display = 'none';
      usedItemsOnSave = null;
    };
    window.closeUsedItemsModal = closeUsedItemsModal;

    document.getElementById('used-product-search').addEventListener('input', (e) => {
      renderUsedProducts(e.target.value);
    });

    document.getElementById('used-items-close').addEventListener('click', closeUsedItemsModal);
    document.getElementById('used-items-cancel').addEventListener('click', closeUsedItemsModal);

    document.getElementById('survey-draft-btn')?.addEventListener('click', () => {
      const requestId = document.getElementById('survey-request-id').value;
      if (requestId) saveSurveyDraft(requestId);
    });

    document.getElementById('used-items-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('used-items-status');
      statusEl.textContent = '';
      const items = usedItemsState.map(({ type, name, qty, price, product_id }) => ({ type, name, qty, price, product_id }));
      const conveyanceExpense = Number(document.getElementById('used-conveyance-expense')?.value) || 0;
      if (typeof usedItemsOnSave === 'function') usedItemsOnSave(items, conveyanceExpense);
    });

    // ── Survey Draft Logic ──
    const DRAFT_KEY_PREFIX = 'survey_draft_';

    const getSurveyFormData = (form) => {
      const cameras = [];
      form.querySelectorAll('#camera-rows .survey-dynamic-row').forEach(row => {
        cameras.push({
          formFactor: row.querySelector('[name="camera_form_factor[]"]')?.value,
          technology: row.querySelector('[name="camera_technology[]"]')?.value || row.querySelector('[name="camera_tech_select[]"]')?.value,
          count: Number(row.querySelector('[name="camera_count[]"]')?.value) || 0,
          resolution: row.querySelector('[name="camera_resolution[]"]')?.value,
          mounting: row.querySelector('[name="camera_mounting[]"]')?.value,
        });
      });

      const cables = [];
      form.querySelectorAll('#cable-rows .survey-dynamic-row').forEach(row => {
        cables.push({
          type: row.querySelector('[name="cable_type[]"]')?.value,
          boxes: row.querySelector('[name="cable_boxes[]"]')?.value,
          meters: row.querySelector('[name="cable_mtrs[]"]')?.value,
        });
      });

      const additional_parts = [];
      form.querySelectorAll('#parts-rows .survey-dynamic-row').forEach(row => {
        additional_parts.push({
          name: row.querySelector('[name="part_name[]"]')?.value,
          qty: row.querySelector('[name="part_qty[]"]')?.value,
          notes: row.querySelector('[name="part_notes[]"]')?.value,
        });
      });

      return {
        is_existing_installation: document.getElementById('survey-existing-section').style.display !== 'none',
        existing_setup_notes: form.existing_setup_notes?.value,
        work_needed: form.work_needed?.value,
        nvr_needed: form.nvr_needed?.value,
        nvr_type: form.nvr_type?.value,
        nvr_channels: form.nvr_channels?.value,
        nvr_brand: form.nvr_brand?.value,
        power_type: form.power_type?.value,
        power_channels: form.power_channels?.value,
        power_brand: form.power_brand?.value,
        mount_brackets: form.mount_brackets?.value,
        mount_poles: form.mount_poles?.value,
        mount_boxes: form.mount_boxes?.value,
        mount_other: form.mount_other?.value,
        notes: form.notes?.value,
        cameras,
        cables,
        additional_parts
      };
    };

    const saveSurveyDraft = (requestId) => {
      const form = document.getElementById('survey-form');
      const data = getSurveyFormData(form);
      localStorage.setItem(DRAFT_KEY_PREFIX + requestId, JSON.stringify(data));
      toast('Draft saved locally', 'success');
    };

    const loadSurveyDraft = (requestId) => {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + requestId);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    };

    const clearSurveyDraft = (requestId) => {
      localStorage.removeItem(DRAFT_KEY_PREFIX + requestId);
    };

    const populateSurveyForm = (data) => {
      const form = document.getElementById('survey-form');
      if (data.existing_setup_notes) form.existing_setup_notes.value = data.existing_setup_notes;
      if (data.work_needed) form.work_needed.value = data.work_needed;
      if (data.nvr_needed) {
        form.nvr_needed.value = data.nvr_needed;
        form.nvr_needed.dispatchEvent(new Event('change'));
      }
      if (data.nvr_type) form.nvr_type.value = data.nvr_type;
      if (data.nvr_channels) form.nvr_channels.value = data.nvr_channels;
      if (data.nvr_brand) form.nvr_brand.value = data.nvr_brand;
      if (data.power_channels) form.power_channels.value = data.power_channels;
      if (data.power_brand) form.power_brand.value = data.power_brand;
      if (data.mount_brackets) form.mount_brackets.value = data.mount_brackets;
      if (data.mount_poles) form.mount_poles.value = data.mount_poles;
      if (data.mount_boxes) form.mount_boxes.value = data.mount_boxes;
      if (data.mount_other) form.mount_other.value = data.mount_other;
      if (data.notes) form.notes.value = data.notes;

      if (data.cameras && data.cameras.length) {
        document.getElementById('camera-rows').innerHTML = '';
        data.cameras.forEach(c => addCameraRow(c.formFactor, c.count, c.resolution, c.mounting));
      }
      if (data.cables && data.cables.length) {
        document.getElementById('cable-rows').innerHTML = '';
        data.cables.forEach(c => addCableRow(c.type, c.boxes, c.meters));
      }
      if (data.additional_parts && data.additional_parts.length) {
        document.getElementById('parts-rows').innerHTML = '';
        data.additional_parts.forEach(p => addPartRow(p.name, p.qty, p.notes));
      }
    };

    // Submit survey
    document.getElementById('survey-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const status = document.getElementById('survey-status');
      const requestId = document.getElementById('survey-request-id').value;

      const formData = new FormData();
      formData.append('is_existing_installation', document.getElementById('survey-existing-section').style.display !== 'none' ? '1' : '0');
      formData.append('existing_setup_notes', form.existing_setup_notes?.value || '');
      formData.append('work_needed', form.work_needed?.value || '');

      const cameras = [];
      const formFactors = form.querySelectorAll('[name="camera_form_factor[]"]');
      const technologies = form.querySelectorAll('[name="camera_technology[]"]');
      const techSelects = form.querySelectorAll('[name="camera_tech_select[]"]');
      const counts = form.querySelectorAll('[name="camera_count[]"]');
      const resolutions = form.querySelectorAll('[name="camera_resolution[]"]');
      const mountings = form.querySelectorAll('[name="camera_mounting[]"]');
      let camCount = 0;
      formFactors.forEach((ff, i) => {
        const count = Number(counts[i]?.value) || 0;
        if (count <= 0) return;
        const technology = technologies[i]?.value || techSelects[i]?.value || '';
        cameras.push({
          formFactor: ff.value,
          technology,
          count,
          resolution: resolutions[i]?.value || '',
          mounting: mountings[i]?.value || '',
        });
        camCount += count;
      });
      formData.append('cameras', JSON.stringify(cameras));
      formData.append('camera_count', camCount);

      const nvrNeeded = document.getElementById('nvr-needed').value === 'yes';
      formData.append('nvr_dvr', JSON.stringify({
        needed: nvrNeeded,
        type: form.nvr_type.value,
        channels: nvrNeeded ? Number(form.nvr_channels.value) : 0,
        brand: nvrNeeded ? form.nvr_brand.value : '',
        power: nvrNeeded ? {
          type: form.power_type.value,
          channels: Number(form.power_channels.value) || 0,
          brand: form.power_brand.value || '',
        } : null,
      }));

      const cables = [];
      form.querySelectorAll('[name="cable_type[]"]').forEach((t, i) => {
        const isCat = t.value === 'Cat6' || t.value === 'Cat6a';
        const isMtr = t.value === 'Power Cable' || t.value === 'HDMI';
        const boxes = isCat ? (Number(form.querySelectorAll('[name="cable_boxes[]"]')[i]?.value) || 1) : 0;
        const meters = isMtr ? (Number(form.querySelectorAll('[name="cable_mtrs[]"]')[i]?.value) || 0) : 0;
        cables.push({ type: t.value, length: 0, boxes, meters });
      });
      formData.append('cables', JSON.stringify(cables));

      formData.append('mounting', JSON.stringify({
        brackets: Number(form.mount_brackets.value) || 0,
        poles: Number(form.mount_poles.value) || 0,
        boxes: Number(form.mount_boxes.value) || 0,
        other: form.mount_other.value || '',
      }));

      const parts = [];
      form.querySelectorAll('[name="part_name[]"]').forEach((n, i) => {
        if (n.value.trim()) parts.push({ name: n.value, qty: Number(form.querySelectorAll('[name="part_qty[]"]')[i]?.value) || 1, notes: form.querySelectorAll('[name="part_notes[]"]')[i]?.value || '' });
      });
      formData.append('additional_parts', JSON.stringify(parts));

      formData.append('notes', form.notes?.value || '');

      selectedPhotoFiles.forEach(file => formData.append('photos', file));

      try {
        status.textContent = 'Submitting...';
        await api(`/api/technician/service-requests/${requestId}/survey`, {
          method: 'POST',
          body: formData,
        });

        status.textContent = 'Survey submitted successfully!';
        clearSurveyDraft(requestId);
        setTimeout(() => refreshPage(), 1000);
      } catch (error) {
        status.textContent = error.message;
      }
    });
  } catch {
    window.location.href = "login.html";
  }
};

// Supplier-quote state (shared across re-renders so modal listeners bind only once)
let sqProducts = [];
let sqItems = [];
let sqPdfPath = "";
let sqPdfName = "";
let sqEnquiryId = null;
let sqPostCreate = null;
const currentSqId = window.__sqId = window.__sqId || { value: null };

// Refresh pending-quote badge counts on the Purchase chrome tabs (sales + admin)
const refreshPurchaseBadges = async () => {
  try {
    const res = await api("/api/sales/quotes?status=pending");
    const count = (res.quotes || []).length;
    ["sales-purchase-badge", "admin-purchase-badge"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = count; el.style.display = count ? "" : "none"; }
    });
  } catch { /* ignore */ }
};

const renderSalesPage = async () => {
  const root = document.querySelector("#sales-root");
  let knownCustomers = [];

  const bindCustomerAutoFill = (nameField, mobileField) => {
    if (!nameField || !mobileField) return;
    mobileField.addEventListener("input", () => {
      const customer = knownCustomers.find(c => c.mobile === mobileField.value);
      if (customer) nameField.value = customer.name;
    });
    nameField.addEventListener("input", () => {
      const customer = knownCustomers.find(c => c.name === nameField.value);
      if (customer) mobileField.value = customer.mobile;
    });
  };

  try {
    const { user } = await api("/api/me");
    if (user.role !== "sales" && user.role !== "admin") throw new Error("Unauthorized");
    const dashboard = await api("/api/sales/dashboard");
    const ordersRes = await api("/api/sales/orders");
    const orders = ordersRes.orders || [];
    const newOrdersRes = await api("/api/sales/orders/new-count");
    const newOrderCount = newOrdersRes.count || 0;
    const pendingQuoteRes = await api("/api/sales/quotes?status=pending");
    const pendingQuoteCount = (pendingQuoteRes.quotes || []).length;
    const serviceRequests = dashboard.serviceRequests || [];
    const summary = dashboard.summary;
    window.__salesProducts = dashboard.products || [];
    const collectionCount = summary.unpaidBilledCount || 0;
    const unpaidServiceCount = summary.unpaidServiceCount || 0;
    const activeAttentionCount = (summary.pendingPartCount || 0) + (summary.needsBillingCount || 0);
    const totalAttentionCount = activeAttentionCount;

    // Date Logic: Default Request Date to Today; Preferred Date auto-buffers 3 Working Days (Excluding Sundays) from Request Date
    const requestDefaultDate = getWorkingDate(0);
    const preferredDefaultDate = addWorkingDays(requestDefaultDate, 3);

    // Dynamic value computation functions
    const computeServicesValue = () => summary.totalBilledValue || 0;

    const computeOrdersValue = () =>
      orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const computeProductsValue = () =>
      (dashboard.products || []).reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

    const computePurchasesValue = () =>
      (window.__purchaseRows || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);

    const computeCustomersValue = () =>
      orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) + 
      (summary.totalBilledValue || 0);

    const tabValueMap = {
      'services': { compute: computeServicesValue, label: 'Service Revenue' },
      'orders': { compute: computeOrdersValue, label: 'Orders Value' },
      'products': { compute: computeProductsValue, label: 'Inventory Value' },
      'purchases': { compute: computePurchasesValue, label: 'Purchases Value' }
    };

    const updateDynamicValue = (tabName) => {
      const data = tabValueMap[tabName];
      const valueEl = document.getElementById('dynamic-value');
      const labelEl = document.getElementById('dynamic-value-label');
      if (data && valueEl && labelEl) {
        valueEl.textContent = formatCurrency(data.compute());
        labelEl.textContent = data.label;
      }
    };

    root.innerHTML = `
      <div class="top-bar">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="margin:0;">${escapeHtml(user.name)}</h1>
          <div style="display:flex; gap:6px; align-items:center; background:var(--surface-soft); padding:4px 8px; border-radius:10px; border:1px solid var(--line);">
             <input type="text" id="sales-ledger-search" placeholder="Search customer..." list="sales-ledger-list" style="width:140px; border:none; background:none; font-size:12px; padding:4px;" />
             <datalist id="sales-ledger-list"></datalist>
             <button class="button button-accent button-small" id="sales-ledger-btn" style="padding:4px 10px; font-size:11px;">View Ledger</button>
          </div>
        </div>
        <div class="top-actions">
          <button class="button button-accent button-small" onclick="window.openDayEndModal()"><i data-lucide="calculator" style="width:12px;height:12px;"></i> Closing Report</button>
          <button class="btn" data-action="logout">Logout</button>
        </div>
      </div>

      <div class="stats" style="margin-bottom: 10px;">
        <div class="stat stat-info" id="stat-pending" style="cursor: pointer;">
          <span class="val">Service: ${summary.pendingServices}</span>
          <span class="lbl">Pending</span>
        </div>
        <div class="stat stat-accent" id="stat-scheduled" style="cursor: pointer;">
          <span class="val">Jobs: ${summary.scheduledServices}</span>
          <span class="lbl">Scheduled</span>
        </div>
        <div class="stat stat-success" id="stat-completed" style="cursor: pointer;">
          <span class="val">Ready: ${summary.completedServices}</span>
          <span class="lbl">To Bill</span>
        </div>
        <div class="stat stat-info" id="stat-unbilled-dc" style="cursor: pointer;">
          <span class="val">DC: ${summary.unbilledChallanCount || 0}</span>
          <span class="lbl">${formatCurrency(summary.unbilledChallanValue || 0)} Unbilled</span>
        </div>
        <div class="stat stat-warning" id="stat-needs-action" style="cursor: pointer;">
          <span class="val">Alert: ${totalAttentionCount}</span>
          <span class="lbl">Attention</span>
        </div>
        <div class="stat stat-danger" id="stat-collection" style="cursor: pointer;">
          <span class="val">Collect: ${collectionCount}</span>
          <span class="lbl">Collection</span>
        </div>
        <div class="stat stat-danger" id="stat-supplier-dues" style="cursor: pointer;">
          <span class="val">Dues: ${formatCurrency(summary.supplierDues || 0)}</span>
          <span class="lbl">Supplier Dues</span>
        </div>
        <div class="stat" id="stat-total-billed" style="cursor: pointer;">
          <span class="val" id="dynamic-value">${formatCurrency(summary.totalBilledValue || 0)}</span>
          <span class="lbl" id="dynamic-value-label">Total Billed</span>
        </div>
      </div>

      <div class="sales-motivation-grid">
        <div class="sales-target-panel">
          <div class="target-header">
            <span class="target-title"><i data-lucide="trending-up" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Monthly Achievement Goal</span>
            <span class="target-value">${formatCurrency(summary.monthlyRevenue || 0)} / Rs. 1,00,000</span>
          </div>
          <div class="progress-container">
            <div class="progress-fill" style="width: ${Math.min(100, ((summary.monthlyRevenue || 0) / 100000) * 100)}%;"></div>
          </div>
          <p style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: -4px;">Current month progress: ${Math.floor(((summary.monthlyRevenue || 0) / 100000) * 100)}% reached.</p>
        </div>

        <div class="leaderboard-panel">
          <div class="leaderboard-header">
            <span class="leaderboard-title"><i data-lucide="trophy" style="width:14px;height:14px;"></i> Top Customers</span>
            <span class="chip-sm" style="font-size: 10px; background: var(--accent-soft); color: var(--accent);">All-time</span>
          </div>
          <div class="leaderboard-list">
            ${(summary.topCustomers || []).length ? (summary.topCustomers || []).slice(0, 3).map((c, i) => `
              <div class="leader-item">
                <span class="leader-rank">${i + 1}</span>
                <span class="leader-name">${escapeHtml(c.customer_name || 'Walk-in')}</span>
                <span class="leader-score">${formatCurrency(c.spent || 0)}</span>
              </div>`).join('') : '<div class="leader-item"><span class="leader-name">No data yet</span></div>'}
          </div>
        </div>
      </div>

      <div class="today-summary-bar">
        <span class="today-summary-label">Today's Take</span>
        <div class="today-summary-items">
          <span class="today-summary-item">Cash: <strong>${formatCurrency(summary.todayCash || 0)}</strong></span>
          <span class="today-summary-item">UPI: <strong>${formatCurrency(summary.todayUpi || 0)}</strong></span>
          <span class="today-summary-total">Net: <strong>${formatCurrency((summary.todayCash || 0) + (summary.todayUpi || 0))}</strong></span>
        </div>
      </div>

      <div class="chrome-tabs-container">
        <div class="chrome-tabs">
          <button class="chrome-tab active" data-sales-tab="dashboard"><i data-lucide="layout-dashboard" style="width:14px;height:14px;"></i> Dashboard</button>
          <button class="chrome-tab" data-sales-tab="services">
            Service Req
            ${totalAttentionCount ? `<span class="notification-badge">${totalAttentionCount}</span>` : ""}
          </button>
          <button class="chrome-tab" data-sales-tab="enquiry"><i data-lucide="crosshair" style="width:14px;height:14px;"></i> Lead</button>
          <button class="chrome-tab" data-sales-tab="quotations">Quotations</button>
          <button class="chrome-tab" data-sales-tab="bills">Orders</button>
          <button class="chrome-tab" data-sales-tab="purchases">Purchase</button>
          <button class="chrome-tab" data-sales-tab="challans">Challans</button>
          <button class="chrome-tab" data-sales-tab="suppliers">Parties</button>
          <button class="chrome-tab" data-sales-tab="reports"><i data-lucide="file-text" style="width:14px;height:14px;"></i> Reports</button>
          <button class="chrome-tab" data-sales-tab="products">Inventory</button>
          <button class="chrome-tab" data-sales-tab="intelligence"><i data-lucide="bar-chart-3" style="width:14px;height:14px;"></i> Insights</button>
        </div>
      </div>

      <div class="sales-tab-content-container">
        <div class="sales-tab-content" data-content="dashboard">
          <div id="dashboard-overview-root" style="padding: 20px;"></div>
        </div>
        <div class="sales-tab-content" data-content="sale">
          <div class="filter-chips" style="margin: 20px 0;">
            <button class="chip-tab active" data-sale-subtab="pos">POS</button>
            <button class="chip-tab" data-sale-subtab="quotation">Quotation</button>
          </div>

        <div class="sale-subtab-content is-active" data-subcontent="pos">
          <div class="pos-container">
            <main class="pos-main">
              <div class="pos-command-bar">
                <div class="pos-workflow-switcher">
                   <button class="workflow-tab active" data-pos-mode="invoice"><i data-lucide="file-text" style="width:12px;height:12px;"></i> TAX INVOICE</button>
                   <button class="workflow-tab" data-pos-mode="challan"><i data-lucide="package" style="width:12px;height:12px;"></i> CHALLAN ONLY</button>
                  <div id="pos-gst-toggle-container" style="display:flex; align-items:center; gap:8px; margin-left:16px; padding-left:16px; border-left:1px solid var(--line);">
                    <span style="font-size:10px; font-weight:700; color:var(--text-soft);">GST</span>
                    <label class="switch-sm">
                      <input type="checkbox" id="pos-gst-toggle" checked>
                      <span class="slider-sm"></span>
                    </label>
                  </div>
                </div>

                <div class="pos-search-wrapper">
                  <span class="pos-search-icon">⚡</span>
                  <input type="text" id="pos-search" placeholder="Type product name or HSN to add..." autocomplete="off" />
                </div>
              </div>

          <div class="product-category-chips" style="display:flex; overflow-x:auto; padding-bottom:8px; gap:8px;">
            <button class="chip-tab active" data-category="">All Items</button>
                    <button class="chip-tab" data-category="CCTV"><i data-lucide="video" style="width:12px;height:12px;"></i> CCTV</button>
                    <button class="chip-tab" data-category="Laptop"><i data-lucide="laptop" style="width:12px;height:12px;"></i> Laptop</button>
                    <button class="chip-tab" data-category="Desktop"><i data-lucide="monitor" style="width:12px;height:12px;"></i> Desktop</button>
            <button class="chip-tab" data-category="Accessory"><i data-lucide="plug" style="width:12px;height:12px;"></i> Parts</button>
            <button class="chip-tab" data-category="Networking"><i data-lucide="globe" style="width:12px;height:12px;"></i> Network</button>
                    <button class="chip-tab" data-category="Printer"><i data-lucide="printer" style="width:12px;height:12px;"></i> Printer</button>
                    <button class="chip-tab" data-category="Service"><i data-lucide="wrench" style="width:12px;height:12px;"></i> Service</button>
          </div>
          <div id="pos-product-grid">
                <div class="pos-empty-state">
                  <h2>Quick Bill Builder</h2>
                  <p>Start typing to search and add products instantly.</p>
                </div>
              </div>
            </main>

            <aside class="pos-cart-panel">
              <div class="receipt-header">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h3>Current Bill</h3>
                  <strong id="pos-header-total" style="color:var(--accent); font-size:16px;">Rs. 0</strong>
                </div>
                <p id="receipt-date"></p>
              </div>

              <div id="pos-cart-list"></div>

              <div class="pos-cart-footer">
                <button class="checkout-btn" id="pos-checkout-trigger" disabled>Review & Checkout</button>

                <!-- Hidden Checkout Form -->
                <div id="pos-checkout-form" style="display:none; margin-top:20px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="eyebrow">Customer Info</span>
                    <button type="button" class="btn btn-sm" onclick="window.posFillWalkIn()" style="background:var(--accent-soft); color:var(--accent-text); font-size:10px; font-weight:700; padding:2px 8px;"><i data-lucide="zap" style="width:10px;height:10px;"></i> Walk-in</button>
                  </div>
                  <input type="text" id="pos-customer-mobile" list="pos-customer-list" placeholder="Customer Mobile" style="margin-bottom:8px;" />
                  <datalist id="pos-customer-list"></datalist>
                  <input type="text" id="pos-customer-name" list="pos-customer-name-list" placeholder="Customer Name" style="margin-bottom:12px;" />
                  <datalist id="pos-customer-name-list"></datalist>

                  <div class="pos-payment-btns" style="margin-bottom:16px;">
                    <button type="button" class="pos-payment-btn active" data-pos-pay="Cash">Cash</button>
                    <button type="button" class="pos-payment-btn" data-pos-pay="UPI">UPI</button>
                  </div>

                  <div id="pos-gen-dc-wrapper">
                    <label style="display:flex; align-items:center; gap:8px; margin:0 0 10px 0; font-size:13px; font-weight:600; cursor:pointer; color:var(--text);">
                      <input type="checkbox" id="pos-gen-dc" style="width:16px; height:16px; accent-color:var(--accent);" />
                      Generate Delivery Challan
                    </label>
                  </div>
                  <div id="pos-dc-fields" style="display:none; margin-bottom:14px;">
                    <input type="date" id="pos-dc-date" style="margin-bottom:8px;" />
                    <input type="text" id="pos-dc-receiver" placeholder="Receiver Name" style="margin-bottom:8px;" />
                    <input type="text" id="pos-dc-transport" placeholder="Transport / Courier" style="margin-bottom:8px;" />
                    <input type="text" id="pos-dc-vehicle" placeholder="Vehicle Number (optional)" style="margin-bottom:8px;" />
                    <textarea id="pos-dc-notes" placeholder="Dispatch Notes" rows="2" style="margin-bottom:8px; resize:vertical;"></textarea>
                  </div>

                  <div class="total-box" style="margin-bottom:16px;">
                    <div class="total-row">
                      <span class="total-label">Payable Amount</span>
                      <span id="pos-cart-total" class="total-amount">Rs. 0</span>
                    </div>
                  </div>

                  <button class="button button-primary" id="pos-checkout-btn" style="width:100%; height:48px;">Finalize Sale</button>
                   <button type="button" class="button button-accent" onclick="window.showInstantUpiQr()" style="width:100%; margin-top:8px; height:48px;"><i data-lucide="smartphone" style="width:16px;height:16px;"></i> Show UPI QR</button>
                  <button class="btn btn-sm" id="pos-cancel-checkout" style="width:100%; margin-top:8px; background:none; border:none; color:var(--muted);">Cancel</button>
                </div>

                <p id="pos-status" class="inline-status" style="text-align:center; margin-top:12px; font-weight:700;"></p>

                <div class="pos-ticker" style="margin-top:20px;">
                  <div class="pos-ticker-head"><span><i data-lucide="shopping-cart" style="width:12px;height:12px;"></i></span> Recently Sold</div>
                  <div id="pos-ticker-list" class="pos-ticker-list"></div>
                </div>
              </div>
            </aside>

            <button class="pos-cart-fab" id="pos-cart-fab" type="button" aria-label="Open current bill">
              <i data-lucide="shopping-cart" style="width:16px;height:16px;"></i><span class="pos-cart-fab-count" id="pos-cart-fab-count">0</span>
            </button>
          </div>
        </div>

          <div class="sale-subtab-content" data-subcontent="quotation">
            <div class="section">
              <div class="sec-head">
                <h2>Create Quotation</h2>
              </div>
              <div class="dashboard-panel" style="max-width:800px; margin:0 auto 20px;">
                <div class="grid-form" style="margin-bottom:16px;">
                  <label>Customer Mobile<input id="quote-customer-mobile" list="quote-customer-list" type="tel" pattern="[0-9]{10}" placeholder="10-digit mobile" /><datalist id="quote-customer-list"></datalist></label>
                  <label>Customer Name<input id="quote-customer-name" list="quote-customer-name-list" type="text" placeholder="Customer name" /><datalist id="quote-customer-name-list"></datalist></label>
                  <label>Valid Until<input id="quote-valid-until" type="date" /></label>
                </div>
                <div class="sec-head" style="margin-top:20px;">
                  <h3>Items</h3>
                  <button class="button button-primary button-small" type="button" id="quote-add-line-btn">+ Add Item</button>
                </div>
                <datalist id="quote-products-datalist"></datalist>
                <div id="quote-item-rows" style="margin-top:10px;"></div>
                <div style="display:flex; justify-content:flex-end; align-items:center; gap:12px; margin-top:14px;">
                  <span style="font-size:14px; color:var(--muted);">Total</span>
                  <strong id="quote-total" style="font-size:1.3rem; color:var(--accent);">Rs. 0</strong>
                </div>
                <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; align-items:center;">
                  <button class="button button-primary" type="button" id="quote-save-btn">Save Quotation</button>
                  <button class="button button-secondary" type="button" id="quote-print-btn">Print Quotation</button>
                  <button class="btn" type="button" id="quote-clear-btn">Clear</button>
                  <p id="quote-status" class="inline-status" style="margin:0;"></p>
                </div>
              </div>
              <div class="sec-head" style="margin-top:28px;">
                <h2>Saved Quotations</h2>
              </div>
              <table class="data-table">
                <thead><tr><th>Quotation No</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Actions</th></tr></thead>
                <tbody id="quote-saved-tbody"></tbody>
              </table>
            </div>

            <div class="modal" id="quote-sale-modal">
              <div class="modal-content" style="max-width:480px;">
                <button type="button" class="modal-close" onclick="closeQuoteSaleModal()">&times;</button>
                <h3 style="margin:0 0 16px;">Convert Quotation to Sale</h3>
                <div id="quote-sale-body"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="sales-tab-content" data-content="enquiry" style="display:none; flex-direction:column; padding:20px;">
          <div class="enq-pipeline-container">
            <div class="enq-pipeline-header">
              <div class="enq-v2-title-area">
                <p class="eyebrow">Lead Pipeline</p>
                <h2>Enquiry Workbench</h2>
              </div>
              <div class="enq-v2-controls">
                <div class="enq-v2-search-wrapper">
                  <i data-lucide="search" style="width:16px;height:16px;"></i>
                  <input type="text" id="enquiry-search" class="enq-v2-search-input" placeholder="Find lead..." />
                </div>
                <button type="button" class="button button-primary" id="enq-record-toggle">
                  <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>
                  <span>New Lead</span>
                </button>
              </div>
            </div>

            <div class="enq-board" id="enq-board">
              <!-- Columns: New, Quoted, Confirmed, Delivered -->
              <div class="enq-column" data-col-status="new">
                <div class="enq-column-header">
                  <span class="enq-column-title"><span style="width:8px;height:8px;background:var(--warning);border-radius:50%;"></span> Incoming</span>
                  <span class="enq-column-count" id="count-new">0</span>
                </div>
                <div class="enq-card-list" id="list-new"></div>
              </div>

              <div class="enq-column" data-col-status="quoted">
                <div class="enq-column-header">
                  <span class="enq-column-title"><span style="width:8px;height:8px;background:var(--info);border-radius:50%;"></span> Quoted</span>
                  <span class="enq-column-count" id="count-quoted">0</span>
                </div>
                <div class="enq-card-list" id="list-quoted"></div>
              </div>

              <div class="enq-column" data-col-status="confirmed">
                <div class="enq-column-header">
                  <span class="enq-column-title"><span style="width:8px;height:8px;background:var(--success);border-radius:50%;"></span> Confirmed</span>
                  <span class="enq-column-count" id="count-confirmed">0</span>
                </div>
                <div class="enq-card-list" id="list-confirmed"></div>
              </div>

              <div class="enq-column" data-col-status="delivered">
                <div class="enq-column-header">
                  <span class="enq-column-title"><span style="width:8px;height:8px;background:var(--accent);border-radius:50%;"></span> Success</span>
                  <span class="enq-column-count" id="count-delivered">0</span>
                </div>
                <div class="enq-card-list" id="list-delivered"></div>
              </div>
            </div>
          </div>

          <!-- Side Peek Drawer Overlay -->
          <div class="enq-drawer-overlay" id="enq-drawer-overlay">
            <div class="enq-drawer">
              <div class="enq-drawer-header">
                <div id="enq-drawer-head-content"></div>
                <button type="button" class="modal-close" onclick="closeEnqDrawer()">&times;</button>
              </div>
              <div class="enq-drawer-content" id="enq-drawer-body"></div>
              <div class="enq-drawer-footer" id="enq-drawer-actions"></div>
            </div>
          </div>
        </div>

        <div class="sales-tab-content" data-content="services">
        <div class="filter-chips" style="margin: 20px 0;">
          <button class="chip-tab active" data-service-subtab="create">New Request</button>
          <button class="chip-tab" data-service-subtab="list">
            Active Requests
            ${activeAttentionCount ? `<span class="notification-badge notification-badge-inline" aria-label="${activeAttentionCount} active items need action">${activeAttentionCount}</span>` : ""}
          </button>
          <button class="chip-tab" data-service-subtab="history">
            Service History
            ${unpaidServiceCount ? `<span class="notification-badge notification-badge-inline" aria-label="${unpaidServiceCount} payments pending">${unpaidServiceCount}</span>` : ""}
          </button>
        </div>

        <div class="service-subtab-content is-active" data-subcontent="create">
          <div class="service-quick-entry">
            <form id="service-create-form" style="display:flex; flex-direction:column; gap:12px; background:var(--surface); padding:20px; border-radius:16px; border:1px solid var(--line); box-shadow:var(--shadow-sm);">

              <!-- Customer Section -->
              <div class="form-section">
                <div class="form-section-header"><i data-lucide="user" style="width:12px;height:12px;"></i> Customer Information</div>
                <div class="form-row-dense">
                  <label>Mobile Number
                    <input name="customer_mobile" list="customer-mobile-list" type="tel" required pattern="[0-9]{10}" placeholder="9876543210" />
                    <datalist id="customer-mobile-list"></datalist>
                  </label>
                  <label>Customer Name
                    <input name="customer_name" list="customer-name-list" type="text" required placeholder="Full Name" />
                    <datalist id="customer-name-list"></datalist>
                  </label>
                </div>
              </div>

              <!-- Request Type Section -->
              <div class="form-section">
                <div class="form-section-header"><i data-lucide="wrench" style="width:12px;height:12px;"></i> Request Type</div>
                <div class="type-chip-group" id="service-type-chips">
                  <input type="hidden" name="device_type" value="New Device Purchase" required />
                  <div class="type-chip active" data-val="New Device Purchase">
                    <i data-lucide="shopping-cart"></i>
                    <span>Purchase</span>
                    <p>Buying New Hardware</p>
                  </div>
                  <div class="type-chip" data-val="Device Service">
                    <i data-lucide="wrench"></i>
                    <span>Device Service</span>
                    <p>Repairs & Maintenance</p>
                  </div>
                  <div class="type-chip" data-val="New Installation (Site Visit)">
                    <i data-lucide="building"></i>
                    <span>New Installation</span>
                    <p>Site Survey & Setup</p>
                  </div>
                  <div class="type-chip" data-val="Installation Service">
                    <i data-lucide="video"></i>
                    <span>CCTV Service</span>
                    <p>Existing Setup Fix</p>
                  </div>
                </div>
              </div>

              <!-- Details Section -->
              <div class="form-section">
                <div class="form-section-header">📅 Schedule & Assignment</div>
                <div class="form-row-dense" style="grid-template-columns: 1fr 1fr 1.5fr;">
                  <label>Request Date
                    <input name="created_at" type="date" value="${requestDefaultDate}" />
                  </label>
                  <label>Preferred Date
                    <input name="preferred_date" type="date" required value="${preferredDefaultDate}" />
                  </label>
                  <label>Assign Technician
                    <select name="technician_id" id="technician-select" style="background:var(--accent-soft); color:var(--accent-deep); font-weight:800; border-color:var(--accent);">
                      <option value="">-- Not Assigned --</option>
                    </select>
                  </label>
                </div>
              </div>

              <!-- Issue Section -->
              <div class="form-section">
                <div class="form-section-header">📝 Job Requirements / Issue</div>
                <textarea name="issue" required placeholder="Describe what the customer needs..." style="min-height: 60px; border-radius:12px;"></textarea>
              </div>

              <!-- Device Intake Section (Device Service only) -->
              <div id="device-intake-section" class="form-section" style="display:none;">
                <div class="form-section-header">📋 Device Intake</div>
                <div style="margin-bottom:12px;">
                  <label style="font-weight:600; font-size:13px; margin-bottom:6px; display:block;">Device Sub-type</label>
                  <div class="type-chip-group" id="device-subtype-chips">
                    <input type="hidden" name="device_subtype" value="laptop" />
                    <div class="type-chip active" data-val="laptop" style="flex:1; min-width:100px;">
                      <span>Laptop / PC</span>
                    </div>
                    <div class="type-chip" data-val="printer" style="flex:1; min-width:100px;">
                      <span>Printer</span>
                    </div>
                  </div>
                </div>

                <!-- Device Identification -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                  <label>Brand
                    <div style="display:flex; gap:6px;">
                      <select name="intake_brand" id="intake-brand-select" required style="flex:1;">
                        <option value="">Select Brand</option>
                        <option value="HP">HP</option>
                        <option value="Dell">Dell</option>
                        <option value="Lenovo">Lenovo</option>
                        <option value="Asus">Asus</option>
                        <option value="Acer">Acer</option>
                        <option value="MSI">MSI</option>
                        <option value="Apple">Apple</option>
                        <option value="Samsung">Samsung</option>
                        <option value="Canon">Canon</option>
                        <option value="Epson">Epson</option>
                        <option value="Brother">Brother</option>
                        <option value="Ricoh">Ricoh</option>
                        <option value="Xerox">Xerox</option>
                        <option value="Other">Other</option>
                      </select>
                      <input type="text" name="intake_brand_other" id="intake-brand-other" placeholder="Brand name" style="display:none; flex:1;" />
                    </div>
                  </label>
                  <label>Model <input type="text" name="intake_model" placeholder="e.g. HP 15sdy, ThinkPad T480" required /></label>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                  <label>Serial # <input type="text" name="intake_serial" placeholder="Optional" /></label>
                  <label>Color <input type="text" name="intake_color" placeholder="e.g. Silver, Black" /></label>
                </div>

                <!-- Condition Checks - Laptop -->
                <div id="intake-laptop-fields">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                    <label>Body Condition
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_body" value="" />
                        <span class="chip-btn" data-field="intake_body" data-val="Good">Good</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Minor Scratches">Scratches</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Dents">Dents</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Cracked">Cracked</span>
                      </div>
                    </label>
                    <label>Screen Condition
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_screen" value="" />
                        <span class="chip-btn" data-field="intake_screen" data-val="Good">Good</span>
                        <span class="chip-btn" data-field="intake_screen" data-val="Scratched">Scratched</span>
                        <span class="chip-btn" data-field="intake_screen" data-val="Cracked">Cracked</span>
                        <span class="chip-btn" data-field="intake_screen" data-val="Dead Pixels">Dead Pixels</span>
                        <span class="chip-btn" data-field="intake_screen" data-val="No Display">No Display</span>
                      </div>
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
                    <label>Keyboard
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_keyboard" value="" />
                        <span class="chip-btn" data-field="intake_keyboard" data-val="Good">Good</span>
                        <span class="chip-btn" data-field="intake_keyboard" data-val="Some Keys Not Working">Keys Issue</span>
                        <span class="chip-btn" data-field="intake_keyboard" data-val="Missing Keys">Missing</span>
                        <span class="chip-btn" data-field="intake_keyboard" data-val="Replaced">Replaced</span>
                      </div>
                    </label>
                    <label>Ports
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_ports" value="" />
                        <span class="chip-btn" data-field="intake_ports" data-val="All Working">All OK</span>
                        <span class="chip-btn" data-field="intake_ports" data-val="Some Not Working">Issue</span>
                        <span class="chip-btn" data-field="intake_ports" data-val="Not Checked">Not Checked</span>
                      </div>
                    </label>
                    <label>Power On
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_power" value="" />
                        <span class="chip-btn" data-field="intake_power" data-val="Yes">Yes</span>
                        <span class="chip-btn" data-field="intake_power" data-val="No">No</span>
                        <span class="chip-btn" data-field="intake_power" data-val="Not Tested">Not Tested</span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Condition Checks - Printer -->
                <div id="intake-printer-fields" style="display:none;">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                    <label>Body Condition
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_body" value="" />
                        <span class="chip-btn" data-field="intake_body" data-val="Good">Good</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Minor Scratches">Scratches</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Dents">Dents</span>
                        <span class="chip-btn" data-field="intake_body" data-val="Cracked">Cracked</span>
                      </div>
                    </label>
                    <label>Paper Tray
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_paper_tray" value="" />
                        <span class="chip-btn" data-field="intake_paper_tray" data-val="Good">Good</span>
                        <span class="chip-btn" data-field="intake_paper_tray" data-val="Damaged">Damaged</span>
                        <span class="chip-btn" data-field="intake_paper_tray" data-val="Missing">Missing</span>
                      </div>
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
                    <label>Print Head
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_print_head" value="" />
                        <span class="chip-btn" data-field="intake_print_head" data-val="Working">Working</span>
                        <span class="chip-btn" data-field="intake_print_head" data-val="Not Working">Not Working</span>
                        <span class="chip-btn" data-field="intake_print_head" data-val="Not Checked">Not Checked</span>
                      </div>
                    </label>
                    <label>Ink / Toner
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_ink_toner" value="" />
                        <span class="chip-btn" data-field="intake_ink_toner" data-val="Present">Present</span>
                        <span class="chip-btn" data-field="intake_ink_toner" data-val="Empty">Empty</span>
                        <span class="chip-btn" data-field="intake_ink_toner" data-val="Not Checked">Not Checked</span>
                      </div>
                    </label>
                    <label>Power On
                      <div class="filter-chips" style="flex-wrap:wrap;">
                        <input type="hidden" name="intake_power" value="" />
                        <span class="chip-btn" data-field="intake_power" data-val="Yes">Yes</span>
                        <span class="chip-btn" data-field="intake_power" data-val="No">No</span>
                        <span class="chip-btn" data-field="intake_power" data-val="Not Tested">Not Tested</span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Accessories -->
                <div style="margin-bottom:12px;">
                  <label style="font-weight:600; font-size:13px; margin-bottom:6px; display:block;">Accessories Received</label>
                  <div id="intake-accessories-laptop" style="display:flex; flex-wrap:wrap; gap:12px;">
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_charger" value="Charger / Adapter" /> Charger / Adapter
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_bag" value="Carry Bag / Case" /> Carry Bag / Case
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_mouse" value="Mouse" /> Mouse
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_other_cb" value="Other" /> Other:
                      <input type="text" name="intake_acc_other" placeholder="Specify" style="width:100px; padding:3px 6px; border:1px solid var(--border); border-radius:4px; font-size:12px;" />
                    </label>
                  </div>
                  <div id="intake-accessories-printer" style="display:none; flex-wrap:wrap; gap:12px;">
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_power_cable" value="Power Cable" /> Power Cable
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_usb_cable" value="USB Cable" /> USB Cable
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_cartridge" value="Ink / Toner Cartridge" /> Ink / Toner Cartridge
                    </label>
                    <label style="display:flex; align-items:center; gap:5px; font-weight:normal; font-size:13px;">
                      <input type="checkbox" name="intake_acc_other_cb" value="Other" /> Other:
                      <input type="text" name="intake_acc_other" placeholder="Specify" style="width:100px; padding:3px 6px; border:1px solid var(--border); border-radius:4px; font-size:12px;" />
                    </label>
                  </div>
                </div>

                <!-- Passwords -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;" id="intake-passwords-laptop">
                  <label>BIOS Password <input type="text" name="intake_bios_password" placeholder="Optional" /></label>
                  <label>Windows Login Password <input type="text" name="intake_login_password" placeholder="Optional" /></label>
                </div>
                <div style="display:none; margin-bottom:12px;" id="intake-passwords-printer">
                  <label>Network Password <input type="text" name="intake_network_password" placeholder="Optional" /></label>
                </div>

                <!-- Pre-existing Damage -->
                <label>Pre-existing Damage Notes <span style="color:var(--danger);">*</span>
                  <textarea name="intake_damage" required placeholder="Describe any pre-existing damage (scratches, dents, cracks, etc.). Customer confirmed." style="min-height:50px; border-radius:8px;"></textarea>
                </label>
              </div>

              <div class="service-submit-area">
                <button class="button button-primary" type="submit" style="height:48px; min-width:200px; font-size:15px;">
                  🚀 Create Service Request
                </button>
                <p id="service-status" class="inline-status" style="margin:0;"></p>
              </div>
            </form>
          </div>
        </div>

        <div class="service-subtab-content" data-subcontent="list">
          <div class="section">
            <div class="sec-head">
              <h2>Active Service Requests</h2>
              ${activeAttentionCount ? `<div class="inline-alert-pill">Needs action: <strong>${activeAttentionCount}</strong> (${summary.pendingPartCount || 0} parts, ${summary.needsBillingCount || 0} bill)</div>` : ""}
            </div>
            <table class="data-table">
              <thead><tr><th>ID</th><th>Customer</th><th>Request Type</th><th>Issue</th><th>Preferred</th><th>Technician</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${serviceRequests.filter(r => r.bill_status !== 'billed' && r.status !== 'Canceled').length ? serviceRequests.filter(r => r.bill_status !== 'billed' && r.status !== 'Canceled').map(r => {
                let actions = '';
                let partStatusHtml = '';
                let surveyStatusHtml = '';
                const isSiteVisit = r.device_type === 'New Installation (Site Visit)' || (r.device_type === 'Old Installation Service' || r.device_type === 'Installation Service');

                if (r.part_request_status === 'requested') {
                  partStatusHtml = `<button class="button button-accent button-small" type="button" data-manage-parts="${r.id}"><i data-lucide="package" style="width:12px;height:12px;"></i> Part Requested</button>`;
                } else if (r.part_request_status === 'available') {
                  partStatusHtml = `<div class="chip success" style="font-size:10px; padding:2px 6px;">Part Ready</div>`;
                }
                if (isSiteVisit && r.survey_status === 'submitted') {
                  surveyStatusHtml = `<button class="button button-accent button-small" type="button" data-review-survey="${r.id}">📋 Survey Ready</button>`;
                } else if (isSiteVisit && r.survey_status === 'reviewed') {
                  surveyStatusHtml = `<div class="chip success" style="font-size:10px; padding:2px 6px;">Survey Reviewed</div>`;
                }
                if (r.status === 'Completed') {
                  actions = `<button class="button button-primary" type="button" data-generate-bill="${r.id}">Generate Bill</button>`;
                } else if (r.status === 'Pending') {
                  actions = `<button class="button button-secondary" type="button" data-schedule="${r.id}">Schedule</button><button class="button button-secondary" type="button" data-complete="${r.id}">Complete</button><button class="button button-small" type="button" data-cancel-request="${r.id}" style="background:#fff1f0; color:#d64545; border:1px solid #f5c2be;">Cancel</button>`;
                } else {
                  actions = `<button class="button button-secondary" type="button" data-complete="${r.id}">Complete</button><button class="button button-small" type="button" data-cancel-request="${r.id}" style="background:#fff1f0; color:#d64545; border:1px solid #f5c2be;">Cancel</button>`;
                }
                actions += `<button class="button button-small" type="button" data-delete-request="${r.id}" style="background:#f5f0ff; color:#7b1fa2; border:1px solid #d5c4f0;" title="Permanently delete this request">Delete</button>`;

                const hasChallanItems = r.used_items || r.requested_parts || r.status === 'Completed' || r.part_request_status === 'available' || r.part_request_status === 'collected';
                if (hasChallanItems) actions += `<button class="button button-small" type="button" data-challan-service="${r.id}" title="Generate a delivery challan for the goods/parts of this job">Delivery Challan</button>`;
                if (r.device_type === 'Device Service' && r.device_intake) actions += `<button class="button button-small" type="button" data-view-intake='${escapeHtml(r.device_intake)}' title="View device intake details" style="background:#e8f5e9; color:#2e7d32; border:1px solid #a5d6a7;">📋 Device</button>`;

                return `<tr><td>${r.id.slice(-8)}</td><td>${escapeHtml(r.customer_name)}</td><td>${escapeHtml(r.device_type)}${r.conveyance_expense > 0 ? `<br/><span class="inline-meta" style="color:var(--text-soft);">Exp: Rs. ${r.conveyance_expense}</span>` : ''}</td><td>${escapeHtml(r.issue)}</td><td>${escapeHtml(r.preferred_date)}</td><td>${escapeHtml(r.assigned_employee_name || '-')}</td><td>${escapeHtml(r.status)} ${partStatusHtml} ${surveyStatusHtml}</td><td class="action-stack">${actions}</td></tr>`;
              }).join('') : '<tr><td colspan="8">No active requests.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div class="service-subtab-content" data-subcontent="history">
          <div class="section">
            <div class="sec-head" style="margin-bottom:20px;">
              <h2>Service History</h2>
              <div style="display:flex; gap:10px; width:100%; max-width:600px;">
                <input type="text" id="sales-history-search" class="search-input" placeholder="Search by name, ID, or request type..." style="flex:1;" />
              </div>
            </div>

            <div class="chip-group" style="margin-bottom:20px;" id="sales-history-chips">
              <button class="chip-btn active" data-filter="all">All</button>
              <button class="chip-btn" data-filter="New Device Purchase">New Device</button>
              <button class="chip-btn" data-filter="Device Service">Device</button>
              <button class="chip-btn" data-filter="New Installation (Site Visit)">New Installation</button>
              <button class="chip-btn" data-filter="Installation Service">Installation</button>
            </div>

            <div class="table-wrap">
              <table class="data-table">
                <colgroup>
                  <col style="width:8%"><col style="width:15%"><col style="width:12%"><col style="width:22%"><col style="width:10%"><col style="width:10%"><col style="width:8%"><col style="width:15%">
                </colgroup>
                <thead>
                  <tr><th>ID</th><th>Customer</th><th>Request Type</th><th>Issue</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody id="sales-history-grid"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div id="bill-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:560px; max-height:92vh; overflow-y:auto;">
          <div class="modal-header">
            <h2 id="bill-modal-title">Generate Bill</h2>
            <button class="modal-close" id="bill-modal-x-close">&times;</button>
          </div>
          <form id="bill-form" class="stack-form">
            <div id="bill-service-info" style="margin:0 0 12px 0;padding:10px;background:var(--surface-soft);border-radius:6px;line-height:1.6;"></div>

            <div class="survey-section-title">Add Service</div>
            <div id="bill-service-chips" class="filter-chips" style="gap:6px; flex-wrap:wrap;"></div>

            <div class="survey-section-title" style="margin-top:14px;">Add Product</div>
            <input type="text" id="bill-product-search" placeholder="Search products..." style="width:100%; padding:9px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text);" />
            <div id="bill-products-list" style="max-height:180px; overflow-y:auto; border:1px solid var(--line); border-radius:6px; margin-top:6px;"></div>

            <div class="survey-section-title" style="margin-top:14px;">Bill Items</div>
            <div id="bill-items-list"></div>
            <p id="bill-items-empty" style="font-size:12px; color:var(--muted);">Nothing added yet. Tap a service or product above.</p>
            <button type="button" class="btn" id="bill-add-custom-item" style="margin-top:6px;">+ Add Custom Line</button>

            <label style="margin-top:14px;">Bill Date
              <input name="bill_date" type="date" title="Defaults to the request's completion date. Set an earlier date to backdate the bill." />
            </label>

            <div style="display:flex; align-items:center; gap:10px; margin-top:16px;">
              <button class="button button-primary" type="submit">Generate Bill</button>
              <button type="button" class="btn" id="bill-modal-close">Cancel</button>
              <span style="flex:1;"></span>
              <strong style="font-size:16px;">Total: Rs. <span id="bill-items-total">0</span></strong>
            </div>
            <p id="bill-status" class="inline-status"></p>
          </form>
        </div>
      </div>
      <div id="view-bill-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h2>Bill Details</h2>
          <div id="view-bill-content" style="margin-bottom:15px;"></div>
          <div class="whatsapp-share-row">
            <a id="download-bill-link" href="" class="btn" target="_blank">Download PDF</a>
            <button type="button" class="btn" id="view-bill-challan-btn">Delivery Challan</button>
            <button type="button" class="btn" id="share-bill-btn">Share</button>
            <a id="whatsapp-bill-link" href="#" target="_blank" class="whatsapp-share-btn">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <button type="button" class="btn" id="view-bill-close">Close</button>
          </div>
        </div>
      </div>
      <div id="part-request-modal" class="modal" style="display:none;">
        <div class="modal-content">
            <h2><i data-lucide="package" style="width:18px;height:18px;display:inline;vertical-align:middle;"></i> Part Procurement</h2>
          <div id="part-request-info" style="margin:15px 0; padding:15px; background:var(--surface-soft); border-radius:8px;"></div>
          <p style="margin-bottom:15px; font-size:14px; color:var(--text-soft);">Verify the part availability in store or order from vendor. Adjust each part price higher or lower, then mark as received.</p>
          <div id="part-price-rows" style="margin-bottom:16px;"></div>
          <div id="part-procurement-row" style="display:none; margin-bottom:20px;">
            <div id="part-procurement-note" style="margin-bottom:6px; font-size:13px; color:var(--danger);"></div>
            <label>Procured Part Cost (Rs.)</label>
            <input type="number" id="additional-part-cost" value="0" min="0" />
            <span class="inline-meta" style="margin-top:5px; display:block;">This amount will be added to the current estimated cost.</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="button button-primary" id="mark-part-ready-btn">Mark as Received</button>
            <button class="btn" id="part-request-close">Cancel</button>
          </div>
        </div>
      </div>
      <div id="schedule-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h2>Schedule Service</h2>
          <p style="margin-bottom:15px; color:var(--text-soft);">Choose a technician or leave unassigned to put it in the available pool.</p>
          <form id="schedule-form" class="stack-form">
            <label>Assign Technician
              <select name="technician_id" id="schedule-technician-select">
                <option value="">-- Leave Unassigned (Pool) --</option>
              </select>
            </label>
            <button class="button button-primary" type="submit">Confirm Schedule</button>
            <button type="button" class="btn" id="schedule-modal-close">Cancel</button>
          </form>
        </div>
      </div>
      <div id="complete-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h2>Complete Service</h2>
          <p style="margin-bottom:15px; color:var(--text-soft);">Set the completion date. Defaults to today. Set an earlier date to backdate the job and its bill.</p>
          <form id="complete-form" class="stack-form">
            <label>Completion Date<input name="completed_at" type="date" /></label>
            <button class="button button-primary" type="submit">Confirm Complete</button>
            <button type="button" class="btn" id="complete-modal-close">Cancel</button>
          </form>
        </div>
      </div>
      <div id="sales-survey-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:640px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h2>Site Visit Survey Review</h2>
            <button class="modal-close" id="sales-survey-close">&times;</button>
          </div>
          <div id="sales-survey-content"></div>
          <div style="display:flex; gap:10px; margin-top:15px; align-items:center;">
            <button class="button button-primary" id="sales-survey-approve-btn">Approve Survey</button>
            <div class="dropdown">
              <button type="button" class="btn dropdown-toggle" onclick="toggleDropdown(event)">Download</button>
              <div class="dropdown-menu">
                <a class="dropdown-item" id="sales-survey-pdf-btn">PDF</a>
                <a class="dropdown-item" id="sales-survey-excel-btn">Excel</a>
              </div>
            </div>
            <button class="btn" id="sales-survey-close-btn">Close</button>
          </div>
          <p id="sales-survey-status" class="inline-status"></p>
        </div>
      </div>
      <div id="cancel-request-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h2>Cancel Service Request</h2>
          <p style="margin-bottom:15px; color:var(--text-soft);">This will cancel the request and unassign the technician. This action cannot be undone.</p>
          <div id="cancel-request-info" style="margin-bottom:15px; padding:12px; background:var(--surface-soft); border-radius:8px; line-height:1.6;"></div>
          <form id="cancel-request-form" class="stack-form">
            <label>Reason for Cancellation<textarea name="cancel_reason" rows="3" placeholder="Enter reason for cancellation..." required></textarea></label>
            <div style="display:flex; gap:10px;">
              <button class="button button-primary" type="submit" style="background:linear-gradient(135deg, #d64545, #b33030);">Confirm Cancellation</button>
              <button type="button" class="btn" id="cancel-request-close">Go Back</button>
            </div>
            <p id="cancel-request-status" class="inline-status"></p>
          </form>
        </div>
      </div>
      <div id="delete-request-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h2>Delete Service Request</h2>
          <p style="margin-bottom:15px; color:var(--text-soft);">This will permanently delete the request and its records. This action cannot be undone.</p>
          <div id="delete-request-info" style="margin-bottom:15px; padding:12px; background:var(--surface-soft); border-radius:8px; line-height:1.6;"></div>
          <div style="display:flex; gap:10px;">
            <button class="button button-primary" type="button" id="delete-request-confirm" style="background:linear-gradient(135deg, #7b1fa2, #5a1480);">Confirm Delete</button>
            <button type="button" class="btn" id="delete-request-close">Go Back</button>
          </div>
          <p id="delete-request-status" class="inline-status"></p>
        </div>
      </div>
      <div id="device-intake-view-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h2>📋 Device Intake Details</h2>
            <button class="modal-close" onclick="document.getElementById('device-intake-view-modal').style.display='none'">&times;</button>
          </div>
          <div id="device-intake-view-content" style="line-height:1.8; font-size:14px;"></div>
          <div style="margin-top:16px; text-align:right;">
            <button class="btn" onclick="document.getElementById('device-intake-view-modal').style.display='none'">Close</button>
          </div>
        </div>
      </div>
      <div class="sales-tab-content" data-content="products" style="display:none;">
        <div class="section">
          <div class="sec-head"><h2>Products</h2><button class="btn" id="add-product-btn">+ Add</button></div>
          <input type="text" id="product-search" class="search-input" placeholder="Search products..." />
          <div class="product-category-chips">
            <button class="chip-btn active" data-category="">All</button>
            <button class="chip-btn" data-category="Laptop">Laptop</button>
            <button class="chip-btn" data-category="Desktop">Desktop</button>
            <button class="chip-btn" data-category="CCTV">CCTV</button>
            <button class="chip-btn" data-category="Accessory">Accessory</button>
            <button class="chip-btn" data-category="Printer">Printer</button>
            <button class="chip-btn" data-category="Networking">Networking</button>
            <button class="chip-btn" data-category="Service">Service</button>
          </div>
          <div id="product-list" class="card-grid"></div>
        </div>
      </div>
      <div class="sales-tab-content" data-content="purchases" style="display:none;">
        <div class="filter-chips" style="margin: 20px 0;">
          <button class="chip-tab active" data-purchase-subtab="purchases">Purchases</button>
          <button class="chip-tab" data-purchase-subtab="po">PO</button>
          <button class="chip-tab" data-purchase-subtab="quotes">Quotes</button>
        </div>

        <div class="purchase-subtab-content is-active" data-subcontent="purchases">
          <div class="section">
            <div class="sec-head">
              <h2>Purchases</h2>
              <div style="display:flex; gap:8px; align-items:center;">
                <div style="display:flex; gap:4px;">
                  <button class="chip-btn active" data-purchase-filter="all">All</button>
                  <button class="chip-btn" data-purchase-filter="pending">Pending</button>
                  <button class="chip-btn" data-purchase-filter="paid">Paid</button>
                </div>
                <button class="btn" id="add-purchase-btn">+ New Purchase</button>
              </div>
            </div>
            <div class="stats" style="margin: 12px 0;">
              <div class="stat"><span class="val" id="purchase-total-val">0</span><span class="lbl">Total Purchases</span></div>
              <div class="stat stat-danger"><span class="val" id="purchase-dues-val">0</span><span class="lbl">Outstanding Dues</span></div>
              <div class="stat stat-warning"><span class="val" id="purchase-count-val">0</span><span class="lbl">Records</span></div>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table" style="font-size:12px;">
                <thead><tr><th>Date</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total (incl. GST)</th><th>Invoice</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="purchases-tbody"><tr><td colspan="9" style="text-align:center; color:var(--muted);">Loading purchases...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="purchase-subtab-content" data-subcontent="po" style="display:none;">
          <div class="section">
            <div class="sec-head">
              <h2>Purchase Orders</h2>
              <button class="btn" id="add-po-btn">+ New PO</button>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table" style="font-size:12px;">
                <thead><tr><th>PO #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Expected</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="po-tbody"><tr><td colspan="8" style="text-align:center; color:var(--muted);">Loading purchase orders...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="purchase-subtab-content" data-subcontent="quotes" style="display:none;">
          <div class="section">
            <div class="sec-head">
              <h2>Supplier Quotes</h2>
              <div style="display:flex; gap:8px; align-items:center;">
                <div style="display:flex; gap:4px;">
                  <button class="chip-btn active" data-quote-filter="all">All</button>
                  <button class="chip-btn" data-quote-filter="pending">Pending</button>
                  <button class="chip-btn" data-quote-filter="approved">Approved</button>
                  <button class="chip-btn" data-quote-filter="rejected">Rejected</button>
                </div>
                <button class="btn" id="add-quote-btn">+ New Quote</button>
              </div>
            </div>
            <p style="color:var(--muted); font-size:12px; margin: 4px 0 12px;">Enter a supplier quote below. Approving a pending quote creates a Purchase Order automatically.</p>
            <div style="overflow-x:auto;">
              <table class="data-table" style="font-size:12px;">
                <thead><tr><th>Quote #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="quotes-tbody"><tr><td colspan="8" style="text-align:center; color:var(--muted);">Loading quotes...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="sales-tab-content" data-content="suppliers" style="display:none;">
        <div class="stats" style="margin-bottom:16px;">
          <div class="stat stat-info"><span class="val" id="party-stat-total">0</span><span class="lbl">Parties</span></div>
          <div class="stat stat-accent"><span class="val" id="party-stat-suppliers">0</span><span class="lbl">Suppliers</span></div>
          <div class="stat stat-success"><span class="val" id="party-stat-customers">0</span><span class="lbl">Customers</span></div>
          <div class="stat stat-danger"><span class="val" id="party-stat-dues">Rs. 0</span><span class="lbl">Outstanding Dues</span></div>
        </div>
        <div class="section">
          <div class="sec-head">
            <h2>Parties</h2>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <input type="text" id="party-search" class="search-input" placeholder="Search name, mobile, GST..." style="min-width:200px; flex:1; max-width:340px;" />
              <div class="party-filter-chips" style="display:flex; gap:4px;">
                <button class="chip-btn active" data-party-filter="all">All</button>
                <button class="chip-btn" data-party-filter="supplier">Suppliers</button>
                <button class="chip-btn" data-party-filter="customer">Customers</button>
              </div>
              <button class="btn" id="add-party-btn">+ Add Party</button>
            </div>
          </div>
          <div id="party-list" class="card-grid"></div>
        </div>
      </div>

      <div class="sales-tab-content" data-content="challans" style="display:none;">
        <div class="section">
          <div class="sec-head">
            <h2>Delivery Challans</h2>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; width:100%; max-width:1000px;">
              <input type="text" id="dc-list-search" class="search-input" placeholder="Search by DC#, Customer, or Phone..." style="flex:1;" />
              <div class="dc-filter-chips filter-chips" style="margin:0;">
                <button class="chip-tab active" data-dc-filter="pending">Unbilled</button>
                <button class="chip-tab" data-dc-filter="billed">Billed</button>
                <button class="chip-tab" data-dc-filter="all">All</button>
              </div>
              <button class="button button-success" id="dc-consolidate-btn" style="display:none;">Consolidate Selected (<span id="dc-select-count">0</span>)</button>
            </div>
          </div>
          <div class="table-wrap" style="margin-top:15px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40px;"><input type="checkbox" id="dc-select-all" /></th>
                  <th>DC Number</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody id="dc-list-tbody">
                <tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-soft);">Loading challans...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sales-tab-content" data-content="bills" style="display:none;">
        <div class="section">
          <div class="sec-head">
            <h2>Financial Records (Bills & Invoices)</h2>
            <div style="display:flex; gap:10px; align-items:center;">
               <div class="filter-chips" style="margin: 0; scale: 0.85; transform-origin: left;">
                 <button class="chip-tab active bill-gst-filter" data-filter="all">All Bills</button>
                 <button class="chip-tab bill-gst-filter" data-filter="gst">GST Only</button>
                 <button class="chip-tab bill-gst-filter" data-filter="non-gst">Non-GST</button>
               </div>
               <input type="text" id="bill-list-search" class="search-input" placeholder="Search Invoice#, Customer..." style="width:250px;" />
            </div>
          </div>
          <div class="table-wrap" style="margin-top:15px;">
            <table class="data-table">
              <thead><tr><th>Invoice#</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th>Date</th><th style="text-align:right;">Action</th></tr></thead>
              <tbody id="recent-sales-tbody">
                <tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-soft);">Loading bills...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sales-tab-content" data-content="intelligence" style="display:none; flex-direction:column; padding:20px;">
          <div class="sec-head">
            <h2>Business Intelligence & Analytics</h2>
            <button class="button button-secondary button-small" onclick="window.renderAnalyticsView(true)"><i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> Refresh Charts</button>
          </div>
          <div id="sales-analytics-container" style="min-height: 500px; width: 100%;">
            <p style="padding:40px; text-align:center; color:var(--muted);">
              Initializing analytics engine...
            </p>
          </div>
        </div>

        <div class="sales-tab-content" data-content="reports" style="display:none; flex-direction:column; padding:20px;">
          <div class="sec-head">
            <h2>Reports Center</h2>
            <p style="color:var(--text-soft); font-size:12px;">Any report, any time frame — as PDF or CSV.</p>
          </div>
          <div id="reports-center"></div>
        </div>
      </div>
    `;

    // Make Stat Cards Clickable
    const cardMap = {
      'stat-pending': 'pending',
      'stat-scheduled': 'scheduled',
      'stat-completed': 'completed',
      'stat-unbilled-dc': 'unbilled_challans',
      'stat-needs-action': 'needs_action',
      'stat-collection': 'collection',
      'stat-low-stock': 'low_stock',
      'stat-total-billed': 'total_billed'
    };
    
    Object.entries(cardMap).forEach(([id, type]) => {
      root.querySelector(`#${id}`)?.addEventListener("click", () => renderDashboardDetailModal(type));
    });

    const supplierDuesCard = root.querySelector("#stat-supplier-dues");
    if (supplierDuesCard) {
      supplierDuesCard.addEventListener("click", renderSupplierDuesModal);
    }

    // Ledger Handler for Sales
    const ledgerBtn = document.getElementById("sales-ledger-btn");
    if (ledgerBtn) {
      // Populate datalist for Sales Ledger
      api("/api/parties?type=customer").then(res => {
        const list = document.getElementById("sales-ledger-list");
        if (list && res.parties) {
          list.innerHTML = res.parties.map(p => `<option value="${escapeHtml(p.name)}${p.mobile ? ' (' + escapeHtml(p.mobile) + ')' : ''}">`).join('');
        }
      }).catch(e => console.error("Sales ledger list load failed", e));

      ledgerBtn.onclick = () => {
        const queryRaw = document.getElementById("sales-ledger-search")?.value.trim();
        if (!queryRaw) return toast("Enter name or mobile for ledger", "warning");

        // Extract mobile if format is "Name (Mobile)"
        let query = queryRaw;
        const match = queryRaw.match(/\(([^)]+)\)/);
        if (match) query = match[1];

        const isMobile = /^[0-9]{10}$/.test(query);
        const url = `/api/admin/customer-ledger.pdf?${isMobile ? 'mobile' : 'name'}=${encodeURIComponent(query)}`;
        window.open(url, "_blank");
      };
    }

    // Mobile Bottom Nav Logic
    const mobileNav = document.createElement("nav");
    mobileNav.className = "mobile-nav";
    mobileNav.innerHTML = `
      <div class="mobile-nav-item" data-sales-tab="sale"><i data-lucide="shopping-cart"></i><span>POS</span></div>
      <div class="mobile-nav-item" data-sales-tab="enquiry"><i data-lucide="crosshair"></i><span>Enquiry</span></div>
      <div class="mobile-nav-item" data-sales-tab="services"><i data-lucide="wrench"></i><span>Service</span></div>
      <div class="mobile-nav-item" data-sales-tab="intelligence"><i data-lucide="pie-chart"></i><span>Insights</span></div>
      <div class="mobile-nav-item" data-sales-tab="reports"><i data-lucide="file-text"></i><span>Docs</span></div>
      <div class="mobile-nav-item" data-sales-tab="bills"><i data-lucide="receipt"></i><span>Bills</span></div>
    `;
    root.appendChild(mobileNav);

    // ── Reports Center (sales) ──
    mountReportsCenter(document.getElementById("reports-center"), user);

    const updateMobileNavActive = (tabName) => {
      mobileNav.querySelectorAll(".mobile-nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.salesTab === tabName);
      });
    };

    mobileNav.addEventListener("click", (e) => {
      const item = e.target.closest(".mobile-nav-item");
      if (!item) return;
      const tabName = item.dataset.salesTab;
      const desktopTab = root.querySelector(`.chrome-tab[data-sales-tab="${tabName}"]`);
      if (desktopTab) desktopTab.click();
    });

    bindLogout();

    // Restore active tab from URL hash after page rebuild
    const hashTab = window.location.hash.slice(1);
    const tabToShow = (hashTab && ['sale', 'enquiry', 'services', 'products', 'purchases', 'suppliers', 'challans', 'bills', 'intelligence', 'reports'].includes(hashTab)) ? hashTab : 'services';
    
    // First hide all main tab contents
    const allTabContents = root.querySelectorAll(".sales-tab-content");
    for (let i = 0; i < allTabContents.length; i++) {
      allTabContents[i].classList.remove("is-active");
      allTabContents[i].style.display = "none";
    }
    
    // Remove active class from all main tabs
    const allTabs = root.querySelectorAll(".chrome-tab[data-sales-tab]");
    for (let i = 0; i < allTabs.length; i++) {
      allTabs[i].classList.remove("active");
    }
    
    root.querySelectorAll(".chrome-tab[data-sales-tab]").forEach(tab => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.salesTab;
        console.log(`TECHLAB: Tab clicked: ${tabName}`);

        root.querySelectorAll(".chrome-tab[data-sales-tab]").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        root.querySelectorAll(".sales-tab-content").forEach(c => {
          c.classList.remove("is-active");
          c.style.display = "none";
        });
        const content = root.querySelector('.sales-tab-content[data-content="' + tabName + '"]');
        if (content) {
          content.classList.add("is-active");
          content.style.display = "flex";
        }

        updateMobileNavActive(tabName);
        updateDynamicValue(tabName);
        window.location.hash = tabName;
        if (tabName === 'dashboard') renderSalesDashboard(dashboard, root);
        if (tabName === 'challans') loadAndRenderChallans();
        if (tabName === 'bills') loadRecentSales();
        if (tabName === 'enquiry') loadEnquiries();
        if (tabName === 'intelligence') window.renderAnalyticsView(true);
      });
    });

    // Show the selected main tab (Moved after listener binding)
    const initialTab = root.querySelector(`.chrome-tab[data-sales-tab="${tabToShow}"]`);
    if (initialTab) {
      initialTab.click();
    } else {
      const defaultTab = root.querySelector(`.chrome-tab[data-sales-tab="dashboard"]`);
      if (defaultTab) defaultTab.click();
    }

    updateMobileNavActive(tabToShow);

    root.querySelectorAll(".chip-tab[data-service-subtab]").forEach(chip => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".chip-tab[data-service-subtab]").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".service-subtab-content").forEach(c => {
          c.classList.remove("is-active");
          c.style.display = "none";
        });
        chip.classList.add("active");
        const subcontent = root.querySelector('.service-subtab-content[data-subcontent="' + chip.dataset.serviceSubtab + '"]');
        if (subcontent) {
          subcontent.classList.add("is-active");
          subcontent.style.display = "flex";
        }
      });
    });

    // Sale tab sub-navigation
    root.querySelectorAll(".chip-tab[data-sale-subtab]").forEach(chip => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".chip-tab[data-sale-subtab]").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".sale-subtab-content").forEach(c => {
          c.classList.remove("is-active");
          c.style.display = "none";
        });
        chip.classList.add("active");
        const subcontent = root.querySelector('.sale-subtab-content[data-subcontent="' + chip.dataset.saleSubtab + '"]');
        if (subcontent) {
          subcontent.classList.add("is-active");
          subcontent.style.display = "flex";
        }
      });
    });

    // Purchase tab sub-navigation
    root.querySelectorAll(".chip-tab[data-purchase-subtab]").forEach(chip => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".chip-tab[data-purchase-subtab]").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".purchase-subtab-content").forEach(c => {
          c.classList.remove("is-active");
          c.style.display = "none";
        });
        chip.classList.add("active");
        const subcontent = root.querySelector('.purchase-subtab-content[data-subcontent="' + chip.dataset.purchaseSubtab + '"]');
        if (subcontent) {
          subcontent.classList.add("is-active");
          subcontent.style.display = "flex";
        }
        if (chip.dataset.purchaseSubtab === "po") loadPurchaseOrders();
        if (chip.dataset.purchaseSubtab === "quotes") loadSupplierQuotes();
      });
    });

    root.querySelectorAll(".chip-btn[data-quote-filter]").forEach(chip => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".chip-btn[data-quote-filter]").forEach(t => t.classList.remove("active"));
        chip.classList.add("active");
        loadSupplierQuotes(chip.dataset.quoteFilter);
      });
    });

    // Quotation builder
    const quoteLines = [];
    let editingQuoteIdx = -1;
    const quoteDefaultValidity = () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().slice(0, 10);
    };

    const quoteMobileInput = document.getElementById("quote-customer-mobile");
    const quoteNameInput = document.getElementById("quote-customer-name");
    const quoteValidUntil = document.getElementById("quote-valid-until");
    if (quoteValidUntil && !quoteValidUntil.value) quoteValidUntil.value = quoteDefaultValidity();

    const quoteContacts = [];
    const loadQuoteCustomers = async () => {
      try {
        const [customersRes, partiesRes] = await Promise.allSettled([
          api("/api/sales/customers"),
          api("/api/parties?type=customer"),
        ]);
        const customers = customersRes.status === "fulfilled" ? customersRes.value.customers || [] : [];
        const parties = partiesRes.status === "fulfilled" ? partiesRes.value.parties || [] : [];
        knownCustomers = customers;
        quoteContacts.length = 0;
        const pushContact = (c) => {
          if (!c.mobile) return;
          if (quoteContacts.some(q => q.mobile === c.mobile)) return;
          quoteContacts.push({ name: c.name || "", mobile: c.mobile, address: c.address || "" });
        };
        customers.forEach(pushContact);
        parties.forEach(pushContact);

        const mobileList = document.getElementById("quote-customer-list");
        if (mobileList) {
          mobileList.innerHTML = quoteContacts.map(c => `<option value="${escapeHtml(c.mobile)}">${escapeHtml(c.name)}</option>`).join("");
        }
        const nameList = document.getElementById("quote-customer-name-list");
        if (nameList) {
          nameList.innerHTML = quoteContacts
            .filter(c => c.name)
            .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.mobile)}${c.address ? " - " + escapeHtml(c.address) : ""}</option>`)
            .join("");
        }
      } catch (e) {
        console.error("Failed to load customers", e);
      }
    };
    loadQuoteCustomers();

    // ── Delivery Challans (DC) Logic ──
    let challansList = [];
    let challanFilter = 'pending';
    const selectedDcIds = new Set();

    const loadAndRenderChallans = async (filter = challanFilter) => {
      const tbody = document.getElementById("dc-list-tbody");
      if (!tbody) return;

      try {
        const res = await api(`/api/sales/challans${filter !== 'all' ? `?billingStatus=${filter}` : ''}`);
        challansList = res.challans || [];
        selectedDcIds.clear();
        updateConsolidateUI();
        renderChallans();
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger);">${escapeHtml(err.message)}</td></tr>`;
      }
    };

    const updateConsolidateUI = () => {
      const btn = document.getElementById("dc-consolidate-btn");
      const countEl = document.getElementById("dc-select-count");
      if (!btn || !countEl) return;

      const count = selectedDcIds.size;
      btn.style.display = count > 1 ? "inline-block" : "none";
      countEl.textContent = count;
    };

    const renderChallans = () => {
      const tbody = document.getElementById("dc-list-tbody");
      if (!tbody) return;

      const q = (document.getElementById("dc-list-search")?.value || "").trim().toLowerCase();
      const filtered = challansList.filter(dc =>
        !q ||
        (dc.challan_number || "").toLowerCase().includes(q) ||
        (dc.customer_name || "").toLowerCase().includes(q) ||
        (dc.customer_mobile && dc.customer_mobile.includes(q))
      );

      const isMobile = false;

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-soft);">No challans found.</td></tr>`;
        return;
      }

      if (isMobile) {
        // Render as Cards for Tablet/Mobile
        tbody.closest('table').style.display = 'none';
        let cardContainer = document.getElementById('dc-card-container');
        if (!cardContainer) {
          cardContainer = document.createElement('div');
          cardContainer.id = 'dc-card-container';
          cardContainer.className = 'mobile-card-grid';
          tbody.closest('.table-wrap').appendChild(cardContainer);
        }
        cardContainer.style.display = 'grid';

        cardContainer.innerHTML = filtered.map(dc => {
          const isBilled = dc.billing_status === 'billed';
          const isSelected = selectedDcIds.has(dc.id);
          return `
            <div class="record-card ${isSelected ? 'selected' : ''}">
              <div class="record-card-header">
                <div>
                  <div class="record-card-title">${escapeHtml(dc.customer_name)}</div>
                  <div class="record-card-meta">${dc.challan_number} • ${dc.dispatch_date || '-'}</div>
                </div>
                <span class="chip ${isBilled ? 'success' : 'warning'}">${isBilled ? 'Billed' : 'Unbilled'}</span>
              </div>
              <div class="record-card-body">
                <div class="record-card-stat">
                  <span class="record-card-label">Total Value</span>
                  <span class="record-card-value">${formatCurrency(dc.total_value || 0)}</span>
                </div>
              </div>
              <div class="record-card-actions">
                <button class="button button-secondary" onclick="window.viewStandaloneDcItems('${dc.id}')">View</button>
                <button class="button button-secondary" onclick="window.shareDcGlobal('${dc.id}')">Share</button>
                <a href="/api/sales/challans/${dc.id}.pdf" target="_blank" class="button button-pdf">PDF</a>
                ${!isBilled ? `
                  <button class="button button-accent" onclick="window.openDcReturnModal('${dc.id}')">Returns</button>
                  <button class="button button-success" onclick="window.convertDcToBillGlobal('${dc.id}')">Bill</button>
                  <button class="button button-primary button-full ${isSelected ? 'active' : ''}" onclick="toggleDcSelection('${dc.id}', event)">
                     ${isSelected ? '<i data-lucide="check-circle-2" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Selected' : '<i data-lucide="plus" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Select for Consolidation'}
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        // Desktop Table View
        const table = tbody.closest('table');
        table.style.display = 'table';
        const cardContainer = document.getElementById('dc-card-container');
        if (cardContainer) cardContainer.style.display = 'none';

        tbody.innerHTML = filtered.map(dc => {
          const isBilled = dc.billing_status === 'billed';
          const isSelected = selectedDcIds.has(dc.id);
          return `
            <tr>
              <td>
                ${!isBilled ? `<input type="checkbox" class="dc-row-check" data-id="${dc.id}" ${isSelected ? 'checked' : ''} />` : ''}
              </td>
              <td><strong>${escapeHtml(dc.challan_number)}</strong></td>
              <td>${dc.dispatch_date || '-'}</td>
              <td>
                <strong>${escapeHtml(dc.customer_name)}</strong><br>
                <span style="font-size:11px; color:var(--text-soft);">${escapeHtml(dc.customer_mobile || '')}</span>
              </td>
              <td><strong>${formatCurrency(dc.total_value || 0)}</strong></td>
              <td>
                <span class="chip ${isBilled ? 'success' : 'warning'}" style="font-size:10px;">
                  ${isBilled ? 'Billed' : 'Unbilled'}
                </span>
              </td>
              <td class="action-stack" style="text-align:right; justify-content:flex-end;">
                <button class="button button-small button-secondary" onclick="window.viewStandaloneDcItems('${dc.id}')">View</button>
                <button class="button button-small button-secondary" onclick="window.shareDcGlobal('${dc.id}')">Share</button>
                <a href="/api/sales/challans/${dc.id}.pdf" target="_blank" class="button button-small button-pdf">PDF</a>
                ${!isBilled ? `
                  <button class="button button-small button-accent" onclick="window.openDcReturnModal('${dc.id}')">Returns</button>
                  <button class="button button-small button-success" onclick="window.convertDcToBillGlobal('${dc.id}')">Bill</button>
                ` : ''}
              </td>
            </tr>
          `;
        }).join('');

        // Re-bind checkbox listeners
        tbody.querySelectorAll(".dc-row-check").forEach(chk => {
          chk.addEventListener("change", (e) => {
            const id = e.target.dataset.id;
            handleDcCheckboxChange(id, e.target.checked);
          });
        });
      }
    };

    window.toggleDcSelection = (id, event) => {
      const isSelected = selectedDcIds.has(id);
      handleDcCheckboxChange(id, !isSelected);
      renderChallans();
    };

    const handleDcCheckboxChange = (id, isChecked) => {
      const currentDc = challansList.find(c => c.id === id);
      if (isChecked) {
        selectedDcIds.add(id);
        if (currentDc) {
          let autoSelectedCount = 0;
          challansList.forEach(dc => {
            if (dc.billing_status === 'pending' && !selectedDcIds.has(dc.id)) {
              const isSameCustomer = (dc.customer_mobile && dc.customer_mobile === currentDc.customer_mobile) ||
                                     (dc.customer_name === currentDc.customer_name);
              if (isSameCustomer) {
                selectedDcIds.add(dc.id);
                autoSelectedCount++;
              }
            }
          });
          if (autoSelectedCount > 0) {
            toast(`Found ${autoSelectedCount} more DCs for this customer. Auto-selecting...`, "info");
          }
        }
      } else {
        selectedDcIds.delete(id);
      }
      updateConsolidateUI();
    };

    // Select All logic
    document.getElementById("dc-select-all")?.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll(".dc-row-check");
      checkboxes.forEach(chk => {
        chk.checked = isChecked;
        const id = chk.dataset.id;
        if (isChecked) selectedDcIds.add(id);
        else selectedDcIds.delete(id);
      });
      updateConsolidateUI();
    });

    // Consolidate Button handler
    document.getElementById("dc-consolidate-btn")?.addEventListener("click", async () => {
      if (selectedDcIds.size < 2) return;

      // Verify same customer
      const ids = Array.from(selectedDcIds);
      const selectedChallans = challansList.filter(c => selectedDcIds.has(c.id));
      const customers = new Set(selectedChallans.map(c => c.customer_mobile || c.customer_name));

      if (customers.size > 1) {
        alert("Consolidation error: All selected challans must belong to the same customer.");
        return;
      }

      showBillTypePrompt(async (isGst) => {
        try {
          const res = await api("/api/sales/challans/consolidate-to-bill", {
            method: "POST",
            body: JSON.stringify({ ids, isGst })
          });
          toast("Consolidated Invoice generated!", "success");
          loadAndRenderChallans();
          renderSalesPage();
          if (res.orderId) window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, "_blank");
        } catch (err) { alert(err.message); }
      });
    });


    // DC Search and Filter listeners
    document.getElementById("dc-list-search")?.addEventListener("input", renderChallans);
    document.querySelectorAll(".dc-filter-chips button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".dc-filter-chips button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        challanFilter = btn.dataset.dcFilter;
        loadAndRenderChallans();
      });
    });

    window.shareDcGlobal = async (id) => {
      try {
        const dc = await api(`/api/sales/challans?sourceType=standalone&sourceId=${id}`);
        if (!dc) return;
        const pdfUrl = `/api/sales/challans/${id}.pdf`;
        const waMsg = `Hi ${dc.customer_name},\n\nDelivery Challan ${dc.challan_number}\nDate: ${dc.dispatch_date || '-'}\nTotal Value: ${formatCurrency(dc.total_value || 0)}\n\nThank you, TECHLAB!`;

        if (navigator.canShare && navigator.share) {
          try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const file = new File([blob], `${dc.challan_number}.pdf`, { type: "application/pdf" });

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: dc.challan_number,
                text: waMsg,
                files: [file]
              });
              return;
            }
          } catch (e) { console.log("Native DC share failed:", e); }
        }
        window.open(`https://wa.me/${dc.customer_mobile || ''}?text=${encodeURIComponent(waMsg)}`, "_blank");
      } catch (err) { toast(err.message, "error"); }
    };

    window.closeDcItemsModal = () => {
      document.getElementById("dc-items-modal")?.classList.remove("show");
    };

    window.openDcReturnModal = async (id) => {
      try {
        const dc = await api(`/api/sales/challans?sourceType=standalone&sourceId=${id}`);
        if (!dc) return;

        const returns = {};
        const contentHtml = dc.items.map(it => `
          <div style="margin-bottom:12px; padding:10px; background:var(--surface-soft); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <strong>${escapeHtml(it.item_name)}</strong>
              <span>Out: ${it.qty}</span>
            </div>
            <label style="font-size:11px; color:var(--muted);">Quantity Returned by Technician:</label>
            <input type="number" class="dc-return-input" data-item-id="${it.id}" value="0" min="0" max="${it.qty}" step="any" style="width:100%; margin-top:4px;" />
          </div>
        `).join('');

        const confirmReturns = async () => {
          const inputs = document.querySelectorAll(".dc-return-input");
          inputs.forEach(inp => {
            const val = Number(inp.value);
            if (val > 0) returns[inp.dataset.itemId] = val;
          });

          if (Object.keys(returns).length === 0) {
            toast("Enter returned quantity", "warning");
            return;
          }

          try {
            await api(`/api/sales/challans/${id}/return-items`, {
              method: "POST",
              body: JSON.stringify({ returns })
            });
            toast("Stock updated and returns recorded!", "success");
            loadAndRenderChallans();
            closeSupplierViewModal(); // Generic close
          } catch (err) { alert(err.message); }
        };

        // Reuse a generic modal style for input
        const modal = document.getElementById("dc-items-modal");
        const title = document.getElementById("dc-items-title");
        const content = document.getElementById("dc-items-content");

        title.textContent = `Record Returns: ${dc.challan_number}`;
        content.innerHTML = `
          <p style="font-size:12px; color:var(--muted); margin-bottom:15px;">Any quantity entered here will be added back to your loose stock.</p>
          ${contentHtml}
          <button class="button button-primary" id="dc-confirm-return-btn" style="width:100%; margin-top:10px;">Update Stock & DC</button>
        `;

        document.getElementById("dc-confirm-return-btn").onclick = confirmReturns;
        modal.classList.add("show");

      } catch (err) { toast(err.message, "error"); }
    };

    window.viewStandaloneDcItems = async (id) => {
      const modal = document.getElementById("dc-items-modal");
      const title = document.getElementById("dc-items-title");
      const content = document.getElementById("dc-items-content");
      if (!modal || !content) return;

      try {
        const dc = await api(`/api/sales/challans?sourceType=standalone&sourceId=${id}`);
        if (!dc) return;

        // Fetch all challans for this customer to provide a unified view
        let allCustomerDcs = [];
        try {
          const othersQuery = dc.customer_mobile
            ? `/api/sales/challans?customerMobile=${encodeURIComponent(dc.customer_mobile)}`
            : `/api/sales/challans?customerName=${encodeURIComponent(dc.customer_name)}`;
          const res = await api(othersQuery);
          allCustomerDcs = res.challans || [];
        } catch (e) { console.error("Failed to load customer challans", e); }

        const hasMultiple = allCustomerDcs.length > 1;

        if (hasMultiple) {
          title.textContent = `Customer History: ${escapeHtml(dc.customer_name)}`;
        } else {
          title.textContent = `Challan Details: ${dc.challan_number}`;
        }

        let dcSelectorHtml = '';
        if (hasMultiple) {
          dcSelectorHtml = `
            <div style="margin-bottom:15px; display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; border-bottom:1px solid var(--line);">
              ${allCustomerDcs.map(o => `
                <button class="chip-tab ${o.id === id ? 'active' : ''}"
                        style="white-space:nowrap; font-size:11px;"
                        onclick="window.viewStandaloneDcItems('${o.id}')">
                  ${o.challan_number} (${o.billing_status === 'billed' ? 'Billed' : 'Unbilled'})
                </button>
              `).join('')}
            </div>
          `;
        }

        const isBilled = dc.billing_status === 'billed';

        content.innerHTML = `
          ${dcSelectorHtml}
          <div style="margin-bottom:15px; font-size:13px; display:flex; justify-content:space-between; align-items:start; background:var(--surface-soft); padding:12px; border-radius:12px;">
            <div>
              <p><strong>Customer:</strong> ${escapeHtml(dc.customer_name)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(dc.customer_mobile || '-')}</p>
              <p><strong>DC Number:</strong> ${dc.challan_number}</p>
              <p><strong>Dispatch Date:</strong> ${dc.dispatch_date || '-'}</p>
            </div>
            <div style="text-align:right;">
               <span class="chip ${isBilled ? 'success' : 'warning'}" style="font-size:12px;">${isBilled ? 'Billed' : 'Unbilled'}</span>
               <div style="margin-top:8px; font-size:11px; color:var(--muted);">${dc.items.length} Items</div>
            </div>
          </div>
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Total</th>
                <th style="width:30px;"></th>
              </tr>
            </thead>
            <tbody id="dc-items-edit-tbody">
              ${dc.items.map(it => `
                <tr data-item-id="${it.id}">
                  <td><input type="text" class="dc-edit-name" value="${escapeHtml(it.item_name)}" style="width:100%; border:none; background:none; font-weight:700;" ${isBilled ? 'readonly' : ''} /></td>
                  <td style="text-align:right;">
                    ${!isBilled ? `<input type="number" class="dc-edit-qty" value="${it.qty}" step="any" style="width:60px; text-align:right; padding:2px 4px; border:1px solid var(--line); border-radius:4px;" />` : it.qty}
                  </td>
                  <td style="text-align:right;">
                    ${!isBilled ? `<input type="number" class="dc-edit-price" value="${it.unit_price || 0}" step="any" style="width:80px; text-align:right; padding:2px 4px; border:1px solid var(--line); border-radius:4px;" />` : formatCurrency(it.unit_price || 0)}
                  </td>
                  <td style="text-align:right;"><strong class="dc-item-line-total">${formatCurrency(it.total_price || 0)}</strong></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--surface-soft); font-weight:bold;">
                <td colspan="3">Challan Total</td>
                <td style="text-align:right; color:var(--accent); font-size:14px;" id="dc-items-grand-total">${formatCurrency(dc.total_value || 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          ${!isBilled ? `
            <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center;">
              <button class="btn btn-sm" id="add-dc-item-row-btn" style="background:var(--accent-soft); color:var(--accent-deep); font-weight:800;">+ Add Service/Charge</button>
              <button class="button button-primary" id="save-dc-adjustments-btn">Save Changes</button>
            </div>
          ` : ''}
        `;

        if (!isBilled) {
          const tbody = document.getElementById("dc-items-edit-tbody");
          const updateLocalTotal = () => {
            let grand = 0;
            tbody.querySelectorAll("tr").forEach(tr => {
              const q = Number(tr.querySelector(".dc-edit-qty").value) || 0;
              const p = Number(tr.querySelector(".dc-edit-price").value) || 0;
              const line = q * p;
              grand += line;
              tr.querySelector(".dc-item-line-total").textContent = formatCurrency(line);
            });
            document.getElementById("dc-items-grand-total").textContent = formatCurrency(grand);
          };

          tbody.querySelectorAll("input").forEach(inp => inp.addEventListener("input", updateLocalTotal));

          const addBtn = document.getElementById("add-dc-item-row-btn");
          if (addBtn) {
            addBtn.onclick = () => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td><input type="text" class="dc-edit-name" placeholder="Configuration Charge / etc" style="width:100%; padding:4px; border:1px solid var(--line); border-radius:4px;" /></td>
                <td style="text-align:right;"><input type="number" class="dc-edit-qty" value="1" step="any" style="width:60px; text-align:right; padding:2px 4px;" /></td>
                <td style="text-align:right;"><input type="number" class="dc-edit-price" value="0" step="any" style="width:80px; text-align:right; padding:2px 4px;" /></td>
                <td style="text-align:right;"><strong class="dc-item-line-total">Rs. 0</strong></td>
                <td style="text-align:center;"><button class="btn btn-sm" onclick="this.closest('tr').remove();" style="color:var(--danger); background:none; border:none; font-size:16px;">&times;</button></td>
              `;
              tr.querySelectorAll("input").forEach(inp => inp.addEventListener("input", updateLocalTotal));
              tbody.appendChild(tr);
            };
          }

          document.getElementById("save-dc-adjustments-btn").onclick = async () => {
            const items = [];
            tbody.querySelectorAll("tr").forEach(tr => {
              const id = tr.dataset.itemId;
              items.push({
                id: id || null,
                item_name: tr.querySelector(".dc-edit-name").value,
                qty: Number(tr.querySelector(".dc-edit-qty").value),
                unit_price: Number(tr.querySelector(".dc-edit-price").value)
              });
            });

            try {
              const res = await api(`/api/sales/challans/${id}/adjust-items`, {
                method: "POST",
                body: JSON.stringify({ items })
              });
              if (res.error) throw new Error(res.error);

              toast("DC items updated successfully!", "success");
              loadAndRenderChallans();
            } catch (err) {
              console.error("DC Adjustment failed:", err);
              alert("Failed to update DC: " + err.message);
            }
          };
        }

        modal.classList.add("show");
      } catch (e) { toast(e.message, "error"); }
    };

    const showBillTypePrompt = (onSelect, items = []) => {
      const modal = document.getElementById("bill-type-modal");
      if (!modal) return;

      const container = document.getElementById("bill-adjustment-container");
      if (container) {
        container.innerHTML = items.length ? items.map(it => `
          <div class="bill-adj-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--line);">
            <div style="flex:1;">
              <strong style="display:block; font-size:13px;">${escapeHtml(it.item_name)}</strong>
              <span style="font-size:11px; color:var(--muted);">Dispatched: ${it.qty}</span>
            </div>
            <div style="width:100px;">
              <input type="number" class="bill-qty-input" data-item-id="${it.id}" data-max="${it.qty}" value="${it.qty}" min="0" step="any" style="padding:4px 8px; font-size:12px; width:100%;" />
            </div>
          </div>
        `).join('') : '<p style="font-size:12px; color:var(--muted);">No items to adjust</p>';
      }

      const gstBtn = document.getElementById("btn-generate-gst");
      const nonGstBtn = document.getElementById("btn-generate-nongst");

      const getAdjustedItems = () => {
        const inputs = modal.querySelectorAll(".bill-qty-input");
        const adjustments = {};
        inputs.forEach(input => {
          adjustments[input.dataset.itemId] = Number(input.value);
        });
        return adjustments;
      };

      const cleanup = () => {
        modal.style.display = "none";
        gstBtn.onclick = null;
        nonGstBtn.onclick = null;
      };

      gstBtn.onclick = () => { onSelect(true, getAdjustedItems()); cleanup(); };
      nonGstBtn.onclick = () => { onSelect(false, getAdjustedItems()); cleanup(); };

      modal.style.display = "flex";
    };

    window.convertDcToBillGlobal = async (id) => {
      try {
        const dc = await api(`/api/sales/challans?sourceType=standalone&sourceId=${id}`);
        if (!dc) return;

        showBillTypePrompt(async (isGst, adjustments) => {
          try {
            const res = await api(`/api/sales/challans/${id}/convert-to-bill`, {
              method: "POST",
              body: JSON.stringify({ isGst, adjustments })
            });
            toast("Invoice generated!", "success");
            loadAndRenderChallans();
            renderSalesPage(); // Refresh counts
            if (res.orderId) window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, "_blank");
          } catch (err) { alert(err.message); }
        }, dc.items);
      } catch (err) { alert(err.message); }
    };



    const syncNameFromMobile = () => {
      const mobile = quoteMobileInput.value.trim();
      const contact = quoteContacts.find(c => c.mobile === mobile);
      if (contact && quoteNameInput) quoteNameInput.value = contact.name;
    };
    const syncMobileFromName = () => {
      if (!quoteNameInput || quoteMobileInput.value) return;
      const name = quoteNameInput.value.trim();
      const contact = quoteContacts.find(c => c && c.name && (c.name || "").toLowerCase() === (name || "").toLowerCase());
      if (contact) quoteMobileInput.value = contact.mobile;
    };

    if (quoteMobileInput) {
      quoteMobileInput.addEventListener("input", syncNameFromMobile);
      quoteMobileInput.addEventListener("change", syncNameFromMobile);
      quoteMobileInput.addEventListener("blur", syncNameFromMobile);
    }

    if (quoteNameInput) {
      quoteNameInput.addEventListener("input", syncMobileFromName);
      quoteNameInput.addEventListener("change", syncMobileFromName);
      quoteNameInput.addEventListener("blur", syncMobileFromName);
    }

    const findQuoteProduct = (name) => (dashboard.products || []).find(p => p && (p.name || "").toLowerCase() === (name || "").trim().toLowerCase());

    const renderQuoteLines = () => {
      const container = document.getElementById("quote-item-rows");
      if (!container) return;
      container.innerHTML = quoteLines.map((line, idx) => `
        <div class="quote-item-row" style="display:grid; grid-template-columns:1fr 56px 90px 30px; gap:6px; margin-bottom:6px; align-items:center;">
          <input class="quote-item-name" data-idx="${idx}" list="quote-products-datalist" placeholder="Type product name..." value="${escapeHtml(line.name)}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <input class="quote-item-qty" data-idx="${idx}" type="number" min="1" value="${line.qty}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <input class="quote-item-price" data-idx="${idx}" type="number" min="0" step="any" value="${line.price}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <button type="button" class="btn btn-sm btn-danger quote-item-remove" data-idx="${idx}">x</button>
        </div>`).join('') || '<p style="color:var(--muted); font-size:12px;">No items yet. Click "+ Add Item".</p>';
      const totalEl = document.getElementById("quote-total");
      if (totalEl) totalEl.textContent = formatCurrency(quoteLines.reduce((s, l) => s + l.price * l.qty, 0));
    };

    const addQuoteLineRow = () => {
      quoteLines.push({ id: null, name: "", price: 0, qty: 1 });
      renderQuoteLines();
    };

    document.getElementById("quote-add-line-btn")?.addEventListener("click", () => addQuoteLineRow());

    const quoteDatalist = document.getElementById("quote-products-datalist");
    if (quoteDatalist) {
      quoteDatalist.innerHTML = (dashboard.products || []).map(p => `<option value="${escapeHtml(p.name)}"></option>`).join('');
    }

    const quoteRowsContainer = document.getElementById("quote-item-rows");
    if (quoteRowsContainer) {
      const refreshQuoteTotals = () => {
        const totalEl = document.getElementById("quote-total");
        if (totalEl) totalEl.textContent = formatCurrency(quoteLines.reduce((s, l) => s + l.price * l.qty, 0));
      };
      quoteRowsContainer.addEventListener("input", (e) => {
        const target = e.target.closest("[data-idx]");
        if (!target) return;
        const idx = Number(target.dataset.idx);
        const line = quoteLines[idx];
        if (!line) return;
        if (target.classList.contains("quote-item-name")) {
          line.name = target.value;
          const prod = findQuoteProduct(target.value);
          if (prod) {
            line.id = prod.id;
            line.price = Number(prod.finalPrice ?? prod.price) || 0;
            const priceInput = document.querySelector(`.quote-item-price[data-idx="${idx}"]`);
            if (priceInput) priceInput.value = line.price;
          } else {
            line.id = null;
          }
        } else if (target.classList.contains("quote-item-qty")) {
          line.qty = Math.max(1, parseInt(target.value, 10) || 1);
        } else if (target.classList.contains("quote-item-price")) {
          line.price = Number(target.value) || 0;
        }
        refreshQuoteTotals();
      });

      quoteRowsContainer.addEventListener("click", (e) => {
        const rm = e.target.closest(".quote-item-remove");
        if (!rm) return;
        quoteLines.splice(Number(rm.dataset.idx), 1);
        renderQuoteLines();
      });
    }

    addQuoteLineRow();

    document.getElementById("quote-clear-btn")?.addEventListener("click", () => {
      quoteLines.length = 0;
      editingQuoteIdx = -1;
      const saveBtn = document.getElementById("quote-save-btn");
      if (saveBtn) saveBtn.textContent = "Save Quotation";
      const status = document.getElementById("quote-status");
      if (status) status.textContent = "";
      addQuoteLineRow();
    });

    let savedQuotations = [];
    const getSavedQuotations = () => savedQuotations;
    const setSavedQuotations = (list) => { savedQuotations = list; };
    const loadSavedQuotations = async () => {
      try {
        const { quotations } = await api("/api/sales/quotations");
        savedQuotations = (quotations || []).map(q => ({
          id: q.id,
          quoteNumber: q.quote_number,
          date: q.quote_date || q.created_at?.slice(0, 10) || "",
          customerName: q.customer_name || "",
          customerMobile: q.customer_mobile || "",
          customerAddress: q.customer_address || "",
          validUntil: q.valid_until || "",
          total: q.total_amount || 0,
          converted: q.status === "converted",
          convertedAt: q.converted_at ? new Date(q.converted_at).toLocaleDateString("en-IN") : "",
          lines: (q.items || []).map(i => ({ id: i.product_id || null, name: i.product_name || "", price: Number(i.unit_price) || 0, qty: Number(i.quantity) || 1 })),
        }));
      } catch (e) {
        console.error("Failed to load quotations", e);
      }
      renderSavedQuotations();
    };

    const renderSavedQuotations = () => {
      const tbody = document.getElementById("quote-saved-tbody");
      if (!tbody) return;
      const list = getSavedQuotations();
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted);">No quotations saved yet.</td></tr>';
        return;
      }
      const items = list.map((q, idx) => ({ q, idx })).reverse();
      tbody.innerHTML = items.map(({ q, idx }) => `
        <tr>
          <td><strong>${escapeHtml(q.quoteNumber || "-")}</strong></td>
          <td>${escapeHtml(q.date)}</td>
          <td>${escapeHtml(q.customerName || q.customerMobile || "-")}</td>
          <td>${q.lines.length} items</td>
          <td>${formatCurrency(q.total)}</td>
          <td class="action-stack">
            ${q.converted ? `<span class="chip success" title="Converted on ${escapeHtml(q.convertedAt || "")}">Converted</span>` : `<button type="button" class="btn btn-sm button-accent" data-quote-sale="${idx}">Convert to Sale</button>`}
            <button type="button" class="btn btn-sm quote-wa-share" data-quote-wa="${idx}" title="Share on WhatsApp" style="display:inline-flex; align-items:center; gap:4px; background:#25d366; color:#fff; border-color:#25d366;">
              <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#fff;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button type="button" class="btn btn-sm" data-quote-edit="${idx}">Edit</button>
            <button type="button" class="btn btn-sm" data-quote-view="${idx}">Print</button>
            <button type="button" class="btn btn-sm btn-danger" data-quote-delete="${idx}">Delete</button>
          </td>
        </tr>`).join('');
    };

    const printQuotation = async (quote) => {
      let biz = { business_name: "TECHLAB", business_address: "", business_phone: "", business_email: "" };
      try {
        const { settings } = await api("/api/settings/business");
        biz = { ...biz, ...settings };
      } catch (e) { /* use defaults */ }

      const lineRows = quote.lines.map(l => `<tr><td>${escapeHtml(l.name)}</td><td>${l.qty}</td><td>${formatCurrency(l.price)}</td><td>${formatCurrency(l.price * l.qty)}</td></tr>`).join('');
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Quotation | TECHLAB</title>
<style>
  body{font-family:"Segoe UI",Arial,sans-serif;color:#17253d;max-width:720px;margin:24px auto;padding:0 16px;}
  h1{font-size:22px;margin:0 0 2px;}
  .biz{color:#63748d;font-size:13px;line-height:1.6;}
  .doc-type{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#1663ff;font-weight:700;margin:18px 0 4px;}
  .meta{display:flex;justify-content:space-between;gap:20px;margin-top:10px;color:#63748d;font-size:12px;flex-wrap:wrap;}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;}
  th,td{padding:8px 10px;border-bottom:1px solid #d7e3f2;text-align:left;}
  th{color:#63748d;font-size:11px;text-transform:uppercase;}
  .total-row td{font-weight:800;font-size:16px;border-top:2px solid #1663ff;}
  .foot{color:#63748d;font-size:12px;margin-top:24px;}
  @media print{body{margin:0}}
</style>
</head>
<body>
  <h1>${escapeHtml(biz.business_name || "TECHLAB")}</h1>
  <div class="biz">${escapeHtml(biz.business_address || "")}${biz.business_phone ? "<br>Phone: " + escapeHtml(biz.business_phone) : ""}${biz.business_email ? "<br>Email: " + escapeHtml(biz.business_email) : ""}</div>
  <div class="doc-type">Quotation</div>
  <div class="meta"><span>Quotation No: ${escapeHtml(quote.quoteNumber || "-")}</span><span>Date: ${escapeHtml(quote.date)}</span><span>Valid until: ${escapeHtml(quote.validUntil || "-")}</span></div>
  <div style="margin-top:12px;"><strong>Customer:</strong> ${escapeHtml(quote.customerName || "-")}${quote.customerMobile ? " (" + escapeHtml(quote.customerMobile) + ")" : ""}${quote.customerAddress ? "<br>" + escapeHtml(quote.customerAddress) : ""}</div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${lineRows}</tbody>
    <tr class="total-row"><td colspan="3">Total</td><td>${formatCurrency(quote.total)}</td></tr>
  </table>
  <p class="foot">This quotation is valid until the date shown above. Prices include applicable taxes unless stated otherwise.</p>
  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;
      const win = window.open("", "_blank", "width=760,height=900");
      if (!win) return;
      win.document.write(html);
      win.document.close();
    };

    const getQuoteContact = (mobile, name) =>
      quoteContacts.find(c => c.mobile === mobile) ||
      quoteContacts.find(c => c && c.name && name && (c.name || "").toLowerCase() === String(name).trim().toLowerCase()) ||
      null;

    document.getElementById("quote-save-btn")?.addEventListener("click", async () => {
      const mobile = document.getElementById("quote-customer-mobile").value.trim();
      const name = document.getElementById("quote-customer-name").value.trim();
      const validUntil = document.getElementById("quote-valid-until").value || "";
      const status = document.getElementById("quote-status");
      const validLines = quoteLines.filter(l => String(l.name || "").trim() && Number(l.qty) > 0);
      if (!validLines.length) {
        if (status) status.textContent = "Add at least one item.";
        return;
      }
      if (!name && !mobile) {
        if (status) status.textContent = "Enter customer name or mobile.";
        return;
      }
      const contact = getQuoteContact(mobile, name);
      const total = validLines.reduce((s, l) => s + l.price * l.qty, 0);
      const saveBtn = document.getElementById("quote-save-btn");
      const payload = {
        customerName: name || contact?.name || "",
        customerMobile: mobile || contact?.mobile || "",
        customerAddress: contact?.address || "",
        quoteDate: new Date().toISOString().slice(0, 10),
        validUntil,
        items: validLines.map(l => ({ productId: l.id || null, productName: l.name, quantity: Number(l.qty), unitPrice: Number(l.price) })),
      };
      const wasEditing = editingQuoteIdx >= 0;
      try {
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = wasEditing ? "Updating..." : "Saving..."; }
        if (wasEditing) {
          const quote = getSavedQuotations()[editingQuoteIdx];
          await api(`/api/sales/quotations/${quote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await api("/api/sales/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        }
      } catch (e) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = wasEditing ? "Update Quotation" : "Save Quotation"; }
        if (status) status.textContent = e.message || "Failed to save quotation.";
        return;
      }
      editingQuoteIdx = -1;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Quotation"; }
      quoteLines.length = 0;
      addQuoteLineRow();
      await loadSavedQuotations();
      if (status) status.textContent = wasEditing ? "Quotation updated." : "Quotation saved.";
    });

    document.getElementById("quote-print-btn")?.addEventListener("click", () => {
      const mobile = document.getElementById("quote-customer-mobile").value.trim();
      const name = document.getElementById("quote-customer-name").value.trim();
      const validUntil = document.getElementById("quote-valid-until").value || "";
      const status = document.getElementById("quote-status");
      const validLines = quoteLines.filter(l => String(l.name || "").trim() && Number(l.qty) > 0);
      if (!validLines.length) {
        if (status) status.textContent = "Add at least one item to print.";
        return;
      }
      const contact = getQuoteContact(mobile, name);
      const total = validLines.reduce((s, l) => s + l.price * l.qty, 0);
      printQuotation({
        quoteNumber: "",
        date: new Date().toLocaleDateString("en-IN"),
        customerName: name || contact?.name || "",
        customerMobile: mobile || contact?.mobile || "",
        customerAddress: contact?.address || "",
        validUntil,
        lines: validLines.map(l => ({ ...l })),
        total,
      });
    });

    const shareQuotationWhatsApp = (quote) => {
      const mobile = String(quote.customerMobile || "").replace(/[^0-9]/g, "");
      if (!mobile) return alert("No customer mobile number on this quotation.");
      const lines = (quote.lines || [])
        .filter(l => l.name && Number(l.qty) > 0)
        .map(l => `\u2022 ${l.name} \u00d7 ${l.qty} \u2014 ${formatCurrency(l.price * l.qty)}`)
        .join("\n");
      const msg = [
        `Dear ${quote.customerName || "Customer"},`,
        ``,
        `Thank you for choosing TECHLAB. Here is your quotation:`,
        ``,
        quote.quoteNumber ? `Quotation No: ${quote.quoteNumber}` : "",
        `Date: ${quote.date}`,
        quote.validUntil ? `Valid until: ${quote.validUntil}` : "",
        ``,
        lines,
        ``,
        `Total: ${formatCurrency(quote.total)}`,
        ``,
        `Please let us know if you have any questions.`,
      ].filter(Boolean).join("\n");
      window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    document.getElementById("quote-saved-tbody")?.addEventListener("click", async (e) => {
      const view = e.target.closest("[data-quote-view]");
      const del = e.target.closest("[data-quote-delete]");
      const edit = e.target.closest("[data-quote-edit]");
      const wa = e.target.closest("[data-quote-wa]");
      const list = getSavedQuotations();
      if (wa) {
        const quote = list[Number(wa.dataset.quoteWa)];
        if (quote) shareQuotationWhatsApp(quote);
        return;
      }
      if (edit) {
        const quote = list[Number(edit.dataset.quoteEdit)];
        if (!quote) return;
        editingQuoteIdx = Number(edit.dataset.quoteEdit);
        const mobileInput = document.getElementById("quote-customer-mobile");
        const nameInput = document.getElementById("quote-customer-name");
        const validInput = document.getElementById("quote-valid-until");
        if (mobileInput) mobileInput.value = quote.customerMobile || "";
        if (nameInput) nameInput.value = quote.customerName || "";
        if (validInput) validInput.value = quote.validUntil || "";
        quoteLines.length = 0;
        quoteLines.push(...(quote.lines || []).map(l => ({ id: l.id || null, name: l.name || "", price: Number(l.price) || 0, qty: Math.max(1, Number(l.qty) || 1) })));
        renderQuoteLines();
        const status = document.getElementById("quote-status");
        if (status) status.textContent = "Editing saved quotation — change items/prices then Save.";
        const saveBtn = document.getElementById("quote-save-btn");
        if (saveBtn) saveBtn.textContent = "Update Quotation";
        const panel = document.getElementById("quote-item-rows")?.closest(".dashboard-panel");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (view) {
        const quote = list[Number(view.dataset.quoteView)];
        if (quote) await printQuotation(quote);
        return;
      }
      if (del) {
        const quote = list[Number(del.dataset.quoteDelete)];
        if (!quote) return;
        if (!confirm(`Delete quotation ${quote.quoteNumber || ""}? This cannot be undone.`)) return;
        try {
          await api(`/api/sales/quotations/${quote.id}`, { method: "DELETE" });
          await loadSavedQuotations();
        } catch (err) {
          alert(err.message || "Failed to delete quotation");
        }
      }
    });

    let currentSaleQuoteIdx = -1;
    let quoteSalePaymentMode = "Cash";

    window.closeQuoteSaleModal = () => {
      const modal = document.getElementById("quote-sale-modal");
      if (modal) modal.classList.remove("show");
      currentSaleQuoteIdx = -1;
    };

    const openQuoteSaleModal = (idx) => {
      const quote = getSavedQuotations()[idx];
      if (!quote) return;
      currentSaleQuoteIdx = idx;
      quoteSalePaymentMode = "Cash";
      const body = document.getElementById("quote-sale-body");
      if (!body) return;
      const lineRows = (quote.lines || [])
        .filter(l => l.name && Number(l.qty) > 0)
        .map(l => {
          const sellable = l.id || (dashboard.products || []).some(p => p && (p.name || "").toLowerCase() === String(l.name).trim().toLowerCase());
          return `<div style="display:flex; justify-content:space-between; padding:2px 0; gap:8px;"><span>${escapeHtml(l.name)} &times; ${l.qty}${sellable ? "" : ' <span class="chip warning" style="font-size:10px;">custom</span>'}</span><strong>${formatCurrency(l.price * l.qty)}</strong></div>`;
        }).join('');
      const sellableLines = (quote.lines || []).filter(l => l && l.name && Number(l.qty) > 0 && (l.id || (dashboard.products || []).some(p => p && (p.name || "").toLowerCase() === String(l.name).trim().toLowerCase())));
      const sellableTotal = sellableLines.reduce((s, l) => s + (l.price * l.qty), 0);
      body.innerHTML = `
        <p style="font-size:13px; color:var(--muted); margin:0 0 14px;">Customer accepted this quotation? Convert it into a sale now.</p>
        <label style="display:block; margin-bottom:12px;">Customer Name<input id="quote-sale-name" type="text" value="${escapeHtml(quote.customerName || "")}" /></label>
        <label style="display:block; margin-bottom:12px;">Customer Mobile<input id="quote-sale-mobile" type="tel" value="${escapeHtml(quote.customerMobile || "")}" /></label>
        <label style="display:block; margin-bottom:12px;">Sale Date<input id="quote-sale-date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
        <div style="margin-bottom:12px;">
          <p style="font-size:13px; color:var(--muted); margin:0 0 8px;">Payment Mode</p>
          <div class="pos-payment-btns">
            <button type="button" class="pos-payment-btn active" data-qs-pay="Cash">Cash</button>
            <button type="button" class="pos-payment-btn" data-qs-pay="UPI">UPI</button>
            <button type="button" class="pos-payment-btn" data-qs-pay="Card">Card</button>
          </div>
        </div>
        <div style="background:var(--bg-light); padding:10px 12px; border-radius:8px; font-size:13px; margin:12px 0;">
          ${lineRows}
          <hr style="border:none; border-top:1px solid var(--line); margin:8px 0;">
          <div style="display:flex; justify-content:space-between; font-weight:800;"><span>Sale Total</span><span>${formatCurrency(sellableTotal)}</span></div>
          ${sellableTotal !== quote.total ? `<p style="font-size:11px; color:var(--muted); margin:6px 0 0;">${formatCurrency(quote.total - sellableTotal)} in custom items won't be billed in the sale.</p>` : ""}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" onclick="closeQuoteSaleModal()">Cancel</button>
          <button type="button" class="button button-primary" id="quote-sale-confirm-btn">Confirm Sale</button>
        </div>`;
      body.querySelectorAll(".pos-payment-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          body.querySelectorAll(".pos-payment-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          quoteSalePaymentMode = btn.dataset.qsPay;
        });
      });
      body.querySelector("#quote-sale-confirm-btn").addEventListener("click", confirmQuoteSale);
      document.getElementById("quote-sale-modal").classList.add("show");
    };

    const confirmQuoteSale = async () => {
      const name = document.getElementById("quote-sale-name").value.trim();
      const mobile = document.getElementById("quote-sale-mobile").value.trim();
      if (!name || !mobile) return alert("Customer name and mobile are required.");
      const list = getSavedQuotations();
      const quote = list[currentSaleQuoteIdx];
      if (!quote) return;
      const isSellable = (l) => l && (Boolean(l.id) || (dashboard.products || []).some(p => p && (p.name || "").toLowerCase() === String(l.name).trim().toLowerCase()));
      const items = (quote.lines || [])
        .filter(l => l.name && Number(l.qty) > 0 && isSellable(l))
        .map(l => ({ productId: l.id || null, productName: l.name, quantity: l.qty, unitPrice: l.price }));
      if (!items.length) return alert("This quotation has no sellable items.");
      const confirmBtn = document.getElementById("quote-sale-confirm-btn");
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Creating..."; }
      try {
        const saleDateEl = document.getElementById("quote-sale-date");
        const res = await api("/api/sales/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerName: name, mobile, items, paymentMode: quoteSalePaymentMode, billDate: saleDateEl ? saleDateEl.value : undefined }),
        });
        list[currentSaleQuoteIdx] = { ...quote, converted: true, convertedAt: new Date().toLocaleDateString("en-IN") };
        closeQuoteSaleModal();
        renderSavedQuotations();
        try { await api(`/api/sales/quotations/${quote.id}/convert`, { method: "POST" }); } catch (e) { /* already locally marked */ }
        const skippedNote = res.skipped && res.skipped.length ? ` (skipped: ${res.skipped.join(", ")})` : "";
        toast(`Sale created — ${formatCurrency(res.total)}${skippedNote}`, "success");
        await loadSavedQuotations();
        loadRecentSales();
      } catch (e) {
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirm Sale"; }
        alert(e.message || "Failed to create sale");
      }
    };

    document.getElementById("quote-saved-tbody")?.addEventListener("click", async (e) => {
      const sale = e.target.closest("[data-quote-sale]");
      if (sale) {
        openQuoteSaleModal(Number(sale.dataset.quoteSale));
        return;
      }
    });

    loadSavedQuotations();

    // ── Purchases tab ──
    const purchasesState = { filter: "all", rows: [] };

    const renderPurchases = (rows) => {
      const tbody = document.getElementById("purchases-tbody");
      const filtered = purchasesState.filter === "all" ? rows : rows.filter(p => {
        if (purchasesState.filter === "pending") return p.payment_status === "pending" || p.payment_status === "partial";
        return p.payment_status === purchasesState.filter;
      });
      window.__purchaseRows = filtered;
      const total = rows.reduce((s, p) => s + (p.total_cost || 0) + (p.gst_total || 0), 0);
      const dues = rows.filter(p => p.payment_status !== 'paid').reduce((s, p) => s + ((p.total_cost || 0) + (p.gst_total || 0) - (p.amount_paid || 0)), 0);
      const totalEl = document.getElementById("purchase-total-val");
      const duesEl = document.getElementById("purchase-dues-val");
      const countEl = document.getElementById("purchase-count-val");
      if (totalEl) totalEl.textContent = formatCurrency(total);
      if (duesEl) duesEl.textContent = formatCurrency(dues);
      if (countEl) countEl.textContent = rows.length;
      if (!tbody) return;
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--muted);">No purchases found.</td></tr>';
        return;
      }
      tbody.innerHTML = filtered.map(p => {
        const isPaid = p.payment_status === 'paid';
        return `
          <tr>
            <td>${escapeHtml(p.purchase_date || '-')}</td>
            <td>${escapeHtml(p.supplier_name || '-')}</td>
            <td>${escapeHtml(p.product_name)}${p.product_id ? '' : ' <span class="chip" style="font-size:10px;">standalone</span>'}</td>
            <td>${p.quantity}</td>
            <td>${formatCurrency(p.unit_cost)}</td>
            <td><strong>${formatCurrency((p.total_cost || 0) + (p.gst_total || 0))}</strong>${p.gst_total ? ` <span class="chip" style="font-size:10px;" title="Taxable ${formatCurrency(p.total_cost)} + GST ${formatCurrency(p.gst_total)}">+GST</span>` : ''}</td>
            <td>${escapeHtml(p.invoice_number || '-')}</td>
            <td><span class="chip ${isPaid ? 'success' : 'warning'}">${isPaid ? 'Paid' : 'Pending'}</span></td>
            <td class="action-stack">
              ${!isPaid ? `<button class="btn-sm button-accent mark-purchase-paid-btn" data-purchase-id="${p.id}">Mark Paid</button>` : ''}
              <button class="btn-sm btn-danger delete-purchase-btn" data-purchase-id="${p.id}">Delete</button>
            </td>
          </tr>`;
      }).join('');
    };

    const loadPurchases = async () => {
      try {
        const res = await api("/api/sales/purchases");
        purchasesState.rows = res.purchases || [];
        renderPurchases(purchasesState.rows);
      } catch (e) {
        const tbody = document.getElementById("purchases-tbody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--danger);">Failed to load purchases.</td></tr>';
      }
    };
    loadPurchases();

    root.querySelectorAll("[data-purchase-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-purchase-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        purchasesState.filter = btn.dataset.purchaseFilter;
        renderPurchases(purchasesState.rows);
      });
    });

    const populatePurchaseSupplierSelect = async (formId, selectedId) => {
      const datalist = document.getElementById("purchase-supplier-list");
      if (!datalist) return;
      const res = await api("/api/parties?type=supplier");
      const suppliers = res.parties || [];
      datalist.innerHTML = suppliers.map(s => `<option value="${escapeHtml(s.name)}${s.mobile ? ' (' + escapeHtml(s.mobile) + ')' : ''}" data-id="${s.id}">`).join('');

      const form = document.getElementById(formId);
      const searchInput = form?.querySelector('[name="supplierSearch"]');
      const idInput = form?.querySelector('[name="supplierId"]');

      if (searchInput && idInput) {
        searchInput.oninput = () => {
          const val = searchInput.value;
          const option = document.querySelector(`#purchase-supplier-list option[value="${val.replace(/"/g, '\\"')}"]`);
          idInput.value = option ? option.dataset.id : "";
        };
      }

      if (selectedId) {
        const supplier = suppliers.find(s => s.id === selectedId);
        if (supplier && searchInput && idInput) {
          searchInput.value = `${supplier.name}${supplier.mobile ? ' (' + supplier.mobile + ')' : ''}`;
          idInput.value = selectedId;
        }
      }
    };

    document.getElementById("add-purchase-btn")?.addEventListener("click", async () => {
      const form = document.getElementById("purchase-form");
      form.reset();
      form.querySelector('[name="supplierId"]').value = "";
      form.purchaseDate.value = new Date().toISOString().slice(0, 10);
      await populatePurchaseSupplierSelect("purchase-form", "");

      const productSelect = form.querySelector('[name="productId"]');
      const productDatalist = document.getElementById("purchase-existing-products");
      const newProductFields = document.getElementById("purchase-new-product-fields");

      const prodRes = await api("/api/public/products");
      const prods = prodRes.products || [];

      productSelect.innerHTML = '<option value="">-- Create New Product --</option>' +
        prods.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.type})</option>`).join('');

      if (productDatalist) {
        productDatalist.innerHTML = prods.map(p => `<option value="${escapeHtml(p.name)}">`).join('');
      }

      const toggleNewFields = () => {
        if (newProductFields) newProductFields.style.display = productSelect.value ? "none" : "block";
      };
      productSelect.onchange = toggleNewFields;
      toggleNewFields();

      document.getElementById("purchase-payment-mode-group").style.display = "none";
      document.getElementById("purchase-total-display").textContent = "";
      document.getElementById("purchase-modal").classList.add("show");
    });

    document.getElementById("purchases-tbody")?.addEventListener("click", async (e) => {
      const paid = e.target.closest(".mark-purchase-paid-btn");
      const del = e.target.closest(".delete-purchase-btn");
      if (paid) {
        window.openSupplierPaymentMode(paid.dataset.purchaseId);
        return;
      }
      if (del) {
        if (!confirm("Delete this purchase record? Stock will be reversed if linked to a product.")) return;
        try {
          await api(`/api/sales/purchases/${del.dataset.purchaseId}`, { method: "DELETE" });
          toast("Purchase deleted", "success");
          renderSalesPage();
        } catch (err) { alert(err.message); }
      }
    });

    const renderPoItems = () => {
      const container = document.getElementById("po-items");
      if (!container) return;
      const productOptions = (selected) => '<option value="">-- Product --</option>' +
        poProducts.map(p => `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${escapeHtml(p.name)} (${escapeHtml(p.type)})</option>`).join('');
      container.innerHTML = poItems.map((it, idx) => `
        <div class="po-item-row" style="display:grid; grid-template-columns:1fr 56px 84px 30px; gap:6px; margin-bottom:6px; align-items:center;">
          <select class="po-item-product" data-idx="${idx}" style="padding:6px; border:1px solid var(--line); border-radius:4px;">${productOptions(it.productId)}</select>
          <input class="po-item-qty" data-idx="${idx}" type="number" min="1" value="${it.quantity}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <input class="po-item-cost" data-idx="${idx}" type="number" min="0" value="${it.unitCost}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <button type="button" class="btn btn-sm btn-danger po-item-remove" data-idx="${idx}">x</button>
        </div>`).join('') || '<p style="color:var(--muted); font-size:12px;">No items yet.</p>';
      updatePoTotal();
    };

    const updatePoTotal = () => {
      const el = document.getElementById("po-total-display");
      if (!el) return;
      const total = poItems.reduce((s, it) => s + (it.quantity * it.unitCost), 0);
      el.textContent = `Total: ${formatCurrency(total)}`;
    };

    const addPoItem = (productId = "", quantity = 1, unitCost = 0) => {
      poItems.push({ productId, quantity, unitCost });
      renderPoItems();
    };

    const syncPoItemFromRow = (idx) => {
      const row = document.querySelector(`.po-item-row [data-idx="${idx}"]`);
      if (!row) return;
      const productSelect = document.querySelector(`.po-item-product[data-idx="${idx}"]`);
      const qty = document.querySelector(`.po-item-qty[data-idx="${idx}"]`);
      const cost = document.querySelector(`.po-item-cost[data-idx="${idx}"]`);
      if (!productSelect || !qty || !cost) return;
      poItems[idx] = {
        productId: productSelect.value,
        productName: productSelect.selectedOptions[0]?.textContent.split(" (")[0] || "",
        quantity: Math.max(1, Number(qty.value) || 1),
        unitCost: Number(cost.value) || 0,
      };
    };

    document.getElementById("po-items")?.addEventListener("change", (e) => {
      const target = e.target.closest("[data-idx]");
      if (!target) return;
      const idx = Number(target.dataset.idx);
      if (target.classList.contains("po-item-product")) {
        const prod = poProducts.find(p => p.id === target.value);
        const costInput = document.querySelector(`.po-item-cost[data-idx="${idx}"]`);
        if (prod && costInput) costInput.value = prod.price;
      }
      syncPoItemFromRow(idx);
      updatePoTotal();
    });

    document.getElementById("po-items")?.addEventListener("input", (e) => {
      const target = e.target.closest("[data-idx]");
      if (!target) return;
      syncPoItemFromRow(Number(target.dataset.idx));
      updatePoTotal();
    });

    document.getElementById("po-items")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".po-item-remove");
      if (!btn) return;
      poItems.splice(Number(btn.dataset.idx), 1);
      renderPoItems();
    });

    document.getElementById("po-add-item-btn")?.addEventListener("click", () => addPoItem());

    const populatePoSelects = async (selectedSupplierId = "") => {
      await populatePurchaseSupplierSelect("po-form", selectedSupplierId);
      const res = await api("/api/public/products");
      poProducts = res.products || [];
    };

    document.getElementById("add-po-btn")?.addEventListener("click", async () => {
      const form = document.getElementById("po-form");
      form.reset();
      form.querySelector('[name="supplierId"]').value = "";
      poItems = [];
      await populatePoSelects();
      form.poDate.value = new Date().toISOString().slice(0, 10);
      addPoItem();
      document.getElementById("po-total-display").textContent = "";
      document.getElementById("po-modal").classList.add("show");
    });

    document.getElementById("po-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      poItems.forEach((it, idx) => {
        const productSelect = document.querySelector(`.po-item-product[data-idx="${idx}"]`);
        const qty = document.querySelector(`.po-item-qty[data-idx="${idx}"]`);
        const cost = document.querySelector(`.po-item-cost[data-idx="${idx}"]`);
        poItems[idx] = {
          productId: productSelect ? productSelect.value : it.productId,
          productName: productSelect?.selectedOptions[0]?.textContent.split(" (")[0] || "",
          quantity: Math.max(1, Number(qty?.value) || 1),
          unitCost: Number(cost?.value) || 0,
        };
      });
      const validItems = poItems.filter(it => it.productName && it.quantity > 0);
      const supplierId = form.querySelector('[name="supplierId"]').value;
      if (!supplierId) return alert("Please select a valid supplier from the list.");
      if (!validItems.length) return alert("Add at least one item to the PO.");
      try {
        await api("/api/sales/purchase-orders", {
          method: "POST",
          body: JSON.stringify({
            supplierId: supplierId,
            poDate: form.poDate.value,
            expectedDate: form.expectedDate.value,
            notes: form.notes.value,
            items: validItems,
          }),
        });
        closePoModal();
        toast("Purchase order created", "success");
        loadPurchaseOrders();
      } catch (err) { alert(err.message); }
    });

    const loadPurchaseOrders = async () => {
      const tbody = document.getElementById("po-tbody");
      if (!tbody) return;
      try {
        const res = await api("/api/sales/purchase-orders");
        const orders = res.purchaseOrders || [];
        if (!orders.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted);">No purchase orders yet.</td></tr>';
          return;
        }
        tbody.innerHTML = orders.map(o => `
          <tr>
            <td><strong>${escapeHtml(o.po_number)}</strong></td>
            <td>${escapeHtml(o.po_date || '-')}</td>
            <td>${escapeHtml(o.supplier_name || '-')}</td>
            <td>${o.item_count || 0}</td>
            <td><strong>${formatCurrency(o.total_amount)}</strong></td>
            <td>${escapeHtml(o.expected_date || '-')}</td>
            <td>${poStatusChip(o.status)}</td>
            <td class="action-stack">
              <button class="btn-sm button-accent po-view-btn" data-po-id="${o.id}">View</button>
              ${o.status === "ordered" ? `<button class="btn-sm po-receive-btn" data-po-id="${o.id}">Receive</button>` : ''}
              ${o.status !== "received" ? `<button class="btn-sm btn-danger po-delete-btn" data-po-id="${o.id}">Delete</button>` : ''}
            </td>
          </tr>`).join('');
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger);">Failed to load purchase orders.</td></tr>';
      }
    };

    document.getElementById("po-tbody")?.addEventListener("click", async (e) => {
      // Global listener on document handles .po-view-btn, .po-receive-btn, .po-delete-btn
    });

    window.closePoModal = () => {
      document.getElementById("po-modal").classList.remove("show");
    };

    // ── Supplier Quotes (approve to create a PO) ──
    const sqStatusChip = (status) => {
      const cls = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
      const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
      return `<span class="chip ${cls}">${label}</span>`;
    };

    const renderSqItems = () => {
      const container = document.getElementById("sq-items");
      if (!container) return;
      container.innerHTML = sqItems.map((it, idx) => `
        <div class="sq-item-row" style="display:grid; grid-template-columns:1fr 56px 84px 30px; gap:6px; margin-bottom:6px; align-items:center;">
          <input class="sq-item-product" data-idx="${idx}" list="sq-products-datalist" placeholder="Type product name..." value="${escapeHtml(it.productName || '')}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <input class="sq-item-qty" data-idx="${idx}" type="number" min="1" value="${it.quantity}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <input class="sq-item-cost" data-idx="${idx}" type="number" min="0" value="${it.unitCost}" style="padding:6px; border:1px solid var(--line); border-radius:4px;" />
          <button type="button" class="btn btn-sm btn-danger sq-item-remove" data-idx="${idx}">x</button>
        </div>`).join('') || '<p style="color:var(--muted); font-size:12px;">No items yet.</p>';
      updateSqTotal();
    };

    const updateSqTotal = () => {
      const el = document.getElementById("sq-total-display");
      if (!el) return;
      const total = sqItems.reduce((s, it) => s + (it.quantity * it.unitCost), 0);
      el.textContent = `Total: ${formatCurrency(total)}`;
    };

    const addSqItem = (productId = "", quantity = 1, unitCost = 0) => {
      sqItems.push({ productId, productName: "", quantity, unitCost });
      renderSqItems();
    };

    const findSqProduct = (name) => {
      const n = String(name || "").trim().toLowerCase();
      if (!n) return null;
      return sqProducts.find(p => p && String(p.name || "").trim().toLowerCase() === n) || null;
    };

    const autofillSqProduct = (idx) => {
      const productInput = document.querySelector(`.sq-item-product[data-idx="${idx}"]`);
      const costInput = document.querySelector(`.sq-item-cost[data-idx="${idx}"]`);
      if (!productInput) return;
      const prod = findSqProduct(productInput.value);
      if (prod && costInput) costInput.value = prod.price;
    };

    const syncSqItemFromRow = (idx) => {
      const productInput = document.querySelector(`.sq-item-product[data-idx="${idx}"]`);
      const qty = document.querySelector(`.sq-item-qty[data-idx="${idx}"]`);
      const cost = document.querySelector(`.sq-item-cost[data-idx="${idx}"]`);
      if (!productInput || !qty || !cost) return;
      const name = String(productInput.value || "").trim();
      const prod = findSqProduct(name);
      sqItems[idx] = {
        productId: prod ? prod.id : null,
        productName: name,
        quantity: Math.max(1, Number(qty.value) || 1),
        unitCost: Number(cost.value) || 0,
      };
    };

    if (!window.__sqModalBound) {
      window.__sqModalBound = true;
      document.getElementById("sq-items")?.addEventListener("input", (e) => {
        const target = e.target.closest("[data-idx]");
        if (!target) return;
        const idx = Number(target.dataset.idx);
        if (target.classList.contains("sq-item-product")) autofillSqProduct(idx);
        syncSqItemFromRow(idx);
        updateSqTotal();
      });

      document.getElementById("sq-items")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".sq-item-remove");
        if (!btn) return;
        sqItems.splice(Number(btn.dataset.idx), 1);
        renderSqItems();
      });

      document.getElementById("sq-add-item-btn")?.addEventListener("click", () => addSqItem());

      document.getElementById("sq-pdf-file")?.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        const status = document.getElementById("sq-pdf-status");
        if (!status) return;
        if (!file) { sqPdfPath = ""; sqPdfName = ""; status.textContent = ""; return; }
        if (!/\.pdf$/i.test(file.name)) { status.textContent = "Please select a PDF file."; status.style.color = "var(--danger)"; return; }
        const fd = new FormData();
        fd.append("pdf", file);
        status.textContent = "Uploading PDF...";
        status.style.color = "var(--muted)";
        try {
          const data = await api("/api/sales/quotes/upload", { method: "POST", body: fd });
          sqPdfPath = data.fileUrl || "";
          sqPdfName = data.fileName || file.name;
          status.textContent = `Attached "${data.fileName}" as reference for admin approval.`;
          status.style.color = "var(--success)";
        } catch (err) {
          status.textContent = err.message;
          status.style.color = "var(--danger)";
        }
      });

      document.getElementById("sq-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        sqItems.forEach((it, idx) => {
          const productInput = document.querySelector(`.sq-item-product[data-idx="${idx}"]`);
          const qty = document.querySelector(`.sq-item-qty[data-idx="${idx}"]`);
          const cost = document.querySelector(`.sq-item-cost[data-idx="${idx}"]`);
          const name = String(productInput?.value || "").trim();
          const prod = findSqProduct(name);
          sqItems[idx] = {
            productId: prod ? prod.id : null,
            productName: name,
            quantity: Math.max(1, Number(qty?.value) || 1),
            unitCost: Number(cost?.value) || 0,
          };
        });
        const validItems = sqItems.filter(it => it.productName && it.quantity > 0);
        const supplierId = form.querySelector('[name="supplierId"]').value;
        if (!supplierId) return alert("Please select a valid supplier from the list.");
        if (!validItems.length) return alert("Add at least one item to the quote.");
        try {
          const createdQuote = await api("/api/sales/quotes", {
            method: "POST",
            body: JSON.stringify({
              supplierId: supplierId,
              quoteDate: form.quoteDate.value,
              validUntil: form.validUntil.value,
              notes: form.notes.value,
              items: validItems,
              pdfPath: sqPdfPath,
              pdfName: sqPdfName,
              enquiryId: sqEnquiryId || undefined,
            }),
          });
          closeSqModal();
          toast("Supplier quote saved", "success");
          loadSupplierQuotes();
          const onCreate = sqPostCreate;
          sqPostCreate = null;
          sqEnquiryId = null;
          if (typeof onCreate === "function") onCreate({ id: createdQuote.id, quoteNumber: createdQuote.quoteNumber, items: validItems });
        } catch (err) { alert(err.message); }
      });
    }

    const populateSqSelects = async (selectedSupplierId = "") => {
      await populatePurchaseSupplierSelect("sq-form", selectedSupplierId);
      const res = await api("/api/public/products");
      sqProducts = res.products || [];
      const datalist = document.getElementById("sq-products-datalist");
      if (datalist) {
        datalist.innerHTML = sqProducts.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.type)}</option>`).join('');
      }
    };

    const openSqModal = async (prefill = {}) => {
      sqPdfPath = "";
      sqPdfName = "";
      sqEnquiryId = prefill.enquiryId || null;
      sqPostCreate = prefill.onCreate || null;
      currentSqId.value = null;

      const form = document.getElementById("sq-form");
      form.reset();
      form.querySelector('[name="supplierId"]').value = "";
      form.querySelector('[name="supplierSearch"]').value = "";
      sqItems = [];
      const pdfInput = document.getElementById("sq-pdf-file");
      if (pdfInput) pdfInput.value = "";
      const pdfStatus = document.getElementById("sq-pdf-status");
      if (pdfStatus) { pdfStatus.textContent = ""; pdfStatus.style.color = ""; }
      await populateSqSelects(prefill.supplierId || "");
      form.quoteDate.value = new Date().toISOString().slice(0, 10);
      const vd = new Date();
      vd.setDate(vd.getDate() + 14);
      form.validUntil.value = vd.toISOString().slice(0, 10);
      if (prefill.items && prefill.items.length) {
        sqItems = prefill.items.map(it => ({ productId: it.productId || null, productName: it.productName || "", quantity: Math.max(1, it.quantity || 1), unitCost: Number(it.unitCost) || 0 }));
        renderSqItems();
      } else {
        addSqItem();
      }
      document.getElementById("sq-total-display").textContent = "";
      document.getElementById("sq-modal").classList.add("show");
    };

    document.getElementById("add-quote-btn")?.addEventListener("click", async () => openSqModal({}));

    const loadSupplierQuotes = async (status = "") => {
      const tbody = document.getElementById("quotes-tbody");
      if (!tbody) return;
      try {
        const res = await api(`/api/sales/quotes${status ? "?status=" + status : ""}`);
        const quotes = res.quotes || [];
        if (!quotes.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted);">No quotes found.</td></tr>';
          return;
        }
        tbody.innerHTML = quotes.map(q => `
          <tr>
            <td><strong>${escapeHtml(q.quote_number)}</strong>${q.pdf_path ? ' <span class="chip info" title="PDF attached">PDF</span>' : ''}</td>
            <td>${escapeHtml(q.quote_date || '-')}</td>
            <td>${escapeHtml(q.supplier_name || '-')}</td>
            <td>${q.item_count || 0}</td>
            <td><strong>${formatCurrency(q.total_amount)}</strong></td>
            <td>${escapeHtml(q.valid_until || '-')}</td>
            <td>${sqStatusChip(q.status)}</td>
            <td class="action-stack">
              <button class="btn-sm button-accent sq-view-btn" data-sq-id="${q.id}">View</button>
              ${q.status === "pending" ? `<button class="btn-sm sq-approve-btn" data-sq-id="${q.id}">Approve</button>` : ''}
              ${q.status === "pending" ? `<button class="btn-sm btn-danger sq-reject-btn" data-sq-id="${q.id}">Reject</button>` : ''}
              ${q.status === "pending" ? `<button class="btn-sm btn-danger sq-delete-btn" data-sq-id="${q.id}">Delete</button>` : ''}
            </td>
          </tr>`).join('');
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger);">Failed to load quotes.</td></tr>';
      }
      refreshPurchaseBadges();
    };

    const openSqView = async (sqId) => {
      try {
        const res = await api(`/api/sales/quotes/${sqId}`);
        const quote = res.quote;
        const items = res.items || [];
        currentSqId.value = sqId;
        document.getElementById("sq-view-title").textContent = `Supplier Quote ${quote.quote_number}`;
        document.getElementById("sq-view-content").innerHTML = `
          <div class="detail-row"><span class="detail-label">Supplier</span><span class="detail-value">${escapeHtml(quote.supplier_name || '')}</span></div>
          <div class="detail-row"><span class="detail-label">Quote Date</span><span class="detail-value">${escapeHtml(quote.quote_date || '-')}</span></div>
          ${quote.valid_until ? `<div class="detail-row"><span class="detail-label">Valid Until</span><span class="detail-value">${escapeHtml(quote.valid_until)}</span></div>` : ''}
          ${quote.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(quote.notes)}</span></div>` : ''}
          ${quote.pdf_path ? `<div class="detail-row"><span class="detail-label">PDF</span><span class="detail-value"><a href="/api/sales/quotes/${encodeURIComponent(quote.id)}/pdf" target="_blank" class="btn btn-sm">Download original quote</a></span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${sqStatusChip(quote.status)}</span></div>
          <div style="overflow-x:auto; margin-top:12px;">
            <table class="data-table" style="font-size:12px;">
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
              <tbody>${items.map(i => `
                <tr>
                  <td>${escapeHtml(i.product_name)}</td>
                  <td>${i.quantity}</td>
                  <td>${formatCurrency(i.unit_cost)}</td>
                  <td><strong>${formatCurrency(i.quantity * i.unit_cost)}</strong></td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
          <div style="text-align:right; margin-top:10px; font-weight:bold;">Total: ${formatCurrency(quote.total_amount)}</div>
        `;
        const approveBtn = document.getElementById("sq-view-approve-btn");
        const rejectBtn = document.getElementById("sq-view-reject-btn");
        if (approveBtn) approveBtn.style.display = quote.status === "pending" ? "" : "none";
        if (rejectBtn) rejectBtn.style.display = quote.status === "pending" ? "" : "none";
        document.getElementById("sq-view-modal").classList.add("show");
      } catch (err) { alert(err.message); }
    };

    document.getElementById("quotes-tbody")?.addEventListener("click", async (e) => {
      const view = e.target.closest(".sq-view-btn");
      const appr = e.target.closest(".sq-approve-btn");
      const rej = e.target.closest(".sq-reject-btn");
      const del = e.target.closest(".sq-delete-btn");
      if (view) return openSqView(view.dataset.sqId);
      if (appr) {
        if (!confirm("Approve this quote?")) return;
        try {
          const r = await api(`/api/sales/quotes/${appr.dataset.sqId}/approve`, { method: "POST" });
          toast(r.enquiryId ? "Approved — cost recorded, PO will be created on order confirmation" : `Approved — ${r.poNumber} created`, "success");
          renderSalesPage();
        } catch (err) { alert(err.message); }
        return;
      }
      if (rej) {
        if (!confirm("Reject this quote?")) return;
        try {
          await api(`/api/sales/quotes/${rej.dataset.sqId}/reject`, { method: "POST" });
          toast("Quote rejected", "success");
          loadSupplierQuotes();
        } catch (err) { alert(err.message); }
        return;
      }
      if (del) {
        if (!confirm("Delete this quote?")) return;
        try {
          await api(`/api/sales/quotes/${del.dataset.sqId}`, { method: "DELETE" });
          toast("Quote deleted", "success");
          loadSupplierQuotes();
        } catch (err) { alert(err.message); }
      }
    });

    if (!window.__sqViewModalBound) {
      window.__sqViewModalBound = true;
      document.getElementById("sq-view-approve-btn")?.addEventListener("click", async () => {
        if (!confirm("Approve this quote?")) return;
        try {
          const r = await api(`/api/sales/quotes/${currentSqId.value}/approve`, { method: "POST" });
          closeSqViewModal();
          toast(r.enquiryId ? "Approved — cost recorded, PO will be created on order confirmation" : `Approved — ${r.poNumber} created`, "success");
          renderSalesPage();
        } catch (err) { alert(err.message); }
      });

      document.getElementById("sq-view-reject-btn")?.addEventListener("click", async () => {
        if (!confirm("Reject this quote?")) return;
        try {
          await api(`/api/sales/quotes/${currentSqId.value}/reject`, { method: "POST" });
          closeSqViewModal();
          toast("Quote rejected", "success");
          loadSupplierQuotes();
        } catch (err) { alert(err.message); }
      });
    }

    window.closeSqModal = () => {
      document.getElementById("sq-modal").classList.remove("show");
    };
    window.closeSqViewModal = () => {
      document.getElementById("sq-view-modal").classList.remove("show");
      currentSqId.value = null;
    };

    // Order items preview & expand
    const loadOrderItems = async (orderId) => {
      const detail = root.querySelector(`.order-items-detail[data-order-id="${orderId}"]`);
      if (!detail) return;
      try {
        const res = await api(`/api/sales/orders/${orderId}/items`);
        const items = res.items || [];
        detail.innerHTML = items.length
          ? `<table style="width:100%;font-size:13px;margin-top:8px;"><thead><tr><th>Product</th><th>Price</th></tr></thead><tbody>${items.map(i => `<tr><td>${escapeHtml(i.product_name)}</td><td>${formatCurrency(i.price)}</td></tr>`).join('')}</tbody></table>`
          : '<p style="color:var(--text-soft);margin-top:8px;">No items found.</p>';
      } catch { detail.innerHTML = '<p style="color:var(--text-soft);margin-top:8px;">Failed to load items.</p>'; }
    };

    // Load item previews for all orders
    orders.forEach(async (o) => {
      try {
        const res = await api(`/api/sales/orders/${o.id}/items`);
        const items = res.items || [];
        const preview = root.querySelector(`.order-items-preview[data-order-id="${o.id}"]`);
        if (preview) preview.textContent = items.map(i => i.product_name).join(', ') || '-';
      } catch {}
    });

    root.addEventListener("click", async (e) => {
      const toggle = e.target.closest(".order-items-toggle");
      if (toggle) {
        e.preventDefault();
        const id = toggle.dataset.orderId;
        const type = toggle.dataset.type || 'order';
        const row = toggle.closest("tr").nextElementSibling;
        if (row && row.classList.contains("order-items-row")) {
          const isVisible = row.style.display !== "none";
          row.style.display = isVisible ? "none" : "table-row";
          if (!isVisible) {
            const detail = row.querySelector(".order-items-detail");
            if (detail) {
              if (type === 'service') {
                try {
                  const { request } = await api(`/api/sales/service-requests/${id}`);
                  let billItems = [];
                  try { billItems = JSON.parse(request.bill_details || '[]'); } catch (e) {}
                  detail.innerHTML = billItems.length
                    ? `<table style="width:100%;font-size:13px;margin-top:8px;"><thead><tr><th>Service Detail</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${billItems.map(it => `<tr><td>${escapeHtml(it.desc)}</td><td style="text-align:right;">${formatCurrency(it.amount)}</td></tr>`).join('')}</tbody></table>`
                    : '<p style="color:var(--text-soft);margin-top:8px;">No bill details.</p>';
                } catch { detail.innerHTML = 'Error loading details.'; }
              } else {
                await loadOrderItems(id);
              }
            }
          }
        }
        return;
      }

      const viewBillBtn = e.target.closest("[data-view-bill-invoice]");
      if (viewBillBtn) {
        const id = viewBillBtn.dataset.viewBillInvoice;
        const type = viewBillBtn.dataset.type || 'order';
        try {
          const modal = document.getElementById("order-view-modal");
          const body = document.getElementById("order-view-body");

          if (type === 'service') {
             const [serviceRes, paymentsRes] = await Promise.all([
               api(`/api/sales/service-requests/${id}`),
               api(`/api/sales/service-requests/${id}/payments`)
             ]);
             const request = serviceRes.request;
             const payments = paymentsRes.payments || [];
             const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

             let billItems = [];
             if (request.bill_details) {
               try {
                 const parsed = JSON.parse(request.bill_details);
                 if (Array.isArray(parsed)) billItems = parsed;
               } catch (e) {}
             }

             let paymentHistoryHtml = '';
             if (payments.length > 0) {
               paymentHistoryHtml = `
                 <div style="margin-top:20px; border-top:1px solid var(--line); padding-top:10px;">
                   <p class="eyebrow" style="margin-bottom:8px;">Payment History</p>
                   ${payments.map(p => `<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;"><span>${p.paid_at} (${p.payment_mode})</span><strong>${formatCurrency(p.amount)}</strong></div>`).join('')}
                 </div>
               `;
             }

             body.innerHTML = `
               <div style="margin-bottom:15px; padding:12px; background:var(--surface-soft); border-radius:12px; border:1px solid var(--line);">
                 <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                   <span class="eyebrow" style="font-weight:800;">SERVICE BILL</span>
                   <span class="chip ${getStatusTone(request.status)}" style="font-size:10px;">${request.status}</span>
                 </div>
                 <h2 style="margin:0; font-size:1.3rem;">${escapeHtml(request.customer_name)}</h2>
                 <p class="inline-meta" style="font-size:11px; margin-top:4px;">${request.id} | Billed: ${request.bill_date || '-'}</p>
               </div>
               <table class="data-table" style="margin-bottom:15px; font-size:12px;">
                 <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
                 <tbody>
                   ${billItems.map(it => `<tr><td>${escapeHtml(it.desc)}</td><td style="text-align:right; font-weight:800;">${formatCurrency(it.amount)}</td></tr>`).join('')}
                 </tbody>
                 <tfoot>
                   <tr style="background:var(--surface-soft);"><th style="padding:12px 10px; font-size:13px;">BILL TOTAL</th><th style="text-align:right; font-size:1.2rem; color:var(--accent);">${formatCurrency(request.bill_amount)}</th></tr>
                   <tr><td colspan="2" style="font-size:11px; color:var(--muted); text-align:right; padding:8px 10px;">Amount Paid: <strong>${formatCurrency(totalPaid)}</strong><br>Balance Due: <strong style="color:var(--danger);">${formatCurrency(request.bill_amount - totalPaid)}</strong></td></tr>
                 </tfoot>
               </table>
               ${paymentHistoryHtml}
             `;
             document.getElementById("order-download-link").href = `/api/sales/service-requests/${id}/bill.pdf`;
          } else {
            // Fetch order details AND items in parallel
            const [orderRes, itemsRes, paymentsRes] = await Promise.all([
              api("/api/sales/orders"),
              api(`/api/sales/orders/${id}/items`),
              api(`/api/sales/orders/${id}/payments`)
            ]);

            const order = (orderRes.orders || []).find(o => o.id === id);
            if (!order) throw new Error("Order details not found in recent list. Please refresh.");

            const items = itemsRes.items || [];
            const payments = paymentsRes.payments || [];
            const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

            let paymentHistoryHtml = '';
            if (payments.length > 0) {
              paymentHistoryHtml = `
                <div style="margin-top:20px; border-top:1px solid var(--line); padding-top:10px;">
                  <p class="eyebrow" style="margin-bottom:8px;">Payment History</p>
                  ${payments.map(p => `
                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; color:var(--text);">
                      <span>${p.paid_at} (${p.payment_mode})</span>
                      <strong>${formatCurrency(p.amount)}</strong>
                    </div>
                  `).join('')}
                </div>
              `;
            }

            body.innerHTML = `
              <div style="margin-bottom:15px; padding:12px; background:var(--surface-soft); border-radius:12px; border:1px solid var(--line);">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                  <span class="eyebrow" style="font-weight:800;">ORDER #${order.id.slice(-8)}</span>
                  <span class="chip ${getStatusTone(order.status)}" style="font-size:10px;">${order.status}</span>
                </div>
                <h2 style="margin:0; font-size:1.3rem;">${escapeHtml(order.customer_name)}</h2>
                <p class="inline-meta" style="font-size:11px; margin-top:4px;">${order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</p>
              </div>

              <table class="data-table" style="margin-bottom:15px; font-size:12px;">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th style="text-align:right;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(it => {
                    const qty = Number(it.qty) || 1;
                    const lineTotal = it.price * qty;
                    return `
                      <tr>
                        <td>
                          <strong style="display:block;">${escapeHtml(it.product_name)}</strong>
                          <span style="font-size:11px; color:var(--muted);">${qty} unit(s) x ${formatCurrency(it.price)}</span>
                        </td>
                        <td style="text-align:right; vertical-align:middle; font-weight:800;">
                          ${formatCurrency(lineTotal)}
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:var(--surface-soft);">
                    <th style="padding:12px 10px; font-size:13px;">BILL TOTAL</th>
                    <th style="text-align:right; font-size:1.2rem; color:var(--accent);">${formatCurrency(order.total_amount)}</th>
                  </tr>
                  <tr>
                    <td colspan="2" style="font-size:11px; color:var(--muted); text-align:right; padding:8px 10px;">
                      Amount Paid: <strong>${formatCurrency(totalPaid)}</strong><br>
                      Balance Due: <strong style="color:var(--danger);">${formatCurrency(order.total_amount - totalPaid)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
              ${paymentHistoryHtml}
            `;

            document.getElementById("order-download-link").href = `/api/sales/orders/${id}/invoice.pdf`;
          }

          const shareBtn = document.getElementById("order-share-btn");
          if (shareBtn) {
            shareBtn.onclick = async () => {
              const pdfUrl = type === 'service' ? `/api/sales/service-requests/${id}/bill.pdf` : `/api/sales/orders/${id}/invoice.pdf`;
              const waMsg = `Hi,\n\nHere is your ${type === 'service' ? 'Service Bill' : 'Order Invoice'}.\n\nThank you, TECHLAB!`;

              if (navigator.canShare && navigator.share) {
                try {
                  const response = await fetch(pdfUrl);
                  const blob = await response.blob();
                  const file = new File([blob], `${type === 'service' ? 'ServiceBill' : 'Invoice'}-${id.slice(-6)}.pdf`, { type: "application/pdf" });
                  if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: "Invoice", text: waMsg, files: [file] });
                    return;
                  }
                } catch (e) { console.log("Modal share failed:", e); }
              }
              window.open(pdfUrl, "_blank");
            };
          }

          const dcBtn = document.getElementById("order-challan-btn");
          if (dcBtn) {
            dcBtn.style.display = (type === 'order') ? 'inline-flex' : 'none';
          }

          modal.classList.add("show");
        } catch (err) { toast(err.message, "error"); }
        return;
      }

      const orderWaBtn = e.target.closest("[data-order-wa-share]");
      if (orderWaBtn) {
        const id = orderWaBtn.dataset.orderWaShare;
        const type = orderWaBtn.dataset.type || 'order';
        try {
          let customerName = 'Customer';
          let customerMobile = '';
          let totalAmount = 0;
          let displayId = id;
          let pdfUrl = '';

          if (type === 'service') {
            const { request } = await api(`/api/sales/service-requests/${id}`);
            customerName = request.customer_name;
            customerMobile = request.customer_mobile;
            totalAmount = request.bill_amount;
            displayId = id;
            pdfUrl = `/api/sales/service-requests/${id}/bill.pdf`;
          } else {
            const { orders } = await api("/api/sales/orders");
            const order = orders.find(o => o.id === id);
            customerName = order.customer_name;
            customerMobile = order.customer_mobile;
            totalAmount = order.total_amount;
            displayId = id.slice(-8);
            pdfUrl = `/api/sales/orders/${id}/invoice.pdf`;
          }

          const waMsg = `Hi ${customerName},\n\n${type === 'service' ? 'Service Bill' : 'Invoice'} #${displayId}\nTotal: ${formatCurrency(totalAmount)}\n\nThank you, TECHLAB!`;

          // Try to use native share (supports file attachment on mobile)
          if (navigator.canShare && navigator.share) {
            try {
              const response = await fetch(pdfUrl);
              const blob = await response.blob();
              const file = new File([blob], `${type === 'service' ? 'ServiceBill' : 'Invoice'}-${displayId}.pdf`, { type: "application/pdf" });

              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: `${type === 'service' ? 'Service Bill' : 'Invoice'} #${displayId}`,
                  text: waMsg,
                  files: [file]
                });
                return; // Shared successfully
              }
            } catch (shareErr) {
              console.log("Native share failed, falling back to text-only:", shareErr);
            }
          }

          // Fallback to text-only WhatsApp link if native share is not available or fails
          window.open(`https://wa.me/${customerMobile || ''}?text=${encodeURIComponent(waMsg)}`, "_blank");
        } catch (err) { toast(err.message, "error"); }
        return;
      }

      const statusBtn = e.target.closest(".order-status-btn");
      if (statusBtn) {
        const orderId = statusBtn.dataset.orderId;
        const nextStatus = statusBtn.dataset.nextStatus;
        try {
          await api(`/api/sales/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
          toast(`Order marked as ${nextStatus}`, "success");
          renderSalesPage();
        } catch (err) { toast(err.message || "Failed to update status", "error"); }
        return;
      }

      const cancelBtn = e.target.closest(".order-cancel-btn");
      if (cancelBtn) {
        const orderId = cancelBtn.dataset.orderId;
        try {
          await api(`/api/sales/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "Cancelled" }) });
          toast("Order cancelled", "success");
          renderSalesPage();
        } catch (err) { toast(err.message || "Failed to cancel order", "error"); }
        return;
      }
    });

    // POS Interface Logic
    const posProducts = dashboard.products || [];
    const posCart = []; // [{id, qty, customPrice, boxes, looseQty, factor}]
    let posGlobalDiscount = 0;
    let posPaymentMode = "Cash";
    let posIsGstBill = 1;
    let posWorkflowMode = "invoice"; // 'invoice' or 'challan'

    const getCatIcon = (type) => {
      const icons = { Laptop: '<i data-lucide="laptop" style="width:16px;height:16px;"></i>', Desktop: '<i data-lucide="monitor" style="width:16px;height:16px;"></i>', CCTV: '<i data-lucide="video" style="width:16px;height:16px;"></i>', Accessory: '<i data-lucide="plug" style="width:16px;height:16px;"></i>', Printer: '<i data-lucide="printer" style="width:16px;height:16px;"></i>', Networking: '<i data-lucide="globe" style="width:16px;height:16px;"></i>', Service: '<i data-lucide="wrench" style="width:16px;height:16px;"></i>' };
      return icons[type] || '<i data-lucide="package" style="width:16px;height:16px;"></i>';
    };

    // Render POS products
    const renderPosProducts = (searchTerm = "") => {
      const grid = document.getElementById("pos-product-grid");
      if (!grid) return;

      const q = searchTerm.trim().toLowerCase();

      // If search is empty, show the instruction state
      if (!q) {
        grid.innerHTML = `
          <div class="pos-empty-state">
            <h2>Quick Bill Builder</h2>
            <p>Start typing to search and add products instantly.</p>
          </div>`;
        return;
      }

      // Combine local and global products to ensure new purchases show up
      const combinedProducts = [...(posProducts || []), ...(window.__salesProducts || [])];
      // De-duplicate by ID
      const uniqueProducts = Array.from(new Map(combinedProducts.map(p => [p.id, p])).values());

      const filtered = uniqueProducts.filter(p => {
        if (!p) return false;
        return (p.name || "").toLowerCase().includes(q) ||
               (p.hsn_code && p.hsn_code.toLowerCase().includes(q)) ||
               (p.type || "").toLowerCase().includes(q);
      });

      if (!filtered.length) {
        grid.innerHTML = `
          <div class="pos-empty-state">
            <h2>No matches found</h2>
            <p>Try searching for a different keyword or HSN code.</p>
          </div>`;
        return;
      }

      grid.innerHTML = filtered.map(p => {
        const isMeasurement = p.unit_type === 'measurement';
        const stockDisplay = isMeasurement
          ? `${p.stock} Box | ${p.loose_stock} ${p.sub_unit || 'Mtr'}`
          : `${p.stock} In Stock`;

        const finalPrice = p.price - (p.price * (p.discount_percent || 0) / 100);
        const img = p.image_url || p.imageUrl;
        const minStock = p.min_stock || 5;
        const lowStock = p.stock <= minStock;

        return `
          <div class="pos-product-card" data-pos-add="${p.id}">
            ${img ? `<div class="pos-card-img"><img src="${escapeHtml(img)}" alt="" /></div>` : `<div class="pos-card-icon">${getCatIcon(p.type)}</div>`}
            <div class="pos-card-meta">${escapeHtml(p.type)}</div>
            <div class="pos-card-name">${escapeHtml(p.name)}</div>
            <div class="pos-card-price-row">
              <div class="pos-card-price">${formatCurrency(finalPrice)}</div>
              <div class="pos-card-stock ${lowStock ? 'low' : ''}">${stockDisplay}</div>
            </div>
            ${lowStock ? `<div class="pos-card-low-badge">Low Stock</div>` : ''}
          </div>
        `;
      }).join("");
    };

    // Render cart as a receipt
    const renderPosCart = () => {
      const cartList = document.getElementById("pos-cart-list");
      const cartTotal = document.getElementById("pos-cart-total");
      const checkoutTrigger = document.getElementById("pos-checkout-trigger");
      const receiptDate = document.getElementById("receipt-date");

      if (!cartList) return;
      if (receiptDate) receiptDate.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      if (!posCart.length) {
        cartList.innerHTML = `
          <div style="text-align: center; margin-top: 60px; opacity: 0.5;">
            <p style="margin-bottom: 10px;"><i data-lucide="file-text" style="width:40px;height:40px;opacity:0.5;"></i></p>
            <p style="font-size: 13px; font-weight: 600;">Add items to start a bill</p>
          </div>`;
        if (cartTotal) cartTotal.textContent = formatCurrency(0);
        if (checkoutTrigger) checkoutTrigger.disabled = true;
        if (cartFabCount) cartFabCount.textContent = "0";
        if (cartFab) cartFab.classList.remove("active");
        return;
      }

      const allProds = [...(posProducts || []), ...(window.__salesProducts || [])];
      const items = posCart.map(item => {
        const product = allProds.find(p => p.id === item.id);
        return product ? { ...item, product } : null;
      }).filter(i => i && i.product);

      const subtotal = items.reduce((sum, item) => {
        const rate = posIsGstBill ? (item.product.gst_rate || 0) : 0;
        let unitTotal;

        if (item.customPrice != null) {
          unitTotal = Number(item.customPrice);
        } else {
          const unitTaxable = (item.product.finalPrice ?? item.product.price);
          const unitGst = Math.round(unitTaxable * rate / 100);
          unitTotal = unitTaxable + unitGst;
        }

        const effectiveQty = item.boxes !== undefined
          ? (item.boxes * item.factor) + (item.looseQty || 0)
          : item.qty;

        return sum + (unitTotal * effectiveQty);
      }, 0);
      const total = Math.max(0, subtotal - posGlobalDiscount);

      cartList.innerHTML = items.map((item, idx) => {
        const isMeasurement = item.boxes !== undefined;
        const effectiveQty = isMeasurement ? (item.boxes * item.factor) + (item.looseQty || 0) : item.qty;
        const unitLabel = isMeasurement ? (item.product.sub_unit || 'Mtr') : 'unit';

        let qtyControls = `
          <div class="receipt-qty-box" style="display:flex; align-items:center; gap:8px;">
            <button onclick="posCartQty('${item.id}',-1)" class="btn-qty">−</button>
            <input type="number" value="${item.qty}" class="qty-input-direct"
                   onchange="posUpdateQtyDirect('${item.id}', this.value)"
                   style="width:40px; text-align:center; border:none; background:var(--surface-soft); font-weight:800; font-size:14px; border-radius:4px; padding:4px 0;" />
            <button onclick="posCartQty('${item.id}',1)" class="btn-qty">+</button>
          </div>
        `;

        if (isMeasurement) {
          qtyControls = `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; font-weight:800; color:var(--muted); width:36px;">BOX</span>
                <button onclick="posCartQty('${item.id}',-1)" class="btn-qty-sm">−</button>
                <span class="qty-val-sm">${item.boxes}</span>
                <button onclick="posCartQty('${item.id}',1)" class="btn-qty-sm">+</button>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; font-weight:800; color:var(--muted); width:36px;">${unitLabel.toUpperCase()}</span>
                <input type="number" class="pos-item-loose-edit" value="${item.looseQty}" step="any" min="0" data-id="${item.id}" style="width:48px; height:24px; padding:2px 4px; font-size:11px; border:1px solid var(--line); border-radius:4px;" />
              </div>
            </div>
          `;
        }

        return `
          <div class="receipt-item" data-cart-id="${item.id}">
            <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
              <div style="flex:1;">
                <div class="receipt-item-name">${escapeHtml(item.product.name)}</div>
                <div style="display:flex; align-items:center; gap:12px; margin-top:8px;">
                  ${qtyControls}
                  <div class="receipt-price-edit-box" style="display:flex; align-items:center; gap:2px; background:var(--surface-soft); padding:2px 6px; border-radius:6px;">
                    <span style="font-size:11px; color:var(--muted);">₹</span>
                    <input type="number" class="pos-item-price-edit" value="${item.customPrice}" step="any" data-id="${item.id}" style="width:54px; border:none; background:none; font-size:12px; font-weight:800; color:var(--text); padding:0;" />
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:13px; font-weight:900;">${formatCurrency((item.customPrice ?? (item.product.finalPrice ?? item.product.price)) * effectiveQty)}</div>
                <button class="cart-line-remove" onclick="removePosItem('${item.id}')" style="color:var(--danger); border:none; background:none; cursor:pointer; font-size:18px; padding:4px 0 0 8px; opacity:0.4;">&times;</button>
              </div>
            </div>
            ${isMeasurement ? `<div style="font-size:10px; font-weight:700; color:var(--accent); margin-top:4px;">Total Billed: ${effectiveQty} ${unitLabel}</div>` : ''}
          </div>
        `;
      }).join("");

      // Re-bind listeners
      cartList.querySelectorAll(".pos-item-price-edit").forEach(input => {
        input.addEventListener("change", (e) => {
          const id = e.target.dataset.id;
          const cartItem = posCart.find(it => it.id === id);
          if (cartItem) {
            cartItem.customPrice = Number(e.target.value) || 0;
            renderPosCart();
          }
        });
      });
      cartList.querySelectorAll(".pos-item-loose-edit").forEach(input => {
        input.addEventListener("change", (e) => {
          const id = e.target.dataset.id;
          const cartItem = posCart.find(it => it.id === id);
          if (cartItem) {
            cartItem.looseQty = Number(e.target.value) || 0;
            renderPosCart();
          }
        });
      });

      if (cartTotal) cartTotal.textContent = formatCurrency(total);
      const headerTotal = document.getElementById("pos-header-total");
      if (headerTotal) headerTotal.textContent = formatCurrency(total);

      if (checkoutTrigger) checkoutTrigger.disabled = false;
      if (cartFabCount) cartFabCount.textContent = items.reduce((s, it) => s + it.qty, 0);
      if (cartFab) cartFab.classList.add("active");
    };

    // Quantity change (global)
    window.posCartQty = (id, delta) => {
      const item = posCart.find(it => it.id === id);
      if (!item) return;
      if (item.boxes !== undefined) {
        item.boxes = Math.max(0, item.boxes + delta);
        if (item.boxes === 0 && item.looseQty === 0) item.boxes = 1; // Safeguard
      } else {
        item.qty = Math.max(1, item.qty + delta);
      }
      renderPosCart();
    };

    window.posUpdateQtyDirect = (id, val) => {
      const item = posCart.find(it => it.id === id);
      if (!item) return;
      item.qty = Math.max(1, parseInt(val) || 1);
      renderPosCart();
    };

    // Remove item from cart (global function)
    window.removePosItem = (id) => {
      const idx = posCart.findIndex(it => it.id === id);
      if (idx !== -1) {
        posCart.splice(idx, 1);
        renderPosCart();
      }
    };

    // Auto-focus search on tab switch
    document.querySelectorAll(".chrome-tab[data-sales-tab]").forEach(tab => {
      tab.addEventListener("click", () => {
        if (tab.dataset.salesTab === 'sale') {
          setTimeout(() => {
            const search = document.getElementById("pos-search");
            if (search) search.focus();
          }, 100);
        }
      });
    });

    // Add to cart: clear search after adding
    let posAddBusy = false;
    document.getElementById("pos-product-grid")?.addEventListener("click", (e) => {
      if (posAddBusy) return;
      const card = e.target.closest("[data-pos-add]");
      if (card) {
        try {
          posAddBusy = true;
          const id = card.dataset.posAdd;
          // Combine local and global products to ensure we find the item
          const allProds = [...(posProducts || []), ...(window.__salesProducts || [])];
          const product = allProds.find(p => p.id === id);

          if (!product) {
            console.error("Product not found in caches:", id);
            posAddBusy = false;
            return;
          }

          const existing = posCart.find(item => item.id === id);
          const isMeasurement = product.unit_type === 'measurement';

          if (existing) {
            if (isMeasurement) {
              existing.boxes = (existing.boxes || 0) + 1;
            } else {
              existing.qty = (existing.qty || 0) + 1;
            }
          } else {
            const discount = product.discount_percent || product.discountPercent || 0;
            const price = product.price || 0;
            const finalPrice = price - (price * discount / 100);

            const cartItem = {
              id: product.id,
              qty: isMeasurement ? 0 : 1,
              customPrice: finalPrice
            };
            if (isMeasurement) {
              cartItem.boxes = 1;
              cartItem.looseQty = 0;
              cartItem.factor = product.conversion_factor || product.conversionFactor || 1;
            }
            posCart.push(cartItem);
          }

          renderPosCart();

          // Clear search and reset input
          const searchInput = document.getElementById("pos-search");
          if (searchInput) {
            searchInput.value = "";
            renderPosProducts("");
            searchInput.focus();
          }

          showToast(`Added: ${product.name}`, "success");
        } catch (err) {
          console.error("Failed to add to cart:", err);
          toast("Error adding item", "error");
        } finally {
          setTimeout(() => { posAddBusy = false; }, 200);
        }
      }
    });

    // Search handler
    const posSearch = document.getElementById("pos-search");
    if (posSearch) {
      posSearch.addEventListener("input", (e) => renderPosProducts(e.target.value));
    }

    // Category Taps for POS
    root.querySelectorAll(".chip-tab[data-category]").forEach(chip => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".chip-tab[data-category]").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        renderPosProductsByCategory(chip.dataset.category);
      });
    });

    const renderPosProductsByCategory = (category) => {
      const grid = document.getElementById("pos-product-grid");
      if (!grid) return;

      const allProds = [...(posProducts || []), ...(window.__salesProducts || [])];
      const uniqueProducts = Array.from(new Map(allProds.map(p => [p.id, p])).values());

      const filtered = category === ""
        ? uniqueProducts.slice(0, 30) // Show first 30 if no search
        : uniqueProducts.filter(p => p.type === category);

      grid.innerHTML = filtered.map(p => {
        const finalPrice = p.price - (p.price * (p.discount_percent || 0) / 100);
        return `
          <div class="pos-product-card" data-pos-add="${p.id}">
            <div class="pos-card-icon">${getCatIcon(p.type)}</div>
            <div class="pos-card-meta">${escapeHtml(p.type)}</div>
            <div class="pos-card-name">${escapeHtml(p.name)}</div>
            <div class="pos-card-price">${formatCurrency(finalPrice)}</div>
          </div>
        `;
      }).join("");
    };

    // Workflow Switcher Logic
    root.querySelectorAll(".workflow-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        root.querySelectorAll(".workflow-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        posWorkflowMode = tab.dataset.posMode;

        const gstContainer = document.getElementById("pos-gst-toggle-container");
        const checkoutBtn = document.getElementById("pos-checkout-btn");
        const paymentBtns = document.querySelector(".pos-payment-section");
        const genDcWrapper = document.getElementById("pos-gen-dc-wrapper");
        const dcFields = document.getElementById("pos-dc-fields");

        if (posWorkflowMode === "challan") {
          if (gstContainer) gstContainer.style.display = "none";
          if (paymentBtns) paymentBtns.style.display = "none";
          if (genDcWrapper) genDcWrapper.style.display = "none";
          if (checkoutBtn) {
            checkoutBtn.textContent = "🚀 GENERATE CHALLAN";
            checkoutBtn.classList.add("mode-challan");
          }
          document.getElementById("pos-gen-dc").checked = true;
          dcFields.style.display = "grid";

          const dateInput = document.getElementById("pos-dc-date");
          if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
        } else {
          if (gstContainer) gstContainer.style.display = "flex";
          if (paymentBtns) paymentBtns.style.display = "block";
          if (genDcWrapper) genDcWrapper.style.display = "block";
          if (checkoutBtn) {
            checkoutBtn.textContent = "COMPLETE SALE";
            checkoutBtn.classList.remove("mode-challan");
          }
          document.getElementById("pos-gen-dc").checked = false;
          dcFields.style.display = "none";
        }
        renderPosCart(); // Refresh totals if GST mode changed
      });
    });

    window.posFillWalkIn = () => {
      const mob = document.getElementById("pos-customer-mobile");
      const name = document.getElementById("pos-customer-name");
      if (mob) mob.value = "0000000000";
      if (name) name.value = "Cash Customer";
      showToast("Walk-in details filled", "info");
    };

    window.showInstantUpiQr = async () => {
      const totalStr = document.getElementById("pos-cart-total")?.textContent || "";
      const amount = parseFloat(totalStr.replace(/[^0-9.]/g, '')) || 0;

      if (amount <= 0) return toast("Add items first", "warning");

      try {
        const res = await api("/api/settings/business");
        const bizName = res.settings?.business_name || "TECHLAB";

        const bankRes = await api("/api/settings/bank-accounts");
        const primaryBank = (bankRes.accounts || []).find(a => a.is_primary);

        if (!primaryBank || !primaryBank.upi_id) {
          return alert("Please set up a Primary Bank Account with UPI ID in Settings first.");
        }

        const upiUrl = `upi://pay?pa=${primaryBank.upi_id}&pn=${encodeURIComponent(bizName)}&am=${amount}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

        const overlay = document.createElement('div');
        overlay.className = 'qr-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
          <div class="qr-container">
            <img src="${qrUrl}" alt="UPI QR Code" />
          </div>
          <div style="text-align:center;">
            <h2 style="margin:0;">${formatCurrency(amount)}</h2>
            <p style="opacity:0.8; margin:5px 0 20px;">Scan with any UPI App</p>
            <button class="button button-success" style="width:200px;" onclick="this.closest('.qr-overlay').remove(); document.getElementById('pos-checkout-btn').click();"><i data-lucide="check-circle-2" style="width:14px;height:14px;"></i> Confirmed Paid</button>
            <button class="btn" style="display:block; width:100%; margin-top:10px; color:#fff;" onclick="this.closest('.qr-overlay').remove()">Cancel</button>
          </div>
        `;
        document.body.appendChild(overlay);
      } catch (e) { toast("Failed to generate QR", "error"); }
    };

    // Checkout form toggle
    const checkoutTrigger = document.getElementById("pos-checkout-trigger");
    const checkoutForm = document.getElementById("pos-checkout-form");
    const cancelCheckout = document.getElementById("pos-cancel-checkout");

    checkoutTrigger?.addEventListener("click", () => {
      checkoutForm.style.display = "block";
      checkoutTrigger.style.display = "none";
      document.getElementById("pos-customer-mobile").focus();
    });

    cancelCheckout?.addEventListener("click", () => {
      checkoutForm.style.display = "none";
      checkoutTrigger.style.display = "block";
    });

    // Handle Confirm Checkout
    document.getElementById("pos-checkout-btn")?.addEventListener("click", async () => {
      const mobileField = document.getElementById("pos-customer-mobile");
      const nameField = document.getElementById("pos-customer-name");
      const statusMsg = document.getElementById("pos-status");

      if (!mobileField || !nameField || !statusMsg) {
        console.error("Critical POS elements missing");
        return;
      }

      const mobile = mobileField.value.trim();
      const name = nameField.value.trim();

      if (!mobile || !name) {
        toast("Customer name and mobile are required", "error");
        statusMsg.textContent = "Error: Customer details missing";
        return;
      }

      if (!posCart.length) {
        toast("Cart is empty", "warning");
        return;
      }

      const items = posCart.map(item => {
        const effectiveQty = item.boxes !== undefined
          ? (item.boxes * item.factor) + (item.looseQty || 0)
          : item.qty;
        return {
          productId: item.id,
          qty: effectiveQty,
          customPrice: item.customPrice
        };
      });

      try {
        statusMsg.style.color = "var(--accent)";
        statusMsg.textContent = "Processing Transaction...";

        if (posWorkflowMode === "challan") {
          // STANDALONE CHALLAN FLOW
          const payload = {
            customerName: name,
            mobile: mobile,
            items: items,
            dispatchDate: document.getElementById("pos-dc-date")?.value,
            receiverName: document.getElementById("pos-dc-receiver")?.value?.trim() || name,
            transport: document.getElementById("pos-dc-transport")?.value?.trim(),
            vehicleNo: document.getElementById("pos-dc-vehicle")?.value?.trim(),
            notes: document.getElementById("pos-dc-notes")?.value?.trim() || "Unbilled Dispatch",
          };

          const res = await api("/api/sales/challans/standalone", {
            method: "POST",
            body: JSON.stringify(payload)
          });

          if (res.id) {
            window.open(`/api/sales/challans/${res.id}.pdf`, "_blank");
            statusMsg.textContent = `Challan ${res.challan_number} Generated!`;
          }
        } else {
          // STANDARD INVOICE FLOW
          const orderPayload = {
            buyerName: name,
            mobile: mobile,
            items: items,
            isGstBill: posIsGstBill,
            paymentMode: posPaymentMode,
            billDate: document.getElementById("pos-sale-date")?.value
          };

          const res = await api("/api/public/orders", {
            method: "POST",
            body: JSON.stringify(orderPayload)
          });

          if (document.getElementById("pos-gen-dc")?.checked && res.orderId) {
            const dc = await api("/api/sales/challans", {
              method: "POST",
              body: JSON.stringify({
                sourceType: "order",
                sourceId: res.orderId,
                dispatchDate: document.getElementById("pos-dc-date")?.value,
                receiverName: document.getElementById("pos-dc-receiver")?.value?.trim() || name,
              })
            });
            window.open(`/api/sales/challans/${dc.id}.pdf`, "_blank");
          }

          if (res.orderId) {
            window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, "_blank");
            statusMsg.textContent = "Invoice Generated Successfully!";
          }
        }

        toast("Success!", "success");

        // Reset POS State
        posCart.length = 0;
        renderPosCart();

        // Hide form and clear fields
        checkoutForm.style.display = "none";
        document.getElementById("pos-checkout-trigger").style.display = "block";
        mobileField.value = "";
        nameField.value = "";

        if (cartFab) cartFab.classList.remove("active");

        // Refresh Recent Sales List
        if (typeof loadRecentSales === 'function') loadRecentSales();

      } catch (err) {
        statusMsg.style.color = "var(--danger)";
        statusMsg.textContent = "Error: " + err.message;
        toast(err.message, "error");
      }
    });

    // Recent Sales Logic
    const loadRecentSales = async () => {
      console.log("Loading recent sales...");
      const tbody = document.getElementById("recent-sales-tbody");
      if (!tbody) {
        console.error("tbody #recent-sales-tbody not found");
        return;
      }

      const searchInput = document.getElementById("bill-list-search");
      const q = (searchInput?.value || "").trim().toLowerCase();
      const gstFilter = document.querySelector(".bill-gst-filter.active")?.dataset.filter || "all";

      try {
        const res = await api("/api/sales/orders");
        const orders = res.orders || [];
        console.log(`Fetched ${orders.length} orders`);

        const filtered = orders.filter(o => {
          const matchesSearch = !q ||
            (o.id && o.id.toLowerCase().includes(q)) ||
            (o.customer_name || "").toLowerCase().includes(q) ||
            (o.customer_mobile && o.customer_mobile.includes(q));

          let matchesGst = true;
          if (gstFilter === "gst") matchesGst = !!o.is_gst;
          if (gstFilter === "non-gst") matchesGst = !o.is_gst;

          return matchesSearch && matchesGst;
        });

        const isMobile = false;

        if (!filtered.length) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">${q ? 'No matching bills found.' : 'No bills recorded yet.'}</td></tr>`;
          return;
        }

        if (isMobile) {
          // Card View for Mobile
          tbody.closest('table').style.display = 'none';
          let cardContainer = document.getElementById('bills-card-container');
          if (!cardContainer) {
            cardContainer = document.createElement('div');
            cardContainer.id = 'bills-card-container';
            cardContainer.className = 'mobile-card-grid';
            tbody.closest('.table-wrap').appendChild(cardContainer);
          }
          cardContainer.style.display = 'grid';

          cardContainer.innerHTML = filtered.slice(0, 50).map(o => {
            let paymentBadge = '';
            const isFullyPaid = o.payment_status === 'paid';
            if (isFullyPaid) paymentBadge = `<span class="chip success">Paid</span>`;
            else if (o.payment_status === 'partial') paymentBadge = `<span class="chip info">Partial</span>`;
            else paymentBadge = `<span class="chip warning">Pending</span>`;

            const displayId = o.source_type === 'service' ? o.id : `#${o.id.slice(-8)}`;
            const gstBadge = o.is_gst ? `<span class="chip" style="font-size: 8px; padding: 1px 4px; background: #e0f2f1; color: #2e7d32; border-color: #a5d6a7; margin-left: 6px;">GST</span>` : '';

            return `
              <div class="record-card">
                <div class="record-card-header">
                  <div>
                    <div class="record-card-title">${escapeHtml(o.customer_name)} ${gstBadge}</div>
                    <div class="record-card-meta">${displayId} • ${new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  ${paymentBadge}
                </div>
                <div class="record-card-body">
                  <div class="record-card-stat">
                    <span class="record-card-label">Total Amount</span>
                    <span class="record-card-value">${formatCurrency(o.total_amount)}</span>
                  </div>
                  <div id="items-preview-card-${o.id}" style="font-size:12px; color:var(--text-soft); padding:0 4px;">Loading items...</div>
                </div>
                <div class="record-card-actions">
                  <button class="button button-primary" data-view-bill-invoice="${o.id}" data-type="${o.source_type}">View Details</button>
                  <button class="button button-secondary" data-order-wa-share="${o.id}" data-type="${o.source_type}">WhatsApp Share</button>
                  ${!isFullyPaid ? `<button class="button button-accent button-full" onclick="window.openOrderPaymentMode('${o.id}', '${o.source_type}')">Receive Payment</button>` : ''}
                </div>
              </div>
            `;
          }).join("");
        } else {
          // Table View for Desktop
          const table = tbody.closest('table');
          table.style.display = 'table';
          const cardContainer = document.getElementById('bills-card-container');
          if (cardContainer) cardContainer.style.display = 'none';

          tbody.innerHTML = filtered.slice(0, 50).map(o => {
            let paymentBadge = '';
            const isFullyPaid = o.payment_status === 'paid';

            if (isFullyPaid) {
              const pMode = o.payment_mode ? ` (${o.payment_mode})` : '';
              paymentBadge = `<span class="chip success" style="font-size: 10px;">Paid${pMode}</span>`;
            } else if (o.payment_status === 'partial') {
              paymentBadge = `<span class="chip info" style="font-size: 10px;">Partial</span>`;
            } else {
              paymentBadge = `<span class="chip warning" style="font-size: 10px;">Pending</span>`;
            }

            const revertBtn = (o.linked_dc_id && o.source_type === 'order') ? `<button class="button button-small button-danger" onclick="window.revertOrderToDc('${o.id}')">Revert to DC</button>` : '';
            const displayId = o.source_type === 'service' ? o.id : `#${o.id.slice(-8)}`;
            const gstBadge = o.is_gst ? `<span class="chip" style="font-size: 8px; padding: 1px 4px; background: #e0f2f1; color: #2e7d32; border-color: #a5d6a7; vertical-align: middle; margin-left: 4px;">GST</span>` : '';

            return `
              <tr>
                <td>
                  <a href="#" class="order-items-toggle" data-order-id="${o.id}" data-type="${o.source_type}" style="color:var(--accent); font-weight:700;">${displayId}</a>
                  ${gstBadge}
                </td>
                <td><strong>${escapeHtml(o.customer_name)}</strong></td>
                <td><span class="order-items-preview" data-order-id="${o.id}" style="color:var(--text-soft); font-size:12px;">Loading...</span></td>
                <td>${paymentBadge}</td>
                <td><strong>${formatCurrency(o.total_amount)}</strong></td>
                <td><span class="chip ${getStatusTone(o.status)}">${escapeHtml(o.status)}</span></td>
                <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                <td class="action-stack">
                  <button class="button button-small button-primary" data-view-bill-invoice="${o.id}" data-type="${o.source_type}">View</button>
                  <button class="button button-small button-secondary" data-order-wa-share="${o.id}" data-type="${o.source_type}">Share</button>
                  ${!isFullyPaid ? `<button class="button button-small button-accent" onclick="window.openOrderPaymentMode('${o.id}', '${o.source_type}')">Mark Paid</button>` : ''}
                  ${revertBtn}
                </td>
              </tr>
              <tr class="order-items-row" id="order-items-${o.id}" style="display:none;">
                <td colspan="8" style="padding:0 16px 12px; background:var(--surface-soft);">
                  <div class="order-items-detail" data-order-id="${o.id}"></div>
                </td>
              </tr>
            `;
          }).join("");
        }

        // Trigger item preview loading for each row/card
        filtered.slice(0, 50).forEach(async (o) => {
          try {
            const previews = document.querySelectorAll(`.order-items-preview[data-order-id="${o.id}"], #items-preview-card-${o.id}`);
            if (o.source_type === 'service') {
              const res = await api(`/api/sales/service-requests/${o.id}`);
              let billItems = [];
              try { billItems = JSON.parse(res.request.bill_details || '[]'); } catch (e) {}
              previews.forEach(p => p.textContent = billItems.map(i => i.desc).join(', ') || '-');
            } else {
              const res = await api(`/api/sales/orders/${o.id}/items`);
              const items = res.items || [];
              previews.forEach(p => p.textContent = items.map(i => i.product_name).join(', ') || '-');
            }
          } catch {}
        });

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="color:var(--danger);">Failed to load sales: ' + escapeHtml(err.message) + '</td></tr>';
      }
    };

    document.getElementById("bill-list-search")?.addEventListener("input", loadRecentSales);
    root.querySelectorAll(".bill-gst-filter").forEach(btn => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".bill-gst-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadRecentSales();
      });
    });

    window.revertOrderToDc = async (orderId) => {
      if (!confirm("Delete this bill and return items to 'Unbilled DC' status? This cannot be undone.")) return;
      try {
        const res = await api(`/api/sales/orders/${orderId}?revertToDc=true`, { method: "DELETE" });
        toast(res.message, "success");
        loadRecentSales();
        renderSalesPage(); // Refresh stats
      } catch (err) { alert(err.message); }
    };

    // ── SALES PIPELINE (ENQUIRY BOARD) REWORK ──
    const enquirySearch = document.getElementById("enquiry-search");
    let enquiryList = [];
    const enqStatuses = ["new", "quoted", "confirmed", "delivered"];

    const loadEnquiries = async () => {
      try {
        const res = await api("/api/sales/enquiries");
        enquiryList = res.enquiries || [];
        renderEnquiryBoard();
      } catch (err) { console.error("Enquiry load failed", err); }
    };

    const renderEnquiryBoard = () => {
      const q = (enquirySearch?.value || "").trim().toLowerCase();

      // Reset columns
      enqStatuses.forEach(status => {
        const listEl = document.getElementById(`list-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        if (listEl) listEl.innerHTML = "";
        if (countEl) countEl.textContent = "0";
      });

      const filtered = enquiryList.filter(e =>
        !q || (e.customer_name || "").toLowerCase().includes(q) ||
        (e.customer_mobile || "").toLowerCase().includes(q) ||
        (e.product_interest || "").toLowerCase().includes(q) ||
        (e.id || "").toLowerCase().includes(q)
      );

      const counts = { new: 0, quoted: 0, confirmed: 0, delivered: 0 };

      filtered.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).forEach(e => {
        const status = enqStatuses.includes(e.status) ? e.status : "new";
        const listEl = document.getElementById(`list-${status}`);
        if (!listEl) return;

        counts[status]++;
        const dateStr = e.created_at ? new Date(e.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
        const priceStr = e.quoted_price ? formatCurrency(e.quoted_price) : (e.budget ? `Budget ${formatCurrency(e.budget)}` : 'No quote');

        const card = document.createElement("div");
        card.className = `enq-card status-${status}`;
        card.dataset.enqId = e.id;
        card.innerHTML = `
          <div class="enq-card-customer">${escapeHtml(e.customer_name)}</div>
          <div class="enq-card-product">${escapeHtml(e.product_interest || e.type)}</div>
          <div class="enq-card-footer">
            <span class="enq-card-price">${priceStr}</span>
            <span class="enq-card-time">${dateStr}</span>
          </div>
        `;
        card.onclick = () => openEnqDrawer(e.id);
        listEl.appendChild(card);
      });

      enqStatuses.forEach(status => {
        const el = document.getElementById(`count-${status}`);
        if (el) el.textContent = counts[status];
      });
    };

    const statusBadge = (s) => {
      const cls = { new: 'warning', quoted: 'info', confirmed: 'success', delivered: 'accent' }[s] || '';
      return `<span class="chip ${cls}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
    };

    window.openEnqDrawer = async (id) => {
      const e = enquiryList.find(x => x.id === id);
      if (!e) return;

      const overlay = document.getElementById("enq-drawer-overlay");
      const head = document.getElementById("enq-drawer-head-content");
      const body = document.getElementById("enq-drawer-body");
      const footer = document.getElementById("enq-drawer-actions");

      head.innerHTML = `
        <div class="enq-v2-customer-title">${escapeHtml(e.customer_name)}</div>
        <div class="enq-v2-customer-meta">
          <span><i data-lucide="phone"></i> ${escapeHtml(e.customer_mobile)}</span>
          <span><i data-lucide="hash"></i> ${e.id}</span>
        </div>
      `;

      const options = (() => { try { return e.quote_options ? JSON.parse(e.quote_options) : []; } catch { return []; } })();
      const quoteSummaryHtml = options.length
        ? `<div style="margin-bottom:24px;">
             <p class="enq-v2-section-title">Quote Items (${options.length})</p>
             ${options.map(o => {
               const name = o.name || o.product || 'Draft';
               const isProc = o.sqId || o.source === 'procurement' || (!o.name && o.supplierId);
               const chip = isProc
                 ? (o.sqNumber ? `<span class="chip warning" style="font-size:9px;">${escapeHtml(o.sqNumber)}</span>` : '<span class="chip info" style="font-size:9px;">Supply</span>')
                 : '<span class="chip success" style="font-size:9px;">Stock</span>';
               const margin = (Number(o.quotedPrice) || 0) - (Number(o.costPrice) || 0);
               return `
               <div class="enq-option-row">
                 <span class="opt-product">${escapeHtml(name)} ${chip}</span>
                 <span class="opt-price">${formatCurrency(o.quotedPrice || 0)} <span style="color:var(--text-3); font-size:11px;">(${formatCurrency(margin)})</span></span>
               </div>`;
             }).join("")}
           </div>`
        : '';

      let poInfoHtml = '';
      const poIds = e.po_ids ? (() => { try { return JSON.parse(e.po_ids); } catch { return []; } })() : (e.po_id ? [e.po_id] : []);
      if (poIds.length) {
        poInfoHtml = `<p class="enq-v2-section-title">Purchase Order${poIds.length > 1 ? 's' : ''} (${poIds.length})</p>
          <div style="margin-bottom:16px; display:flex; gap:6px; flex-wrap:wrap;">${poIds.map(pid => `<button class="button button-small button-accent" onclick="openPoView('${pid}')">View PO</button>`).join('')}</div>`;
      }

      body.innerHTML = `
        <div class="enq-v2-grid">
          <div class="enq-v2-info-box"><span class="enq-v2-info-label">Interest</span><div class="enq-v2-info-value">${escapeHtml(e.product_interest || e.type)}</div></div>
          <div class="enq-v2-info-box"><span class="enq-v2-info-label">Status</span><div class="enq-v2-info-value">${statusBadge(e.status)}</div></div>
          <div class="enq-v2-info-box"><span class="enq-v2-info-label">Quantity</span><div class="enq-v2-info-value">${e.quantity || 1}</div></div>
          <div class="enq-v2-info-box"><span class="enq-v2-info-label">Current Value</span><div class="enq-v2-info-value">${e.quoted_price ? formatCurrency(e.quoted_price) : 'N/A'}</div></div>
        </div>
        ${quoteSummaryHtml}
        ${poInfoHtml}
        <p class="enq-v2-section-title">Timeline & Notes</p>
        <div class="enq-v2-notes-box">${e.notes ? escapeHtml(e.notes) : 'No notes available.'}</div>
        <div style="font-size:0.8rem; color:var(--text-soft);">Created: ${new Date(e.created_at).toLocaleString()}</div>
      `;

      let actions = [];
      if (e.status === 'new') actions.push(`<button class="button button-primary" onclick="handleEnqAction('${e.id}', 'quote')">Prepare Quote</button>`);
      if (e.status === 'quoted') {
        actions.push(`<button class="button button-secondary" onclick="handleEnqAction('${e.id}', 'quote')">Edit Quote</button>`);
        actions.push(`<button class="button button-primary" onclick="handleEnqAction('${e.id}', 'confirm')">Confirm Order</button>`);
      }
      if (e.status === 'confirmed') actions.push(`<button class="button button-primary" onclick="handleEnqAction('${e.id}', 'deliver')">Mark Delivered</button>`);
      if (e.po_id) actions.push(`<button class="button button-accent" onclick="openPoView('${e.po_id}')">View PO</button>`);
      actions.push(`<button class="button button-danger" onclick="handleEnqAction('${e.id}', 'delete')">Delete Lead</button>`);

      footer.innerHTML = actions.join('');
      overlay.classList.add("show");
      if (window.lucide) window.lucide.createIcons();
    };

    window.closeEnqDrawer = () => {
      document.getElementById("enq-drawer-overlay").classList.remove("show");
    };

    window.closeEnquiryModal = () => {
      document.getElementById("enquiry-modal")?.classList.remove("show");
    };

    window.handleEnqAction = async (id, action) => {
      const e = enquiryList.find(x => x.id === id);
      if (!e) return;

      if (action === 'quote') {
        closeEnqDrawer();
        openEnquiryQuoteModal(e);
      } else if (action === 'confirm') {
        const advance = await new Promise((resolve) => openEnquiryConfirmModal(e, resolve));
        if (advance === null) return;
        try {
          await api(`/api/sales/enquiries/${id}/confirm`, { method: "POST", body: JSON.stringify(advance) });
          showToast("Order confirmed successfully", "success");
          closeEnqDrawer();
          loadEnquiries();
        } catch (err) { alert(err.message); }
      } else if (action === 'deliver') {
        try {
          await api(`/api/sales/enquiries/${id}/deliver`, { method: "POST" });
          closeEnqDrawer();
          loadEnquiries();
        } catch (err) { alert(err.message); }
      } else if (action === 'delete') {
        if (!confirm("Delete this lead permanently?")) return;
        try {
          await api(`/api/sales/enquiries/${id}`, { method: "DELETE" });
          closeEnqDrawer();
          loadEnquiries();
        } catch (err) { alert(err.message); }
      }
    };

    const statusBadgeLead = (s) => {
      const cls = { new: 'warning', quoted: 'info', confirmed: 'success', delivered: 'accent' }[s] || '';
      return `<span class="chip ${cls}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
    };

    // Recording new lead
    document.getElementById("enq-record-toggle")?.addEventListener("click", () => {
      document.getElementById("enquiry-modal").classList.add("show");
    });

    document.getElementById("enquiry-create-form")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const statusEl = document.getElementById("enquiry-status");
      try {
        await api("/api/sales/enquiries", {
          method: "POST",
          body: JSON.stringify({
            customerName: fd.get("customer_name"),
            mobile: fd.get("customer_mobile"),
            type: fd.get("type"),
            productInterest: fd.get("product_interest"),
            preferredDate: fd.get("preferred_date"),
            budget: Number(fd.get("budget")) || undefined,
            notes: fd.get("notes"),
            supplierId: fd.get("supplier_id") || undefined,
            quantity: Number(fd.get("quantity")) || 1,
            costPrice: Number(fd.get("cost_price")) || 0
          }),
        });
        ev.target.reset();
        statusEl.textContent = "Lead recorded!";
        setTimeout(() => { document.getElementById("enquiry-modal").classList.remove("show"); loadEnquiries(); }, 600);
      } catch (err) { statusEl.textContent = err.message; }
    });

    enquirySearch?.addEventListener("input", renderEnquiryBoard);
    loadEnquiries();

    // ── Quotation Logic

    // Modal-based confirm + PO creation with supplier advance capture.
    // Calls done(advance) on confirm or done(null) on cancel.
    const openEnquiryConfirmModal = (enquiry, done) => {
      let modal = document.getElementById("enquiry-confirm-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "enquiry-confirm-modal";
        modal.className = "modal";
        document.body.appendChild(modal);
      }

      const rawOptions = enquiry.quote_options ? (() => { try { return JSON.parse(enquiry.quote_options); } catch { return []; } })() : [];
      const lines = rawOptions.length
        ? rawOptions.map(o => ({
            name: String(o.name || o.product || '').trim(),
            source: o.source || (o.sqId || o.supplierId ? 'procurement' : 'inventory'),
            legacy: (o.source == null || o.source === '') && !o.sqId,
            supplierId: o.supplierId || null,
            sqNumber: o.sqNumber || null,
            costPrice: Number(o.costPrice) || 0,
            quotedPrice: Number(o.quotedPrice) || 0,
            quantity: Number(o.quantity) || 1
          }))
        : [{
            name: enquiry.product_interest || "Product",
            source: enquiry.supplier_id ? 'procurement' : 'inventory',
            supplierId: enquiry.supplier_id || null,
            sqNumber: null,
            costPrice: Number(enquiry.cost_price) || 0,
            quotedPrice: Number(enquiry.quoted_price) || 0,
            quantity: Number(enquiry.quantity) || 1
          }];

      const costTotal = lines.reduce((s, l) => s + l.costPrice, 0);
      const quoteTotal = lines.reduce((s, l) => s + l.quotedPrice, 0);
      const procLines = lines.filter(l => l.source === 'procurement');
      const supplierCount = new Set(procLines.map(l => l.supplierId).filter(Boolean)).size;
      const pendingProc = procLines.filter(l => !l.legacy && !l.sqNumber && !(Number(l.costPrice) > 0));
      const today = new Date().toISOString().slice(0, 10);

      const poPlanText = !procLines.length
        ? `<span style="color:var(--success);">All items are from stock — no purchase orders needed.</span>`
        : `${procLines.length} ordered line(s) from ${supplierCount} supplier(s). ${procLines.length === 1 ? 'A purchase order' : 'One purchase order per supplier'} will be created on confirm.`;

      modal.innerHTML = `
        <div class="modal-content" style="max-width:560px;">
          <button type="button" class="modal-close" id="eqc-close">&times;</button>
          <h3 style="margin:0 0 4px;">Confirm Order</h3>
          <p style="margin:0 0 14px; color:var(--muted); font-size:13px;">Confirm the quoted items for <strong>${escapeHtml(enquiry.customer_name)}</strong>.</p>

          <div style="background:var(--surface-2); border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--text-3);">${poPlanText}</div>

          <div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:14px;">
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
              <thead><tr style="background:var(--surface-2); text-align:left; color:var(--text-3);">
                <th style="padding:8px;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px;">Cost</th><th style="padding:8px;">Quote</th>
              </tr></thead>
              <tbody>${lines.map(l => `
                <tr style="border-top:1px solid var(--border);">
                  <td style="padding:8px;">
                    <div>${escapeHtml(l.name)}</div>
                    <div style="margin-top:3px;">
                      ${l.source === 'procurement'
                        ? (l.legacy ? `<span class="chip info" style="font-size:9px;">Supplier order</span>` : `<span class="chip warning" style="font-size:9px;">${l.sqNumber ? escapeHtml(l.sqNumber) : (Number(l.costPrice) > 0 ? 'Cost entered' : 'SQ not requested')}</span>`)
                        : '<span class="chip success" style="font-size:9px;">From Stock</span>'}
                    </div>
                  </td>
                  <td style="padding:8px;">${l.quantity}</td>
                  <td style="padding:8px;">${formatCurrency(l.costPrice)}</td>
                  <td style="padding:8px;"><strong>${formatCurrency(l.quotedPrice)}</strong></td>
                </tr>`).join('')}
              </tbody>
              <tfoot style="border-top:1px solid var(--border);">
                <tr><td style="padding:8px;"><strong>Total</strong></td><td></td>
                  <td style="padding:8px;"><strong>${formatCurrency(costTotal)}</strong></td>
                  <td style="padding:8px;"><strong>${formatCurrency(quoteTotal)}</strong></td></tr>
                <tr><td style="padding:8px;" colspan="4">Estimated margin: <strong>${formatCurrency(quoteTotal - costTotal)}</strong></td></tr>
              </tfoot>
            </table>
          </div>

          ${pendingProc.length ? `<p style="font-size:12px; color:var(--danger); margin:0 0 10px;">Needs action: ${pendingProc.map(l => escapeHtml(l.name)).join(', ')} — enter a supplier cost or approve an SQ before the order can be confirmed.</p>` : ''}

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;">
            <label style="margin:0; font-size:13px;">Advance paid to supplier (Rs.)
              <input type="number" id="eqc-advance" value="0" min="0" step="1" style="width:100%; margin-top:4px;" />
            </label>
            <label style="margin:0; font-size:13px;">Payment mode
              <select id="eqc-mode" style="width:100%; margin-top:4px;">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <label style="margin:0 0 6px; font-size:13px;">Advance date
            <input type="date" id="eqc-date" value="${today}" style="width:100%; margin-top:4px;" />
          </label>
          <p style="font-size:12px; color:var(--text-3); margin:8px 0 14px;">Enter 0 if no advance was paid. The advance is recorded on the enquiry and auto-applied when the PO is received.</p>

          <div style="display:flex; gap:10px; align-items:center;">
            <button class="button button-primary" type="button" id="eqc-confirm-btn">Confirm Order</button>
            <button class="button button-secondary" type="button" id="eqc-cancel-btn">Cancel</button>
            <p id="eqc-status" class="inline-status"></p>
          </div>
        </div>`;

      const close = () => { modal.style.display = "none"; };

      modal.querySelector("#eqc-close").onclick = () => { close(); done(null); };
      modal.querySelector("#eqc-cancel-btn").onclick = () => { close(); done(null); };
      modal.addEventListener("click", (ev) => { if (ev.target === modal) { close(); done(null); } });

      modal.querySelector("#eqc-confirm-btn").onclick = () => {
        const amount = Number(modal.querySelector("#eqc-advance").value) || 0;
        done({
          advanceAmount: amount,
          advanceMode: modal.querySelector("#eqc-mode").value || "Cash",
          advanceDate: modal.querySelector("#eqc-date").value || today
        });
        close();
      };

      modal.style.display = "flex";
    };

    let eqLines = [];
    let eqSuppliers = [];
    let eqProducts = [];
    let eqSqStatus = {};

    const eqProductByName = (name) => {
      const n = String(name || "").trim().toLowerCase();
      return eqProducts.find(p => p && String(p.name || "").trim().toLowerCase() === n) || null;
    };

    const eqSupplierAreaHtml = (line) => `
      <div style="margin-bottom:8px;">
        <label style="margin:0; font-size:12px; display:block;">Supplier
          <select class="eq-line-supplier" style="width:100%; margin-top:2px;">
            <option value="">-- Select --</option>
            ${eqSuppliers.map(s => `<option value="${s.id}" ${s.id === line.supplierId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join("")}
          </select>
        </label>
      </div>`;

    const eqSqAreaHtml = (line) => {
      let inner;
      if (!line.sqId) {
        inner = `
          <button type="button" class="button button-small button-secondary eq-line-request-sq">Request Supplier Quote</button>
          <span style="font-size:11px; color:var(--muted);">Optional — request a formal quote, or just type the supplier cost on the line after you get a verbal price.</span>`;
      } else {
        const st = eqSqStatus[line.sqId];
        const cls = st === 'approved' ? 'success' : (st === 'rejected' ? 'danger' : 'warning');
        const label = st === 'approved' ? 'Approved' : (st === 'rejected' ? 'Rejected' : 'Pending');
        inner = `
          <span class="chip ${cls}" style="font-size:11px;">${escapeHtml(line.sqNumber || line.sqId)} — ${label}</span>
          ${st !== 'approved' ? `<button type="button" class="button button-small button-secondary eq-line-request-sq">Update SQ</button>` : ''}
          <span style="font-size:11px; color:var(--muted);">PO for this line is placed when the customer confirms.</span>`;
      }
      return `<div class="eq-line-sq-area" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">${inner}</div>`;
    };

    const eqLineRowHtml = (line, i) => {
      const isStock = line.source !== 'procurement';
      return `
        <div class="eq-line-row" data-idx="${i}" data-unit="0" style="border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px; background:var(--card-bg);">
          <div style="display:grid; grid-template-columns:1fr 160px; gap:8px; align-items:end; margin-bottom:8px;">
            <label style="margin:0; font-size:12px;">Product
              <input type="text" class="eq-line-product" value="${escapeHtml(line.name || '')}" list="eq-products-datalist" placeholder="Type product name or item description..." style="width:100%; margin-top:2px;" />
            </label>
            <label style="margin:0; font-size:12px;">Source
              <select class="eq-line-source" style="width:100%; margin-top:2px;">
                <option value="inventory" ${isStock ? 'selected' : ''}>From Stock</option>
                <option value="procurement" ${!isStock ? 'selected' : ''}>Buy from Supplier</option>
              </select>
            </label>
          </div>
          <div class="eq-line-procure-part" ${isStock ? 'style="display:none;"' : 'style="display:block; margin-bottom:8px;"'}>
            ${isStock ? '' : eqSupplierAreaHtml(line) + eqSqAreaHtml(line) + (Number(line.costPrice) > 0 ? '' : '<div style="margin-bottom:6px;"><span class="eq-cost-pending-chip" style="display:inline-block; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold; background:var(--warning-bg, #fef3c7); color:var(--warning, #d97706); border:1px solid var(--warning-border, #fcd34d);">Cost pending — enter supplier cost after the quote</span></div>')}
          </div>
          <div class="eq-line-stock-part" ${isStock ? 'style="display:block; margin-bottom:8px;"' : 'style="display:none;"'}>
            ${isStock ? '<span style="font-size:11px; color:var(--muted);">Fulfilled from inventory at delivery — no purchase order needed.</span>' : ''}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 70px auto; gap:8px; align-items:end;">
            <label style="margin:0; font-size:12px;">${isStock ? 'Cost (line total)' : 'Supplier cost (line total)'}
              <input type="number" class="eq-line-cost" data-clean="1" value="${line.costPrice || ''}" min="0" step="1" style="width:100%; margin-top:2px;" />
            </label>
            <label style="margin:0; font-size:12px;">Quote (Rs.)
              <input type="number" class="eq-line-quote" value="${line.quotedPrice || ''}" min="0" step="1" style="width:100%; margin-top:2px;" />
            </label>
            <label style="margin:0; font-size:12px;">Qty
              <input type="number" class="eq-line-qty" value="${line.quantity || 1}" min="1" step="1" style="width:70px; margin-top:2px;" />
            </label>
            <button type="button" class="button button-small button-secondary eq-line-remove" data-idx="${i}" style="padding-top:8px;" title="Remove">&times;</button>
          </div>
        </div>`;
    };

    const openEnquiryQuoteModal = async (enquiry) => {
      let modal = document.getElementById("enquiry-quote-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "enquiry-quote-modal";
        modal.className = "modal";
        document.body.appendChild(modal);
      }

      const existingOptions = enquiry.quote_options ? (() => { try { return (JSON.parse(enquiry.quote_options) || []).map(o => ({
        productId: o.productId || null,
        name: String(o.name || o.product || '').trim(),
        source: o.source || (o.sqId || o.supplierId ? 'procurement' : 'inventory'),
        supplierId: o.supplierId || '',
        supplierName: o.supplierName || '',
        costPrice: Number(o.costPrice) || 0,
        quotedPrice: Number(o.quotedPrice) || 0,
        quantity: Number(o.quantity) || 1,
        sqId: o.sqId || null,
        sqNumber: o.sqNumber || null,
        poId: o.poId || null,
        costSource: o.sqId ? 'sq' : 'manual'
      })); } catch { return []; } })() : [];

      modal.innerHTML = `
        <div class="modal-content" style="max-width:780px;">
          <button type="button" class="modal-close" id="eq-close">&times;</button>
          <h3 style="margin:0 0 4px;">Customer Quote — ${escapeHtml(enquiry.customer_name)}</h3>
          <p style="margin:0 0 16px; color:var(--muted); font-size:13px;">
            Add the items you want to quote. <strong>From Stock</strong> lines are fulfilled from inventory. <strong>Buy from Supplier</strong> lines need a supplier and a cost — you can type the cost straight in after a verbal quote, or (optionally) create a formal supplier quote (SQ) and approve it. Either way the purchase order is placed automatically when the customer confirms.
          </p>
          <datalist id="eq-products-datalist"></datalist>
          <div id="eq-lines-list" style="margin-bottom:14px;"></div>
          <button type="button" class="button button-small button-secondary" id="eq-add-line-btn" style="margin-bottom:18px;">+ Add Line</button>
          <div id="eq-total-display" style="margin-bottom:12px; font-weight:bold;"></div>
          <label class="full-width" style="margin-bottom:12px;">Notes<textarea id="eq-notes" style="min-height:40px;" placeholder="Any notes for the customer...">${escapeHtml(enquiry.notes || '')}</textarea></label>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="button button-primary" type="button" id="eq-save-btn">Save Quote</button>
            <button class="button button-secondary" type="button" id="eq-cancel-btn">Cancel</button>
            <p id="eq-modal-status" class="inline-status"></p>
          </div>
        </div>`;

      const container = modal.querySelector("#eq-lines-list");
      const statusEl = modal.querySelector("#eq-modal-status");

      eqLines = existingOptions.length ? existingOptions.map(o => ({ ...o })) : [];

      const [supRes, prodRes, sqRes] = await Promise.all([
        api("/api/sales/suppliers"),
        api("/api/public/products"),
        api("/api/sales/quotes")
      ]);
      eqSuppliers = supRes.suppliers || [];
      eqProducts = prodRes.products || [];
      eqSqStatus = {};
      (sqRes.quotes || []).forEach(q => { eqSqStatus[q.id] = q.status; });
      const prodDl = modal.querySelector("#eq-products-datalist");
      if (prodDl) prodDl.innerHTML = eqProducts.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.type)}${p.last_cost ? ' — cost ' + formatCurrency(p.last_cost) : ''}</option>`).join('');

      const renderAll = () => {
        container.innerHTML = eqLines.length
          ? eqLines.map((l, i) => eqLineRowHtml(l, i)).join('')
          : '<p style="color:var(--muted); font-size:13px;">No lines yet. Click "+ Add Line" to start quoting.</p>';
        updateTotal();
      };

      const updateTotal = () => {
        const el = modal.querySelector("#eq-total-display");
        if (!el) return;
        const total = eqLines.reduce((s, l) => s + (Number(l.quotedPrice) || 0), 0);
        el.textContent = `Total quote: ${formatCurrency(total)}`;
      };

      const syncLineFromRow = (row, i) => {
        const line = eqLines[i];
        if (!line) return;
        const name = String(row.querySelector(".eq-line-product").value || "").trim();
        const prod = eqProductByName(name);
        line.productId = prod ? prod.id : line.productId;
        line.name = name;
        line.source = row.querySelector(".eq-line-source").value || 'inventory';
        if (line.source === 'procurement') {
          const supSel = row.querySelector(".eq-line-supplier");
          if (supSel) line.supplierId = supSel.value || '';
        }
        line.costPrice = Number(row.querySelector(".eq-line-cost").value) || 0;
        line.quotedPrice = Number(row.querySelector(".eq-line-quote").value) || 0;
        line.quantity = Math.max(1, Number(row.querySelector(".eq-line-qty").value) || 1);
      };

      renderAll();

      modal.querySelector("#eq-close").onclick = () => { modal.style.display = "none"; };
      modal.querySelector("#eq-cancel-btn").onclick = () => { modal.style.display = "none"; };

      modal.querySelector("#eq-add-line-btn").onclick = () => {
        eqLines.push({ productId: null, name: enquiry.product_interest || '', source: 'inventory', supplierId: '', supplierName: '', costPrice: 0, quotedPrice: 0, quantity: 1, sqId: null, sqNumber: null, poId: null, costSource: 'manual' });
        renderAll();
      };

      container.addEventListener("input", (ev) => {
        const row = ev.target.closest(".eq-line-row");
        if (!row) return;
        const i = Number(row.dataset.idx);
        const line = eqLines[i];
        if (!line) return;
        const cost = row.querySelector(".eq-line-cost");
        if (ev.target.classList.contains("eq-line-product")) {
          const prod = eqProductByName(ev.target.value);
          row.dataset.unit = prod ? (Number(prod.last_cost) || 0) : 0;
          if (prod) {
            const qty = Math.max(1, Number(row.querySelector(".eq-line-qty").value) || 1);
            if (cost.dataset.clean === "1") cost.value = Math.round((Number(prod.last_cost) || 0) * qty);
          }
          line.productId = prod ? prod.id : null;
          line.name = String(ev.target.value || "").trim();
        }
        if (ev.target.classList.contains("eq-line-cost")) {
          cost.dataset.clean = "0";
          const chip = row.querySelector(".eq-cost-pending-chip");
          if (chip) chip.style.display = (Number(cost.value) || 0) > 0 ? "none" : "";
        }
        if (ev.target.classList.contains("eq-line-qty")) {
          const unit = Number(row.dataset.unit) || 0;
          if (unit > 0 && cost.dataset.clean === "1") {
            cost.value = Math.round(unit * (Math.max(1, Number(ev.target.value) || 1)));
          }
        }
        line.costPrice = Number(cost.value) || 0;
        line.quotedPrice = Number(row.querySelector(".eq-line-quote").value) || 0;
        line.quantity = Math.max(1, Number(row.querySelector(".eq-line-qty").value) || 1);
        updateTotal();
      });

      container.addEventListener("change", (ev) => {
        const row = ev.target.closest(".eq-line-row");
        if (!row) return;
        const i = Number(row.dataset.idx);
        const line = eqLines[i];
        if (!line) return;
        if (ev.target.classList.contains("eq-line-source")) {
          line.source = ev.target.value;
          const stockPart = row.querySelector(".eq-line-stock-part");
          const procPart = row.querySelector(".eq-line-procure-part");
          if (line.source === 'procurement') {
            stockPart.style.display = "none";
            procPart.style.display = "block";
            procPart.innerHTML = eqSupplierAreaHtml(line) + eqSqAreaHtml(line);
          } else {
            procPart.style.display = "none";
            stockPart.style.display = "block";
            if (line.sqId) { line.sqId = null; line.sqNumber = null; }
          }
        }
        if (ev.target.classList.contains("eq-line-supplier")) {
          const oldSupp = line.supplierId;
          line.supplierId = ev.target.value || '';
          if (oldSupp !== line.supplierId && line.sqId) {
            line.sqId = null;
            line.sqNumber = null;
            const sqArea = row.querySelector(".eq-line-sq-area");
            if (sqArea) sqArea.innerHTML = eqSqAreaHtml(line);
          }
        }
      });

      container.addEventListener("click", async (ev) => {
        const removeBtn = ev.target.closest(".eq-line-remove");
        const reqBtn = ev.target.closest(".eq-line-request-sq");
        if (removeBtn) {
          const i = Number(removeBtn.dataset.idx);
          eqLines.splice(i, 1);
          renderAll();
          return;
        }
        if (reqBtn) {
          const row = reqBtn.closest(".eq-line-row");
          const i = Number(row.dataset.idx);
          const line = eqLines[i];
          if (!line) return;
          const name = String(row.querySelector(".eq-line-product").value || "").trim();
          const qty = Math.max(1, Number(row.querySelector(".eq-line-qty").value) || 1);
          if (!name) { alert("Enter a product name before requesting a quote."); return; }
          if (!line.supplierId) { alert("Select a supplier for this line first."); return; }
          const prod = eqProductByName(name);
          line.source = 'procurement';
          await openSqModal({
            enquiryId: enquiry.id,
            supplierId: line.supplierId,
            items: [{ productId: prod ? prod.id : null, productName: name, quantity: qty, unitCost: 0 }],
            onCreate: (sq) => {
              line.sqId = sq.id;
              line.sqNumber = sq.quoteNumber;
              eqSqStatus[sq.id] = 'pending';
              const sqArea = row.querySelector(".eq-line-sq-area");
              if (sqArea) sqArea.innerHTML = eqSqAreaHtml(line);
              toast(`Supplier quote ${sq.quoteNumber} requested`, "success");
            }
          });
        }
      });

      modal.querySelector("#eq-save-btn").onclick = async () => {
        statusEl.textContent = "Saving...";
        modal.querySelectorAll(".eq-line-row").forEach((row) => {
          const i = Number(row.dataset.idx);
          if (eqLines[i]) syncLineFromRow(row, i);
        });

        if (!eqLines.length) { statusEl.textContent = "Add at least one line."; statusEl.style.color = ""; return; }
        for (const l of eqLines) {
          if (!l.name) { statusEl.textContent = "Every line needs a product name."; statusEl.style.color = ""; return; }
          if (!(Number(l.quotedPrice) > 0)) { statusEl.textContent = `Enter a quoted price for ${l.name}.`; statusEl.style.color = ""; return; }
        }

        try {
          await api(`/api/sales/enquiries/${enquiry.id}/quote`, {
            method: "POST",
            body: JSON.stringify({
              status: enquiry.status === 'new' ? 'quoted' : undefined,
              quoteOptions: eqLines.map(l => ({ ...l, costSource: l.sqId ? 'sq' : 'manual' })),
              notes: modal.querySelector("#eq-notes").value || undefined
            })
          });
          modal.style.display = "none";
          loadEnquiries();
        } catch (err) {
          statusEl.textContent = err.message;
          statusEl.style.color = "";
        }
      };

      modal.style.display = "flex";
    };

    const loadEnquiryCustomerLists = async () => {
      try {
        const res = await api("/api/sales/customers");
        const custs = res.customers || [];
        knownCustomers = custs;
        const names = custs.map(c => c.name).filter(Boolean);
        const mobiles = custs.map(c => c.mobile).filter(Boolean);
        const nl = document.getElementById("enquiry-customer-name-list");
        const ml = document.getElementById("enquiry-customer-mobile-list");
        if (nl) nl.innerHTML = names.map(n => `<option value="${escapeHtml(n)}"></option>`).join("");
        if (ml) ml.innerHTML = mobiles.map(m => `<option value="${escapeHtml(m)}"></option>`).join("");
      } catch { /* ignore */ }
    };

    // Populate supplier dropdown in create form
    const loadEnquirySuppliers = async () => {
      try {
        const res = await api("/api/sales/suppliers");
        const suppliers = res.suppliers || [];
        const form = document.getElementById("enquiry-create-form");
        const sel = form?.querySelector('[name="supplier_id"]');
        if (sel) sel.innerHTML = '<option value="">-- Optional --</option>' + suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
      } catch { /* ignore */ }
    };

    const eCreateForm = document.getElementById("enquiry-create-form");
    bindCustomerAutoFill(
      eCreateForm?.querySelector('input[name="customer_name"]'),
      eCreateForm?.querySelector('input[name="customer_mobile"]')
    );

    loadEnquiries();
    loadEnquiryCustomerLists();
    loadEnquirySuppliers();

    const serviceCreateForm = document.getElementById("service-create-form");
    const mobileInput = serviceCreateForm?.querySelector('input[name="customer_mobile"]');
    const nameInput = serviceCreateForm?.querySelector('input[name="customer_name"]');

    // Service Type Chip Selection Logic
    const typeChips = document.querySelectorAll("#service-type-chips .type-chip");
    const typeInput = serviceCreateForm?.querySelector('input[name="device_type"]');
    const deviceIntakeSection = document.getElementById("device-intake-section");
    typeChips.forEach(chip => {
      chip.addEventListener("click", () => {
        typeChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        if (typeInput) typeInput.value = chip.dataset.val;
        if (deviceIntakeSection) {
          deviceIntakeSection.style.display = chip.dataset.val === "Device Service" ? "" : "none";
        }
      });
    });

    // Device Intake Sub-type Chips
    const subtypeChips = document.querySelectorAll("#device-subtype-chips .type-chip");
    const subtypeInput = serviceCreateForm?.querySelector('input[name="device_subtype"]');
    const laptopFields = document.getElementById("intake-laptop-fields");
    const printerFields = document.getElementById("intake-printer-fields");
    const laptopAcc = document.getElementById("intake-accessories-laptop");
    const printerAcc = document.getElementById("intake-accessories-printer");
    const laptopPasswords = document.getElementById("intake-passwords-laptop");
    const printerPasswords = document.getElementById("intake-passwords-printer");
    const brandSelect = document.getElementById("intake-brand-select");
    const brandOther = document.getElementById("intake-brand-other");

    subtypeChips.forEach(chip => {
      chip.addEventListener("click", () => {
        subtypeChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        if (subtypeInput) subtypeInput.value = chip.dataset.val;
        const isPrinter = chip.dataset.val === "printer";
        if (laptopFields) laptopFields.style.display = isPrinter ? "none" : "";
        if (printerFields) printerFields.style.display = isPrinter ? "" : "none";
        if (laptopAcc) laptopAcc.style.display = isPrinter ? "none" : "flex";
        if (printerAcc) printerAcc.style.display = isPrinter ? "flex" : "none";
        if (laptopPasswords) laptopPasswords.style.display = isPrinter ? "none" : "grid";
        if (printerPasswords) printerPasswords.style.display = isPrinter ? "grid" : "none";
      });
    });

    // Brand "Other" toggle
    if (brandSelect) {
      brandSelect.addEventListener("change", () => {
        if (brandOther) brandOther.style.display = brandSelect.value === "Other" ? "" : "none";
      });
    }

    // Condition chip click handlers (generic for all intake fields)
    document.querySelectorAll("#device-intake-section .chip-btn[data-field]").forEach(chip => {
      chip.addEventListener("click", () => {
        const field = chip.dataset.field;
        const hiddenInput = document.querySelector(`#device-intake-section input[name="${field}"]`);
        if (hiddenInput) {
          const wasActive = chip.classList.contains("active");
          document.querySelectorAll(`#device-intake-section .chip-btn[data-field="${field}"]`).forEach(c => c.classList.remove("active"));
          if (!wasActive) {
            chip.classList.add("active");
            hiddenInput.value = chip.dataset.val;
          } else {
            hiddenInput.value = "";
          }
        }
      });
    });

    const mobileDatalist = document.getElementById("customer-mobile-list");

    // History Logic
    const historySearch = document.getElementById("sales-history-search");
    const historyChips = document.querySelectorAll("#sales-history-chips .chip-btn");
    const historyGrid = document.getElementById("sales-history-grid");
    const billedRequests = serviceRequests.filter(r => r.bill_status === 'billed' || r.status === 'Canceled');
    let salesHistoryFilter = "all";

    const renderSalesHistoryCard = (r) => {
      const isCanceled = r.status === 'Canceled';
      const isBilled = r.bill_status === 'billed';
      const pStatus = r.payment_status || 'pending';
      const billAmount = Number(r.bill_amount) || 0;
      const amountPaid = Number(r.amount_paid) || 0;
      const discountApplied = Number(r.discount_amount) || 0;
      const balance = billAmount - amountPaid - discountApplied;
      const isPaid = pStatus === 'paid' || (isBilled && balance <= 0);
      const isPartial = isBilled && !isPaid && (amountPaid > 0 || discountApplied > 0);
      const pMode = r.payment_mode ? ` (${r.payment_mode})` : '';

      let badgeHtml = '';
      if (isCanceled) badgeHtml = `<span class="chip danger">Canceled</span>`;
      else if (isBilled) badgeHtml = `<span class="chip ${isPaid ? 'success' : isPartial ? 'warning' : 'neutral'}">${isPaid ? 'Paid' + pMode : isPartial ? 'Partial' + pMode : 'Billed'}</span>`;

      const dateLabel = isCanceled
        ? (r.canceled_at ? new Date(r.canceled_at).toLocaleDateString() : r.preferred_date)
        : (r.bill_date || r.preferred_date);
      const amountCell = isBilled ? formatCurrency(billAmount) : '-';
      const actionsHtml = isCanceled
        ? '-'
        : `<div style="display:flex; gap:6px;">
            <button class="button button-primary button-small" type="button" data-view-bill="${r.id}">View Bill</button>
            ${isBilled && !isPaid ? `<button class="button button-accent button-small" type="button" data-mark-paid="${r.id}" data-remaining="${balance}">${isPartial ? 'Collect Balance' : 'Mark Paid'}</button>` : ''}
          </div>`;

      return `
        <tr>
          <td>#${r.id.slice(-8)}</td>
          <td>${escapeHtml(r.customer_name)}</td>
          <td>
            ${escapeHtml(r.device_type)}
            ${r.conveyance_expense > 0 ? `<br/><span class="inline-meta" style="color:var(--text-soft);">Exp: Rs. ${r.conveyance_expense}</span>` : ''}
          </td>
          <td title="${escapeHtml(r.issue)}">${escapeHtml(r.issue)}</td>
          <td>${escapeHtml(dateLabel)}</td>
          <td>${amountCell}</td>
          <td>${badgeHtml}</td>
          <td class="action-stack">${actionsHtml}</td>
        </tr>
      `;
    };

    const updateSalesHistoryGrid = () => {
      if (!historyGrid) return;
      const query = (historySearch?.value || "").toLowerCase();
      const filtered = billedRequests.filter(r => {
        const matchesSearch = (r.id || "").toLowerCase().includes(query) ||
                              (r.customer_name || "").toLowerCase().includes(query) ||
                              (r.device_type || "").toLowerCase().includes(query) ||
                              (r.issue || "").toLowerCase().includes(query);
        const matchesChip = salesHistoryFilter === "all" || r.device_type === salesHistoryFilter;
        return matchesSearch && matchesChip;
      });
      historyGrid.innerHTML = filtered.length
        ? filtered.map(r => renderSalesHistoryCard(r)).join('')
        : '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:24px;">No matching history found.</td></tr>';
    };

    if (historySearch) {
      historySearch.oninput = updateSalesHistoryGrid;
    }

    historyChips.forEach(btn => {
      btn.onclick = () => {
        historyChips.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        salesHistoryFilter = btn.dataset.filter;
        updateSalesHistoryGrid();
      };
    });

    updateSalesHistoryGrid();

    const loadCustomerSuggestions = async () => {
      try {
        const { customers } = await api("/api/sales/customers");
        knownCustomers = customers;

        // Helper to fill datalists
        const fillDatalists = (mobileId, nameId) => {
          const mList = document.getElementById(mobileId);
          const nList = document.getElementById(nameId);
          if (mList) {
            mList.innerHTML = customers
              .map(c => `<option value="${escapeHtml(c.mobile)}">${escapeHtml(c.name)}</option>`)
              .join("");
          }
          if (nList) {
            const seen = new Set();
            nList.innerHTML = customers
              .filter(c => { if (!c.name || seen.has(c.name)) return false; seen.add(c.name); return true; })
              .map(c => `<option value="${escapeHtml(c.name)}"></option>`)
              .join("");
          }
        };

        // Service Form Datalists
        fillDatalists("customer-mobile-list", "customer-name-list");

        // POS Form Datalists
        fillDatalists("pos-customer-list", "pos-customer-name-list");

        // Enquiry Form Datalists
        fillDatalists("enquiry-customer-mobile-list", "enquiry-customer-name-list");

      } catch (e) {
        console.error("Failed to load customer suggestions", e);
      }
    };

    if (mobileInput) {
      loadCustomerSuggestions();
      mobileInput.addEventListener("input", (e) => {
        const val = e.target.value;
        const customer = knownCustomers.find(c => c.mobile === val);
        if (customer && nameInput) {
          nameInput.value = customer.name;
        }
      });
    }
    if (nameInput) {
      nameInput.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        const customer = knownCustomers.find(c => (c.name || "").toLowerCase() === val.toLowerCase());
        if (customer && mobileInput) {
          mobileInput.value = customer.mobile;
        }
      });
    }

    // POS Form Auto-fill
    const posMobileField = document.getElementById("pos-customer-mobile");
    const posNameField = document.getElementById("pos-customer-name");
    if (posMobileField && posNameField) {
      posMobileField.addEventListener("input", () => {
        const val = posMobileField.value;
        const customer = knownCustomers.find(c => c.mobile === val);
        if (customer) posNameField.value = customer.name;
      });
      posNameField.addEventListener("input", () => {
        const val = posNameField.value.trim();
        const customer = knownCustomers.find(c => (c.name || "").toLowerCase() === val.toLowerCase());
        if (customer) posMobileField.value = customer.mobile;
      });
    }

    const techniciansRes = await api("/api/admin/technicians");
    const techSelect = document.getElementById("technician-select");
    techniciansRes.technicians.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      techSelect.appendChild(opt);
    });

    const serviceCreateDateInput = serviceCreateForm.querySelector('[name="created_at"]');
    const servicePreferredDateInput = serviceCreateForm.querySelector('[name="preferred_date"]');
    if (serviceCreateDateInput && servicePreferredDateInput) {
      serviceCreateDateInput.addEventListener("change", () => {
        if (serviceCreateDateInput.value) {
          servicePreferredDateInput.value = addWorkingDays(serviceCreateDateInput.value, 3);
        }
      });
    }

    document.getElementById("service-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const status = document.getElementById("service-status");
      const techSelected = form.technician_id.options[form.technician_id.selectedIndex];

      let deviceIntake = null;
      if (form.device_type.value === "Device Service" && deviceIntakeSection && deviceIntakeSection.style.display !== "none") {
        const subType = form.device_subtype ? form.device_subtype.value : "laptop";
        const brand = form.intake_brand.value === "Other" ? (form.intake_brand_other.value || "Other") : form.intake_brand.value;
        const accessories = [];
        document.querySelectorAll("#device-intake-section input[type='checkbox']:checked").forEach(cb => {
          if (cb.name === "intake_acc_other_cb" && form.intake_acc_other && form.intake_acc_other.value) {
            accessories.push(form.intake_acc_other.value);
          } else if (cb.name !== "intake_acc_other_cb") {
            accessories.push(cb.value);
          }
        });
        deviceIntake = {
          subType,
          brand,
          model: form.intake_model.value,
          serialNumber: form.intake_serial.value,
          color: form.intake_color.value,
          bodyCondition: form.intake_body.value,
          powerOn: form.intake_power.value,
          accessories,
          accessoriesOther: form.intake_acc_other ? form.intake_acc_other.value : "",
          preExistingDamage: form.intake_damage.value,
        };
        if (subType === "laptop") {
          deviceIntake.screenCondition = form.intake_screen.value;
          deviceIntake.keyboardCondition = form.intake_keyboard.value;
          deviceIntake.portsCheck = form.intake_ports.value;
          deviceIntake.biosPassword = form.intake_bios_password.value;
          deviceIntake.loginPassword = form.intake_login_password.value;
        } else {
          deviceIntake.paperTray = form.intake_paper_tray.value;
          deviceIntake.printHead = form.intake_print_head.value;
          deviceIntake.inkToner = form.intake_ink_toner.value;
          deviceIntake.networkPassword = form.intake_network_password.value;
        }
      }

      try {
        await api("/api/sales/service-requests", {
          method: "POST",
          body: JSON.stringify({
            customerName: form.customer_name.value,
            customer_mobile: form.customer_mobile.value,
            device_type: form.device_type.value,
            issue: form.issue.value,
            preferred_date: form.preferred_date.value,
            created_at: form.created_at ? form.created_at.value : undefined,
            technicianId: form.technician_id.value || null,
            technicianName: form.technician_id.value ? techSelected.textContent : null,
            device_intake: deviceIntake,
          }),
        });
        status.textContent = "Service request created";
        setTimeout(() => refreshPage(), 1000);
      } catch (err) {
        status.textContent = err.message;
      }
    });

    document.querySelectorAll("[data-schedule]").forEach((button) => {
      button.addEventListener("click", async () => {
        const modal = document.getElementById("schedule-modal");
        const select = document.getElementById("schedule-technician-select");

        // Populate tech list if not already done
        if (select.children.length <= 1) {
          const techsRes = await api("/api/admin/technicians");
          techsRes.technicians.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.name;
            select.appendChild(opt);
          });
        }

        modal.style.display = "flex";

        document.getElementById("schedule-form").onsubmit = async (e) => {
          e.preventDefault();
          const techId = select.value;
          const techName = select.options[select.selectedIndex].textContent;

          try {
            await api(`/api/employee/service-requests/${button.dataset.schedule}/schedule`, {
              method: "PATCH",
              body: JSON.stringify({
                technicianId: techId || null,
                technicianName: techId ? techName : null
              })
            });
            refreshPage();
          } catch (error) {
            window.alert(error.message);
          }
        };
      });
    });

    document.getElementById("schedule-modal-close").onclick = () => {
      document.getElementById("schedule-modal").style.display = "none";
    };

    document.querySelectorAll("[data-request-parts]").forEach((button) => {
      button.addEventListener("click", async () => {
        const parts = prompt("Enter parts required for this service:");
        if (parts === null) return;
        try {
          await api(`/api/technician/service-requests/${button.dataset.requestParts}/parts`, {
            method: "PATCH",
            body: JSON.stringify({ parts }),
          });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-collect-part]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await api(`/api/technician/service-requests/${button.dataset.collectPart}/part-collected`, { method: "PATCH" });
          refreshPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-complete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const modal = document.getElementById("complete-modal");
        const dateInput = modal.querySelector('[name="completed_at"]');
        dateInput.value = new Date().toISOString().slice(0, 10);
        modal.style.display = "flex";
        modal.dataset.requestId = button.dataset.complete;
      });
    });

    document.getElementById("complete-modal-close").onclick = () => {
      document.getElementById("complete-modal").style.display = "none";
    };

    document.getElementById("complete-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const modal = document.getElementById("complete-modal");
      try {
        await api(`/api/employee/service-requests/${modal.dataset.requestId}/complete`, {
          method: "PATCH",
          body: JSON.stringify({
            completed_at: form.completed_at.value,
          }),
        });
        modal.style.display = "none";
        refreshPage();
      } catch (error) {
        window.alert(error.message);
      }
    });

    let billState = [];

    const updateBillTotal = () => {
      const total = billState.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.rate) || 0), 0);
      document.getElementById("bill-items-total").textContent = total;
    };

    const renderBillList = () => {
      const list = document.getElementById("bill-items-list");
      const empty = document.getElementById("bill-items-empty");
      if (!list) return;
      if (!billState.length) {
        list.innerHTML = "";
        if (empty) empty.style.display = "";
      } else {
        if (empty) empty.style.display = "none";
        list.innerHTML = billState.map((it, idx) => `
          <div data-bill-index="${idx}" style="display:flex; align-items:center; gap:8px; padding:7px 6px; border:1px solid var(--line); border-radius:8px; margin-bottom:6px; background:var(--surface);">
            <input type="text" class="bill-item-desc" value="${escapeHtml(it.desc || '')}" placeholder="Description" style="flex:1; min-width:0; padding:6px 8px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
            <input type="number" class="bill-item-rate" value="${Number(it.rate) || 0}" min="0" title="Rate (Rs.)" style="width:72px; padding:6px 6px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
            <button type="button" class="survey-row-btn" data-bill-qty-minus="${idx}">−</button>
            <span style="min-width:28px; text-align:center; font-size:13px; font-weight:600;" class="bill-item-qty">${Number(it.qty) || 1}</span>
            <button type="button" class="survey-row-btn" data-bill-qty-plus="${idx}">+</button>
            <span style="min-width:90px; text-align:right; font-weight:700; font-size:13px;" class="bill-item-amount">Rs. ${(Number(it.qty) || 1) * (Number(it.rate) || 0)}</span>
            <button type="button" class="survey-row-remove" data-bill-remove="${idx}" title="Remove">&times;</button>
          </div>
        `).join("");
      }
      list.querySelectorAll("[data-bill-qty-minus]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const it = billState[Number(btn.dataset.billQtyMinus)];
          if (it) it.qty = Math.max(1, (Number(it.qty) || 1) - 1);
          renderBillList();
        });
      });
      list.querySelectorAll("[data-bill-qty-plus]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const it = billState[Number(btn.dataset.billQtyPlus)];
          if (it) it.qty = (Number(it.qty) || 1) + 1;
          renderBillList();
        });
      });
      list.querySelectorAll("[data-bill-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          billState.splice(Number(btn.dataset.billRemove), 1);
          renderBillList();
        });
      });
      list.querySelectorAll(".bill-item-desc, .bill-item-rate").forEach((input) => {
        input.addEventListener("input", () => {
          const it = billState[Number(input.closest("[data-bill-index]").dataset.billIndex)];
          if (!it) return;
          if (input.classList.contains("bill-item-desc")) {
            it.desc = input.value;
            return;
          }
          it.rate = Number(input.value) || 0;
          const row = input.closest("[data-bill-index]");
          const amt = row.querySelector(".bill-item-amount");
          if (amt) amt.textContent = `Rs. ${(Number(it.qty) || 1) * it.rate}`;
          updateBillTotal();
        });
      });
      updateBillTotal();
    };

    const renderBillItems = (items) => {
      billState = (items || []).map((it) => ({ desc: it.desc || '', qty: Number(it.qty) || 1, rate: Number(it.rate) || 0 }));
      renderBillList();
    };

    const addBillItem = (desc, qty, rate, key) => {
      if (key) {
        const existing = billState.find((it) => it.key === key);
        if (existing) {
          existing.qty = (Number(existing.qty) || 1) + (Number(qty) || 1);
          renderBillList();
          return;
        }
      }
      billState.push({ desc, qty: Number(qty) || 1, rate: Number(rate) || 0, key: key || null });
      renderBillList();
    };

    const renderBillServiceChips = () => {
      const container = document.getElementById("bill-service-chips");
      const products = window.__salesProducts || [];
      const presets = [
        { name: "Service charges", price: 0 },
        { name: "Service & Labor", price: 0 },
        { name: "Repair Charges", price: 0 },
        { name: "AMC Service", price: 0 },
      ];
      products.forEach((p) => {
        if (p.type !== "Service") return;
        if (!presets.some((s) => s.name === p.name)) {
          presets.push({ name: p.name, price: Number(p.price) || 0, key: `service-${p.id}` });
        }
      });
      container.innerHTML = presets.map((s) => `
        <button type="button" class="chip-btn" data-bill-service="${escapeHtml(s.name)}" data-bill-service-price="${s.price || 0}" data-bill-service-key="${s.key || ''}">${escapeHtml(s.name)}${s.price ? ` &middot; Rs. ${s.price}` : ''}</button>
      `).join("");
      container.querySelectorAll("[data-bill-service]").forEach((btn) => {
        btn.addEventListener("click", () => {
          addBillItem(btn.dataset.billService, 1, Number(btn.dataset.billServicePrice) || 0, btn.dataset.billServiceKey || null);
        });
      });
    };

    const renderBillProducts = (query = "") => {
      const list = document.getElementById("bill-products-list");
      const products = (window.__salesProducts || []).filter((p) => p.type !== "Service");
      const q = (query || "").toLowerCase();
      const filtered = q ? products.filter((p) => (p.name || "").toLowerCase().includes(q)) : products;
      if (!filtered.length) {
        list.innerHTML = '<p style="font-size:12px; color:var(--muted); padding:8px;">No products found.</p>';
        return;
      }
      list.innerHTML = filtered.map((p) => `
        <button type="button" class="used-product-row" data-bill-product="${escapeHtml(p.id)}" style="display:flex; align-items:center; gap:8px; padding:7px 8px; border:none; border-bottom:1px solid var(--line); background:none; cursor:pointer; text-align:left; width:100%; font-size:13px;">
          <span style="flex:1;">${escapeHtml(p.name)}</span>
          <span style="color:var(--muted); font-size:12px;">Rs. ${p.price || 0}</span>
          <span style="color:var(--primary); font-weight:700;">+</span>
        </button>
      `).join("");
      list.querySelectorAll("[data-bill-product]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = (window.__salesProducts || []).find((x) => x.id === btn.dataset.billProduct);
          if (!p) return;
          addBillItem(p.name, 1, Number(p.price) || 0, `product-${p.id}`);
        });
      });
    };

    const collectBillItems = () => billState
      .map((it) => ({ desc: it.desc, qty: Number(it.qty) || 1, rate: Number(it.rate) || 0, amount: (Number(it.qty) || 1) * (Number(it.rate) || 0) }))
      .filter((it) => it.desc.trim() || it.amount > 0);

    document.getElementById("bill-add-custom-item").addEventListener("click", () => {
      addBillItem("", 1, 0);
      document.getElementById("bill-items-empty").style.display = "none";
    });

    const triggerBillingModal = async (requestId) => {
      try {
        const { request } = await api(`/api/sales/service-requests/${requestId}`);
        const isSiteVisit = request.device_type === 'New Installation (Site Visit)' || request.device_type === 'Old Installation Service' || request.device_type === 'Installation Service';

        let surveyInfo = '';
        const linkedDcIds = Array.isArray(request.linked_dc_ids) && request.linked_dc_ids.length
          ? request.linked_dc_ids
          : (request.linked_dc_id ? [request.linked_dc_id] : []);
        let cableMeters = {};
        const initialItems = [{ desc: "Service charges", qty: 1, rate: Number(request.estimated_cost) || 0, amount: Number(request.estimated_cost) || 0 }];

        if (isSiteVisit) {
          try {
            const { survey } = await api(`/api/sales/service-requests/${request.id}/survey`);
            if (survey) {
              let cameras = [], additionalParts = [], nvrDvr = {}, cables = [];
              try { cameras = JSON.parse(survey.cameras || '[]'); } catch(e) {}
              try { additionalParts = JSON.parse(survey.additional_parts || '[]'); } catch(e) {}
              try { nvrDvr = JSON.parse(survey.nvr_dvr || '{}'); } catch(e) {}
              try { cables = JSON.parse(survey.cables || '[]'); } catch(e) {}
              cables.forEach((c) => { if (c.type) cableMeters[String(c.type).toLowerCase()] = Number(c.actual_meters) || 0; });

              const lines = [];
              const dcDispatchesPhysicalItems = linkedDcIds.length > 0;
              cameras.forEach(c => {
                const label = c.formFactor || c.type || 'Camera';
                const tech = c.technology ? ` (${c.technology})` : '';
                const desc = `${c.count || 1}x ${label}${tech} Camera${c.resolution ? ' (' + c.resolution + ')' : ''}`;
                lines.push(desc);
                if (!dcDispatchesPhysicalItems) initialItems.push({ desc, qty: Number(c.count) || 1, rate: 0, amount: 0 });
              });
              if (nvrDvr.needed) {
                const desc = `${nvrDvr.type || 'NVR/DVR'} - ${nvrDvr.channels || 0}ch${nvrDvr.brand ? ' ' + nvrDvr.brand : ''}`;
                lines.push(desc);
                if (!dcDispatchesPhysicalItems) initialItems.push({ desc, qty: 1, rate: 0, amount: 0 });
              }
              cables.forEach(c => {
                if (Number(c.actual_meters) > 0) {
                  const desc = `${c.type} Cable (${c.actual_meters}m)`;
                  lines.push(`Cable: ${c.type} - ${c.actual_meters}m used`);
                  if (!dcDispatchesPhysicalItems) initialItems.push({ desc, qty: Number(c.actual_meters) || 1, rate: 0, amount: 0 });
                }
              });
              additionalParts.forEach(p => {
                const desc = p.name || 'Part';
                lines.push(`${p.qty || 1}x ${p.name}`);
                initialItems.push({ desc, qty: Number(p.qty) || 1, rate: 0, amount: 0 });
              });
              if (survey.notes) lines.push(`Notes: ${survey.notes}`);

              surveyInfo = `
                <div style="margin-top:10px; padding:10px; background:var(--accent-soft); border-radius:6px;">
                  <strong style="color:var(--primary);">Site Survey Details:</strong><br>
                  <span style="font-size:13px; white-space:pre-line;">${escapeHtml(lines.join('\n')) || 'No survey details'}</span>
                </div>
              `;
            }
          } catch (e) {}
        }

        if (request.requested_parts) {
          const reqParts = parseRequestedParts(request.requested_parts);
          reqParts.inventory.forEach((p) => {
            const qty = Number(p.qty) || 1;
            const rate = Number(p.unitPrice) || 0;
            initialItems.push({ desc: p.name, qty, rate, amount: qty * rate });
          });
          if (reqParts.procurement) {
            initialItems.push({ desc: "Part (procure): " + reqParts.procurement, qty: 1, rate: 0, amount: 0 });
          }
        }

        if (request.used_items) {
          let usedItems = [];
          try { usedItems = JSON.parse(request.used_items); } catch (e) {}
          usedItems.forEach((it) => {
            const qty = Number(it.qty) || 1;
            const rate = Number(it.price) || 0;
            initialItems.push({ desc: it.name || 'Item used', qty, rate, amount: qty * rate });
          });
        }

        const dcLines = [];
        for (const dcId of linkedDcIds) {
          try {
            const dc = await api(`/api/sales/challans/${dcId}`);
            if (!dc || !Array.isArray(dc.items)) continue;
            dc.items.forEach((it) => {
              const lower = String(it.item_name || "").toLowerCase();
              const isCable = /cable/i.test(lower) || (cableMeters[lower] != null && cableMeters[lower] > 0);
              const rate = Number(it.unit_price) || 0;
              const qty = isCable ? (cableMeters[lower] || Number(it.qty) || 1) : (Number(it.qty) || 1);
              const desc = isCable ? `${it.item_name} (${qty}m used)` : String(it.item_name || "Item");
              dcLines.push({ desc, qty, rate, amount: qty * rate });
            });
          } catch (e) {}
        }
        const seenDc = new Map();
        dcLines.forEach((l) => {
          const key = l.desc.toLowerCase();
          if (seenDc.has(key)) {
            const ex = seenDc.get(key);
            ex.qty += l.qty;
            ex.amount = ex.qty * ex.rate;
          } else {
            seenDc.set(key, l);
            initialItems.push(l);
          }
        });

        document.getElementById("bill-modal-title").textContent = "Generate Bill";
        renderBillItems(initialItems);
        renderBillServiceChips();
        renderBillProducts();
        const billSearch = document.getElementById("bill-product-search");
        if (billSearch) billSearch.value = "";

        document.getElementById("bill-service-info").innerHTML = `
          <div><strong>Customer:</strong> ${escapeHtml(request.customer_name)}</div>
          <div><strong>Request Type:</strong> ${escapeHtml(request.device_type)} - ${escapeHtml(request.issue)}</div>
          <div style="margin-top:4px;"><strong>Bill Date:</strong> ${request.completed_at || request.created_at || new Date().toISOString().slice(0, 10)}</div>
          <div style="margin-top:8px; color:var(--text-soft);">
            <strong>Estimated Base Cost:</strong> Rs. ${request.estimated_cost || 0}<br>
            <strong style="color:var(--primary);">Parts Requested by Tech:</strong> ${escapeHtml(formatRequestedParts(request.requested_parts) || 'None')}
          </div>
          ${surveyInfo}
        `;
        document.getElementById("bill-form").dataset.requestId = request.id;
        const billDateInput = document.getElementById("bill-form").bill_date;
        if (billDateInput) billDateInput.value = (request.completed_at || request.created_at || new Date().toISOString().slice(0, 10)).slice(0, 10);
        document.getElementById("bill-modal").style.display = "flex";
      } catch (error) {
        window.alert(error.message);
      }
    };
    window.openBillingModal = triggerBillingModal;

    document.querySelectorAll("[data-generate-bill]").forEach((button) => {
      button.addEventListener("click", () => triggerBillingModal(button.dataset.generateBill));
    });

    document.getElementById("bill-modal-close").addEventListener("click", () => {
      document.getElementById("bill-modal").style.display = "none";
    });
    document.getElementById("bill-modal-x-close").addEventListener("click", () => {
      document.getElementById("bill-modal").style.display = "none";
    });
    document.getElementById("bill-product-search").addEventListener("input", (e) => {
      renderBillProducts(e.target.value);
    });

    document.getElementById("bill-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const status = document.getElementById("bill-status");

      const items = collectBillItems();

      try {
        await api(`/api/sales/service-requests/${form.dataset.requestId}/bill`, {
          method: "POST",
          body: JSON.stringify({
            items,
            billDate: form.bill_date ? form.bill_date.value : undefined,
          }),
        });
        status.textContent = "Bill generated successfully";
        setTimeout(() => refreshPage(), 1000);
      } catch (err) {
        status.textContent = err.message;
      }
    });

    document.querySelectorAll("[data-manage-parts]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const { request } = await api(`/api/sales/service-requests/${button.dataset.manageParts}`);
          const modal = document.getElementById("part-request-modal");
          const info = document.getElementById("part-request-info");
          const readyBtn = document.getElementById("mark-part-ready-btn");
          const costInput = document.getElementById("additional-part-cost");
          const reqParts = parseRequestedParts(request.requested_parts);

          info.innerHTML = `
            <div><strong>Request ID:</strong> #${request.id.slice(-8)}</div>
            <div><strong>Current Estimate:</strong> ${formatCurrency(request.estimated_cost || 0)}</div>
            <div><strong>Technician:</strong> ${escapeHtml(request.service_person)}</div>
          `;

          const priceRows = document.getElementById("part-price-rows");
          if (reqParts.inventory.length) {
            priceRows.innerHTML = `
              <div style="font-size:13px; font-weight:bold; margin-bottom:6px;">Adjust Part Prices</div>
              ${reqParts.inventory.map((p, i) => `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="flex:1; font-size:13px;">${escapeHtml(p.name)} <span style="color:var(--muted);">× ${p.qty}</span></span>
                  <span style="color:var(--muted); font-size:12px;">Rs.</span>
                  <input type="number" data-part-price="${i}" value="${Number(p.unitPrice) || 0}" min="0" style="width:110px; padding:7px 8px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text);" />
                </div>
              `).join('')}
            `;
          } else {
            priceRows.innerHTML = '<p style="font-size:13px; color:var(--text-soft);">No in-stock parts selected by the technician.</p>';
          }

          const procurementRow = document.getElementById("part-procurement-row");
          if (reqParts.procurement) {
            document.getElementById("part-procurement-note").textContent = 'Not in stock: ' + reqParts.procurement;
            procurementRow.style.display = 'block';
          } else {
            procurementRow.style.display = 'none';
          }

          costInput.value = 0;

          readyBtn.onclick = async () => {
            const inventory = (reqParts.inventory || []).map((p, i) => ({
              productId: p.productId || p.product_id || p.id || null,
              name: p.name,
              qty: p.qty,
              unitPrice: Number(document.querySelector(`[data-part-price="${i}"]`)?.value) || 0,
            }));
            const extraCost = Number(costInput.value) || 0;
            await api(`/api/sales/service-requests/${request.id}/part-ready`, {
              method: "PATCH",
              body: JSON.stringify({ extraCost, inventory })
            });
            refreshPage();
          };

          modal.style.display = "flex";
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.getElementById("part-request-close").addEventListener("click", () => {
      document.getElementById("part-request-modal").style.display = "none";
    });

    // Cancel service request
    document.querySelectorAll("[data-cancel-request]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const requestId = button.dataset.cancelRequest;
          const { request } = await api(`/api/sales/service-requests/${requestId}`);
          const modal = document.getElementById("cancel-request-modal");
          const info = document.getElementById("cancel-request-info");
          const form = document.getElementById("cancel-request-form");
          const status = document.getElementById("cancel-request-status");

          info.innerHTML = `
            <div><strong>Request ID:</strong> #${request.id.slice(-8)}</div>
            <div><strong>Customer:</strong> ${escapeHtml(request.customer_name)} (${escapeHtml(request.customer_mobile)})</div>
            <div><strong>Request Type:</strong> ${escapeHtml(request.device_type)}</div>
            <div><strong>Issue:</strong> ${escapeHtml(request.issue)}</div>
            <div><strong>Status:</strong> ${escapeHtml(request.status)}</div>
            ${request.assigned_employee_name ? `<div><strong>Technician:</strong> ${escapeHtml(request.assigned_employee_name)}</div>` : ''}
          `;
          status.textContent = '';
          form.reset();
          form.dataset.requestId = requestId;
          modal.style.display = "flex";
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.getElementById("cancel-request-close").addEventListener("click", () => {
      document.getElementById("cancel-request-modal").style.display = "none";
    });

    document.getElementById("cancel-request-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const status = document.getElementById("cancel-request-status");
      const requestId = form.dataset.requestId;
      const reason = form.cancel_reason.value.trim();

      try {
        await api(`/api/sales/service-requests/${requestId}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason }),
        });
        status.textContent = "Service request canceled successfully.";
        setTimeout(() => refreshPage(), 1000);
      } catch (error) {
        status.textContent = error.message;
      }
    });

    document.querySelectorAll("[data-delete-request]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const requestId = button.dataset.deleteRequest;
          const { request } = await api(`/api/sales/service-requests/${requestId}`);
          const modal = document.getElementById("delete-request-modal");
          const info = document.getElementById("delete-request-info");
          const status = document.getElementById("delete-request-status");

          info.innerHTML = `
            <div><strong>Request ID:</strong> #${request.id.slice(-8)}</div>
            <div><strong>Customer:</strong> ${escapeHtml(request.customer_name)} (${escapeHtml(request.customer_mobile)})</div>
            <div><strong>Request Type:</strong> ${escapeHtml(request.device_type)}</div>
            <div><strong>Issue:</strong> ${escapeHtml(request.issue)}</div>
            <div><strong>Status:</strong> ${escapeHtml(request.status)}</div>
          `;
          status.textContent = '';
          modal.dataset.requestId = requestId;
          modal.style.display = "flex";
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.getElementById("delete-request-close").addEventListener("click", () => {
      document.getElementById("delete-request-modal").style.display = "none";
    });

    document.getElementById("delete-request-confirm").addEventListener("click", async () => {
      const modal = document.getElementById("delete-request-modal");
      const status = document.getElementById("delete-request-status");
      const requestId = modal.dataset.requestId;
      try {
        await api(`/api/sales/service-requests/${requestId}`, { method: "DELETE" });
        status.textContent = "Service request deleted successfully.";
        setTimeout(() => refreshPage(), 1000);
      } catch (error) {
        status.textContent = error.message;
      }
    });

    // Sales survey review
    let currentReviewRequestId = null;
    let currentReviewSurvey = null;

    document.querySelectorAll("[data-review-survey]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const requestId = button.dataset.reviewSurvey;
          currentReviewRequestId = requestId;
          const { survey } = await api(`/api/sales/service-requests/${requestId}/survey`);
          currentReviewSurvey = survey;
          renderSurveyView(survey, 'sales-survey-content');
          document.getElementById('sales-survey-status').textContent = '';
          document.getElementById('sales-survey-modal').style.display = 'flex';
        } catch (error) {
          window.alert(error.message);
        }
      });
    });

    document.getElementById('sales-survey-close').addEventListener('click', () => {
      document.getElementById('sales-survey-modal').style.display = 'none';
    });
    document.getElementById('sales-survey-close-btn').addEventListener('click', () => {
      document.getElementById('sales-survey-modal').style.display = 'none';
    });

    document.getElementById('sales-survey-pdf-btn').addEventListener('click', () => {
      if (!currentReviewRequestId) return;
      document.querySelector('#sales-survey-modal .dropdown-menu').style.display = 'none';
      window.open(`/api/sales/service-requests/${currentReviewRequestId}/survey.pdf`, '_blank');
    });

    document.getElementById('sales-survey-excel-btn').addEventListener('click', () => {
      document.querySelector('#sales-survey-modal .dropdown-menu').style.display = 'none';
      if (!currentReviewSurvey || !currentReviewRequestId) return;
      generateSurveyExcel(currentReviewSurvey, currentReviewRequestId).catch((error) => {
        window.alert(error.message || 'Could not generate Excel report.');
      });
    });

    document.getElementById('sales-survey-approve-btn').addEventListener('click', async () => {
      if (!currentReviewRequestId) return;
      const statusEl = document.getElementById('sales-survey-status');
      try {
        await api(`/api/sales/service-requests/${currentReviewRequestId}/survey/review`, { method: 'PATCH' });
        statusEl.textContent = 'Survey approved! Technician can now proceed with the work.';
        setTimeout(() => refreshPage(), 1000);
      } catch (error) {
        statusEl.textContent = error.message;
      }
    });

    document.getElementById("view-bill-close").addEventListener("click", () => {
      document.getElementById("view-bill-modal").style.display = "none";
    });

    // ── Delivery Challan ──
    let dcTarget = null;
    let currentOrderChallan = null;
    let currentBillChallan = null;

    const openDcModal = async (sourceType, sourceId, customerName) => {
      try {
        const query = `/api/sales/challans?sourceType=${encodeURIComponent(sourceType)}&sourceId=${encodeURIComponent(sourceId)}`;
        const existing = await api(query);
        const today = new Date().toISOString().slice(0, 10);
        const itemsPreview = existing && existing.items && existing.items.length
          ? existing.items.map(i => `${i.qty}x ${escapeHtml(i.item_name)}`).join(", ")
          : (sourceType === "service" ? "Pick the items you are dispatching (cable box, cameras, POEs, etc.)." : "Items are listed from the order/job on generation.");
        document.getElementById("dc-modal-preview").innerHTML = `
          <strong>Customer:</strong> ${escapeHtml(customerName || existing?.customer_name || "-")}<br>
          ${existing ? `<strong>Previous Challan:</strong> ${escapeHtml(existing.challan_number)} <span class="chip" style="font-size:10px;">this generates a new one</span><br>` : ''}
          <strong>Items:</strong> ${itemsPreview}
        `;
        const form = document.getElementById("dc-form");
        form.elements.dispatchDate.value = today;
        form.elements.receiverName.value = customerName || existing?.receiver_name || '';
        form.elements.transport.value = '';
        form.elements.vehicleNo.value = '';
        form.elements.notes.value = '';
        dcTarget = { sourceType, sourceId };
        document.getElementById("dc-status").textContent = '';
        setupDcItemPicker(sourceType, existing);
        document.getElementById("dc-modal").style.display = "flex";
      } catch (err) {
        toast(err.message, "error");
      }
    };

    const dcPickerProductSelect = () => {
      const products = (window.__salesProducts || []).filter((p) => p.type !== "Service");
      const opts = products.map((p) => `<option value="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join("");
      return `<select class="dc-item-product">
        <option value="">Custom item…</option>
        ${opts}
      </select>`;
    };

    const setupDcItemPicker = (sourceType, existing) => {
      const picker = document.getElementById("dc-items-picker");
      const rows = document.getElementById("dc-items-rows");
      if (!picker || !rows) return;
      const isService = sourceType === "service";
      picker.style.display = isService ? "block" : "none";
      if (!isService) { rows.innerHTML = ""; return; }

      const seed = (existing && existing.items && existing.items.length) ? existing.items : [];
      rows.innerHTML = seed.length
        ? seed.map((it) => dcItemRowHtml(it.item_name, it.qty, it.unit_price || 0)).join("")
        : dcItemRowHtml("", 1, 0);

      const addBtn = document.getElementById("dc-add-item-row");
      if (addBtn) {
        addBtn.onclick = () => {
          rows.insertAdjacentHTML("beforeend", dcItemRowHtml("", 1, 0));
        };
      }
    };

    const dcItemRowHtml = (name = "", qty = 1, rate = 0) => `
      <div class="dc-item-row" style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <div style="flex:1; min-width:0;">
          ${dcPickerProductSelect()}
          <input type="text" class="dc-item-name" value="${escapeHtml(name)}" placeholder="Custom item name" style="width:100%; margin-top:4px; padding:6px 8px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
        </div>
        <input type="number" class="dc-item-qty" value="${qty}" min="1" step="any" title="Boxes / Qty" style="width:64px; padding:6px 6px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
        <input type="number" class="dc-item-rate" value="${rate}" min="0" step="any" title="Rate per unit (Rs.)" placeholder="Rate" style="width:80px; padding:6px 6px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--text); font-size:13px;" />
        <button type="button" class="btn btn-sm" onclick="this.closest('.dc-item-row').remove()" style="color:var(--danger); background:none; border:none; font-size:16px;">&times;</button>
      </div>
    `;

    document.getElementById("dc-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("dc-status");
      if (!dcTarget) return;
      const f = e.target;
      try {
        statusEl.textContent = "Generating...";
        const picker = document.getElementById("dc-items-picker");
        let items = null;
        if (picker && picker.style.display !== "none") {
          const rows = picker.querySelectorAll(".dc-item-row");
          items = Array.from(rows).map((row) => {
            const sel = row.querySelector(".dc-item-product");
            const nameInput = row.querySelector(".dc-item-name");
            const name = (sel && sel.value)
              ? (sel.selectedOptions[0]?.dataset?.name || nameInput.value)
              : nameInput.value;
            return {
              productId: (sel && sel.value) ? sel.value : null,
              name: String(name || "").trim(),
              qty: Number(row.querySelector(".dc-item-qty").value) || 1,
              rate: Number(row.querySelector(".dc-item-rate").value) || 0,
            };
          }).filter((it) => it.name);
        }
        const dc = await api("/api/sales/challans", {
          method: "POST",
          body: JSON.stringify({
            sourceType: dcTarget.sourceType,
            sourceId: dcTarget.sourceId,
            items,
            dispatchDate: f.elements.dispatchDate.value,
            receiverName: f.elements.receiverName.value,
            transport: f.elements.transport.value,
            vehicleNo: f.elements.vehicleNo.value,
            notes: f.elements.notes.value,
          }),
        });
        document.getElementById("dc-modal").style.display = "none";
        window.open(`/api/sales/challans/${dc.id}.pdf`, "_blank");
        toast(`Challan ${dc.challan_number} generated`);
      } catch (err) {
        statusEl.textContent = err.message;
      }
    });

    const orderChallanBtn = document.getElementById("order-challan-btn");
    const viewBillChallanBtn = document.getElementById("view-bill-challan-btn");

    root.addEventListener("click", async (e) => {
      const challanServiceBtn = e.target.closest("[data-challan-service]");
      if (challanServiceBtn) {
        const requestId = challanServiceBtn.dataset.challanService;
        try {
          const { request } = await api(`/api/sales/service-requests/${requestId}`);
          openDcModal("service", requestId, request.customer_name);
        } catch (err) { toast(err.message, "error"); }
        return;
      }

      const viewIntakeBtn = e.target.closest("[data-view-intake]");
      if (viewIntakeBtn) {
        try {
          const intake = JSON.parse(viewIntakeBtn.dataset.viewIntake);
          const isLaptop = intake.subType !== "printer";
          const rows = [];
          rows.push(`<div style="font-weight:700; font-size:16px; margin-bottom:8px;">${escapeHtml(intake.brand || '')} ${escapeHtml(intake.model || '')} <span style="color:var(--text-soft); font-weight:400; font-size:13px;">(${isLaptop ? 'Laptop / PC' : 'Printer'})</span></div>`);
          if (intake.serialNumber) rows.push(`<div><strong>Serial #:</strong> ${escapeHtml(intake.serialNumber)}</div>`);
          if (intake.color) rows.push(`<div><strong>Color:</strong> ${escapeHtml(intake.color)}</div>`);
          rows.push('<div style="border-top:1px dashed var(--border); margin:8px 0;"></div>');
          if (intake.bodyCondition) rows.push(`<div><strong>Body:</strong> ${escapeHtml(intake.bodyCondition)}</div>`);
          if (isLaptop) {
            if (intake.screenCondition) rows.push(`<div><strong>Screen:</strong> ${escapeHtml(intake.screenCondition)}</div>`);
            if (intake.keyboardCondition) rows.push(`<div><strong>Keyboard:</strong> ${escapeHtml(intake.keyboardCondition)}</div>`);
            if (intake.portsCheck) rows.push(`<div><strong>Ports:</strong> ${escapeHtml(intake.portsCheck)}</div>`);
          } else {
            if (intake.paperTray) rows.push(`<div><strong>Paper Tray:</strong> ${escapeHtml(intake.paperTray)}</div>`);
            if (intake.printHead) rows.push(`<div><strong>Print Head:</strong> ${escapeHtml(intake.printHead)}</div>`);
            if (intake.inkToner) rows.push(`<div><strong>Ink / Toner:</strong> ${escapeHtml(intake.inkToner)}</div>`);
          }
          if (intake.powerOn) rows.push(`<div><strong>Power On:</strong> ${escapeHtml(intake.powerOn)}</div>`);
          if (intake.accessories && intake.accessories.length) {
            rows.push(`<div style="border-top:1px dashed var(--border); margin:8px 0;"></div>`);
            rows.push(`<div><strong>Accessories:</strong> ${intake.accessories.map(a => escapeHtml(a)).join(', ')}</div>`);
          }
          if (isLaptop && (intake.biosPassword || intake.loginPassword)) {
            rows.push('<div style="border-top:1px dashed var(--border); margin:8px 0;"></div>');
            if (intake.biosPassword) rows.push(`<div><strong>BIOS Password:</strong> ••••••••</div>`);
            if (intake.loginPassword) rows.push(`<div><strong>Windows Password:</strong> ••••••••</div>`);
          }
          if (!isLaptop && intake.networkPassword) {
            rows.push('<div style="border-top:1px dashed var(--border); margin:8px 0;"></div>');
            rows.push(`<div><strong>Network Password:</strong> ••••••••</div>`);
          }
          if (intake.preExistingDamage) {
            rows.push('<div style="border-top:1px dashed var(--border); margin:8px 0;"></div>');
            rows.push(`<div style="background:#fff8e1; padding:8px 10px; border-radius:6px; border-left:3px solid #ffa000;"><strong>Pre-existing Damage:</strong><br/>${escapeHtml(intake.preExistingDamage)}</div>`);
          }
          document.getElementById("device-intake-view-content").innerHTML = rows.join('');
          document.getElementById("device-intake-view-modal").style.display = "flex";
        } catch (err) { toast("Could not parse device intake data", "error"); }
        return;
      }

      const viewBillBtn = e.target.closest("[data-view-bill]");
      if (viewBillBtn) {
        try {
          const { request } = await api(`/api/sales/service-requests/${viewBillBtn.dataset.viewBill}`);
          let billItems = [];
          let fallbackLines = [];
          if (request.bill_details) {
            try {
              const parsed = JSON.parse(request.bill_details);
              if (Array.isArray(parsed) && parsed.length && parsed[0] && typeof parsed[0] === "object") {
                billItems = parsed;
              } else if (Array.isArray(parsed)) {
                fallbackLines = parsed.map(String);
              } else {
                fallbackLines = String(parsed).split("\n");
              }
            } catch {
              fallbackLines = String(request.bill_details).split("\n");
            }
          }
          const itemsTable = billItems.length ? `
            <table class="data-table" style="margin:12px 0;">
              <thead><tr><th>#</th><th>Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Rate (Rs.)</th><th style="text-align:right;">Amount (Rs.)</th></tr></thead>
              <tbody>
                ${billItems.map((it, i) => {
                  const qty = Number(it.qty) || 1;
                  const rate = Number(it.rate) || 0;
                  const amount = Number(it.amount) || 0;
                  return `<tr><td>${i + 1}</td><td>${escapeHtml(it.desc || it.description || '-')}</td><td style="text-align:right;">${qty}</td><td style="text-align:right;">${rate ? rate : '-'}</td><td style="text-align:right;">${amount}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          ` : (fallbackLines.length ? `<p><strong>Details:</strong><br>${fallbackLines.map(l => escapeHtml(l)).join("<br>")}</p>` : '');
          document.getElementById("view-bill-content").innerHTML = `
            <p><strong>Bill Number:</strong> ${escapeHtml(request.bill_number)}</p>
            <p><strong>Date:</strong> ${escapeHtml(request.bill_date)}</p>
            <p><strong>Customer:</strong> ${escapeHtml(request.customer_name)} (${escapeHtml(request.customer_mobile)})</p>
            <p><strong>Request Type:</strong> ${escapeHtml(request.device_type)}</p>
            <p><strong>Issue:</strong> ${escapeHtml(request.issue)}</p>
            <p><strong>Technician:</strong> ${escapeHtml(request.service_person || '-')}</p>
            ${itemsTable}
            ${billItems.length ? `
              <p style="border-top:1px solid var(--border); padding-top:8px; margin-top:4px;"><strong>Taxable Value:</strong> Rs. ${request.taxable_amount ?? request.bill_amount}</p>
              ${Number(request.cgst_total) > 0 ? `<p><strong>CGST:</strong> Rs. ${request.cgst_total}</p>` : ''}
              ${Number(request.sgst_total) > 0 ? `<p><strong>SGST:</strong> Rs. ${request.sgst_total}</p>` : ''}
            ` : ''}
            <p style="font-size:1.05rem;"><strong>Total Amount:</strong> Rs. ${request.bill_amount}</p>
            ${Number(request.amount_paid) > 0 ? `<p><strong>Paid:</strong> Rs. ${request.amount_paid}${request.payment_mode ? ` (${escapeHtml(request.payment_mode)})` : ''}</p>` : ''}
            ${Number(request.discount_amount) > 0 ? `<p><strong>Discount:</strong> Rs. ${request.discount_amount}</p>` : ''}
            ${Number(request.amount_paid) > 0 || Number(request.discount_amount) > 0 ? `<p style="color:var(--danger);"><strong>Balance Due:</strong> Rs. ${Number(request.bill_amount) - Number(request.amount_paid) - Number(request.discount_amount)}</p>` : ''}
          `;
          document.getElementById("download-bill-link").href = `/api/sales/service-requests/${request.id}/bill.pdf`;

          const dcBtn = document.getElementById("view-bill-challan-btn");
          if (dcBtn) {
            if (request.linked_dc_id) {
              dcBtn.textContent = "View DC";
              dcBtn.onclick = () => window.open(`/api/sales/challans/${request.linked_dc_id}.pdf`, "_blank");
              dcBtn.classList.add("button-pdf");
            } else {
              dcBtn.textContent = "Delivery Challan";
              dcBtn.onclick = () => openDcModal("service", request.id, request.customer_name);
              dcBtn.classList.remove("button-pdf");
            }
          }

          currentBillChallan = { sourceId: request.id, customerName: request.customer_name };
          const waMsg = encodeURIComponent(`Hi ${request.customer_name},\n\nBill #${request.bill_number}\nDate: ${request.bill_date}\nAmount: Rs. ${request.bill_amount}\n\nThank you for your business!`);
          document.getElementById("whatsapp-bill-link").href = `https://wa.me/${request.customer_mobile}?text=${waMsg}`;
          document.getElementById("view-bill-modal").style.display = "flex";
        } catch (error) {
          window.alert(error.message);
        }
      }

      const markPaidBtn = e.target.closest("[data-mark-paid]");
      if (markPaidBtn) {
        currentMarkPaidRequestId = markPaidBtn.dataset.markPaid;
        currentMarkPaidType = "service";
        currentMarkPaidRemaining = Number(markPaidBtn.dataset.remaining) || 0;
        openPaymentModal();
      }

      const markPaidOrderBtn = e.target.closest("[data-mark-paid-order]");
      if (markPaidOrderBtn) {
        currentMarkPaidRequestId = markPaidOrderBtn.dataset.markPaidOrder;
        currentMarkPaidType = "order";
        openPaymentModal();
      }
    });

    document.getElementById("share-bill-btn").addEventListener("click", async () => {
      const downloadLink = document.getElementById("download-bill-link");
      const url = downloadLink.href;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], "bill.pdf", { type: "application/pdf" });
        if (navigator.share) {
          await navigator.share({
            title: "Service Bill",
            text: "Here is your service bill",
            files: [file]
          });
        } else {
          window.open(url, "_blank");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          window.open(url, "_blank");
        }
      }
    });

    const products = dashboard.products || [];
    let selectedCategory = "";
    const renderProducts = () => {
      const list = document.querySelector("#product-list");
      const searchTerm = document.getElementById("product-search").value.toLowerCase();
      const filtered = products.filter(p => {
        if (!p) return false;
        const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm) || (p.type || "").toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || p.type === selectedCategory;
        return matchesSearch && matchesCategory;
      });
      list.innerHTML = filtered.length ? filtered.map(p => `
        <div class="card">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <strong>${escapeHtml(p.name)}</strong>
              <span class="chip-sm" style="font-size:10px; background:var(--surface-soft);">${p.type}</span>
            </div>
            <div style="font-size:13px; color:var(--text-soft);">
              ${formatCurrency(p.finalPrice)}
              ${p.supplier_name ? ` | <span title="Supplier"><i data-lucide="building" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(p.supplier_name)}</span>` : ""}
            </div>
            <div style="font-size:11px; color:var(--text-soft);">
              ${p.type === 'Service' ? 'Service - billed per job' :
                p.unit_type === 'measurement' ?
                  `Stock: ${p.stock || 0} ${p.base_unit || 'Box'} | Loose: ${p.loose_stock || 0} ${p.sub_unit || 'Mtr'}` :
                  `Stock: ${p.stock || 0}`
              }
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-sm" data-edit-product="${p.id}">Edit</button>
            <button class="btn-sm btn-danger" data-remove-product-btn="${p.id}">Remove</button>
          </div>
        </div>
      `).join('') : '<p class="empty">No products</p>';
    };
    renderProducts();
    
    document.getElementById("product-search").addEventListener("input", renderProducts);
    document.querySelectorAll(".product-category-chips .chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".product-category-chips .chip-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedCategory = btn.dataset.category;
        renderProducts();
      });
    });

    const applyProductTypeFields = () => {
      const form = document.getElementById("product-form");
      if (!form) return;
      const isService = String(form.type?.value || "") === "Service";
      const stockInput = form.querySelector('[name="stock"]');
      const supplierSelect = form.querySelector('[name="supplierId"]');
      const stockGroup = stockInput?.closest(".form-group");
      const supplierGroup = supplierSelect?.closest(".form-group");
      const costPriceGroup = document.getElementById("cost-price-group");
      [stockGroup, supplierGroup, costPriceGroup].forEach(g => { if (g) g.style.display = isService ? "none" : "block"; });
      if (isService && stockInput) stockInput.value = "0";
    };

    document.getElementById("add-product-btn").addEventListener("click", () => {
      document.getElementById("product-modal-title").textContent = "Add Product";
      document.getElementById("product-submit-btn").textContent = "Add Product";
      const form = document.getElementById("product-form");
      form.id.value = "";
      form.reset();
      applyProductTypeFields();

      const stockInput = form.querySelector('[name="stock"]');
      const stockLabel = document.getElementById("product-stock-label");
      const stockInfo = document.getElementById("current-stock-info");
      const supplierSelect = form.querySelector('[name="supplierId"]');

      if (stockInput) stockInput.disabled = false;
      if (stockLabel) stockLabel.textContent = "Quantity Purchased";
      if (stockInfo) { stockInfo.style.display = "none"; stockInfo.textContent = ""; }

      const costPriceGroup = document.getElementById("cost-price-group");
      if (costPriceGroup) costPriceGroup.style.display = "block";

      // Populate supplier dropdown
      const loadSupplierOptions = async () => {
        if (!supplierSelect) return;
        try {
          const res = await api("/api/parties?type=supplier");
          const list = res.parties || res || [];
          supplierSelect.innerHTML = '<option value="">-- No Supplier --</option>' +
            list.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        } catch {
          if (supplierSelect) supplierSelect.innerHTML = '<option value="">-- No Supplier --</option>';
        }
      };
      loadSupplierOptions();

      // Populate product suggestions
      const datalist = document.getElementById("existing-product-list");
      if (datalist) {
        datalist.innerHTML = products.map(p => `<option value="${escapeHtml(p.name)}"></option>`).join('');
      }

      // Auto-fill logic when typing name
      const nameInput = form.querySelector('[name="name"]');
      nameInput.oninput = () => {
        const isEditMode = document.getElementById("product-modal-title").textContent === "Edit Product";
        if (isEditMode) return;

        const val = nameInput.value.trim();
        const existing = products.find(p => p && (p.name || "").toLowerCase() === (val || "").toLowerCase());
        const submitBtn = document.getElementById("product-submit-btn");
        const stockLabel = document.getElementById("product-stock-label");
        const stockInfo = document.getElementById("current-stock-info");

        if (existing) {
          form.type.value = existing.type;
          form.price.value = existing.originalPrice || existing.price;
          form.description.value = existing.description;
          if (supplierSelect) supplierSelect.value = existing.supplier_id || "";
          if (submitBtn) submitBtn.textContent = "Restock Product";
          if (stockLabel) stockLabel.textContent = "Additional Quantity Purchased";
          if (stockInfo) {
            stockInfo.textContent = `Currently in stock: ${existing.stock || 0}`;
            stockInfo.style.display = "block";
          }
          applyProductTypeFields();
        } else {
          if (submitBtn) submitBtn.textContent = "Add Product";
          if (stockLabel) stockLabel.textContent = "Quantity Purchased";
          if (stockInfo) {
            stockInfo.style.display = "none";
            stockInfo.textContent = "";
          }
        }
      };

      document.getElementById("product-modal").classList.add("show");
    });

    if (!window.__salesProductFormBound) {
      window.__salesProductFormBound = true;
      document.getElementById("product-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form.id.value;
        const supplierId = form.supplierId.value || null;
        const costPrice = form.costPrice?.value ? Number(form.costPrice.value) : null;

        if (supplierId && (!costPrice || costPrice <= 0)) {
          alert("Please enter the Cost Price from the invoice when a supplier is selected.");
          return;
        }

        const isMeasurement = form.isMeasurement.checked;
        const payload = {
          type: form.type.value,
          name: form.name.value,
          price: Number(form.price.value),
          discountPercent: Number(form.discountPercent.value),
          stock: Number(form.stock.value),
          description: form.description.value,
          supplierId: supplierId,
          costPrice: costPrice,
          hsnCode: form.hsnCode?.value || null,
          gstRate: Number(form.gstRate?.value || 0),
          unitType: isMeasurement ? 'measurement' : 'standard',
          baseUnit: isMeasurement ? form.baseUnit.value : null,
          subUnit: isMeasurement ? form.subUnit.value : null,
          conversionFactor: isMeasurement ? Number(form.conversionFactor.value) : 1
        };
        const url = id ? `/api/staff/products/${id}` : "/api/staff/products";
        const method = id ? "PATCH" : "POST";
        
        api(url, { method, body: JSON.stringify(payload) })
          .then((res) => {
            toast(res.message || "Success", "success");
            setTimeout(() => {
              closeProductModal();
              refreshPage();
            }, 1000);
          }).catch(e => alert(e.message));
      });
      document.getElementById("product-form").querySelector('[name="type"]').addEventListener("change", applyProductTypeFields);
      document.getElementById("product-is-measurement")?.addEventListener("change", (e) => {
        document.getElementById("measurement-fields").style.display = e.target.checked ? "grid" : "none";
      });

    }

    window.closeProductModal = () => {
      document.getElementById("product-modal").classList.remove("show");
      document.getElementById("product-form").reset();
    };

    const editProduct = (id) => {
      const p = products.find(p => p.id === id);
      if (!p) return;
      const form = document.getElementById("product-form");
      form.id.value = p.id;
      form.type.value = p.type;
      form.name.value = p.name;
      form.price.value = p.originalPrice || p.price;
      form.discountPercent.value = p.discountPercent || 0;
      form.stock.value = p.stock || 0;
      form.description.value = p.description;
      form.hsnCode.value = p.hsn_code || '';
      form.gstRate.value = p.gst_rate || 0;

      const isMeasurement = p.unit_type === 'measurement';
      form.isMeasurement.checked = isMeasurement;
      document.getElementById("measurement-fields").style.display = isMeasurement ? "grid" : "none";
      if (isMeasurement) {
        form.baseUnit.value = p.base_unit || "";
        form.subUnit.value = p.sub_unit || "";
        form.conversionFactor.value = p.conversion_factor || 1;
      }


      const stockInput = form.querySelector('[name="stock"]');
      const stockLabel = document.getElementById("product-stock-label");
      const stockInfo = document.getElementById("current-stock-info");
      if (stockInput) stockInput.disabled = true;
      if (stockLabel) stockLabel.textContent = "Current Stock (Locked)";
      if (stockInfo) { stockInfo.style.display = "none"; }

      const costPriceGroup = document.getElementById("cost-price-group");
      if (costPriceGroup) costPriceGroup.style.display = "none";

      const loadSupplierOptions = async () => {
        const supplierSelect = form.querySelector('[name="supplierId"]');
        if (!supplierSelect) return;
        try {
          const res = await api("/api/parties?type=supplier");
          const list = res.parties || res || [];
          supplierSelect.innerHTML = '<option value="">-- No Supplier --</option>' +
            list.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
          if (p.supplier_id) supplierSelect.value = p.supplier_id;
        } catch {
          if (supplierSelect) supplierSelect.innerHTML = '<option value="">-- No Supplier --</option>';
        }
      };
      loadSupplierOptions();
      applyProductTypeFields();

      document.getElementById("product-modal-title").textContent = "Edit Product";
      document.getElementById("product-submit-btn").textContent = "Save Changes";
      document.getElementById("product-modal").classList.add("show");
    };

    const removeProduct = (id) => {
      if (confirm("Remove this product?")) {
        api(`/api/staff/products/${id}`, { method: "DELETE" }).then(() => refreshPage()).catch(e => alert(e.message));
      }
    };

    document.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-product]");
      const removeBtn = e.target.closest("[data-remove-product-btn]");
      if (editBtn) editProduct(editBtn.dataset.editProduct);
      if (removeBtn) removeProduct(removeBtn.dataset.removeProductBtn);
    });

    // ── Parties Logic (unified suppliers & customers) ──
    let parties = [];
    let currentPartyFilter = 'all';
    let currentViewPartyId = null;
    let partySummary = null;

    const loadAndRenderParties = async () => {
      const typeParam = currentPartyFilter === 'all' ? '' : currentPartyFilter;
      const res = await api(`/api/parties${typeParam ? `?type=${typeParam}` : ''}`);
      parties = res.parties || [];
      partySummary = res.summary || null;
      renderParties();
    };

    const renderParties = () => {
      const list = document.querySelector("#party-list");
      if (!list) return;

      const setStat = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };
      if (partySummary) {
        setStat("party-stat-total", partySummary.total);
        setStat("party-stat-suppliers", partySummary.suppliers);
        setStat("party-stat-customers", partySummary.customers);
        setStat("party-stat-dues", formatCurrency(partySummary.outstanding));
      }

      const q = (document.getElementById("party-search")?.value || "").trim().toLowerCase();
      const filtered = parties.filter(p => {
        if (!p) return false;
        return !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.mobile || "").toLowerCase().includes(q) ||
        (p.contact_person || "").toLowerCase().includes(q) ||
        (p.gst_number || "").toLowerCase().includes(q);
      });

      list.innerHTML = filtered.length ? filtered.map(p => {
        const badges = [];
        if (p.is_supplier) badges.push('<span class="chip" style="font-size:10px; background:var(--accent-soft);">Supplier</span>');
        if (p.is_customer) badges.push('<span class="chip" style="font-size:10px; background:var(--primary-soft);">Customer</span>');
        const initials = (p.name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const dues = Number(p.outstanding_balance) || 0;
        const spend = Number(p.total_purchases) || 0;
        const orders = Number(p.customer_order_count) || 0;
        const customerSpent = Number(p.customer_spent) || 0;
        return `
        <div class="card party-card" data-view-party="${p.id}" style="cursor:pointer;">
          <div class="party-card-top">
            <div class="party-avatar">${escapeHtml(initials)}</div>
            <div class="party-card-id">
              <strong>${escapeHtml(p.name)}</strong>
              <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">${badges.join('')}</div>
            </div>
          </div>
          <div class="card-body party-card-body">
            ${p.mobile ? `<span class="supplier-detail"><i data-lucide="smartphone" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(p.mobile)}</span>` : ""}
            ${p.contact_person ? `<span class="supplier-detail"><i data-lucide="user" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(p.contact_person)}</span>` : ""}
            ${p.address ? `<span class="supplier-detail"><i data-lucide="map-pin" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(p.address)}</span>` : ""}
            ${p.gst_number ? `<span class="supplier-detail"><i data-lucide="id-card" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${escapeHtml(p.gst_number)}</span>` : ""}
            ${!p.mobile && !p.contact_person && !p.address && !p.gst_number ? '<span class="supplier-detail" style="opacity:.5;">No contact details</span>' : ''}
          </div>
          <div class="party-card-footer">
            ${p.is_supplier ? `<span title="Purchases"><i data-lucide="file-text" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${p.purchase_count || 0} · ${formatCurrency(spend)}</span>` : ''}
            ${p.is_customer ? `<span title="Customer orders"><i data-lucide="shopping-cart" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> ${orders} · ${formatCurrency(customerSpent)}</span>` : ''}
            ${p.is_supplier ? (dues > 0 ? `<span class="party-dues">Dues ${formatCurrency(dues)}</span>` : `<span class="party-clear">No dues</span>`) : ''}
          </div>
        </div>`;
      }).join('') : '<p class="empty">No parties found</p>';
    };

    await loadAndRenderParties();

    // Filter chips
    document.querySelector(".party-filter-chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-party-filter]");
      if (!btn) return;
      document.querySelectorAll("[data-party-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPartyFilter = btn.dataset.partyFilter;
      loadAndRenderParties();
    });

    document.getElementById("party-search")?.addEventListener("input", renderParties);

    document.getElementById("add-party-btn").addEventListener("click", () => {
      document.getElementById("supplier-modal-title").textContent = "Add Party";
      document.getElementById("supplier-submit-btn").textContent = "Add Party";
      document.getElementById("supplier-form").reset();
      document.getElementById("supplier-modal").classList.add("show");
    });

    window.closeSupplierModal = () => {
      document.getElementById("supplier-modal").classList.remove("show");
      document.getElementById("supplier-form").reset();
    };

    const supplierViewModal = document.getElementById("supplier-view-modal");
    const purchaseModal = document.getElementById("purchase-modal");

    const openPartyView = async (partyId) => {
      try {
        const res = await api(`/api/parties/${partyId}`);
        const p = res.party;
        const purchases = res.purchases || [];
        currentViewPartyId = p.id;
        supplierViewModal.dataset.partyId = p.id;

        const badges = [];
        if (p.is_supplier) badges.push('<span class="chip" style="font-size:11px; background:var(--accent-soft);">Supplier</span>');
        if (p.is_customer) badges.push('<span class="chip" style="font-size:11px; background:var(--primary-soft);">Customer</span>');

        document.getElementById("supplier-view-title").innerHTML = `${escapeHtml(p.name)} ${badges.join(' ')}`;
        const addPurchaseBtn = document.getElementById("supplier-view-add-purchase-btn");
        const createSaleBtn = document.getElementById("customer-view-sale-btn");
        const newServiceBtn = document.getElementById("customer-view-service-btn");

        if (addPurchaseBtn) addPurchaseBtn.style.display = p.is_supplier ? "" : "none";
        if (createSaleBtn) createSaleBtn.style.display = p.is_customer ? "" : "none";
        if (newServiceBtn) newServiceBtn.style.display = p.is_customer ? "" : "none";
        document.getElementById("supplier-view-content").innerHTML = `
          <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${escapeHtml(p.name)}</span></div>
          ${p.contact_person ? `<div class="detail-row"><span class="detail-label">Contact Person</span><span class="detail-value">${escapeHtml(p.contact_person)}</span></div>` : ""}
          ${p.mobile ? `<div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${escapeHtml(p.mobile)}</span></div>` : ""}
          ${p.email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(p.email)}</span></div>` : ""}
          ${p.address ? `<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${escapeHtml(p.address)}</span></div>` : ""}
          ${p.gst_number ? `<div class="detail-row"><span class="detail-label">GST Number</span><span class="detail-value">${escapeHtml(p.gst_number)}</span></div>` : ""}
          ${p.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(p.notes)}</span></div>` : ""}
        `;

        const openPos = res.openPos || [];
        const orders = res.orders || [];
        const services = res.services || [];

        const totalPurchased = purchases.reduce((sum, pu) => sum + (pu.total_cost || 0) + (pu.gst_total || 0), 0) +
          openPos.reduce((sum, po) => sum + (po.total_amount || 0), 0);
        const outstanding = purchases.filter(pu => pu.payment_status === 'pending').reduce((sum, pu) => sum + (pu.total_cost || 0) + (pu.gst_total || 0), 0) +
          openPos.reduce((sum, po) => sum + (po.total_amount || 0), 0);

        let supplierHtml = '';
        if (p.is_supplier) {
          const poRows = openPos.map(po => `
            <tr>
              <td>${po.po_date || '-'}</td>
              <td><strong>${escapeHtml(po.po_number)}</strong></td>
              <td>—</td>
              <td>${po.item_count || 0}</td>
              <td><strong>${formatCurrency(po.total_amount)}</strong></td>
              <td><span class="chip warning">Ordered</span></td>
              <td class="action-stack">
                <button class="btn-sm button-accent po-view-btn" data-po-id="${po.id}">View</button>
                <button class="btn-sm btn-danger delete-po-btn" data-po-id="${po.id}">Delete</button>
              </td>
            </tr>`).join('');
          const purchaseRows = purchases.map(pu => {
            const isPaid = pu.payment_status === 'paid';
            return `
            <tr>
              <td>${pu.purchase_date || '-'}</td>
              <td>${escapeHtml(pu.invoice_number || 'Direct')}</td>
              <td>${escapeHtml(pu.product_name)}</td>
              <td>${pu.quantity}</td>
              <td><strong>${formatCurrency((pu.total_cost || 0) + (pu.gst_total || 0))}</strong></td>
              <td><span class="chip ${isPaid ? 'success' : 'warning'}">${isPaid ? 'Paid' : 'Pending'}</span></td>
              <td class="action-stack">
                ${!isPaid ? `<button class="btn-sm button-accent mark-purchase-paid-btn" data-purchase-id="${pu.id}">Mark Paid</button>` : ''}
                <button class="btn-sm btn-danger delete-purchase-btn" data-purchase-id="${pu.id}">Delete</button>
              </td>
            </tr>`;
          }).join('');

          supplierHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h4>Purchase History <span class="inline-meta">(${purchases.length + openPos.length} records)</span></h4>
              <div style="text-align:right;">
                <div style="font-size:12px; color:var(--text-soft);">Total Purchases:</div>
                <strong style="font-size:1.05rem;">${formatCurrency(totalPurchased)}</strong>
                <div style="font-size:12px; color:var(--text-soft); margin-top:2px;">Outstanding:</div>
                <strong style="color:${outstanding > 0 ? 'var(--danger)' : 'var(--success)'}; font-size:1.1rem;">${formatCurrency(outstanding)}</strong>
              </div>
            </div>
            ${(purchases.length || openPos.length) ? `
            <div style="overflow-x:auto;">
              <table class="data-table" style="font-size:12px;">
                <thead><tr><th>Date</th><th>Ref</th><th>Product</th><th>Qty</th><th>Total (incl. GST)</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>${poRows}${purchaseRows}</tbody>
              </table>
            </div>` : '<p class="empty-message" style="margin-top:10px;">No purchases recorded yet.</p>'}
          `;
        }

        let customerHtml = '';
        if (p.is_customer) {
          const orderRows = orders.map(o => `
            <tr>
              <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
              <td>#${o.id.slice(-8)}</td>
              <td><span class="chip ${o.payment_status === 'paid' ? 'success' : 'warning'}">${o.payment_status === 'paid' ? 'Paid' : (o.payment_status || '—')}</span></td>
              <td><strong>${formatCurrency(o.total_amount)}</strong></td>
            </tr>`).join('');
          const serviceRows = services.map(s => `
            <tr>
              <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
              <td>${escapeHtml(s.device_type || '-')}</td>
              <td><span class="chip ${s.bill_status === 'billed' ? 'success' : 'warning'}">${s.bill_status === 'billed' ? 'Billed' : 'Open'}</span></td>
              <td><strong>${s.bill_amount ? formatCurrency(s.bill_amount) : '-'}</strong></td>
            </tr>`).join('');

          const pendingChallans = res.pendingChallans || [];
          const challanRows = pendingChallans.map(dc => `
            <tr>
              <td>${dc.dispatch_date || '-'}</td>
              <td>${escapeHtml(dc.challan_number)}</td>
              <td>${dc.items.map(it => `${it.qty}x ${escapeHtml(it.item_name)}`).join('<br>')}</td>
              <td><strong>${formatCurrency(dc.total_value || 0)}</strong></td>
              <td><span class="chip warning">Pending Bill</span></td>
              <td>
                <button class="button button-small button-success convert-dc-bill-btn" data-dc-id="${dc.id}">Generate Bill</button>
              </td>
            </tr>`).join('');

          customerHtml = `
            ${pendingChallans.length ? `
            <div style="margin-top:16px; padding:12px; background:var(--surface-soft); border-radius:12px; border:2px dashed var(--accent);">
              <h4 style="margin-bottom:8px; color:var(--accent);">Pending for Billing (Challans)</h4>
              <div style="overflow-x:auto;">
                <table class="data-table" style="font-size:12px;">
                  <thead><tr><th>Date</th><th>DC #</th><th>Items</th><th>Value</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>${challanRows}</tbody>
                </table>
              </div>
            </div>` : ''}
            <div style="margin-top:16px;">
              <h4 style="margin-bottom:8px;">Product Orders <span class="inline-meta">(${orders.length})</span></h4>
              ${orders.length ? `
              <div style="overflow-x:auto;">
                <table class="data-table" style="font-size:12px;">
                  <thead><tr><th>Date</th><th>Order</th><th>Payment</th><th>Total</th></tr></thead>
                  <tbody>${orderRows}</tbody>
                </table>
              </div>` : '<p class="empty-message" style="margin-top:10px;">No product orders.</p>'}
            </div>
            <div style="margin-top:16px;">
              <h4 style="margin-bottom:8px;">Service Requests <span class="inline-meta">(${services.length})</span></h4>
              ${services.length ? `
              <div style="overflow-x:auto;">
                <table class="data-table" style="font-size:12px;">
                  <thead><tr><th>Date</th><th>Type</th><th>Bill</th><th>Amount</th></tr></thead>
                  <tbody>${serviceRows}</tbody>
                </table>
              </div>` : '<p class="empty-message" style="margin-top:10px;">No service requests.</p>'}
            </div>
          `;
        }

        document.getElementById("supplier-purchases-section").innerHTML = supplierHtml + customerHtml;

        // Convert DC to Bill Logic
        document.querySelectorAll(".convert-dc-bill-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const dcId = btn.dataset.dcId;
            if (!confirm("Generate Tax Invoice for this dispatch?")) return;
            try {
              const res = await api(`/api/sales/challans/${dcId}/convert-to-bill`, { method: "POST" });
              toast("Invoice generated successfully!", "success");
              openPartyView(partyId);
              renderSalesPage();
              if (res.orderId) window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, "_blank");
            } catch (err) { alert(err.message); }
          });
        });

        document.querySelectorAll(".mark-purchase-paid-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            window.openSupplierPaymentMode(btn.dataset.purchaseId);
          });
        });

        document.querySelectorAll(".delete-purchase-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (!confirm("Delete this purchase record? Stock will be reversed if linked to a product.")) return;
            try {
              await api(`/api/sales/purchases/${btn.dataset.purchaseId}`, { method: "DELETE" });
              toast("Purchase deleted", "success");
              openPartyView(partyId);
              renderSalesPage();
            } catch (err) { alert(err.message); }
          });
        });

        document.querySelectorAll(".delete-po-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (!confirm("Delete this PO?")) return;
            try {
              await api(`/api/sales/purchase-orders/${btn.dataset.poId}`, { method: "DELETE" });
              toast("PO deleted", "success");
              openPartyView(partyId);
              renderSalesPage();
            } catch (err) { alert(err.message); }
          });
        });

        document.querySelectorAll(".po-view-btn").forEach(btn => {
          // If we are already inside a modal (openPartyView is likely a modal), we might need to be careful
          // but openPoView just opens another modal on top.
          btn.addEventListener("click", () => openPoView(btn.dataset.poId));
        });

        supplierViewModal.classList.add("show");
      } catch (err) { alert(err.message); }
    };

    window.closeSupplierViewModal = () => {
      supplierViewModal.classList.remove("show");
      currentViewPartyId = null;
    };

    document.querySelector("#party-list").addEventListener("click", (e) => {
      const card = e.target.closest("[data-view-party]");
      if (card) openPartyView(card.dataset.viewParty);
    });

    // Persistent modal listeners (bind once to avoid duplicates on page re-render)
    if (!window.__salesPersistentListeners) {
      window.__salesPersistentListeners = true;

      document.getElementById("supplier-view-edit-btn").addEventListener("click", async () => {
        const partyId = supplierViewModal.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        supplierViewModal.classList.remove("show");
        try {
          const res = await api(`/api/parties/${partyId}`);
          const p = res.party;
          const form = document.getElementById("supplier-form");
          form.id.value = p.id;
          form.name.value = p.name;
          form.contactPerson.value = p.contact_person || "";
          form.mobile.value = p.mobile || "";
          form.email.value = p.email || "";
          form.address.value = p.address || "";
          form.gstNumber.value = p.gst_number || "";
          form.notes.value = p.notes || "";
          if (form.partyType) {
            form.partyType.value = p.is_supplier && p.is_customer ? "both" : p.is_supplier ? "supplier" : "customer";
          }
          document.getElementById("supplier-modal-title").textContent = "Edit Party";
          document.getElementById("supplier-submit-btn").textContent = "Save Changes";
          document.getElementById("supplier-modal").classList.add("show");
        } catch (err) { alert(err.message); }
      });

      document.getElementById("supplier-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const title = document.getElementById("supplier-modal-title").textContent;
        const isEdit = title === "Edit Party";
        const partyType = (form.partyType && form.partyType.value) || "both";
        const payload = {
          name: form.name.value,
          contactPerson: form.contactPerson.value,
          mobile: form.mobile.value,
          email: form.email.value,
          address: form.address.value,
          gstNumber: form.gstNumber.value,
          notes: form.notes.value,
          isSupplier: partyType === "supplier" || partyType === "both",
          isCustomer: partyType === "customer" || partyType === "both"
        };
        const partyId = form.id.value || currentViewPartyId;
        try {
          if (isEdit && partyId) {
            await api(`/api/parties/${partyId}`, { method: "PATCH", body: JSON.stringify(payload) });
          } else {
            await api("/api/parties", { method: "POST", body: JSON.stringify(payload) });
          }
          closeSupplierModal();
          closeSupplierViewModal();
          renderSalesPage();
        } catch (err) { alert(err.message); }
      });

      // Quick-start Sale for customer
      document.getElementById("customer-view-sale-btn")?.addEventListener("click", () => {
        const partyId = supplierViewModal.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        api(`/api/parties/${partyId}`).then(res => {
          const p = res.party;
          closeSupplierViewModal();

          // Switch to Sale tab
          const saleTab = document.querySelector('.chrome-tab[data-sales-tab="sale"]');
          if (saleTab) saleTab.click();

          // Pre-fill POS customer details
          setTimeout(() => {
            const mobileInput = document.getElementById("pos-customer-mobile");
            const nameInput = document.getElementById("pos-customer-name");
            if (mobileInput) { mobileInput.value = p.mobile || ""; mobileInput.dispatchEvent(new Event('input')); }
            if (nameInput) nameInput.value = p.name || "";
            document.getElementById("pos-search")?.focus();
          }, 200);
        });
      });

      // Quick-start Service for customer
      document.getElementById("customer-view-service-btn")?.addEventListener("click", () => {
        const partyId = supplierViewModal.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        api(`/api/parties/${partyId}`).then(res => {
          const p = res.party;
          closeSupplierViewModal();

          // Switch to Services tab
          const servicesTab = document.querySelector('.chrome-tab[data-sales-tab="services"]');
          if (servicesTab) servicesTab.click();

          // Pre-fill Service Request form
          setTimeout(() => {
            const form = document.getElementById("service-create-form");
            if (form) {
              form.customer_mobile.value = p.mobile || "";
              form.customer_name.value = p.name || "";
              form.customer_mobile.dispatchEvent(new Event('input'));
              form.issue.focus();
            }
          }, 200);
        });
      });

      document.getElementById("supplier-view-add-purchase-btn").addEventListener("click", async () => {
        const partyId = supplierViewModal.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        supplierViewModal.classList.remove("show");
        const form = document.getElementById("purchase-form");
        form.reset();
        form.querySelector('[name="supplierId"]').value = partyId;
        form.purchaseDate.value = new Date().toISOString().slice(0, 10);
        await populatePurchaseSupplierSelect("purchase-form", partyId);

        const productSelect = form.querySelector('[name="productId"]');
        const productDatalist = document.getElementById("purchase-existing-products");
        const newProductFields = document.getElementById("purchase-new-product-fields");

        const prodRes = await api("/api/public/products");
        const prods = prodRes.products || [];

        productSelect.innerHTML = '<option value="">-- Create New Product --</option>' +
          prods.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.type})</option>`).join('');

        if (productDatalist) {
          productDatalist.innerHTML = prods.map(p => `<option value="${escapeHtml(p.name)}">`).join('');
        }

        const toggleNewFields = () => {
          if (newProductFields) newProductFields.style.display = productSelect.value ? "none" : "block";
        };
        productSelect.onchange = toggleNewFields;
        toggleNewFields();

        document.getElementById("purchase-payment-mode-group").style.display = "none";
        document.getElementById("purchase-total-display").textContent = "";
        document.getElementById("purchase-modal").classList.add("show");
      });

      document.getElementById("supplier-view-delete-btn").addEventListener("click", async () => {
        const partyId = supplierViewModal.dataset.partyId || currentViewPartyId;
        if (!partyId) return;
        if (!confirm("Delete this party permanently? Associated purchase records will also be deleted. This cannot be undone.")) return;
        try {
          await api(`/api/parties/${partyId}`, { method: "DELETE" });
          toast("Party deleted", "success");
          supplierViewModal.classList.remove("show");
          refreshPage();
        } catch (err) { alert(err.message); }
      });

      window.closePurchaseModal = () => {
        purchaseModal.classList.remove("show");
      };

      document.getElementById("purchase-payment-status")?.addEventListener("change", (e) => {
        const modeGroup = document.getElementById("purchase-payment-mode-group");
        if (modeGroup) modeGroup.style.display = e.target.value === "paid" ? "block" : "none";
      });

      document.getElementById("purchase-form").addEventListener("input", () => {
        const form = document.getElementById("purchase-form");
        const qty = Number(form.quantity.value) || 0;
        const cost = Number(form.unitCost.value) || 0;
        const total = qty * cost;
        document.getElementById("purchase-total-display").textContent = `Total: ${formatCurrency(total)}`;
      });

      document.getElementById("purchase-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const supplierId = form.querySelector('[name="supplierId"]').value;
        if (!supplierId) {
          alert("Please select a valid supplier from the list.");
          return;
        }
        const payload = {
          productName: form.productName.value,
          productId: form.productId.value || null,
          productType: form.productType?.value || "Accessory",
          gstRate: Number(form.gstRate?.value || 0),
          quantity: Number(form.quantity.value),
          unitCost: Number(form.unitCost.value),
          purchaseDate: form.purchaseDate.value,
          invoiceNumber: form.invoiceNumber.value,
          paymentStatus: form.paymentStatus.value,
          paymentMode: form.paymentStatus.value === 'paid' ? form.paymentMode.value : null,
          notes: form.notes.value
        };
        try {
          await api(`/api/sales/suppliers/${supplierId}/purchases`, { method: "POST", body: JSON.stringify(payload) });
          closePurchaseModal();
          toast("Purchase recorded", "success");
          renderSalesPage();
        } catch (err) { alert(err.message); }
      });
    }
  } catch (err) {
    console.error("Sales dashboard error:", err);
    alert("Dashboard Error: " + err.message);
    window.location.href = "login.html";
  }
};

const renderSalesDashboard = (data, root) => {
  const container = root.querySelector("#dashboard-overview-root");
  if (!container) return;

  const { recentOrders, recentEnquiries, requests, summary } = data;

  const quickActions = [
    { label: 'New Order', icon: 'shopping-cart', tab: 'sale', color: 'var(--accent)' },
    { label: 'New Ticket', icon: 'wrench', tab: 'services', color: 'var(--warning)' },
    { label: 'New Enquiry', icon: 'help-circle', tab: 'enquiry', color: 'var(--purple)' },
    { label: 'Add Product', icon: 'plus-circle', tab: 'products', color: 'var(--success)' },
  ];

  container.innerHTML = `
    <div class="quick-actions-grid">
      ${quickActions.map(action => `
        <button class="quick-action-btn" data-action-tab="${action.tab}">
          <div class="quick-action-icon" style="background:${action.color}">
            <i data-lucide="${action.icon}" style="width:20px;height:20px;"></i>
          </div>
          <span class="quick-action-label">${action.label}</span>
        </button>
      `).join('')}
    </div>

    <div class="dashboard-grid-v2">
      <!-- Service Requests -->
      <div class="activity-panel">
        <div class="activity-panel-header">
          <h2 class="activity-panel-title"><i data-lucide="clipboard-list" style="width:18px;height:18px;color:var(--accent);"></i> Recent Requests</h2>
          <button class="button button-small button-accent" data-goto-tab="services">View All</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="activity-table">
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${requests.slice(0, 5).map(req => `
                <tr>
                  <td>
                    <strong>${escapeHtml(req.customer_name)}</strong>
                    <div style="font-size:11px;color:var(--text-3);">${req.customer_mobile}</div>
                  </td>
                  <td>${escapeHtml(req.device_type)}</td>
                  <td><span class="chip ${getStatusTone(req.status)}">${req.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Enquiries -->
      <div class="activity-panel">
        <div class="activity-panel-header">
          <h2 class="activity-panel-title"><i data-lucide="help-circle" style="width:18px;height:18px;color:var(--purple);"></i> New Enquiries</h2>
          <button class="button button-small button-accent" data-goto-tab="enquiry">Manage</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="activity-table">
            <thead>
              <tr><th>Customer</th><th>Interest</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${recentEnquiries?.map(enq => `
                <tr>
                  <td><strong>${escapeHtml(enq.customer_name)}</strong></td>
                  <td>${escapeHtml(enq.product_interest || enq.type)}</td>
                  <td style="color:var(--text-3);">${new Date(enq.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('') || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-3);">No new enquiries</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Product Orders -->
      <div class="activity-panel">
        <div class="activity-panel-header">
          <h2 class="activity-panel-title"><i data-lucide="shopping-cart" style="width:18px;height:18px;color:var(--success);"></i> Recent Orders</h2>
          <button class="button button-small button-accent" data-goto-tab="sale">View All</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="activity-table">
            <thead>
              <tr><th>Customer</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${recentOrders?.map(order => `
                <tr>
                  <td>
                    <strong>${escapeHtml(order.customer_name)}</strong>
                    <div style="font-size:11px;color:var(--text-3);">${new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td style="font-weight:700;">${formatCurrency(order.total_amount)}</td>
                  <td><span class="chip ${order.payment_status === 'paid' ? 'success' : 'danger'}">${order.payment_status}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-3);">No recent orders</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind events
  container.querySelectorAll('[data-action-tab], [data-goto-tab]').forEach(el => {
    el.onclick = () => {
      const tabName = el.dataset.actionTab || el.dataset.gotoTab;
      const targetTab = root.querySelector(`.chrome-tab[data-sales-tab="${tabName}"]`);
      if (targetTab) targetTab.click();
    };
  });

  refreshIcons();
};

const renderCustomerPage = async () => {
  const root = document.querySelector("#customer-root");

  try {
    const dashboard = await api("/api/customer/dashboard");
    const { customer, orders, requests, products, enquiries } = dashboard;

    // Date Logic: Default Preferred Date to 3 Working Days (Excluding Sundays)
    const formattedDefaultDate = getWorkingDate(3);

    const knownItems = Array.from(
      new Set([
        ...orders.flatMap((order) => order.items),
        ...products.map((product) => product.name),
        "Laptop Repair",
        "Desktop Service",
        "CCTV Installation",
        "Networking Setup",
      ].filter(Boolean))
    );
    const appDownload = await appDownloadMarkup();

    root.innerHTML = `
      <section class="dashboard-top">
        <div>
          <p class="eyebrow">Customer Dashboard</p>
          <h1>${escapeHtml(customer.name)}</h1>
          <p class="inline-meta">Track your purchases, buy more products, and request support for items you own or services you want.</p>
        </div>
        <div class="dashboard-nav">
          <a href="index.html">Storefront</a>
          <button type="button" data-action="logout">Logout</button>
        </div>
      </section>
      <section class="dashboard-cards">
        <article class="dashboard-card"><span class="eyebrow">Orders</span><strong>${orders.length}</strong></article>
        <article class="dashboard-card"><span class="eyebrow">Service Requests</span><strong>${requests.length}</strong></article>
        <article class="dashboard-card"><span class="eyebrow">Enquiries</span><strong>${enquiries.length}</strong></article>
        <article class="dashboard-card"><span class="eyebrow">Scheduled Visits</span><strong>${requests.filter((item) => item.status === "Scheduled").length}</strong></article>
      </section>
      <section class="dashboard-layout">
        <article class="table-wrap">
          <p class="eyebrow">Orders</p>
          <table>
            <thead><tr><th>Order</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              ${orders.length ? orders.map((order) => `
                <tr>
                  <td>${order.id}<br /><span class="inline-meta">${order.created_at}</span></td>
                  <td>${escapeHtml(order.items.join(", "))}</td>
                  <td><span class="chip ${getStatusTone(order.status)}">${escapeHtml(order.status)}</span></td>
                  <td>${formatCurrency(order.total_amount)}</td>
                </tr>
              `).join("") : `<tr><td colspan="4">No orders yet.</td></tr>`}
            </tbody>
          </table>
        </article>
        <article class="table-wrap">
          <p class="eyebrow">Service Tracking</p>
          <table>
            <thead><tr><th>Request</th><th>For</th><th>Schedule</th><th>Status</th><th>Payment</th><th>Assigned</th></tr></thead>
            <tbody>
              ${requests.length ? requests.map((request) => {
                const amtPaid = Number(request.amount_paid) || 0;
                const disc = Number(request.discount_amount) || 0;
                const bal = (Number(request.bill_amount) || 0) - amtPaid - disc;
                let payChip = '<span class="chip neutral">—</span>';
                if (request.bill_status === 'billed') {
                  if (request.payment_status === 'paid' || bal <= 0) payChip = '<span class="chip success">Paid</span>';
                  else if (amtPaid > 0 || disc > 0) payChip = `<span class="chip warning">Partial · Balance ${formatCurrency(bal)}</span>`;
                  else payChip = `<span class="chip warning">Due ${formatCurrency(request.bill_amount)}</span>`;
                }
                return `
                  <tr>
                    <td>${escapeHtml(request.device_type)}<br /><span class="inline-meta">${escapeHtml(request.issue)}</span></td>
                    <td>${formatRequestSubject(request)}</td>
                    <td>${escapeHtml(request.scheduled_date || request.preferred_date)}</td>
                    <td><span class="chip ${getStatusTone(request.status)}">${escapeHtml(request.status)}</span></td>
                    <td>${payChip}</td>
                    <td>${escapeHtml(request.service_person || "Not scheduled")}</td>
                  </tr>
                `;
              }).join("") : `<tr><td colspan="6">No service requests yet.</td></tr>`}
            </tbody>
          </table>
        </article>
        <article class="table-wrap">
          <p class="eyebrow">Sales Enquiries</p>
          <table>
            <thead><tr><th>Interest</th><th>Type</th><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              ${enquiries && enquiries.length ? enquiries.map((enquiry) => `
                <tr>
                  <td>${escapeHtml(enquiry.product_interest || enquiry.type)}<br /><span class="inline-meta">${enquiry.id}</span></td>
                  <td>${escapeHtml(enquiry.type)}</td>
                  <td>${escapeHtml(enquiry.preferred_date || "Not set")}</td>
                  <td><span class="chip ${getStatusTone(enquiry.status)}">${escapeHtml(enquiry.status)}</span></td>
                  <td>${escapeHtml(enquiry.notes || "")}</td>
                </tr>
              `).join("") : `<tr><td colspan="5">No enquiries yet.</td></tr>`}
            </tbody>
          </table>
        </article>
      </section>
      <section class="table-wrap">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Buy More</p>
            <h2>Products available to purchase</h2>
          </div>
        </div>
        <div class="product-grid product-grid-home" id="customer-product-grid"></div>
      </section>
      <section class="dashboard-layout">
        <article class="dashboard-panel">
          <p class="eyebrow">Quick Order</p>
          <h2>Place an order from your dashboard</h2>
          <p class="panel-copy">Add products from the catalog above and place the order using your saved customer account.</p>
          <div class="cart-list" id="customer-cart-list"></div>
          <div class="field-row">
            <label>Delivery Address</label>
            <input type="text" id="customer-address" placeholder="Enter your delivery address" />
          </div>
          <div class="report-actions">
            <button class="button button-primary" type="button" id="customer-place-order">Place Order</button>
          </div>
          <p id="customer-order-status" class="inline-status"></p>
        </article>
        <article class="dashboard-panel">
          <p class="eyebrow">Request Support</p>
          <h2>Create a service request for what you have or want</h2>
          <p class="panel-copy">Use this for products you already own, services you want to book, or products you want help choosing.</p>
          <form id="customer-service-request-form" class="stack-form">
            <div class="field-grid">
              <label>
                Request Type
                <select name="deviceType" required>
                  <option value="New Device Purchase">New Device Purchase</option>
                  <option value="Device Service">Device Service</option>
                  <option value="New Installation (Site Visit)">New Installation (Site Visit)</option>
                  <option value="Installation Service">Installation Service</option>
                </select>
              </label>
              <label>
                Request For
                <select name="requestSubjectType" required>
                  <option value="owned-product">Product I have</option>
                  <option value="wanted-product">Product I want</option>
                  <option value="wanted-service">Service I want</option>
                  <option value="general-service">General support</option>
                </select>
              </label>
            </div>
            <div class="field-grid">
              <label>
                Product or Service Name
                <input name="requestSubjectName" type="text" list="customer-known-items" placeholder="Select or type what this is about" />
              </label>
              <label>
                Preferred Date
                <input name="preferredDate" type="date" required value="${formattedDefaultDate}" />
              </label>
            </div>
            <label>
              Issue or Requirement
              <textarea name="issue" rows="4" required></textarea>
            </label>
            <datalist id="customer-known-items">
              ${knownItems.map((item) => `<option value="${item}"></option>`).join("")}
            </datalist>
            <button class="button button-primary" type="submit">Submit Service Request</button>
            <p id="customer-service-status" class="inline-status"></p>
          </form>
        </article>
      </section>
    `;

    bindLogout();

    const selectedProductIds = [];
    const productGrid = root.querySelector("#customer-product-grid");
    const cartList = root.querySelector("#customer-cart-list");
    const orderStatus = root.querySelector("#customer-order-status");
    const placeOrderButton = root.querySelector("#customer-place-order");

    const renderCustomerCart = () => {
      const selectedProducts = selectedProductIds
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean);

      if (!selectedProducts.length) {
        cartList.innerHTML = `<div class="empty-message">No products selected yet.</div>`;
        return;
      }

      const total = selectedProducts.reduce((sum, item) => sum + (item.finalPrice ?? item.price), 0);
      cartList.innerHTML = `
        <div class="cart-lines">
          ${selectedProducts.map((item) => `
            <div class="cart-line">
              <span>${escapeHtml(item.name)}</span>
              <strong>${formatProductPrice(item)}</strong>
            </div>
          `).join("")}
        </div>
        <div class="cart-total">
          <span>Total</span>
          <strong>${formatCurrency(total)}</strong>
        </div>
      `;
    };

    productGrid.innerHTML = products
      .map(
        (product) => `
          <article class="product-card">
            <div class="product-card-top">
              <span class="product-type">${escapeHtml(product.type)}</span>
              ${product.discountPercent ? `<span class="discount-pill">${product.discountPercent}% off</span>` : ""}
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="price-stack">
              <strong class="price">${formatProductPrice(product)}</strong>
              ${product.discountPercent ? `<span class="price-cut">${formatCurrency(product.originalPrice)}</span>` : ""}
            </div>
            <button class="button button-primary" type="button" data-customer-buy="${product.id}">Add to Order</button>
          </article>
        `
      )
      .join("");

    productGrid.querySelectorAll("[data-customer-buy]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedProductIds.push(button.dataset.customerBuy);
        renderCustomerCart();
      });
    });

    placeOrderButton.addEventListener("click", async () => {
      orderStatus.textContent = "";

      if (!selectedProductIds.length) {
        orderStatus.textContent = "Select at least one product before placing an order.";
        return;
      }

      try {
        const address = document.querySelector("#customer-address")?.value || "";
        await api("/api/customer/orders", {
          method: "POST",
          body: JSON.stringify({ productIds: selectedProductIds, address }),
        });
        selectedProductIds.splice(0, selectedProductIds.length);
        renderCustomerCart();
        orderStatus.textContent = "Order placed successfully.";
        window.setTimeout(() => refreshPage(), 500);
      } catch (error) {
        orderStatus.textContent = error.message;
      }
    });

    renderCustomerCart();

    const serviceForm = root.querySelector("#customer-service-request-form");
    const serviceStatus = root.querySelector("#customer-service-status");
    serviceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      serviceStatus.textContent = "";

      try {
        await api("/api/customer/service-requests", {
          method: "POST",
          body: JSON.stringify({
            deviceType: String(formData.get("deviceType")),
            requestSubjectType: String(formData.get("requestSubjectType")),
            requestSubjectName: String(formData.get("requestSubjectName")),
            preferredDate: String(formData.get("preferredDate")),
            issue: String(formData.get("issue")),
          }),
        });
        event.currentTarget.reset();
        serviceStatus.textContent = "Service request submitted successfully.";
        window.setTimeout(() => refreshPage(), 500);
      } catch (error) {
        serviceStatus.textContent = error.message;
      }
    });
  } catch {
    window.location.href = "login.html";
  }
};

let currentMarkPaidRequestId = null;
let currentMarkPaidType = "service";
let currentMarkPaidRemaining = 0;

window.closeSupplierModal = () => {
  document.getElementById("supplier-modal")?.classList.remove("show");
  document.getElementById("supplier-form")?.reset();
};

window.closeSupplierViewModal = () => {
  document.getElementById("supplier-view-modal")?.classList.remove("show");
  currentViewPartyId = null;
};

window.showWaTemplates = (e, mobile, name, details = {}) => {
  const existing = document.querySelector(".template-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.className = "template-popup";

  const rect = e.target.getBoundingClientRect();
  popup.style.top = `${rect.bottom + 5}px`;
  popup.style.right = `${window.innerWidth - rect.right}px`;

  const templates = [];
  if (details.type === 'service') {
    templates.push(
      { label: "Repair Completed", text: `Hi ${name}, your ${details.device} repair is completed. Total: ${formatCurrency(details.amount)}. You can collect it at your convenience. Thank you, TECHLAB!` },
      { label: "⏳ Parts Delayed", text: `Hi ${name}, we are waiting for parts for your ${details.device}. It will take 2-3 more days. Sorry for the delay. TECHLAB.` },
      { label: "👷 Technician Dispatched", text: `Hi ${name}, our technician ${details.tech || ''} is on the way to your location for the ${details.device} service. TECHLAB.` }
    );
  } else {
    templates.push(
      { label: "Order Delivered", text: `Hi ${name}, your order #${details.id} has been delivered. Total: ${formatCurrency(details.amount)}. Thank you for choosing TECHLAB!` },
      { label: "Payment Reminder", text: `Hi ${name}, reminding you of the pending payment of ${formatCurrency(details.balance)} for Invoice #${details.id}. Kindly clear at the earliest. TECHLAB.` }
    );
  }

  popup.innerHTML = `
    <div class="template-header">Quick Reply Templates</div>
    ${templates.map(t => `<button class="template-item" onclick="window.sendWaTemplate('${mobile}', '${encodeURIComponent(t.text)}')">${t.label}</button>`).join('')}
  `;

  document.body.appendChild(popup);

  const closePopup = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== e.target) {
      popup.remove();
      document.removeEventListener("click", closePopup);
    }
  };
  setTimeout(() => document.addEventListener("click", closePopup), 10);
};

window.sendWaTemplate = (mobile, text) => {
  const url = `https://wa.me/${mobile}?text=${text}`;
  window.open(url, "_blank");
  document.querySelector(".template-popup")?.remove();
};

window.openDayEndModal = async (dateStr = "") => {
  const modal = document.getElementById("day-end-modal");
  const content = document.getElementById("day-end-content");
  if (!modal || !content) return;

  content.innerHTML = '<p style="padding:20px; text-align:center;">Loading daily summary...</p>';
  modal.classList.add("show");

  try {
    const res = await api(`/api/sales/reports/day-end${dateStr ? '?date=' + dateStr : ''}`);
    const { date, transactions, summary } = res;

    content.innerHTML = `
      <div style="margin-bottom:20px; background:var(--surface-soft); padding:16px; border-radius:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;">Day End: ${date}</h2>
          <span class="chip success">Closed</span>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-top:16px;">
          <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid var(--line);">
            <span style="font-size:10px; color:var(--muted); font-weight:800;">CASH</span><br>
            <strong style="font-size:16px; color:var(--success);">${formatCurrency(summary.cashTotal)}</strong>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid var(--line);">
            <span style="font-size:10px; color:var(--muted); font-weight:800;">UPI</span><br>
            <strong style="font-size:16px; color:var(--accent);">${formatCurrency(summary.upiTotal)}</strong>
          </div>
          <div style="background:var(--accent); color:#fff; padding:10px; border-radius:8px;">
            <span style="font-size:10px; opacity:0.8; font-weight:800;">TOTAL</span><br>
            <strong style="font-size:16px;">${formatCurrency(summary.grandTotal)}</strong>
          </div>
        </div>
      </div>

      <div style="max-height:300px; overflow-y:auto; border:1px solid var(--line); border-radius:12px;">
        <table class="data-table" style="width:100%; font-size:12px;">
          <thead>
            <tr style="position:sticky; top:0; background:var(--surface-strong); color:#fff;">
              <th>Entity / Customer</th>
              <th>Mode</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>
                  <strong>${escapeHtml(t.customer_name)}</strong><br>
                  <span style="font-size:10px; color:var(--muted);">${t.type}</span>
                </td>
                <td><span class="chip ${t.payment_mode === 'Cash' ? 'success' : 'info'}" style="font-size:9px;">${t.payment_mode}</span></td>
                <td style="text-align:right; font-weight:800;">${formatCurrency(t.amount)}</td>
              </tr>
            `).join('')}
            ${transactions.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:20px;">No collections today.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;

    // Store data for printing
    window.__currentDayEndData = res;
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger); padding:20px;">${escapeHtml(err.message)}</p>`;
  }
};

window.printDayEnd = () => {
  const data = window.__currentDayEndData;
  if (!data) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Closing Report - ${escapeHtml(data.date)}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          h1 { margin-bottom: 5px; }
          .summary { display: flex; gap: 40px; margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
          th { background: #eee; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Techlab Closing Report</h1>
        <p>Date: ${escapeHtml(data.date)}</p>
        <div class="summary">
          <div>Cash Total: <strong>${formatCurrency(data.summary.cashTotal)}</strong></div>
          <div>UPI Total: <strong>${formatCurrency(data.summary.upiTotal)}</strong></div>
          <div>Grand Total: <strong>${formatCurrency(data.summary.grandTotal)}</strong></div>
        </div>
        <table>
          <thead><tr><th>Customer</th><th>Type</th><th>Mode</th><th>Amount</th></tr></thead>
          <tbody>
            ${data.transactions.map(t => `
              <tr>
                <td>${escapeHtml(t.customer_name)}</td>
                <td>${escapeHtml(t.type)}</td>
                <td>${escapeHtml(t.payment_mode)}</td>
                <td>${formatCurrency(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top:50px; border-top:1px solid #ddd; padding-top:20px; font-style:italic;">Verified by Staff Signature: _________________________</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};

window.openBusinessSettings = async () => {
  try {
    const res = await api("/api/settings/business");
    const s = res.settings || {};
    const form = document.getElementById("business-settings-form");
    if (form) {
      form.businessName.value = s.business_name || '';
      form.gstin.value = s.gstin || '';
      form.businessAddress.value = s.business_address || '';
      form.businessPhone.value = s.business_phone || '';
      form.businessEmail.value = s.business_email || '';
    }

    // Load bank accounts
    loadBankAccounts();
  } catch (e) { /* ignore */ }
  document.getElementById("business-settings-modal")?.classList.add("show");
};

const loadBankAccounts = async () => {
  const container = document.getElementById("bank-accounts-list");
  if (!container) return;

  try {
    const res = await api("/api/settings/bank-accounts");
    const accounts = res.accounts || [];

    if (!accounts.length) {
      container.innerHTML = '<p style="color:var(--muted); font-size:12px; text-align:center;">No bank accounts added yet.</p>';
      return;
    }

    container.innerHTML = accounts.map(acc => `
      <div style="padding:12px; background:var(--surface); border:1px solid ${acc.is_primary ? 'var(--accent)' : 'var(--line)'}; border-radius:12px; position:relative;">
        ${acc.is_primary ? '<span class="chip success" style="position:absolute; top:8px; right:8px; font-size:9px;">PRIMARY</span>' : ''}
        <strong style="display:block; font-size:13px;">${escapeHtml(acc.bank_name)}</strong>
        <span style="font-size:11px; color:var(--muted);">${escapeHtml(acc.account_holder)}</span><br>
        <span style="font-size:12px; font-family:monospace; font-weight:700;">${escapeHtml(acc.account_number)}</span><br>
        <span style="font-size:11px; color:var(--muted);">IFSC: ${escapeHtml(acc.ifsc)}</span>
        ${acc.upi_id ? `<br><span style="font-size:11px; color:var(--accent); font-weight:700;">UPI: ${escapeHtml(acc.upi_id)}</span>` : ''}

        <div style="margin-top:10px; display:flex; align-items:center; gap:8px;">
          <label style="font-size:10px; display:flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="checkbox" ${acc.show_qr ? 'checked' : ''} onchange="toggleBankQr('${acc.id}', this.checked)" />
            Print QR
          </label>
        </div>

        <div style="display:flex; gap:8px; margin-top:10px;">
          ${!acc.is_primary ? `<button class="btn btn-sm" onclick="setPrimaryBank('${acc.id}')" style="font-size:10px; padding:2px 6px;">Set Primary</button>` : ''}
          <button class="btn btn-sm" onclick="deleteBank('${acc.id}')" style="font-size:10px; padding:2px 6px; color:var(--danger);">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error("Failed to load bank accounts", e); }
};

window.toggleAddBankForm = () => {
  const form = document.getElementById("bank-account-form");
  const btn = document.getElementById("toggle-bank-form-btn");
  if (form.style.display === "none") {
    form.style.display = "block";
    btn.style.display = "none";
  } else {
    form.style.display = "none";
    btn.style.display = "block";
    form.reset();
  }
};

window.deleteBank = async (id) => {
  if (!confirm("Remove this bank account?")) return;
  try {
    await api(`/api/settings/bank-accounts/${id}`, { method: "DELETE" });
    toast("Bank account removed", "success");
    loadBankAccounts();
  } catch (e) { alert(e.message); }
};

window.setPrimaryBank = async (id) => {
  try {
    await api(`/api/settings/bank-accounts/${id}/primary`, { method: "PATCH" });
    toast("Primary account updated", "success");
    loadBankAccounts();
  } catch (e) { alert(e.message); }
};

window.toggleBankQr = async (id, showQr) => {
  try {
    await api(`/api/settings/bank-accounts/${id}/toggle-qr`, {
      method: "PATCH",
      body: JSON.stringify({ showQr })
    });
    toast(`QR printing ${showQr ? 'enabled' : 'disabled'}`, "success");
  } catch (e) { alert(e.message); }
};

const mountAdminSettingsHandlers = () => {
  const bankForm = document.getElementById("bank-account-form");
  if (bankForm && !bankForm.dataset.bound) {
    bankForm.dataset.bound = "true";
    bankForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(bankForm);
      const payload = {
        bankName: fd.get("bankName"),
        accountHolder: fd.get("accountHolder"),
        accountNumber: fd.get("accountNumber"),
        ifsc: fd.get("ifsc"),
        upiId: fd.get("upiId"),
        isPrimary: bankForm.isPrimary.checked,
        showQr: bankForm.showQr.checked
      };

      try {
        await api("/api/settings/bank-accounts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast("Bank account added", "success");
        toggleAddBankForm();
        loadBankAccounts();
      } catch (err) { alert(err.message); }
    });
  }
};

window.closeBusinessSettings = () => {
  document.getElementById("business-settings-modal")?.classList.remove("show");
};

window.openAdminPartiesModal = async () => {
  const modal = document.getElementById("parties-list-modal");
  const content = document.getElementById("parties-list-content");
  if (!modal || !content) return;
  content.innerHTML = '<p style="padding:20px; text-align:center;">Loading parties...</p>';
  modal.classList.add("show");
  try {
    const res = await api("/api/parties");
    const parties = (res.parties || []).slice().sort((a, b) => (b.dues || 0) - (a.dues || 0) || String(a.name).localeCompare(String(b.name)));
    const totalDues = (res.summary && res.summary.dues) || 0;
    const withDues = parties.filter((p) => (p.dues || 0) > 0).length;
    content.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:14px; font-size:13px;">
        <span>Total: <strong>${parties.length}</strong></span>
        <span>With Dues: <strong style="color:var(--danger);">${withDues}</strong></span>
        <span>Total Due: <strong style="color:var(--danger);">${formatCurrency(totalDues)}</strong></span>
      </div>
      ${parties.length ? `
      <table class="data-table" style="width:100%; font-size:13px;">
        <thead><tr><th>Party</th><th>Type</th><th>Contact</th><th>Due</th></tr></thead>
        <tbody>
          ${parties.map((p) => {
            const badges = [];
            if (p.is_supplier) badges.push('Supplier');
            if (p.is_customer) badges.push('Customer');
            const due = p.dues || 0;
            return `<tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td>${badges.length ? badges.join(' + ') : '-'}</td>
              <td>${p.mobile ? escapeHtml(p.mobile) : (p.email ? escapeHtml(p.email) : '-')}</td>
              <td style="${due > 0 ? 'color:var(--danger); font-weight:bold;' : ''}">${due > 0 ? formatCurrency(due) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : '<p class="empty">No parties found.</p>'}
    `;
  } catch (err) {
    content.innerHTML = `<p style="padding:20px; text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
};

window.closeAdminPartiesModal = () => {
  document.getElementById("parties-list-modal")?.classList.remove("show");
};

window.openAdminDueModal = async () => {
  const modal = document.getElementById("due-list-modal");
  const content = document.getElementById("due-list-content");
  if (!modal || !content) return;
  content.innerHTML = '<p style="padding:20px; text-align:center;">Loading dues...</p>';
  modal.classList.add("show");
  try {
    const res = await api("/api/parties");
    const parties = (res.parties || []).filter((p) => (p.dues || 0) > 0).sort((a, b) => (b.dues || 0) - (a.dues || 0));
    const totalDues = parties.reduce((s, p) => s + (p.dues || 0), 0);
    content.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:14px; font-size:13px;">
        <span>Parties with Dues: <strong>${parties.length}</strong></span>
        <span>Total Due: <strong style="color:var(--danger);">${formatCurrency(totalDues)}</strong></span>
      </div>
      ${parties.length ? `
      <table class="data-table" style="width:100%; font-size:13px;">
        <thead><tr><th>Party</th><th>Type</th><th>Contact</th><th>Due</th></tr></thead>
        <tbody>
          ${parties.map((p) => {
            const badges = [];
            if (p.is_supplier) badges.push('Supplier');
            if (p.is_customer) badges.push('Customer');
            return `<tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td>${badges.length ? badges.join(' + ') : '-'}</td>
              <td>${p.mobile ? escapeHtml(p.mobile) : (p.email ? escapeHtml(p.email) : '-')}</td>
              <td style="color:var(--danger); font-weight:bold;">${formatCurrency(p.dues)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : '<p class="empty">No dues outstanding.</p>'}
    `;
  } catch (err) {
    content.innerHTML = `<p style="padding:20px; text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
};

window.closeAdminDueModal = () => {
  document.getElementById("due-list-modal")?.classList.remove("show");
};

document.getElementById("business-settings-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById("business-settings-status");
  if (status) status.textContent = "";
  try {
    await api("/api/settings/business", {
      method: "PUT",
      body: JSON.stringify({
        businessName: form.businessName.value,
        gstin: form.gstin.value,
        businessAddress: form.businessAddress.value,
        businessPhone: form.businessPhone.value,
        businessEmail: form.businessEmail.value,
      }),
    });
    if (status) status.textContent = "Settings saved!";
    setTimeout(() => document.getElementById("business-settings-modal")?.classList.remove("show"), 1000);
  } catch (err) {
    if (status) status.textContent = err.message;
  }
});

const closePaymentModeModal = () => {
  document.getElementById("payment-mode-modal")?.classList.remove("show");
  currentMarkPaidRequestId = null;
  currentMarkPaidType = "service";
  currentMarkPaidRemaining = 0;
};
window.closePaymentModeModal = closePaymentModeModal;

const openPaymentModal = () => {
  const amountSection = document.getElementById("payment-amount-section");
  const amountInput = document.getElementById("payment-amount-input");
  const discountInput = document.getElementById("payment-discount-input");
  const balanceHint = document.getElementById("payment-balance-hint");
  const hint = document.getElementById("payment-mode-hint");
  const dateInput = document.getElementById("payment-date-input");
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
  if (currentMarkPaidType === "service") {
    if (amountSection) amountSection.style.display = "block";
    if (amountInput) amountInput.value = currentMarkPaidRemaining > 0 ? currentMarkPaidRemaining : "";
    if (discountInput) discountInput.value = 0;
    if (balanceHint) balanceHint.textContent = currentMarkPaidRemaining > 0
      ? `Bill balance due: Rs. ${currentMarkPaidRemaining.toLocaleString("en-IN")} — enter a smaller amount to record a partial payment, and use Discount to waive part of the balance.`
      : "";
    if (hint) hint.textContent = "Select payment mode for this service bill.";
  } else {
    if (amountSection) amountSection.style.display = "none";
    if (hint) hint.textContent = "Select payment mode for this bill.";
  }
  document.getElementById("payment-mode-modal")?.classList.add("show");
};

const closeSupplierDuesModal = () => {
  document.getElementById("supplier-dues-list-modal")?.classList.remove("show");
};
window.closeSupplierDuesModal = closeSupplierDuesModal;

const closeDashboardListModal = () => {
  document.getElementById("dashboard-list-modal")?.classList.remove("show");
};
window.closeDashboardListModal = closeDashboardListModal;

const renderDashboardDetailModal = async (type) => {
  const modal = document.getElementById("dashboard-list-modal");
  const title = document.getElementById("dashboard-list-title");
  const content = document.getElementById("dashboard-list-content");
  if (!modal || !content) return;

  const typeLabels = {
    pending: "Pending Service Requests",
    scheduled: "Scheduled Jobs",
    completed: "Jobs Ready for Billing",
    needs_action: "Outstanding Actions",
    collection: "Pending Collections",
    low_stock: "Low Stock Inventory",
    unbilled_challans: "Unbilled Delivery Challans",
    total_billed: "Consolidated Billing Ledger"
  };

  title.textContent = typeLabels[type] || "Details";
  content.innerHTML = '<p style="padding:20px; text-align:center;">Loading details...</p>';
  modal.classList.add("show");

  try {
    const res = await api(`/api/sales/dashboard/details?type=${type}`);
    const data = res.data || [];

    if (!data.length) {
      content.innerHTML = '<p style="padding:40px; text-align:center; color:var(--muted);">No records found for this category.</p>';
      return;
    }

    let html = `<table class="data-table" style="font-size:12px;"><thead><tr>`;

    if (type === 'pending' || type === 'scheduled') {
      html += `<th>Customer</th><th>Device</th><th>${type === 'pending' ? 'Issue' : 'Technician'}</th><th>Date</th>`;
    } else if (type === 'completed') {
      html += `<th>Customer</th><th>Device</th><th>Est. Cost</th><th>Action</th>`;
    } else if (type === 'needs_action') {
      html += `<th>Customer</th><th>Needs</th><th>Details</th>`;
    } else if (type === 'collection') {
      html += `<th>Customer</th><th>Source</th><th>Amount</th><th>Action</th>`;
    } else if (type === 'low_stock') {
      html += `<th>Product</th><th>In Stock</th><th>Supplier</th>`;
    } else if (type === 'unbilled_challans') {
      html += `<th>DC Number</th><th>Customer</th><th>Date</th><th>Amount</th>`;
    } else if (type === 'total_billed') {
      html += `<th>Date</th><th>Customer</th><th>Type</th><th>Amount</th>`;
    }

    html += `</tr></thead><tbody>`;

    data.forEach(item => {
      html += `<tr>`;
      if (type === 'pending') {
        html += `<td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.device_type)}</td><td>${escapeHtml(item.issue)}</td><td>${escapeHtml(item.date)}</td>`;
      } else if (type === 'scheduled') {
        html += `<td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.device_type)}</td><td>${escapeHtml(item.tech)}</td><td>${escapeHtml(item.date)}</td>`;
      } else if (type === 'completed') {
        const billAction = item.bill_status !== 'billed'
          ? `<button class="button button-small button-primary" onclick="closeDashboardListModal(); window.openBillingModal('${escapeHtml(item.id)}')">Bill</button>`
          : `<span class="chip success">Billed</span>`;
        html += `<td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.device_type)}</td><td>${formatCurrency(item.estimated_cost)}</td><td>${billAction}</td>`;
      } else if (type === 'needs_action') {
        const detail = item.reason === 'Part Needed' ? formatRequestedParts(item.detail) : item.detail;
        html += `<td>${escapeHtml(item.customer_name)}</td><td><span class="chip warning">${escapeHtml(item.reason)}</span></td><td>${escapeHtml(detail)}</td>`;
      } else if (type === 'collection') {
        const actionFn = item.source === 'Service'
          ? `window.openServicePaymentMode('${escapeHtml(item.id)}', ${Number(item.amount) || 0})`
          : `window.openOrderPaymentMode('${escapeHtml(item.id)}')`;
        const actionBtn = `<button class="button button-small button-accent" onclick="closeDashboardListModal(); ${actionFn}">Mark Paid</button>`;
        html += `<td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.source)}</td><td><strong>${formatCurrency(item.amount)}</strong></td><td>${actionBtn}</td>`;
      } else if (type === 'low_stock') {
        html += `<td><strong>${escapeHtml(item.name)}</strong></td><td style="color:var(--danger); font-weight:bold;">${item.stock}</td><td>${escapeHtml(item.supplier_name || '-')}</td>`;
      } else if (type === 'unbilled_challans') {
        html += `<td><strong>${escapeHtml(item.challan_number)}</strong></td><td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.date)}</td><td><strong>${formatCurrency(item.amount)}</strong></td>`;
      } else if (type === 'total_billed') {
        html += `<td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.customer_name)}</td><td>${escapeHtml(item.type)}</td><td><strong>${formatCurrency(item.amount)}</strong></td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = `<p style="padding:20px; text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
};
window.renderDashboardDetailModal = renderDashboardDetailModal;

const renderSupplierDuesModal = async () => {
  const content = document.getElementById("supplier-dues-list-content");
  if (!content) return;
  content.innerHTML = '<p style="padding:20px; text-align:center;">Loading pending payments...</p>';
  document.getElementById("supplier-dues-list-modal")?.classList.add("show");

  try {
    const res = await api("/api/sales/purchases/pending");
    const purchases = res.purchases || [];

    if (purchases.length === 0) {
      content.innerHTML = '<p style="padding:20px; text-align:center; color:var(--text-soft);">No pending supplier payments found.</p>';
      return;
    }

    content.innerHTML = `
      <table class="data-table" style="font-size: 13px;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Supplier</th>
            <th>Product</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${purchases.map(p => `
            <tr>
              <td>${p.purchase_date}</td>
              <td><strong>${escapeHtml(p.supplier_name)}</strong></td>
              <td>${escapeHtml(p.product_name)}</td>
              <td style="color:var(--danger); font-weight:bold;">${formatCurrency(p.balance != null ? p.balance : p.total_cost)}</td>
              <td>
                <button class="button button-accent button-small" onclick="openSupplierPaymentMode('${p.id}')">Mark Paid</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    content.innerHTML = `<p style="padding:20px; text-align:center; color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
};

window.openSupplierPaymentMode = (purchaseId) => {
  currentMarkPaidRequestId = purchaseId;
  currentMarkPaidType = "supplier_purchase";
  openPaymentModal();
};

window.openServicePaymentMode = (id, remaining) => {
  currentMarkPaidRequestId = id;
  currentMarkPaidType = "service";
  currentMarkPaidRemaining = Number(remaining) || 0;
  openPaymentModal();
};

window.openOrderPaymentMode = async (id, type = 'order') => {
  currentMarkPaidRequestId = id;
  currentMarkPaidType = type;

  const amountSection = document.getElementById("payment-amount-section");
  const amountInput = document.getElementById("payment-amount-input");
  const hintEl = document.getElementById("payment-balance-hint");
  const discountInput = document.getElementById("payment-discount-input");
  const discountSection = discountInput ? discountInput.closest("div") : null;

  if (amountSection) amountSection.style.display = "block";

  // Show discount only for services
  if (discountSection) discountSection.style.display = type === 'service' ? "block" : "none";

  try {
    let totalAmount = 0;
    let totalPaid = 0;

    if (type === 'service') {
      const [serviceRes, paymentsRes] = await Promise.all([
        api(`/api/sales/service-requests/${id}`),
        api(`/api/sales/service-requests/${id}/payments`)
      ]);
      totalAmount = serviceRes.request.bill_amount;
      totalPaid = (paymentsRes.payments || []).reduce((s, p) => s + p.amount, 0);
    } else {
      const [res, paymentsRes] = await Promise.all([
        api("/api/sales/orders"),
        api(`/api/sales/orders/${id}/payments`)
      ]);
      const order = (res.orders || []).find(o => o.id === id);
      totalAmount = order.total_amount;
      totalPaid = (paymentsRes.payments || []).reduce((s, p) => s + p.amount, 0);
    }

    const remaining = totalAmount - totalPaid;

    if (amountInput) {
      amountInput.value = remaining;
    }
    if (hintEl) {
      hintEl.innerHTML = `
        Bill Total: <strong>${formatCurrency(totalAmount)}</strong><br>
        Paid so far: <strong>${formatCurrency(totalPaid)}</strong><br>
        Remaining: <strong style="color:var(--danger);">${formatCurrency(remaining)}</strong>
      `;
    }
  } catch (e) { console.error("Failed to load bill balance", e); }

  openPaymentModal();
};

const handlePaymentRecord = async (mode) => {
  if (!currentMarkPaidRequestId) return;
  const paymentDateEl = document.getElementById("payment-date-input");
  const paymentDate = paymentDateEl ? paymentDateEl.value : "";
  const amountInput = document.getElementById("payment-amount-input");
  const amt = amountInput ? Number(amountInput.value) : 0;

  try {
    let endpoint = "";
    let body;
    if (currentMarkPaidType === "service") {
      endpoint = `/api/sales/service-requests/${currentMarkPaidRequestId}/payment`;
      const discountInput = document.getElementById("payment-discount-input");
      const disc = discountInput ? Number(discountInput.value) : 0;
      body = { amount: amt > 0 ? amt : undefined, discount: disc > 0 ? disc : undefined, paymentMode: mode, paymentDate: paymentDate || undefined };
    } else if (currentMarkPaidType === "order") {
      endpoint = `/api/sales/orders/${currentMarkPaidRequestId}/payment`;
      body = { amount: amt, paymentMode: mode, paymentDate: paymentDate || undefined };
    } else if (currentMarkPaidType === "supplier_purchase") {
      endpoint = `/api/sales/purchases/${currentMarkPaidRequestId}/payment`;
      body = { status: "paid", paymentMode: mode, paymentDate: paymentDate || undefined, amount: amt > 0 ? amt : undefined };
    }

    const result = await api(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body)
    });

    toast(result?.message || `Payment recorded via ${mode}`, "success");
    closePaymentModeModal();

    // Refresh modal if it was open
    if (currentMarkPaidType === "supplier_purchase") {
      renderSupplierDuesModal();
    }

    if (typeof renderSalesPage === "function") renderSalesPage();
  } catch (err) {
    toast(err.message || "Failed to record payment", "error");
  }
};

// Use event delegation to avoid stacking listeners on page re-renders
document.addEventListener("click", (e) => {
  const cashBtn = e.target.closest("#payment-cash-btn");
  const upiBtn = e.target.closest("#payment-upi-btn");
  if (cashBtn) handlePaymentRecord("Cash");
  if (upiBtn) handlePaymentRecord("UPI");
});

const initPage = async () => {
  if (page === "home") await renderHomePage();
  if (page === "products") await renderProductsPage();
  if (page === "services") await renderServicesPage();
  if (page === "login") await renderLoginPage();
  if (page === "admin") await renderAdminPage();
  if (page === "employee") await renderEmployeePage();
  if (page === "technician") await renderTechnicianPage();
  if (page === "sales") await renderSalesPage();
  if (page === "customer") await renderCustomerPage();
  mountThemeToggle();
};

applyTheme(resolveInitialTheme());

const cartModal = document.getElementById("cart-modal");
const cartIcon = document.getElementById("cart-icon");
const closeCartBtn = document.getElementById("close-cart");
if (cartModal && cartIcon) {
  cartIcon.addEventListener("click", (e) => { e.preventDefault(); cartModal.style.display = "flex"; });
  closeCartBtn?.addEventListener("click", () => { cartModal.style.display = "none"; });
  cartModal.addEventListener("click", (e) => { if (e.target === cartModal) cartModal.style.display = "none"; });
}

initPage().catch(reportPageError);
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
  let iconRefreshScheduled = false;
  const iconObserver = new MutationObserver(() => {
    if (iconRefreshScheduled) return;
    iconRefreshScheduled = true;
    requestAnimationFrame(() => {
      iconRefreshScheduled = false;
      iconObserver.disconnect();
      lucide.createIcons();
      iconObserver.observe(document.body, { childList: true, subtree: true });
    });
  });
  iconObserver.observe(document.body, { childList: true, subtree: true });
}
