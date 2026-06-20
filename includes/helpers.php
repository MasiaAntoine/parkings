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

function normalize_apartment(string $value): string
{
    $value = trim($value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';

    return mb_strtoupper($value, 'UTF-8');
}

function validate_apartment(string $value): string
{
    $raw = trim($value);
    if ($raw === '' || mb_strlen($raw) > 30) {
        json_error('Numéro d\'appartement invalide.');
    }

    return normalize_apartment($raw);
}

function validate_phone(?string $phone): ?string
{
    if ($phone === null) {
        return null;
    }

    $phone = trim($phone);
    if ($phone === '') {
        return null;
    }

    $digits = preg_replace('/\D/', '', $phone) ?? '';
    if (!preg_match('/^0[1-9]\d{8}$/', $digits)) {
        json_error('Numéro de téléphone invalide.');
    }

    return trim(chunk_split($digits, 2, ' '));
}

function app_encryption_key(): string
{
    $key = ENCRYPTION_KEY;
    $decoded = $key !== '' ? base64_decode($key, true) : false;

    if (is_string($decoded) && strlen($decoded) === 32) {
        return $decoded;
    }

    return hash('sha256', $key !== '' ? $key : ACCESS_CODE, true);
}

function encrypt_value(string $plain): string
{
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', app_encryption_key(), OPENSSL_RAW_DATA, $iv, $tag);

    if ($cipher === false) {
        throw new RuntimeException('Échec du chiffrement.');
    }

    return base64_encode($iv . $tag . $cipher);
}

function decrypt_value(?string $encoded): ?string
{
    if ($encoded === null || $encoded === '') {
        return null;
    }

    $raw = base64_decode($encoded, true);
    if ($raw === false || strlen($raw) < 29) {
        return null;
    }

    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipher = substr($raw, 28);

    $plain = openssl_decrypt($cipher, 'aes-256-gcm', app_encryption_key(), OPENSSL_RAW_DATA, $iv, $tag);

    return $plain === false ? null : $plain;
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

function format_time_fr(string $time): string
{
    [$h, $m] = array_map('intval', explode(':', substr($time, 0, 5)));

    return $m === 0 ? "{$h}h" : sprintf('%dh%02d', $h, $m);
}

function format_datetime_short_fr(DateTimeImmutable $dt): string
{
    $months = ['', 'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

    return (int) $dt->format('j') . ' ' . $months[(int) $dt->format('n')] . ' à ' . format_time_fr($dt->format('H:i'));
}

function day_names_short(): array
{
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
}

function format_day_range(array $days): string
{
    $names = day_names_short();
    sort($days);

    if ($days === [0, 1, 2, 3, 4]) {
        return 'Lun–Ven';
    }
    if ($days === [0, 1, 2, 3, 4, 5, 6]) {
        return 'Tous les jours';
    }
    if ($days === [5, 6]) {
        return 'Sam–Dim';
    }

    return implode(', ', array_map(static fn (int $d): string => $names[$d], $days));
}

function schedule_end_for(array $schedules, DateTimeImmutable $dt): ?string
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
                return substr($schedule['end_time'], 0, 5);
            }
        } elseif ($minutes >= $start || $minutes < $end) {
            return substr($schedule['end_time'], 0, 5);
        }
    }

    return null;
}

function build_schedule_lines(array $schedules): array
{
    if ($schedules === []) {
        return [];
    }

    $groups = [];
    foreach ($schedules as $schedule) {
        $start = substr($schedule['start_time'], 0, 5);
        $end = substr($schedule['end_time'], 0, 5);
        $key = "{$start}-{$end}";
        $groups[$key][] = (int) $schedule['day_of_week'];
    }

    $lines = [];
    foreach ($groups as $key => $days) {
        [$start, $end] = explode('-', $key, 2);
        $lines[] = format_day_range($days) . ' · ' . format_time_fr($start) . '–' . format_time_fr($end);
    }

    return $lines;
}

function format_trip_line(?array $trip): ?string
{
    if ($trip === null || ($trip['cancelled_at'] ?? null) !== null) {
        return null;
    }

    $tz = new DateTimeZone(getenv('TZ') ?: 'Europe/Paris');
    $depart = new DateTimeImmutable($trip['depart_at'], $tz);
    $return = new DateTimeImmutable($trip['return_at'], $tz);

    return 'Déplacement · du ' . format_datetime_short_fr($depart) . ' au ' . format_datetime_short_fr($return);
}

function build_availability_hint(array $spotData, DateTimeImmutable $dt): ?string
{
    $occupied = (bool) ($spotData['occupied'] ?? false);
    $inTrip = !empty($spotData['active_trip']) && is_in_trip($spotData['active_trip'], $dt);
    $inSchedule = is_in_schedule($spotData['schedules'], $dt);
    $tz = new DateTimeZone(getenv('TZ') ?: 'Europe/Paris');

    if ($inTrip) {
        $return = new DateTimeImmutable($spotData['active_trip']['return_at'], $tz);

        if ($occupied) {
            return 'À libérer avant le ' . format_datetime_short_fr($return);
        }

        if ($dt->format('Y-m-d') === $return->format('Y-m-d')) {
            return 'Disponible jusqu\'à ' . format_time_fr($return->format('H:i'));
        }

        return 'Disponible en déplacement · jusqu\'au ' . format_datetime_short_fr($return);
    }

    if ($inSchedule) {
        $end = schedule_end_for($spotData['schedules'], $dt);
        if ($end === null) {
            return null;
        }

        if ($occupied) {
            return 'À libérer avant ' . format_time_fr($end);
        }

        return 'Disponible jusqu\'à ' . format_time_fr($end);
    }

    if ($spotData['schedules'] !== [] && !$inTrip) {
        return 'Hors plage horaire';
    }

    if ($spotData['schedules'] === [] && empty($spotData['active_trip'])) {
        return 'Hors plage · sauf déplacement';
    }

    return null;
}

function format_schedules_for_api(array $schedules): array
{
    return array_map(static function (array $s): array {
        return [
            'day_of_week' => (int) $s['day_of_week'],
            'start_time' => substr($s['start_time'], 0, 5),
            'end_time' => substr($s['end_time'], 0, 5),
        ];
    }, $schedules);
}

function spot_listing_extras(array $spotData, DateTimeImmutable $dt): array
{
    $trip = $spotData['active_trip'] ?? null;

    return [
        'schedules' => format_schedules_for_api($spotData['schedules']),
        'active_trip' => $trip ? [
            'depart_at' => $trip['depart_at'],
            'return_at' => $trip['return_at'],
        ] : null,
        'schedule_lines' => build_schedule_lines($spotData['schedules']),
        'trip_line' => format_trip_line($trip),
        'availability_hint' => build_availability_hint($spotData, $dt),
    ];
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
    $apartment = validate_apartment((string) ($body['apartment'] ?? ''));

    $service = new SpotService();
    if (!$service->verifyOwner($number, $apartment)) {
        json_error('Accès refusé à cette place.', 403);
    }

    return ['number' => $number, 'apartment' => $apartment];
}
