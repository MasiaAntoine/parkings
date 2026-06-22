<?php

declare(strict_types=1);

/**
 * Façade haute-niveau orchestrant les services spécialisés.
 *
 * Garde l'API publique stable pour `action.php` : chaque méthode délègue à
 * `SpotRepository`, `ScheduleService`, `TripService`, `ParkingService`,
 * `AlertService`, ou `SpotPresenter`.
 */
class SpotService
{
    private SpotRepository $repo;
    private ScheduleService $schedules;
    private TripService $trips;
    private ParkingService $parking;
    private AlertService $alerts;
    private SpotPresenter $presenter;

    public function __construct()
    {
        $pdo = Database::connection();
        $this->repo = new SpotRepository($pdo);
        $this->schedules = new ScheduleService($pdo);
        $this->parking = new ParkingService($pdo);
        $this->alerts = new AlertService($pdo);
        $this->trips = new TripService($pdo, $this->parking, $this->alerts);
        $this->presenter = new SpotPresenter(
            $this->repo,
            $this->schedules,
            $this->trips,
            $this->parking,
            $pdo,
        );
    }

    // --- Spots ---

    public function exists(string $number): bool
    {
        return $this->repo->exists($number);
    }

    public function getByNumber(string $number): ?array
    {
        return $this->repo->getByNumber($number);
    }

    public function verifyOwner(string $number, string $apartment): bool
    {
        return $this->repo->verifyOwner($number, $apartment);
    }

    public function register(string $number, string $apartment, ?string $phone = null): array
    {
        if ($this->repo->exists($number)) {
            json_error('Cette place est déjà enregistrée.');
        }

        $this->repo->create($number, $apartment, $phone);
        return $this->presenter->details($number, null);
    }

    public function updatePhone(string $number, ?string $phone): array
    {
        $spot = $this->repo->requireByNumber($number);
        $this->repo->updatePhone((int) $spot['id'], $phone);
        return $this->presenter->details($number, null);
    }

    public function confirm(string $number, string $apartment): array
    {
        if (!$this->repo->verifyOwner($number, $apartment)) {
            json_error('Numéro d\'appartement incorrect.', 403);
        }

        return $this->presenter->details($number, null);
    }

    public function deleteSpot(string $number, string $apartment): void
    {
        if (!$this->repo->verifyOwner($number, $apartment)) {
            json_error('Accès refusé.', 403);
        }

        $spot = $this->repo->requireByNumber($number);
        $this->repo->delete((int) $spot['id']);
    }

    public function changeNumber(string $currentNumber, string $newNumber, string $apartment): array
    {
        if ($currentNumber === $newNumber) {
            json_error('Le nouveau numéro est identique.');
        }

        if (!$this->repo->verifyOwner($currentNumber, $apartment)) {
            json_error('Accès refusé.', 403);
        }

        if ($this->repo->exists($newNumber)) {
            json_error('Ce numéro de place est déjà pris.');
        }

        $this->repo->rename($currentNumber, $newNumber);
        return $this->presenter->details($newNumber, null);
    }

    // --- Schedules ---

    public function hasSchedules(string $number): bool
    {
        $spot = $this->repo->getByNumber($number);
        return $spot ? $this->schedules->hasAny((int) $spot['id']) : false;
    }

    public function saveSchedules(string $number, array $schedules): array
    {
        $spot = $this->repo->requireByNumber($number);
        $this->schedules->replace((int) $spot['id'], $schedules);
        return $this->presenter->details($number, null);
    }

    // --- Parking ---

    public function park(string $number, string $parkedBySpotNumber, string $phone): array
    {
        $spot = $this->repo->requireByNumber($number);

        if (!$this->repo->exists($parkedBySpotNumber)) {
            json_error('Profil invalide.');
        }

        $details = $this->presenter->details($number, null);
        if ($details['status'] !== 'available') {
            json_error('Cette place n\'est pas disponible.');
        }

        $this->parking->park((int) $spot['id'], $parkedBySpotNumber, $phone);
        return ['number' => $number, 'parked' => true];
    }

    public function unpark(string $number): array
    {
        $spot = $this->repo->requireByNumber($number);
        $this->parking->unpark((int) $spot['id']);
        return ['number' => $number, 'parked' => false];
    }

    // --- Trips ---

    public function createTrip(
        string $number,
        DateTimeImmutable $depart,
        DateTimeImmutable $return,
        ?string $linkGroup = null,
    ): array {
        $spot = $this->repo->requireByNumber($number);
        $this->trips->create((int) $spot['id'], $depart, $return, $linkGroup);
        return $this->presenter->details($number, null);
    }

    public function updateTrip(
        string $number,
        int $tripId,
        DateTimeImmutable $depart,
        DateTimeImmutable $return,
    ): array {
        $spot = $this->repo->requireByNumber($number);
        $updated = $this->trips->update((int) $spot['id'], $tripId, $depart, $return);
        if ($updated === 0) {
            json_error('Déplacement introuvable.', 404);
        }
        return $this->presenter->details($number, null);
    }

    public function cancelTrip(string $number): array
    {
        $spot = $this->repo->requireByNumber($number);
        $this->trips->cancelAllForSpot((int) $spot['id'], $number);
        return $this->presenter->details($number, null);
    }

    public function cancelTripById(string $number, int $tripId): array
    {
        $spot = $this->repo->requireByNumber($number);
        $cancelled = $this->trips->cancelById($tripId, (int) $spot['id']);
        if ($cancelled === 0) {
            json_error('Déplacement introuvable.', 404);
        }
        return $this->presenter->details($number, null);
    }

    public function cleanupExpiredTrips(): void
    {
        $this->trips->cleanupExpired();
    }

    // --- Listing / details ---

    public function listSpots(?string $viewerSpotNumber = null, ?DateTimeImmutable $at = null): array
    {
        return $this->presenter->listAll($viewerSpotNumber, $at);
    }

    public function getSpotDetails(string $number, ?string $viewerSpotNumber = null): array
    {
        return $this->presenter->details($number, $viewerSpotNumber);
    }

    // --- Alerts ---

    public function getAlerts(): array
    {
        return $this->alerts->listActive();
    }

    public function dismissAlert(int $alertId): void
    {
        $this->alerts->dismiss($alertId);
    }
}
