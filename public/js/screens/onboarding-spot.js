// Onboarding étapes 1-3 : saisie numéro de place → appartement → téléphone.

function renderSpotNumberScreen() {
  const totalSteps = state.spotExists ? 2 : ONBOARDING_STEPS;
  const savedProfiles = Storage.getSavedProfiles();
  const savedProfilesHtml = savedProfiles.length > 0
    ? `<div class="mt-8">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center mb-3">Ou reconnectez-vous</p>
        <div class="flex flex-wrap justify-center gap-2">
          ${savedProfiles.map(savedProfileButtonHtml).join("")}
        </div>
      </div>`
    : "";

  renderShell({
    title: state.addingSpot ? "Ajouter une place" : "Votre place",
    subtitle: `Étape 1 sur ${totalSteps}`,
    icon: "hash",
    back: state.addingSpot ? () => cancelAddSpot() : undefined,
    content: `
      <p class="text-slate-500 mb-8">${state.addingSpot ? "Enregistrez un autre numéro de place pour y accéder depuis ce menu." : "Quel est votre numéro de place ?"} <span class="text-slate-400">(3 chiffres max)</span></p>
      <form id="spot-form" class="space-y-8">
        <div class="flex justify-center gap-3">
          ${[0, 1, 2].map((i) => `
            <input type="text" inputmode="numeric" maxlength="1" data-digit="${i}"
              class="spot-digit w-20 h-24 text-center text-4xl font-extrabold bg-white ring-1 ring-slate-200 rounded-3xl shadow-soft focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
          `).join("")}
        </div>
        ${stepNextOnlyHtml("Continuer")}
      </form>
      ${savedProfilesHtml}
    `,
  });

  bindSpotDigitsInputs();
  bindQuickConnectButtons();
  bindSpotForm();
}

function savedProfileButtonHtml(number) {
  return `
    <button type="button" data-quick-connect="${escapeHtml(number)}"
      class="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 shadow-soft active:scale-95 transition">
      <span class="font-extrabold text-brand-600 text-lg">${escapeHtml(number)}</span>
      <span class="text-xs text-slate-400">Place ${escapeHtml(number)}</span>
      ${icon("log-in", "w-4 h-4 text-slate-300")}
    </button>
  `;
}

function bindSpotDigitsInputs() {
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
  digits[0]?.focus();
}

function bindQuickConnectButtons() {
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
}

function bindSpotForm() {
  document.getElementById("spot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const digits = document.querySelectorAll(".spot-digit");
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

  bindStepBack(handleApartmentBack);
  document.getElementById("apartment-form").addEventListener("submit", handleApartmentSubmit);
}

function handleApartmentBack() {
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
}

async function handleApartmentSubmit(e) {
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
      await handleApartmentConfirm(apartment);
    } else {
      state.onboardingApartment = apartment;
      state.screen = "onboarding-phone";
    }
    render();
  } catch (err) {
    showError(err.message);
    setButtonLoading(btn, false);
  }
}

async function handleApartmentConfirm(apartment) {
  const result = await Backend.confirmSpot(state.spotNumber, apartment);
  Storage.setProfile(state.spotNumber, apartment);
  if (state.switchingProfile && state.screenBeforeProfileSwitch) {
    await afterProfileSwitch();
    return;
  }
  state.switchingProfile = false;
  finishAddSpotFlow();

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

  const phoneCtrl = bindPhoneInput(document.querySelector("[data-phone-input]"));

  document.getElementById("onboarding-phone-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = readOptionalPhone(phoneCtrl);
    if (phone === undefined) return;
    await finishRegistration(phone);
  });

  document.getElementById("phone-skip").addEventListener("click", async () => {
    await finishRegistration(null);
  });
}

async function finishRegistration(phone) {
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
}
