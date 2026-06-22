// Toast notifications globaux (success/error/warning/info) + showError shortcut.

let toastTimeoutId = null;

function dismissToast() {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  const existing = document.getElementById("app-toast");
  if (!existing) return;
  existing.style.transition = "opacity 200ms ease, transform 200ms ease";
  existing.style.opacity = "0";
  existing.style.transform = "translateY(-12px)";
  setTimeout(() => existing.remove(), 220);
}

function showToast(message, variant = "success") {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  const existing = document.getElementById("app-toast");
  if (existing) existing.remove();

  const { bg, icon: iconName, shadow } =
    TOAST_VARIANTS[variant] ?? TOAST_VARIANTS.success;

  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.className =
    "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-md px-5 safe-top";
  toast.innerHTML = `
    <button type="button" class="animate-pop w-full flex items-start gap-2 rounded-2xl ${bg} text-white px-4 py-3 ${shadow} text-left active:scale-[0.98] transition">
      ${icon(iconName, "w-5 h-5 mt-0.5 shrink-0")}
      <span class="flex-1 text-sm font-medium">${escapeHtml(message)}</span>
      ${icon("x", "w-4 h-4 mt-0.5 shrink-0 opacity-70")}
    </button>`;
  document.body.appendChild(toast);
  refreshIcons();

  toast.querySelector("button")?.addEventListener("click", dismissToast);

  toastTimeoutId = setTimeout(() => {
    toastTimeoutId = null;
    dismissToast();
  }, 3000);
}

function showError(message) {
  state.error = message;
  showToast(message, "error");
}
