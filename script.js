// Popup logic
const popup = document.getElementById("popup");
const popupBox = document.getElementById("popup-box");

document.querySelectorAll("#grid-nopol button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const bayNumber = btn.querySelector("div").innerText.trim();
    const nopol = btn.innerText.replace(bayNumber, "").trim();

    document.getElementById("popup-bay").textContent = "BAY " + bayNumber;
    document.getElementById("popup-status").textContent = nopol;

    popup.classList.remove("hidden");
    popupBox.classList.add("popup-enter");
    requestAnimationFrame(() => {
      popupBox.classList.add("popup-enter-active");
      popupBox.classList.remove("popup-enter");
    });
    switchTab("detail");

    loadUnitData(bayNumber, nopol !== "FREE" ? nopol : null);
    loadActivityData(bayNumber);
  });
});

function closePopup() {
  popupBox.classList.add("popup-exit-active");
  popupBox.classList.remove("popup-exit");
  setTimeout(() => {
    popup.classList.add("hidden");
    popupBox.classList.remove("popup-enter-active");
    popupBox.classList.remove("popup-exit-active");
  }, 200);
}

function switchTab(tab) {
  document
    .getElementById("form-detail")
    .classList.toggle("hidden", tab !== "detail");
  document
    .getElementById("form-activity")
    .classList.toggle("hidden", tab !== "activity");
  document
    .getElementById("tab-detail")
    .classList.toggle("bg-gray-200", tab === "detail");
  document
    .getElementById("tab-detail")
    .classList.toggle("bg-white", tab !== "detail");
  document
    .getElementById("tab-activity")
    .classList.toggle("bg-gray-200", tab === "activity");
  document
    .getElementById("tab-activity")
    .classList.toggle("bg-white", tab !== "activity");
}

// === Config ===
const webAppUrl =
  "https://script.google.com/macros/s/AKfycby86EokF0c9XwB31nU1sdckSFBUNY-hyiApzop44_m87EXYYa0kbEKKvJhIUx645XG2/exec";
const detailForm = document.getElementById("form-detail");
const activityForm = document.getElementById("form-activity");

const sheetsConfig = {
  UNIT: [
    "BAYS",
    "NOPOL",
    "IN",
    "OUT",
    "NEW/REC",
    "TYPE UNIT",
    "YEAR",
    "MODEL UNIT",
    "AXLE",
    "SITE",
    "CLIENT",
    "NOTE",
  ],
  ACTIVITY: [
    "BAYS",
    "SECTION",
    "COMPONENT",
    "STATUS",
    "STARTDATE",
    "STARTTIME",
    "ENDDATE",
    "ENDTIME",
    "ACTIVITY",
    "PIC",
  ],
  notes: [
    "TYPE UNIT",
    "MODEL UNIT",
    "AXLE",
    "SITE",
    "DESCRIPTION",
    "CLIENT",
    // "SECTION",
    "COMPONENT",
    "YEAR",
  ],
};

// --- Variabel Global untuk cache data ---
let allUnitsData = [];
let allActivityData = [];
// ----------------------------------------

function normalizeId(header) {
  return header.replace(/[\/\s]/g, "").toUpperCase();
}

function findKeyValue(row, headerName) {
  if (!row) return "";
  const wanted = headerName.replace(/\s+/g, "").toUpperCase();
  for (const k in row) {
    if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
    const kk = String(k).replace(/\s+/g, "").toUpperCase();
    if (kk === wanted) return row[k];
  }
  return "";
}

