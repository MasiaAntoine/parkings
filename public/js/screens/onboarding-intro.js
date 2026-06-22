// Onboarding étapes 5-6 : pédagogie déplacements + activation notifications.

function tripIntroCardHtml(iconName, iconColor, title, description) {
  return `
    <div class="flex items-start gap-3 bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-soft">
      ${icon(iconName, `w-5 h-5 ${iconColor} shrink-0 mt-0.5`)}
      <div>
        <p class="font-semibold text-slate-800 text-sm">${escapeHtml(title)}</p>
        <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(description)}</p>
      </div>
    </div>`;
}

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
        ${tripIntroCardHtml("calendar-range", "text-brand-500", "By-passe vos horaires", "Votre place est disponible 24h/24 pendant toute la période, même en dehors de vos plages habituelles.")}
        ${tripIntroCardHtml("bell-ring", "text-amber-500", "Alerte en cas de retour anticipé", "Si vous annulez le déplacement alors que quelqu'un est garé, vos voisins en sont informés.")}
        ${tripIntroCardHtml("layers", "text-emerald-500", "Plusieurs déplacements possibles", "Planifiez plusieurs absences à l'avance depuis l'onglet Déplacement.")}
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
        ${tripIntroCardHtml("car", "text-rose-500", "Retour anticipé", "Quelqu'un est garé sur une place dont le propriétaire annule son absence ? Vous recevez une alerte.")}
        ${tripIntroCardHtml("phone", "text-brand-500", "Directement sur votre téléphone", "Même si l'app est en arrière-plan, vous ne manquez pas l'info importante.")}
      </div>
      <div class="mb-4">${notificationEnableHtml("onboarding-enable-notifs")}</div>
      <button id="notif-intro-ok" class="${BTN_PRIMARY}">${btnContent(enabled ? "check" : "arrow-right", enabled ? "C'est parti !" : "Continuer")}</button>
      ${!enabled && Notifications.permission !== "denied" ? `<button type="button" id="notif-intro-skip" class="w-full mt-3 text-sm text-slate-400 font-medium py-2 active:scale-95 transition">Plus tard</button>` : ""}
    `,
  });

  bindNotificationEnableButton(
    "onboarding-enable-notifs",
    renderOnboardingNotificationsScreen,
  );
  document.getElementById("notif-intro-ok").addEventListener("click", () => {
    state.screen = "home";
    render();
  });
  document.getElementById("notif-intro-skip")?.addEventListener("click", () => {
    state.screen = "home";
    render();
  });
}
