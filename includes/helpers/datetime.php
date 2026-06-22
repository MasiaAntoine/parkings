<?php

declare(strict_types=1);

function app_timezone(): DateTimeZone
{
    static $tz = null;
    if ($tz === null) {
        $tz = new DateTimeZone(getenv('TZ') ?: 'Europe/Paris');
    }
    return $tz;
}

function now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', app_timezone());
}

function parse_datetime(string $value): DateTimeImmutable
{
    $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i', $value, app_timezone());
    if ($dt === false) {
        json_error('Date ou heure invalide.');
    }

    return $dt;
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
