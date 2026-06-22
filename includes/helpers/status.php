<?php

declare(strict_types=1);

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

    $depart = new DateTimeImmutable($trip['depart_at'], app_timezone());
    $return = new DateTimeImmutable($trip['return_at'], app_timezone());

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
