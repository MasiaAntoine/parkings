const ONBOARDING_STEPS = 6;

const DAYS = [
  { id: 0, label: "Lundi", short: "Lun" },
  { id: 1, label: "Mardi", short: "Mar" },
  { id: 2, label: "Mercredi", short: "Mer" },
  { id: 3, label: "Jeudi", short: "Jeu" },
  { id: 4, label: "Vendredi", short: "Ven" },
  { id: 5, label: "Samedi", short: "Sam" },
  { id: 6, label: "Dimanche", short: "Dim" },
];

const STATUS_ICONS = {
  available: "circle-check",
  occupied: "car",
  off_hours: "moon",
};

const STATUS_PILL = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  occupied: "bg-rose-50 text-rose-700 ring-rose-600/20",
  off_hours: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const STATUS_DOT = {
  available: "bg-emerald-500",
  occupied: "bg-rose-500",
  off_hours: "bg-slate-400",
};

const BTN_STEP_BACK =
  "flex-1 inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold rounded-2xl py-4 ring-1 ring-slate-200 shadow-soft active:scale-[0.98] transition";
const BTN_STEP_NEXT =
  "flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold rounded-2xl py-4 shadow-glow active:scale-[0.98] transition-transform";

function stepNextOnlyHtml(nextLabel, nextIcon = "arrow-right") {
  return `<button type="submit" class="${BTN_PRIMARY}">${btnContent(nextIcon, nextLabel)}</button>`;
}

function stepNavHtml(nextLabel, nextIcon = "arrow-right") {
  return `
    <div class="flex gap-3 pt-1">
      <button type="button" data-step-back class="${BTN_STEP_BACK}">${btnContent("chevron-left", "Retour")}</button>
      <button type="submit" class="${BTN_STEP_NEXT}">${btnContent(nextIcon, nextLabel)}</button>
    </div>
  `;
}

function bindStepBack(handler) {
  document
    .querySelector("[data-step-back]")
    ?.addEventListener("click", handler);
}

const BTN_PRIMARY =
  "w-full inline-flex items-center justify-center gap-2 bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold rounded-2xl py-4 shadow-glow active:scale-[0.98] transition-transform";
const BTN_SECONDARY =
  "w-full inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold rounded-2xl py-4 ring-1 ring-slate-200 shadow-soft active:scale-[0.98] transition";
const INPUT =
  "w-full bg-white ring-1 ring-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-800 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition";
const CARD = "bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5";

const app = document.getElementById("app");
let state = {
  screen: "loading",
  error: "",
  spotNumber: "",
  spotExists: false,
  onboardingApartment: "",
  schedulesBackScreen: "apartment",
  schedules: [],
  afterSchedules: "home",
  schedulesNote: "",
  alerts: [],
  spots: [],
  mySpot: null,
  allTrips: [],
  filterDatetime: "",
  filterPreset: "now",
  showOffHours: false,
  selectedSpot: null,
  editingTrip: null,
  switchingProfile: false,
  screenBeforeProfileSwitch: null,
  addingSpot: false,
  previousProfile: null,
  showTripIntroNext: false,
};

const PHONE_DIGIT_CLASS =
  "phone-digit flex-1 min-w-0 text-center font-bold bg-white ring-1 ring-slate-200 rounded-lg sm:rounded-xl shadow-soft focus:ring-2 focus:ring-brand-500 focus:outline-none transition tabular-nums";

function phoneDigitsFromValue(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  return Array.from({ length: 10 }, (_, i) => digits[i] || "");
}

function formatFrenchPhone(digits) {
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function phoneTelHref(phone) {
  return `tel:${String(phone || "").replace(/\D/g, "")}`;
}

function phoneInputHtml(value = "") {
  const digits = phoneDigitsFromValue(value);
  const groups = Array.from({ length: 5 }, (_, g) => {
    const pair = digits
      .slice(g * 2, g * 2 + 2)
      .map((digit, j) => {
        const i = g * 2 + j;
        return `<input type="tel" inputmode="numeric" maxlength="1" autocomplete="tel-national" data-phone-digit="${i}" value="${escapeHtml(digit)}" aria-label="Chiffre ${i + 1} sur 10" class="${PHONE_DIGIT_CLASS}">`;
      })
      .join("");
    return `<div class="phone-pair flex min-w-0 flex-1">${pair}</div>`;
  });

  return `<div class="phone-input flex w-full max-w-full flex-nowrap items-stretch" data-phone-input>${groups.join("")}</div>`;
}

function bindPhoneInput(root) {
  const inputs = root.querySelectorAll("[data-phone-digit]");

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "")
        .replace(/\D/g, "")
        .slice(0, 10);
      const digits = phoneDigitsFromValue(pasted);
      inputs.forEach((inp, i) => {
        inp.value = digits[i] || "";
      });
      const focusIndex =
        pasted.length === 0 ? 0 : Math.min(pasted.length, 10) - 1;
      inputs[focusIndex].focus();
    });
  });

  return {
    focus() {
      inputs[0]?.focus();
    },
    clear() {
      inputs.forEach((input) => {
        input.value = "";
      });
      inputs[0]?.focus();
    },
    getDigits() {
      return Array.from(inputs)
        .map((input) => input.value)
        .join("")
        .replace(/\D/g, "");
    },
    isEmpty() {
      return this.getDigits().length === 0;
    },
    isComplete() {
      return this.getDigits().length === 10;
    },
    getValue() {
      const digits = this.getDigits();
      if (!digits) return null;
      if (digits.length !== 10) return undefined;
      return formatFrenchPhone(digits);
    },
  };
}

function readOptionalPhone(phoneCtrl) {
  if (!phoneCtrl || phoneCtrl.isEmpty()) return null;
  if (!phoneCtrl.isComplete()) {
    showError("Numéro de téléphone incomplet.");
    return undefined;
  }
  return phoneCtrl.getValue();
}

function readRequiredPhone(phoneCtrl) {
  if (!phoneCtrl || phoneCtrl.isEmpty()) {
    showError("Numéro de téléphone requis.");
    return undefined;
  }
  if (!phoneCtrl.isComplete()) {
    showError("Numéro de téléphone incomplet.");
    return undefined;
  }
  return phoneCtrl.getValue();
}

function viewerSpotNumber() {
  return Storage.getProfile()?.number ?? null;
}

function spotContactPhoneHtml(spot, { className = "mt-2" } = {}) {
  if (spot.status === "occupied" && spot.parked_contact_phone) {
    const who = spot.parked_by_spot_number
      ? `Place ${spot.parked_by_spot_number}`
      : "Personne garée";
    return `<a href="${phoneTelHref(spot.parked_contact_phone)}" class="${className} inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(who)} · ${escapeHtml(spot.parked_contact_phone)}</span></a>`;
  }
  if (spot.status !== "occupied" && spot.phone) {
    return `<a href="${phoneTelHref(spot.phone)}" class="${className} inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`;
  }
  return "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function icon(name, className = "w-5 h-5 shrink-0") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function btnContent(iconName, label) {
  return `${icon(iconName, "w-5 h-5")}<span>${label}</span>`;
}

function statusPill(status, label) {
  const styles = STATUS_PILL[status] || STATUS_PILL.off_hours;
  return `<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${styles}">${icon(STATUS_ICONS[status] || "circle-help", "w-3.5 h-3.5")}<span>${escapeHtml(label)}</span></span>`;
}

// Skeleton card pour le chargement
function skeletonCard() {
  return `
    <div class="bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5 animate-pulse">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
          <div class="space-y-2">
            <div class="h-4 w-24 bg-slate-100 rounded-full"></div>
            <div class="h-3 w-16 bg-slate-100 rounded-full"></div>
          </div>
        </div>
        <div class="h-6 w-20 bg-slate-100 rounded-full shrink-0"></div>
      </div>
      <div class="mt-4 h-3 w-36 bg-slate-100 rounded-full"></div>
    </div>
  `;
}

function skeletonMySpot() {
  return `
    <div class="space-y-3 animate-pulse">
      <div class="bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5 flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 shrink-0"></div>
        <div class="space-y-2 flex-1">
          <div class="h-5 w-20 bg-slate-100 rounded-full"></div>
          <div class="h-4 w-32 bg-slate-100 rounded-full"></div>
        </div>
      </div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
    </div>
  `;
}