function convertToWIB(utcString) {
    if (!utcString) return "";

    try {
        if (utcString.includes("1899-12-30T")) {
            const date = new Date(utcString);
            if (isNaN(date)) return "";
            
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        const date = new Date(utcString);
        if (isNaN(date)) return utcString;
        
        // Cukup ambil HH:MM dari waktu lokalnya
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;

    } catch (e) {
        console.error("Error converting time to HH:MM:", e);
        return "";
    }
}

function jsonp(url, sheet = '') {
    return new Promise((resolve, reject) => {
        const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
        window[callbackName] = function (data) {
            try {
                delete window[callbackName];
            } catch (e) {}
            try {
                document.body.removeChild(script);
            } catch (e) {}

            // --- START: MAPPING DATA KE WIB ---
            if (sheet === 'ACTIVITY' && Array.isArray(data)) {
                // Konversi setiap baris data ACTIVITY
                const mappedData = data.map(row => {
                    if (row.STARTTIME) {
                        row.STARTTIME = convertToWIB(row.STARTTIME);
                    }
                    if (row.ENDTIME) {
                        row.ENDTIME = convertToWIB(row.ENDTIME);
                    }
                    // STARTDATE/ENDDATE biarkan tetap ISO string, kita tangani di loadUnitData
                    return row;
                });
                console.log('Data ACTIVITY setelah mapping WIB:', mappedData);
                resolve(mappedData);
                return;
            }
            // --- END: MAPPING DATA KE WIB ---

            if (sheet === 'ACTIVITY') {
                console.log('bentar bang :', data); // Log data sebelum mapping jika bukan array (misal hanya 1 object)
            }
            resolve(data);
        };

        const script = document.createElement("script");
        script.src = `${url}${
            url.includes("?") ? "&" : "?"
        }callback=${callbackName}&sheet=${sheet}`; // Pastikan parameter sheet ikut terkirim
        script.onerror = () => {
            try {
                delete window[callbackName];
            } catch (e) {}
            reject(new Error("JSONP failed"));
        };
        document.body.appendChild(script);
    });
}

// GRID rendering
function renderGrid(units) {
  const grid = document.getElementById("grid-nopol");
  if (!grid) return;
  grid.innerHTML = "";

  const baysPerColumn = 4;
  const totalBays = 16;

  for (let col = 0; col < totalBays / baysPerColumn; col++) {
    const colDiv = document.createElement("div");
    colDiv.className = "w-full grid grid-cols-1 grid-rows-4 gap-2";

    for (let i = 1; i <= baysPerColumn; i++) {
      const bayNumber = col * baysPerColumn + i;
      const unit = (units || []).find(
        (u) => String(findKeyValue(u, "BAYS")) === String(bayNumber)
      );
      const nopolVal = unit ? findKeyValue(unit, "NOPOL") : "";
      const isFree = !nopolVal;

      const btn = document.createElement("button");
      btn.className =
        (isFree ? "bg-white text-gray-700" : "bg-gray-700 text-white") +
        " text-sm  flex items-center gap-2";

      btn.innerHTML = `
        <div class="h-full p-3 px-5 flex justify-center items-center top-0" 
             style="width: 50px;border-right: 8px solid #d1d5db;">
          ${bayNumber}
        </div>
        <span class="px-2">
          ${isFree ? "FREE" : nopolVal}
        </span>
      `;

      btn.addEventListener("click", () => {
        document.getElementById("popup-bay").textContent = "BAY " + bayNumber;
        document.getElementById("popup-status").textContent = isFree
          ? "FREE"
          : nopolVal;
        popup.classList.remove("hidden");
        switchTab("detail");
        loadUnitData(bayNumber, isFree ? null : nopolVal);
        loadActivityData(bayNumber);
      });

      colDiv.appendChild(btn);
    }

    grid.appendChild(colDiv);
  }
}

// Dropdown helpers
function ensureSelectElement(elementId) {
  const existing = document.getElementById(elementId);
  if (!existing) return null;
  if (existing.tagName && existing.tagName.toUpperCase() === "SELECT")
    return existing;

  const sel = document.createElement("select");
  sel.id = existing.id;
  sel.className = existing.className || "";
  if (existing.name) sel.name = existing.name;

  const phText =
    existing.getAttribute("placeholder") || existing.value || `Pilih`;
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = phText;
  sel.appendChild(ph);

  existing.parentNode.replaceChild(sel, existing);
  return sel;
}

function selectSetValue(selectEl, value) {
  if (!selectEl) return;
  if (!value && value !== 0) {
    selectEl.value = "";
    return;
  }
  const str = String(value);

  for (let o of Array.from(selectEl.options)) {
    if (String(o.value) === str) {
      selectEl.value = o.value;
      return;
    }
  }
  for (let o of Array.from(selectEl.options)) {
    const txt = String(o.textContent).trim();
    if (txt === str || txt.startsWith(str) || txt.includes(str)) {
      selectEl.value = o.value;
      return;
    }
  }
  const opt = document.createElement("option");
  opt.value = str;
  opt.textContent = str;
  selectEl.appendChild(opt);
  selectEl.value = str;
}

function createDropdownIfData(dataRows, headerName, elementId, customValues) {
  let el = document.getElementById(elementId);
  if (!el) return;

  let items = [];
  if (Array.isArray(customValues)) {
    items = customValues.slice();
  } else {
    const raw = (dataRows || [])
      .map((r) => findKeyValue(r, headerName))
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "");
    const uniq = [...new Set(raw)];
    items = uniq.map((v) => ({ value: v, label: v }));
  }

  if (items.length === 0) {
    if (el.tagName && el.tagName.toUpperCase() === "SELECT") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = el.id;
      input.name = el.name || "";
      input.className = el.className || "";
      el.parentNode.replaceChild(input, el);
    }
    return;
  }

  if (!(el.tagName && el.tagName.toUpperCase() === "SELECT")) {
    const sel = document.createElement("select");
    sel.id = el.id;
    sel.name = el.name || "";
    sel.className = el.className || "";
    el.parentNode.replaceChild(sel, el);
    el = sel;
  }

  const placeholder =
    el.querySelector("option")?.outerHTML ||
    `<option value="">Pilih ${headerName}</option>`;
  el.innerHTML = placeholder;
  items.forEach((it) => {
    const opt = document.createElement("option");
    opt.value = it.value;
    opt.textContent = it.label;
    el.appendChild(opt);
  });
}

