// Barre de filtre date/heure de l'accueil + presets (maintenant, ce soir, etc.).

function getFilterPresetDatetime(preset) {
  const now = new Date();
  const d = new Date(now);
  switch (preset) {
    case "now":
      return "";
    case "tonight":
      d.setHours(19, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return toDatetimeLocal(d);
    case "tomorrow_am":
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return toDatetimeLocal(d);
    case "tomorrow_pm":
      d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      return toDatetimeLocal(d);
    default:
      return null;
  }
}

function detectFilterPreset(datetime) {
  if (!datetime) return "now";
  for (const preset of ["tonight", "tomorrow_am", "tomorrow_pm"]) {
    if (getFilterPresetDatetime(preset) === datetime) return preset;
  }
  return "custom";
}

function splitFilterDatetime(datetime) {
  if (!datetime) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const local = toDatetimeLocal(d);
    return { date: local.slice(0, 10), time: local.slice(11, 16) };
  }
  return { date: datetime.slice(0, 10), time: datetime.slice(11, 16) };
}

function joinFilterDatetime(date, time) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function filterChipsHtml(activePreset) {
  return FILTER_PRESETS.map((preset) => {
    const active = activePreset === preset.id;
    return `<button type="button" data-filter-preset="${preset.id}" class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition active:scale-95 ${
      active
        ? "bg-brand-600 text-white shadow-glow ring-2 ring-brand-400/30"
        : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
    }">${icon(preset.icon, "w-3.5 h-3.5")}<span>${preset.label}</span></button>`;
  }).join("");
}

function filterCustomPanelHtml(filterDate, filterTime) {
  return `<div class="mt-3 pt-3 border-t border-slate-100">
      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">${icon("calendar", "w-3 h-3")}<span>Date</span></span>
          <input type="date" id="filter-date" value="${escapeHtml(filterDate)}"
            class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">${icon("clock", "w-3 h-3")}<span>Heure</span></span>
          <input type="time" id="filter-time" value="${escapeHtml(filterTime)}"
            class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </label>
      </div>
    </div>`;
}

function filterBarHtml() {
  const activePreset =
    state.filterPreset || detectFilterPreset(state.filterDatetime);
  const { date: filterDate, time: filterTime } = splitFilterDatetime(
    state.filterDatetime,
  );
  const hasActiveFilter = activePreset !== "now";

  const customPanel =
    activePreset === "custom"
      ? filterCustomPanelHtml(filterDate, filterTime)
      : "";

  const summary =
    hasActiveFilter && state.filterDatetime
      ? `<div class="mt-3 flex items-center gap-2 bg-brand-50 ring-1 ring-brand-100 rounded-xl px-3 py-2.5">
        ${icon("clock", "w-4 h-4 text-brand-600 shrink-0")}
        <p class="text-xs font-medium text-brand-800 flex-1">Disponibilités au <span class="font-bold">${escapeHtml(formatDateTime(state.filterDatetime.replace("T", " ")))}</span></p>
      </div>`
      : `<p class="mt-3 text-xs text-slate-400 flex items-center gap-1.5">${icon("info", "w-3.5 h-3.5")}<span>Affichage en temps réel — choisissez un créneau pour anticiper</span></p>`;

  return `
    <div class="mb-4 bg-white ring-1 ring-slate-200 rounded-2xl p-4 shadow-soft">
      <div class="flex items-center justify-between gap-2 mb-3">
        <p class="text-sm font-semibold text-slate-800 flex items-center gap-2">${icon("calendar-range", "w-4 h-4 text-brand-500")}<span>Quand cherchez-vous une place ?</span></p>
        ${hasActiveFilter ? `<button type="button" id="filter-clear" class="shrink-0 inline-flex items-center gap-1 text-xs text-slate-500 font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg px-2.5 py-1.5 transition active:scale-95">${icon("x", "w-3 h-3")}<span>Réinitialiser</span></button>` : ""}
      </div>
      <div class="filter-chips-scroll flex gap-2 overflow-x-auto py-3 px-1 snap-x snap-mandatory">${filterChipsHtml(activePreset)}</div>
      ${customPanel}
      ${summary}
    </div>`;
}

async function applyFilterAndReload() {
  const btn = document.getElementById("refresh-btn");
  setButtonLoading(btn, true);
  try {
    await loadHomeData();
    renderHomeScreen();
  } catch (err) {
    showError(err.message);
    renderHomeScreen();
  }
}

function bindFilterBar() {
  document.querySelectorAll("[data-filter-preset]").forEach((btn) => {
    btn.onclick = async () => {
      const preset = btn.dataset.filterPreset;
      state.filterPreset = preset;

      if (preset === "custom") {
        if (
          !state.filterDatetime ||
          detectFilterPreset(state.filterDatetime) !== "custom"
        ) {
          state.filterDatetime =
            getFilterPresetDatetime("tomorrow_am") ||
            toDatetimeLocal(new Date());
        }
        renderHomeScreen();
        return;
      }

      state.filterDatetime = getFilterPresetDatetime(preset);
      await applyFilterAndReload();
    };
  });

  document
    .getElementById("filter-clear")
    ?.addEventListener("click", async () => {
      state.filterPreset = "now";
      state.filterDatetime = "";
      await applyFilterAndReload();
    });

  const onCustomChange = async () => {
    const date = document.getElementById("filter-date")?.value;
    const time = document.getElementById("filter-time")?.value;
    state.filterDatetime = joinFilterDatetime(date, time);
    state.filterPreset = "custom";
    if (state.filterDatetime) await applyFilterAndReload();
  };

  document
    .getElementById("filter-date")
    ?.addEventListener("change", onCustomChange);
  document
    .getElementById("filter-time")
    ?.addEventListener("change", onCustomChange);
}
