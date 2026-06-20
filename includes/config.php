<?php

declare(strict_types=1);

function load_env_file(string $path, bool $override = false): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $separator = strpos($line, '=');
        if ($separator === false) {
            continue;
        }

        $name = trim(substr($line, 0, $separator));
        if ($name === '' || (!$override && getenv($name) !== false)) {
            continue;
        }

        $value = trim(substr($line, $separator + 1));
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

function config_root(): string
{
    return function_exists('app_root') ? app_root() : dirname(__DIR__);
}

function is_docker_runtime(): bool
{
    return file_exists('/.dockerenv');
}

if (is_docker_runtime()) {
    load_env_file(config_root() . '/.env.docker.dev');
}
load_env_file(config_root() . '/.env', override: true);

date_default_timezone_set(getenv('TZ') ?: 'Europe/Paris');

define('ACCESS_CODE', getenv('ACCESS_CODE') ?: '123456');
define('AUTH_MAX_ATTEMPTS', 5);
define('AUTH_WINDOW_MINUTES', 15);
define('ENCRYPTION_KEY', getenv('ENCRYPTION_KEY') ?: '');

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/AuthService.php';
require_once __DIR__ . '/SpotService.php';