// populate year options
function populateYearOptions(notesRows) {
  const yearEl = document.getElementById("YEAR");
  if (!yearEl) return;

  let rows = [];
  if (Array.isArray(notesRows)) rows = notesRows;
  else if (notesRows && typeof notesRows === "object") {
    if (Array.isArray(notesRows.data)) rows = notesRows.data;
    else rows = Object.values(notesRows);
  }

  const noteYears = rows
    .map((r) => findKeyValue(r, "YEAR"))
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== "");
  const uniq = [...new Set(noteYears.map(String))].sort();

  yearEl.innerHTML = `<option value="">Pilih Tahun</option>`;
  if (uniq.length > 0) {
    uniq.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearEl.appendChild(opt);
    });
  } else {
    const current = new Date().getFullYear();
    for (let y = 2000; y <= current; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearEl.appendChild(opt);
    }
  }
}

// populate all selects from notes
function populateFromNotes(dataRaw) {
  let data = [];
  if (Array.isArray(dataRaw)) data = dataRaw;
  else if (dataRaw && typeof dataRaw === "object") {
    if (Array.isArray(dataRaw.data)) data = dataRaw.data;
    else data = Object.values(dataRaw);
  }

  createDropdownIfData(data, "TYPE UNIT", "TYPEUNIT");
  createDropdownIfData(data, "MODEL UNIT", "MODELUNIT");
  createDropdownIfData(data, "AXLE", "AXLE");

  // SITE dropdown with desc ( ini ngebug )
  const siteMap = new Map();
  (data || []).forEach((row) => {
    const code = findKeyValue(row, "SITE");
    const descr = findKeyValue(row, "SITE-DESCRIPTION") || "";
    if (code) siteMap.set(code, descr ? `${code} - ${descr}` : code);
  });
  const siteValues = Array.from(siteMap.entries()).map(([value, label]) => ({
    value,
    label,
  }));
  createDropdownIfData(data, "SITE", "SITE", siteValues);

  createDropdownIfData(data, "CLIENT", "CLIENT");
  // createDropdownIfData(data, "SECTION", "SECTION");

  const statusMap = new Map();
  (data || []).forEach((row) => {
    const code = findKeyValue(row, "STATUS");
    const descr = findKeyValue(row, "STATUS-DESCRIPTION") || "";
    if (code) statusMap.set(code, descr ? `${code} - ${descr}` : code);
  });
  const statusValues = Array.from(statusMap.entries()).map(
    ([value, label]) => ({ value, label })
  );
  createDropdownIfData(data, "STATUS", "STATUS", statusValues);

  createDropdownIfData(data, "CLIENT", "CLIENT");
  // createDropdownIfData(data, "SECTION", "SECTION");
}

