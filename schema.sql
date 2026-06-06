


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."prevent_audit_log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'audit_logs are immutable and cannot be changed';
end;
$$;


ALTER FUNCTION "public"."prevent_audit_log_changes"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "target" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_code" "text" NOT NULL,
    "vessel" "text" NOT NULL,
    "species" "text" NOT NULL,
    "catch_kg" numeric NOT NULL,
    "dock_kg" numeric NOT NULL,
    "storage_kg" numeric NOT NULL,
    "handler_name" "text" NOT NULL,
    "handler_role" "text" NOT NULL,
    "location" "text" NOT NULL,
    "notes" "text",
    "qr_code" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "event_type" "text" NOT NULL,
    "provider" "text" DEFAULT 'payfast'::"text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "emergency_contact" "text",
    "license_number" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emergency_response_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_alert_id" "uuid",
    "event_type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."emergency_response_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geofences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "center_lat" double precision NOT NULL,
    "center_lng" double precision NOT NULL,
    "radius_meters" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."geofences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_code" "text" NOT NULL,
    "batch_id" "uuid",
    "severity" "text" NOT NULL,
    "assigned_to" "uuid",
    "status" "text" DEFAULT 'Open'::"text",
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_note" "text"
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'ZAR'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invoice_url" "text",
    "payfast_payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "subscription_status" "text" DEFAULT 'trialing'::"text",
    "subscription_plan" "text" DEFAULT 'starter'::"text",
    "trial_ends_at" timestamp with time zone,
    "payfast_subscription_id" "text",
    "fleet_size" integer DEFAULT 0,
    "first_vehicle" "text",
    "seats" integer DEFAULT 1,
    "plan" "text" DEFAULT 'trial'::"text",
    "payfast_token" "text",
    "billing_email" "text",
    "next_billing_date" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "organization_id" "uuid",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'dock'::"text", 'warehouse'::"text", 'processing'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_delivery_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid",
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "report_frequency" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "report_delivery_logs_report_frequency_check" CHECK (("report_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text"]))),
    CONSTRAINT "report_delivery_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."report_delivery_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "is_enabled" boolean DEFAULT true NOT NULL,
    "report_frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "report_subscriptions_report_frequency_check" CHECK (("report_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."report_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."road_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "radius_meters" integer DEFAULT 500,
    "severity" "text" DEFAULT 'medium'::"text",
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."road_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'starter'::"text" NOT NULL,
    "status" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "payfast_subscription_id" "text",
    "trial_ends_at" timestamp with time zone,
    "billing_email" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "trip_id" "uuid",
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'high'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "is_resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "organization_id" "uuid",
    "intelligence_score" integer,
    "behavioral_risk" "text",
    "intelligence_narrative" "text",
    CONSTRAINT "vehicle_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['panic'::"text", 'offline'::"text", 'route_deviation'::"text", 'long_stop'::"text", 'manual'::"text", 'suspicious_stop'::"text", 'signal_loss'::"text", 'geofence_breach'::"text"]))),
    CONSTRAINT "vehicle_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."vehicle_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "trip_id" "uuid",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "speed_kmh" double precision DEFAULT 0,
    "heading" double precision DEFAULT 0,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'mobile'::"text" NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "vehicle_locations_source_check" CHECK (("source" = ANY (ARRAY['mobile'::"text", 'hardware'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."vehicle_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_stops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicle_stops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "driver_id" "uuid",
    "origin_port" "text" NOT NULL,
    "destination_fishery" "text" NOT NULL,
    "planned_departure" timestamp with time zone,
    "actual_departure" timestamp with time zone,
    "planned_arrival" timestamp with time zone,
    "actual_arrival" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "cargo_description" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expected_route" "jsonb",
    "deviation_threshold_km" numeric DEFAULT 3,
    "organization_id" "uuid",
    CONSTRAINT "vehicle_trips_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'en_route_to_port'::"text", 'collecting'::"text", 'en_route_to_fishery'::"text", 'delivered'::"text", 'cancelled'::"text", 'emergency'::"text"])))
);


ALTER TABLE "public"."vehicle_trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_number" "text" NOT NULL,
    "nickname" "text",
    "make" "text",
    "model" "text",
    "tracker_device_id" "text",
    "driver_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_batch_code_key" UNIQUE ("batch_code");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emergency_response_events"
    ADD CONSTRAINT "emergency_response_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geofences"
    ADD CONSTRAINT "geofences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_incident_code_key" UNIQUE ("incident_code");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_delivery_logs"
    ADD CONSTRAINT "report_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_subscriptions"
    ADD CONSTRAINT "report_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."road_incidents"
    ADD CONSTRAINT "road_incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_alerts"
    ADD CONSTRAINT "vehicle_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_locations"
    ADD CONSTRAINT "vehicle_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_stops"
    ADD CONSTRAINT "vehicle_stops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_trips"
    ADD CONSTRAINT "vehicle_trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_registration_number_key" UNIQUE ("registration_number");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "audit_logs_organization_id_idx" ON "public"."audit_logs" USING "btree" ("organization_id");



CREATE INDEX "geofences_organization_id_idx" ON "public"."geofences" USING "btree" ("organization_id");



CREATE INDEX "idx_vehicle_locations_vehicle_time" ON "public"."vehicle_locations" USING "btree" ("vehicle_id", "recorded_at" DESC);



CREATE INDEX "idx_vehicle_stops_vehicle_time" ON "public"."vehicle_stops" USING "btree" ("vehicle_id", "started_at" DESC);



CREATE INDEX "report_delivery_logs_created_at_idx" ON "public"."report_delivery_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "report_delivery_logs_email_idx" ON "public"."report_delivery_logs" USING "btree" ("email");



CREATE INDEX "report_delivery_logs_frequency_idx" ON "public"."report_delivery_logs" USING "btree" ("report_frequency");



CREATE INDEX "vehicle_alerts_vehicle_id_created_at_idx" ON "public"."vehicle_alerts" USING "btree" ("vehicle_id", "created_at" DESC);



CREATE INDEX "vehicle_locations_vehicle_id_recorded_at_idx" ON "public"."vehicle_locations" USING "btree" ("vehicle_id", "recorded_at" DESC);



CREATE INDEX "vehicle_trips_vehicle_id_created_at_idx" ON "public"."vehicle_trips" USING "btree" ("vehicle_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "prevent_audit_log_delete" BEFORE DELETE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_log_changes"();



CREATE OR REPLACE TRIGGER "prevent_audit_log_update" BEFORE UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_log_changes"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."emergency_response_events"
    ADD CONSTRAINT "emergency_response_events_vehicle_alert_id_fkey" FOREIGN KEY ("vehicle_alert_id") REFERENCES "public"."vehicle_alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_delivery_logs"
    ADD CONSTRAINT "report_delivery_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."report_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_subscriptions"
    ADD CONSTRAINT "report_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."road_incidents"
    ADD CONSTRAINT "road_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_alerts"
    ADD CONSTRAINT "vehicle_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_alerts"
    ADD CONSTRAINT "vehicle_alerts_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."vehicle_trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_alerts"
    ADD CONSTRAINT "vehicle_alerts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_locations"
    ADD CONSTRAINT "vehicle_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_locations"
    ADD CONSTRAINT "vehicle_locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."vehicle_trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_locations"
    ADD CONSTRAINT "vehicle_locations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_stops"
    ADD CONSTRAINT "vehicle_stops_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_trips"
    ADD CONSTRAINT "vehicle_trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_trips"
    ADD CONSTRAINT "vehicle_trips_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_trips"
    ADD CONSTRAINT "vehicle_trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can delete vehicles in their organization" ON "public"."vehicles" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow all batches" ON "public"."batches" USING (true);



CREATE POLICY "Allow all for now" ON "public"."profiles" USING (true);



CREATE POLICY "Allow all incidents" ON "public"."incidents" USING (true);



CREATE POLICY "Allow authenticated emergency response event inserts" ON "public"."emergency_response_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."vehicle_alerts" "va"
  WHERE ("va"."id" = "emergency_response_events"."vehicle_alert_id"))));



CREATE POLICY "Allow authenticated emergency response event reads" ON "public"."emergency_response_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."vehicle_alerts" "va"
  WHERE ("va"."id" = "emergency_response_events"."vehicle_alert_id"))));