// Ajoute un état de chargement sur un bouton
function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn._originalHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Chargement…</span>`;
  } else {
    btn.disabled = false;
    if (btn._originalHtml) btn.innerHTML = btn._originalHtml;
  }
}

// Barre de navigation basse (4 onglets)
function tabBarHtml(activeTab) {
  const tabs = [
    { id: "home", iconName: "home", label: "Accueil" },
    { id: "my-spot", iconName: "settings-2", label: "Ma place" },
    { id: "schedules", iconName: "calendar-range", label: "Horaires" },
    { id: "trip", iconName: "plane-takeoff", label: "Déplacement" },
  ];

  return `
    <div class="flex items-center bg-white/95 backdrop-blur-xl rounded-2xl ring-1 ring-slate-200 shadow-glow p-1 gap-0.5">
      ${tabs
        .map(
          (tab) => `
        <button data-tab="${tab.id}" class="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors min-w-0
          ${activeTab === tab.id ? "bg-brand-50 text-brand-600" : "text-slate-400 active:bg-slate-50"}">
          ${icon(tab.iconName, "w-5 h-5 shrink-0")}
          <span class="text-[9px] font-semibold leading-none truncate max-w-full px-0.5">${tab.label}</span>
        </button>
      `,
        )
        .join("")}
    </div>
  `;
}

function appFooter({ activeTab, actions = "" } = {}) {
  if (actions) {
    return `${actions}<div class="mt-3">${tabBarHtml(activeTab)}</div>`;
  }
  return tabBarHtml(activeTab);
}

// Lie les événements de la barre de navigation basse
function bindTabBar() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = async () => {
      const target = btn.dataset.tab;
      if (target === state.screen && !["home", "trip", "my-spot"].includes(target)) {
        return;
      }

      try {
        if (target === "schedules") {
          const profile = Storage.getProfile();
          if (!profile) return;
          const spot = await Backend.getSpot(profile.number, profile.number);
          state.schedules = spot.schedules || [];
          state.afterSchedules = "home";
          state.schedulesNote = "";
          state.showTripIntroNext = false;
          state.screen = "schedules";
          await render();
        } else if (target === "my-spot") {
          await loadMySpot();
          state.editingTrip = null;
          state.screen = target;
          await render();
        } else if (target === "trip") {
          await loadMyTrips();
          state.editingTrip = null;
          state.screen = target;
          await render();
        } else {
          state.screen = target;
          await render();
        }
      } catch (err) {
        showError(err.message);
      }
    };
  });
}

// Dialog de confirmation avant de se garer
function showParkConfirmDialog(spot, defaultPhone, onConfirm) {
  const hint = spot.availability_hint || "";
  const existing = document.getElementById("park-dialog");
  if (existing) existing.remove();

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

// Affiche le menu déroulant du profil (top-right)
function showProfileMenu(anchorBtn) {
  const existing = document.getElementById("profile-dropdown");
  if (existing) {
    existing.remove();
    return;
  }

  const saved = Storage.getSavedProfiles();
  const current = Storage.getProfile()?.number;
  const others = saved.filter((n) => n !== current);

  const othersHtml = others
    .map(
      (n) => `
      <button data-switch="${escapeHtml(n)}" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors">
        <span class="grid place-items-center w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-extrabold text-sm shrink-0">${escapeHtml(n)}</span>
        <div class="min-w-0">
          <span class="block text-sm font-semibold text-slate-800">Place ${escapeHtml(n)}</span>
          <span class="block text-xs text-slate-400">Changer de profil</span>
        </div>
        ${icon("chevron-right", "w-4 h-4 text-slate-300 shrink-0")}
      </button>
    `,
    )
    .join("");

  const dropdown = document.createElement("div");
  dropdown.id = "profile-dropdown";
  dropdown.style.cssText = "position:absolute;top:100%;right:0;margin-top:6px;width:220px;z-index:100;";
  dropdown.className = "bg-white ring-1 ring-slate-200 rounded-2xl shadow-glow overflow-hidden";
  dropdown.innerHTML = `
    ${othersHtml}
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

async function afterProfileSwitch() {
  const keepScreens = new Set([
    "home",
    "my-spot",
    "schedules",
    "trip",
    "trip-form",
    "phone",
    "change-number",
  ]);

  if (state.screenBeforeProfileSwitch) {
    state.screen = state.screenBeforeProfileSwitch;
    state.screenBeforeProfileSwitch = null;
  } else if (state.screen === "spot-detail") {
    state.selectedSpot = null;
    state.screen = "home";
  } else if (!keepScreens.has(state.screen)) {
    state.screen = "home";
  }

  if (state.screen === "trip-form" && state.editingTrip) {
    state.editingTrip = null;
    state.screen = "trip";
  }

  state.switchingProfile = false;

  const profile = Storage.getProfile();
  if (!profile) {
    await render();
    return;
  }

  try {
    if (state.screen === "schedules") {
      const spot = await Backend.getSpot(profile.number, profile.number);
      state.schedules = spot.schedules || [];
      state.afterSchedules = "home";
      state.schedulesNote = "";
    } else if (["my-spot", "trip", "trip-form"].includes(state.screen)) {
      if (state.screen === "trip" || state.screen === "trip-form") {
        await loadMyTrips();
      } else {
        await loadMySpot();
      }
    }
  } catch (err) {
    showError(err.message);
    state.screen = "home";
  }

  await render();
}

function startAddSpot() {
  state.previousProfile = Storage.getProfile();
  Storage.clearCurrentProfile();
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.schedules = [];
  state.afterSchedules = "home";
  state.schedulesNote = "";
  state.switchingProfile = false;
  state.addingSpot = true;
  state.screen = "spot";
  render();
}

function finishAddSpotFlow() {
  state.addingSpot = false;
  state.previousProfile = null;
}

function cancelAddSpot() {
  if (state.previousProfile) {
    Storage.setProfile(state.previousProfile.number, state.previousProfile.apartment);
  }
  state.addingSpot = false;
  state.previousProfile = null;
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.screen = "home";
  render();
}

function showError(message) {
  state.error = message;
  showToast(message, "error");
}

function disconnect() {
  stopAlertPolling();
  Storage.logout();
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.schedules = [];
  state.afterSchedules = "home";
  state.schedulesNote = "";
  state.spots = [];
  state.alerts = [];
  state.mySpot = null;
  state.error = "";
  state.selectedSpot = null;
  state.editingTrip = null;
  state.switchingProfile = false;
  state.screenBeforeProfileSwitch = null;
  state.addingSpot = false;
  state.previousProfile = null;
  state.screen = "code";
  render();
}

function shouldShowProfile() {
  if (!Storage.isAuthValid() || state.screen === "code") return false;
  if (["spot", "apartment", "onboarding-phone"].includes(state.screen)) return false;
  if (state.screen === "schedules" && state.afterSchedules !== "my-spot" && state.afterSchedules !== "home") return false;
  const profile = Storage.getProfile();
  return !!profile && [
    "home",
    "my-spot",
    "trip",
    "change-number",
    "phone",
    "schedules",
    "spot-detail",
    "onboarding-trip-intro",
    "onboarding-notifications",
    "trip",
    "trip-form",
  ].includes(state.screen);
}

function renderShell({
  title,
  subtitle = "",
  icon: iconName = null,
  appLogo = false,
  content,
  footer = "",
  showLogout = false,
  back = null,
}) {
  const canShowProfile = shouldShowProfile() || showLogout;
  const profile = Storage.getProfile();

  const leading = back
    ? `<button id="appbar-back" type="button" class="shrink-0 -ml-2 p-2 text-slate-600 hover:text-slate-900 rounded-xl active:scale-90 transition" aria-label="Retour">${icon("chevron-left", "w-6 h-6")}</button>`
    : appLogo
      ? `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-soft"><img src="/logo.svg" alt="" class="w-full h-full" width="40" height="40"></span>`
      : iconName
        ? `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">${icon(iconName, "w-5 h-5")}</span>`
        : `<span class="w-10 shrink-0" aria-hidden="true"></span>`;

  const trailing = canShowProfile && profile
    ? `<button id="appbar-profile" type="button" class="shrink-0 flex items-center gap-1 h-10 px-3 text-slate-700 bg-white ring-1 ring-slate-200 rounded-2xl active:scale-90 transition text-sm font-bold" aria-label="Profil">
         <span class="text-brand-600 font-extrabold">${escapeHtml(profile.number)}</span>
         ${icon("chevron-down", "w-4 h-4 text-slate-400 shrink-0")}
       </button>`
    : `<span class="w-10 shrink-0" aria-hidden="true"></span>`;

  app.innerHTML = `
    <header class="safe-top sticky top-0 z-20 px-5 pb-3 bg-white/75 backdrop-blur-xl border-b border-slate-200/60">
      <div class="flex items-center gap-3">
        ${leading}
        <div class="min-w-0 flex-1">
          <h1 class="text-[19px] font-bold tracking-tight text-slate-900 truncate leading-tight">${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="text-xs text-slate-500 truncate">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        ${trailing}
      </div>
    </header>
    <main class="flex-1 px-5 pt-5 ${footer ? "pb-32" : "pb-8"}">
      <div class="animate-fade-up">${content}</div>
    </main>
    ${
      footer
        ? `<div class="fixed bottom-0 left-0 right-0 z-20"><div class="mx-auto w-full max-w-md safe-bottom px-5 pt-3 bg-gradient-to-t from-white via-white/95 to-white/0">${footer}</div></div>`
        : ""
    }
  `;

  refreshIcons();

  if (back) {
    document.getElementById("appbar-back")?.addEventListener("click", back);
  }
  if (canShowProfile && profile) {
    document
      .getElementById("appbar-profile")
      ?.addEventListener("click", (e) => {
        showProfileMenu(e.currentTarget);
      });
  }
}

let toastTimeoutId = null;
let alertPollTimer = null;

function notificationEnableHtml(id = "enable-notifications-btn") {
  if (!Notifications.supported()) return "";

  if (Notifications.isEnabled()) {
    return `<p class="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">${icon("check", "w-3.5 h-3.5")}<span>Notifications activées</span></p>`;
  }

  if (Notifications.permission === "denied") {
    return `<p class="text-xs text-slate-400">Notifications bloquées — autorisez-les dans les réglages du navigateur.</p>`;
  }

  return `<button type="button" id="${id}" class="w-full inline-flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold rounded-xl py-2.5 active:scale-[0.98] transition">${icon("bell-ring", "w-4 h-4")}<span>Activer les notifications</span></button>`;
}

function bindNotificationEnableButton(id, onUpdate) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.onclick = async () => {
    setButtonLoading(btn, true);
    try {
      const result = await Notifications.enable();
      if (result === "granted") {
        showToast("Notifications activées.");
      } else if (result === "denied") {
        showToast("Notifications refusées.", "warning");
      }
      onUpdate?.();
    } catch (err) {
      showError(err.message);
    }
  };
}

async function pollAlerts() {
  if (!Storage.isAuthValid()) return;
  try {
    const data = await Backend.getAlerts();
    await Notifications.processNewAlerts(data.alerts);
    if (state.screen === "home") {
      const changed =
        data.alerts.length !== state.alerts.length ||
        data.alerts.some((a, i) => a.id !== state.alerts[i]?.id);
      if (changed) {
        state.alerts = data.alerts;
        renderHomeScreen();
      }
    }
  } catch {
    /* ignore background poll errors */
  }
}

