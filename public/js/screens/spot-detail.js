// Écran de détail d'une place (clic depuis l'accueil).

function spotDetailScheduleRowsHtml(spot) {
  if (!spot.schedules?.length) {
    return `<p class="text-sm text-slate-400 py-3 text-center flex items-center justify-center gap-2">${icon("calendar-off", "w-4 h-4")} Aucun horaire récurrent</p>`;
  }

  return spot.schedules
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((s) => {
      const day = DAYS.find((d) => d.id === s.day_of_week);
      return `
        <div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
          <span class="text-sm font-semibold text-slate-700">${day?.label || "?"}</span>
          <span class="text-sm text-slate-500 font-medium">${s.start_time} – ${s.end_time}</span>
        </div>
      `;
    })
    .join("");
}

function spotDetailTripSectionHtml(spot) {
  if (spot.upcoming_trips?.length > 0) {
    return `
      <div class="${CARD}">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Déplacements à venir</p>
        <div class="space-y-2">
          ${spot.upcoming_trips
            .map(
              (t) => `
            <div class="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
              ${icon("plane", "w-4 h-4 text-brand-500 shrink-0 mt-0.5")}
              <div>
                <p class="text-sm text-slate-700">Du <strong>${formatDateTime(t.depart_at)}</strong></p>
                <p class="text-xs text-slate-400">au ${formatDateTime(t.return_at)}</p>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (spot.trip_line) {
    return `
      <div class="${CARD}">
        <div class="flex items-start gap-2">
          ${icon("plane", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}
          <p class="text-sm text-brand-700 font-medium">${escapeHtml(spot.trip_line)}</p>
        </div>
      </div>
    `;
  }

  return "";
}

function spotDetailHintHtml(spot) {
  if (!spot.availability_hint) return "";
  const color =
    spot.status === "available"
      ? "text-emerald-700"
      : spot.status === "occupied"
        ? "text-amber-700"
        : "text-slate-400";
  return `<div class="text-sm flex items-start gap-2 ${color} bg-slate-50 rounded-xl px-3 py-2.5">
      ${icon("info", "w-4 h-4 shrink-0 mt-0.5")}
      <span>${escapeHtml(spot.availability_hint)}</span>
    </div>`;
}

function renderSpotDetailScreen() {
  const spot = state.selectedSpot;
  if (!spot) {
    state.screen = "home";
    render();
    return;
  }

  renderShell({
    title: `Place ${spot.number}`,
    subtitle: spot.status_label || "",
    icon: "parking-square",
    back: () => {
      state.screen = "home";
      render();
    },
    showLogout: true,
    content: `
      <div class="space-y-3">
        <div class="${CARD}">
          <div class="flex items-center justify-between mb-3">
            <span class="text-2xl font-extrabold text-slate-900">Place ${escapeHtml(spot.number)}</span>
            ${statusPill(spot.status, spot.status_label)}
          </div>
          ${spotDetailHintHtml(spot)}
          ${spotContactPhoneHtml(spot, { className: "mt-3" })}
        </div>

        <div class="${CARD}">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Disponibilités habituelles</p>
          <div class="divide-y divide-slate-100">
            ${spotDetailScheduleRowsHtml(spot)}
          </div>
        </div>

        ${spotDetailTripSectionHtml(spot)}
      </div>
    `,
  });
}
