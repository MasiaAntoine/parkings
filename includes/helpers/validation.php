<?php

declare(strict_types=1);

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
