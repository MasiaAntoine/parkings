const DAYS = [
  { id: 0, label: "Lun" },
  { id: 1, label: "Mar" },
  { id: 2, label: "Mer" },
  { id: 3, label: "Jeu" },
  { id: 4, label: "Ven" },
  { id: 5, label: "Sam" },
  { id: 6, label: "Dim" },
];

const STATUS_STYLES = {
  available: "bg-green-100 text-green-800 border-green-200",
  occupied: "bg-red-100 text-red-800 border-red-200",
  off_hours: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_ICONS = {
  available: "circle-check",
  occupied: "car",
  off_hours: "clock",
};

function icon(name, className = "w-5 h-5 shrink-0") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function btnContent(iconName, label) {
  return `<span class="inline-flex items-center justify-center gap-2">${icon(iconName, "w-4 h-4")}<span>${label}</span></span>`;
}

function backButtonHtml(id = "back-btn") {
  return `<button type="button" id="${id}" class="w-full text-slate-600 text-sm py-2 mt-2 inline-flex items-center justify-center gap-2">${icon("arrow-left", "w-4 h-4")}<span>Retour</span></button>`;
}

function bindBackButton(id, handler) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", handler);
  }
}

const app = document.getElementById("app");
let state = {
  screen: "loading",
  error: "",
  spotNumber: "",
  spotExists: false,
  schedules: [],
  afterSchedules: "home",
  alerts: [],
  spots: [],
  mySpot: null,
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
  state.schedules = [];
  state.afterSchedules = "home";
  state.spots = [];
  state.alerts = [];
  state.mySpot = null;
  state.error = "";
  state.screen = "code";
  render();
}