function startAlertPolling() {
  stopAlertPolling();
  if (!Storage.isAuthValid()) return;

  alertPollTimer = setInterval(pollAlerts, 60000);
  document.addEventListener("visibilitychange", onVisibilityPollAlerts);
}

function stopAlertPolling() {
  if (alertPollTimer) {
    clearInterval(alertPollTimer);
    alertPollTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityPollAlerts);
}

function onVisibilityPollAlerts() {
  if (document.visibilityState === "visible" && Storage.isAuthValid()) {
    pollAlerts();
  }
}

function dismissToast() {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  const existing = document.getElementById("app-toast");
  if (!existing) return;
  existing.style.transition = "opacity 200ms ease, transform 200ms ease";
  existing.style.opacity = "0";
  existing.style.transform = "translateY(-12px)";
  setTimeout(() => existing.remove(), 220);
}

const TOAST_VARIANTS = {
  success: { bg: "bg-emerald-600", icon: "check", shadow: "shadow-soft" },
  error: { bg: "bg-rose-600", icon: "circle-alert", shadow: "shadow-glow" },
  warning: { bg: "bg-amber-600", icon: "triangle-alert", shadow: "shadow-soft" },
  info: { bg: "bg-brand-600", icon: "info", shadow: "shadow-soft" },
};

function showToast(message, variant = "success") {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  const existing = document.getElementById("app-toast");
  if (existing) existing.remove();

  const { bg, icon: iconName, shadow } =
    TOAST_VARIANTS[variant] ?? TOAST_VARIANTS.success;

  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.className =
    "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-md px-5 safe-top";
  toast.innerHTML = `
    <button type="button" class="animate-pop w-full flex items-start gap-2 rounded-2xl ${bg} text-white px-4 py-3 ${shadow} text-left active:scale-[0.98] transition">
      ${icon(iconName, "w-5 h-5 mt-0.5 shrink-0")}
      <span class="flex-1 text-sm font-medium">${escapeHtml(message)}</span>
      ${icon("x", "w-4 h-4 mt-0.5 shrink-0 opacity-70")}
    </button>`;
  document.body.appendChild(toast);
  refreshIcons();

  toast.querySelector("button")?.addEventListener("click", dismissToast);

  toastTimeoutId = setTimeout(() => {
    toastTimeoutId = null;
    dismissToast();
  }, 3000);
}

function renderCodeScreen() {
  renderShell({
    title: "Parking",
    subtitle: "Entre voisins",
    appLogo: true,
    content: `
      <div class="flex flex-col items-center text-center pt-6 pb-2">
        <div class="grid place-items-center w-24 h-24 rounded-[28px] bg-white shadow-soft ring-1 ring-slate-900/5 mb-5">
          <img src="/logo.svg" alt="" class="w-16 h-16" width="64" height="64">
        </div>
        <h2 class="text-2xl font-extrabold tracking-tight text-slate-900">Bienvenue</h2>
        <p class="text-slate-500 mt-1 mb-6 max-w-[20rem]">Entrez le code à 6 chiffres reçu sur <strong class="text-slate-700">WhatsApp</strong>.</p>
      </div>
      <div class="mb-5 text-sm text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
        ${icon("shield-alert", "w-5 h-5 text-amber-600 shrink-0 mt-0.5")}
        <span><strong>Ne partagez jamais ce code.</strong> Il donne accès à toute la résidence. Si vous pensez qu'il a été divulgué, contactez l'administrateur.</span>
      </div>
      <form id="code-form" class="space-y-4">
        <div class="relative">
          ${icon("lock-keyhole", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
          <input type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*"
            id="access-code" placeholder="••••••" autocomplete="one-time-code"
            class="w-full text-center text-3xl tracking-[0.4em] font-bold bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        <button type="submit" id="code-submit" class="${BTN_PRIMARY}">${btnContent("arrow-right", "Accéder")}</button>
      </form>
      <p class="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">${icon("shield-check", "w-4 h-4")}<span>Aucun compte, aucune donnée personnelle.</span></p>
    `,
  });

  document.getElementById("code-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("code-submit");
    const code = document.getElementById("access-code").value.trim();
    setButtonLoading(btn, true);
    try {
      await Backend.verifyCode(code);
      Storage.setAuth();
      await routeAfterAuth();
    } catch (err) {
      showError(err.message);
      setButtonLoading(btn, false);
    }
  });
}

function renderSpotNumberScreen() {
  const totalSteps = state.spotExists ? 2 : ONBOARDING_STEPS;
  const savedProfiles = Storage.getSavedProfiles();
  const savedProfilesHtml =
    savedProfiles.length > 0
      ? `<div class="mt-8">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center mb-3">Ou reconnectez-vous</p>
          <div class="flex flex-wrap justify-center gap-2">
            ${savedProfiles
              .map(
                (n) => `
              <button type="button" data-quick-connect="${escapeHtml(n)}"
                class="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 shadow-soft active:scale-95 transition">
                <span class="font-extrabold text-brand-600 text-lg">${escapeHtml(n)}</span>
                <span class="text-xs text-slate-400">Place ${escapeHtml(n)}</span>
                ${icon("log-in", "w-4 h-4 text-slate-300")}
              </button>
            `,
              )
              .join("")}
          </div>
        </div>`
      : "";

  renderShell({
    title: state.addingSpot ? "Ajouter une place" : "Votre place",
    subtitle: `Étape 1 sur ${totalSteps}`,
    icon: "hash",
    back: state.addingSpot
      ? () => cancelAddSpot()
      : undefined,
    content: `
      <p class="text-slate-500 mb-8">${state.addingSpot ? "Enregistrez un autre numéro de place pour y accéder depuis ce menu." : "Quel est votre numéro de place ?"} <span class="text-slate-400">(3 chiffres max)</span></p>
      <form id="spot-form" class="space-y-8">
        <div class="flex justify-center gap-3">
          ${[0, 1, 2]
            .map(
              (i) => `
            <input type="text" inputmode="numeric" maxlength="1" data-digit="${i}"
              class="spot-digit w-20 h-24 text-center text-4xl font-extrabold bg-white ring-1 ring-slate-200 rounded-3xl shadow-soft focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
          `,
            )
            .join("")}
        </div>
        ${stepNextOnlyHtml("Continuer")}
      </form>
      ${savedProfilesHtml}
    `,
  });

  const digits = document.querySelectorAll(".spot-digit");
  digits.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value && index < digits.length - 1) {
        digits[index + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        digits[index - 1].focus();
      }
    });
    if (state.spotNumber[index]) {
      input.value = state.spotNumber[index];
    }
  });
  digits[0].focus();

  // Reconnexion rapide depuis un profil sauvegardé
  document.querySelectorAll("[data-quick-connect]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const number = btn.dataset.quickConnect;
      state.addingSpot = false;
      state.previousProfile = null;
      setButtonLoading(btn, true);
      try {
        const entry = Storage.getSavedProfileEntry(number);
        if (entry?.apartment) {
          Storage.setProfile(number, entry.apartment);
          state.switchingProfile = false;
          state.screen = "home";
          await render();
          return;
        }
        state.spotNumber = number;
        const result = await Backend.spotExists(number);
        state.spotExists = result.exists;
        state.switchingProfile = true;
        state.screen = "apartment";
        render();
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    });
  });

  document.getElementById("spot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const number =
      Array.from(digits)
        .map((d) => d.value)
        .join("")
        .replace(/^0+/, "") || "0";
    if (!number || number.length > 3) {
      showError("Numéro de place invalide.");
      return;
    }
    const padded = number.padStart(3, "0");
    state.spotNumber = padded;
    try {
      const result = await Backend.spotExists(padded);
      state.spotExists = result.exists;
      state.screen = "apartment";
      render();
    } catch (err) {
      showError(err.message);
    }
  });
}

function renderApartmentScreen() {
  const isConfirm = state.spotExists;
  const totalSteps = isConfirm ? 2 : ONBOARDING_STEPS;
  renderShell({
    title: isConfirm ? "Confirmer la place" : "Enregistrer la place",
    subtitle: isConfirm ? `Étape 2 sur ${totalSteps}` : `Étape 2 sur ${ONBOARDING_STEPS}`,
    icon: "building-2",
    content: `
      <p class="text-slate-500 mb-5">${isConfirm ? "Confirmez votre numéro d'appartement pour accéder à cette place." : "Indiquez votre numéro d'appartement pour enregistrer cette place."}</p>
      <form id="apartment-form" class="space-y-4">
        <div class="relative">
          ${icon("building-2", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
          <input type="text" id="apartment" maxlength="30" autocomplete="off" placeholder="Ex. A01" value="${escapeHtml(state.onboardingApartment || "")}" class="${INPUT} text-lg">
        </div>
        ${stepNavHtml(isConfirm ? "Confirmer" : "Continuer", isConfirm ? "log-in" : "arrow-right")}
      </form>
    `,
  });

  bindStepBack(() => {
    state.onboardingApartment = "";
    if (state.switchingProfile) {
      state.switchingProfile = false;
      if (state.screenBeforeProfileSwitch) {
        state.screen = state.screenBeforeProfileSwitch;
        state.screenBeforeProfileSwitch = null;
      } else {
        state.screen = "home";
      }
    } else if (state.addingSpot) {
      cancelAddSpot();
      return;
    } else {
      state.screen = "spot";
    }
    render();
  });

  document
    .getElementById("apartment-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const apartment = document.getElementById("apartment").value.trim();
      if (!apartment) {
        showError("Numéro d'appartement requis.");
        return;
      }
      const btn = e.submitter;
      setButtonLoading(btn, true);
      try {
        if (state.spotExists) {
          const result = await Backend.confirmSpot(state.spotNumber, apartment);
          Storage.setProfile(state.spotNumber, apartment);
          if (state.switchingProfile && state.screenBeforeProfileSwitch) {
            await afterProfileSwitch();
            return;
          }
          state.switchingProfile = false;
          finishAddSpotFlow();
          // Re-onboarding horaires pour places existantes sans schedules
          if (!result.has_schedules) {
            state.schedules = [];
            state.schedulesBackScreen = "home";
            state.afterSchedules = "home";
            state.schedulesNote =
              "Ces horaires correspondent à vos absences habituelles (ex. horaires de travail). Ils permettent à vos voisins de savoir quand votre place est disponible.";
            state.showTripIntroNext = true;
            state.screen = "schedules";
          } else {
            state.screen = "home";
          }
        } else {
          state.onboardingApartment = apartment;
          state.screen = "onboarding-phone";
        }
        render();
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    });
}

