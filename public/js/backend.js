const Backend = {
  async request(action, data = {}) {
    const response = await fetch(
      `/action.php?action=${encodeURIComponent(action)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Erreur réseau");
    }
    return result;
  },

  verifyCode(code) {
    return this.request("verify_code", { code });
  },

  spotExists(number) {
    return this.request("spot_exists", { number });
  },

  registerSpot(number, firstName) {
    return this.request("register_spot", { number, first_name: firstName });
  },

  confirmSpot(number, firstName) {
    return this.request("confirm_spot", { number, first_name: firstName });
  },

  listSpots(viewerNumber = null) {
    const data = viewerNumber ? { viewer_number: viewerNumber } : {};
    return this.request("list_spots", data);
  },

  getSpot(number) {
    return this.request("get_spot", { number });
  },

  saveSchedules(number, firstName, schedules) {
    return this.request("save_schedules", {
      number,
      first_name: firstName,
      schedules,
    });
  },

  park(number, parkedBy) {
    return this.request("park", { number, parked_by: parkedBy });
  },

  unpark(number) {
    return this.request("unpark", { number });
  },

  createTrip(number, firstName, departAt, returnAt) {
    return this.request("create_trip", {
      number,
      first_name: firstName,
      depart_at: departAt,
      return_at: returnAt,
    });
  },

  cancelTrip(number, firstName) {
    return this.request("cancel_trip", { number, first_name: firstName });
  },

  changeNumber(number, firstName, newNumber) {
    return this.request("change_number", {
      number,
      first_name: firstName,
      new_number: newNumber,
    });
  },

  getAlerts() {
    return this.request("list_alerts");
  },

  dismissAlert(id) {
    return this.request("dismiss_alert", { id });
  },
};
