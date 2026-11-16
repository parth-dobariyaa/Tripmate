const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let tripId = 1;
let tripData = null;
let members = [];
let expenses = [];
let wallet = [];
let summary = {};
let photos = [];
let currentUser = null;
let currentExpenseTab = "all";
let userTrips = [];
let guideRecommendations = [];
let activeGuideCategory = "all";
let tripMap = null;
let tripMapMarkers = [];

// Helper for UI toast notifications
function showToast(message) {
  let toast = $("#appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✦</span> <span>${message}</span>`;
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// API client helper
const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

// Formatting utilities
const money = (paise) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const date = (val) =>
  new Date(`${val}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
const esc = (val) =>
  String(val ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );

// Navigation between views
function showView(view) {
  $$(".view").forEach((x) => x.classList.toggle("active", x.id === view));
  $$(".nav-item").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  $(".app-shell")?.classList.toggle("overview-mode", view === "overview");
  const crumb = $("#viewCrumb");
  if (crumb) crumb.textContent = view.toUpperCase();
  $(".sidebar")?.classList.remove("open");
}

// Calculate individual member balances
function calculateBalances() {
  const bal = Object.fromEntries(members.map((m) => [m.id, 0]));

  expenses.forEach((e) => {
    if (e.splits && e.splits.length) {
      e.splits.forEach((s) => {
        if (bal[s.user_id] !== undefined) {
          bal[s.user_id] -= s.share_paise;
        }
      });
    } else {
      const share = Math.round(e.amount_paise / Math.max(members.length, 1));
      members.forEach((m) => (bal[m.id] -= share));
    }
    if (bal[e.paid_by] !== undefined) {
      bal[e.paid_by] += e.amount_paise;
    }
  });

  wallet.forEach((w) => {
    if (bal[w.member_id] !== undefined) {
      bal[w.member_id] += w.type === "contribution" ? w.amount_paise : -w.amount_paise;
    }
  });

  return bal;
}

// Calculate suggested settlements
function calculateSettlements(balances) {
  const creditors = [];
  const debtors = [];

  for (const m of members) {
    const b = balances[m.id] || 0;
    if (b > 100) creditors.push({ id: m.id, name: m.name, amount: b });
    else if (b < -100) debtors.push({ id: m.id, name: m.name, amount: -b });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const deb = debtors[i];
    const cred = creditors[j];
    const amount = Math.min(deb.amount, cred.amount);

    if (amount > 50) {
      settlements.push({
        from: deb.name,
        to: cred.name,
        amount
      });
    }

    deb.amount -= amount;
    cred.amount -= amount;

    if (deb.amount <= 50) i++;
    if (cred.amount <= 50) j++;
  }

  return settlements;
}

// Render main UI
function render() {
  const bal = calculateBalances();
  const contributed = summary.contributions || 0;
  const initials = (currentUser?.name || "AR")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

  // Overview stats
  $("#totalSpend").textContent = money(summary.expenses || 0);
  $("#reportTotal").textContent = money(summary.expenses || 0);
  $("#reportAverage").textContent = money(
    (summary.expenses || 0) / Math.max(members.length, 1)
  );
  $("#walletBalance").textContent = money(summary.walletBalance || 0);
  $("#walletHeroBalance").textContent = money(summary.walletBalance || 0);
  $("#walletMeta").textContent = `of ${money(contributed)} contributed`;

  const percentUsed = Math.min(
    100,
    Math.round(((summary.expenses || 0) / Math.max(contributed, 1)) * 100)
  );
  $("#walletProgress").style.width = `${percentUsed}%`;
  $("#walletPercent").textContent = `${percentUsed}%`;
  $("#expenseBadge").textContent = expenses.length;

  // Your balance on overview card
  const myBalance = bal[currentUser?.id] || 0;
  const yourBalEl = $("#yourBalance");
  const balMsgEl = $("#balanceMessage");
  if (yourBalEl) {
    yourBalEl.textContent = `${myBalance >= 0 ? "+" : "-"}${money(Math.abs(myBalance))}`;
    yourBalEl.className = myBalance >= 0 ? "positive" : "negative";
  }
  if (balMsgEl) {
    balMsgEl.textContent =
      myBalance > 100
        ? "You should receive from the group"
        : myBalance < -100
        ? "You owe the group"
        : "You're all settled up";
  }

  // Members list
  const membersCountEl = $("#membersCountSubtitle");
  if (membersCountEl) {
    membersCountEl.textContent = `${members.length} ${members.length === 1 ? "friend" : "friends"} on this adventure`;
  }
  $("#memberList").innerHTML = members
    .map(
      (m) => `
    <div class="member-row">
      <div class="avatar coral">${esc(m.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</div>
      <div>
        <strong>${esc(m.name)}${m.id === currentUser?.id ? " (you)" : ""}</strong>
        <small>${m.role === "treasurer" ? "Treasurer" : "Trip member"}</small>
      </div>
      ${m.role === "treasurer" ? '<span class="role">Treasurer</span>' : ""}
    </div>`
    )
    .join("");

  // Profiles
  $("#profileName").textContent = currentUser?.name || "Signed in";
  $("#profileAvatar").textContent = initials;
  $("#profileModalAvatar").textContent = initials;
  $("#profileModalName").textContent = currentUser?.name || "Signed in";
  $("#profileModalEmail").textContent = currentUser?.email || "";
  const myRole = members.find((m) => m.id === currentUser?.id)?.role;
  $("#profileModalRole").textContent = myRole === "treasurer" ? "Treasurer" : "Member";
  $("#profileModalTrip").textContent = tripData?.trip?.name || "Trip";
  $("#userAvatar").textContent = initials;

  // Render expenses table based on current tab
  renderExpensesTable();

  // Activity list
  const recentEvents = expenses.slice(0, 5).map(
    (e) => `
    <div>
      <div class="activity-icon">↗</div>
      <div class="activity-copy">
        <strong>${esc(e.description)}</strong>
        <small>${esc(e.paid_by_name)} paid · ${esc(e.category)} · ${date(e.spent_on)}</small>
      </div>
      <span class="amount">-${money(e.amount_paise)}</span>
    </div>`
  );
  $("#activityList").innerHTML = recentEvents.join("") || '<p class="muted">No activity yet.</p>';

  // Wallet rows
  $("#walletRows").innerHTML =
    wallet
      .map(
        (w) => `
    <div class="wallet-row">
      <span>${w.type === "contribution" ? "＋" : "↗"}</span>
      <div>
        <strong>${esc(w.member_name)} ${w.type === "contribution" ? "contributed" : "received transfer"}</strong>
        <small>${esc(w.note || "Recorded manually")} · ${w.created_at ? w.created_at.slice(0, 10) : ""}</small>
      </div>
      <strong class="${w.type === "contribution" ? "positive" : ""}">${w.type === "contribution" ? "+" : "-"}${money(w.amount_paise)}</strong>
    </div>`
      )
      .join("") || '<p class="muted">No wallet records.</p>';

  // Balance rows in Settle Up
  $("#balanceRows").innerHTML = members
    .map(
      (m) => `
    <div class="balance-row">
      <div class="avatar coral">${esc(m.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</div>
      <div>
        <strong>${esc(m.name)}${m.id === currentUser?.id ? " (you)" : ""}</strong>
        <small>${bal[m.id] >= 0 ? "should receive" : "owes the group"}</small>
      </div>
      <strong class="${bal[m.id] >= 0 ? "positive" : ""}">${bal[m.id] >= 0 ? "+" : "-"}${money(Math.abs(bal[m.id]))}</strong>
    </div>`
    )
    .join("");

  // Suggested settlements in Settle Up
  const settlements = calculateSettlements(bal);
  if (settlements.length === 0) {
    $("#suggestionRows").innerHTML =
      '<p class="muted" style="padding:10px 0;">All balances are settled up! Everyone is squared away. ✦</p>';
  } else {
    $("#suggestionRows").innerHTML = settlements
      .map(
        (s) => `
      <div class="suggestion-card">
        <div>
          <strong>${esc(s.from)}</strong> pays <strong>${esc(s.to)}</strong>
        </div>
        <span>${money(s.amount)}</span>
      </div>`
      )
      .join("");
  }

  // Category breakdown in Reports
  const cats = {};
  expenses.forEach((e) => {
    cats[e.category] = (cats[e.category] || 0) + e.amount_paise;
  });
  const orderedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  $("#largestCategory").textContent = orderedCats[0] ? orderedCats[0][0] : "—";
  const maxCategorySpend = orderedCats[0] ? orderedCats[0][1] : 1;

  $("#categoryBars").innerHTML =
    orderedCats
      .map(
        ([name, total]) => `
    <div class="bar-row">
      <span>${esc(name)}</span>
      <div class="bar-track"><i style="width:${(total / maxCategorySpend) * 100}%"></i></div>
      <strong>${money(total)}</strong>
    </div>`
      )
      .join("") || '<p class="muted">Add an expense to see the breakdown.</p>';

  // Memories gallery
  renderGallery();
}

// Render expenses list or category groups
function renderExpensesTable() {
  const container = $("#expenseRows");
  if (!container) return;

  if (currentExpenseTab === "category") {
    const cats = {};
    expenses.forEach((e) => {
      if (!cats[e.category]) cats[e.category] = [];
      cats[e.category].push(e);
    });

    const entries = Object.entries(cats);
    if (!entries.length) {
      container.innerHTML = '<p class="muted" style="padding:20px;">No expenses recorded.</p>';
      return;
    }

    container.innerHTML = entries
      .map(
        ([catName, list]) => `
      <div style="margin-bottom:18px;">
        <div class="category-summary-row">
          <span>${esc(catName)} (${list.length})</span>
          <strong>${money(list.reduce((acc, curr) => acc + curr.amount_paise, 0))}</strong>
        </div>
        ${list
          .map(
            (e) => `
          <div class="expense-row">
            <div>
              <strong>${esc(e.description)}</strong>
              <small>${esc(e.notes || "Shared trip expense")}</small>
            </div>
            <span>${esc(e.paid_by_name)}</span>
            <span class="tag">${esc(e.category)}</span>
            <span>${date(e.spent_on)}</span>
            <strong>${money(e.amount_paise)}</strong>
            <div class="expense-actions">
              <button class="btn-edit" data-edit="${e.id}" title="Edit expense">✎</button>
              <button class="btn-delete" data-void="${e.id}" title="Void expense">✕</button>
            </div>
          </div>`
          )
          .join("")}
      </div>`
      )
      .join("");
  } else {
    container.innerHTML = expenses.length
      ? expenses
          .map(
            (e) => `
        <div class="expense-row">
          <div>
            <strong>${esc(e.description)}</strong>
            <small>${esc(e.notes || "Shared trip expense")}</small>
          </div>
          <span>${esc(e.paid_by_name)}</span>
          <span class="tag">${esc(e.category)}</span>
          <span>${date(e.spent_on)}</span>
          <strong>${money(e.amount_paise)}</strong>
          <div class="expense-actions">
            <button class="btn-edit" data-edit="${e.id}" title="Edit expense">✎</button>
            <button class="btn-delete" data-void="${e.id}" title="Void expense">✕</button>
          </div>
        </div>`
          )
          .join("")
      : '<p class="muted" style="padding:20px;">No expenses recorded.</p>';
  }

  // Attach edit handlers
  $$(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.edit);
      const exp = expenses.find((x) => x.id === id);
      if (!exp) return;
      const idInput = $("#expenseIdInput");
      const descInput = $("#expenseDescInput");
      const amtInput = $("#expenseAmountInput");
      const paidSelect = $("#expensePaidBySelect");
      const catSelect = $("#expenseCategorySelect");
      const dateInput = $("#expenseDateInput");
      const notesInput = $("#expenseNotesInput");
      const titleEl = $("#expenseDialogTitle");
      const eyebrowEl = $("#expenseDialogEyebrow");
      const submitBtn = $("#expenseSubmitBtn");

      if (idInput) idInput.value = exp.id;
      if (descInput) descInput.value = exp.description;
      if (amtInput) amtInput.value = (exp.amount_paise / 100).toFixed(2);
      if (paidSelect) paidSelect.value = exp.paid_by;
      if (catSelect) catSelect.value = exp.category;
      if (dateInput) dateInput.value = exp.spent_on;
      if (notesInput) notesInput.value = exp.notes || "";
      if (titleEl) titleEl.textContent = "Edit expense";
      if (eyebrowEl) eyebrowEl.textContent = "UPDATE RECORD";
      if (submitBtn) submitBtn.textContent = "Update expense";

      const splitUserIds = new Set((exp.splits || []).map((s) => s.user_id));
      $$("#splitMembersList input[name=splitMembers]").forEach((cb) => {
        cb.checked = splitUserIds.size ? splitUserIds.has(Number(cb.value)) : true;
      });

      $("#expenseDialog")?.showModal();
    });
  });

  // Attach delete handlers
  $$(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.void;
      if (!confirm("Are you sure you want to void this expense?")) return;
      try {
        await api(`/trips/${tripId}/expenses/${id}`, { method: "DELETE" });
        showToast("Expense removed");
        await load();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// Render Memories Gallery (Server photos + starter memories)
function renderGallery() {
  const gallery = $("#gallery");
  if (!gallery) return;

  const defaultCards = `
    <figure class="gallery-card">
      <div class="gallery-photo"><span>goa</span></div>
      <figcaption>
        <div>
          <strong>First light in Goa</strong>
          <small>Connected to your trip</small>
        </div>
      </figcaption>
    </figure>
    <figure class="gallery-card">
      <div class="gallery-photo two"><span>go slow</span></div>
      <figcaption>
        <div>
          <strong>Salt, sun & slow days</strong>
          <small>Trip memory</small>
        </div>
      </figcaption>
    </figure>
    <figure class="gallery-card">
      <div class="gallery-photo three"><span>good times</span></div>
      <figcaption>
        <div>
          <strong>Golden hour crew</strong>
          <small>Trip memory</small>
        </div>
      </figcaption>
    </figure>
  `;

  if (!photos.length) {
    gallery.innerHTML = defaultCards;
    return;
  }

  const uploadedCards = photos
    .map(
      (p) => `
    <figure class="gallery-card">
      <div class="gallery-photo">
        <img src="${p.data}" alt="${esc(p.caption || p.filename)}">
      </div>
      <figcaption>
        <div>
          <strong>${esc(p.caption || "Trip photo")}</strong>
          <small>By ${esc(p.uploader_name || "Friend")} · ${p.created_at ? p.created_at.slice(0, 10) : ""}</small>
        </div>
        <button class="btn-delete" data-photo-del="${p.id}" title="Delete photo">✕</button>
      </figcaption>
    </figure>`
    )
    .join("");

  gallery.innerHTML = uploadedCards + defaultCards;

  $$("[data-photo-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.photoDel;
      if (!confirm("Delete this photo from memories?")) return;
      try {
        await api(`/trips/${tripId}/photos/${id}`, { method: "DELETE" });
        showToast("Photo deleted");
        await load();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function renderGuideResults() {
  const results = $("#guideResults");
  if (!results) return;
  const location = ($("#guideLocation")?.value || "").trim();
  if (!guideRecommendations.length) {
    results.innerHTML = '<p class="muted guide-empty">Enter a location to get local recommendations.</p>';
    return;
  }

  const weatherLabel = (code) => {
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Weather update";
  };

  function renderExplorePlaces(places) {
    const container = $("#explorePlaces");
    if (!container) return;
    container.innerHTML =
      places
        .map(
          (place) => `
          <article class="explore-place panel">
            <div class="place-icon">${place.category === "food" ? "🍜" : place.category === "sight" ? "📍" : "✦"}</div>
            <div><span class="guide-label">${esc(place.label)}</span><h3>${esc(place.title)}</h3><p>${esc(place.description)}</p><a href="${esc(place.mapUrl)}" target="_blank" rel="noopener">Open in map ↗</a></div>
          </article>`
        )
        .join("") || '<div class="panel empty-state"><h2>No places found</h2><p>Try a nearby city or a broader destination.</p></div>';
  }

  function renderWeather(data) {
    const card = $("#weatherCard");
    if (!card) return;
    const current = data.weather.current;
    const daily = data.weather.daily;
    card.innerHTML = `<div class="weather-top"><div><span class="eyebrow">LIVE WEATHER</span><h2>${esc(data.location.name.split(",")[0])}</h2><p>${weatherLabel(current.weather_code)}</p></div><strong>${Math.round(current.temperature_2m)}°</strong></div><div class="weather-meta"><span>Feels like ${Math.round(current.apparent_temperature)}°</span><span>Rain chance ${daily.precipitation_probability_max?.[0] ?? "Not available"}%</span><span>Wind ${Math.round(current.wind_speed_10m)} km/h</span></div>`;
  }

  function updateMap(data, places) {
    if (!window.L || !$("#tripMap")) return;
    if (!tripMap) {
      tripMap = L.map("tripMap", { zoomControl: true }).setView([data.latitude, data.longitude], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(tripMap);
    } else {
      tripMap.setView([data.latitude, data.longitude], 13);
    }
    tripMapMarkers.forEach((marker) => marker.remove());
    tripMapMarkers = [L.marker([data.latitude, data.longitude]).addTo(tripMap).bindPopup(`<strong>${esc(data.location)}</strong>`)];
    places.forEach((place) => {
      if (!place.latitude || !place.longitude) return;
      tripMapMarkers.push(L.marker([place.latitude, place.longitude]).addTo(tripMap).bindPopup(`<strong>${esc(place.title)}</strong>`));
    });
    setTimeout(() => tripMap.invalidateSize(), 50);
  }

  $("#exploreForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = $("#exploreLocation").value.trim();
    const button = event.currentTarget.querySelector("button");
    try {
      button.disabled = true;
      button.textContent = "Loading...";
      const [places, weather] = await Promise.all([
        api(`/places?query=${encodeURIComponent(query)}&category=all`),
        api(`/weather?query=${encodeURIComponent(query)}`)
      ]);
      renderExplorePlaces(places.places);
      renderWeather(weather);
      updateMap({ ...places, ...weather.location }, places.places);
      showToast(`Live travel data loaded for ${query}`);
    } catch (err) {
      showToast(err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Search destination";
    }
  });

  function renderPlanner(plan) {
    const result = $("#plannerResult");
    if (!result) return;
    result.innerHTML = `<div class="planner-summary"><span class="eyebrow">YOUR PLAN</span><h2>${esc(plan.summary || "A practical trip plan")}</h2></div><div class="itinerary-days">${(plan.days || []).map((day) => `<article class="itinerary-day"><span class="day-number">DAY ${esc(day.day)}</span><h3>${esc(day.title)}</h3><p><strong>Morning</strong> ${esc(day.morning)}</p><p><strong>Afternoon</strong> ${esc(day.afternoon)}</p><p><strong>Evening</strong> ${esc(day.evening)}</p><small>Tip · ${esc(day.practicalTip)}</small></article>`).join("")}</div>`;
  }

  $("#plannerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      button.disabled = true;
      button.textContent = "Planning...";
      const response = await api("/ai/plan", { method: "POST", body: JSON.stringify(data) });
      renderPlanner(response.plan);
    } catch (err) {
      $("#plannerResult").innerHTML = `<div class="empty-state error-state"><span>!</span><h2>Planner unavailable</h2><p>${esc(err.message)}</p></div>`;
    } finally {
      button.disabled = false;
      button.textContent = "✦ Generate itinerary";
    }
  });
  results.innerHTML =
    guideRecommendations
      .map(
        (item) => `
        <article class="guide-card">
          <div class="guide-card-icon">${item.category === "food" ? "🍜" : item.category === "sight" ? "📍" : "✦"}</div>
          <div class="guide-card-body">
            <span class="guide-label">${esc(item.label)}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.description)}</p>
            ${item.address ? `<small class="guide-address">${esc(item.address)}</small>` : ""}
            <div class="guide-card-actions"><a class="secondary guide-map" href="${esc(item.mapUrl)}" target="_blank" rel="noopener">Open map</a><button class="secondary guide-share" type="button" data-guide-share="${guideRecommendations.indexOf(item)}">↗ Share</button></div>
          </div>
        </article>`
      )
      .join("") || `<p class="muted guide-empty">No ${activeGuideCategory === "all" ? "nearby places" : "places in this category"} found near ${esc(location)}.</p>`;
}

$("#guideForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const location = ($("#guideLocation")?.value || "").trim();
  if (!location) return;
  const button = event.currentTarget.querySelector("button[type=submit]");
  try {
    button.disabled = true;
    button.textContent = "Searching...";
    const category = activeGuideCategory;
    const data = await api(`/places?query=${encodeURIComponent(location)}&category=${category}`);
    guideRecommendations = data.places || [];
    renderGuideResults();
    showToast(`${guideRecommendations.length} real places found near ${location}`);
  } catch (err) {
    guideRecommendations = [];
    renderGuideResults();
    showToast(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "✦ Discover";
  }
});

$$(".guide-filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeGuideCategory = button.dataset.guideCategory || "all";
    $$(".guide-filter").forEach((item) => item.classList.toggle("active", item === button));
    if ($("#guideLocation")?.value.trim()) $("#guideForm")?.requestSubmit();
  });
});

$("#guideResults")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-guide-share]");
  if (!button) return;
  const item = guideRecommendations[Number(button.dataset.guideShare)];
  const location = ($("#guideLocation")?.value || "").trim();
  if (!item || !location) return;
  try {
    button.disabled = true;
    button.textContent = "Sharing...";
    await api(`/trips/${tripId}/photos`, {
      method: "POST",
      body: JSON.stringify({
        data: item.image || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#d9f3e4"/><text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="54" fill="#113b32">${item.category === "food" ? "Local food" : "TripMate place"}</text><text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="28" fill="#4d8c73">${item.title}</text></svg>`)}`,
        caption: `${item.title} · ${location}`,
        filename: `guide-${item.category}-${Date.now()}.jpg`,
        mimeType: "image/jpeg"
      })
    });
    showToast("Added to Trip Memories! ✦");
    await load();
  } catch (err) {
    alert("Failed to share recommendation: " + err.message);
  } finally {
    button.disabled = false;
    button.textContent = "↗ Share to memories";
  }
});

// Populate forms with dynamic member lists
function fillForms() {
  const options = members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");

  const expenseSelect = $("#expensePaidBySelect");
  if (expenseSelect) expenseSelect.innerHTML = options;

  const walletSelect = $("#walletMemberSelect");
  if (walletSelect) walletSelect.innerHTML = options;

  const splitList = $("#splitMembersList");
  if (splitList) {
    splitList.innerHTML = members
      .map(
        (m) => `
      <label class="split-member-item">
        <input type="checkbox" name="splitMembers" value="${m.id}" checked>
        <span>${esc(m.name)}</span>
      </label>`
      )
      .join("");
  }

  const dateInput = $("#expenseForm")?.querySelector("[name=date]");
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
}

// Main data loader
async function load() {
  try {
    // 1. Fetch user trips
    const tripsRes = await api("/trips").catch(() => null);
    if (tripsRes?.trips?.length) {
      userTrips = tripsRes.trips;
      if (!userTrips.some((t) => t.id === tripId)) {
        tripId = userTrips[0].id;
      }
    }

    // 2. Fetch trip details & summary in parallel
    const [tData, sumData] = await Promise.all([
      api(`/trips/${tripId}`),
      api(`/trips/${tripId}/summary`)
    ]);

    tripData = tData;
    summary = sumData;
    members = tripData.members;
    const guideLocation = $("#guideLocation");
    if (guideLocation && !guideLocation.value) {
      guideLocation.value = tripData.trip.destination || "";
    }

    // 3. Fetch expenses, wallet, photos
    const [expRes, walRes, phoRes] = await Promise.all([
      api(`/trips/${tripId}/expenses`),
      api(`/trips/${tripId}/wallet`),
      api(`/trips/${tripId}/photos`).catch(() => ({ photos: [] }))
    ]);

    expenses = expRes.expenses;
    wallet = walRes.entries;
    photos = phoRes.photos || [];

    // 4. Update header texts
    const switcherName = $(".trip-switcher strong");
    if (switcherName?.firstChild) {
      switcherName.firstChild.textContent = `${tripData.trip.name} `;
    }
    const switcherDates = $(".trip-switcher em");
    if (switcherDates) {
      switcherDates.textContent = `${tripData.trip.starts_on || "Jan 18"} — ${tripData.trip.ends_on || "Jan 22, 2025"}`;
    }
    const heroDestination = $("#tripHeroDestination");
    const heroMeta = $("#tripHeroMeta");
    const heroLocation = $("#tripHeroLocation");
    const nextStopWidget = $("#nextStopWidget");
    if (heroDestination) heroDestination.innerHTML = `${esc(tripData.trip.destination || tripData.trip.name)} <span>✦</span>`;
    if (heroMeta) heroMeta.textContent = `${esc(tripData.trip.name)} · Plan the good stuff. Split the costs. Keep the memories.`;
    if (heroLocation) heroLocation.textContent = tripData.trip.destination || "Your destination";
    if (nextStopWidget) nextStopWidget.textContent = tripData.trip.destination || "Your destination";

    const greetingName = currentUser?.name ? currentUser.name.split(" ")[0] : members[0]?.name.split(" ")[0] || "Friend";
    const overviewH1 = $("#overview h1");
    if (overviewH1) {
      overviewH1.innerHTML = `Good morning, ${esc(greetingName)} <span>✦</span>`;
    }

    fillForms();
    render();
  } catch (err) {
    console.error("Failed to load trip data:", err);
  }
}

// Export CSV handler
function exportCsv() {
  const rows = [
    ["Description", "Paid by", "Category", "Date", "Amount (INR)", "Notes"],
    ...expenses.map((e) => [
      e.description,
      e.paid_by_name,
      e.category,
      e.spent_on,
      (e.amount_paise / 100).toFixed(2),
      e.notes || ""
    ])
  ];
  const csvContent = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
  a.download = `tripmate-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast("CSV export downloaded");
}

// Navigation and buttons
$$("[data-view]").forEach((x) =>
  x.addEventListener("click", (e) => {
    e.preventDefault();
    showView(x.dataset.view);
  })
);

$("#menuButton")?.addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#exportCsv")?.addEventListener("click", exportCsv);
$("#exportCsv2")?.addEventListener("click", exportCsv);

// Tabs for expenses table
$$(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentExpenseTab = btn.dataset.tab || "all";
    renderExpensesTable();
  });
});

