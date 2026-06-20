<?php

declare(strict_types=1);

date_default_timezone_set(getenv('TZ') ?: 'Europe/Paris');

define('ACCESS_CODE', getenv('ACCESS_CODE') ?: '123456');
define('AUTH_MAX_ATTEMPTS', 5);
define('AUTH_WINDOW_MINUTES', 15);
define('ENCRYPTION_KEY', getenv('ENCRYPTION_KEY') ?: '');

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/AuthService.php';
require_once __DIR__ . '/SpotService.php';
