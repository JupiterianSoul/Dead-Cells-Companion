// Dead Cells Companion App JS
// Author: You!
// Modular, robust, scalable—add new features easily!

// ========== GLOBAL STATE ==========
let allItems = [], itemsByType = {}, filterMap = {}, currentTab = 'items', currentCompare = [];
let favorites = []; let unlocks = []; let notes = {};
const maxCompare = 3;

// ========== INIT ==========

document.addEventListener("DOMContentLoaded", async () => {
  // Load persistent state
  loadLocal();
  await loadItems();
  buildTypeTabs();
  setupEvents();
  activateTab('items');
  renderProgress();
});

// ========== DATA LOAD/SPLIT ==========
async function loadItems(src = "items.json") {
  try {
    let raw = await fetch(src).then(r => r.json());
    allItems = Array.isArray(raw) ? raw : Object.values(raw);
    splitByType();
  } catch(e) {
    alert("Error loading items: " + e);
    allItems = [];
  }
}

function splitByType() {
  const typeMap = {};
  for (let it of allItems) {
    let typ = it.type || "Other";
    if (!typeMap[typ]) typeMap[typ] = [];
    typeMap[typ].push(it);
  }
  itemsByType = typeMap;
  // Populate filter options
  filterMap.types = Object.keys(typeMap).sort();
  filterMap.rarities = ["Common", "Rare", "Legendary", "Boss"];
}

// ========== UI BUILD ==========
function buildTypeTabs() {
  for(let t of filterMap.types) {
    const tabId = `tab-content-${t.toLowerCase().replace(/\\s/g, '')}`;
    let tabBtn = document.getElementById(`tab-${t.toLowerCase()}`);
    if(tabBtn) tabBtn.onclick = () => activateTab(t);
  }
  populateSelect("type-filter", filterMap.types, "All Types");
  populateSelect("rarity-filter", filterMap.rarities, "All Rarities");
}

