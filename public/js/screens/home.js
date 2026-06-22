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

function myParkingSpots(allSpots) {
  return allSpots.filter((s) => s.parked_by_me === true);
}

function myParkingBannerHtml(spots) {
  if (!spots.length) return "";

  return spots
    .map(
      (spot) => `
    <div class="${CARD} bg-emerald-50 ring-2 ring-emerald-400 mb-3 shadow-soft">
      <div class="flex items-center gap-4">
        <span class="grid place-items-center w-16 h-16 shrink-0 rounded-2xl bg-emerald-100 ring-1 ring-emerald-200 text-emerald-800 font-extrabold text-2xl">${escapeHtml(spot.number)}</span>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-emerald-900 flex items-center gap-2">${icon("car", "w-5 h-5 shrink-0")}<span>Vous êtes garé ici</span></p>
          <p class="text-sm text-emerald-700 mt-0.5">Place ${escapeHtml(spot.number)} · profil ${escapeHtml(Storage.getProfile()?.number || "")}</p>
          ${spot.availability_hint ? `<p class="text-xs text-emerald-600 mt-1.5 flex items-start gap-1.5">${icon("info", "w-3.5 h-3.5 shrink-0 mt-0.5")}<span>${escapeHtml(spot.availability_hint)}</span></p>` : ""}
        </div>
      </div>
      <button data-unpark="${spot.number}" class="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-700 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("log-out", "w-4 h-4")}<span>Libérer la place</span></button>
    </div>`,
    )
    .join("");
}

function spotPhoneHtml(spot, isMine) {
  if (isMine && spot.status === "occupied" && spot.parked_contact_phone) {
    return spotContactPhoneHtml(spot, { ownerContext: true });
  }
  if (isMine) return spotContactPhoneHtml(spot);
  if (spot.status !== "occupied" && spot.phone) {
    return `<a href="${phoneTelHref(spot.phone)}" class="mt-2 inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`;
  }
  return "";
}

function spotActionHtml(spot, { isOwned = false } = {}) {
  if (spot.status === "available") {
    if (isOwned) return "";
    return `<button data-park="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("car", "w-4 h-4")}<span>Je me gare ici</span></button>`;
  }
  if (spot.status === "occupied") {
    return `<button data-unpark="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("log-out", "w-4 h-4")}<span>Libérer la place</span></button>`;
  }
  return "";
}

function ownedSpotBadgesHtml({ isOwned, isActiveProfile, showMultiOwnedUi }) {
  if (!isOwned) return "";

  if (showMultiOwnedUi) {
    return `<div class="flex flex-wrap items-center gap-1.5 mt-1">
      <span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 bg-brand-50 ring-1 ring-brand-200 rounded-full px-2 py-0.5">${icon("star", "w-3 h-3 fill-brand-500 text-brand-500")}<span>Ma place</span></span>
      ${isActiveProfile ? `<span class="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 ring-1 ring-slate-200 rounded-full px-2 py-0.5">Profil actif</span>` : ""}
    </div>`;
  }

  if (isActiveProfile) {
    return "";
  }
  return "";
}

