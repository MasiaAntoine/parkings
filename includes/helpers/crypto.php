<?php

declare(strict_types=1);

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