function renderOnboardingPhoneScreen() {
  if (!state.onboardingApartment) {
    state.screen = "apartment";
    render();
    return;
  }

  renderShell({
    title: "Téléphone",
    subtitle: `Étape 3 sur ${ONBOARDING_STEPS}`,
    icon: "phone",
    content: `
      <p class="text-slate-500 mb-5">Un numéro pour vous joindre en cas de problème. <span class="text-slate-400">(optionnel)</span></p>
      <form id="onboarding-phone-form" class="space-y-4">
        ${phoneInputHtml()}
        <p class="text-center text-xs text-slate-400">Format français · 10 chiffres</p>
        <p class="text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-3.5 py-3 flex items-start gap-2">${icon("eye", "w-4 h-4 mt-0.5 shrink-0")}<span>Visible par les voisins <strong>lorsque votre place est libre</strong>, pour qu'ils puissent vous contacter.</span></p>
        ${stepNavHtml("Enregistrer", "check")}
        <button type="button" id="phone-skip" class="${BTN_SECONDARY}">${btnContent("arrow-right", "Passer")}</button>
      </form>
    `,
  });

  bindStepBack(() => {
    state.screen = "apartment";
    render();
  });

  const phoneCtrl = bindPhoneInput(
    document.querySelector("[data-phone-input]"),
  );

  const finishRegistration = async (phone) => {
    try {
      const result = await Backend.registerSpot(
        state.spotNumber,
        state.onboardingApartment,
        phone,
      );
      Storage.setProfile(state.spotNumber, state.onboardingApartment);
      finishAddSpotFlow();
      state.onboardingApartment = "";
      if (!result.has_schedules) {
        state.schedules = [];
        state.schedulesBackScreen = "onboarding-phone";
        state.schedulesNote = "";
        state.showTripIntroNext = true;
        state.screen = "schedules";
      } else {
        state.screen = "home";
      }
      render();
    } catch (err) {
      showError(err.message);
    }
  };

  document
    .getElementById("onboarding-phone-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const phone = readOptionalPhone(phoneCtrl);
      if (phone === undefined) return;
      await finishRegistration(phone);
    });

  document.getElementById("phone-skip").addEventListener("click", async () => {
    await finishRegistration(null);
  });
}

function applyToSpotsCheckboxesHtml(group) {
  const owned = Storage.getOwnedProfiles();
  if (owned.length <= 1) return "";

  const currentNumber = Storage.getProfile()?.number;

  const items = owned
    .map(
      (p) => `
      <label class="flex items-center gap-3 bg-white ring-1 ring-slate-200 rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition">
        <input type="checkbox"${p.number === currentNumber ? " checked" : ""}
          class="apply-spot-check w-5 h-5 rounded-md accent-brand-600 shrink-0"
          data-apply-group="${group}"
          data-number="${escapeHtml(p.number)}"
          data-apartment="${escapeHtml(p.apartment)}">
        <span class="flex-1 min-w-0 flex items-center gap-2">
          <span class="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-extrabold text-sm shrink-0">${escapeHtml(p.number)}</span>
          <span class="text-sm font-semibold text-slate-800">Place ${escapeHtml(p.number)}${p.number === currentNumber ? '<span class="text-xs font-normal text-brand-600 ml-1">(actuelle)</span>' : ""}</span>
        </span>
      </label>`,
    )
    .join("");

  return `
    <div class="mt-4 space-y-2">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Appliquer sur</p>
      <div class="space-y-2">${items}</div>
    </div>`;
}

function getSelectedApplyTargets(group) {
  const profile = Storage.getProfile();
  const owned = Storage.getOwnedProfiles();

  if (owned.length <= 1) {
    return profile
      ? [{ number: profile.number, apartment: profile.apartment }]
      : [];
  }

  const checked = document.querySelectorAll(
    `.apply-spot-check[data-apply-group="${group}"]:checked`,
  );

  if (checked.length === 0) {
    return null;
  }

  return Array.from(checked).map((el) => ({
    number: el.dataset.number,
    apartment: el.dataset.apartment,
  }));
}

function applyTargetsToast(prefix, targets) {
  if (targets.length > 1) {
    showToast(
      `${prefix} pour ${targets.length} places (${targets.map((t) => t.number).join(", ")}).`,
    );
  }
}

function schedulesSummary(schedules) {
  if (!schedules?.length) {
    return "Aucun jour · hors plage sauf déplacement";
  }

  return schedules
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((s) => DAYS.find((d) => d.id === s.day_of_week)?.short || "?")
    .join(", ");
}

function renderSchedulesScreen() {
  const schedules = state.schedules;
  const note = state.schedulesNote;
  const isOnboarding = state.showTripIntroNext;

  const goBackFromSchedules = () => {
    state.schedulesNote = "";
    state.screen =
      state.afterSchedules === "my-spot"
        ? "my-spot"
        : state.schedulesBackScreen;
    render();
  };

  const schedulesFooter = isOnboarding
    ? `<div class="flex gap-3">
        <button type="button" id="schedules-back" class="${BTN_STEP_BACK}">${btnContent("chevron-left", "Retour")}</button>
        <button form="schedules-form" type="submit" id="schedules-save" class="${BTN_STEP_NEXT}">${btnContent("check", "Enregistrer")}</button>
      </div>`
    : appFooter({
        activeTab: "schedules",
        actions: `<button form="schedules-form" type="submit" id="schedules-save" class="${BTN_PRIMARY}">${btnContent("check", "Enregistrer les horaires")}</button>`,
      });

  renderShell({
    title: "Disponibilités",
    subtitle: isOnboarding
      ? `Étape 4 sur ${ONBOARDING_STEPS}`
      : "Quand votre place est libre",
    icon: "calendar-range",
    showLogout: !isOnboarding,
    content: `
      ${note ? `<div class="mb-5 text-sm text-brand-800 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">${icon("info", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}<span>${escapeHtml(note)}</span></div>` : ""}
      <p class="text-slate-500 mb-5">Activez les jours et précisez les plages horaires. Sans jour sélectionné, la place reste hors plage (sauf en déplacement).</p>
      <form id="schedules-form" class="space-y-3">
        ${DAYS.map((day) => {
          const schedule = schedules.find((s) => s.day_of_week === day.id);
          const checked = !!schedule;
          return `
            <div class="rounded-2xl ring-1 transition-colors ${checked ? "bg-white ring-brand-200" : "bg-white/60 ring-slate-200"} p-4">
              <label class="flex items-center justify-between cursor-pointer">
                <span class="font-semibold text-slate-800">${day.label}</span>
                <input type="checkbox" data-day="${day.id}" class="day-check w-6 h-6 rounded-md" ${checked ? "checked" : ""}>
              </label>
              <div class="flex gap-2 items-center mt-3 day-times ${checked ? "" : "opacity-40"}">
                <input type="time" data-day-start="${day.id}" value="${schedule?.start_time || "08:00"}"
                  ${checked ? "" : "disabled"}
                  class="flex-1 bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed">
                ${icon("arrow-right", "w-4 h-4 text-slate-400 shrink-0")}
                <input type="time" data-day-end="${day.id}" value="${schedule?.end_time || "18:00"}"
                  ${checked ? "" : "disabled"}
                  class="flex-1 bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed">
              </div>
            </div>
          `;
        }).join("")}
        ${applyToSpotsCheckboxesHtml("schedules")}
      </form>
    `,
    footer: schedulesFooter,
  });

  if (isOnboarding) {
    document
      .getElementById("schedules-back")
      ?.addEventListener("click", goBackFromSchedules);
  } else {
    bindTabBar();
  }

  document.querySelectorAll(".day-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const wrapper = checkbox.closest(".rounded-2xl");
      const times = wrapper.querySelector(".day-times");
      const inputs = times.querySelectorAll("input[type=time]");
      if (checkbox.checked) {
        times.classList.remove("opacity-40");
        inputs.forEach((inp) => inp.removeAttribute("disabled"));
        wrapper.classList.add("ring-brand-200", "bg-white");
        wrapper.classList.remove("ring-slate-200", "bg-white/60");
      } else {
        times.classList.add("opacity-40");
        inputs.forEach((inp) => inp.setAttribute("disabled", ""));
        wrapper.classList.remove("ring-brand-200", "bg-white");
        wrapper.classList.add("ring-slate-200", "bg-white/60");
      }
    });
  });

  document
    .getElementById("schedules-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const profile = Storage.getProfile();
      if (!profile) {
        state.screen = "spot";
        render();
        return;
      }
      const btn = document.getElementById("schedules-save");
      setButtonLoading(btn, true);

      const newSchedules = [];
      document.querySelectorAll(".day-check:checked").forEach((checkbox) => {
        const dayId = parseInt(checkbox.dataset.day, 10);
        const start = document.querySelector(
          `[data-day-start="${dayId}"]`,
        ).value;
        const end = document.querySelector(`[data-day-end="${dayId}"]`).value;
        newSchedules.push({
          day_of_week: dayId,
          start_time: start,
          end_time: end,
        });
      });

      try {
        const targets = getSelectedApplyTargets("schedules");
        if (!targets) {
          showError("Sélectionnez au moins une place.");
          setButtonLoading(btn, false);
          return;
        }
        await persistSchedules(newSchedules, targets);
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    });
}

