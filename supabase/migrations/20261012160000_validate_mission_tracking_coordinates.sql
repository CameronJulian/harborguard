-- HarborGuard mission tracking coordinate validation.
-- Reject geographically impossible GPS positions.
-- Does not modify existing records, GPS units or mission assignments.
--
-- PostgreSQL CHECK constraints are applied to existing rows.
-- Review existing data before applying to a populated environment.

ALTER TABLE public.mission_tracking
    ADD CONSTRAINT mission_tracking_latitude_range_check
    CHECK (
        latitude BETWEEN -90 AND 90
    );

ALTER TABLE public.mission_tracking
    ADD CONSTRAINT mission_tracking_longitude_range_check
    CHECK (
        longitude BETWEEN -180 AND 180
    );
