<?php

declare(strict_types=1);

// Façade : regroupe les helpers thématiques.
// L'ordre est important (datetime utilise app_timezone, validation utilise json_error, etc.).
require_once __DIR__ . '/helpers/http.php';
require_once __DIR__ . '/helpers/crypto.php';
require_once __DIR__ . '/helpers/datetime.php';
require_once __DIR__ . '/helpers/validation.php';
require_once __DIR__ . '/helpers/status.php';
require_once __DIR__ . '/helpers/presentation.php';