CREATE POLICY "Users can access own organization alerts" ON "public"."vehicle_alerts" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can access own organization batches" ON "public"."batches" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can access own organization incidents" ON "public"."incidents" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can access own organization trips" ON "public"."vehicle_trips" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can access own organization vehicles" ON "public"."vehicles" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert vehicles in their organization" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can read organization incidents" ON "public"."incidents" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update organization incidents" ON "public"."incidents" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own organizations" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Users can update vehicles in their organization" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view vehicles in their organization" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated can delete geofences" ON "public"."geofences" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "authenticated can delete own report subscriptions" ON "public"."report_subscriptions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated can insert geofences" ON "public"."geofences" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated can insert own report subscriptions" ON "public"."report_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated can read batches" ON "public"."batches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read drivers" ON "public"."drivers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read geofences" ON "public"."geofences" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read incidents" ON "public"."incidents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read report_delivery_logs" ON "public"."report_delivery_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read report_subscriptions" ON "public"."report_subscriptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read vehicle_alerts" ON "public"."vehicle_alerts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read vehicle_locations" ON "public"."vehicle_locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read vehicle_trips" ON "public"."vehicle_trips" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read vehicles" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can update geofences" ON "public"."geofences" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can update own report subscriptions" ON "public"."report_subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated delete report_subscriptions" ON "public"."report_subscriptions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "authenticated insert report_subscriptions" ON "public"."report_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated update report_subscriptions" ON "public"."report_subscriptions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emergency_response_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geofences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self_select" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."report_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."road_incidents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "road_incidents_org_select" ON "public"."road_incidents" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicle_alerts_org_select" ON "public"."vehicle_alerts" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."vehicle_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicle_locations_org_select" ON "public"."vehicle_locations" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."vehicle_stops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicle_trips_org_select" ON "public"."vehicle_trips" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicles_org_select" ON "public"."vehicles" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_audit_log_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_audit_log_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_audit_log_changes"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON TABLE "public"."billing_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_events" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."emergency_response_events" TO "anon";
GRANT ALL ON TABLE "public"."emergency_response_events" TO "authenticated";
GRANT ALL ON TABLE "public"."emergency_response_events" TO "service_role";



GRANT ALL ON TABLE "public"."geofences" TO "anon";
GRANT ALL ON TABLE "public"."geofences" TO "authenticated";
GRANT ALL ON TABLE "public"."geofences" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."report_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."report_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."report_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."report_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."report_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."report_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."road_incidents" TO "anon";
GRANT ALL ON TABLE "public"."road_incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."road_incidents" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_alerts" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_locations" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_locations" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_stops" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_stops" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_stops" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_trips" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_trips" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







