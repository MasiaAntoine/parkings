// Écran des plages horaires (jour de semaine cochable + horaires) avec multi-application.

function dayScheduleRowHtml(day, schedule) {
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
}

function renderSchedulesScreen() {
  const schedules = state.schedules;
  const note = state.schedulesNote;
  const isOnboarding = state.showTripIntroNext;

  const goBackFromSchedules = () => {
    state.schedulesNote = "";
    state.screen = state.afterSchedules === "my-spot" ? "my-spot" : state.schedulesBackScreen;
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
    subtitle: isOnboarding ? `Étape 4 sur ${ONBOARDING_STEPS}` : "Quand votre place est libre",
    icon: "calendar-range",
    showLogout: !isOnboarding,
    content: `
      ${note ? `<div class="mb-5 text-sm text-brand-800 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">${icon("info", "w-5 h-5 text-brand-500 shrink-0 mt-0.5")}<span>${escapeHtml(note)}</span></div>` : ""}
      <p class="text-slate-500 mb-5">Activez les jours et précisez les plages horaires. Sans jour sélectionné, la place reste hors plage (sauf en déplacement).</p>
      <form id="schedules-form" class="space-y-3">
        ${DAYS.map((day) => dayScheduleRowHtml(day, schedules.find((s) => s.day_of_week === day.id))).join("")}
        ${applyToSpotsCheckboxesHtml("schedules")}
      </form>
    `,
    footer: schedulesFooter,
  });

  if (isOnboarding) {
    document.getElementById("schedules-back")?.addEventListener("click", goBackFromSchedules);
  } else {
    bindTabBar();
  }

  bindScheduleCheckboxes();
  document.getElementById("schedules-form").addEventListener("submit", onSchedulesSubmit);
}

function bindScheduleCheckboxes() {
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
}

async function onSchedulesSubmit(e) {
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
    const start = document.querySelector(`[data-day-start="${dayId}"]`).value;
    const end = document.querySelector(`[data-day-end="${dayId}"]`).value;
    newSchedules.push({ day_of_week: dayId, start_time: start, end_time: end });
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
}

async function persistSchedules(newSchedules, targets) {
  const profile = Storage.getProfile();
  if (!profile) {
    state.screen = "spot";
    render();
    return;
  }

  const resolved = targets ?? [{ number: profile.number, apartment: profile.apartment }];

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
