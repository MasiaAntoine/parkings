const STORAGE_KEY = "parking_session";
const AUTH_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeSavedProfiles(saved) {
  if (!Array.isArray(saved)) return [];
  return saved.map((entry) =>
    typeof entry === "string"
      ? { number: entry, apartment: null }
      : { number: entry.number, apartment: entry.apartment ?? null },
  );
}

const Storage = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Déconnecte l'utilisateur : efface auth et profil courant, conserve les profils sauvegardés
  logout() {
    const session = this.get() || {};
    const saved = normalizeSavedProfiles(session.saved_profiles);
    this.save({ saved_profiles: saved });
  },

  isAuthValid() {
    const session = this.get();
    if (!session?.auth_expires_at) return false;
    return Date.now() < session.auth_expires_at;
  },

  setAuth() {
    const session = this.get() || {};
    session.auth_expires_at = Date.now() + AUTH_DURATION_MS;
    this.save(session);
  },

  getSavedProfileEntry(number) {
    return normalizeSavedProfiles(this.get()?.saved_profiles).find(
      (p) => p.number === number,
    );
  },

  // Définit le profil courant et mémorise numéro + appartement pour le switch rapide
  setProfile(number, apartment) {
    const session = this.get() || {};
    session.spot_number = number;
    session.apartment = apartment;
    delete session.first_name;

    const saved = normalizeSavedProfiles(session.saved_profiles);
    const idx = saved.findIndex((p) => p.number === number);
    const entry = { number, apartment };
    if (idx === -1) saved.push(entry);
    else saved[idx] = entry;

    session.saved_profiles = saved;
    this.save(session);
  },

  getProfile() {
    const session = this.get();
    if (!session?.spot_number) return null;
    const apartment = session.apartment ?? session.first_name;
    if (!apartment) return null;
    return { number: session.spot_number, apartment };
  },

  updateSpotNumber(newNumber) {
    const session = this.get();
    if (!session) return;

    const saved = normalizeSavedProfiles(session.saved_profiles);
    const oldNumber = session.spot_number;
    const current = saved.find((p) => p.number === oldNumber);

    if (oldNumber) {
      const idx = saved.findIndex((p) => p.number === oldNumber);
      if (idx !== -1) {
        saved[idx] = {
          number: newNumber,
          apartment: current?.apartment ?? session.apartment ?? null,
        };
      } else if (!saved.some((p) => p.number === newNumber)) {
        saved.push({
          number: newNumber,
          apartment: session.apartment ?? null,
        });
      }
    } else if (!saved.some((p) => p.number === newNumber)) {
      saved.push({ number: newNumber, apartment: session.apartment ?? null });
    }

    session.spot_number = newNumber;
    session.saved_profiles = saved;
    this.save(session);
  },

  // Numéros de place sauvegardés (pour l'affichage)
  getSavedProfiles() {
    return normalizeSavedProfiles(this.get()?.saved_profiles).map((p) => p.number);
  },

  // Places connectées sur cet appareil (numéro + appartement connus)
  getOwnedProfiles() {
    return normalizeSavedProfiles(this.get()?.saved_profiles).filter(
      (p) => p.number && p.apartment,
    );
  },

  removeSavedProfile(number) {
    const session = this.get();
    if (!session) return;
    session.saved_profiles = normalizeSavedProfiles(session.saved_profiles).filter(
      (p) => p.number !== number,
    );
    this.save(session);
  },

  clearCurrentProfile() {
    const session = this.get() || {};
    delete session.spot_number;
    delete session.apartment;
    delete session.first_name;
    this.save(session);
  },

  // Bascule vers un profil ; retourne true si l'appartement est déjà connu (switch instantané)
  switchToProfile(number) {
    const session = this.get() || {};
    const entry = this.getSavedProfileEntry(number);
    session.spot_number = number;
    if (entry?.apartment) {
      session.apartment = entry.apartment;
    } else {
      delete session.apartment;
    }
    delete session.first_name;
    this.save(session);
    return !!entry?.apartment;
  },

  getNotificationPrefs() {
    const session = this.get() || {};
    return {
      enabled: session.notifications_enabled === true,
    };
  },

  setNotificationsEnabled(enabled) {
    const session = this.get() || {};
    session.notifications_enabled = enabled;
    this.save(session);
  },

  getKnownAlertIds() {
    return (this.get() || {}).known_alert_ids || [];
  },

  setKnownAlertIds(ids) {
    const session = this.get() || {};
    session.known_alert_ids = ids;
    this.save(session);
  },

  hasSeenNeighborDisclaimer() {
    return (this.get() || {}).neighbor_disclaimer_seen === true;
  },

  setNeighborDisclaimerSeen() {
    const session = this.get() || {};
    session.neighbor_disclaimer_seen = true;
    this.save(session);
  },

  isOnboardingComplete() {
    const session = this.get() || {};
    if (session.onboarding_completed === false) return false;
    return !!(session.spot_number && session.apartment);
  },

  markOnboardingInProgress() {
    const session = this.get() || {};
    session.onboarding_completed = false;
    this.save(session);
  },

  markOnboardingComplete() {
    const session = this.get() || {};
    session.onboarding_completed = true;
    this.save(session);
  },
};