// Dialog openers
$$("[data-action=expense]").forEach((x) =>
  x.addEventListener("click", () => {
    $("#expenseForm")?.reset();
    const idInput = $("#expenseIdInput");
    if (idInput) idInput.value = "";
    const titleEl = $("#expenseDialogTitle");
    const eyebrowEl = $("#expenseDialogEyebrow");
    const submitBtn = $("#expenseSubmitBtn");
    if (titleEl) titleEl.textContent = "Add expense";
    if (eyebrowEl) eyebrowEl.textContent = "NEW RECORD";
    if (submitBtn) submitBtn.textContent = "Save expense";
    const dateInput = $("#expenseDateInput");
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    $$("#splitMembersList input[name=splitMembers]").forEach((cb) => (cb.checked = true));
    $("#expenseDialog")?.showModal();
  })
);
$("#closeExpense")?.addEventListener("click", () => $("#expenseDialog")?.close());

$$("[data-action=contribution]").forEach((x) =>
  x.addEventListener("click", () => $("#moneyDialog")?.showModal())
);
$("#closeMoney")?.addEventListener("click", () => $("#moneyDialog")?.close());

// Expense form submit (Handles both POST and PATCH)
$("#expenseForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const editId = formData.get("id");
  const description = String(formData.get("description") || "").trim();
  const totalAmount = Number(formData.get("amount"));
  const paidBy = Number(formData.get("paidBy"));
  const category = String(formData.get("category") || "Other");
  const dateVal = String(formData.get("date") || "");
  const notes = String(formData.get("notes") || "").trim();

  // Get members selected for split
  const selectedMembers = $$("#splitMembersList input[name=splitMembers]:checked").map((cb) =>
    Number(cb.value)
  );

  if (!selectedMembers.length) {
    alert("Please select at least one member to share this expense.");
    return;
  }

  // Equal splits among selected members
  const splits = selectedMembers.map((uid) => ({
    userId: uid,
    share: Number((totalAmount / selectedMembers.length).toFixed(2))
  }));

  // Ensure exact sum match due to float rounding
  const diff = totalAmount - splits.reduce((acc, s) => acc + s.share, 0);
  if (splits.length) splits[0].share = Number((splits[0].share + diff).toFixed(2));

  try {
    if (editId) {
      await api(`/trips/${tripId}/expenses/${editId}`, {
        method: "PATCH",
        body: JSON.stringify({
          description,
          amount: totalAmount,
          paidBy,
          category,
          date: dateVal,
          notes,
          splits
        })
      });
      showToast("Expense updated successfully!");
    } else {
      await api(`/trips/${tripId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description,
          amount: totalAmount,
          paidBy,
          category,
          date: dateVal,
          notes,
          splits
        })
      });
      showToast("Expense recorded successfully!");
    }
    e.currentTarget.reset();
    $("#expenseDialog")?.close();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

// Wallet form submit
$("#moneyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const data = Object.fromEntries(formData);
  const memberId = Number(data.member);

  try {
    await api(`/trips/${tripId}/wallet`, {
      method: "POST",
      body: JSON.stringify({
        type: data.type,
        amount: Number(data.amount),
        memberId,
        note: data.note
      })
    });
    e.currentTarget.reset();
    $("#moneyDialog")?.close();
    showToast("Wallet transaction recorded!");
    await load();
  } catch (err) {
    alert(err.message);
  }
});

// Invite Friend Handlers
const openInvite = () => $("#inviteDialog")?.showModal();
$("#inviteBtn")?.addEventListener("click", openInvite);
$("#quickAddMemberBtn")?.addEventListener("click", openInvite);
$("#closeInvite")?.addEventListener("click", () => $("#inviteDialog")?.close());

$("#inviteForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
  try {
    await api(`/trips/${tripId}/members`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    e.currentTarget.reset();
    $("#inviteDialog")?.close();
    showToast(`Added ${data.name} to the trip!`);
    await load();
  } catch (err) {
    alert("Failed to invite member: " + err.message);
  }
});

// Trip Switcher & Create Trip Dialog
function renderUserTrips() {
  const list = $("#userTripsList");
  if (!list) return;
  list.innerHTML = userTrips
    .map(
      (t) => `
    <div class="user-trip-item ${t.id === tripId ? "active" : ""}" data-trip-switch="${t.id}">
      <div>
        <strong>${esc(t.name)} ${t.id === tripId ? "✦ Active" : ""}</strong>
        <small>${esc(t.destination)} · ${t.role === "treasurer" ? "Treasurer" : "Member"}</small>
      </div>
      <span style="font-size:11px;color:var(--muted);">${t.starts_on || ""}</span>
    </div>`
    )
    .join("");

  $$("[data-trip-switch]").forEach((item) => {
    item.addEventListener("click", async () => {
      const newId = Number(item.dataset.tripSwitch);
      if (newId !== tripId) {
        tripId = newId;
        $("#tripDialog")?.close();
        showToast("Switched trip");
        await load();
      }
    });
  });
}

$("#tripSwitcherBtn")?.addEventListener("click", () => {
  renderUserTrips();
  $("#tripDialog")?.showModal();
});
$("#closeTripModal")?.addEventListener("click", () => $("#tripDialog")?.close());

$("#createTripForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
  try {
    const res = await api("/trips", {
      method: "POST",
      body: JSON.stringify(data)
    });
    tripId = res.trip.id;
    e.currentTarget.reset();
    $("#tripDialog")?.close();
    showToast(`Trip "${res.trip.name}" created!`);
    await load();
  } catch (err) {
    alert("Failed to create trip: " + err.message);
  }
});

// Auth tabs & handlers
$("#authTabLogin")?.addEventListener("click", () => {
  $("#authTabLogin")?.classList.add("active");
  $("#authTabRegister")?.classList.remove("active");
  if ($("#loginForm")) $("#loginForm").hidden = false;
  if ($("#registerForm")) $("#registerForm").hidden = true;
  const errEl = $("#loginError");
  if (errEl) errEl.textContent = "";
});

$("#authTabRegister")?.addEventListener("click", () => {
  $("#authTabRegister")?.classList.add("active");
  $("#authTabLogin")?.classList.remove("active");
  if ($("#registerForm")) $("#registerForm").hidden = false;
  if ($("#loginForm")) $("#loginForm").hidden = true;
  const errEl = $("#loginError");
  if (errEl) errEl.textContent = "";
});

$("#logout")?.addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  location.reload();
});

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    });
    currentUser = result.user;
    $("#auth").hidden = true;
    $(".app-shell").hidden = false;
    showToast(`Welcome back, ${currentUser.name}!`);
    await load();
  } catch (err) {
    const errEl = $("#loginError");
    if (errEl) errEl.textContent = err.message;
  }
});

$("#registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
    // Auto-login after registration
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: data.email, password: data.password })
    });
    currentUser = result.user;
    $("#auth").hidden = true;
    $(".app-shell").hidden = false;
    showToast(`Welcome to TripMate, ${currentUser.name}!`);
    await load();
  } catch (err) {
    const errEl = $("#loginError");
    if (errEl) errEl.textContent = err.message;
  }
});

$("#profileButton")?.addEventListener("click", () => $("#profileDialog")?.showModal());
$("#closeProfile")?.addEventListener("click", () => $("#profileDialog")?.close());
$("#profileLogout")?.addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  location.reload();
});

// -------------------------------------------------------------
// Photo Studio Logic
// -------------------------------------------------------------
const presets = {
  Original: "none",
  Warm: "sepia(.25) saturate(1.2)",
  Vintage: "sepia(.55) contrast(1.1)",
  Film: "contrast(1.2) saturate(.8)",
  Moody: "brightness(.8) contrast(1.25) saturate(.8)",
  Soft: "brightness(1.1) saturate(.75)",
  "Golden hour": "sepia(.3) saturate(1.5) brightness(1.05)",
  "B&W": "grayscale(1)"
};

const adjustments = { brightness: 100, contrast: 100, saturation: 100 };
let currentPhotoImg = null;
let rotation = 0;
let activePreset = "Original";

$("#presets").innerHTML = Object.keys(presets)
  .map(
    (n, i) =>
      `<button class="preset ${i ? "" : "active"}" data-preset="${n}" style="filter:${presets[n]}"><span>${n}</span></button>`
  )
  .join("");

$("#sliders").innerHTML = Object.keys(adjustments)
  .map(
    (n) => `
  <div class="slider">
    <label>${n.toUpperCase()} <output id="${n}Value">100</output></label>
    <input type="range" min="0" max="200" value="100" data-adjustment="${n}">
  </div>`
  )
  .join("");

function applyPhoto() {
  if (!currentPhotoImg) return;
  const canvas = $("#photoCanvas");
  const ctx = canvas.getContext("2d");

  const scale = Math.min(900 / currentPhotoImg.width, 600 / currentPhotoImg.height, 1);
  const w = currentPhotoImg.width * scale;
  const h = currentPhotoImg.height * scale;

  canvas.width = rotation % 180 ? h : w;
  canvas.height = rotation % 180 ? w : h;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.filter = `${presets[activePreset]} brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
  ctx.drawImage(currentPhotoImg, -w / 2, -h / 2, w, h);
  ctx.restore();

  canvas.style.display = "block";
  $("#canvasEmpty").style.display = "none";
}

function loadPhoto(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentPhotoImg = new Image();
    currentPhotoImg.onload = applyPhoto;
    currentPhotoImg.src = reader.result;
  };
  reader.readAsDataURL(file);
}

$("#photoInput")?.addEventListener("change", (e) => loadPhoto(e.target.files[0]));
$("#photoInputAlt")?.addEventListener("change", (e) => loadPhoto(e.target.files[0]));

$("#presets")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-preset]");
  if (!btn) return;
  activePreset = btn.dataset.preset;
  $$(".preset").forEach((x) => x.classList.toggle("active", x === btn));
  applyPhoto();
});

