<?php

declare(strict_types=1);

/**
 * Gestion des stationnements actifs (table `active_parkings`).
 */
class ParkingService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function getActive(int $spotId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT parked_by_spot_number, phone_encrypted FROM active_parkings WHERE spot_id = ? LIMIT 1'
        );
        $stmt->execute([$spotId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function isOccupied(int $spotId): bool
    {
        return $this->getActive($spotId) !== null;
    }

    public function park(int $spotId, string $parkedBySpotNumber, string $phone): void
    {
        $phoneEncrypted = encrypt_value($phone);

        $stmt = $this->pdo->prepare(
            'INSERT INTO active_parkings (spot_id, parked_by_spot_number, phone_encrypted) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                parked_at = CURRENT_TIMESTAMP,
                parked_by_spot_number = VALUES(parked_by_spot_number),
                phone_encrypted = VALUES(phone_encrypted)'
        );
        $stmt->execute([$spotId, $parkedBySpotNumber, $phoneEncrypted]);
    }

    public function unpark(int $spotId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM active_parkings WHERE spot_id = ?');
        $stmt->execute([$spotId]);
    }
}
