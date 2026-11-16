const members = [
  { name: "Arjun", full: "Arjun Rao", initials: "AR", color: "coral", role: "Treasurer" },
  { name: "Meera", full: "Meera Shah", initials: "MS", color: "mint", role: "Member" },
  { name: "Rohan", full: "Rohan Kapoor", initials: "RK", color: "blue", role: "Member" },
  { name: "Diya", full: "Diya Menon", initials: "DM", color: "yellow", role: "Member" }
];
const seed = {
  expenses: [
    { description: "Villa by the sea", amount: 18600, paidBy: "Arjun", category: "Stay", date: "2025-01-18", notes: "Four nights" },
    { description: "Airport cabs", amount: 2400, paidBy: "Meera", category: "Transport", date: "2025-01-18" },
    { description: "Beach shack dinner", amount: 3850, paidBy: "Rohan", category: "Food", date: "2025-01-19" },
    { description: "Dolphin cruise", amount: 5200, paidBy: "Arjun", category: "Activities", date: "2025-01-20" },
    { description: "Local market finds", amount: 1760, paidBy: "Diya", category: "Shopping", date: "2025-01-21" }
  ],
  wallet: [
    { type: "contribution", amount: 12000, member: "Arjun", note: "Opening fund", date: "2025-01-18" },
    { type: "contribution", amount: 10000, member: "Meera", note: "Trip contribution", date: "2025-01-18" },
    { type: "contribution", amount: 10000, member: "Rohan", note: "Trip contribution", date: "2025-01-18" },
    { type: "contribution", amount: 10000, member: "Diya", note: "Trip contribution", date: "2025-01-18" }
  ]
};
const state = JSON.parse(localStorage.getItem("tripmate-state") || "null") || seed;
const money = value => `₹${Math.round(value).toLocaleString("en-IN")}`;
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const save = () => localStorage.setItem("tripmate-state", JSON.stringify(state));
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function totals() {
  const contributions = state.wallet.filter(item => item.type === "contribution").reduce((sum, item) => sum + item.amount, 0);
  const transfers = state.wallet.filter(item => item.type === "transfer").reduce((sum, item) => sum + item.amount, 0);
  const expenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  return { contributions, transfers, expenses, balance: contributions - transfers - expenses };
}
function render() {
  const total = totals();
  $("#totalSpend").textContent = money(total.expenses);
  $("#reportTotal").textContent = money(total.expenses);
  $("#reportAverage").textContent = money(total.expenses / members.length);
  $("#walletBalance").textContent = money(total.balance);
  $("#walletHeroBalance").textContent = money(total.balance);
  $("#walletMeta").textContent = `of ${money(total.contributions)} contributed`;
  $("#walletProgress").style.width = `${Math.min(100, total.expenses / Math.max(total.contributions, 1) * 100)}%`;
  $("#walletPercent").textContent = `${Math.round(total.expenses / Math.max(total.contributions, 1) * 100)}%`;
  $("#expenseBadge").textContent = state.expenses.length;
  renderActivity(); renderMembers(); renderExpenses(); renderWallet(); renderBalances(); renderGallery(); renderReports();
}
function renderActivity() {
  const events = [...state.expenses.map(item => ({ ...item, icon: "↗", title: item.description, detail: `${item.paidBy} paid · ${item.category}`, value: -item.amount })), ...state.wallet.map(item => ({ ...item, icon: "＋", title: item.type === "contribution" ? `${item.member} added money` : `Transfer to ${item.member}`, detail: item.note || "Wallet record", value: item.type === "contribution" ? item.amount : -item.amount }))].slice(-5).reverse();
  $("#activityList").innerHTML = events.length ? events.map(item => `<div><div class="activity-icon">${item.icon}</div><div class="activity-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)} · ${dateLabel(item.date)}</small></div><span class="amount ${item.value > 0 ? "positive" : ""}">${item.value > 0 ? "+" : "-"}${money(Math.abs(item.value))}</span></div>`).join("") : `<p class="muted">No activity yet.</p>`;
}
function renderMembers() {
  $("#memberList").innerHTML = members.map(member => `<div class="member-row"><div class="avatar ${member.color}">${member.initials}</div><div><strong>${member.full}</strong><small>${member.name === "Arjun" ? "You" : "Joined Jan 18"}</small></div>${member.role === "Treasurer" ? `<span class="role">${member.role}</span>` : ""}</div>`).join("");
}
function renderExpenses() {
  $("#expenseRows").innerHTML = state.expenses.length ? state.expenses.slice().reverse().map(item => `<div class="expense-row"><div><strong>${escapeHtml(item.description)}</strong><small>${item.notes ? escapeHtml(item.notes) : "Shared trip expense"}</small></div><span>${escapeHtml(item.paidBy)}</span><span class="tag">${escapeHtml(item.category)}</span><span>${dateLabel(item.date)}</span><strong>${money(item.amount)}</strong></div>`).join("") : `<p class="muted">No expenses recorded.</p>`;
}
function renderWallet() {
  $("#walletRows").innerHTML = state.wallet.slice().reverse().map(item => `<div class="wallet-row"><span>${item.type === "contribution" ? "＋" : "↗"}</span><div><strong>${item.type === "contribution" ? `${escapeHtml(item.member)} contributed` : `Transfer to ${escapeHtml(item.member)}`}</strong><small>${escapeHtml(item.note || "Recorded manually")} · ${dateLabel(item.date)}</small></div><strong class="${item.type === "contribution" ? "positive" : ""}">${item.type === "contribution" ? "+" : "-"}${money(item.amount)}</strong></div>`).join("");
}
function memberBalances() {
  const result = Object.fromEntries(members.map(member => [member.name, 0]));
  state.expenses.forEach(expense => {
    const share = expense.amount / members.length;
    members.forEach(member => { result[member.name] -= share; });
    result[expense.paidBy] += expense.amount;
  });
  state.wallet.forEach(item => { if (item.type === "contribution") result[item.member] += item.amount; });
  return result;
}
function renderBalances() {
  const balances = memberBalances();
  $("#yourBalance").textContent = money(Math.abs(balances.Arjun));
  $("#yourBalance").className = balances.Arjun >= 0 ? "positive" : "";
  $("#balanceMessage").textContent = balances.Arjun >= 0 ? "You should receive" : "You should pay";
  $("#balanceRows").innerHTML = members.map(member => `<div class="balance-row"><div class="avatar ${member.color}">${member.initials}</div><div><strong>${member.full}${member.name === "Arjun" ? " (you)" : ""}</strong><small>${balances[member.name] >= 0 ? "should receive" : "owes the group"}</small></div><strong class="${balances[member.name] >= 0 ? "positive" : ""}">${balances[member.name] >= 0 ? "+" : "-"}${money(Math.abs(balances[member.name]))}</strong></div>`).join("");
  const positive = Object.entries(balances).filter(([, value]) => value > 1).sort((a, b) => b[1] - a[1]);
  const negative = Object.entries(balances).filter(([, value]) => value < -1).sort((a, b) => a[1] - b[1]);
  $("#suggestionRows").innerHTML = positive.length && negative.length ? `<div class="activity-list">${negative.map(([from, value], index) => `<div><div class="activity-icon">⇄</div><div class="activity-copy"><strong>${from} → ${positive[index % positive.length][0]}</strong><small>Suggested repayment</small></div><span class="amount">${money(Math.min(-value, positive[index % positive.length][1]))}</span></div>`).join("")}</div>` : `<p class="muted">Everyone is settled up ✦</p>`;
}
function renderGallery() {
  $("#gallery").innerHTML = [{ title: "First light in Goa", by: "Arjun · Jan 18", cls: "" }, { title: "Salt, sun & slow days", by: "Meera · Jan 19", cls: "two" }, { title: "Golden hour crew", by: "Rohan · Jan 20", cls: "three" }].map(item => `<figure class="gallery-card"><div class="gallery-photo ${item.cls}"><span>${item.cls === "two" ? "go slow" : item.cls === "three" ? "good times" : "goa"}</span></div><figcaption><strong>${item.title}</strong><small>${item.by}</small></figcaption></figure>`).join("");
}
function renderReports() {
  const byCategory = {};
  state.expenses.forEach(item => { byCategory[item.category] = (byCategory[item.category] || 0) + item.amount; });
  const ordered = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  $("#largestCategory").textContent = ordered[0]?.[0] || "—";
  const max = ordered[0]?.[1] || 1;
  $("#categoryBars").innerHTML = ordered.length ? ordered.map(([category, amount]) => `<div class="bar-row"><span>${category}</span><div class="bar-track"><i style="width:${amount / max * 100}%"></i></div><strong>${money(amount)}</strong></div>`).join("") : `<p class="muted">Add an expense to see the breakdown.</p>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
function showView(view) {
  $$(".view").forEach(section => section.classList.toggle("active", section.id === view));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  $("#viewCrumb").textContent = view.replace("-", " ").toUpperCase();
  $(".sidebar").classList.remove("open");
}
$$("[data-view]").forEach(item => item.addEventListener("click", event => { event.preventDefault(); showView(item.dataset.view); }));
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$$("[data-action='expense']").forEach(button => button.addEventListener("click", () => $("#expenseDialog").showModal()));
$$("[data-action='contribution']").forEach(button => button.addEventListener("click", () => $("#moneyDialog").showModal()));
$("#expenseForm").addEventListener("submit", event => { event.preventDefault(); const data = new FormData(event.currentTarget); state.expenses.push({ description: data.get("description"), amount: Number(data.get("amount")), paidBy: data.get("paidBy"), category: data.get("category"), date: data.get("date"), notes: data.get("notes") }); save(); render(); event.currentTarget.reset(); $("#expenseDialog").close(); });
$("#moneyForm").addEventListener("submit", event => { event.preventDefault(); const data = new FormData(event.currentTarget); state.wallet.push({ type: data.get("type"), amount: Number(data.get("amount")), member: data.get("member"), note: data.get("note"), date: new Date().toISOString().slice(0, 10) }); save(); render(); event.currentTarget.reset(); $("#moneyDialog").close(); });
function exportCsv() { const rows = [["Description", "Paid by", "Category", "Date", "Amount"], ...state.expenses.map(item => [item.description, item.paidBy, item.category, item.date, item.amount.toFixed(2)])]; const blob = new Blob([rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "tripmate-expenses.csv"; link.click(); URL.revokeObjectURL(link.href); }
$("#exportCsv").addEventListener("click", exportCsv); $("#exportCsv2").addEventListener("click", exportCsv);

const presets = { Original: "none", Warm: "sepia(.25) saturate(1.2)", Vintage: "sepia(.55) contrast(1.1)", Film: "contrast(1.2) saturate(.8)", Moody: "brightness(.8) contrast(1.25) saturate(.8)", Soft: "brightness(1.1) saturate(.75)", "Golden hour": "sepia(.3) saturate(1.5) brightness(1.05)", "B&W": "grayscale(1)" };
const adjustments = { brightness: 100, contrast: 100, saturation: 100 };
let photo = null; let rotation = 0; let activePreset = "Original";
$("#presets").innerHTML = Object.keys(presets).map((name, index) => `<button class="preset ${index === 0 ? "active" : ""}" data-preset="${name}" style="filter:${presets[name]}"><span>${name}</span></button>`).join("");
$("#sliders").innerHTML = Object.keys(adjustments).map(name => `<div class="slider"><label>${name[0].toUpperCase() + name.slice(1)} <output id="${name}Value">100</output></label><input type="range" min="0" max="200" value="100" data-adjustment="${name}"></div>`).join("");
function applyPhoto() { const canvas = $("#photoCanvas"); if (!photo) return; const ctx = canvas.getContext("2d"); const scale = Math.min(900 / photo.width, 600 / photo.height, 1); const width = photo.width * scale; const height = photo.height * scale; canvas.width = rotation % 180 ? height : width; canvas.height = rotation % 180 ? width : height; ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180); ctx.filter = `${presets[activePreset]} brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`; ctx.drawImage(photo, -width / 2, -height / 2, width, height); ctx.restore(); canvas.style.display = "block"; $("#canvasEmpty").style.display = "none"; }
function loadPhoto(file) { if (!file) return; const reader = new FileReader(); reader.onload = () => { photo = new Image(); photo.onload = applyPhoto; photo.src = reader.result; }; reader.readAsDataURL(file); }
$("#photoInput").addEventListener("change", event => loadPhoto(event.target.files[0])); $("#photoInputAlt").addEventListener("change", event => loadPhoto(event.target.files[0]));
$("#presets").addEventListener("click", event => { const button = event.target.closest("[data-preset]"); if (!button) return; activePreset = button.dataset.preset; $$(".preset").forEach(item => item.classList.toggle("active", item === button)); applyPhoto(); });
$("#sliders").addEventListener("input", event => { const name = event.target.dataset.adjustment; if (!name) return; adjustments[name] = event.target.value; $(`#${name}Value`).textContent = event.target.value; applyPhoto(); });
$("#rotatePhoto").addEventListener("click", () => { rotation = (rotation + 90) % 360; applyPhoto(); });
$("#resetPhoto").addEventListener("click", () => { activePreset = "Original"; rotation = 0; Object.keys(adjustments).forEach(name => { adjustments[name] = 100; $(`[data-adjustment="${name}"]`).value = 100; $(`#${name}Value`).textContent = 100; }); $$(".preset").forEach((item, index) => item.classList.toggle("active", index === 0)); applyPhoto(); });
$("#downloadPhoto").addEventListener("click", () => { if (!photo) return; const link = document.createElement("a"); link.download = "tripmate-edit.jpg"; link.href = $("#photoCanvas").toDataURL("image/jpeg", .92); link.click(); });
render();
