// Constantes globales : couleurs, classes Tailwind partagées, presets de filtres.

const ONBOARDING_STEPS = 6;

const DAYS = [
  { id: 0, label: "Lundi", short: "Lun" },
  { id: 1, label: "Mardi", short: "Mar" },
  { id: 2, label: "Mercredi", short: "Mer" },
  { id: 3, label: "Jeudi", short: "Jeu" },
  { id: 4, label: "Vendredi", short: "Ven" },
  { id: 5, label: "Samedi", short: "Sam" },
  { id: 6, label: "Dimanche", short: "Dim" },
];

const STATUS_ICONS = {
  available: "circle-check",
  occupied: "car",
  off_hours: "moon",
};

const STATUS_PILL = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  occupied: "bg-rose-50 text-rose-700 ring-rose-600/20",
  off_hours: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const STATUS_DOT = {
  available: "bg-emerald-500",
  occupied: "bg-rose-500",
  off_hours: "bg-slate-400",
};

const BTN_PRIMARY =
  "w-full inline-flex items-center justify-center gap-2 bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold rounded-2xl py-4 shadow-glow active:scale-[0.98] transition-transform";
const BTN_SECONDARY =
  "w-full inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold rounded-2xl py-4 ring-1 ring-slate-200 shadow-soft active:scale-[0.98] transition";
const BTN_STEP_BACK =
  "flex-1 inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold rounded-2xl py-4 ring-1 ring-slate-200 shadow-soft active:scale-[0.98] transition";
const BTN_STEP_NEXT =
  "flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold rounded-2xl py-4 shadow-glow active:scale-[0.98] transition-transform";
const INPUT =
  "w-full bg-white ring-1 ring-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-800 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition";
const CARD = "bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5";

const TOAST_VARIANTS = {
  success: { bg: "bg-emerald-600", icon: "check", shadow: "shadow-soft" },
  error: { bg: "bg-rose-600", icon: "circle-alert", shadow: "shadow-glow" },
  warning: {
    bg: "bg-amber-600",
    icon: "triangle-alert",
    shadow: "shadow-soft",
  },
  info: { bg: "bg-brand-600", icon: "info", shadow: "shadow-soft" },
};

const FILTER_PRESETS = [
  { id: "now", label: "Maintenant", icon: "refresh-cw" },
  { id: "tonight", label: "Ce soir", icon: "moon" },
  { id: "tomorrow_am", label: "Dem. matin", icon: "sun" },
  { id: "tomorrow_pm", label: "Dem. soir", icon: "alarm-clock" },
  { id: "custom", label: "Autre", icon: "calendar-range" },
];

const PHONE_DIGIT_CLASS =
  "phone-digit flex-1 min-w-0 text-center font-bold bg-white ring-1 ring-slate-200 rounded-lg sm:rounded-xl shadow-soft focus:ring-2 focus:ring-brand-500 focus:outline-none transition tabular-nums";
