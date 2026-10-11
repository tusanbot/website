const $ = (s) => document.querySelector(s);
let groups = [];
let saved = {};
const container = $("#groups");
async function init() {
  groups = await (await fetch(chrome.runtime.getURL("sites.json"))).json();
  const stored = await chrome.storage.local.get(["selectedState", "rootName"]);
  saved = stored.selectedState || {};
  $("#rootName").value = stored.rootName || "خدمات کافی‌نت توسن";
  render();
}
function isChecked(gi, si) { const key = `${gi}:${si}`; return Object.prototype.hasOwnProperty.call(saved, key) ? !!saved[key] : true; }
function setChecked(gi, si, value) { saved[`${gi}:${si}`] = value; }
function render() {
  container.innerHTML = "";
  groups.forEach((group, gi) => {
    const wrap = document.createElement("section"); wrap.className = "group";
    const head = document.createElement("div"); head.className = "group-head";
    const all = group.sites.every((_, si) => isChecked(gi, si));
    const groupBox = document.createElement("input"); groupBox.type = "checkbox"; groupBox.checked = all; groupBox.setAttribute("aria-label", `انتخاب همه سایت‌های ${group.name}`);
    const title = document.createElement("label"); title.textContent = group.name;
    const toggle = document.createElement("button"); toggle.className = "mini"; toggle.textContent = "باز/بستن";
    const list = document.createElement("div"); list.className = "sites";
    group.sites.forEach((site, si) => {
      const row = document.createElement("div"); row.className = "site";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = isChecked(gi, si);
      cb.addEventListener("change", () => { setChecked(gi, si, cb.checked); save(); updateSummary(); });
      const label = document.createElement("label"); label.textContent = site.title; label.addEventListener("click", e => { if (e.target === label) cb.click(); });
      row.append(cb, label); list.append(row);
    });
    groupBox.addEventListener("change", () => { group.sites.forEach((_, si) => setChecked(gi, si, groupBox.checked)); save(); render(); });
    title.addEventListener("click", () => { groupBox.checked = !groupBox.checked; groupBox.dispatchEvent(new Event("change")); });
    toggle.addEventListener("click", () => { list.hidden = !list.hidden; });
    head.append(groupBox, title, toggle); wrap.append(head, list); container.append(wrap);
  });
  updateSummary();
}
function updateSummary() { let count = 0; groups.forEach((g, gi) => g.sites.forEach((_, si) => { if (isChecked(gi, si)) count++; })); $("#count").textContent = count; }
async function save() { await chrome.storage.local.set({selectedState: saved, rootName: $("#rootName").value.trim()}); }
$("#rootName").addEventListener("input", save);
$("#selectAll").addEventListener("click", async () => { groups.forEach((g, gi) => g.sites.forEach((_, si) => setChecked(gi, si, true))); await save(); render(); });
$("#selectNone").addEventListener("click", async () => { groups.forEach((g, gi) => g.sites.forEach((_, si) => setChecked(gi, si, false))); await save(); render(); });
function getChildren(parentId) { return new Promise((resolve, reject) => chrome.bookmarks.getChildren(parentId, nodes => { const e=chrome.runtime.lastError; e ? reject(new Error(e.message)) : resolve(nodes); })); }
function createBookmark(details) { return new Promise((resolve, reject) => chrome.bookmarks.create(details, node => { const err = chrome.runtime.lastError; if (err) reject(new Error(err.message)); else resolve(node); })); }
function searchBookmarks(query) { return new Promise((resolve, reject) => chrome.bookmarks.search(query, nodes => { const e=chrome.runtime.lastError; e ? reject(new Error(e.message)) : resolve(nodes); })); }
async function findOrCreateFolder(parentId, title) { const children = await getChildren(parentId); const found = children.find(n => !n.url && n.title === title); if (found) return found.id; return (await createBookmark({parentId, title})).id; }
async function addSelected() {
  const rootName = $("#rootName").value.trim() || "خدمات کافی‌نت توسن"; await save();
  const tree = await new Promise((resolve, reject) => chrome.bookmarks.getTree(nodes => { const e=chrome.runtime.lastError; e ? reject(new Error(e.message)) : resolve(nodes); }));
  const root = tree[0]; const bar = (root.children || []).find(n => n.id === "1" || /bookmark bar|bookmarks bar|نوار نشانک/i.test(n.title || "")) || root.children?.[0];
  if (!bar) throw new Error("نوار بوکمارک پیدا نشد.");
  const rootId = await findOrCreateFolder(bar.id, rootName);
  let added = 0, existed = 0, failed = [];
  for (let gi=0; gi<groups.length; gi++) {
    const selected = groups[gi].sites.filter((_,si)=>isChecked(gi,si)); if (!selected.length) continue;
    const folderId = await findOrCreateFolder(rootId, groups[gi].name);
    for (const site of selected) { try { const found=await searchBookmarks(site.url); if(found.some(n=>n.url===site.url)){existed++;continue;} await createBookmark({parentId:folderId,title:site.title,url:site.url}); added++; } catch(e){failed.push(`${site.title}: ${e.message}`);} }
  }
  let message = `تمام شد.\n${added} بوکمارک اضافه شد؛ ${existed} مورد از قبل وجود داشت.`; if(failed.length) message += `\nخطاها:\n${failed.slice(0,5).join("\n")}`;
  $("#status").textContent=message; $("#status").className=failed.length?"error":"";
}
$("#add").addEventListener("click", async()=>{ $("#add").disabled=true; $("#status").textContent="در حال افزودن بوکمارک‌ها…"; try{await addSelected();}catch(e){$("#status").textContent=`خطا: ${e.message}`;$("#status").className="error";}finally{$("#add").disabled=false;} });
init().catch(e=>{$("#status").textContent=`خطا در بارگذاری فهرست: ${e.message}`;$("#status").className="error";});
