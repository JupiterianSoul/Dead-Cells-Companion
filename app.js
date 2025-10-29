// ========== CONFIG ========== //
const ITEMS_JSON_URL = "items.json"; // adjust if you use a subfolder

// ========== STATE ========== //
let items = [], filtered = [], favorites = [], unlocked = [], notes = {};
let typeList = [];
let cmpSel = [];
let page = 1, perPage = 20;

// ========== LOAD INIT ========== //

document.addEventListener("DOMContentLoaded", async () => {
  loadLocal();
  await loadItems();
  buildTypeFilter();
  applyFilter();
  setUpEvents();
});

// -------- DATA LOAD -------- //
async function loadItems(f = null) {
  try {
    let data;
    if (f) {
      data = await f.text();
    } else {
      data = await fetch(ITEMS_JSON_URL).then(r => r.json());
    }
    items = Array.isArray(data) ? data : Object.values(data);
    typeList = [...new Set(items.map(it => it.type).filter(Boolean))];
    return true;
  } catch (e) {
    alert("Error loading items: " + e);
    items = [];
    return false;
  }
}

// -------- FILTER, SEARCH -------- //
function buildTypeFilter() {
  const sel = document.getElementById("type-filter");
  sel.innerHTML = `<option value="">All Types</option>` +
    typeList.map(t => `<option value="${t}">${t}</option>`).join("");
}
function applyFilter() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  const tflt = document.getElementById("type-filter").value;
  const sflt = document.getElementById("stat-filter").value.trim().toLowerCase();

  filtered = items.filter(item => {
    if (tflt && item.type !== tflt) return false;
    if (q && ![item.name, item.long_description, item.infobox?.combo, item.infobox?.flavor_text].join(" ").toLowerCase().includes(q)) return false;
    if (sflt && !(JSON.stringify(item.infobox||{}).toLowerCase().includes(sflt))) return false;
    return true;
  });
  page = 1;
  renderItemList();
}

// --------- RENDER MAIN VIEW --------- //
function renderItemList() {
  const list = document.getElementById("item-list");
  if (!filtered.length) { list.innerHTML = `<div>No items match your query.</div>`; }
  let paged = filtered.slice((page-1)*perPage, page*perPage);
  list.innerHTML = paged.map(renderItemCard).join("");
  renderPagination();
}

function renderItemCard(item) {
  return `
  <div class="item-card">
    <div class="item-header">
      <img class="item-img" src="${guessIcon(item)}" alt="${item.name}" loading="lazy">
      <h2>${item.name}</h2>
      <span class="item-type">${item.type||""}</span>
    </div>
    <div>${item.long_description||""}</div>
    <div class="item-actions">
      <button onclick="showDetail('${item.name}')">Details</button>
      <button onclick="toggleFav('${item.name}')" class="fav-btn${favorites.includes(item.name)?' active':''}">★</button>
      <button onclick="addCompare('${item.name}')">Compare</button>
      <button onclick="setUnlock('${item.name}')">${unlocked.includes(item.name)?'⛏':'🔓'}</button>
    </div>
    <textarea class="notes-box" onchange="saveNote('${item.name}',this.value)" placeholder="Your notes...">${notes[item.name]||""}</textarea>
  </div>
  `;
}
function renderPagination() {
  let pagDiv = document.getElementById("pagination");
  let numPages = Math.ceil(filtered.length/perPage);
  if (numPages <= 1) { pagDiv.innerHTML = ""; return; }
  let str = "";
  for (let i=1;i<=numPages;i++) {
    str += `<button class="pagination-btn${i===page?' active':''}" onclick="gotoPage(${i})">${i}</button>`;
  }
  pagDiv.innerHTML = str;
}
function gotoPage(n) { page = n; renderItemList(); }

// --------- ITEM DETAIL MODAL --------- //
window.showDetail = function(name) {
  const item = items.find(i=>i.name===name);
  if (!item) return;
  let html = `
  <div class="modal-content">
    <button class="close-btn" onclick="closeModal('detail-modal')">×</button>
    <h2>${item.name}</h2>
    <img class="icon-large" src="${guessIcon(item)}" alt="${item.name}">
    <div>
      <span class="item-type">${item.type||""}</span>
      ${favorites.includes(item.name)?'<span>★ Favorite</span>':''}
      ${unlocked.includes(item.name)?'<span>⛏ Unlocked</span>':''}
    </div>
    <ul>
      ${Object.entries(item.infobox||{}).map(([k,v])=>`<li><b>${k}:</b> ${v}</li>`).join("")}
    </ul>
    <div><b>Description:</b> ${item.long_description||""}</div>
    <div><b>Flavor:</b> ${item.infobox?.flavor_text||""}</div>
    <div><b>Unlock:</b> ${item.infobox?.blueprintlocation||""} Cost: ${item.infobox?.blueprintcost||""}</div>
    <div><b>Critical Effects:</b> ${item.infobox?.critical_hit||""}</div>
    <label>Your notes:
      <textarea class="notes-box" onchange="saveNote('${item.name}',this.value)">${notes[item.name]||""}</textarea>
    </label>
  </div>
  `;
  showModal("detail-modal", html);
};
function showModal(mid, html) {
  let m = document.getElementById(mid);
  m.innerHTML = html;
  m.classList.add("active");
}
window.closeModal = function(mid) { document.getElementById(mid).classList.remove("active"); };

