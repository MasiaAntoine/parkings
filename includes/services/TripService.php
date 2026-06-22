<?php

declare(strict_types=1);

/**
 * Gestion des déplacements planifiés (table `spot_trips`).
 */
class TripService
{
    private PDO $pdo;
    private ParkingService $parking;
    private AlertService $alerts;

    public function __construct(
        ?PDO $pdo = null,
        ?ParkingService $parking = null,
        ?AlertService $alerts = null,
    ) {
        $this->pdo = $pdo ?? Database::connection();
        $this->parking = $parking ?? new ParkingService($this->pdo);
        $this->alerts = $alerts ?? new AlertService($this->pdo);
    }

    /**
     * Déplacement actif/à venir le plus proche pour le calcul de statut.
     */
    public function getActive(int $spotId, DateTimeImmutable $dt): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, depart_at, return_at, cancelled_at FROM spot_trips
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= ?
             ORDER BY depart_at ASC LIMIT 1'
        );
        $stmt->execute([$spotId, $dt->format('Y-m-d H:i:s')]);
        $trip = $stmt->fetch();
        return $trip ?: null;
    }

    /**
     * Tous les déplacements à venir (non annulés, return_at >= maintenant).
     */
    public function getUpcoming(int $spotId, DateTimeImmutable $now): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, depart_at, return_at, link_group FROM spot_trips
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= ?
             ORDER BY depart_at ASC'
        );
        $stmt->execute([$spotId, $now->format('Y-m-d H:i:s')]);
        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'depart_at' => $row['depart_at'],
                'return_at' => $row['return_at'],
                'link_group' => $row['link_group'] ?: null,
            ];
        }, $stmt->fetchAll());
    }

    public function create(
        int $spotId,
        DateTimeImmutable $depart,
        DateTimeImmutable $return,
        ?string $linkGroup,
    ): void {
        $this->assertValidRange($depart, $return);

        $insert = $this->pdo->prepare(
            'INSERT INTO spot_trips (spot_id, depart_at, return_at, link_group) VALUES (?, ?, ?, ?)'
        );
        $insert->execute([
            $spotId,
            $depart->format('Y-m-d H:i:s'),
            $return->format('Y-m-d H:i:s'),
            $linkGroup,
        ]);
    }

    public function update(
        int $spotId,
        int $tripId,
        DateTimeImmutable $depart,
        DateTimeImmutable $return,
    ): int {
        $this->assertValidRange($depart, $return);

        $stmt = $this->pdo->prepare(
            'UPDATE spot_trips SET depart_at = ?, return_at = ?
             WHERE id = ? AND spot_id = ? AND cancelled_at IS NULL'
        );

        $departStr = $depart->format('Y-m-d H:i:s');
        $returnStr = $return->format('Y-m-d H:i:s');
        $updated = 0;

        foreach ($this->getLinkedTrips($tripId, $spotId) as $trip) {
            $stmt->execute([$departStr, $returnStr, $trip['id'], $trip['spot_id']]);
            $updated += $stmt->rowCount();
        }

        return $updated;
    }

    /**
     * Annule TOUS les déplacements en cours/à venir d'une place. Crée une alerte si occupée.
     */
    public function cancelAllForSpot(int $spotId, string $spotNumber): void
    {
        $wasOccupied = $this->parking->isOccupied($spotId);

        $stmt = $this->pdo->prepare(
            'UPDATE spot_trips SET cancelled_at = NOW()
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= NOW()'
        );
        $stmt->execute([$spotId]);

        if ($wasOccupied) {
            $this->alerts->createOwnerReturn($spotId, $spotNumber);
        }
    }

    /**
     * Annule un déplacement précis (et ses liés). Crée une alerte si la place est occupée
     * et qu'on est dans la période du déplacement.
     *
     * @return int nombre de déplacements annulés
     */
    public function cancelById(int $tripId, int $spotId): int
    {
        $dt = now();
        $dtStr = $dt->format('Y-m-d H:i:s');
        $cancelled = 0;

        foreach ($this->getLinkedTrips($tripId, $spotId) as $trip) {
            $wasOccupied = $this->parking->isOccupied((int) $trip['spot_id']);

            $stmt = $this->pdo->prepare(
                'UPDATE spot_trips SET cancelled_at = NOW()
                 WHERE id = ? AND spot_id = ? AND cancelled_at IS NULL'
            );
            $stmt->execute([$trip['id'], $trip['spot_id']]);
            if ($stmt->rowCount() === 0) {
                continue;
            }

            $cancelled++;
            $isCurrentPeriod = $trip['depart_at'] <= $dtStr && $trip['return_at'] >= $dtStr;
            if ($wasOccupied && $isCurrentPeriod) {
                $this->alerts->createOwnerReturn((int) $trip['spot_id'], $trip['number']);
            }
        }

        return $cancelled;
    }

    public function cleanupExpired(): void
    {
        $this->pdo->exec(
            'UPDATE spot_trips SET cancelled_at = NOW()
             WHERE cancelled_at IS NULL AND return_at < NOW()'
        );
    }

    /**
     * Renvoie le déplacement seul ou TOUS les déplacements liés (même link_group).
     *
     * @return array<int, array{id:int, spot_id:int, number:string, depart_at:string, return_at:string, link_group:?string}>
     */
    private function getLinkedTrips(int $tripId, int $spotId): array
    {
        $sql = 'SELECT st.id, st.spot_id, st.depart_at, st.return_at, st.link_group, s.number
                FROM spot_trips st
                JOIN spots s ON s.id = st.spot_id';

        $stmt = $this->pdo->prepare(
            "{$sql} WHERE st.id = ? AND st.spot_id = ? AND st.cancelled_at IS NULL"
        );
        $stmt->execute([$tripId, $spotId]);
        $trip = $stmt->fetch();
        if (!$trip) {
            return [];
        }

        if (empty($trip['link_group'])) {
            return [$trip];
        }

        $linked = $this->pdo->prepare(
            "{$sql} WHERE st.link_group = ? AND st.cancelled_at IS NULL"
        );
        $linked->execute([$trip['link_group']]);

        return $linked->fetchAll();
    }

    private function assertValidRange(DateTimeImmutable $depart, DateTimeImmutable $return): void
    {
        if ($return <= $depart) {
            json_error('La date de retour doit être après le départ.');
        }
    }
}
