<?php

declare(strict_types=1);

function app_root(): string
{
    static $root = null;
    if ($root !== null) {
        return $root;
    }

    $candidates = [
        dirname(__DIR__), // repo : /includes + /public
        __DIR__,          // Hostinger : tout dans public_html/
    ];

    foreach ($candidates as $candidate) {
        if (is_file($candidate . '/includes/config.php')) {
            $root = $candidate;
            return $root;
        }
    }

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['error' => 'Configuration serveur introuvable (dossier includes/).'],
        JSON_UNESCAPED_UNICODE,
    );
    exit;
}

require_once app_root() . '/includes/config.php';
