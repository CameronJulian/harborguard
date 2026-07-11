"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

type Props = {
  position: [number, number] | null;
  enabled: boolean;
};

export default function MapFollower({
  position,
  enabled,
}: Props) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position) {
      return;
    }

    map.flyTo(
      position,
      Math.max(map.getZoom(), 13),
      {
        duration: 1.2,
      }
    );
  }, [enabled, position, map]);

  return null;
}

