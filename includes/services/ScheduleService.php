<?php

declare(strict_types=1);

/**
 * Gestion des plages horaires récurrentes d'une place.
 */
class ScheduleService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function get(int $spotId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT day_of_week, start_time, end_time FROM spot_schedules WHERE spot_id = ? ORDER BY day_of_week'
        );
        $stmt->execute([$spotId]);
        return $stmt->fetchAll();
    }

    public function hasAny(int $spotId): bool
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM spot_schedules WHERE spot_id = ?');
        $stmt->execute([$spotId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Remplace toutes les plages d'une place (transactionnel).
     */
    public function replace(int $spotId, array $schedules): void
    {
        $this->pdo->beginTransaction();
        try {
            $delete = $this->pdo->prepare('DELETE FROM spot_schedules WHERE spot_id = ?');
            $delete->execute([$spotId]);

            $insert = $this->pdo->prepare(
                'INSERT INTO spot_schedules (spot_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
            );

            foreach ($schedules as $schedule) {
                $this->insertOne($insert, $spotId, $schedule);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    private function insertOne(PDOStatement $insert, int $spotId, array $schedule): void
    {
        $dow = (int) ($schedule['day_of_week'] ?? -1);
        $start = (string) ($schedule['start_time'] ?? '');
        $end = (string) ($schedule['end_time'] ?? '');

        if (
            $dow < 0
            || $dow > 6
            || !preg_match('/^\d{2}:\d{2}$/', $start)
            || !preg_match('/^\d{2}:\d{2}$/', $end)
        ) {
            json_error('Horaire invalide.');
        }

        $insert->execute([$spotId, $dow, $start . ':00', $end . ':00']);
    }
}
