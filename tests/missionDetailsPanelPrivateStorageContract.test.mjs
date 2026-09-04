import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

const panelPath = path.join(
  repoRoot,
  "components",
  "dispatch",
  "MissionDetailsPanel.tsx"
);

const panelSource = fs.readFileSync(panelPath, "utf8");

test("MissionDetailsPanel uploads evidence into mission-evidence Storage", () => {
  assert.match(
    panelSource,
    /\.from\("mission-evidence"\)/
  );

  assert.match(
    panelSource,
    /\.upload\(filePath,\s*file/
  );

  assert.match(
    panelSource,
    /const filePath = `missions\/\$\{missionId\}\//
  );
});

test("MissionDetailsPanel persists durable filePath", () => {
  assert.match(
    panelSource,
    /filePath,/
  );

  assert.match(
    panelSource,
    /fetchWithAuth\(`\/api\/dispatch\/missions\/\$\{missionId\}\/evidence`/
  );
});

test("MissionDetailsPanel does not generate or persist public Storage URLs", () => {
  assert.doesNotMatch(
    panelSource,
    /\.getPublicUrl\(/
  );

  assert.doesNotMatch(
    panelSource,
    /publicUrlData/
  );

  assert.doesNotMatch(
    panelSource,
    /fileUrl:\s*publicUrlData\.publicUrl/
  );
});

test("MissionDetailsPanel retains authenticated evidence API POST", () => {
  assert.match(
    panelSource,
    /fetchWithAuth\(`\/api\/dispatch\/missions\/\$\{missionId\}\/evidence`,\s*\{[\s\S]*method:\s*"POST"/
  );

  assert.match(
    panelSource,
    /headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/
  );
});

test("MissionDetailsPanel retains evidence metadata and notes", () => {
  assert.match(
    panelSource,
    /notes:\s*`File uploaded: \$\{file\.name\}`/
  );

  assert.match(
    panelSource,
    /metadata:\s*\{/
  );

  assert.match(
    panelSource,
    /fileName:\s*file\.name/
  );

  assert.match(
    panelSource,
    /fileType:\s*file\.type/
  );

  assert.match(
    panelSource,
    /fileSize:\s*file\.size/
  );
});
