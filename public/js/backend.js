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

  registerSpot(number, apartment, phone = null) {
    return this.request("register_spot", {
      number,
      apartment,
      phone: phone ?? "",
    });
  },

  updatePhone(number, apartment, phone) {
    return this.request("update_phone", {
      number,
      apartment,
      phone: phone ?? "",
    });
  },

  confirmSpot(number, apartment) {
    return this.request("confirm_spot", { number, apartment });
  },

  listSpots(viewerNumber = null, atDatetime = null) {
    const data = {};
    if (viewerNumber) data.viewer_number = viewerNumber;
    if (atDatetime) data.at_datetime = atDatetime;
    return this.request("list_spots", data);
  },

  getSpot(number, viewerNumber = null) {
    const data = { number };
    if (viewerNumber) data.viewer_number = viewerNumber;
    return this.request("get_spot", data);
  },

  saveSchedules(number, apartment, schedules) {
    return this.request("save_schedules", {
      number,
      apartment,
      schedules,
    });
  },

  park(number, parkedBy, phone) {
    return this.request("park", { number, parked_by: parkedBy, phone });
  },

  unpark(number) {
    return this.request("unpark", { number });
  },

  createTrip(number, apartment, departAt, returnAt, linkGroup = null) {
    const data = {
      number,
      apartment,
      depart_at: departAt,
      return_at: returnAt,
    };
    if (linkGroup) data.link_group = linkGroup;
    return this.request("create_trip", data);
  },

  updateTrip(number, apartment, tripId, departAt, returnAt) {
    return this.request("update_trip", {
      number,
      apartment,
      trip_id: tripId,
      depart_at: departAt,
      return_at: returnAt,
    });
  },

  cancelTrip(number, apartment) {
    return this.request("cancel_trip", { number, apartment });
  },

  cancelTripById(number, apartment, tripId) {
    return this.request("cancel_trip_by_id", {
      number,
      apartment,
      trip_id: tripId,
    });
  },

  deleteSpot(number, apartment) {
    return this.request("delete_spot", { number, apartment });
  },

  changeNumber(number, apartment, newNumber) {
    return this.request("change_number", {
      number,
      apartment,
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