async function persistSchedules(newSchedules, targets) {
  const profile = Storage.getProfile();
  if (!profile) {
    state.screen = "spot";
    render();
    return;
  }

  const resolved =
    targets ??
    (profile
      ? [{ number: profile.number, apartment: profile.apartment }]
      : []);

  await Promise.all(
    resolved.map((target) =>
      Backend.saveSchedules(target.number, target.apartment, newSchedules),
    ),
  );

  applyTargetsToast("Horaires enregistrés", resolved);

  state.schedules = newSchedules;
  state.schedulesNote = "";

  if (state.showTripIntroNext) {
    state.showTripIntroNext = false;
    state.screen = "onboarding-trip-intro";
  } else {
    state.screen = state.afterSchedules || "home";
  }
  await render();
}

// Nouvel écran onboarding : explication des déplacements
function renderOnboardingTripIntroScreen() {
  renderShell({
    title: "Les déplacements",
    subtitle: `Étape 5 sur ${ONBOARDING_STEPS}`,
    icon: "plane-takeoff",
    content: `
      <div class="flex flex-col items-center text-center pt-4 pb-6">
        <div class="grid place-items-center w-20 h-20 rounded-[24px] bg-brand-50 text-brand-600 ring-1 ring-brand-100 mb-5">
          ${icon("plane", "w-10 h-10")}
        </div>
        <h2 class="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Vous partez ?</h2>
        <p class="text-slate-500 max-w-sm leading-relaxed">
          Déclarez un <strong class="text-slate-700">déplacement</strong> pour signaler que vous êtes absent.
        </p>
      </div>
      <div class="space-y-3 mb-8">
        <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
          ${icon("calendar-range", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}
          <div>
            <p class="font-semibold text-slate-800 text-sm">By-passe vos horaires</p>
            <p class="text-xs text-slate-400 mt-0.5">Votre place est disponible 24h/24 pendant toute la période, même en dehors de vos plages habituelles.</p>
          </div>
        </div>
        <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
          ${icon("bell-ring", "w-5 h-5 text-amber-500 shrink-0 mt-0.5")}
          <div>
            <p class="font-semibold text-slate-800 text-sm">Alerte en cas de retour anticipé</p>
            <p class="text-xs text-slate-400 mt-0.5">Si vous annulez le déplacement alors que quelqu'un est garé, vos voisins en sont informés.</p>
          </div>
        </div>
        <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
          ${icon("layers", "w-5 h-5 text-emerald-500 shrink-0 mt-0.5")}
          <div>
            <p class="font-semibold text-slate-800 text-sm">Plusieurs déplacements possibles</p>
            <p class="text-xs text-slate-400 mt-0.5">Planifiez plusieurs absences à l'avance depuis l'onglet Déplacement.</p>
          </div>
        </div>
      </div>
      <button id="trip-intro-ok" class="${BTN_PRIMARY}">${btnContent("check", "J'ai compris")}</button>
    `,
  });

  document.getElementById("trip-intro-ok").addEventListener("click", () => {
    state.screen = "onboarding-notifications";
    render();
  });
}

function renderOnboardingNotificationsScreen() {
  const enabled = Notifications.isEnabled();

  renderShell({
    title: "Notifications",
    subtitle: `Étape ${ONBOARDING_STEPS} sur ${ONBOARDING_STEPS}`,
    icon: "bell-ring",
    content: `
      <div class="flex flex-col items-center text-center pt-4 pb-6">
        <div class="grid place-items-center w-20 h-20 rounded-[24px] bg-amber-50 text-amber-600 ring-1 ring-amber-100 mb-5">
          ${icon("bell-ring", "w-10 h-10")}
        </div>
        <h2 class="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Restez informé</h2>
        <p class="text-slate-500 max-w-sm leading-relaxed">
          Activez les notifications pour être prévenu <strong class="text-slate-700">en temps réel</strong> lorsqu'un voisin revient avant la fin de son déplacement.
        </p>
      </div>
      <div class="space-y-3 mb-6">
        <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
          ${icon("car", "w-5 h-5 text-rose-500 shrink-0 mt-0.5")}
          <div>
            <p class="font-semibold text-slate-800 text-sm">Retour anticipé</p>
            <p class="text-xs text-slate-400 mt-0.5">Quelqu'un est garé sur une place dont le propriétaire annule son absence ? Vous recevez une alerte.</p>
          </div>
        </div>
        <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
          ${icon("phone", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}
          <div>
            <p class="font-semibold text-slate-800 text-sm">Directement sur votre téléphone</p>
            <p class="text-xs text-slate-400 mt-0.5">Même si l'app est en arrière-plan, vous ne manquez pas l'info importante.</p>
          </div>
        </div>
      </div>
      <div class="mb-4">${notificationEnableHtml("onboarding-enable-notifs")}</div>
      <button id="notif-intro-ok" class="${BTN_PRIMARY}">${btnContent(enabled ? "check" : "arrow-right", enabled ? "C'est parti !" : "Continuer")}</button>
      ${!enabled && Notifications.permission !== "denied" ? `<button type="button" id="notif-intro-skip" class="w-full mt-3 text-sm text-slate-400 font-medium py-2 active:scale-95 transition">Plus tard</button>` : ""}
    `,
  });

  bindNotificationEnableButton("onboarding-enable-notifs", () => {
    renderOnboardingNotificationsScreen();
  });

  document.getElementById("notif-intro-ok").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  document.getElementById("notif-intro-skip")?.addEventListener("click", () => {
    state.screen = "home";
    render();
  });
}

function spotMetaHtml(spot) {
  const lines = [];

  if (spot.trip_line) {
    lines.push({
      icon: "plane",
      text: spot.trip_line,
      className: "text-brand-700",
    });
  }

  if (spot.schedule_lines?.length) {
    spot.schedule_lines.forEach((line) => {
      lines.push({
        icon: "clock",
        text: line,
        className: "text-slate-500",
      });
    });
  } else if (!spot.trip_line && !spot.schedules?.length) {
    lines.push({
      icon: "calendar-off",
      text: "Aucun horaire récurrent",
      className: "text-slate-400",
    });
  }

  if (spot.availability_hint) {
    const className =
      spot.status === "occupied"
        ? "text-amber-800 font-medium"
        : spot.status === "available"
          ? "text-emerald-700 font-medium"
          : "text-slate-400";
    lines.push({
      icon: spot.status === "occupied" ? "alarm-clock" : "info",
      text: spot.availability_hint,
      className,
    });
  }

  if (!lines.length) {
    return "";
  }

  return `<div class="mt-3 space-y-1.5">${lines
    .map(
      (line) =>
        `<p class="text-sm flex items-start gap-2 ${line.className}">${icon(line.icon, "w-4 h-4 shrink-0 mt-0.5")}<span>${escapeHtml(line.text)}</span></p>`,
    )
    .join("")}</div>`;
}

async function loadHomeData() {
  const profile = Storage.getProfile();
  const atDatetime = state.filterDatetime
    ? formatForApi(state.filterDatetime)
    : null;
  const [spotsData, alertsData] = await Promise.all([
    Backend.listSpots(profile?.number ?? null, atDatetime),
    Backend.getAlerts(),
  ]);
  state.spots = spotsData.spots;
  state.alerts = alertsData.alerts;
  await Notifications.processNewAlerts(alertsData.alerts);
}

