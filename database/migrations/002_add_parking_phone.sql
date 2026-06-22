ALTER TABLE active_parkings
    ADD COLUMN phone_encrypted TEXT NULL AFTER parked_by_spot_number;
