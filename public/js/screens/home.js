// Écran d'accueil : liste des places + alertes + filtre date/heure.

async function loadHomeData() {
  const profile = Storage.getProfile();
  const atDatetime = state.filterDatetime ? formatForApi(state.filterDatetime) : null;
  const [spotsData, alertsData] = await Promise.all([
    Backend.listSpots(profile?.number ?? null, atDatetime),
    Backend.getAlerts(),
  ]);
  state.spots = spotsData.spots;
  state.alerts = alertsData.alerts;
  await Notifications.processNewAlerts(alertsData.alerts);
}

function alertHtml(alert) {
  return `
    <div class="bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-4 py-3.5 mb-3 flex justify-between items-start gap-3">
      <div class="flex items-start gap-2.5">
        ${icon("bell-ring", "w-5 h-5 text-amber-600 shrink-0 mt-0.5")}
        <p class="text-sm text-amber-900 font-medium">${escapeHtml(alert.message)}</p>
      </div>
      <button data-dismiss="${alert.id}" class="shrink-0 text-amber-500 hover:text-amber-700 p-1 -m-1 active:scale-90 transition">${icon("x", "w-4 h-4")}</button>
    </div>
  `;
}

function notificationBannerHtml() {
  if (
    !Notifications.supported()
    || Notifications.isEnabled()
    || Notifications.permission === "denied"
  ) return "";

  return `<div class="mb-3 bg-white ring-1 ring-amber-200 rounded-2xl p-4 shadow-soft">
      <div class="flex items-start gap-3 mb-3">
        ${icon("bell-ring", "w-5 h-5 text-amber-500 shrink-0 mt-0.5")}
        <div>
          <p class="font-semibold text-slate-800 text-sm">Alertes retour anticipé</p>
          <p class="text-xs text-slate-400 mt-0.5">Recevez une notification si un propriétaire revient avant la fin de son déplacement.</p>
        </div>
      </div>
      ${notificationEnableHtml("home-enable-notifs")}
    </div>`;
}

function spotPhoneHtml(spot, isMine) {
  if (isMine) return spotContactPhoneHtml(spot);
  if (spot.status !== "occupied" && spot.phone) {
    return `<a href="${phoneTelHref(spot.phone)}" class="mt-2 inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`;
  }
  return "";
}

function spotActionHtml(spot) {
  if (spot.status === "available") {
    return `<button data-park="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("car", "w-4 h-4")}<span>Je me gare ici</span></button>`;
  }
  if (spot.status === "occupied") {
    return `<button data-unpark="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("log-out", "w-4 h-4")}<span>Libérer la place</span></button>`;
  }
  return "";
}

function spotCardHtml(spot, profile) {
  const isMine = profile && spot.number === profile.number;
  const occupationHtml =
    spot.status === "occupied" && spot.occupation_message
      ? `<p class="text-sm text-slate-500 flex items-center gap-2 mt-3">${icon("user", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.occupation_message)}</span></p>`
      : "";
  const action = spotActionHtml(spot);
  const detailBtn = `<button data-spot-detail="${spot.number}" class="mt-3 w-full inline-flex items-center justify-center gap-2 bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl py-2.5 ring-1 ring-slate-200 active:scale-[0.98] transition">${icon("info", "w-4 h-4")}<span>Voir plus d'info</span></button>`;

  return `
    <div class="${CARD} mb-3 ${isMine ? "ring-2 ring-brand-400" : ""} ${spot.status === "off_hours" ? "opacity-80" : ""}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-slate-50 ring-1 ring-slate-900/5 relative">
            <span class="text-lg font-extrabold text-slate-800">${escapeHtml(spot.number)}</span>
            <span class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${STATUS_DOT[spot.status] || STATUS_DOT.off_hours}"></span>
          </span>
          <div class="min-w-0">
            <p class="font-bold text-slate-900 flex items-center gap-1.5">Place ${escapeHtml(spot.number)} ${isMine ? icon("star", "w-4 h-4 text-brand-500 fill-brand-500") : ""}</p>
            ${spotPhoneHtml(spot, isMine)}
          </div>
        </div>
        ${statusPill(spot.status, spot.status_label)}
      </div>
      ${spotMetaHtml(spot)}
      ${occupationHtml}
      ${detailBtn}
      ${action ? `<div class="mt-2">${action}</div>` : ""}
    </div>
  `;
}

