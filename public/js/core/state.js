// État global de l'application + helpers d'accès au profil viewer.

const app = document.getElementById("app");

const state = {
  screen: "loading",
  error: "",
  spotNumber: "",
  spotExists: false,
  onboardingApartment: "",
  schedulesBackScreen: "apartment",
  schedules: [],
  afterSchedules: "home",
  schedulesNote: "",
  alerts: [],
  spots: [],
  mySpot: null,
  allTrips: [],
  filterDatetime: "",
  filterPreset: "now",
  selectedSpot: null,
  editingTrip: null,
  switchingProfile: false,
  screenBeforeProfileSwitch: null,
  addingSpot: false,
  previousProfile: null,
  showTripIntroNext: false,
  showNeighborDisclaimerOnHome: false,
};

function viewerSpotNumber() {
  return Storage.getProfile()?.number ?? null;
}

function ownedProfileCredentials(spotNumber, fallbackProfile) {
  const owned = Storage.getOwnedProfiles();
  return (
    owned.find((p) => p.number === spotNumber) ??
    (fallbackProfile?.number === spotNumber ? fallbackProfile : null)
  );
}

function ownedSpotNumbersSet() {
  return new Set(Storage.getOwnedProfiles().map((p) => p.number));
}

function isOwnedSpot(number) {
  return ownedSpotNumbersSet().has(number);
}
