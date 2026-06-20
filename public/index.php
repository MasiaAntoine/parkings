<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Parking</title>
    <meta name="description" content="Partagez les places de parking de votre résidence entre voisins.">
    <meta name="theme-color" content="#2563eb">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Parking">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/logo.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/icons/icon-192.svg">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        available: '#16a34a',
                        occupied: '#dc2626',
                        offhours: '#6b7280',
                    }
                }
            }
        }
    </script>
    <style>
        [data-lucide] { stroke-width: 2; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
    <div id="app" class="max-w-md mx-auto px-4 py-6 pb-24"></div>
    <script src="/js/storage.js"></script>
    <script src="/js/backend.js"></script>
    <script src="/js/app.js"></script>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    </script>
</body>
</html>
