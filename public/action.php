<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$action = get_action();
if ($action === '') {
    json_error('Action manquante.', 400);
}

try {
    $body = request_body();
    $auth = new AuthService();
    $spots = new SpotService();

    match ($action) {
        'verify_code' => (function () use ($auth, $body): void {
            $code = (string) ($body['code'] ?? '');
            if (!preg_match('/^\d{6}$/', $code)) {
                json_error('Code invalide.');
            }
            if (!$auth->verifyCode($code)) {
                json_error('Code incorrect.', 401);
            }
            json_response(['valid' => true]);
        })(),

        'list_spots' => (function () use ($spots, $body): void {
            $viewer = (string) ($body['viewer_number'] ?? '');
            $viewerNumber = $viewer !== '' ? normalize_spot_number($viewer) : null;
            $atRaw = (string) ($body['at_datetime'] ?? '');
            $at = $atRaw !== '' ? parse_datetime($atRaw) : null;
            json_response(['spots' => $spots->listSpots($viewerNumber, $at)]);
        })(),

        'spot_exists' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? $_GET['number'] ?? ''));
            json_response([
                'exists' => $spots->exists($number),
                'has_schedules' => $spots->hasSchedules($number),
            ]);
        })(),

        'get_spot' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? $_GET['number'] ?? ''));
            $viewer = (string) ($body['viewer_number'] ?? '');
            $viewerNumber = $viewer !== '' ? normalize_spot_number($viewer) : null;
            json_response($spots->getSpotDetails($number, $viewerNumber));
        })(),

        'register_spot' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $apartment = validate_apartment((string) ($body['apartment'] ?? ''));
            $phone = validate_phone(isset($body['phone']) ? (string) $body['phone'] : null);
            json_response($spots->register($number, $apartment, $phone), 201);
        })(),

        'update_phone' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            $phone = validate_phone(isset($body['phone']) ? (string) $body['phone'] : null);
            json_response($spots->updatePhone($number, $phone));
        })(),

        'confirm_spot' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $apartment = validate_apartment((string) ($body['apartment'] ?? ''));
            json_response($spots->confirm($number, $apartment));
        })(),

        'save_schedules' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            $schedules = $body['schedules'] ?? [];
            if (!is_array($schedules)) {
                json_error('Horaires invalides.');
            }
            json_response($spots->saveSchedules($number, $schedules));
        })(),

        'park' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $parkedBy = normalize_spot_number((string) ($body['parked_by'] ?? ''));
            $phone = validate_phone((string) ($body['phone'] ?? ''));
            if ($phone === null) {
                json_error('Numéro de téléphone requis.');
            }
            json_response($spots->park($number, $parkedBy, $phone));
        })(),

        'unpark' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            json_response($spots->unpark($number));
        })(),

        'create_trip' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            $depart = parse_datetime((string) ($body['depart_at'] ?? ''));
            $return = parse_datetime((string) ($body['return_at'] ?? ''));
            $linkGroup = trim((string) ($body['link_group'] ?? ''));
            if ($linkGroup !== '' && !preg_match('/^[0-9a-f-]{36}$/i', $linkGroup)) {
                json_error('Groupe de liaison invalide.');
            }
            json_response($spots->createTrip(
                $number,
                $depart,
                $return,
                $linkGroup !== '' ? $linkGroup : null,
            ));
        })(),

        'update_trip' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            $tripId = (int) ($body['trip_id'] ?? 0);
            if ($tripId <= 0) {
                json_error('ID de déplacement invalide.');
            }
            $depart = parse_datetime((string) ($body['depart_at'] ?? ''));
            $return = parse_datetime((string) ($body['return_at'] ?? ''));
            json_response($spots->updateTrip($number, $tripId, $depart, $return));
        })(),

        'cancel_trip' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            json_response($spots->cancelTrip($number));
        })(),

        'cancel_trip_by_id' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $credentials = require_spot_credentials();
            if ($credentials['number'] !== $number) {
                json_error('Accès refusé.', 403);
            }
            $tripId = (int) ($body['trip_id'] ?? 0);
            if ($tripId <= 0) {
                json_error('ID de déplacement invalide.');
            }
            json_response($spots->cancelTripById($number, $tripId));
        })(),

        'delete_spot' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $apartment = validate_apartment((string) ($body['apartment'] ?? ''));
            $spots->deleteSpot($number, $apartment);
            json_response(['deleted' => true]);
        })(),

        'change_number' => (function () use ($spots, $body): void {
            $number = normalize_spot_number((string) ($body['number'] ?? ''));
            $apartment = validate_apartment((string) ($body['apartment'] ?? ''));
            $newNumber = normalize_spot_number((string) ($body['new_number'] ?? ''));
            json_response($spots->changeNumber($number, $newNumber, $apartment));
        })(),

        'list_alerts' => json_response(['alerts' => $spots->getAlerts()]),

        'dismiss_alert' => (function () use ($spots, $body): void {
            $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
            $spots->dismissAlert($id);
            json_response(['dismissed' => true]);
        })(),

        'health' => (function (): void {
            Database::connection()->query('SELECT 1');
            json_response(['ok' => true]);
        })(),

        default => json_error('Action inconnue.', 404),
    };
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_error('Erreur serveur.', 500);
}
