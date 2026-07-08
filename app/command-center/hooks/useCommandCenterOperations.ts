import { useCallback, useState } from "react";
import {
  getCommandCenterOperationsSummary,
  getCommandCenterOperationsTimeline,
} from "@/lib/services/command-center.service";

export function useCommandCenterOperations() {
  const [operationsSummary, setOperationsSummary] = useState<any | null>(null);
  const [operationsTimeline, setOperationsTimeline] = useState<any[]>([]);

  const loadOperationsSummary = useCallback(async () => {
    try {
      const result = await getCommandCenterOperationsSummary();
      setOperationsSummary(result.summary || null);
    } catch (error) {
      console.error("Failed to load operations summary:", error);
    }
  }, []);

  const loadOperationsTimeline = useCallback(async () => {
    try {
      const result = await getCommandCenterOperationsTimeline();
      setOperationsTimeline(result.events || []);
    } catch (error) {
      console.error("Failed to load operations timeline:", error);
    }
  }, []);

  return {
    operationsSummary,
    operationsTimeline,
    loadOperationsSummary,
    loadOperationsTimeline,
  };
}