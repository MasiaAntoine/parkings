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

function get_action(): string
{
    $body = request_body();
    return (string) ($_GET['action'] ?? $body['action'] ?? '');
}