// Fetch Data
async function fetchData(sheet = "UNIT") {
  try {
    const data = await jsonp(`${webAppUrl}?sheet=${sheet}&action=read`, sheet);

    if (sheet === "UNIT") {
      allUnitsData = data; // Simpan data unit
      renderGrid(data);
    } else if (sheet === "ACTIVITY") {
      allActivityData = data; // Simpan data activity
    }

    console.log("Fetched:", sheet, data);
    if (sheet === "UNIT") renderGrid(data);
    renderTable(data);
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Render Table (debug)
function renderTable(data) {
  const container = document.getElementById("table-wrapper");
  if (!container) return;
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p class='p-4 text-gray-500'>No data found</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "min-w-full border border-gray-300";

  const headers = Object.keys(data[0]);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.className = "border px-3 py-2 bg-gray-100 text-sm";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((h) => {
      const td = document.createElement("td");
      td.textContent = row[h] || "";
      td.className = "border px-3 py-1 text-sm";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

// Helpers buat Kondisi & Date/Time format
function getKondisiValue() {
  const selected = document.querySelector('input[name="NEWREC"]:checked');
  return selected ? selected.value : "";
}

// Save Detail Unit Form
detailForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const headers = sheetsConfig["UNIT"];
  const payloadObj = {};
  headers.forEach((header) => {
    if (header === "BAYS") {
      payloadObj[header] = document
        .getElementById("popup-bay")
        .textContent.replace("BAY ", "");
    } else if (header === "IN" || header === "OUT") {
      payloadObj[header] = "";
    } else if (header === "NEW/REC") {
      payloadObj[header] = getKondisiValue();
    } else {
      const inputId = normalizeId(header);
      const el = document.getElementById(inputId);
      payloadObj[header] = el ? el.value : "";
    }
  });

  const url = `${webAppUrl}?sheet=UNIT&action=save&payload=${encodeURIComponent(
    JSON.stringify(payloadObj)
  )}`;

  console.log("Saving Detail:", payloadObj);
  const result = await jsonp(url);
  alert(result.message || "Save complete");
  fetchData("UNIT");
});

// Save Activity Form
// === PATCH: Separate Add & Save for Activity ===
let currentActivityRow = null;

// Replace Activity Form Submit with Separate Add/Save
const btnSaveActivity = document.getElementById("btn-save-activity");
const btnAddActivity = document.getElementById("btn-add-activity");

async function collectActivityPayload() {
  const headers = sheetsConfig["ACTIVITY"];
  const payloadObj = {};
  headers.forEach((header) => {
    if (header === "BAYS") {
      payloadObj[header] = document
        .getElementById("popup-bay")
        .textContent.replace("BAY ", "");
    } else {
      const inputId = normalizeId(header);
      const el = document.getElementById(inputId);
      if (el) {
        let val = el.value || "";
        if (header === "STARTDATE" || header === "ENDDATE") {
          if (val) {
            const d = new Date(val);
            if (!isNaN(d)) val = d.toISOString().split("T")[0];
          }
        } else if (header === "STARTTIME" || header === "ENDTIME") {
          if (val) val = val.slice(0, 5);
        }
        payloadObj[header] = val;
      } else payloadObj[header] = "";
    }
  });
  return payloadObj;
}

btnSaveActivity.addEventListener("click", async () => {
  const payloadObj = await collectActivityPayload();
  const bayNumber = document
    .getElementById("popup-bay")
    .textContent.replace("BAY ", "");

  // Ensure we always update the latest row for this BAY
  const allData = await jsonp(`${webAppUrl}?sheet=ACTIVITY&action=read`);
  const rows = allData.filter(
    (r) => String(findKeyValue(r, "BAYS")) === String(bayNumber)
  );

  if (rows.length === 0) {
    alert("No activity row found for this BAY to update.");
    return;
  }

  // Pick the latest row (prefer ADDED_TIME, otherwise last row)
  let latestRow;
  if (findKeyValue(rows[0], "ADDED_TIME")) {
    rows.sort((a, b) => {
      const ta = new Date(findKeyValue(a, "ADDED_TIME"));
      const tb = new Date(findKeyValue(b, "ADDED_TIME"));
      return tb - ta;
    });
    latestRow = rows[0];
  } else {
    latestRow = rows[rows.length - 1];
  }

  // Attach reference (row index if available)
  if (latestRow._rowRef) {
    payloadObj._rowRef = latestRow._rowRef;
  }

  const url = `${webAppUrl}?sheet=ACTIVITY&action=update&payload=${encodeURIComponent(
    JSON.stringify(payloadObj)
  )}`;
  console.log("Updating latest Activity Row:", payloadObj);
  const result = await jsonp(url);
  alert(result.message || "Latest activity updated");
  location.reload()
  await fetchData("UNIT");
  await loadActivityData(bayNumber);
});

btnAddActivity.addEventListener("click", async () => {
  const payloadObj = await collectActivityPayload();
  const d = new Date();
  const localIsoString = d.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
  }).replace(' ', 'T');
  const timezoneOffset = '+07:00'; 
  payloadObj.ADDED_TIME = localIsoString + timezoneOffset;
  const url = `${webAppUrl}?sheet=ACTIVITY&action=post&payload=${encodeURIComponent(
    JSON.stringify(payloadObj)
  )}`;
  console.log("Adding New Activity Row:", payloadObj);
  const result = await jsonp(url);
  alert(result.message || "New Activity added");
  
  location.reload()
  const bayNumber = document
    .getElementById("popup-bay")
    .textContent.replace("BAY ", "");
  await fetchData("UNIT"); // no mapping refresh here
  await loadActivityData(bayNumber);
});

// loadActivityData patched to use ADDED_TIME sorting
async function loadActivityData(bayNumber) {
  const headers = sheetsConfig["ACTIVITY"];
  try {
    const data = await jsonp(`${webAppUrl}?sheet=ACTIVITY&action=read`);
    const rows = data.filter(
      (r) => String(findKeyValue(r, "BAYS")) === String(bayNumber)
    );
    if (rows.length === 0) {
      currentActivityRow = null;
      headers.forEach((header) => {
        const el = document.getElementById(normalizeId(header));
        if (el) el.value = "";
      });
      return;
    }
    const timestampHeader = "ADDED_TIME"; // column name for timestamp
    rows.sort((a, b) => {
      const ta = new Date(findKeyValue(a, timestampHeader));
      const tb = new Date(findKeyValue(b, timestampHeader));
      return tb - ta;
    });
    const row = rows[0];
    currentActivityRow = row;
    headers.forEach((header) => {
      const el = document.getElementById(normalizeId(header));
      if (!el) return;
      const v = findKeyValue(row, header) || "";
      if (header === "STARTDATE" || header === "ENDDATE") {
        el.value = formatDateForInput(v);
      } else if (header === "STARTTIME" || header === "ENDTIME") {
        console.log(v)
        el.value = v;
      } else {
        if (el.tagName && el.tagName.toUpperCase() === "SELECT") {
          selectSetValue(el, v);
        } else {
          el.value = v;
        }
      }
    });
  } catch (err) {
    console.error("Error loading activity:", err);
  }
}

// Load unit data
async function loadUnitData(bayNumber, nopol) {
  const headers = sheetsConfig["UNIT"];
  try {
    const data = allUnitsData;
    const unit = data.find(
      (row) => String(findKeyValue(row, "BAYS")) === String(bayNumber)
    );

    if (unit) {
      headers.forEach((header) => {
        if (header === "NEW/REC") {
          document.querySelectorAll('input[name="NEWREC"]').forEach((radio) => {
            radio.checked = radio.value === (findKeyValue(unit, header) || "");
          });
        } else {
          const el = document.getElementById(normalizeId(header));
          if (el) {
            if (el.tagName && el.tagName.toUpperCase() === "SELECT") {
              selectSetValue(el, findKeyValue(unit, header));
            } else {
              el.value = findKeyValue(unit, header) || "";
            }
          }
        }
      });
    } else {
      headers.forEach((header) => {
        if (header === "NEW/REC") {
          document.querySelectorAll('input[name="NEWREC"]').forEach((radio) => {
            radio.checked = false;
          });
        } else {
          const el = document.getElementById(normalizeId(header));
          if (el) {
            el.value = "";
          }
        }
      });
    }
  } catch (err) {
    console.error("Error loading unit:", err);
  }
}

// Load the latest activity for a given BAY
async function loadActivityData(bayNumber) {
  const headers = sheetsConfig["ACTIVITY"];
  try {
    // const data = await jsonp(`${webAppUrl}?sheet=ACTIVITY&action=read`);
    const data = allActivityData;

    // Filter rows by BAY
    const rows = data.filter(
      (r) => String(findKeyValue(r, "BAYS")) === String(bayNumber)
    );

    if (rows.length === 0) {
      currentActivityRow = null;
      headers.forEach((header) => {
        const el = document.getElementById(normalizeId(header));
        if (el) el.value = "";
      });
      return;
    }

    // Pick the latest row:
    // 1. Prefer ADDED_TIME column if it exists
    // 2. Otherwise fall back to the last row in the sheet
    let row;
    if (findKeyValue(rows[0], "ADDED_TIME") !== "") {
      rows.sort((a, b) => {
        const ta = new Date(findKeyValue(a, "ADDED_TIME"));
        const tb = new Date(findKeyValue(b, "ADDED_TIME"));
        return tb - ta; // newest first
      });
      row = rows[0];
    } else {
      row = rows[rows.length - 1]; // take last one if no ADDED_TIME
    }

    currentActivityRow = row;

    // Fill the form with row values
    headers.forEach((header) => {
      const el = document.getElementById(normalizeId(header));
      if (!el) return;
      const v = findKeyValue(row, header) || "";
      if (header === "STARTDATE" || header === "ENDDATE") {
        el.value = formatDateForInput(v);
      } else if (header === "STARTTIME" || header === "ENDTIME") {
        el.value = formatTimeForInput(v);
      } else {
        if (el.tagName && el.tagName.toUpperCase() === "SELECT") {
          selectSetValue(el, v);
        } else {
          el.value = v;
        }
      }
    });
  } catch (err) {
    console.error("Error loading activity:", err);
  }
}

function formatDateForInput(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  // yyyy-mm-dd for <input type="date">
  return d.toISOString().split("T")[0];
}

function formatTimeForInput(val) {
  if (!val) return "";
  
  return val;
}

// Initial Load
fetchData("notes")
  .then((notesData) => {
    populateFromNotes(notesData);
    populateYearOptions();
    fetchData("UNIT");
    fetchData("ACTIVITY");
  })
  .catch((err) => {
    console.error("notes fetch failed", err);
    populateYearOptions();
    fetchData("UNIT");
    fetchData("ACTIVITY");
  });


// additonal custom input select section and component
const componentMapping = {
    "R & I": [
        { code: "ENG", description: "ENGINE" },
        { code: "TM", description: "TRANSMISSION" },
        { code: "AXL", description: "AXLE" },
        { code: "SUS", description: "SUSPENSION" },
        { code: "WTR", description: "WHEEL, TYRE, RIM" },
        { code: "RFU BM", description: "RFU BM" }
    ],
    "REBUILD": [
        { code: "ENG", description: "ENGINE" },
        { code: "TM", description: "TRANSMISSION" },
        { code: "AXL", description: "AXLE" }
    ],
    "FINISHING": [
        { code: "ELC", description: "ELECTRIC SYSTEM" },
        { code: "AC", description: "AIR CONDITIONER" },
        { code: "MFC", description: "MAIN FRAME CHASSIS" },
        { code: "FIN", description: "FINISHING" },
        { code: "RFU", description: "RFU" }
    ]
};

const sectionSelect = document.getElementById('SECTION');
const componentSelect = document.getElementById('COMPONENT');

/**
 * Memperbarui opsi di dropdown COMPONENT berdasarkan nilai yang dipilih di SECTION.
 */
function updateComponentOptions() {
    const selectedSection = sectionSelect.value;
    
    const components = componentMapping[selectedSection] || [];

    componentSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Pilih Component";
    componentSelect.appendChild(defaultOption);

    components.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp.code; 
        option.textContent = `${comp.code} - ${comp.description}`;
        componentSelect.appendChild(option);
    });
}

// Tambahkan event listener ke elemen SECTION
sectionSelect.addEventListener('change', updateComponentOptions);
document.addEventListener('DOMContentLoaded', updateComponentOptions);