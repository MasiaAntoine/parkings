<?php

declare(strict_types=1);

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_response(['error' => $message], $status);
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function request_body(): array
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }

    $body = get_json_body();
    if ($body === []) {
        $body = $_POST;
    }

    return $body;
}

function client_ip(): string
{
    return $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
}

function normalize_spot_number(string $number): string
{
    $digits = preg_replace('/\D/', '', $number);
    if ($digits === null || $digits === '' || strlen($digits) > 3) {
        json_error('Numéro de place invalide.');
    }

    return str_pad($digits, 3, '0', STR_PAD_LEFT);
}

function normalize_first_name(string $name): string
{
    $name = mb_strtolower(trim($name), 'UTF-8');

    if (function_exists('transliterator_transliterate')) {
        $converted = transliterator_transliterate('Any-Latin; Latin-ASCII', $name);
        if (is_string($converted)) {
            $name = strtolower($converted);
        }
    } else {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
        if (is_string($converted)) {
            $name = strtolower($converted);
        }
    }

    return preg_replace('/[^a-z]/', '', $name) ?? '';
}

function validate_first_name(string $name): string
{
    $raw = trim($name);
    if ($raw === '' || mb_strlen($raw) > 50) {
        json_error('Prénom invalide.');
    }

    $normalized = normalize_first_name($raw);
    if ($normalized === '') {
        json_error('Prénom invalide.');
    }

    return $normalized;
}

function parse_datetime(string $value): DateTimeImmutable
{
    $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i', $value, new DateTimeZone(getenv('TZ') ?: 'Europe/Paris'));
    if ($dt === false) {
        json_error('Date ou heure invalide.');
    }

    return $dt;
}

function now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone(getenv('TZ') ?: 'Europe/Paris'));
}

function day_of_week(DateTimeImmutable $dt): int
{
    return (int) $dt->format('N') - 1;
}

function time_to_minutes(string $time): int
{
    [$h, $m] = array_map('intval', explode(':', $time));
    return $h * 60 + $m;
}

function current_minutes(DateTimeImmutable $dt): int
{
    return (int) $dt->format('G') * 60 + (int) $dt->format('i');
}

function is_in_schedule(array $schedules, DateTimeImmutable $dt): bool
{
    $dow = day_of_week($dt);
    $minutes = current_minutes($dt);

    foreach ($schedules as $schedule) {
        if ((int) $schedule['day_of_week'] !== $dow) {
            continue;
        }

        $start = time_to_minutes(substr($schedule['start_time'], 0, 5));
        $end = time_to_minutes(substr($schedule['end_time'], 0, 5));

        if ($start <= $end) {
            if ($minutes >= $start && $minutes < $end) {
                return true;
            }
        } elseif ($minutes >= $start || $minutes < $end) {
            return true;
        }
    }

    return false;
}

function is_in_trip(array $trip, DateTimeImmutable $dt): bool
{
    if ($trip['cancelled_at'] !== null) {
        return false;
    }

    $depart = new DateTimeImmutable($trip['depart_at'], new DateTimeZone(getenv('TZ') ?: 'Europe/Paris'));
    $return = new DateTimeImmutable($trip['return_at'], new DateTimeZone(getenv('TZ') ?: 'Europe/Paris'));

    return $dt >= $depart && $dt <= $return;
}

function compute_status(array $spot, DateTimeImmutable $dt): string
{
    if ($spot['occupied']) {
        return 'occupied';
    }

    if ($spot['active_trip'] && is_in_trip($spot['active_trip'], $dt)) {
        return 'available';
    }

    if (is_in_schedule($spot['schedules'], $dt)) {
        return 'available';
    }

    return 'off_hours';
}

function status_label(string $status): string
{
    return match ($status) {
        'available' => 'Disponible',
        'occupied' => 'Occupée',
        default => 'Hors plage',
    };
}

function occupation_message(bool $parkedByMe): string
{
    return $parkedByMe
        ? 'Vous êtes garé sur cette place'
        : 'Une personne est garée sur cette place';
}

function get_action(): string
{
    $body = request_body();
    return (string) ($_GET['action'] ?? $body['action'] ?? '');
}

function require_spot_credentials(): array
{
    $body = request_body();
    $number = normalize_spot_number((string) ($body['number'] ?? ''));
    $firstName = validate_first_name((string) ($body['first_name'] ?? ''));

    $service = new SpotService();
    if (!$service->verifyOwner($number, $firstName)) {
        json_error('Accès refusé à cette place.', 403);
    }

    return ['number' => $number, 'first_name' => $firstName];
}
