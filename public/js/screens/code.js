// Écran de saisie du code à 6 chiffres.

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
