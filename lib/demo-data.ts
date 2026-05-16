export const demoVehicles = [
  {
    id: "HG-201",
    name: "Atlantic Runner",
    driver: "James Daniels",
    status: "active",
    speed: 68,
    location: "Cape Town Harbor",
    risk: "low",
  },
  {
    id: "HG-305",
    name: "Ocean Sentinel",
    driver: "Sarah Jacobs",
    status: "alert",
    speed: 91,
    location: "False Bay",
    risk: "high",
  },
  {
    id: "HG-118",
    name: "Harbor Hawk",
    driver: "Michael Smith",
    status: "idle",
    speed: 0,
    location: "Durban Port",
    risk: "medium",
  },
  {
    id: "HG-412",
    name: "Bluefin Guardian",
    driver: "David Peterson",
    status: "active",
    speed: 74,
    location: "Namibian Route",
    risk: "low",
  },
];

export const demoAlerts = [
  {
    id: 1,
    title: "Geofence Breach Detected",
    severity: "high",
    vehicle: "Ocean Sentinel",
    time: "2 min ago",
  },
  {
    id: 2,
    title: "Driver Panic Alert",
    severity: "critical",
    vehicle: "Harbor Hawk",
    time: "8 min ago",
  },
  {
    id: 3,
    title: "AI Risk Spike Detected",
    severity: "medium",
    vehicle: "Atlantic Runner",
    time: "14 min ago",
  },
];

export const demoMetrics = {
  activeVehicles: 42,
  activeTrips: 18,
  incidentsToday: 7,
  aiThreatScore: 82,
};