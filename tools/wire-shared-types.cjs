const fs = require("fs");

const file = "app/command-center/page.tsx";

let content = fs.readFileSync(file, "utf8");

// ----------------------------------------------------
// Add shared type import if it doesn't already exist
// ----------------------------------------------------

const importStatement = `import type {
  CommandCenterGeofence,
  FleetAlert,
  FleetStop,
  RoadIncident,
  FleetVehicle,
} from "./types";`;

if (!content.includes('from "./types"')) {

    content = content.replace(
        'import AppShell from "@/components/AppShell";',
        `import AppShell from "@/components/AppShell";
${importStatement}`
    );

}

// ----------------------------------------------------
// Remove the old local type definitions
// ----------------------------------------------------

content = content.replace(
/type CommandCenterGeofence = \{[\s\S]*?\n\};\n\ntype FleetAlert = \{[\s\S]*?\n\};\n\ntype FleetStop = \{[\s\S]*?\n\};\n\ntype RoadIncident = \{[\s\S]*?\n\};\n\ntype FleetVehicle = \{[\s\S]*?\n\};\n\n/,
""
);

fs.writeFileSync(file, content);

console.log("Shared types imported successfully.");
