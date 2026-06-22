// Écrans Déplacements (liste) + formulaire création/modification.

async function loadMyTrips() {
  const profile = Storage.getProfile();
  if (!profile) {
    state.allTrips = [];
    return;
  }

  const owned = Storage.getOwnedProfiles();
  const profiles =
    owned.length > 0
      ? owned
      : [{ number: profile.number, apartment: profile.apartment }];

  const spots = await Promise.all(
    profiles.map(async (p) => ({
      number: p.number,
      spot: await Backend.getSpot(p.number, profile.number),
    })),
  );

  const current = spots.find((s) => s.number === profile.number);
  state.mySpot = current?.spot ?? spots[0]?.spot ?? null;
  state.schedules = state.mySpot?.schedules || [];

  state.allTrips = mergeLinkedTrips(
    spots.flatMap(({ number, spot }) => collectTripsFromSpot(spot, number)),
  );
}

function renderTripsScreen() {
  const profile = Storage.getProfile();
  const upcomingTrips = state.allTrips || [];
  const showSpotNumber = Storage.getOwnedProfiles().length > 1;

  renderShell({
    title: "Déplacements",
    subtitle: "Absences planifiées",
    icon: "plane-takeoff",
    showLogout: true,
    footer: appFooter({
      activeTab: "trip",
      actions: `<button type="button" id="add-trip-btn" class="${BTN_PRIMARY}">${btnContent("plus", "Ajouter un déplacement")}</button>`,
    }),
    content: `
      <p class="text-slate-500 mb-5 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("info", "w-5 h-5 text-brand-500 shrink-0")}<span>Pendant un déplacement, votre place est disponible 24h/24, même en dehors de vos horaires habituels.</span></p>
      ${tripsListHtml(upcomingTrips, showSpotNumber)}
    `,
  });

  document.getElementById("add-trip-btn")?.addEventListener("click", () => {
    state.editingTrip = null;
    state.screen = "trip-form";
    render();
  });

  bindTripListActions(profile, async () => {
    await loadMyTrips();
    renderTripsScreen();
  });

  bindTabBar();
}

function tripFormDefaults(editing) {
  const now = new Date();
  return {
    depart: editing ? datetimeToLocal(editing.depart_at) : toDatetimeLocal(now),
    return: editing
      ? datetimeToLocal(editing.return_at)
      : toDatetimeLocal(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
  };
}

function tripFormBannerHtml(linkedSpots) {
  if (linkedSpots) {
    return `<p class="text-slate-600 mb-5 bg-amber-50 ring-1 ring-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("link", "w-5 h-5 text-amber-600 shrink-0")}<span>Ce déplacement est lié à ${linkedSpots.length} places. Les modifications seront appliquées sur toutes.</span></p>`;
  }
  return `<p class="text-slate-500 mb-5 bg-brand-50 ring-1 ring-brand-100 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm">${icon("info", "w-5 h-5 text-brand-500 shrink-0")}<span>Votre place sera disponible 24h/24 pendant toute la période indiquée. Cela by-passe vos plages horaires habituelles.</span></p>`;
}

function renderTripFormScreen() {
  const editing = state.editingTrip;
  const linkedSpots =
    editing?.linked_spots?.length > 1 ? editing.linked_spots : null;
  const defaults = tripFormDefaults(editing);

  const subtitle = linkedSpots
    ? `Places ${linkedSpots.join(", ")}`
    : editing
      ? "Modifier les dates"
      : "Libérez votre place";

  renderShell({
    title: editing ? "Modifier le déplacement" : "Nouveau déplacement",
    subtitle,
    icon: "luggage",
    showLogout: true,
    back: () => {
      state.editingTrip = null;
      state.screen = "trip";
      render();
    },
    footer: appFooter({
      activeTab: "trip",
      actions: `<button form="trip-form" type="submit" id="trip-submit" class="${BTN_PRIMARY}">${btnContent("check", editing ? "Enregistrer les modifications" : "Confirmer le déplacement")}</button>`,
    }),
    content: `
      ${tripFormBannerHtml(linkedSpots)}
      <form id="trip-form" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-takeoff", "w-4 h-4 text-brand-500")}<span>Départ</span></label>
          <input type="datetime-local" id="depart-at" value="${defaults.depart}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">${icon("plane-landing", "w-4 h-4 text-brand-500")}<span>Retour</span></label>
          <input type="datetime-local" id="return-at" value="${defaults.return}" required class="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3.5 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition">
        </div>
        ${editing ? "" : applyToSpotsCheckboxesHtml("trip")}
      </form>
    `,
  });

  bindTabBar();
  document
    .getElementById("trip-form")
    .addEventListener("submit", onTripFormSubmit);
}

async function onTripFormSubmit(e) {
  e.preventDefault();
  const editing = state.editingTrip;
  const linkedSpots =
    editing?.linked_spots?.length > 1 ? editing.linked_spots : null;
  const profile = Storage.getProfile();
  const departAt = formatForApi(document.getElementById("depart-at").value);
  const returnAt = formatForApi(document.getElementById("return-at").value);
  const btn = document.getElementById("trip-submit");
  setButtonLoading(btn, true);

  try {
    if (editing) {
      await submitTripUpdate(
        editing,
        profile,
        departAt,
        returnAt,
        linkedSpots,
        btn,
      );
    } else {
      const targets = getSelectedApplyTargets("trip");
      if (!targets) {
        showError("Sélectionnez au moins une place.");
        setButtonLoading(btn, false);
        return;
      }
      await submitTripCreate(targets, departAt, returnAt);
    }
    state.editingTrip = null;
    state.screen = "trip";
    await loadMyTrips();
    await render();
  } catch (err) {
    showError(err.message);
    setButtonLoading(btn, false);
  }
}

async function submitTripUpdate(
  editing,
  profile,
  departAt,
  returnAt,
  linkedSpots,
  btn,
) {
  const spotNumber = editing.spot_number || profile.number;
  const creds = ownedProfileCredentials(spotNumber, profile);
  if (!creds?.apartment) {
    showError("Profil de place introuvable.");
    setButtonLoading(btn, false);
    throw new Error("Profil de place introuvable.");
  }
  await Backend.updateTrip(
    spotNumber,
    creds.apartment,
    editing.id,
    departAt,
    returnAt,
  );
  if (linkedSpots) {
    showToast(
      `Déplacement modifié pour ${linkedSpots.length} places (${linkedSpots.join(", ")}).`,
    );
  } else {
    showToast("Déplacement modifié.");
  }
}

async function submitTripCreate(targets, departAt, returnAt) {
  const linkGroup = targets.length > 1 ? crypto.randomUUID() : null;
  await Promise.all(
    targets.map((target) =>
      Backend.createTrip(
        target.number,
        target.apartment,
        departAt,
        returnAt,
        linkGroup,
      ),
    ),
  );
  applyTargetsToast("Déplacement créé", targets);
}
