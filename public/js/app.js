// Router principal : dispatch sur les écrans, gère skeletons pendant les chargements async.

const SCREEN_RENDERERS = {
  code: renderCodeScreen,
  spot: renderSpotNumberScreen,
  apartment: renderApartmentScreen,
  "onboarding-phone": renderOnboardingPhoneScreen,
  schedules: renderSchedulesScreen,
  "onboarding-trip-intro": renderOnboardingTripIntroScreen,
  "onboarding-notifications": renderOnboardingNotificationsScreen,
  "trip-form": renderTripFormScreen,
  "change-number": renderChangeNumberScreen,
  phone: renderPhoneScreen,
};

async function routeAfterAuth() {
  const profile = Storage.getProfile();
  state.screen = profile ? "home" : "spot";
  await render();
  if (Storage.isAuthValid()) startAlertPolling();
}

async function render() {
  try {
    if (SCREEN_RENDERERS[state.screen]) {
      SCREEN_RENDERERS[state.screen]();
      return;
    }

    switch (state.screen) {
      case "home":
        await renderHomeWithSkeleton();
        return;
      case "my-spot":
        await renderMySpotWithSkeleton();
        return;
      case "spot-detail":
        await renderSpotDetailWithLoad();
        return;
      case "trip":
        await renderTripsWithSkeleton();
        return;
      default:
        if (!Storage.isAuthValid()) {
          state.screen = "code";
          renderCodeScreen();
        } else {
          await routeAfterAuth();
        }
    }
  } catch (err) {
    showToast(err.message, "error");
    if (state.screen === "home") renderHomeScreen();
  }
}

async function renderHomeWithSkeleton() {
  renderShell({
    title: "Places de parking",
    subtitle: "Votre résidence",
    appLogo: true,
    showLogout: true,
    content: `<div class="space-y-3">${[1, 2, 3].map(() => skeletonCard()).join("")}</div>`,
    footer: appFooter({ activeTab: "home" }),
  });
  await loadHomeData();
  renderHomeScreen();
}

async function renderMySpotWithSkeleton() {
  renderShell({
    title: "Ma place",
    icon: "settings-2",
    showLogout: true,
    content: skeletonMySpot(),
    footer: appFooter({ activeTab: "my-spot" }),
  });
  await loadMySpot();
  renderMySpotScreen();
}

async function renderTripsWithSkeleton() {
  renderShell({
    title: "Déplacements",
    icon: "plane-takeoff",
    showLogout: true,
    content: skeletonMySpot(),
    footer: appFooter({ activeTab: "trip" }),
  });
  await loadMyTrips();
  renderTripsScreen();
}

async function renderSpotDetailWithLoad() {
  if (!state.selectedSpot) {
    state.screen = "home";
    await render();
    return;
  }
  // Charge les détails complets si nécessaire (upcoming_trips absent dans la liste).
  if (!state.selectedSpot.upcoming_trips) {
    renderShell({
      title: `Place ${state.selectedSpot.number}`,
      icon: "parking-square",
      back: () => { state.screen = "home"; render(); },
      showLogout: true,
      content: skeletonMySpot(),
    });
    const fullSpot = await Backend.getSpot(state.selectedSpot.number, viewerSpotNumber());
    state.selectedSpot = fullSpot;
  }
  renderSpotDetailScreen();
}

async function init() {
  if (!Storage.isAuthValid()) {
    state.screen = "code";
  } else if (Storage.getProfile()) {
    const profile = Storage.getProfile();
    if (profile && !Storage.getSavedProfileEntry(profile.number)?.apartment) {
      Storage.setProfile(profile.number, profile.apartment);
    }
    state.screen = "home";
  } else {
    const session = Storage.get();
    // Numéro en attente de confirmation après un switch de profil.
    if (session?.spot_number && !session?.apartment) {
      state.spotNumber = session.spot_number;
      state.spotExists = true;
      state.switchingProfile = true;
      state.screen = "apartment";
    } else {
      state.screen = "spot";
    }
  }
  await render();
  if (Storage.isAuthValid()) startAlertPolling();
}

init();
