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
  alerts: [],
  spots: [],
  mySpot: null,
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

function showError(message) {
  state.error = message;
  render();
  setTimeout(() => {
    state.error = "";
    render();
  }, 4000);
}

function disconnect() {
  Storage.logout();
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.schedules = [];
  state.afterSchedules = "home";
  state.spots = [];
  state.alerts = [];
  state.mySpot = null;
  state.error = "";
  state.screen = "code";
  render();
}

function shouldShowLogout(explicit = false) {
  if (explicit) return true;
  if (!Storage.isAuthValid() || state.screen === "code") return false;
  if (["spot", "apartment", "onboarding-phone"].includes(state.screen))
    return false;
  if (state.screen === "schedules" && state.afterSchedules !== "my-spot")
    return false;
  return [
    "home",
    "my-spot",
    "trip",
    "change-number",
    "phone",
    "schedules",
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
  const canLogout = shouldShowLogout(showLogout);

  const leading = back
    ? `<button id="appbar-back" type="button" class="shrink-0 -ml-2 p-2 text-slate-600 hover:text-slate-900 rounded-xl active:scale-90 transition" aria-label="Retour">${icon("chevron-left", "w-6 h-6")}</button>`
    : appLogo
      ? `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-soft"><img src="/logo.svg" alt="" class="w-full h-full" width="40" height="40"></span>`
      : iconName
        ? `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">${icon(iconName, "w-5 h-5")}</span>`
        : `<span class="w-10 shrink-0" aria-hidden="true"></span>`;

  const trailing = canLogout
    ? `<button id="appbar-logout" type="button" class="shrink-0 grid place-items-center w-10 h-10 text-slate-600 hover:text-rose-600 bg-white ring-1 ring-slate-200 rounded-2xl active:scale-90 transition" aria-label="Déconnexion">${icon("log-out", "w-5 h-5")}</button>`
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

  if (state.error) {
    showToast(state.error);
  }
  if (back) {
    document.getElementById("appbar-back")?.addEventListener("click", back);
  }
  if (canLogout) {
    document
      .getElementById("appbar-logout")
      ?.addEventListener("click", disconnect);
  }
}

function showToast(message) {
  const existing = document.getElementById("app-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.className =
    "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-md px-5 safe-top pointer-events-none";
  toast.innerHTML = `
    <div class="animate-pop pointer-events-auto flex items-start gap-2 rounded-2xl bg-rose-600 text-white px-4 py-3 shadow-glow">
      ${icon("circle-alert", "w-5 h-5 mt-0.5 shrink-0")}
      <span class="text-sm font-medium">${escapeHtml(message)}</span>
    </div>`;
  document.body.appendChild(toast);
  refreshIcons();
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
        <p class="text-slate-500 mt-1 mb-8 max-w-[20rem]">Entrez le code à 6 chiffres reçu sur <strong class="text-slate-700">WhatsApp</strong>.</p>
      </div>
      <form id="code-form" class="space-y-4">
        <div class="relative">
          ${icon("lock-keyhole", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
          <input type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*"
            id="access-code" placeholder="••••••" autocomplete="one-time-code"
            class="w-full text-center text-3xl tracking-[0.4em] font-bold bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        <button type="submit" class="${BTN_PRIMARY}">${btnContent("arrow-right", "Accéder")}</button>
      </form>
      <p class="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">${icon("shield-check", "w-4 h-4")}<span>Aucun compte, aucune donnée personnelle.</span></p>
    `,
  });

  document.getElementById("code-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("access-code").value.trim();
    try {
      await Backend.verifyCode(code);
      Storage.setAuth();
      await routeAfterAuth();
    } catch (err) {
      showError(err.message);
    }
  });
}

function renderSpotNumberScreen() {
  const totalSteps = state.spotExists ? 2 : 3;
  renderShell({
    title: "Votre place",
    subtitle: `Étape 1 sur ${totalSteps}`,
    icon: "hash",
    content: `
      <p class="text-slate-500 mb-8">Quel est votre numéro de place ? <span class="text-slate-400">(3 chiffres max)</span></p>
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
  renderShell({
    title: isConfirm ? "Confirmer la place" : "Enregistrer la place",
    subtitle: isConfirm ? "Étape 2 sur 2" : "Étape 2 sur 3",
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
    state.screen = "spot";
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
      try {
        if (state.spotExists) {
          const result = await Backend.confirmSpot(state.spotNumber, apartment);
          Storage.setProfile(state.spotNumber, apartment);
          if (!result.has_schedules) {
            state.schedules = defaultSchedules();
            state.schedulesBackScreen = "apartment";
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
    subtitle: "Étape 3 sur 3",
    icon: "phone",
    content: `
      <p class="text-slate-500 mb-5">Un numéro pour vous joindre en cas de problème. <span class="text-slate-400">(optionnel)</span></p>
      <form id="onboarding-phone-form" class="space-y-4">
        ${phoneInputHtml()}
        <p class="text-center text-xs text-slate-400">Format français · 10 chiffres</p>
        <p class="text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-3.5 py-3 flex items-start gap-2">${icon("eye", "w-4 h-4 mt-0.5 shrink-0")}<span>Ce numéro sera <strong>visible par tous</strong> dans l'app. Vous pourrez le modifier plus tard.</span></p>
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
      state.onboardingApartment = "";
      if (!result.has_schedules) {
        state.schedules = defaultSchedules();
        state.schedulesBackScreen = "onboarding-phone";
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

function defaultSchedules() {
  return [1, 2, 3, 4, 5].map((dow) => ({
    day_of_week: dow,
    start_time: "08:00",
    end_time: "18:00",
  }));
}

function renderSchedulesScreen() {
  const schedules = state.schedules.length
    ? state.schedules
    : defaultSchedules();
  const fromMySpot = state.afterSchedules === "my-spot";

  const goBackFromSchedules = () => {
    state.screen =
      state.afterSchedules === "my-spot"
        ? "my-spot"
        : state.schedulesBackScreen;
    render();
  };

  renderShell({
    title: "Disponibilités",
    subtitle: "Quand votre place est libre",
    icon: "calendar-clock",
    showLogout: fromMySpot,
    footer: `
      <div class="flex gap-3">
        <button type="button" id="schedules-back" class="${BTN_STEP_BACK}">${btnContent("chevron-left", "Retour")}</button>
        <button form="schedules-form" type="submit" class="${BTN_STEP_NEXT}">${btnContent("check", "Enregistrer")}</button>
      </div>
    `,
    content: `
      <p class="text-slate-500 mb-5">Activez les jours et précisez les plages horaires.</p>
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
              <div class="flex gap-2 items-center mt-3 day-times ${checked ? "" : "hidden"}">
                <input type="time" data-day-start="${day.id}" value="${schedule?.start_time || "08:00"}"
                  class="flex-1 bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                ${icon("arrow-right", "w-4 h-4 text-slate-400 shrink-0")}
                <input type="time" data-day-end="${day.id}" value="${schedule?.end_time || "18:00"}"
                  class="flex-1 bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
              </div>
            </div>
          `;
        }).join("")}
      </form>
    `,
  });

  document
    .getElementById("schedules-back")
    ?.addEventListener("click", goBackFromSchedules);

  document.querySelectorAll(".day-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const wrapper = checkbox.closest(".rounded-2xl");
      const times = wrapper.querySelector(".day-times");
      if (checkbox.checked) {
        times.classList.remove("hidden");
        wrapper.classList.add("ring-brand-200");
        wrapper.classList.remove("ring-slate-200", "bg-white/60");
        wrapper.classList.add("bg-white");
      } else {
        times.classList.add("hidden");
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

      if (newSchedules.length === 0) {
        showError("Sélectionnez au moins un jour.");
        return;
      }

      try {
        await Backend.saveSchedules(
          profile.number,
          profile.apartment,
          newSchedules,
        );
        state.screen = state.afterSchedules || "home";
        render();
      } catch (err) {
        showError(err.message);
      }
    });
}

async function loadHomeData() {
  const profile = Storage.getProfile();
  const [spotsData, alertsData] = await Promise.all([
    Backend.listSpots(profile?.number ?? null),
    Backend.getAlerts(),
  ]);
  state.spots = spotsData.spots;
  state.alerts = alertsData.alerts;
}

function renderHomeScreen() {
  const profile = Storage.getProfile();
  const activeSpotsInHours = state.spots.filter(spot => spot.status !== "off_hours");
  const available = activeSpotsInHours.filter((s) => s.status === "available").length;

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

  const spotsHtml =
    activeSpotsInHours.length === 0
      ? `<div class="text-center py-16">
          <div class="grid place-items-center w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 mb-4">${icon("parking-square", "w-8 h-8")}</div>
          <p class="text-slate-500 font-medium">Aucune place disponible</p>
          <p class="text-slate-400 text-sm mt-1">Aucune place n'est active pour le moment.</p>
        </div>`
      : activeSpotsInHours
          .map((spot) => {
            const isMine = profile && spot.number === profile.number;
            const canPark = spot.status === "available";
            const canUnpark = spot.status === "occupied";
            const occupationHtml =
              spot.status === "occupied" && spot.occupation_message
                ? `<p class="text-sm text-slate-500 flex items-center gap-2 mt-3">${icon("user", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.occupation_message)}</span></p>`
                : "";
            const phoneHtml = spot.phone
              ? `<a href="${phoneTelHref(spot.phone)}" class="mt-2 inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`
              : "";
            const action = canPark
              ? `<button data-park="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("car", "w-4 h-4")}<span>Je me gare ici</span></button>`
              : canUnpark
                ? `<button data-unpark="${spot.number}" class="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition shadow-soft">${icon("log-out", "w-4 h-4")}<span>Libérer la place</span></button>`
                : "";
            return `
              <div class="${CARD} mb-3 ${isMine ? "ring-2 ring-brand-400" : ""}">
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
                ${occupationHtml}
                ${action ? `<div class="mt-4">${action}</div>` : ""}
              </div>
            `;
          })
          .join("");

  const summaryText =
    available === 0
      ? "Aucune place disponible"
      : `<span class="font-bold text-slate-800">${available}</span> place${available > 1 ? "s" : ""} dispo${available > 1 ? "s" : ""} sur ${activeSpotsInHours.length}`;

  const summary =
    activeSpotsInHours.length > 0
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
    content: `${alertsHtml}${summary}<div id="spots-list">${spotsHtml}</div>`,
    footer: `<button id="my-spot-btn" class="${BTN_PRIMARY}">${btnContent("settings-2", `Ma place${profile ? ` · ${profile.number}` : ""}`)}</button>`,
  });

  document.querySelectorAll("[data-park]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const profile = Storage.getProfile();
      if (!profile) {
        showError("Profil requis pour se garer.");
        return;
      }
      try {
        await Backend.park(btn.dataset.park, profile.number);
        await loadHomeData();
        render();
      } catch (err) {
        showError(err.message);
      }
    });
  });

  document.querySelectorAll("[data-unpark]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await Backend.unpark(btn.dataset.unpark);
        await loadHomeData();
        render();
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
        render();
      } catch (err) {
        showError(err.message);
      }
    });
  });

  document
    .getElementById("refresh-btn")
    ?.addEventListener("click", async () => {
      try {
        await loadHomeData();
        render();
      } catch (err) {
        showError(err.message);
      }
    });

  document.getElementById("my-spot-btn").addEventListener("click", () => {
    state.screen = "my-spot";
    render();
  });
}

