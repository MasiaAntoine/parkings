<?php

declare(strict_types=1);

/**
 * Accès bas-niveau à la table `spots` : lecture, écriture, vérification owner.
 */
class SpotRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function exists(string $number): bool
    {
        $stmt = $this->pdo->prepare('SELECT id FROM spots WHERE number = ?');
        $stmt->execute([$number]);
        return (bool) $stmt->fetch();
    }

    public function getByNumber(string $number): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM spots WHERE number = ?');
        $stmt->execute([$number]);
        $spot = $stmt->fetch();
        return $spot ?: null;
    }

    public function requireByNumber(string $number): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }
        return $spot;
    }

    public function verifyOwner(string $number, string $apartment): bool
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            return false;
        }

        return password_verify($apartment, $spot['apartment_hash']);
    }

    public function create(string $number, string $apartment, ?string $phone): void
    {
        $hash = password_hash($apartment, PASSWORD_DEFAULT);
        $phoneEncrypted = $phone !== null ? encrypt_value($phone) : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO spots (number, apartment_hash, phone_encrypted) VALUES (?, ?, ?)'
        );
        $stmt->execute([$number, $hash, $phoneEncrypted]);
    }

    public function updatePhone(int $spotId, ?string $phone): void
    {
        $phoneEncrypted = $phone !== null ? encrypt_value($phone) : null;
        $stmt = $this->pdo->prepare('UPDATE spots SET phone_encrypted = ? WHERE id = ?');
        $stmt->execute([$phoneEncrypted, $spotId]);
    }

    public function delete(int $spotId): void
    {
        // Les FK ON DELETE CASCADE suppriment schedules, trips, parkings, alerts
        $stmt = $this->pdo->prepare('DELETE FROM spots WHERE id = ?');
        $stmt->execute([$spotId]);
    }

    public function rename(string $currentNumber, string $newNumber): void
    {
        $stmt = $this->pdo->prepare('UPDATE spots SET number = ? WHERE number = ?');
        $stmt->execute([$newNumber, $currentNumber]);
    }
}
