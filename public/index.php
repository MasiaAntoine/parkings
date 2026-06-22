<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0">
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
    <script src="/js/vendor/lucide.min.js?v=23"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                            400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                            800: '#1e40af', 900: '#1e3a8a',
                        },
                    },
                    boxShadow: {
                        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.12)',
                        glow: '0 8px 24px -6px rgb(37 99 235 / 0.45)',
                    },
                    keyframes: {
                        fadeUp: {
                            '0%': { opacity: '0', transform: 'translateY(10px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        },
                        pop: {
                            '0%': { opacity: '0', transform: 'scale(0.96)' },
                            '100%': { opacity: '1', transform: 'scale(1)' },
                        },
                    },
                    animation: {
                        'fade-up': 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
                        'pop': 'pop 0.25s ease both',
                    },
                },
            },
        }
    </script>
    <style>
        * { -webkit-tap-highlight-color: transparent; }
        html { -webkit-text-size-adjust: 100%; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f1f5f9;
            background-image: radial-gradient(125% 55% at 50% 0%, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 58%);
            background-attachment: fixed;
            min-height: 100vh;
            min-height: 100dvh;
            -webkit-font-smoothing: antialiased;
        }
        [data-lucide] { stroke-width: 2; }
        input, button, textarea, select { font-family: inherit; }
        input[type="checkbox"] { accent-color: #2563eb; }
        input::placeholder { color: #94a3b8; }
        .phone-input {
            width: 100%;
            gap: clamp(0.45rem, 3vw, 0.85rem);
        }
        .phone-pair {
            min-width: 0;
            gap: 0.125rem;
        }
        .phone-digit {
            width: 100%;
            min-width: 0;
            padding-left: 0;
            padding-right: 0;
            height: clamp(2.35rem, 11vw, 3.5rem);
            font-size: clamp(0.8125rem, 4vw, 1.25rem);
        }
        .safe-top { padding-top: max(1rem, env(safe-area-inset-top)); }
        .safe-bottom { padding-bottom: max(0.875rem, env(safe-area-inset-bottom)); }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .filter-chips-scroll {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
        }
        .filter-chips-scroll::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="text-slate-900">
    <div id="app" class="relative mx-auto flex min-h-dvh w-full max-w-md flex-col"></div>
    <?php
    // Cache-busting partagé pour tous les scripts JS modulaires.
    $jsVersion = '50';
    $jsScripts = [
        'js/storage.js',
        'js/backend.js',
        'js/notifications.js',
        'js/core/config.js',
        'js/core/state.js',
        'js/core/utils.js',
        'js/core/phone-ui.js',
        'js/core/profile-manager.js',
        'js/components/toast.js',
        'js/components/buttons.js',
        'js/components/skeleton.js',
        'js/components/tabbar.js',
        'js/components/shell.js',
        'js/components/dialogs.js',
        'js/components/filter-bar.js',
        'js/components/apply-targets.js',
        'js/components/spot-card.js',
        'js/components/trips-list.js',
        'js/components/notifications-ui.js',
        'js/screens/code.js',
        'js/screens/onboarding-spot.js',
        'js/screens/onboarding-intro.js',
        'js/screens/home.js',
        'js/screens/spot-detail.js',
        'js/screens/my-spot.js',
        'js/screens/schedules.js',
        'js/screens/trips.js',
        'js/screens/edit-profile.js',
        'js/app.js',
    ];
    foreach ($jsScripts as $src) {
        echo '    <script src="/' . $src . '?v=' . $jsVersion . '"></script>' . "\n";
    }
    ?>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    </script>
</body>
</html>