async function loadMySpot() {
  const profile = Storage.getProfile();
  if (!profile) return;
  state.mySpot = await Backend.getSpot(profile.number);
  state.schedules = state.mySpot.schedules || [];
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

function renderMySpotScreen() {
  const profile = Storage.getProfile();
  const spot = state.mySpot;
  const trip = spot?.active_trip;

  const tripBlock = trip
    ? `
      <div class="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-3xl p-5 shadow-glow">
        <p class="font-bold mb-1 flex items-center gap-2">${icon("plane", "w-5 h-5")}<span>Déplacement en cours</span></p>
        <p class="text-sm text-white/85 flex items-start gap-2">${icon("calendar-range", "w-4 h-4 mt-0.5 shrink-0")}<span>Du ${formatDateTime(trip.depart_at)}<br>au ${formatDateTime(trip.return_at)}</span></p>
        <button id="cancel-trip-btn" class="mt-4 w-full inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl py-3 active:scale-[0.98] transition backdrop-blur">${icon("x-circle", "w-4 h-4")}<span>Annuler le déplacement</span></button>
      </div>`
    : `<button id="trip-btn" class="${BTN_SECONDARY}">${btnContent("plane-takeoff", "Je pars en déplacement")}</button>`;

  renderShell({
    title: "Ma place",
    subtitle: `Place ${profile?.number || ""}`,
    icon: "settings-2",
    showLogout: true,
    back: () => {
      state.screen = "home";
      render();
    },
    footer: `<button id="back-home-btn" class="${BTN_PRIMARY}">${btnContent("layout-grid", "Voir les places")}</button>`,
    content: `
      <div class="space-y-3">
        <div class="${CARD} flex items-center gap-4">
          <span class="grid place-items-center w-16 h-16 shrink-0 rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-2xl">${escapeHtml(profile?.number || "")}</span>
          <div class="min-w-0">
            <div class="mb-1.5">${statusPill(spot?.status, spot?.status_label || "")}</div>
            <p class="text-sm text-slate-500 flex items-center gap-1.5">${icon("phone", "w-4 h-4")}<span>${spot?.phone ? escapeHtml(spot.phone) : "Téléphone non renseigné"}</span></p>
          </div>
        </div>

        ${tripBlock}

        <div class="pt-2 space-y-3">
          ${settingRow("edit-schedules-btn", "clock", "Horaires de disponibilité")}
          ${settingRow("edit-phone-btn", "phone", "Téléphone", spot?.phone ? spot.phone : "Optionnel · visible par tous")}
          ${settingRow("change-number-btn", "replace", "Changer de numéro de place")}
        </div>
      </div>
    `,
  });

  document.getElementById("back-home-btn").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  document
    .getElementById("edit-schedules-btn")
    ?.addEventListener("click", async () => {
      try {
        const profile = Storage.getProfile();
        const spot = await Backend.getSpot(profile.number);
        state.schedules = spot.schedules.length
          ? spot.schedules
          : defaultSchedules();
        state.afterSchedules = "my-spot";
        state.screen = "schedules";
        render();
      } catch (err) {
        showError(err.message);
      }
    });

  document.getElementById("edit-phone-btn")?.addEventListener("click", () => {
    state.screen = "phone";
    render();
  });

  document.getElementById("trip-btn")?.addEventListener("click", () => {
    state.screen = "trip";
    render();
  });

  document
    .getElementById("cancel-trip-btn")
    ?.addEventListener("click", async () => {
      try {
        await Backend.cancelTrip(profile.number, profile.apartment);
        await loadMySpot();
        render();
      } catch (err) {
        showError(err.message);
      }
    });

  document
    .getElementById("change-number-btn")
    ?.addEventListener("click", () => {
      state.screen = "change-number";
      render();
    });
}

function renderTripScreen() {
  const now = new Date();
  const defaultDepart = toDatetimeLocal(now);
  const defaultReturn = toDatetimeLocal(
    new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
  );

  renderShell({
    title: "Déplacement",
    subtitle: "Libérez votre place",
    icon: "luggage",
    showLogout: true,
    back: () => {
      state.screen = "my-spot";
      render();
    },
    footer: `<button form="trip-form" type="submit" class="${BTN_PRIMARY}">${btnContent("check", "Confirmer le déplacement")}</button>`,
    content: `
      <p class="text-slate-500 mb-5 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("info", "w-5 h-5 text-brand-500 shrink-0")}<span>Votre place sera disponible 24h/24 pendant toute la période indiquée.</span></p>
      <form id="trip-form" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-takeoff", "w-4 h-4 text-brand-500")}<span>Départ</span></label>
          <input type="datetime-local" id="depart-at" value="${defaultDepart}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-landing", "w-4 h-4 text-brand-500")}<span>Retour</span></label>
          <input type="datetime-local" id="return-at" value="${defaultReturn}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
      </form>
    `,
  });

  document.getElementById("trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const profile = Storage.getProfile();
    const departAt = formatForApi(document.getElementById("depart-at").value);
    const returnAt = formatForApi(document.getElementById("return-at").value);

    try {
      await Backend.createTrip(
        profile.number,
        profile.apartment,
        departAt,
        returnAt,
      );
      state.screen = "my-spot";
      render();
    } catch (err) {
      showError(err.message);
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
    footer: `<button form="change-form" type="submit" class="${BTN_PRIMARY}">${btnContent("check", "Confirmer")}</button>`,
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

      try {
        await Backend.changeNumber(
          profile.number,
          profile.apartment,
          newNumber,
        );
        Storage.updateSpotNumber(newNumber);
        state.screen = "my-spot";
        render();
      } catch (err) {
        showError(err.message);
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
    footer: `<button form="phone-form" type="submit" class="${BTN_PRIMARY}">${btnContent("check", "Enregistrer")}</button>`,
    content: `
      <p class="text-slate-500 mb-3">Un numéro pour vous joindre en cas de problème (optionnel).</p>
      <p class="mb-5 text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-3.5 py-3 flex items-start gap-2">${icon("eye", "w-4 h-4 mt-0.5 shrink-0")}<span>Ce numéro sera <strong>visible par tous</strong>. Laissez vide pour le retirer.</span></p>
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
    try {
      await Backend.updatePhone(profile.number, profile.apartment, phone);
      await loadMySpot();
      state.screen = "my-spot";
      render();
    } catch (err) {
      showError(err.message);
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
  const dt = new Date(value);
  return dt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatForApi(datetimeLocal) {
  return datetimeLocal.replace("T", " ");
}

async function routeAfterAuth() {
  const profile = Storage.getProfile();
  state.screen = profile ? "home" : "spot";
  await render();
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
      case "home":
        await loadHomeData();
        renderHomeScreen();
        break;
      case "my-spot":
        await loadMySpot();
        renderMySpotScreen();
        break;
      case "trip":
        renderTripScreen();
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
    showError(err.message);
    if (state.screen === "home") {
      renderHomeScreen();
    }
  }
}

async function init() {
  if (!Storage.isAuthValid()) {
    state.screen = "code";
  } else if (Storage.getProfile()) {
    state.screen = "home";
  } else {
    state.screen = "spot";
  }
  await render();
}

init();
