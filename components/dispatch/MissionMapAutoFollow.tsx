"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

type Props = {
  position: [number, number] | null;
  enabled: boolean;
  onUserMove: () => void;
};

export default function MissionMapAutoFollow({
  position,
  enabled,
  onUserMove,
}: Props) {
  const map = useMap();

  useMapEvents({
    dragstart: onUserMove,
    zoomstart: onUserMove,
  });

  useEffect(() => {
    if (!enabled || !position) return;

    map.flyTo(position, Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.75,
    });
  }, [enabled, position, map]);

  return null;
}
