// Liste des déplacements (cartes) + merge des déplacements liés + actions modifier/annuler.

function collectTripsFromSpot(spot, spotNumber) {
  if (!spot) return [];

  const byId = new Map();
  for (const trip of spot.upcoming_trips || []) {
    byId.set(trip.id, { ...trip, spot_number: spotNumber });
  }
  if (spot.active_trip && !byId.has(spot.active_trip.id)) {
    byId.set(spot.active_trip.id, { ...spot.active_trip, spot_number: spotNumber });
  }

  return Array.from(byId.values());
}

// Fusionne plusieurs trips partageant le même link_group en un seul "trip multi-places".
function mergeLinkedTrips(trips) {
  const groups = new Map();
  const singles = [];

  for (const trip of trips) {
    const base = {
      ...trip,
      linked_spots: [trip.spot_number],
      linked_trip_ids: [trip.id],
    };

    if (!trip.link_group) {
      singles.push(base);
      continue;
    }

    const existing = groups.get(trip.link_group);
    if (!existing) {
      groups.set(trip.link_group, base);
      continue;
    }

    if (!existing.linked_spots.includes(trip.spot_number)) {
      existing.linked_spots.push(trip.spot_number);
      existing.linked_trip_ids.push(trip.id);
    }
  }

  const merged = [...groups.values()].map((trip) => ({
    ...trip,
    linked_spots: [...trip.linked_spots].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
  }));

  return [...merged, ...singles].sort((a, b) =>
    String(a.depart_at).localeCompare(String(b.depart_at)),
  );
}

function tripCardHtml(trip, showSpotNumber) {
  const linked = (trip.linked_spots?.length ?? 0) > 1;
  const spotLabel = linked
    ? `Places ${trip.linked_spots.join(", ")}`
    : `Place ${trip.spot_number}`;
  const showSpots = showSpotNumber || linked;
  const linkedSpotsAttr = (trip.linked_spots || []).join(",");

  return `
    <div class="bg-gradient-to-br from-brand-50 to-brand-100/60 ring-1 ring-brand-200 rounded-2xl p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2 min-w-0">
          ${icon("plane", "w-4 h-4 text-brand-500 shrink-0 mt-0.5")}
          <div class="min-w-0">
            ${showSpots ? `<p class="text-xs font-bold text-brand-700 mb-0.5">${escapeHtml(spotLabel)}</p>` : ""}
            ${linked ? `<p class="text-[11px] text-brand-600/80 mb-1">Lié · modif. et annulation synchronisées</p>` : ""}
            <p class="text-sm font-semibold text-brand-900">Du ${formatDateTime(trip.depart_at)}</p>
            <p class="text-xs text-brand-600">au ${formatDateTime(trip.return_at)}</p>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button data-edit-trip="${trip.id}" data-spot="${escapeHtml(trip.spot_number)}"
            data-depart="${escapeHtml(trip.depart_at)}" data-return="${escapeHtml(trip.return_at)}"
            data-link-group="${escapeHtml(trip.link_group || "")}"
            data-linked-spots="${escapeHtml(linkedSpotsAttr)}"
            class="flex items-center gap-1 text-xs text-brand-700 font-semibold bg-white/70 rounded-lg px-2 py-1.5 active:scale-95 transition">
            ${icon("pencil", "w-3.5 h-3.5")}<span>Modifier</span>
          </button>
          <button data-cancel-trip="${trip.id}" data-spot="${escapeHtml(trip.spot_number)}"
            data-linked-spots="${escapeHtml(linkedSpotsAttr)}"
            class="flex items-center gap-1 text-xs text-rose-600 font-semibold bg-rose-50 rounded-lg px-2 py-1.5 active:scale-95 transition">
            ${icon("x", "w-3.5 h-3.5")}<span>Annuler</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function tripsListHtml(upcomingTrips, showSpotNumber = false) {
  if (!upcomingTrips.length) {
    return `<div class="text-center py-10">
        <div class="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 mb-3">${icon("plane", "w-7 h-7")}</div>
        <p class="text-slate-500 font-medium text-sm">Aucun déplacement planifié</p>
        <p class="text-slate-400 text-xs mt-1">Ajoutez une absence pour libérer votre place.</p>
      </div>`;
  }

  return `<div class="space-y-3">${upcomingTrips
    .map((trip) => tripCardHtml(trip, showSpotNumber))
    .join("")}</div>`;
}

function bindTripListActions(profile, onUpdate) {
  document.querySelectorAll("[data-edit-trip]").forEach((btn) => {
    btn.onclick = () => {
      const linkedSpots = (btn.dataset.linkedSpots || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      state.editingTrip = {
        id: parseInt(btn.dataset.editTrip, 10),
        spot_number: btn.dataset.spot,
        depart_at: btn.dataset.depart,
        return_at: btn.dataset.return,
        link_group: btn.dataset.linkGroup || null,
        linked_spots: linkedSpots.length ? linkedSpots : null,
      };
      state.screen = "trip-form";
      render();
    };
  });

  document.querySelectorAll("[data-cancel-trip]").forEach((btn) => {
    btn.onclick = async () => {
      const tripId = parseInt(btn.dataset.cancelTrip, 10);
      const spotNumber = btn.dataset.spot || profile.number;
      const linkedSpots = (btn.dataset.linkedSpots || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const creds = ownedProfileCredentials(spotNumber, profile);
      if (!creds?.apartment) {
        showError("Profil de place introuvable.");
        return;
      }
      setButtonLoading(btn, true);
      try {
        await Backend.cancelTripById(spotNumber, creds.apartment, tripId);
        if (linkedSpots.length > 1) {
          showToast(
            `Déplacement annulé pour ${linkedSpots.length} places (${linkedSpots.join(", ")}).`,
          );
        } else {
          showToast("Déplacement annulé.");
        }
        await onUpdate();
      } catch (err) {
        showError(err.message);
        setButtonLoading(btn, false);
      }
    };
  });
}