function renderHomeScreen() {
  const profile = Storage.getProfile();
  const allSpots = state.spots;

  // Filtrage : par défaut masquer les hors-plage
  const visibleSpots = state.showOffHours
    ? allSpots
    : allSpots.filter((s) => s.status !== "off_hours");
  const hiddenCount = allSpots.length - visibleSpots.length;

  const available = allSpots.filter((s) => s.status === "available").length;

  const alertsHtml = state.alerts
    .map(
      (alert) => `
      <div class="bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-4 py-3.5 mb-3 flex justify-between items-start gap-3">
        <div class="flex items-start gap-2.5">
          ${icon("bell-ring", "w-5 h-5 text-amber-600 shrink-0 mt-0.5")}
          <p class="text-sm text-amber-900 font-medium">${escapeHtml(alert.message)}</p>
        </div>
        <button data-dismiss="${alert.id}" class="shrink-0 text-amber-500 hover:text-amber-700 p-1 -m-1 active:scale-90 transition">${icon("x", "w-4 h-4")}</button>
      </div>
    `,
    )
    .join("");

  const notificationBanner =
    Notifications.supported() &&
    !Notifications.isEnabled() &&
    Notifications.permission !== "denied"
      ? `<div class="mb-3 bg-white ring-1 ring-amber-200 rounded-2xl p-4 shadow-soft">
          <div class="flex items-start gap-3 mb-3">
            ${icon("bell-ring", "w-5 h-5 text-amber-500 shrink-0 mt-0.5")}
            <div>
              <p class="font-semibold text-slate-800 text-sm">Alertes retour anticipé</p>
              <p class="text-xs text-slate-400 mt-0.5">Recevez une notification si un propriétaire revient avant la fin de son déplacement.</p>
            </div>
          </div>
          ${notificationEnableHtml("home-enable-notifs")}
        </div>`
      : "";

  // Barre de filtre par date/heure
  const filterBar = filterBarHtml();

  const spotsHtml =
    visibleSpots.length === 0 && allSpots.length === 0
      ? `<div class="text-center py-16">
          <div class="grid place-items-center w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 mb-4">${icon("parking-square", "w-8 h-8")}</div>
          <p class="text-slate-500 font-medium">Aucune place enregistrée</p>
          <p class="text-slate-400 text-sm mt-1">Les places apparaissent ici une fois configurées.</p>
        </div>`
      : visibleSpots
          .map((spot) => {
            const isMine = profile && spot.number === profile.number;
            const canPark = spot.status === "available";
            const canUnpark = spot.status === "occupied" && spot.parked_by_me;
            const canUnparkAny = spot.status === "occupied";
            const occupationHtml =
              spot.status === "occupied" && spot.occupation_message
                ? `<p class="text-sm text-slate-500 flex items-center gap-2 mt-3">${icon("user", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.occupation_message)}</span></p>`
                : "";
            const phoneHtml = isMine
              ? spotContactPhoneHtml(spot)
              : spot.status !== "occupied" && spot.phone
                ? `<a href="${phoneTelHref(spot.phone)}" class="mt-2 inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`
                : "";
            const action = canPark
              ? `<button data-park="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("car", "w-4 h-4")}<span>Je me gare ici</span></button>`
              : canUnparkAny
                ? `<button data-unpark="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("log-out", "w-4 h-4")}<span>Libérer la place</span></button>`
                : "";
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
                      ${phoneHtml}
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
          })
          .join("");

  const offHoursBanner =
    !state.showOffHours && hiddenCount > 0
      ? `<button id="show-off-hours-btn" class="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 flex items-center justify-center gap-2 transition">
          ${icon("eye", "w-4 h-4")}
          <span>Afficher ${hiddenCount} place${hiddenCount > 1 ? "s" : ""} hors plage</span>
        </button>`
      : state.showOffHours && hiddenCount > 0
        ? `<button id="hide-off-hours-btn" class="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 flex items-center justify-center gap-2 transition">
            ${icon("eye-off", "w-4 h-4")}
            <span>Masquer les places hors plage</span>
          </button>`
        : "";

  const summaryText =
    allSpots.length === 0
      ? ""
      : available === 0
        ? `Aucune place disponible · ${allSpots.length} enregistrée${allSpots.length > 1 ? "s" : ""}`
        : `<span class="font-bold text-slate-800">${available}</span> place${available > 1 ? "s" : ""} dispo${available > 1 ? "s" : ""} sur ${allSpots.length}`;

  const summary =
    allSpots.length > 0
      ? `<div class="flex items-center justify-between mb-4 px-1">
          <p class="text-sm text-slate-500">${summaryText}</p>
          <button id="refresh-btn" class="inline-flex items-center gap-1.5 text-sm text-brand-600 font-semibold active:scale-95 transition">${icon("refresh-cw", "w-4 h-4")}<span>Actualiser</span></button>
        </div>`
      : "";

  renderShell({
    title: "Places de parking",
    subtitle: "Votre résidence",
    appLogo: true,
    showLogout: true,
    content: `${alertsHtml}${notificationBanner}${filterBar}${summary}<div id="spots-list">${spotsHtml}</div>${offHoursBanner}`,
    footer: appFooter({ activeTab: "home" }),
  });

  bindFilterBar();

  // Toggle hors plage
  document.getElementById("show-off-hours-btn")?.addEventListener("click", () => {
    state.showOffHours = true;
    renderHomeScreen();
  });
  document.getElementById("hide-off-hours-btn")?.addEventListener("click", () => {
    state.showOffHours = false;
    renderHomeScreen();
  });

  // Bouton détail de la place
  document.querySelectorAll("[data-spot-detail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = btn.dataset.spotDetail;
      state.selectedSpot = allSpots.find((s) => s.number === number) || null;
      state.screen = "spot-detail";
      render();
    });
  });

  // Bouton "Je me gare ici" → confirmation dialog
  document.querySelectorAll("[data-park]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const profile = Storage.getProfile();
      if (!profile) {
        showError("Profil requis pour se garer.");
        return;
      }
      const number = btn.dataset.park;
      const spot = allSpots.find((s) => s.number === number) || null;
      const myPhone =
        state.mySpot?.phone ||
        allSpots.find((s) => s.number === profile.number)?.phone ||
        "";
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
    });
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

  document
    .getElementById("refresh-btn")
    ?.addEventListener("click", async () => {
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

async function loadMySpot() {
  const profile = Storage.getProfile();
  if (!profile) return;
  state.mySpot = await Backend.getSpot(profile.number, profile.number);
  state.schedules = state.mySpot.schedules || [];
}

function collectTripsFromSpot(spot, spotNumber) {
  if (!spot) return [];

  const byId = new Map();
  for (const trip of spot.upcoming_trips || []) {
    byId.set(trip.id, { ...trip, spot_number: spotNumber });
  }
  if (spot.active_trip && !byId.has(spot.active_trip.id)) {
    byId.set(spot.active_trip.id, {
      ...spot.active_trip,
      spot_number: spotNumber,
    });
  }

  return Array.from(byId.values());
}

function mergeLinkedTrips(trips) {
  const groups = new Map();
  const singles = [];

  for (const trip of trips) {
    const base = {
      ...trip,
      linked_spots: [trip.spot_number],
      linked_trip_ids: [trip.id],
    };

    if (!trip.link_group) {
      singles.push(base);
      continue;
    }

    const existing = groups.get(trip.link_group);
    if (!existing) {
      groups.set(trip.link_group, base);
      continue;
    }

    if (!existing.linked_spots.includes(trip.spot_number)) {
      existing.linked_spots.push(trip.spot_number);
      existing.linked_trip_ids.push(trip.id);
    }
  }

  const merged = [...groups.values()].map((trip) => ({
    ...trip,
    linked_spots: [...trip.linked_spots].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
  }));

  return [...merged, ...singles].sort((a, b) =>
    String(a.depart_at).localeCompare(String(b.depart_at)),
  );
}

async function loadMyTrips() {
  const profile = Storage.getProfile();
  if (!profile) {
    state.allTrips = [];
    return;
  }

  const owned = Storage.getOwnedProfiles();
  const profiles =
    owned.length > 0
      ? owned
      : [{ number: profile.number, apartment: profile.apartment }];

  const spots = await Promise.all(
    profiles.map(async (p) => ({
      number: p.number,
      spot: await Backend.getSpot(p.number, profile.number),
    })),
  );

  const current = spots.find((s) => s.number === profile.number);
  state.mySpot = current?.spot ?? spots[0]?.spot ?? null;
  state.schedules = state.mySpot?.schedules || [];

  state.allTrips = mergeLinkedTrips(
    spots.flatMap(({ number, spot }) => collectTripsFromSpot(spot, number)),
  );
}

function ownedProfileCredentials(spotNumber, fallbackProfile) {
  const owned = Storage.getOwnedProfiles();
  return (
    owned.find((p) => p.number === spotNumber) ??
    (fallbackProfile?.number === spotNumber ? fallbackProfile : null)
  );
}

function settingRow(id, iconName, label, sublabel = "") {
  return `
    <button id="${id}" class="w-full flex items-center gap-3.5 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-4 shadow-sm active:scale-[0.99] transition text-left">
      <span class="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-900/5">${icon(iconName, "w-5 h-5")}</span>
      <span class="flex-1 min-w-0">
        <span class="block font-semibold text-slate-800">${escapeHtml(label)}</span>
        ${sublabel ? `<span class="block text-xs text-slate-400 truncate">${escapeHtml(sublabel)}</span>` : ""}
      </span>
      ${icon("chevron-right", "w-5 h-5 text-slate-300 shrink-0")}
    </button>`;
}

function tripsListHtml(upcomingTrips, showSpotNumber = false) {
  if (!upcomingTrips.length) {
    return `<div class="text-center py-10">
        <div class="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 mb-3">${icon("plane", "w-7 h-7")}</div>
        <p class="text-slate-500 font-medium text-sm">Aucun déplacement planifié</p>
        <p class="text-slate-400 text-xs mt-1">Ajoutez une absence pour libérer votre place.</p>
      </div>`;
  }

  return `<div class="space-y-3">${upcomingTrips
    .map(
      (trip) => {
        const linked = (trip.linked_spots?.length ?? 0) > 1;
        const spotLabel = linked
          ? `Places ${trip.linked_spots.join(", ")}`
          : `Place ${trip.spot_number}`;
        const showSpots = showSpotNumber || linked;

        return `
      <div class="bg-gradient-to-br from-brand-50 to-brand-100/60 ring-1 ring-brand-200 rounded-2xl p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0">
            ${icon("plane", "w-4 h-4 text-brand-500 shrink-0 mt-0.5")}
            <div class="min-w-0">
              ${showSpots ? `<p class="text-xs font-bold text-brand-700 mb-0.5">${escapeHtml(spotLabel)}</p>` : ""}
              ${linked ? `<p class="text-[11px] text-brand-600/80 mb-1">Lié · modif. et annulation synchronisées</p>` : ""}
              <p class="text-sm font-semibold text-brand-900">Du ${formatDateTime(trip.depart_at)}</p>
              <p class="text-xs text-brand-600">au ${formatDateTime(trip.return_at)}</p>
            </div>
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button data-edit-trip="${trip.id}" data-spot="${escapeHtml(trip.spot_number)}" data-depart="${escapeHtml(trip.depart_at)}" data-return="${escapeHtml(trip.return_at)}" data-link-group="${escapeHtml(trip.link_group || "")}" data-linked-spots="${escapeHtml((trip.linked_spots || []).join(","))}"
              class="flex items-center gap-1 text-xs text-brand-700 font-semibold bg-white/70 rounded-lg px-2 py-1.5 active:scale-95 transition">
              ${icon("pencil", "w-3.5 h-3.5")}<span>Modifier</span>
            </button>
            <button data-cancel-trip="${trip.id}" data-spot="${escapeHtml(trip.spot_number)}" data-linked-spots="${escapeHtml((trip.linked_spots || []).join(","))}"
              class="flex items-center gap-1 text-xs text-rose-600 font-semibold bg-rose-50 rounded-lg px-2 py-1.5 active:scale-95 transition">
              ${icon("x", "w-3.5 h-3.5")}<span>Annuler</span>
            </button>
          </div>
        </div>
      </div>
    `;
      },
    )
    .join("")}</div>`;
}

function bindTripListActions(profile, onUpdate) {
  document.querySelectorAll("[data-edit-trip]").forEach((btn) => {
    btn.onclick = () => {
      const linkedSpots = (btn.dataset.linkedSpots || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      state.editingTrip = {
        id: parseInt(btn.dataset.editTrip, 10),
        spot_number: btn.dataset.spot,
        depart_at: btn.dataset.depart,
        return_at: btn.dataset.return,
        link_group: btn.dataset.linkGroup || null,
        linked_spots: linkedSpots.length ? linkedSpots : null,
      };
      state.screen = "trip-form";
      render();
    };
  });

  document.querySelectorAll("[data-cancel-trip]").forEach((btn) => {
    btn.onclick = async () => {
      const tripId = parseInt(btn.dataset.cancelTrip, 10);
      const spotNumber = btn.dataset.spot || profile.number;
      const linkedSpots = (btn.dataset.linkedSpots || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const creds = ownedProfileCredentials(spotNumber, profile);
      if (!creds?.apartment) {
        showError("Profil de place introuvable.");
        return;
      }
      setButtonLoading(btn, true);
      try {
        await Backend.cancelTripById(
          spotNumber,
          creds.apartment,
          tripId,
        );
        if (linkedSpots.length > 1) {
          showToast(
            `Déplacement annulé pour ${linkedSpots.length} places (${linkedSpots.join(", ")}).`,
          );
        } else {
          showToast("Déplacement annulé.");
        }
        await onUpdate();
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    };
  });
}

function renderTripsScreen() {
  const profile = Storage.getProfile();
  const upcomingTrips = state.allTrips || [];
  const showSpotNumber = Storage.getOwnedProfiles().length > 1;

  renderShell({
    title: "Déplacements",
    subtitle: "Absences planifiées",
    icon: "plane-takeoff",
    showLogout: true,
    footer: appFooter({
      activeTab: "trip",
      actions: `<button type="button" id="add-trip-btn" class="${BTN_PRIMARY}">${btnContent("plus", "Ajouter un déplacement")}</button>`,
    }),
    content: `
      <p class="text-slate-500 mb-5 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("info", "w-5 h-5 text-brand-500 shrink-0")}<span>Pendant un déplacement, votre place est disponible 24h/24, même en dehors de vos horaires habituels.</span></p>
      ${tripsListHtml(upcomingTrips, showSpotNumber)}
    `,
  });

  document.getElementById("add-trip-btn")?.addEventListener("click", () => {
    state.editingTrip = null;
    state.screen = "trip-form";
    render();
  });

  bindTripListActions(profile, async () => {
    await loadMyTrips();
    renderTripsScreen();
  });

  bindTabBar();
}

function renderMySpotScreen() {
  const profile = Storage.getProfile();
  const spot = state.mySpot;
  const occupiedBanner =
    spot?.status === "occupied" && spot?.parked_contact_phone
      ? `<div class="${CARD} bg-amber-50 ring-1 ring-amber-200">
          <p class="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">${icon("car", "w-4 h-4 shrink-0")}<span>Quelqu'un est garé sur votre place${spot.parked_by_spot_number ? ` (place ${escapeHtml(spot.parked_by_spot_number)})` : ""}</span></p>
          ${spotContactPhoneHtml(spot, { className: "" })}
        </div>`
      : "";

  renderShell({
    title: "Ma place",
    subtitle: `Place ${profile?.number || ""}`,
    icon: "settings-2",
    showLogout: true,
    footer: appFooter({ activeTab: "my-spot" }),
    content: `
      <div class="space-y-3">
        ${occupiedBanner}
        <div class="${CARD} flex items-center gap-4">
          <span class="grid place-items-center w-16 h-16 shrink-0 rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-2xl">${escapeHtml(profile?.number || "")}</span>
          <div class="min-w-0">
            <div class="mb-1.5">${statusPill(spot?.status, spot?.status_label || "")}</div>
            <p class="text-sm text-slate-500 flex items-center gap-1.5">${icon("phone", "w-4 h-4")}<span>${spot?.phone ? escapeHtml(spot.phone) : "Téléphone non renseigné"}</span></p>
          </div>
        </div>

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

  bindTabBar();
}

// Écran détail d'une place (au clic depuis l'accueil)
function renderSpotDetailScreen() {
  const spot = state.selectedSpot;
  if (!spot) {
    state.screen = "home";
    render();
    return;
  }

  const scheduleRows =
    spot.schedules?.length > 0
      ? spot.schedules
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
          .join("")
      : `<p class="text-sm text-slate-400 py-3 text-center flex items-center justify-center gap-2">${icon("calendar-off", "w-4 h-4")} Aucun horaire récurrent</p>`;

  const tripSection =
    spot.upcoming_trips?.length > 0
      ? `
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
      `
      : spot.trip_line
        ? `
        <div class="${CARD}">
          <div class="flex items-start gap-2">
            ${icon("plane", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}
            <p class="text-sm text-brand-700 font-medium">${escapeHtml(spot.trip_line)}</p>
          </div>
        </div>
      `
        : "";

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
          ${spot.availability_hint
            ? `<div class="text-sm flex items-start gap-2 ${spot.status === "available" ? "text-emerald-700" : spot.status === "occupied" ? "text-amber-700" : "text-slate-400"} bg-slate-50 rounded-xl px-3 py-2.5">
                ${icon("info", "w-4 h-4 shrink-0 mt-0.5")}
                <span>${escapeHtml(spot.availability_hint)}</span>
              </div>`
            : ""}
          ${spotContactPhoneHtml(spot, { className: "mt-3" })}
        </div>

        <div class="${CARD}">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Disponibilités habituelles</p>
          <div class="divide-y divide-slate-100">
            ${scheduleRows}
          </div>
        </div>

        ${tripSection}
      </div>
    `,
  });
}

function renderTripFormScreen() {
  const editing = state.editingTrip;
  const linkedSpots = editing?.linked_spots?.length > 1 ? editing.linked_spots : null;
  const now = new Date();
  const defaultDepart = editing
    ? datetimeToLocal(editing.depart_at)
    : toDatetimeLocal(now);
  const defaultReturn = editing
    ? datetimeToLocal(editing.return_at)
    : toDatetimeLocal(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));

  const subtitle = linkedSpots
    ? `Places ${linkedSpots.join(", ")}`
    : editing
      ? "Modifier les dates"
      : "Libérez votre place";

  renderShell({
    title: editing ? "Modifier le déplacement" : "Nouveau déplacement",
    subtitle,
    icon: "luggage",
    showLogout: true,
    back: () => {
      state.editingTrip = null;
      state.screen = "trip";
      render();
    },
    footer: appFooter({
      activeTab: "trip",
      actions: `<button form="trip-form" type="submit" id="trip-submit" class="${BTN_PRIMARY}">${btnContent("check", editing ? "Enregistrer les modifications" : "Confirmer le déplacement")}</button>`,
    }),
    content: `
      ${linkedSpots ? `<p class="text-slate-600 mb-5 bg-amber-50 ring-1 ring-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("link", "w-5 h-5 text-amber-600 shrink-0")}<span>Ce déplacement est lié à ${linkedSpots.length} places. Les modifications seront appliquées sur toutes.</span></p>` : `<p class="text-slate-500 mb-5 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("info", "w-5 h-5 text-brand-500 shrink-0")}<span>Votre place sera disponible 24h/24 pendant toute la période indiquée. Cela by-passe vos plages horaires habituelles.</span></p>`}
      <form id="trip-form" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-takeoff", "w-4 h-4 text-brand-500")}<span>Départ</span></label>
          <input type="datetime-local" id="depart-at" value="${defaultDepart}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-landing", "w-4 h-4 text-brand-500")}<span>Retour</span></label>
          <input type="datetime-local" id="return-at" value="${defaultReturn}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        ${editing ? "" : applyToSpotsCheckboxesHtml("trip")}
      </form>
    `,
  });

  bindTabBar();

  document.getElementById("trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const profile = Storage.getProfile();
    const departAt = formatForApi(document.getElementById("depart-at").value);
    const returnAt = formatForApi(document.getElementById("return-at").value);
    const btn = document.getElementById("trip-submit");
    setButtonLoading(btn, true);

    try {
      if (editing) {
        const spotNumber = editing.spot_number || profile.number;
        const creds = ownedProfileCredentials(spotNumber, profile);
        if (!creds?.apartment) {
          showError("Profil de place introuvable.");
          setButtonLoading(btn, false);
          return;
        }
        await Backend.updateTrip(
          spotNumber,
          creds.apartment,
          editing.id,
          departAt,
          returnAt,
        );
        if (linkedSpots) {
          showToast(
            `Déplacement modifié pour ${linkedSpots.length} places (${linkedSpots.join(", ")}).`,
          );
        } else {
          showToast("Déplacement modifié.");
        }
      } else {
        const targets = getSelectedApplyTargets("trip");
        if (!targets) {
          showError("Sélectionnez au moins une place.");
          setButtonLoading(btn, false);
          return;
        }

        const linkGroup = targets.length > 1 ? crypto.randomUUID() : null;

        await Promise.all(
          targets.map((target) =>
            Backend.createTrip(
              target.number,
              target.apartment,
              departAt,
              returnAt,
              linkGroup,
            ),
          ),
        );

        applyTargetsToast("Déplacement créé", targets);
      }
      state.editingTrip = null;
      state.screen = "trip";
      await loadMyTrips();
      await render();
    } catch (err) {
      showError(err.message);
      setButtonLoading(btn, false);
    }
  });
}

function renderChangeNumberScreen() {
  renderShell({
    title: "Changer de place",
    icon: "replace",
    showLogout: true,
    back: () => {
      state.screen = "my-spot";
      render();
    },
    footer: `<button form="change-form" type="submit" id="change-submit" class="${BTN_PRIMARY}">${btnContent("check", "Confirmer")}</button>`,
    content: `
      <p class="text-slate-500 mb-5">Entrez le nouveau numéro. Il doit être libre.</p>
      <form id="change-form" class="space-y-4">
        <div class="relative">
          ${icon("hash", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
          <input type="text" inputmode="numeric" maxlength="3" id="new-number" placeholder="Ex. 042" class="${INPUT} text-lg text-center">
        </div>
      </form>
    `,
  });

  document
    .getElementById("change-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const profile = Storage.getProfile();
      const raw = document.getElementById("new-number").value.trim();
      if (!raw) {
        showError("Numéro requis.");
        return;
      }
      const newNumber = raw.padStart(3, "0");
      const btn = document.getElementById("change-submit");
      setButtonLoading(btn, true);

      try {
        await Backend.changeNumber(
          profile.number,
          profile.apartment,
          newNumber,
        );
        Storage.updateSpotNumber(newNumber);
        state.screen = "my-spot";
        await render();
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    });
}

function renderPhoneScreen() {
  const current = state.mySpot?.phone || "";

  renderShell({
    title: "Téléphone",
    icon: "phone",
    showLogout: true,
    back: () => {
      state.screen = "my-spot";
      render();
    },
    footer: `<button form="phone-form" type="submit" id="phone-submit" class="${BTN_PRIMARY}">${btnContent("check", "Enregistrer")}</button>`,
    content: `
      <p class="text-slate-500 mb-3">Un numéro pour vous joindre en cas de problème (optionnel).</p>
      <p class="mb-5 text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-3.5 py-3 flex items-start gap-2">${icon("eye", "w-4 h-4 mt-0.5 shrink-0")}<span>Visible par les voisins <strong>lorsque votre place est libre</strong>. Laissez vide pour le retirer.</span></p>
      <form id="phone-form" class="space-y-4">
        ${phoneInputHtml(current)}
        <p class="text-center text-xs text-slate-400">Format français · 10 chiffres</p>
        ${
          current
            ? `<button type="button" id="phone-delete" class="w-full inline-flex items-center justify-center gap-2 text-rose-600 font-semibold rounded-2xl py-3.5 ring-1 ring-rose-200 bg-rose-50 active:scale-[0.98] transition">${icon("trash-2", "w-5 h-5")}<span>Supprimer mon numéro</span></button>`
            : ""
        }
      </form>
    `,
  });

  const phoneCtrl = bindPhoneInput(
    document.querySelector("[data-phone-input]"),
  );

  const savePhone = async (phone) => {
    const profile = Storage.getProfile();
    const btn = document.getElementById("phone-submit");
    setButtonLoading(btn, true);
    try {
      await Backend.updatePhone(profile.number, profile.apartment, phone);
      await loadMySpot();
      state.screen = "my-spot";
      render();
    } catch (err) {
      showError(err.message);
      setButtonLoading(btn, false);
    }
  };

  document
    .getElementById("phone-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const phone = readOptionalPhone(phoneCtrl);
      if (phone === undefined) return;
      await savePhone(phone);
    });

  document
    .getElementById("phone-delete")
    ?.addEventListener("click", async () => {
      phoneCtrl.clear();
      await savePhone(null);
    });
}

function formatDateTime(value) {
  if (!value) return "";
  const dt = new Date(String(value).replace(" ", "T"));
  return dt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

const FILTER_PRESETS = [
  { id: "now", label: "Maintenant", icon: "refresh-cw" },
  { id: "tonight", label: "Ce soir", icon: "moon" },
  { id: "tomorrow_am", label: "Dem. matin", icon: "sun" },
  { id: "tomorrow_pm", label: "Dem. soir", icon: "alarm-clock" },
  { id: "custom", label: "Autre", icon: "calendar-range" },
];

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

function filterBarHtml() {
  const activePreset = state.filterPreset || detectFilterPreset(state.filterDatetime);
  const { date: filterDate, time: filterTime } = splitFilterDatetime(state.filterDatetime);
  const hasActiveFilter = activePreset !== "now";

  const chips = FILTER_PRESETS.map((preset) => {
    const active = activePreset === preset.id;
    return `<button type="button" data-filter-preset="${preset.id}" class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition active:scale-95 ${
      active
        ? "bg-brand-600 text-white shadow-glow ring-2 ring-brand-400/30"
        : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
    }">${icon(preset.icon, "w-3.5 h-3.5")}<span>${preset.label}</span></button>`;
  }).join("");

  const customPanel =
    activePreset === "custom"
      ? `<div class="mt-3 pt-3 border-t border-slate-100">
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
        </div>`
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
      <div class="filter-chips-scroll flex gap-2 overflow-x-auto py-3 px-1 snap-x snap-mandatory">${chips}</div>
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
        if (!state.filterDatetime || detectFilterPreset(state.filterDatetime) !== "custom") {
          state.filterDatetime = getFilterPresetDatetime("tomorrow_am") || toDatetimeLocal(new Date());
        }
        renderHomeScreen();
        return;
      }

      state.filterDatetime = getFilterPresetDatetime(preset);
      await applyFilterAndReload();
    };
  });

  const clearBtn = document.getElementById("filter-clear");
  if (clearBtn) {
    clearBtn.onclick = async () => {
      state.filterPreset = "now";
      state.filterDatetime = "";
      await applyFilterAndReload();
    };
  }

  const onCustomChange = async () => {
    const date = document.getElementById("filter-date")?.value;
    const time = document.getElementById("filter-time")?.value;
    state.filterDatetime = joinFilterDatetime(date, time);
    state.filterPreset = "custom";
    if (state.filterDatetime) await applyFilterAndReload();
  };

  const dateInput = document.getElementById("filter-date");
  const timeInput = document.getElementById("filter-time");
  if (dateInput) dateInput.onchange = onCustomChange;
  if (timeInput) timeInput.onchange = onCustomChange;
}

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Convertit une valeur "YYYY-MM-DD HH:MM:SS" en format datetime-local
function datetimeToLocal(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  return toDatetimeLocal(d);
}

