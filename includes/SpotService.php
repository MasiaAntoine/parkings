<?php

declare(strict_types=1);

class SpotService
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::connection();
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

    public function verifyOwner(string $number, string $apartment): bool
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            return false;
        }

        return password_verify($apartment, $spot['apartment_hash']);
    }

    public function register(string $number, string $apartment, ?string $phone = null): array
    {
        if ($this->exists($number)) {
            json_error('Cette place est déjà enregistrée.');
        }

        $hash = password_hash($apartment, PASSWORD_DEFAULT);
        $phoneEncrypted = $phone !== null ? encrypt_value($phone) : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO spots (number, apartment_hash, phone_encrypted) VALUES (?, ?, ?)'
        );
        $stmt->execute([$number, $hash, $phoneEncrypted]);

        return $this->getSpotDetails($number);
    }

    public function updatePhone(string $number, ?string $phone): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $phoneEncrypted = $phone !== null ? encrypt_value($phone) : null;
        $stmt = $this->pdo->prepare('UPDATE spots SET phone_encrypted = ? WHERE id = ?');
        $stmt->execute([$phoneEncrypted, $spot['id']]);

        return $this->getSpotDetails($number);
    }

    public function confirm(string $number, string $apartment): array
    {
        if (!$this->verifyOwner($number, $apartment)) {
            json_error('Numéro d\'appartement incorrect.', 403);
        }

        return $this->getSpotDetails($number);
    }

    public function hasSchedules(string $number): bool
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            return false;
        }

        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM spot_schedules WHERE spot_id = ?');
        $stmt->execute([$spot['id']]);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function saveSchedules(string $number, array $schedules): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $this->pdo->beginTransaction();
        try {
            $delete = $this->pdo->prepare('DELETE FROM spot_schedules WHERE spot_id = ?');
            $delete->execute([$spot['id']]);

            $insert = $this->pdo->prepare(
                'INSERT INTO spot_schedules (spot_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
            );

            foreach ($schedules as $schedule) {
                $dow = (int) ($schedule['day_of_week'] ?? -1);
                $start = (string) ($schedule['start_time'] ?? '');
                $end = (string) ($schedule['end_time'] ?? '');

                if ($dow < 0 || $dow > 6 || !preg_match('/^\d{2}:\d{2}$/', $start) || !preg_match('/^\d{2}:\d{2}$/', $end)) {
                    json_error('Horaire invalide.');
                }

                $insert->execute([$spot['id'], $dow, $start . ':00', $end . ':00']);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $this->getSpotDetails($number);
    }

    public function listSpots(?string $viewerSpotNumber = null, ?DateTimeImmutable $at = null): array
    {
        // Nettoyage automatique des déplacements expirés
        $this->cleanupExpiredTrips();

        $stmt = $this->pdo->query(
            'SELECT s.id, s.number, s.phone_encrypted, ap.id AS parking_id, ap.parked_by_spot_number, ap.phone_encrypted AS parked_phone_encrypted
             FROM spots s
             LEFT JOIN active_parkings ap ON ap.spot_id = s.id
             ORDER BY s.number ASC'
        );

        $rows = $stmt->fetchAll();
        $dt = $at ?? now();
        $result = [];

        foreach ($rows as $row) {
            $schedules = $this->getSchedules((int) $row['id']);
            $activeTrip = $this->getActiveTrip((int) $row['id'], $dt);

            $spotData = [
                'number' => $row['number'],
                'occupied' => $row['parking_id'] !== null,
                'schedules' => $schedules,
                'active_trip' => $activeTrip,
            ];

            $status = compute_status($spotData, $dt);
            $entry = [
                'number' => $row['number'],
                'status' => $status,
                'status_label' => status_label($status),
            ];

            $activeParking = $row['parking_id'] !== null
                ? [
                    'parked_by_spot_number' => $row['parked_by_spot_number'],
                    'phone_encrypted' => $row['parked_phone_encrypted'],
                ]
                : null;

            $entry = array_merge(
                $entry,
                $this->spotContactFields(
                    $row['number'],
                    $status,
                    $row['phone_encrypted'],
                    $activeParking,
                    $viewerSpotNumber,
                ),
            );

            if ($status === 'occupied') {
                $parkedByMe = $viewerSpotNumber !== null
                    && $row['parked_by_spot_number'] === $viewerSpotNumber;
                $entry['occupation_message'] = occupation_message($parkedByMe);
                $entry['parked_by_me'] = $parkedByMe;
            }

            $entry = array_merge($entry, spot_listing_extras($spotData, $dt));

            $result[] = $entry;
        }

        return $result;
    }

    public function getSpotDetails(string $number, ?string $viewerSpotNumber = null): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $dt = now();
        $schedules = $this->getSchedules((int) $spot['id']);
        $trip = $this->getActiveTrip((int) $spot['id'], $dt);
        $upcomingTrips = $this->getUpcomingTrips((int) $spot['id'], $dt);
        $activeParking = $this->getActiveParking((int) $spot['id']);
        $occupied = $activeParking !== null;

        $spotData = [
            'number' => $spot['number'],
            'occupied' => $occupied,
            'schedules' => $schedules,
            'active_trip' => $trip,
        ];

        $status = compute_status($spotData, $dt);

        return array_merge([
            'number' => $spot['number'],
            'status' => $status,
            'status_label' => status_label($status),
            'has_schedules' => count($schedules) > 0,
            'schedules' => format_schedules_for_api($schedules),
            'schedule_lines' => build_schedule_lines($schedules),
            'trip_line' => format_trip_line($trip),
            'availability_hint' => build_availability_hint($spotData, $dt),
            'active_trip' => $trip ? [
                'id' => (int) $trip['id'],
                'depart_at' => $trip['depart_at'],
                'return_at' => $trip['return_at'],
            ] : null,
            'upcoming_trips' => $upcomingTrips,
        ], $this->spotContactFields(
            $spot['number'],
            $status,
            $spot['phone_encrypted'] ?? null,
            $activeParking,
            $viewerSpotNumber,
        ));
    }

    public function park(string $number, string $parkedBySpotNumber, string $phone): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        if (!$this->exists($parkedBySpotNumber)) {
            json_error('Profil invalide.');
        }

        $details = $this->getSpotDetails($number);
        if ($details['status'] !== 'available') {
            json_error('Cette place n\'est pas disponible.');
        }

        $phoneEncrypted = encrypt_value($phone);

        $stmt = $this->pdo->prepare(
            'INSERT INTO active_parkings (spot_id, parked_by_spot_number, phone_encrypted) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE parked_at = CURRENT_TIMESTAMP, parked_by_spot_number = VALUES(parked_by_spot_number), phone_encrypted = VALUES(phone_encrypted)'
        );
        $stmt->execute([$spot['id'], $parkedBySpotNumber, $phoneEncrypted]);

        return ['number' => $number, 'parked' => true];
    }

    public function unpark(string $number): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $stmt = $this->pdo->prepare('DELETE FROM active_parkings WHERE spot_id = ?');
        $stmt->execute([$spot['id']]);

        return ['number' => $number, 'parked' => false];
    }

    /**
     * Crée un nouveau déplacement sans annuler les existants (plusieurs déplacements possibles).
     */
    public function createTrip(
        string $number,
        DateTimeImmutable $depart,
        DateTimeImmutable $return,
        ?string $linkGroup = null,
    ): array {
        if ($return <= $depart) {
            json_error('La date de retour doit être après le départ.');
        }

        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $insert = $this->pdo->prepare(
            'INSERT INTO spot_trips (spot_id, depart_at, return_at, link_group) VALUES (?, ?, ?, ?)'
        );
        $insert->execute([
            $spot['id'],
            $depart->format('Y-m-d H:i:s'),
            $return->format('Y-m-d H:i:s'),
            $linkGroup,
        ]);

        return $this->getSpotDetails($number);
    }

    /**
     * Met à jour un déplacement existant.
     */
    public function updateTrip(string $number, int $tripId, DateTimeImmutable $depart, DateTimeImmutable $return): array
    {
        if ($return <= $depart) {
            json_error('La date de retour doit être après le départ.');
        }

        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $stmt = $this->pdo->prepare(
            'UPDATE spot_trips SET depart_at = ?, return_at = ?
             WHERE id = ? AND spot_id = ? AND cancelled_at IS NULL'
        );

        $departStr = $depart->format('Y-m-d H:i:s');
        $returnStr = $return->format('Y-m-d H:i:s');
        $updated = 0;

        foreach ($this->getTripsToSync($tripId, (int) $spot['id']) as $trip) {
            $stmt->execute([$departStr, $returnStr, $trip['id'], $trip['spot_id']]);
            $updated += $stmt->rowCount();
        }

        if ($updated === 0) {
            json_error('Déplacement introuvable.', 404);
        }

        return $this->getSpotDetails($number);
    }

    public function cancelTrip(string $number): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $wasOccupied = $this->isOccupied((int) $spot['id']);

        $stmt = $this->pdo->prepare(
            'UPDATE spot_trips SET cancelled_at = NOW()
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= NOW()'
        );
        $stmt->execute([$spot['id']]);

        if ($wasOccupied) {
            $message = "Le propriétaire de la place {$number} est de retour.";
            $alert = $this->pdo->prepare(
                'INSERT INTO spot_alerts (spot_id, message) VALUES (?, ?)'
            );
            $alert->execute([$spot['id'], $message]);
        }

        return $this->getSpotDetails($number);
    }

    /**
     * Annule un déplacement spécifique par son id.
     */
    public function cancelTripById(string $number, int $tripId): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $dt = now();
        $dtStr = $dt->format('Y-m-d H:i:s');
        $cancelled = 0;

        foreach ($this->getTripsToSync($tripId, (int) $spot['id']) as $trip) {
            $wasOccupied = $this->isOccupied((int) $trip['spot_id']);

            $stmt = $this->pdo->prepare(
                'UPDATE spot_trips SET cancelled_at = NOW()
                 WHERE id = ? AND spot_id = ? AND cancelled_at IS NULL'
            );
            $stmt->execute([$trip['id'], $trip['spot_id']]);
            $cancelled += $stmt->rowCount();

            if ($stmt->rowCount() === 0) {
                continue;
            }

            if ($wasOccupied && $trip['depart_at'] <= $dtStr && $trip['return_at'] >= $dtStr) {
                $message = "Le propriétaire de la place {$trip['number']} est de retour.";
                $alert = $this->pdo->prepare(
                    'INSERT INTO spot_alerts (spot_id, message) VALUES (?, ?)'
                );
                $alert->execute([$trip['spot_id'], $message]);
            }
        }

        if ($cancelled === 0) {
            json_error('Déplacement introuvable.', 404);
        }

        return $this->getSpotDetails($number);
    }

    /**
     * Supprime une place et toutes ses données associées.
     */
    public function deleteSpot(string $number, string $apartment): void
    {
        if (!$this->verifyOwner($number, $apartment)) {
            json_error('Accès refusé.', 403);
        }

        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        // Les FK ON DELETE CASCADE suppriment schedules, trips, parkings, alerts
        $stmt = $this->pdo->prepare('DELETE FROM spots WHERE id = ?');
        $stmt->execute([$spot['id']]);
    }

    public function changeNumber(string $currentNumber, string $newNumber, string $apartment): array
    {
        if ($currentNumber === $newNumber) {
            json_error('Le nouveau numéro est identique.');
        }

        if (!$this->verifyOwner($currentNumber, $apartment)) {
            json_error('Accès refusé.', 403);
        }

        if ($this->exists($newNumber)) {
            json_error('Ce numéro de place est déjà pris.');
        }

        $stmt = $this->pdo->prepare('UPDATE spots SET number = ? WHERE number = ?');
        $stmt->execute([$newNumber, $currentNumber]);

        return $this->getSpotDetails($newNumber);
    }

    public function getAlerts(): array
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

    public function dismissAlert(int $alertId): void
    {
        $stmt = $this->pdo->prepare('UPDATE spot_alerts SET dismissed_at = NOW() WHERE id = ?');
        $stmt->execute([$alertId]);
    }

    /**
     * Supprime les déplacements dont la date de retour est passée.
     */
    public function cleanupExpiredTrips(): void
    {
        $this->pdo->exec(
            'UPDATE spot_trips SET cancelled_at = NOW()
             WHERE cancelled_at IS NULL AND return_at < NOW()'
        );
    }

    private function getSchedules(int $spotId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT day_of_week, start_time, end_time FROM spot_schedules WHERE spot_id = ? ORDER BY day_of_week'
        );
        $stmt->execute([$spotId]);
        return $stmt->fetchAll();
    }

    /**
     * Retourne le déplacement le plus proche actif ou à venir (pour le calcul de statut).
     */
    private function getActiveTrip(int $spotId, DateTimeImmutable $dt): ?array
    {
        $dtStr = $dt->format('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            'SELECT id, depart_at, return_at, cancelled_at FROM spot_trips
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= ?
             ORDER BY depart_at ASC LIMIT 1'
        );
        $stmt->execute([$spotId, $dtStr]);
        $trip = $stmt->fetch();
        return $trip ?: null;
    }

    /**
     * Retourne tous les déplacements à venir (non annulés, return_at >= maintenant).
     */
    private function getUpcomingTrips(int $spotId, DateTimeImmutable $now): array
    {
        $nowStr = $now->format('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            'SELECT id, depart_at, return_at, link_group FROM spot_trips
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= ?
             ORDER BY depart_at ASC'
        );
        $stmt->execute([$spotId, $nowStr]);
        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'depart_at' => $row['depart_at'],
                'return_at' => $row['return_at'],
                'link_group' => $row['link_group'] ?: null,
            ];
        }, $stmt->fetchAll());
    }

    /**
     * Déplacements liés (même link_group) ou le déplacement seul.
     *
     * @return array<int, array{id:int, spot_id:int, number:string, depart_at:string, return_at:string, link_group:?string}>
     */
    private function getTripsToSync(int $tripId, int $spotId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT st.id, st.spot_id, st.depart_at, st.return_at, st.link_group, s.number
             FROM spot_trips st
             JOIN spots s ON s.id = st.spot_id
             WHERE st.id = ? AND st.spot_id = ? AND st.cancelled_at IS NULL'
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
            'SELECT st.id, st.spot_id, st.depart_at, st.return_at, st.link_group, s.number
             FROM spot_trips st
             JOIN spots s ON s.id = st.spot_id
             WHERE st.link_group = ? AND st.cancelled_at IS NULL'
        );
        $linked->execute([$trip['link_group']]);

        return $linked->fetchAll();
    }

    private function isOccupied(int $spotId): bool
    {
        return $this->getActiveParking($spotId) !== null;
    }

    private function getActiveParking(int $spotId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT parked_by_spot_number, phone_encrypted FROM active_parkings WHERE spot_id = ? LIMIT 1'
        );
        $stmt->execute([$spotId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    /**
     * @return array{phone?: ?string, parked_by_spot_number?: ?string, parked_contact_phone?: ?string}
     */
    private function spotContactFields(
        string $spotNumber,
        string $status,
        ?string $ownerPhoneEncrypted,
        ?array $activeParking,
        ?string $viewerSpotNumber,
    ): array {
        $fields = [];

        if ($status !== 'occupied') {
            $fields['phone'] = decrypt_value($ownerPhoneEncrypted);
        }

        if (
            $status === 'occupied'
            && $viewerSpotNumber !== null
            && $viewerSpotNumber === $spotNumber
            && $activeParking !== null
        ) {
            $fields['parked_by_spot_number'] = $activeParking['parked_by_spot_number'];
            $fields['parked_contact_phone'] = decrypt_value($activeParking['phone_encrypted'] ?? null);
        }

        return $fields;
    }
}
