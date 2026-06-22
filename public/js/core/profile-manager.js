// Gestion du profil courant : switch, ajout, suppression, déconnexion.

async function afterProfileSwitch() {
  const keepScreens = new Set([
    "home",
    "my-spot",
    "schedules",
    "trip",
    "trip-form",
    "phone",
    "change-number",
  ]);

  if (state.screenBeforeProfileSwitch) {
    state.screen = state.screenBeforeProfileSwitch;
    state.screenBeforeProfileSwitch = null;
  } else if (state.screen === "spot-detail") {
    state.selectedSpot = null;
    state.screen = "home";
  } else if (!keepScreens.has(state.screen)) {
    state.screen = "home";
  }

  if (state.screen === "trip-form" && state.editingTrip) {
    state.editingTrip = null;
    state.screen = "trip";
  }

  state.switchingProfile = false;

  const profile = Storage.getProfile();
  if (!profile) {
    await render();
    return;
  }

  try {
    await refreshScreenAfterSwitch(profile);
  } catch (err) {
    showError(err.message);
    state.screen = "home";
  }

  await render();
}

async function refreshScreenAfterSwitch(profile) {
  if (state.screen === "schedules") {
    const spot = await Backend.getSpot(profile.number, profile.number);
    state.schedules = spot.schedules || [];
    state.afterSchedules = "home";
    state.schedulesNote = "";
    return;
  }
  if (state.screen === "trip" || state.screen === "trip-form") {
    await loadMyTrips();
    return;
  }
  if (state.screen === "my-spot") {
    await loadMySpot();
  }
}

function startAddSpot() {
  state.previousProfile = Storage.getProfile();
  Storage.clearCurrentProfile();
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.schedules = [];
  state.afterSchedules = "home";
  state.schedulesNote = "";
  state.switchingProfile = false;
  state.addingSpot = true;
  state.screen = "spot";
  render();
}

function finishAddSpotFlow() {
  state.addingSpot = false;
  state.previousProfile = null;
}

function cancelAddSpot() {
  if (state.previousProfile) {
    Storage.setProfile(
      state.previousProfile.number,
      state.previousProfile.apartment,
    );
  }
  state.addingSpot = false;
  state.previousProfile = null;
  state.spotNumber = "";
  state.spotExists = false;
  state.onboardingApartment = "";
  state.screen = "home";
  render();
}

function disconnect() {
  stopAlertPolling();
  Storage.logout();
  Object.assign(state, {
    spotNumber: "",
    spotExists: false,
    onboardingApartment: "",
    schedules: [],
    afterSchedules: "home",
    schedulesNote: "",
    spots: [],
    alerts: [],
    mySpot: null,
    error: "",
    selectedSpot: null,
    editingTrip: null,
    switchingProfile: false,
    screenBeforeProfileSwitch: null,
    addingSpot: false,
    previousProfile: null,
    screen: "code",
  });
  render();
}
