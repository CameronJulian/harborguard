export function missionEvidenceStoragePrefix(
  missionId: string
): string {
  return `missions/${missionId}/`;
}

export function isMissionEvidenceStorageKey(
  value: unknown,
  missionId: string
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const prefix =
    missionEvidenceStoragePrefix(missionId);

  if (!value.startsWith(prefix)) {
    return false;
  }

  const objectName =
    value.slice(prefix.length);

  if (
    objectName.length === 0 ||
    objectName.length > 255
  ) {
    return false;
  }

  // Storage-backed mission evidence intentionally uses
  // exactly one object-name segment beneath the mission prefix.
  if (
    objectName.includes("/") ||
    objectName.includes("\\") ||
    objectName.includes("%")
  ) {
    return false;
  }

  if (
    objectName === "." ||
    objectName === ".."
  ) {
    return false;
  }

  // Match the filename alphabet emitted by MissionDetailsPanel.
  if (!/^[A-Za-z0-9._-]+$/.test(objectName)) {
    return false;
  }

  return true;
}

export function looksLikeMissionEvidenceStorageKey(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("missions/")
  );
}