function populateSelect(id, opts, defaultLabel) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${defaultLabel}</option>` +
    opts.map(t => `<option value="${t}">${t}</option>`).join("");
}

// ========== TAB AND NAV ==========

function activateTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(tc => tc.style.display='none');
  let tabId = `tab-content-${tab.toLowerCase().replace(/\\s/g,'')}`;
  const el = document.getElementById(tabId);
  if(el)  { el.style.display='block'; renderTabContent(tab, el); }
  else if(tab === 'items') {
    document.getElementById('tab-content-items').style.display='block';
    renderTabContent('items', document.getElementById('tab-content-items'));
  }
  highlightTab(tab);
}

function highlightTab(tab) {
  document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
  let tabBtn = document.getElementById(`tab-${tab.toLowerCase()}`);
  if(tabBtn) tabBtn.classList.add('active');
}

// ========== LIST/CARD RENDER ==========
function renderTabContent(tab, parent) {
  let arr = tab === 'items' ? allItems : itemsByType[tab] || [];
  let flt = applyCurrentFilter(arr);
  parent.innerHTML = flt.map(renderItemCard).join('');
}

function renderItemCard(item) {
  return `
    <div class="item-card">
      <div class="item-header">
        <img class="item-img" src="${getIconFor(item)}" alt="${item.name}">
        <h2>${item.name}</h2>
        <span class="item-type">${item.type}</span>
        ${isFavorite(item.name) ? '<span class="favstar">★</span>' : ''}
        ${isUnlocked(item.name) ? '<span class="unlockstar">⛏</span>' : ''}
      </div>
      <div class="item-desc">${getCleanDesc(item.long_description)}</div>
      <div class="item-actions">
        <button onclick="showItemModal('${item.name}')">Details</button>
        <button onclick="toggleFavorite('${item.name}')">${isFavorite(item.name) ? 'Unfavorite' : 'Favorite'}</button>
        <button onclick="toggleCompare('${item.name}')">${isCompared(item.name) ? 'Remove Compare' : 'Compare'}</button>
        <button onclick="toggleUnlock('${item.name}')">${isUnlocked(item.name) ? 'Lock' : 'Unlock'}</button>
      </div>
      <div class="notes-area">
        <textarea class="notes-box" onchange="saveNote('${item.name}',this.value)" placeholder="Your notes...">${getNote(item.name)}</textarea>
      </div>
    </div>
  `;
}

// ========== ITEM MODAL & INFOSTATS ==========
window.showItemModal = function(name) {
  const item = allItems.find(i => i.name === name);
  if (!item) return;
  let html = `<div class="modal-content">
    <button class="close-btn" onclick="closeModal('item-modal')">×</button>
    <div class="modal-header">
      <img src="${getIconFor(item)}" class="icon-large">
      <h2>${item.name}</h2>
      <span class="item-type">${item.type}</span>
      ${isFavorite(item.name)?'<span class="favstar">★ Favorite</span>':''}
      ${isUnlocked(item.name)?'<span class="unlockstar">⛏ Unlocked</span>':''}
    </div>
    <div class="modal-section">
      <div class="item-stats">${renderInfobox(item.infobox)}</div>
      <div class="item-desc">${getCleanDesc(item.long_description)}</div>
      <div class="modal-link"><a href="${item.url}" target="_blank">Wiki</a></div>
    </div>
    <div>
      <h3>Your Notes</h3>
      <textarea style="width:98%;min-height:32px;" onchange="saveNote('${item.name}',this.value)">${getNote(item.name)}</textarea>
    </div>
  </div>`;
  showModal("item-modal", html);
};

function renderInfobox(infobox) {
  let html = '<table class="infobox">';
  for (let [k, v] of Object.entries(infobox)) {
    if (!v || /^internal name/i.test(k)) continue;
    let label = k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
    html += `<tr><td class="infokey">${label}</td><td>${v}</td></tr>`;
  }
  html += '</table>';
  return html;
}

function getCleanDesc(desc) {
  // Try to show only core readable description
  if (!desc) return '';
  let s = desc.split('Internal Name')[0].trim();
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([0-9])([A-Z])/g, '$1 $2').replace(/Type[A-Za-z ]*/g,'');
}

function getIconFor(item) {
  return (item.infobox && item.infobox.icon) ? item.infobox.icon :
    `icons/${item.name.replace(/[\s:'-]/g, '_')}.png`;
}

// ========== SEARCH/FILTER/SORT ==========

function applyCurrentFilter(arr) {
  const query = document.getElementById("search-input").value.toLowerCase();
  const tflt = document.getElementById("type-filter").value;
  const rflt = document.getElementById("rarity-filter").value;
  const sort = document.getElementById("sort-filter").value;
  let res = arr.filter(item => {
    if (tflt && item.type !== tflt) return false;
    if (rflt && (item.infobox.rarity||'Common') !== rflt) return false;
    if (query && ![item.name, item.long_description, ...Object.values(item.infobox)].join(" ").toLowerCase().includes(query)) return false;
    return true;
  });
  res = sortItems(res, sort);
  return res;
}

function sortItems(arr, key) {
  let keyMap = { name: "name", type: "type", dps: "Base Dps", rarity: "rarity"};
  let k = keyMap[key] || key;
  return arr.slice().sort((a,b) => (a[k]||"").localeCompare(b[k]||""));
}

// ========== EVENTS ==========
function setupEvents() {
  // Tab nav: detect click
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.onclick = () => activateTab(a.textContent.trim());
  });
  document.getElementById("apply-filter").onclick = () => activateTab(currentTab);
  document.getElementById("search-input").onkeyup = e => { if (e.key==='Enter') activateTab(currentTab); };
  document.getElementById("random-item-btn").onclick = () => showItemModal(pickRandom());
  document.getElementById("export-btn").onclick = () => exportFiltered();
  document.getElementById("import-json").onchange = evt => { if (evt.target.files[0]) { importJsonFile(evt.target.files[0]); }};
  document.getElementById("open-favs").onclick = renderFavorites;
  document.getElementById("open-unlocks").onclick = renderUnlockModal;
  document.getElementById("open-compare").onclick = renderCompareModal;
  document.getElementById("open-settings").onclick = renderSettingsModal;
}

// ========== COMPARE ==========
window.toggleCompare = function(name) {
  if (isCompared(name)) currentCompare = currentCompare.filter(n=>n!==name);
  else if(currentCompare.length < maxCompare) currentCompare.push(name);
  renderCompareModal();
}
function renderCompareModal() {
  let html = '<div class="modal-content"><button class="close-btn" onclick="closeModal(\'compare-modal\')">×</button><h2>Compare Items</h2><div class="compare-list">';
  for(let n of currentCompare) {
    const item = allItems.find(i=>i.name===n); if(!item)continue;
    html += `<div class="compare-card"><img src="${getIconFor(item)}" class="icon-large"><h4>${item.name}</h4>${renderInfobox(item.infobox)}<p>${getCleanDesc(item.long_description)}</p>
      <button onclick="toggleCompare('${item.name}')">Remove</button></div>`;
  }
  html += `</div></div>`;
  showModal("compare-modal", html);
}
function isCompared(name) { return currentCompare.includes(name); }

