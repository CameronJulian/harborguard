-- Cloud lacks these baseline tenant SELECT policies.
-- Keep tenant reads when the older broad ALL policies are removed.
-- Limit both policies to authenticated callers; keep all other policies.
BEGIN;

DROP POLICY IF EXISTS "Users can view vehicles in their organization" ON public.vehicles;
CREATE POLICY "Users can view vehicles in their organization"
ON public.vehicles FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "vehicle_trips_org_select" ON public.vehicle_trips;
CREATE POLICY "vehicle_trips_org_select"
ON public.vehicle_trips FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

COMMIT;