function spotCardHtml(spot, profile, { showMultiOwnedUi = false } = {}) {
  const isOwned = isOwnedSpot(spot.number);
  const isActiveProfile = profile && spot.number === profile.number;
  const isMyParking = spot.parked_by_me === true;
  const occupationHtml =
    spot.status === "occupied" && spot.occupation_message && !isMyParking
      ? `<p class="text-sm text-slate-500 flex items-center gap-2 mt-3">${icon("user", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.occupation_message)}</span></p>`
      : isMyParking
        ? `<p class="text-sm text-emerald-700 font-medium flex items-center gap-2 mt-3">${icon("car", "w-4 h-4 shrink-0")}<span>Votre voiture est sur cette place</span></p>`
        : "";
  const action = spotActionHtml(spot, { isOwned });
  const detailBtn = `<button data-spot-detail="${spot.number}" class="mt-3 w-full inline-flex items-center justify-center gap-2 bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl py-2.5 ring-1 ring-slate-200 active:scale-[0.98] transition">${icon("info", "w-4 h-4")}<span>Voir plus d'info</span></button>`;
  const cardHighlight = isMyParking
    ? "ring-2 ring-emerald-400 bg-emerald-50/40"
    : isOwned
      ? "ring-2 ring-brand-400 bg-brand-50/30"
      : "";
  const starIcon =
    isActiveProfile && !showMultiOwnedUi
      ? icon("star", "w-4 h-4 text-brand-500 fill-brand-500")
      : "";
  const myParkingBadge = isMyParking
    ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 ring-1 ring-emerald-200 rounded-full px-2 py-0.5 mt-1">${icon("car", "w-3 h-3")}<span>Ma voiture</span></span>`
    : "";

  return `
    <div class="${CARD} mb-3 ${cardHighlight} ${spot.status === "off_hours" ? "opacity-80" : ""}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="grid place-items-center w-12 h-12 shrink-0 rounded-2xl ${isMyParking ? "bg-emerald-100 ring-1 ring-emerald-200" : isOwned ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50 ring-1 ring-slate-900/5"} relative">
            <span class="text-lg font-extrabold ${isMyParking ? "text-emerald-800" : isOwned ? "text-brand-700" : "text-slate-800"}">${escapeHtml(spot.number)}</span>
            <span class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${STATUS_DOT[spot.status] || STATUS_DOT.off_hours}"></span>
          </span>
          <div class="min-w-0">
            <p class="font-bold text-slate-900 flex items-center gap-1.5">Place ${escapeHtml(spot.number)} ${starIcon}</p>
            ${myParkingBadge}
            ${ownedSpotBadgesHtml({ isOwned, isActiveProfile, showMultiOwnedUi })}
            ${spotPhoneHtml(spot, isOwned)}
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

function homeSpotSectionHtml(title, spots, profile, showMultiOwnedUi) {
  if (!spots.length) return "";
  return `
    <div class="mb-4">
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">${escapeHtml(title)}</p>
      ${spots.map((spot) => spotCardHtml(spot, profile, { showMultiOwnedUi })).join("")}
    </div>
  `;
}

function homeSpotsListHtml(visibleSpots, profile, allSpots) {
  const ownedNumbers = ownedSpotNumbersSet();
  const myParking = myParkingSpots(allSpots).map((s) => s.number);
  const sortWithParkingFirst = (spots) =>
    [...spots].sort((a, b) => {
      const aMine = myParking.includes(a.number);
      const bMine = myParking.includes(b.number);
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });
  const ownedVisible = sortWithParkingFirst(visibleSpots.filter((s) => ownedNumbers.has(s.number)));
  const otherVisible = sortWithParkingFirst(visibleSpots.filter((s) => !ownedNumbers.has(s.number)));
  const showMultiOwnedUi = ownedNumbers.size > 1;

  if (showMultiOwnedUi && ownedVisible.length > 0) {
    return `${homeSpotSectionHtml("Mes places", ownedVisible, profile, true)}${otherVisible.length > 0 ? homeSpotSectionHtml("Autres voisins", otherVisible, profile, false) : ""}`;
  }

  return sortWithParkingFirst(visibleSpots)
    .map((spot) => spotCardHtml(spot, profile, { showMultiOwnedUi: false }))
    .join("");
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
  const visibleSpots = allSpots.filter((s) => s.status !== "off_hours");
  const available = allSpots.filter((s) => s.status === "available").length;
  const parkedHere = myParkingSpots(allSpots);

  const alertsHtml = state.alerts.map(alertHtml).join("");
  const spotsHtml =
    allSpots.length === 0
      ? homeEmptyHtml()
      : visibleSpots.length === 0
        ? `<div class="text-center py-12">
            <p class="text-slate-500 font-medium text-sm">Aucune place disponible ou occupée pour ce créneau</p>
            <p class="text-slate-400 text-xs mt-1">Les places hors plage ne sont pas affichées ici.</p>
          </div>`
        : homeSpotsListHtml(visibleSpots, profile, allSpots);

  renderShell({
    title: "Places de parking",
    subtitle: "Votre résidence",
    appLogo: true,
    showLogout: true,
    content: `${alertsHtml}${myParkingBannerHtml(parkedHere)}${notificationBannerHtml()}${filterBarHtml()}${homeSummaryHtml(allSpots, available)}<div id="spots-list">${spotsHtml}</div>`,
    footer: appFooter({ activeTab: "home" }),
  });

  bindHomeScreenActions(profile, allSpots);
  maybeShowNeighborDisclaimerOnHome();
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
  if (isOwnedSpot(number)) {
    showError("Vous ne pouvez pas vous garer sur votre propre place.");
    return;
  }
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
