import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

type Options = {
  loadFleet: () => Promise<void>;
  loadIncidents: () => Promise<void>;
  loadThreatFeed: () => Promise<void>;
  loadOperationsSummary: () => Promise<void>;
  loadOperationsTimeline: () => Promise<void>;
};

export function useCommandCenterRealtime({
  loadFleet,
  loadIncidents,
  loadThreatFeed,
  loadOperationsSummary,
  loadOperationsTimeline,
}: Options) {

  useEffect(() => {

    loadFleet();
    loadIncidents();
    loadThreatFeed();

    const refresh = () => {

      loadFleet();
      loadIncidents();
      loadThreatFeed();
      loadOperationsSummary();
      loadOperationsTimeline();

    };

    const channels = [

      supabase
        .channel("command-center-vehicle-locations-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "vehicle_locations",
          },
          refresh
        )
        .subscribe(),

      supabase
        .channel("command-center-vehicle-alerts-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicle_alerts",
          },
          refresh
        )
        .subscribe(),

      supabase
        .channel("command-center-incidents-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "incidents",
          },
          refresh
        )
        .subscribe(),

      supabase
        .channel("command-center-trips-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicle_trips",
          },
          refresh
        )
        .subscribe(),

    ];

    return () => {

      channels.forEach(channel =>
        supabase.removeChannel(channel)
      );

    };

  }, []);

}