function homeSummaryHtml(allSpots, available) {
  if (allSpots.length === 0) return "";
  const summaryText = available === 0
    ? `Aucune place disponible · ${allSpots.length} enregistrée${allSpots.length > 1 ? "s" : ""}`
    : `<span class="font-bold text-slate-800">${available}</span> place${available > 1 ? "s" : ""} dispo${available > 1 ? "s" : ""} sur ${allSpots.length}`;

  return `<div class="flex items-center justify-between mb-4 px-1">
      <p class="text-sm text-slate-500">${summaryText}</p>
      <button id="refresh-btn" class="inline-flex items-center gap-1.5 text-sm text-brand-600 font-semibold active:scale-95 transition">${icon("refresh-cw", "w-4 h-4")}<span>Actualiser</span></button>
    </div>`;
}

function homeEmptyHtml() {
  return `<div class="text-center py-16">
      <div class="grid place-items-center w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 mb-4">${icon("parking-square", "w-8 h-8")}</div>
      <p class="text-slate-500 font-medium">Aucune place enregistrée</p>
      <p class="text-slate-400 text-sm mt-1">Les places apparaissent ici une fois configurées.</p>
    </div>`;
}

function renderHomeScreen() {
  const profile = Storage.getProfile();
  const allSpots = state.spots;
  const available = allSpots.filter((s) => s.status === "available").length;

  const alertsHtml = state.alerts.map(alertHtml).join("");
  const spotsHtml = allSpots.length === 0
    ? homeEmptyHtml()
    : allSpots.map((spot) => spotCardHtml(spot, profile)).join("");

  renderShell({
    title: "Places de parking",
    subtitle: "Votre résidence",
    appLogo: true,
    showLogout: true,
    content: `${alertsHtml}${notificationBannerHtml()}${filterBarHtml()}${homeSummaryHtml(allSpots, available)}<div id="spots-list">${spotsHtml}</div>`,
    footer: appFooter({ activeTab: "home" }),
  });

  bindHomeScreenActions(profile, allSpots);
}

function bindHomeScreenActions(profile, allSpots) {
  bindFilterBar();

  document.querySelectorAll("[data-spot-detail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = btn.dataset.spotDetail;
      state.selectedSpot = allSpots.find((s) => s.number === number) || null;
      state.screen = "spot-detail";
      render();
    });
  });

  document.querySelectorAll("[data-park]").forEach((btn) => {
    btn.addEventListener("click", (e) => onParkClick(e, btn, allSpots));
  });

  document.querySelectorAll("[data-unpark]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      setButtonLoading(btn, true);
      try {
        await Backend.unpark(btn.dataset.unpark);
        await loadHomeData();
        renderHomeScreen();
      } catch (err) {
        showError(err.message);
      }
    });
  });

  document.querySelectorAll("[data-dismiss]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await Backend.dismissAlert(btn.dataset.dismiss);
        await loadHomeData();
        renderHomeScreen();
      } catch (err) {
        showError(err.message);
      }
    });
  });

  document.getElementById("refresh-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("refresh-btn");
    setButtonLoading(btn, true);
    try {
      await loadHomeData();
      renderHomeScreen();
    } catch (err) {
      showError(err.message);
    }
  });

  bindTabBar();
  bindNotificationEnableButton("home-enable-notifs", () => renderHomeScreen());
}

async function onParkClick(e, btn, allSpots) {
  e.stopPropagation();
  const profile = Storage.getProfile();
  if (!profile) {
    showError("Profil requis pour se garer.");
    return;
  }
  const number = btn.dataset.park;
  const spot = allSpots.find((s) => s.number === number) || null;
  const myPhone =
    state.mySpot?.phone
    || allSpots.find((s) => s.number === profile.number)?.phone
    || "";
  showParkConfirmDialog(spot || { number }, myPhone, async (phone) => {
    setButtonLoading(btn, true);
    try {
      await Backend.park(number, profile.number, phone);
      await loadHomeData();
      renderHomeScreen();
    } catch (err) {
      showError(err.message);
      throw err;
    }
  });
}
