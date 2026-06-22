<?php

declare(strict_types=1);

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

    $tz = app_timezone();
    $depart = new DateTimeImmutable($trip['depart_at'], $tz);
    $return = new DateTimeImmutable($trip['return_at'], $tz);

    return 'Déplacement · du ' . format_datetime_short_fr($depart) . ' au ' . format_datetime_short_fr($return);
}

function build_availability_hint(array $spotData, DateTimeImmutable $dt): ?string
{
    $occupied = (bool) ($spotData['occupied'] ?? false);
    $inTrip = !empty($spotData['active_trip']) && is_in_trip($spotData['active_trip'], $dt);
    $inSchedule = is_in_schedule($spotData['schedules'], $dt);
    $tz = app_timezone();

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
