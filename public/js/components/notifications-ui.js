// UI pour activer les notifications + polling des alertes en background.

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

// Carte d'état + bouton toggle pour activer/désactiver les notifications.
// Renvoie "" si le navigateur ne supporte pas les notifications.
function notificationToggleCardHtml() {
  if (!Notifications.supported()) return "";

  const enabled = Notifications.isEnabled();
  const blocked = Notifications.permission === "denied";

  const statusLine = enabled
    ? `<p class="font-semibold text-emerald-700 text-sm flex items-center gap-2">${icon("check-circle-2", "w-4 h-4 shrink-0")}<span>Notifications activées</span></p>
       <p class="text-xs text-slate-400 mt-0.5">Vous serez prévenu en cas de retour anticipé.</p>`
    : blocked
      ? `<p class="font-semibold text-slate-700 text-sm flex items-center gap-2">${icon("bell-off", "w-4 h-4 shrink-0 text-slate-400")}<span>Notifications bloquées</span></p>
         <p class="text-xs text-slate-400 mt-0.5">Autorisez-les dans les réglages de votre navigateur.</p>`
      : `<p class="font-semibold text-slate-700 text-sm flex items-center gap-2">${icon("bell-off", "w-4 h-4 shrink-0 text-slate-400")}<span>Notifications désactivées</span></p>
         <p class="text-xs text-slate-400 mt-0.5">Activez-les pour être prévenu en cas de retour anticipé.</p>`;

  const action = enabled
    ? `<button type="button" id="notif-toggle-btn" class="shrink-0 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 active:scale-95 transition">${icon("bell-off", "w-3.5 h-3.5")}<span>Désactiver</span></button>`
    : blocked
      ? ""
      : `<button type="button" id="notif-toggle-btn" class="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg px-3 py-2 active:scale-95 transition">${icon("bell-ring", "w-3.5 h-3.5")}<span>Activer</span></button>`;

  return `
    <div class="${CARD} flex items-start gap-3">
      <span class="grid place-items-center w-10 h-10 shrink-0 rounded-xl ${enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"} ring-1 ring-slate-900/5">${icon(enabled ? "bell-ring" : "bell", "w-5 h-5")}</span>
      <div class="flex-1 min-w-0">${statusLine}</div>
      ${action}
    </div>
  `;
}

// Bind le bouton de la card. onUpdate est rappelé après chaque changement.
function bindNotificationToggleCard(onUpdate) {
  const btn = document.getElementById("notif-toggle-btn");
  if (!btn) return;

  btn.onclick = async () => {
    setButtonLoading(btn, true);
    try {
      if (Notifications.isEnabled()) {
        Notifications.disable();
        showToast("Notifications désactivées.", "info");
      } else {
        const result = await Notifications.enable();
        if (result === "granted") {
          showToast("Notifications activées.");
        } else if (result === "denied") {
          showToast("Notifications refusées.", "warning");
        }
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

function onVisibilityPollAlerts() {
  if (document.visibilityState === "visible" && Storage.isAuthValid()) {
    pollAlerts();
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
