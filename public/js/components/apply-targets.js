// "Appliquer sur plusieurs places" : checkboxes multi-profils pour
// les écrans horaires et création de déplacement.

function applyToSpotsCheckboxesHtml(group) {
  const owned = Storage.getOwnedProfiles();
  if (owned.length <= 1) return "";

  const currentNumber = Storage.getProfile()?.number;

  const items = owned
    .map(
      (p) => `
      <label class="flex items-center gap-3 bg-white ring-1 ring-slate-200 rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition">
        <input type="checkbox"${p.number === currentNumber ? " checked" : ""}
          class="apply-spot-check w-5 h-5 rounded-md accent-brand-600 shrink-0"
          data-apply-group="${group}"
          data-number="${escapeHtml(p.number)}"
          data-apartment="${escapeHtml(p.apartment)}">
        <span class="flex-1 min-w-0 flex items-center gap-2">
          <span class="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-extrabold text-sm shrink-0">${escapeHtml(p.number)}</span>
          <span class="text-sm font-semibold text-slate-800">Place ${escapeHtml(p.number)}${p.number === currentNumber ? '<span class="text-xs font-normal text-brand-600 ml-1">(actuelle)</span>' : ""}</span>
        </span>
      </label>`,
    )
    .join("");

  return `
    <div class="mt-4 space-y-2">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Appliquer sur</p>
      <div class="space-y-2">${items}</div>
    </div>`;
}

// Renvoie la liste des places cibles cochées, ou null si aucune cochée alors que plusieurs sont possibles.
function getSelectedApplyTargets(group) {
  const profile = Storage.getProfile();
  const owned = Storage.getOwnedProfiles();

  if (owned.length <= 1) {
    return profile
      ? [{ number: profile.number, apartment: profile.apartment }]
      : [];
  }

  const checked = document.querySelectorAll(
    `.apply-spot-check[data-apply-group="${group}"]:checked`,
  );

  if (checked.length === 0) {
    return null;
  }

  return Array.from(checked).map((el) => ({
    number: el.dataset.number,
    apartment: el.dataset.apartment,
  }));
}

function applyTargetsToast(prefix, targets) {
  if (targets.length > 1) {
    showToast(
      `${prefix} pour ${targets.length} places (${targets.map((t) => t.number).join(", ")}).`,
    );
  }
}
