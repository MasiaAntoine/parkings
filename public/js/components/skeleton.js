// Skeletons utilisés pendant les chargements (accueil, ma place).

function skeletonCard() {
  return `
    <div class="bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5 animate-pulse">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
          <div class="space-y-2">
            <div class="h-4 w-24 bg-slate-100 rounded-full"></div>
            <div class="h-3 w-16 bg-slate-100 rounded-full"></div>
          </div>
        </div>
        <div class="h-6 w-20 bg-slate-100 rounded-full shrink-0"></div>
      </div>
      <div class="mt-4 h-3 w-36 bg-slate-100 rounded-full"></div>
    </div>
  `;
}

function skeletonMySpot() {
  return `
    <div class="space-y-3 animate-pulse">
      <div class="bg-white rounded-3xl p-5 shadow-soft ring-1 ring-slate-900/5 flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 shrink-0"></div>
        <div class="space-y-2 flex-1">
          <div class="h-5 w-20 bg-slate-100 rounded-full"></div>
          <div class="h-4 w-32 bg-slate-100 rounded-full"></div>
        </div>
      </div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
      <div class="h-14 bg-slate-100 rounded-2xl"></div>
    </div>
  `;
}