// ========== FAVORITES/UNLOCKS/NOTES ==========

window.toggleFavorite = function(name) {
  if(isFavorite(name)) favorites = favorites.filter(n=>n!==name);
  else favorites.push(name);
  saveLocal(); activateTab(currentTab);
}
function isFavorite(name) { return favorites.includes(name); }
function renderFavorites() {
  let favs = allItems.filter(i => isFavorite(i.name));
  let html = '<div class="modal-content"><button class="close-btn" onclick="closeModal(\'item-modal\')">×</button><h2>Your Favorite Items</h2>' +
    favs.map(renderItemCard).join('');
  showModal("item-modal", html);
}

window.toggleUnlock = function(name) {
  if(isUnlocked(name)) unlocks = unlocks.filter(n=>n!==name);
  else unlocks.push(name);
  saveLocal(); activateTab(currentTab);
}
function isUnlocked(name) { return unlocks.includes(name); }
function renderUnlockModal() {
  let unl = allItems.filter(i => isUnlocked(i.name));
  let html = '<div class="modal-content"><button class="close-btn" onclick="closeModal(\'unlock-modal\')">×</button><h2>Unlocked Items</h2>' +
    unl.map(renderItemCard).join('');
  showModal("unlock-modal", html);
}

function saveNote(name, val) {
  notes[name] = val;
  saveLocal();
}
function getNote(name) { return notes[name] || ""; }

// ========== MODAL CONTROL ==========
function showModal(mid, html) {
  let m = document.getElementById(mid);
  m.innerHTML = html;
  m.classList.add("active");
}
window.closeModal = function(mid) { document.getElementById(mid).classList.remove("active"); }

// ========== SETTINGS ==========
function renderSettingsModal() {
  let html = `<div class="modal-content"><button class="close-btn" onclick="closeModal('settings-modal')">×</button><h2>Settings</h2>
    <label>Theme: <select id="theme-select"><option value="dark">Dark</option><option value="light">Light</option></select></label>
    <label>Cards Per Page: <input type="number" id="cards-per-page" value="20" min="5" max="100"></label>
    <button onclick="exportFiltered()">Export Current List</button>
    <button onclick="clearLocal()">Clear Favorites/Unlocks/Notes</button>
  </div>`;
  showModal("settings-modal", html);
  document.getElementById("cards-per-page").onchange = e => { /* handle cards per page change */ };
}
function clearLocal() {
  favorites = []; unlocks = []; notes = {};
  saveLocal(); activateTab(currentTab);
}

// ========== EXPORT/IMPORT ==========
function exportFiltered() {
  let arr = applyCurrentFilter(allItems);
  let str = JSON.stringify(arr, null, 2);
  saveAsFile('filtered_items.json', str, "application/json");
}
function saveAsFile(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function importJsonFile(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    try { allItems = JSON.parse(e.target.result); splitByType(); activateTab(currentTab); }
    catch(err) { alert('Failed to parse JSON'); }
  };
  reader.readAsText(file);
}

// ========== PROGRESS ==========
function renderProgress() {
  let total = allItems.length;
  let favCount = favorites.length;
  let unlockCount = unlocks.length;
  let html = `<div>
    <strong>Progress:</strong> <span>${unlockCount}/${total} Unlocked</span> | <span>${favCount} Favorites</span>
    <progress value="${unlockCount}" max="${total}"></progress>
  </div>`;
  document.getElementById('progress-area').innerHTML = html;
}

// ========== LOCAL STORAGE ==========
function saveLocal() {
  localStorage.setItem("dc_favs", JSON.stringify(favorites));
  localStorage.setItem("dc_unlocks", JSON.stringify(unlocks));
  localStorage.setItem("dc_notes", JSON.stringify(notes));
}
function loadLocal() {
  favorites = JSON.parse(localStorage.getItem("dc_favs")||"[]");
  unlocks = JSON.parse(localStorage.getItem("dc_unlocks")||"[]");
  notes = JSON.parse(localStorage.getItem("dc_notes")||"{}");
}

// ========== UTILS ==========
function pickRandom() {
  if(!allItems.length) return "";
  let idx = Math.floor(Math.random() * allItems.length);
  return allItems[idx].name;
}