function renderShell(title, content, footer = "", titleIcon = null, showLogout = false) {
  app.innerHTML = `
        <header class="mb-6">
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    ${titleIcon ? icon(titleIcon, "w-7 h-7 text-blue-600 shrink-0") : ""}
                    <h1 class="text-2xl font-bold text-slate-800 truncate">${escapeHtml(title)}</h1>
                </div>
                ${showLogout ? `<button id="header-logout-btn" type="button" class="shrink-0 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" aria-label="Déconnexion">${icon("log-out", "w-5 h-5")}</button>` : ""}
            </div>
            ${state.error ? `<p class="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">${icon("circle-alert", "w-4 h-4 mt-0.5 shrink-0")}<span>${escapeHtml(state.error)}</span></p>` : ""}
        </header>
        <main>${content}</main>
        ${footer ? `<footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 max-w-md mx-auto">${footer}</footer>` : ""}
    `;
  refreshIcons();
  if (showLogout) {
    document
      .getElementById("header-logout-btn")
      ?.addEventListener("click", disconnect);
  }
}

function renderCodeScreen() {
  renderShell(
    "Parking",
    `
        <div class="flex flex-col items-center mb-6">
            <img src="/logo.svg" alt="" class="w-20 h-20 mb-4" width="80" height="80">
        </div>
        <p class="text-slate-600 mb-6 flex items-start gap-2">${icon("shield-check", "w-5 h-5 text-slate-400 mt-0.5")}<span>Entrez le code d'accès de la résidence.</span></p>
        <form id="code-form" class="space-y-4">
            <div class="relative">
                ${icon("lock-keyhole", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
                <input type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*"
                    id="access-code" placeholder="000000" autocomplete="one-time-code"
                    class="w-full text-center text-2xl tracking-[0.5em] border border-slate-300 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 hover:bg-blue-700 transition">
                ${btnContent("log-in", "Accéder")}
            </button>
        </form>
    `,
    "",
    "car",
  );

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
  renderShell(
    "Votre place",
    `
        <p class="text-slate-600 mb-6 flex items-start gap-2">${icon("parking-square", "w-5 h-5 text-slate-400 mt-0.5")}<span>Entrez votre numéro de place (3 chiffres max).</span></p>
        <form id="spot-form" class="space-y-6">
            <div class="flex justify-center gap-3">
                ${[0, 1, 2]
                  .map(
                    (i) => `
                    <input type="text" inputmode="numeric" maxlength="1" data-digit="${i}"
                        class="spot-digit w-16 h-16 text-center text-2xl font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                `,
                  )
                  .join("")}
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 hover:bg-blue-700 transition">
                ${btnContent("arrow-right", "Continuer")}
            </button>
            ${backButtonHtml()}
        </form>
    `,
    "",
    "hash",
    true,
  );

  bindBackButton("back-btn", () => {
    state.spotNumber = "";
    state.spotExists = false;
    state.screen = "code";
    render();
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
      state.screen = "name";
      render();
    } catch (err) {
      showError(err.message);
    }
  });
}

function renderNameScreen() {
  const isConfirm = state.spotExists;
  renderShell(
    isConfirm ? "Confirmer votre place" : "Enregistrer votre place",
    `
        <div class="flex items-center gap-2 mb-2 text-slate-600">
            ${icon("map-pin", "w-5 h-5 text-blue-600")}
            <p>Place <span class="font-bold text-slate-800">${escapeHtml(state.spotNumber)}</span></p>
        </div>
        <p class="text-slate-600 mb-6 flex items-start gap-2">${icon("user-check", "w-5 h-5 text-slate-400 mt-0.5")}<span>${isConfirm ? "Entrez votre prénom pour confirmer." : "Entrez votre prénom."}</span></p>
        <form id="name-form" class="space-y-4">
            <div class="relative">
                ${icon("user", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
                <input type="text" id="first-name" maxlength="50" autocomplete="given-name"
                    placeholder="Prénom"
                    class="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 hover:bg-blue-700 transition">
                ${btnContent(isConfirm ? "check" : "user-plus", isConfirm ? "Confirmer" : "Enregistrer")}
            </button>
            ${backButtonHtml()}
        </form>
    `,
    "",
    "user-check",
    true,
  );

  bindBackButton("back-btn", () => {
    state.screen = "spot";
    render();
  });

  document.getElementById("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("first-name").value.trim();
    if (!firstName) {
      showError("Prénom requis.");
      return;
    }
    try {
      let result;
      if (state.spotExists) {
        result = await Backend.confirmSpot(state.spotNumber, firstName);
      } else {
        result = await Backend.registerSpot(state.spotNumber, firstName);
      }
      Storage.setProfile(state.spotNumber, firstName);
      if (!result.has_schedules) {
        state.schedules = defaultSchedules();
        state.afterSchedules = "home";
        state.screen = "schedules";
      } else {
        state.screen = "home";
      }
      render();
    } catch (err) {
      showError(err.message);
    }
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

  renderShell(
    "Horaires de disponibilité",
    `
        <p class="text-slate-600 mb-4 flex items-start gap-2">${icon("clock", "w-5 h-5 text-slate-400 mt-0.5")}<span>Indiquez quand votre place est habituellement disponible.</span></p>
        <form id="schedules-form" class="space-y-3">
            ${DAYS.map((day) => {
              const schedule = schedules.find((s) => s.day_of_week === day.id);
              const checked = !!schedule;
              return `
                    <div class="border border-slate-200 rounded-xl p-3 bg-white">
                        <label class="flex items-center gap-3 mb-2">
                            <input type="checkbox" data-day="${day.id}" class="day-check w-5 h-5 rounded" ${checked ? "checked" : ""}>
                            ${icon("calendar-days", "w-4 h-4 text-slate-400")}
                            <span class="font-medium">${day.label}</span>
                        </label>
                        <div class="flex gap-2 items-center day-times ${checked ? "" : "opacity-40 pointer-events-none"}">
                            <input type="time" data-day-start="${day.id}" value="${schedule?.start_time || "08:00"}"
                                class="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm">
                            ${icon("arrow-right", "w-4 h-4 text-slate-400")}
                            <input type="time" data-day-end="${day.id}" value="${schedule?.end_time || "18:00"}"
                                class="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm">
                        </div>
                    </div>
                `;
            }).join("")}
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 mt-4 hover:bg-blue-700 transition">
                ${btnContent("save", "Enregistrer")}
            </button>
            ${backButtonHtml()}
        </form>
    `,
    "",
    "calendar-clock",
    true,
  );

  bindBackButton("back-btn", () => {
    if (state.afterSchedules === "my-spot") {
      state.screen = "my-spot";
    } else {
      state.screen = "name";
    }
    render();
  });

  document.querySelectorAll(".day-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const dayId = parseInt(checkbox.dataset.day, 10);
      const times = checkbox.closest(".border").querySelector(".day-times");
      if (checkbox.checked) {
        times.classList.remove("opacity-40", "pointer-events-none");
      } else {
        times.classList.add("opacity-40", "pointer-events-none");
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
          profile.first_name,
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
  const alertsHtml = state.alerts
    .map(
      (alert) => `
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 flex justify-between items-start gap-3">
            <div class="flex items-start gap-2">
                ${icon("triangle-alert", "w-5 h-5 text-amber-600 shrink-0 mt-0.5")}
                <p class="text-sm text-amber-900">${escapeHtml(alert.message)}</p>
            </div>
            <button data-dismiss="${alert.id}" class="text-amber-700 text-sm font-medium shrink-0 inline-flex items-center gap-1">${icon("x", "w-4 h-4")}<span>Fermer</span></button>
        </div>
    `,
    )
    .join("");

  const spotsHtml =
    state.spots.length === 0
      ? `<div class="text-center py-8 text-slate-500">${icon("parking-square", "w-10 h-10 mx-auto mb-3 text-slate-300")}<p>Aucune place enregistrée pour le moment.</p></div>`
      : state.spots
          .map((spot) => {
            const isMine = profile && spot.number === profile.number;
            const canPark = spot.status === "available";
            const canUnpark = spot.status === "occupied";
            const statusIcon = STATUS_ICONS[spot.status] || "circle-help";
            const occupationHtml =
              spot.status === "occupied" && spot.occupation_message
                ? `<p class="text-sm mb-3 flex items-start gap-2 opacity-90">${icon("user", "w-4 h-4 mt-0.5 shrink-0")}<span>${escapeHtml(spot.occupation_message)}</span></p>`
                : "";
            return `
                <div class="border rounded-xl p-4 mb-3 bg-white ${STATUS_STYLES[spot.status]} ${isMine ? "ring-2 ring-blue-400" : ""}">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xl font-bold inline-flex items-center gap-2">
                            ${icon("map-pin", "w-5 h-5")}
                            Place ${escapeHtml(spot.number)}
                            ${isMine ? icon("star", "w-4 h-4 text-blue-600 fill-blue-600") : ""}
                        </span>
                        <span class="text-sm font-medium px-2 py-1 rounded-full bg-white/60 inline-flex items-center gap-1">
                            ${icon(statusIcon, "w-3.5 h-3.5")}
                            ${escapeHtml(spot.status_label)}
                        </span>
                    </div>
                    ${occupationHtml}
                    <div class="flex gap-2">
                        ${canPark ? `<button data-park="${spot.number}" class="flex-1 bg-green-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-green-700">${btnContent("car", "Je suis garé")}</button>` : ""}
                        ${canUnpark ? `<button data-unpark="${spot.number}" class="flex-1 bg-slate-700 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-slate-800">${btnContent("unlock", "Libérer la place")}</button>` : ""}
                    </div>
                </div>
            `;
          })
          .join("");

  renderShell(
    "Places de parking",
    `
        ${alertsHtml}
        <div id="spots-list">${spotsHtml}</div>
        <button id="refresh-btn" class="w-full mt-4 text-blue-600 text-sm font-medium py-2 inline-flex items-center justify-center gap-2">${icon("refresh-cw", "w-4 h-4")}<span>Actualiser</span></button>
    `,
    `
        <button id="my-spot-btn" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700">
            ${btnContent("settings", `Ma place${profile ? ` (${profile.number})` : ""}`)}
        </button>
    `,
    "layout-grid",
    true,
  );

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

  document.getElementById("refresh-btn").addEventListener("click", async () => {
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

function renderMySpotScreen() {
  const profile = Storage.getProfile();
  const spot = state.mySpot;
  const trip = spot?.active_trip;

  renderShell(
    "Ma place",
    `
        <div class="space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-sm text-slate-500 inline-flex items-center gap-1">${icon("hash", "w-4 h-4")}<span>Numéro</span></p>
                <p class="text-2xl font-bold">${escapeHtml(profile?.number || "")}</p>
                <p class="mt-2 text-sm inline-flex items-center gap-2">
                    ${icon(STATUS_ICONS[spot?.status] || "circle-help", "w-4 h-4 text-slate-500")}
                    <span><span class="font-medium">Statut :</span> ${escapeHtml(spot?.status_label || "")}</span>
                </p>
            </div>

            ${
              trip
                ? `
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p class="font-medium text-blue-900 mb-1 inline-flex items-center gap-2">${icon("plane", "w-5 h-5")}<span>Déplacement en cours</span></p>
                    <p class="text-sm text-blue-800 flex items-start gap-2">${icon("calendar-range", "w-4 h-4 mt-0.5 shrink-0")}<span>Du ${formatDateTime(trip.depart_at)} au ${formatDateTime(trip.return_at)}</span></p>
                    <button id="cancel-trip-btn" class="mt-3 w-full bg-white border border-blue-300 text-blue-800 text-sm font-semibold rounded-lg py-2.5">
                        ${btnContent("x-circle", "Annuler le déplacement")}
                    </button>
                </div>
            `
                : `
                <button id="trip-btn" class="w-full bg-white border border-slate-300 text-slate-800 font-semibold rounded-xl py-3.5 hover:bg-slate-50">
                    ${btnContent("plane-takeoff", "Je pars en déplacement")}
                </button>
            `
            }

            <button id="edit-schedules-btn" class="w-full bg-white border border-slate-300 text-slate-800 font-semibold rounded-xl py-3.5 hover:bg-slate-50">
                ${btnContent("clock", "Modifier les horaires")}
            </button>

            <button id="change-number-btn" class="w-full bg-white border border-slate-300 text-slate-800 font-semibold rounded-xl py-3.5 hover:bg-slate-50">
                ${btnContent("replace", "Changer de numéro de place")}
            </button>
        </div>
    `,
    `
        <button id="back-home-btn" class="w-full bg-slate-200 text-slate-800 font-semibold rounded-xl py-3.5 hover:bg-slate-300">
            ${btnContent("home", "Retour à l'accueil")}
        </button>
    `,
    "settings",
    true,
  );

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

  document.getElementById("trip-btn")?.addEventListener("click", () => {
    state.screen = "trip";
    render();
  });

  document
    .getElementById("cancel-trip-btn")
    ?.addEventListener("click", async () => {
      try {
        await Backend.cancelTrip(profile.number, profile.first_name);
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

  renderShell(
    "Déplacement",
    `
        <p class="text-slate-600 mb-6 flex items-start gap-2">${icon("info", "w-5 h-5 text-slate-400 mt-0.5")}<span>Votre place sera disponible 24h/24 pendant cette période.</span></p>
        <form id="trip-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1 inline-flex items-center gap-2">${icon("plane-takeoff", "w-4 h-4")}<span>Départ</span></label>
                <input type="datetime-local" id="depart-at" value="${defaultDepart}" required
                    class="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1 inline-flex items-center gap-2">${icon("plane-landing", "w-4 h-4")}<span>Retour</span></label>
                <input type="datetime-local" id="return-at" value="${defaultReturn}" required
                    class="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 hover:bg-blue-700 transition">
                ${btnContent("check", "Confirmer le déplacement")}
            </button>
            <button type="button" id="trip-cancel" class="w-full text-slate-600 text-sm py-2 inline-flex items-center justify-center gap-2">${icon("arrow-left", "w-4 h-4")}<span>Annuler</span></button>
        </form>
    `,
    "",
    "luggage",
    true,
  );

  document.getElementById("trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const profile = Storage.getProfile();
    const departRaw = document.getElementById("depart-at").value;
    const returnRaw = document.getElementById("return-at").value;
    const departAt = formatForApi(departRaw);
    const returnAt = formatForApi(returnRaw);

    try {
      await Backend.createTrip(
        profile.number,
        profile.first_name,
        departAt,
        returnAt,
      );
      state.screen = "my-spot";
      render();
    } catch (err) {
      showError(err.message);
    }
  });

  document.getElementById("trip-cancel").addEventListener("click", () => {
    state.screen = "my-spot";
    render();
  });
}

function renderChangeNumberScreen() {
  renderShell(
    "Changer de place",
    `
        <p class="text-slate-600 mb-6 flex items-start gap-2">${icon("replace", "w-5 h-5 text-slate-400 mt-0.5")}<span>Entrez le nouveau numéro (si la place n'est pas déjà prise).</span></p>
        <form id="change-form" class="space-y-4">
            <div class="relative">
                ${icon("hash", "w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none")}
                <input type="text" inputmode="numeric" maxlength="3" id="new-number" placeholder="Ex: 042"
                    class="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-4 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-xl py-4 hover:bg-blue-700 transition">
                ${btnContent("check", "Confirmer")}
            </button>
            <button type="button" id="change-cancel" class="w-full text-slate-600 text-sm py-2 inline-flex items-center justify-center gap-2">${icon("arrow-left", "w-4 h-4")}<span>Annuler</span></button>
        </form>
    `,
    "",
    "replace",
    true,
  );

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
          profile.first_name,
          newNumber,
        );
        Storage.updateSpotNumber(newNumber);
        state.screen = "my-spot";
        render();
      } catch (err) {
        showError(err.message);
      }
    });

  document.getElementById("change-cancel").addEventListener("click", () => {
    state.screen = "my-spot";
    render();
  });
}

function formatDateTime(value) {
  const dt = new Date(value);
  return dt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
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
  if (profile) {
    state.screen = "home";
  } else {
    state.screen = "spot";
  }
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
      case "name":
        renderNameScreen();
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