$("#sliders")?.addEventListener("input", (e) => {
  const name = e.target.dataset.adjustment;
  if (!name) return;
  adjustments[name] = e.target.value;
  const out = $("#" + name + "Value");
  if (out) out.textContent = e.target.value;
  applyPhoto();
});

$("#rotatePhoto")?.addEventListener("click", () => {
  rotation = (rotation + 90) % 360;
  applyPhoto();
});

$("#resetPhoto")?.addEventListener("click", () => {
  activePreset = "Original";
  rotation = 0;
  Object.keys(adjustments).forEach((n) => {
    adjustments[n] = 100;
    const input = $(`[data-adjustment=${n}]`);
    if (input) input.value = 100;
    const out = $("#" + n + "Value");
    if (out) out.textContent = 100;
  });
  $$(".preset").forEach((x, i) => x.classList.toggle("active", i === 0));
  applyPhoto();
});

$("#downloadPhoto")?.addEventListener("click", () => {
  if (!currentPhotoImg) {
    alert("Please upload an image first.");
    return;
  }
  const a = document.createElement("a");
  a.download = `tripmate-photo-${Date.now()}.jpg`;
  a.href = $("#photoCanvas").toDataURL("image/jpeg", 0.92);
  a.click();
  showToast("Photo saved to your device!");
});

