"use client";

import { useEffect, useMemo, useRef } from "react";
import { subscribeCommandCenterTables } from "@/lib/realtime/commandCenterEvents";

type UseRealtimeRefreshOptions = {
  tables: string[];
  refresh: () => void | Promise<void>;
  pollingMs?: number;
  debounceMs?: number;
  loadOnMount?: boolean;
};

export function useRealtimeRefresh({
  tables,
  refresh,
  pollingMs,
  debounceMs = 250,
  loadOnMount = true,
}: UseRealtimeRefreshOptions) {
  const refreshRef = useRef(refresh);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tableKey = useMemo(() => tables.join("|"), [tables]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    function runRefresh() {
      void refreshRef.current();
    }

    function scheduleRefresh() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        runRefresh();
      }, debounceMs);
    }

    if (loadOnMount) {
      runRefresh();
    }

    const tableList = tableKey.split("|").filter(Boolean);
    const unsubscribe = tableList.length
      ? subscribeCommandCenterTables(tableList, scheduleRefresh)
      : () => {};

    const interval = pollingMs
      ? setInterval(runRefresh, pollingMs)
      : null;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (interval) {
        clearInterval(interval);
      }

      unsubscribe();
    };
  }, [tableKey, pollingMs, debounceMs, loadOnMount]);
}
