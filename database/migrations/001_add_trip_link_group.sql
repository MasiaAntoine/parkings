-- Lie les déplacements créés ensemble sur plusieurs places
ALTER TABLE spot_trips
    ADD COLUMN link_group CHAR(36) NULL AFTER cancelled_at,
    ADD INDEX idx_spot_trips_link_group (link_group);