// Save edited canvas photo to Trip Memories
$("#saveMemoryButton")?.addEventListener("click", async () => {
  if (!currentPhotoImg) {
    alert("Please upload or edit a photo first!");
    return;
  }
  const canvas = $("#photoCanvas");
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  const captionInput = $("#photoCaption");
  const caption = (captionInput?.value || "").trim() || "Trip memory";

  try {
    $("#saveMemoryButton").disabled = true;
    $("#saveMemoryButton").textContent = "Saving...";
    await api(`/trips/${tripId}/photos`, {
      method: "POST",
      body: JSON.stringify({
        data: dataUrl,
        caption,
        filename: `trip_${Date.now()}.jpg`
      })
    });
    if (captionInput) captionInput.value = "";
    showToast("Added to Trip Memories! ✦");
    await load();
    showView("memories");
  } catch (err) {
    alert("Failed to save memory: " + err.message);
  } finally {
    $("#saveMemoryButton").disabled = false;
    $("#saveMemoryButton").textContent = "✦ Add to memory";
  }
});

// Interactive 3D tilt effects on cards
document.addEventListener("pointermove", (e) => {
  const card = e.target.closest(".stat-card,.wallet-hero");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  card.style.transform = `perspective(700px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) translateY(-7px)`;
});

document.addEventListener("pointerout", (e) => {
  const card = e.target.closest(".stat-card,.wallet-hero");
  if (card && !card.contains(e.relatedTarget)) {
    card.style.transform = "";
  }
});

// Ripple click animation
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const ripple = document.createElement("i");
  ripple.className = "click-ripple";
  const r = btn.getBoundingClientRect();
  ripple.style.left = `${e.clientX - r.left}px`;
  ripple.style.top = `${e.clientY - r.top}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
});

// Initial boot check
$(".app-shell").hidden = true;
api("/me")
  .then((x) => {
    if (x.user) {
      currentUser = x.user;
      $("#auth").hidden = true;
      $(".app-shell").hidden = false;
      load();
    }
  })
  .catch(() => {});
