<?php

declare(strict_types=1);

/**
 * Construit les réponses API pour le listing/détail des places.
 *
 * Centralise la logique de visibilité du téléphone (le propriétaire est le seul
 * à pouvoir voir le téléphone de la personne garée sur sa place).
 */
class SpotPresenter
{
    private PDO $pdo;
    private ScheduleService $schedules;
    private TripService $trips;
    private ParkingService $parking;
    private SpotRepository $repo;

    public function __construct(
        SpotRepository $repo,
        ScheduleService $schedules,
        TripService $trips,
        ParkingService $parking,
        ?PDO $pdo = null,
    ) {
        $this->pdo = $pdo ?? Database::connection();
        $this->repo = $repo;
        $this->schedules = $schedules;
        $this->trips = $trips;
        $this->parking = $parking;
    }

    public function listAll(?string $viewerSpotNumber, ?DateTimeImmutable $at): array
    {
        $this->trips->cleanupExpired();

        $stmt = $this->pdo->query(
            'SELECT s.id, s.number, s.phone_encrypted,
                    ap.id AS parking_id, ap.parked_by_spot_number,
                    ap.phone_encrypted AS parked_phone_encrypted
             FROM spots s
             LEFT JOIN active_parkings ap ON ap.spot_id = s.id
             ORDER BY s.number ASC'
        );

        $rows = $stmt->fetchAll();
        $dt = $at ?? now();

        return array_map(
            fn (array $row) => $this->buildListEntry($row, $viewerSpotNumber, $dt),
            $rows,
        );
    }

    public function details(string $number, ?string $viewerSpotNumber): array
    {
        $spot = $this->repo->requireByNumber($number);
        $dt = now();
        $spotId = (int) $spot['id'];

        $schedules = $this->schedules->get($spotId);
        $trip = $this->trips->getActive($spotId, $dt);
        $upcomingTrips = $this->trips->getUpcoming($spotId, $dt);
        $activeParking = $this->parking->getActive($spotId);

        $spotData = [
            'number' => $spot['number'],
            'occupied' => $activeParking !== null,
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
        ], $this->contactFields(
            $spot['number'],
            $status,
            $spot['phone_encrypted'] ?? null,
            $activeParking,
            $viewerSpotNumber,
        ));
    }

    private function buildListEntry(array $row, ?string $viewerSpotNumber, DateTimeImmutable $dt): array
    {
        $spotId = (int) $row['id'];
        $schedules = $this->schedules->get($spotId);
        $activeTrip = $this->trips->getActive($spotId, $dt);

        $spotData = [
            'number' => $row['number'],
            'occupied' => $row['parking_id'] !== null,
            'schedules' => $schedules,
            'active_trip' => $activeTrip,
        ];

        $status = compute_status($spotData, $dt);
        $activeParking = $row['parking_id'] !== null
            ? [
                'parked_by_spot_number' => $row['parked_by_spot_number'],
                'phone_encrypted' => $row['parked_phone_encrypted'],
            ]
            : null;

        $entry = array_merge(
            [
                'number' => $row['number'],
                'status' => $status,
                'status_label' => status_label($status),
            ],
            $this->contactFields(
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

        return array_merge($entry, spot_listing_extras($spotData, $dt));
    }

    /**
     * @return array{phone?: ?string, parked_by_spot_number?: ?string, parked_contact_phone?: ?string}
     */
    private function contactFields(
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

        $viewerIsOwner = $viewerSpotNumber !== null && $viewerSpotNumber === $spotNumber;
        if ($status === 'occupied' && $viewerIsOwner && $activeParking !== null) {
            $fields['parked_by_spot_number'] = $activeParking['parked_by_spot_number'];
            $fields['parked_contact_phone'] = decrypt_value($activeParking['phone_encrypted'] ?? null);
        }

        return $fields;
    }
}
