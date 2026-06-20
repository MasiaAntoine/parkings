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

    public function listSpots(?string $viewerSpotNumber = null): array
    {
        $stmt = $this->pdo->query(
            'SELECT s.id, s.number, s.phone_encrypted, ap.id AS parking_id, ap.parked_by_spot_number
             FROM spots s
             LEFT JOIN active_parkings ap ON ap.spot_id = s.id
             ORDER BY s.number ASC'
        );

        $rows = $stmt->fetchAll();
        $dt = now();
        $result = [];

        foreach ($rows as $row) {
            $schedules = $this->getSchedules((int) $row['id']);
            $activeTrip = $this->getActiveTrip((int) $row['id']);

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
                'phone' => decrypt_value($row['phone_encrypted']),
            ];

            if ($status === 'occupied') {
                $parkedByMe = $viewerSpotNumber !== null
                    && $row['parked_by_spot_number'] === $viewerSpotNumber;
                $entry['occupation_message'] = occupation_message($parkedByMe);
                $entry['parked_by_me'] = $parkedByMe;
            }

            $result[] = $entry;
        }

        return $result;
    }

    public function getSpotDetails(string $number): array
    {
        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $schedules = $this->getSchedules((int) $spot['id']);
        $trip = $this->getActiveTrip((int) $spot['id']);
        $occupied = $this->isOccupied((int) $spot['id']);

        $spotData = [
            'number' => $spot['number'],
            'occupied' => $occupied,
            'schedules' => $schedules,
            'active_trip' => $trip,
        ];

        $status = compute_status($spotData, now());

        return [
            'number' => $spot['number'],
            'status' => $status,
            'status_label' => status_label($status),
            'has_schedules' => count($schedules) > 0,
            'schedules' => array_map(static function (array $s): array {
                return [
                    'day_of_week' => (int) $s['day_of_week'],
                    'start_time' => substr($s['start_time'], 0, 5),
                    'end_time' => substr($s['end_time'], 0, 5),
                ];
            }, $schedules),
            'active_trip' => $trip ? [
                'depart_at' => $trip['depart_at'],
                'return_at' => $trip['return_at'],
            ] : null,
            'phone' => decrypt_value($spot['phone_encrypted'] ?? null),
        ];
    }

    public function park(string $number, string $parkedBySpotNumber): array
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

        $stmt = $this->pdo->prepare(
            'INSERT INTO active_parkings (spot_id, parked_by_spot_number) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE parked_at = CURRENT_TIMESTAMP, parked_by_spot_number = VALUES(parked_by_spot_number)'
        );
        $stmt->execute([$spot['id'], $parkedBySpotNumber]);

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

    public function createTrip(string $number, DateTimeImmutable $depart, DateTimeImmutable $return): array
    {
        if ($return <= $depart) {
            json_error('La date de retour doit être après le départ.');
        }

        $spot = $this->getByNumber($number);
        if (!$spot) {
            json_error('Place introuvable.', 404);
        }

        $cancel = $this->pdo->prepare(
            'UPDATE spot_trips SET cancelled_at = NOW()
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= NOW()'
        );
        $cancel->execute([$spot['id']]);

        $insert = $this->pdo->prepare(
            'INSERT INTO spot_trips (spot_id, depart_at, return_at) VALUES (?, ?, ?)'
        );
        $insert->execute([
            $spot['id'],
            $depart->format('Y-m-d H:i:s'),
            $return->format('Y-m-d H:i:s'),
        ]);

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

    private function getSchedules(int $spotId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT day_of_week, start_time, end_time FROM spot_schedules WHERE spot_id = ? ORDER BY day_of_week'
        );
        $stmt->execute([$spotId]);
        return $stmt->fetchAll();
    }

    private function getActiveTrip(int $spotId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT depart_at, return_at, cancelled_at FROM spot_trips
             WHERE spot_id = ? AND cancelled_at IS NULL AND return_at >= NOW()
             ORDER BY depart_at DESC LIMIT 1'
        );
        $stmt->execute([$spotId]);
        $trip = $stmt->fetch();
        return $trip ?: null;
    }

    private function isOccupied(int $spotId): bool
    {
        $stmt = $this->pdo->prepare('SELECT id FROM active_parkings WHERE spot_id = ?');
        $stmt->execute([$spotId]);
        return (bool) $stmt->fetch();
    }
}
