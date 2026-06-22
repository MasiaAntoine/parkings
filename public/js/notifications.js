const Notifications = {
  supported() {
    return "Notification" in window && "serviceWorker" in navigator;
  },

  get permission() {
    return this.supported() ? Notification.permission : "unsupported";
  },

  isEnabled() {
    const prefs = Storage.getNotificationPrefs();
    return prefs.enabled && this.permission === "granted";
  },

  async requestPermission() {
    if (!this.supported()) return "unsupported";
    return Notification.requestPermission();
  },

  async enable() {
    const result = await this.requestPermission();
    if (result === "granted") {
      Storage.setNotificationsEnabled(true);
      try {
        const data = await Backend.getAlerts();
        this.markKnown(data.alerts);
      } catch {
        /* ignore */
      }
    }
    return result;
  },

  disable() {
    Storage.setNotificationsEnabled(false);
  },

  markKnown(alerts) {
    Storage.setKnownAlertIds(alerts.map((a) => a.id));
  },

  async processNewAlerts(alerts) {
    const known = new Set(Storage.getKnownAlertIds());
    const currentIds = alerts.map((a) => a.id);

    if (this.isEnabled() && known.size > 0) {
      const fresh = alerts.filter((a) => !known.has(a.id));
      for (const alert of fresh) {
        await this.show(alert);
      }
    }

    Storage.setKnownAlertIds(currentIds);
  },

  async show(alert) {
    if (!this.isEnabled()) return;

    const title = "Retour anticipé";
    const body = alert.message;
    const tag = `parking-alert-${alert.id}`;

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        data: { alertId: alert.id, url: "/" },
      });
    } catch {
      if (Notification.permission === "granted") {
        new Notification(title, { body, tag, icon: "/icons/icon-192.svg" });
      }
    }
  },

  statusLabel() {
    if (!this.supported()) return "Non supportées";
    if (this.isEnabled()) return "Activées";
    if (this.permission === "denied") return "Bloquées par le navigateur";
    return "Désactivées";
  },
};