function formatForApi(datetimeLocal) {
  return datetimeLocal.replace("T", " ");
}

async function routeAfterAuth() {
  const profile = Storage.getProfile();
  state.screen = profile ? "home" : "spot";
  await render();
  if (Storage.isAuthValid()) startAlertPolling();
}

async function render() {
  try {
    switch (state.screen) {
      case "code":
        renderCodeScreen();
        break;
      case "spot":
        renderSpotNumberScreen();
        break;
      case "apartment":
        renderApartmentScreen();
        break;
      case "onboarding-phone":
        renderOnboardingPhoneScreen();
        break;
      case "schedules":
        renderSchedulesScreen();
        break;
      case "onboarding-trip-intro":
        renderOnboardingTripIntroScreen();
        break;
      case "onboarding-notifications":
        renderOnboardingNotificationsScreen();
        break;
      case "home":
        // Skeleton pendant le chargement
        renderShell({
          title: "Places de parking",
          subtitle: "Votre résidence",
          appLogo: true,
          showLogout: true,
          content: `<div class="space-y-3">${[1, 2, 3].map(() => skeletonCard()).join("")}</div>`,
          footer: appFooter({ activeTab: "home" }),
        });
        await loadHomeData();
        renderHomeScreen();
        break;
      case "my-spot":
        renderShell({
          title: "Ma place",
          icon: "settings-2",
          showLogout: true,
          content: skeletonMySpot(),
          footer: appFooter({ activeTab: "my-spot" }),
        });
        await loadMySpot();
        renderMySpotScreen();
        break;
      case "spot-detail":
        if (!state.selectedSpot) {
          state.screen = "home";
          await render();
          break;
        }
        // Chargement des détails complets si nécessaire (upcoming_trips absent dans la liste)
        if (!state.selectedSpot.upcoming_trips) {
          renderShell({
            title: `Place ${state.selectedSpot.number}`,
            icon: "parking-square",
            back: () => { state.screen = "home"; render(); },
            showLogout: true,
            content: skeletonMySpot(),
          });
          const fullSpot = await Backend.getSpot(state.selectedSpot.number, viewerSpotNumber());
          state.selectedSpot = fullSpot;
        }
        renderSpotDetailScreen();
        break;
      case "trip":
        renderShell({
          title: "Déplacements",
          icon: "plane-takeoff",
          showLogout: true,
          content: skeletonMySpot(),
          footer: appFooter({ activeTab: "trip" }),
        });
        await loadMyTrips();
        renderTripsScreen();
        break;
      case "trip-form":
        renderTripFormScreen();
        break;
      case "change-number":
        renderChangeNumberScreen();
        break;
      case "phone":
        renderPhoneScreen();
        break;
      default:
        if (!Storage.isAuthValid()) {
          state.screen = "code";
          renderCodeScreen();
        } else {
          await routeAfterAuth();
        }
    }
  } catch (err) {
    showToast(err.message, "error");
    if (state.screen === "home") {
      renderHomeScreen();
    }
  }
}

async function init() {
  if (!Storage.isAuthValid()) {
    state.screen = "code";
  } else if (Storage.getProfile()) {
    const profile = Storage.getProfile();
    if (profile && !Storage.getSavedProfileEntry(profile.number)?.apartment) {
      Storage.setProfile(profile.number, profile.apartment);
    }
    state.screen = "home";
  } else {
    const session = Storage.get();
    // Numéro en attente de confirmation après un switch de profil
    if (session?.spot_number && !session?.apartment) {
      state.spotNumber = session.spot_number;
      state.spotExists = true;
      state.switchingProfile = true;
      state.screen = "apartment";
    } else {
      state.screen = "spot";
    }
  }
  await render();
  if (Storage.isAuthValid()) startAlertPolling();
}

init();
