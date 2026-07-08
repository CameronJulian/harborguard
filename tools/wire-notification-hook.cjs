const fs = require("fs");

const file = "app/command-center/page.tsx";
let content = fs.readFileSync(file, "utf8");

if (!content.includes('import { useCommandCenterNotifications } from "./hooks/useCommandCenterNotifications";')) {
  content = content.replace(
    'import AppShell from "@/components/AppShell";',
    'import AppShell from "@/components/AppShell";\nimport { useCommandCenterNotifications } from "./hooks/useCommandCenterNotifications";'
  );
}

content = content.replace(
`  const [notifications, setNotifications] = useState<any[]>([]);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);
  const [notificationStats, setNotificationStats] = useState<any>({
    unreadCount: 0,
    criticalCount: 0,
    total: 0,
  });`,
`  const {
    notifications,
    notificationStats,
    loadNotifications,
    markNotificationRead,
    resolveNotification,
  } = useCommandCenterNotifications();
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);`
);

content = content.replace(
/\s{2}async function loadNotifications\(\) \{[\s\S]*?\n\s{2}\}\n\n\s{2}async function markNotificationRead\(notificationId: string\) \{[\s\S]*?\n\s{2}\}\n\n\s{2}async function resolveNotification\(notificationId: string\) \{[\s\S]*?\n\s{2}\}\n/,
"\n"
);

fs.writeFileSync(file, content);
console.log("Updated command-center/page.tsx");
