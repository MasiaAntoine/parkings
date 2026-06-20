const STORAGE_KEY = "parking_session";
const AUTH_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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

  logout() {
    this.clear();
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

  setProfile(number, apartment) {
    const session = this.get() || {};
    session.spot_number = number;
    session.apartment = apartment;
    delete session.first_name;
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
    if (session) {
      session.spot_number = newNumber;
      this.save(session);
    }
  },
};
