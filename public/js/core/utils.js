// Utilitaires : DOM, icônes Lucide, dates/heures.

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function icon(name, className = "w-5 h-5 shrink-0") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function formatDateTime(value) {
  if (!value) return "";
  const dt = new Date(String(value).replace(" ", "T"));
  return dt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Convertit "YYYY-MM-DD HH:MM:SS" en format datetime-local.
function datetimeToLocal(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  return toDatetimeLocal(d);
}

function formatForApi(datetimeLocal) {
  return datetimeLocal.replace("T", " ");
}
