// Barre de navigation basse (4 onglets) + bind des actions.

const TABS = [
  { id: "home", iconName: "home", label: "Accueil" },
  { id: "my-spot", iconName: "settings-2", label: "Ma place" },
  { id: "schedules", iconName: "calendar-range", label: "Horaires" },
  { id: "trip", iconName: "plane-takeoff", label: "Déplacement" },
];

function tabBarHtml(activeTab) {
  return `
    <div class="flex items-center bg-white/95 backdrop-blur-xl rounded-2xl ring-1 ring-slate-200 shadow-glow p-1 gap-0.5">
      ${TABS.map(
        (tab) => `
        <button data-tab="${tab.id}" class="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors min-w-0
          ${activeTab === tab.id ? "bg-brand-50 text-brand-600" : "text-slate-400 active:bg-slate-50"}">
          ${icon(tab.iconName, "w-5 h-5 shrink-0")}
          <span class="text-[9px] font-semibold leading-none truncate max-w-full px-0.5">${tab.label}</span>
        </button>`,
      ).join("")}
    </div>
  `;
}

function appFooter({ activeTab, actions = "" } = {}) {
  if (actions) {
    return `${actions}<div class="mt-3">${tabBarHtml(activeTab)}</div>`;
  }
  return tabBarHtml(activeTab);
}

// Lie les boutons d'onglet. Re-rechargent leur écran via render() pour homogénéité.
function bindTabBar() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = async () => {
      const target = btn.dataset.tab;
      const isPureNav = ["home", "trip", "my-spot"].includes(target);
      if (target === state.screen && !isPureNav) {
        return;
      }

      try {
        if (target === "schedules") {
          await navigateToSchedules();
        } else {
          state.editingTrip = null;
          state.screen = target;
          await render();
        }
      } catch (err) {
        showError(err.message);
      }
    };
  });
}

async function navigateToSchedules() {
  const profile = Storage.getProfile();
  if (!profile) return;
  const spot = await Backend.getSpot(profile.number, profile.number);
  state.schedules = spot.schedules || [];
  state.afterSchedules = "home";
  state.schedulesNote = "";
  state.showTripIntroNext = false;
  state.screen = "schedules";
  await render();
}
