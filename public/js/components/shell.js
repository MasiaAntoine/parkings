// renderShell : header + main + footer commun à tous les écrans.

// Écrans où la pastille profil doit apparaître en haut à droite.
const PROFILE_SCREENS = [
  "home",
  "my-spot",
  "trip",
  "change-number",
  "phone",
  "schedules",
  "spot-detail",
  "onboarding-trip-intro",
  "onboarding-notifications",
  "trip-form",
];

function shouldShowProfile() {
  if (!Storage.isAuthValid() || state.screen === "code") return false;
  if (["spot", "apartment", "onboarding-phone"].includes(state.screen)) return false;

  const onSchedulesNotMine =
    state.screen === "schedules"
      && state.afterSchedules !== "my-spot"
      && state.afterSchedules !== "home";
  if (onSchedulesNotMine) return false;

  if (!Storage.getProfile()) return false;
  return PROFILE_SCREENS.includes(state.screen);
}

function shellLeadingHtml({ back, appLogo, iconName }) {
  if (back) {
    return `<button id="appbar-back" type="button" class="shrink-0 -ml-2 p-2 text-slate-600 hover:text-slate-900 rounded-xl active:scale-90 transition" aria-label="Retour">${icon("chevron-left", "w-6 h-6")}</button>`;
  }
  if (appLogo) {
    return `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-soft"><img src="/logo.svg" alt="" class="w-full h-full" width="40" height="40"></span>`;
  }
  if (iconName) {
    return `<span class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">${icon(iconName, "w-5 h-5")}</span>`;
  }
  return `<span class="w-10 shrink-0" aria-hidden="true"></span>`;
}

function shellTrailingHtml(profile, visible) {
  if (!visible || !profile) {
    return `<span class="w-10 shrink-0" aria-hidden="true"></span>`;
  }
  return `<button id="appbar-profile" type="button" class="shrink-0 flex items-center gap-1 h-10 px-3 text-slate-700 bg-white ring-1 ring-slate-200 rounded-2xl active:scale-90 transition text-sm font-bold" aria-label="Profil">
     <span class="text-brand-600 font-extrabold">${escapeHtml(profile.number)}</span>
     ${icon("chevron-down", "w-4 h-4 text-slate-400 shrink-0")}
   </button>`;
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
  const leading = shellLeadingHtml({ back, appLogo, iconName });
  const trailing = shellTrailingHtml(profile, canShowProfile);

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
      ?.addEventListener("click", (e) => showProfileMenu(e.currentTarget));
  }
}
