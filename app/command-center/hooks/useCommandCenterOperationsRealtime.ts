import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

type Options = {
  loadOperationsSummary: () => Promise<void>;
  loadOperationsTimeline: () => Promise<void>;
};

export function useCommandCenterOperationsRealtime({
  loadOperationsSummary,
  loadOperationsTimeline,
}: Options) {
  useEffect(() => {
    loadOperationsSummary();
    loadOperationsTimeline();

    const refreshOperations = () => {
      loadOperationsSummary();
      loadOperationsTimeline();
    };

    const routeAssignmentsChannel = supabase
      .channel("command-center-route-assignments-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "route_assignments",
        },
        refreshOperations
      )
      .subscribe();

    const routeEscalationsChannel = supabase
      .channel("command-center-route-escalations-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "route_safety_escalation_logs",
        },
        refreshOperations
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel("command-center-notifications-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "command_center_notifications",
        },
        refreshOperations
      )
      .subscribe();

    return () => {
      supabase.removeChannel(routeAssignmentsChannel);
      supabase.removeChannel(routeEscalationsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [loadOperationsSummary, loadOperationsTimeline]);
}