// --------- COMPARE ITEMS --------- //
window.addCompare = function(name) {
  if (!cmpSel.includes(name)) cmpSel.push(name);
  renderCompareModal();
}
function renderCompareModal() {
  let html = `<div class="modal-content"><button class="close-btn" onclick="closeModal('compare-modal')">×</button><h2>Compare Items</h2><div style="display:flex;gap:18px;justify-content:center;">`;
  for (let n of cmpSel) {
    let item = items.find(i=>i.name===n);
    if (!item) continue;
    html += `<div><img src="${guessIcon(item)}" style="width:66px"/><h4>${item.name}</h4><ul>${
      Object.entries(item.infobox||{}).map(([k,v])=>`<li><b>${k}:</b> ${v}</li>`).join("")
    }</ul><div>${item.long_description||""}</div>
    <button onclick="removeCompare('${item.name}')">Remove</button></div>`;
  }
  html += `</div></div>`;
  showModal("compare-modal", html);
}
window.removeCompare = function(name) {
  cmpSel = cmpSel.filter(n=>n!==name);
  renderCompareModal();
};

// --------- FAVORITES --------- //
window.toggleFav = function(name) {
  if (favorites.includes(name)) favorites = favorites.filter(n=>n!==name);
  else favorites.push(name);
  saveLocal(); renderItemList();
}
document.getElementById("show-favs-btn").onclick = function() {
  filtered = items.filter(i=>favorites.includes(i.name));
  page = 1;
  renderItemList();
};

// --------- UNLOCK TRACKER --------- //
window.setUnlock = function(name) {
  if (unlocked.includes(name)) unlocked = unlocked.filter(n=>n!==name);
  else unlocked.push(name);
  saveLocal(); renderItemList();
}
document.getElementById("unlock-btn").onclick = function() {
  let html = `<div class="modal-content"><button class="close-btn" onclick="closeModal('unlock-modal')">×</button>
  <h2>Unlock Tracker</h2><ul>`;
  for (let n of unlocked) html += `<li>${n}</li>`;
  html += "</ul></div>";
  showModal("unlock-modal", html);
};

// --------- RANDOM ITEM --------- //
document.getElementById("random-btn").onclick = function() {
  const idx = Math.floor(Math.random() * items.length);
  showDetail(items[idx].name);
};

// --------- EXPORT --------- //
document.getElementById("export-btn").onclick = function() {
  const str = JSON.stringify(filtered, null, 2);
  saveAsFile('filtered_items.json', str, "application/json");
};
function saveAsFile(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// --------- NOTES (LocalStorage) --------- //
window.saveNote = function(name, val) {
  notes[name] = val;
  saveLocal();
}
// --------- PERSISTENCE --------- //
function saveLocal() {
  localStorage.setItem("dc_favs", JSON.stringify(favorites));
  localStorage.setItem("dc_unlocks", JSON.stringify(unlocked));
  localStorage.setItem("dc_notes", JSON.stringify(notes));
}
function loadLocal() {
  favorites = JSON.parse(localStorage.getItem("dc_favs")||"[]");
  unlocked = JSON.parse(localStorage.getItem("dc_unlocks")||"[]");
  notes = JSON.parse(localStorage.getItem("dc_notes")||"{}");
}

// --------- FILE IMPORT --------- //
document.getElementById("file-input").onchange = async function(e) {
  if (e.target.files[0]) {
    await loadItems(e.target.files[0]);
    buildTypeFilter();
    applyFilter();
  }
};

// --------- UI WIREUP --------- //
function setUpEvents() {
  document.getElementById("apply-filter").onclick = applyFilter;
  document.getElementById("search-input").onkeyup = e => { if (e.key === "Enter") applyFilter(); }
  document.getElementById("stat-filter").onkeyup = e => { if (e.key === "Enter") applyFilter(); }
  document.getElementById("type-filter").onchange = applyFilter;
  document.getElementById("compare-btn").onclick = renderCompareModal;
  document.getElementById("filter-toggle-btn").onclick = function(){
    document.getElementById("filters").classList.toggle("active");
  };
}

// --------- ICON HINT --------- //
function guessIcon(item) {
  // Prefer static/icons/[name].png or item.infobox.icon, fallback to placeholder
  if (item.infobox?.icon) return item.infobox.icon;
  return "icons/" + item.name.replace(/[\s:'-]/g, '_') + ".png";
}
