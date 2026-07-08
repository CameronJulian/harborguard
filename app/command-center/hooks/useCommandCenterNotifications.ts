import { useCallback, useState } from "react";
import {
  getCommandCenterNotifications,
  markCommandCenterNotificationRead,
  resolveCommandCenterNotification,
} from "@/lib/services/command-center.service";

type NotificationStats = {
  unreadCount: number;
  criticalCount: number;
  total: number;
};

const defaultStats: NotificationStats = {
  unreadCount: 0,
  criticalCount: 0,
  total: 0,
};

export function useCommandCenterNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationStats, setNotificationStats] =
    useState<NotificationStats>(defaultStats);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getCommandCenterNotifications();

      setNotifications(result.notifications || []);
      setNotificationStats(result.stats || defaultStats);
    } catch (error) {
      console.error("Failed to load command center notifications:", error);
    }
  }, []);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      try {
        await markCommandCenterNotificationRead(notificationId);
        await loadNotifications();
      } catch (error) {
        console.error("Failed to mark notification read:", error);
      }
    },
    [loadNotifications]
  );

  const resolveNotification = useCallback(
    async (notificationId: string) => {
      try {
        await resolveCommandCenterNotification(notificationId);
        await loadNotifications();
      } catch (error) {
        console.error("Failed to resolve notification:", error);
      }
    },
    [loadNotifications]
  );

  return {
    notifications,
    notificationStats,
    loadNotifications,
    markNotificationRead,
    resolveNotification,
  };
}