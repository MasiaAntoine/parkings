// Dialogs modaux : confirmation de stationnement + menu profil + avertissement voisins.

function showNeighborDisclaimerDialog() {
  if (Storage.hasSeenNeighborDisclaimer()) return;
  document.getElementById("neighbor-disclaimer-dialog")?.remove();

  const dialog = document.createElement("div");
  dialog.id = "neighbor-disclaimer-dialog";
  dialog.className =
    "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm";
  dialog.innerHTML = `
    <div class="w-full max-w-md bg-white rounded-3xl p-6 shadow-glow max-h-[90vh] overflow-y-auto">
      <div class="flex items-center gap-3 mb-4">
        ${icon("shield-alert", "w-6 h-6 text-amber-600 shrink-0")}
        <h3 class="text-lg font-bold text-slate-900">Usage entre voisins</h3>
      </div>
      <div class="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>
          <strong class="text-slate-800">Crédit Agricole Immobilier</strong> refuse le partage des places de parking entre résidents.
        </p>
        <p>
          Cette application doit donc rester <strong class="text-slate-800">strictement entre voisins</strong> de la résidence — ne la partagez pas en dehors.
        </p>
        <p>
          Je me <strong class="text-slate-800">dégage de toute responsabilité</strong> en cas d'utilisation non conforme.
        </p>
      </div>
      <button id="neighbor-disclaimer-ok-btn" class="${BTN_PRIMARY} w-full mt-6 py-3.5">${btnContent("check", "J'ai compris")}</button>
    </div>
  `;
  document.body.appendChild(dialog);
  refreshIcons();

  document.getElementById("neighbor-disclaimer-ok-btn").addEventListener("click", () => {
    Storage.setNeighborDisclaimerSeen();
    dialog.remove();
  });
}

function showParkConfirmDialog(spot, defaultPhone, onConfirm) {
  const hint = spot.availability_hint || "";
  document.getElementById("park-dialog")?.remove();

  const dialog = document.createElement("div");
  dialog.id = "park-dialog";
  dialog.className =
    "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm";
  dialog.innerHTML = `
    <div class="w-full max-w-md bg-white rounded-3xl p-6 shadow-glow max-h-[90vh] overflow-y-auto">
      <div class="flex items-center gap-3 mb-3">
        ${icon("car", "w-6 h-6 text-emerald-600 shrink-0")}
        <h3 class="text-lg font-bold text-slate-900">Confirmer le stationnement</h3>
      </div>
      <p class="text-slate-600 mb-2">Vous allez vous garer sur la <strong class="text-slate-900">place ${escapeHtml(spot.number)}</strong>.</p>
      ${hint ? `<div class="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">${icon("clock", "w-4 h-4 shrink-0 mt-0.5 text-emerald-500")}<span>${escapeHtml(hint)}</span></div>` : ""}
      <div class="mb-4 space-y-2">
        <p class="text-sm font-semibold text-slate-700">Votre numéro de téléphone <span class="text-rose-600">*</span></p>
        ${phoneInputHtml(defaultPhone)}
        <p class="text-xs text-slate-400">Format français · 10 chiffres</p>
        <p class="text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">${icon("lock", "w-4 h-4 mt-0.5 shrink-0")}<span>Seul le propriétaire de la place pourra voir ce numéro pour vous joindre si besoin.</span></p>
      </div>
      <div class="flex gap-3">
        <button id="park-cancel-btn" class="${BTN_SECONDARY} flex-1 py-3.5">Annuler</button>
        <button id="park-confirm-btn" class="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold rounded-2xl py-3.5 shadow-soft active:scale-[0.98] transition">${icon("car", "w-5 h-5")}<span>Je me gare</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  refreshIcons();

  const phoneCtrl = bindPhoneInput(dialog.querySelector("[data-phone-input]"));
  if (!defaultPhone) phoneCtrl.focus();

  document.getElementById("park-cancel-btn").addEventListener("click", () => dialog.remove());
  document.getElementById("park-confirm-btn").addEventListener("click", async () => {
    const phone = readRequiredPhone(phoneCtrl);
    if (phone === undefined) return;
    const btn = document.getElementById("park-confirm-btn");
    setButtonLoading(btn, true);
    try {
      await onConfirm(phone);
      dialog.remove();
    } catch (err) {
      showError(err.message);
      setButtonLoading(btn, false);
    }
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.remove();
  });
}

function profileSwitchButtonHtml(number) {
  return `
    <button data-switch="${escapeHtml(number)}" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors">
      <span class="grid place-items-center w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-extrabold text-sm shrink-0">${escapeHtml(number)}</span>
      <div class="min-w-0">
        <span class="block text-sm font-semibold text-slate-800">Place ${escapeHtml(number)}</span>
        <span class="block text-xs text-slate-400">Changer de profil</span>
      </div>
      ${icon("chevron-right", "w-4 h-4 text-slate-300 shrink-0")}
    </button>
  `;
}

function showProfileMenu(anchorBtn) {
  const existing = document.getElementById("profile-dropdown");
  if (existing) {
    existing.remove();
    return;
  }

  const saved = Storage.getSavedProfiles();
  const current = Storage.getProfile()?.number;
  const others = saved.filter((n) => n !== current);

  const dropdown = document.createElement("div");
  dropdown.id = "profile-dropdown";
  dropdown.style.cssText = "position:absolute;top:100%;right:0;margin-top:6px;width:220px;z-index:100;";
  dropdown.className = "bg-white ring-1 ring-slate-200 rounded-2xl shadow-glow overflow-hidden";
  dropdown.innerHTML = `
    ${others.map(profileSwitchButtonHtml).join("")}
    ${others.length > 0 ? '<div class="border-t border-slate-100"></div>' : ""}
    <button id="dropdown-add-spot" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 active:bg-brand-100 text-left transition-colors">
      ${icon("plus", "w-5 h-5 text-brand-600 shrink-0")}
      <span class="text-sm font-semibold text-brand-700">Ajouter une place</span>
    </button>
    <div class="border-t border-slate-100"></div>
    <button id="dropdown-logout" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 active:bg-rose-100 text-left transition-colors">
      ${icon("log-out", "w-5 h-5 text-rose-500 shrink-0")}
      <span class="text-sm font-semibold text-rose-600">Déconnexion</span>
    </button>
  `;

  const container = anchorBtn.parentElement;
  container.style.position = "relative";
  container.appendChild(dropdown);
  refreshIcons();

  bindProfileMenuActions(dropdown, anchorBtn);
}

function bindProfileMenuActions(dropdown, anchorBtn) {
  dropdown.querySelectorAll("[data-switch]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      dropdown.remove();
      const number = btn.dataset.switch;
      const ready = Storage.switchToProfile(number);
      if (ready) {
        await afterProfileSwitch();
        return;
      }
      state.screenBeforeProfileSwitch = state.screen;
      state.spotNumber = number;
      state.spotExists = true;
      state.switchingProfile = true;
      state.screen = "apartment";
      render();
    });
  });

  document.getElementById("dropdown-add-spot")?.addEventListener("click", () => {
    dropdown.remove();
    startAddSpot();
  });

  document.getElementById("dropdown-logout")?.addEventListener("click", () => {
    dropdown.remove();
    disconnect();
  });

  const closeOutside = (e) => {
    if (!dropdown.contains(e.target) && e.target !== anchorBtn) {
      dropdown.remove();
      document.removeEventListener("click", closeOutside);
    }
  };
  setTimeout(() => document.addEventListener("click", closeOutside), 0);
}
