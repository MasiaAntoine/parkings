// Composants d'affichage d'une place : meta (horaires/déplacements/dispo) + téléphone contact.

function spotContactPhoneHtml(
  spot,
  { className = "mt-2", ownerContext = false } = {},
) {
  if (spot.status === "occupied" && spot.parked_contact_phone) {
    if (ownerContext) {
      return `<div class="${className}">
        <p class="text-sm text-amber-800 mb-2">En cas de problème, voici le numéro de la personne garée sur votre place&nbsp;:</p>
        <a href="${phoneTelHref(spot.parked_contact_phone)}" class="inline-flex items-center gap-2 text-base text-brand-700 font-bold active:scale-95 transition">${icon("phone", "w-5 h-5 shrink-0")}<span>${escapeHtml(spot.parked_contact_phone)}</span></a>
      </div>`;
    }
    const who = spot.parked_by_spot_number
      ? `Place ${spot.parked_by_spot_number}`
      : "Personne garée";
    return `<a href="${phoneTelHref(spot.parked_contact_phone)}" class="${className} inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(who)} · ${escapeHtml(spot.parked_contact_phone)}</span></a>`;
  }
  if (spot.status !== "occupied" && spot.phone) {
    return `<a href="${phoneTelHref(spot.phone)}" class="${className} inline-flex items-center gap-2 text-sm text-brand-700 font-semibold active:scale-95 transition">${icon("phone", "w-4 h-4 shrink-0")}<span>${escapeHtml(spot.phone)}</span></a>`;
  }
  return "";
}

function spotMetaLines(spot) {
  const lines = [];

  if (spot.trip_line) {
    lines.push({
      icon: "plane",
      text: spot.trip_line,
      className: "text-brand-700",
    });
  }

  if (spot.schedule_lines?.length) {
    for (const line of spot.schedule_lines) {
      lines.push({ icon: "clock", text: line, className: "text-slate-500" });
    }
  } else if (!spot.trip_line && !spot.schedules?.length) {
    lines.push({
      icon: "calendar-off",
      text: "Aucun horaire récurrent",
      className: "text-slate-400",
    });
  }

  if (spot.availability_hint) {
    const className =
      spot.status === "occupied"
        ? "text-amber-800 font-medium"
        : spot.status === "available"
          ? "text-emerald-700 font-medium"
          : "text-slate-400";
    lines.push({
      icon: spot.status === "occupied" ? "alarm-clock" : "info",
      text: spot.availability_hint,
      className,
    });
  }

  return lines;
}

function spotMetaHtml(spot) {
  const lines = spotMetaLines(spot);
  if (!lines.length) return "";

  return `<div class="mt-3 space-y-1.5">${lines
    .map(
      (line) =>
        `<p class="text-sm flex items-start gap-2 ${line.className}">${icon(line.icon, "w-4 h-4 shrink-0 mt-0.5")}<span>${escapeHtml(line.text)}</span></p>`,
    )
    .join("")}</div>`;
}
