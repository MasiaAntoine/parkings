// Écrans d'édition du profil : téléphone, changement de numéro de place.

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
