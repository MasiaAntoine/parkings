// Helpers de boutons : icone+label, loading spinner, navigation d'onboarding.

function btnContent(iconName, label) {
  return `${icon(iconName, "w-5 h-5")}<span>${label}</span>`;
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn._originalHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Chargement…</span>`;
  } else {
    btn.disabled = false;
    if (btn._originalHtml) btn.innerHTML = btn._originalHtml;
  }
}

function stepNextOnlyHtml(nextLabel, nextIcon = "arrow-right") {
  return `<button type="submit" class="${BTN_PRIMARY}">${btnContent(nextIcon, nextLabel)}</button>`;
}

function stepNavHtml(nextLabel, nextIcon = "arrow-right") {
  return `
    <div class="flex gap-3 pt-1">
      <button type="button" data-step-back class="${BTN_STEP_BACK}">${btnContent("chevron-left", "Retour")}</button>
      <button type="submit" class="${BTN_STEP_NEXT}">${btnContent(nextIcon, nextLabel)}</button>
    </div>
  `;
}

function bindStepBack(handler) {
  document
    .querySelector("[data-step-back]")
    ?.addEventListener("click", handler);
}

// Ligne d'option dans les écrans de réglages (label + chevron).
function settingRow(id, iconName, label, sublabel = "") {
  return `
    <button id="${id}" class="w-full flex items-center gap-3.5 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-4 shadow-sm active:scale-[0.99] transition text-left">
      <span class="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-900/5">${icon(iconName, "w-5 h-5")}</span>
      <span class="flex-1 min-w-0">
        <span class="block font-semibold text-slate-800">${escapeHtml(label)}</span>
        ${sublabel ? `<span class="block text-xs text-slate-400 truncate">${escapeHtml(sublabel)}</span>` : ""}
      </span>
      ${icon("chevron-right", "w-5 h-5 text-slate-300 shrink-0")}
    </button>`;
}

function statusPill(status, label) {
  const styles = STATUS_PILL[status] || STATUS_PILL.off_hours;
  return `<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${styles}">${icon(STATUS_ICONS[status] || "circle-help", "w-3.5 h-3.5")}<span>${escapeHtml(label)}</span></span>`;
}
