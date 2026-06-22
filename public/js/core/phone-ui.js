// Composant input téléphone (10 chiffres, format français), avec contrôleur.

function phoneDigitsFromValue(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  return Array.from({ length: 10 }, (_, i) => digits[i] || "");
}

function formatFrenchPhone(digits) {
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function phoneTelHref(phone) {
  return `tel:${String(phone || "").replace(/\D/g, "")}`;
}

function phoneInputHtml(value = "") {
  const digits = phoneDigitsFromValue(value);
  const groups = Array.from({ length: 5 }, (_, g) => {
    const pair = digits
      .slice(g * 2, g * 2 + 2)
      .map((digit, j) => {
        const i = g * 2 + j;
        return `<input type="tel" inputmode="numeric" maxlength="1" autocomplete="tel-national" data-phone-digit="${i}" value="${escapeHtml(digit)}" aria-label="Chiffre ${i + 1} sur 10" class="${PHONE_DIGIT_CLASS}">`;
      })
      .join("");
    return `<div class="phone-pair flex min-w-0 flex-1">${pair}</div>`;
  });

  return `<div class="phone-input flex w-full max-w-full flex-nowrap items-stretch" data-phone-input>${groups.join("")}</div>`;
}

function bindPhoneInput(root) {
  const inputs = root.querySelectorAll("[data-phone-digit]");

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "")
        .replace(/\D/g, "")
        .slice(0, 10);
      const digits = phoneDigitsFromValue(pasted);
      inputs.forEach((inp, i) => {
        inp.value = digits[i] || "";
      });
      const focusIndex =
        pasted.length === 0 ? 0 : Math.min(pasted.length, 10) - 1;
      inputs[focusIndex].focus();
    });
  });

  const getDigits = () =>
    Array.from(inputs)
      .map((input) => input.value)
      .join("")
      .replace(/\D/g, "");

  return {
    focus() {
      inputs[0]?.focus();
    },
    clear() {
      inputs.forEach((input) => {
        input.value = "";
      });
      inputs[0]?.focus();
    },
    getDigits,
    isEmpty() {
      return getDigits().length === 0;
    },
    isComplete() {
      return getDigits().length === 10;
    },
    getValue() {
      const digits = getDigits();
      if (!digits) return null;
      if (digits.length !== 10) return undefined;
      return formatFrenchPhone(digits);
    },
  };
}

// Lit un téléphone optionnel : null si vide, undefined si incomplet (affiche un toast).
function readOptionalPhone(phoneCtrl) {
  if (!phoneCtrl || phoneCtrl.isEmpty()) return null;
  if (!phoneCtrl.isComplete()) {
    showError("Numéro de téléphone incomplet.");
    return undefined;
  }
  return phoneCtrl.getValue();
}

// Lit un téléphone obligatoire : undefined si vide/incomplet (affiche un toast).
function readRequiredPhone(phoneCtrl) {
  if (!phoneCtrl || phoneCtrl.isEmpty()) {
    showError("Numéro de téléphone requis.");
    return undefined;
  }
  if (!phoneCtrl.isComplete()) {
    showError("Numéro de téléphone incomplet.");
    return undefined;
  }
  return phoneCtrl.getValue();
}
