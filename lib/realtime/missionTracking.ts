import { supabaseBrowser } from "@/lib/supabase/browser";

export function subscribeMissionTracking(
  missionId: string,
  onInsert: (payload: any) => void
) {
  const channel = supabaseBrowser
    .channel(`mission-tracking-${missionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mission_tracking",
        filter: `mission_id=eq.${missionId}`,
      },
      onInsert
    )
    .subscribe();

  return () => {
    supabaseBrowser.removeChannel(channel);
  };
}
