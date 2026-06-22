<?php

declare(strict_types=1);

/**
 * Gestion des alertes (retour anticipé d'un propriétaire).
 */
class AlertService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function listActive(): array
    {
        $stmt = $this->pdo->query(
            'SELECT sa.id, sa.message, sa.created_at, s.number
             FROM spot_alerts sa
             JOIN spots s ON s.id = sa.spot_id
             WHERE sa.dismissed_at IS NULL
             AND sa.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
             ORDER BY sa.created_at DESC'
        );

        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'message' => $row['message'],
                'number' => $row['number'],
                'created_at' => $row['created_at'],
            ];
        }, $stmt->fetchAll());
    }

    public function dismiss(int $alertId): void
    {
        $stmt = $this->pdo->prepare('UPDATE spot_alerts SET dismissed_at = NOW() WHERE id = ?');
        $stmt->execute([$alertId]);
    }

    public function createOwnerReturn(int $spotId, string $spotNumber): void
    {
        $message = "Le propriétaire de la place {$spotNumber} est de retour.";
        $stmt = $this->pdo->prepare(
            'INSERT INTO spot_alerts (spot_id, message) VALUES (?, ?)'
        );
        $stmt->execute([$spotId, $message]);
    }
}
