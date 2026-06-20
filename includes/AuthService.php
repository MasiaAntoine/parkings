<?php

declare(strict_types=1);

class AuthService
{
    public function verifyCode(string $code): bool
    {
        $ip = client_ip();
        $pdo = Database::connection();

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM auth_attempts
             WHERE ip_address = ? AND success = 0
             AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)'
        );
        $stmt->execute([$ip, AUTH_WINDOW_MINUTES]);
        $failures = (int) $stmt->fetchColumn();

        if ($failures >= AUTH_MAX_ATTEMPTS) {
            json_error('Trop de tentatives. Réessayez dans 15 minutes.', 429);
        }

        $valid = hash_equals(ACCESS_CODE, $code);
        $insert = $pdo->prepare('INSERT INTO auth_attempts (ip_address, success) VALUES (?, ?)');
        $insert->execute([$ip, $valid ? 1 : 0]);

        return $valid;
    }
}
