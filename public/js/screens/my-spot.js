// Écran "Ma place" : statut, téléphone, options (changer numéro, supprimer place).

async function loadMySpot() {
  const profile = Storage.getProfile();
  if (!profile) return;
  state.mySpot = await Backend.getSpot(profile.number, profile.number);
  state.schedules = state.mySpot.schedules || [];
}

function mySpotOccupiedBannerHtml(spot) {
  if (spot?.status !== "occupied" || !spot?.parked_contact_phone) return "";
  const who = spot.parked_by_spot_number
    ? ` (place ${escapeHtml(spot.parked_by_spot_number)})`
    : "";
  return `<div class="${CARD} bg-amber-50 ring-1 ring-amber-200">
      <p class="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-3">${icon("car", "w-4 h-4 shrink-0")}<span>Quelqu'un est garé sur votre place${who}</span></p>
      ${spotContactPhoneHtml(spot, { className: "", ownerContext: true })}
    </div>`;
}

function renderMySpotScreen() {
  const profile = Storage.getProfile();
  const spot = state.mySpot;

  renderShell({
    title: "Ma place",
    subtitle: `Place ${profile?.number || ""}`,
    icon: "settings-2",
    showLogout: true,
    footer: appFooter({ activeTab: "my-spot" }),
    content: `
      <div class="space-y-3">
        ${mySpotOccupiedBannerHtml(spot)}
        <div class="${CARD} flex items-center gap-4">
          <span class="grid place-items-center w-16 h-16 shrink-0 rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-2xl">${escapeHtml(profile?.number || "")}</span>
          <div class="min-w-0">
            <div class="mb-1.5">${statusPill(spot?.status, spot?.status_label || "")}</div>
            <p class="text-sm text-slate-500 flex items-center gap-1.5">${icon("phone", "w-4 h-4")}<span>${spot?.phone ? escapeHtml(spot.phone) : "Téléphone non renseigné"}</span></p>
          </div>
        </div>

        ${notificationToggleCardHtml()}

        <div class="pt-2 space-y-3">
          ${settingRow("edit-phone-btn", "phone", "Téléphone", spot?.phone ? spot.phone : "Optionnel · visible si place libre")}
          ${settingRow("change-number-btn", "replace", "Changer de numéro de place")}
        </div>

        <div class="pt-2">
          <button id="delete-spot-btn" class="w-full flex items-center justify-center gap-2 text-rose-600 font-semibold rounded-2xl py-3.5 ring-1 ring-rose-200 bg-rose-50 active:scale-[0.98] transition">
            ${icon("trash-2", "w-5 h-5")}<span>Supprimer ma place</span>
          </button>
        </div>
      </div>
    `,
  });

  bindMySpotActions(profile);
}

function bindMySpotActions(profile) {
  document.getElementById("edit-phone-btn")?.addEventListener("click", () => {
    state.screen = "phone";
    render();
  });

  document.getElementById("change-number-btn")?.addEventListener("click", () => {
    state.screen = "change-number";
    render();
  });

  document.getElementById("delete-spot-btn")?.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `Supprimer définitivement la place ${profile?.number} ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    const btn = document.getElementById("delete-spot-btn");
    setButtonLoading(btn, true);
    try {
      await Backend.deleteSpot(profile.number, profile.apartment);
      Storage.removeSavedProfile(profile.number);
      Storage.logout();
      state.mySpot = null;
      state.spots = [];
      state.screen = "spot";
      render();
    } catch (err) {
      showError(err.message);
    }
  });

  bindNotificationToggleCard(renderMySpotScreen);
  bindTabBar();
}
