"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type LatLng = [number, number];

type Props = {
  position: LatLng | null;
  heading: number;
  routePoints: LatLng[];
  destination: LatLng | null;
  followVehicle: boolean;
  onFollowChange: (value: boolean) => void;
};

type FollowProps = {
  position: LatLng | null;
  enabled: boolean;
  onUserMove: () => void;
};

function MapViewportSync() {
  const map = useMap();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const sync = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        map.invalidateSize({
          animate: false,
        });
      }, 80);
    };

    const container =
      map.getContainer();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;

    observer?.observe(container);

    window.addEventListener(
      "resize",
      sync
    );

    window.addEventListener(
      "orientationchange",
      sync
    );

    sync();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      observer?.disconnect();

      window.removeEventListener(
        "resize",
        sync
      );

      window.removeEventListener(
        "orientationchange",
        sync
      );
    };
  }, [map]);

  return null;
}
function NavigationFollow({
  position,
  enabled,
  onUserMove,
}: FollowProps) {
  const map = useMap();

  const programmaticMoveRef = useRef(false);

  useMapEvents({
    dragstart: onUserMove,
    zoomstart: () => {
      if (!programmaticMoveRef.current) {
        onUserMove();
      }
    },
  });

  useEffect(() => {
    if (!enabled || !position) return;

    programmaticMoveRef.current = true;

    const clearProgrammaticMove = () => {
      programmaticMoveRef.current = false;
    };

    map.once("moveend", clearProgrammaticMove);

    const fallbackTimer =
      window.setTimeout(
        clearProgrammaticMove,
        1000
      );

    map.flyTo(position, Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.55,
    });

    return () => {
      map.off("moveend", clearProgrammaticMove);
      window.clearTimeout(fallbackTimer);
      clearProgrammaticMove();
    };
  }, [enabled, map, position]);

  return null;
}

export default function SafeNavigationMap({
  position,
  heading,
  routePoints,
  destination,
  followVehicle,
  onFollowChange,
}: Props) {
  const center = position ?? [-33.9249, 18.4241];

  const carIcon = useMemo(() => {
    const normalizedHeading =
      Number.isFinite(heading) ? heading : 0;

    return L.divIcon({
      className: "",
      iconSize: [70, 82],
      iconAnchor: [35, 42],
      html: `
<div class="hg-navigation-car" style="
  position:relative;
  width:70px;
  height:82px;
  transform:rotate(${normalizedHeading}deg) scale(var(--hg-car-scale));
  transform-origin:50% 50%;
  transition:transform 220ms linear;
">
  <div style="
    position:absolute;
    left:7px;
    top:12px;
    width:56px;
    height:56px;
    border-radius:50%;
    background:rgba(34,211,238,0.28);
    box-shadow:0 0 22px rgba(34,211,238,0.72);
  "></div>
  <svg
    width="70"
    height="82"
    viewBox="0 0 70 82"
    xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;left:0;top:0;filter:drop-shadow(0 8px 8px rgba(0,0,0,.55));"
  >
    <path
      d="M22 12 C24 6 29 3 35 3 C41 3 46 6 48 12 L56 28 L58 61 C58 69 53 75 46 77 L24 77 C17 75 12 69 12 61 L14 28 Z"
      fill="#f8fafc"
      stroke="#94a3b8"
      stroke-width="2"
    />
    <path
      d="M22 17 C25 11 29 9 35 9 C41 9 45 11 48 17 L51 28 L19 28 Z"
      fill="#1e3a5f"
    />
    <rect x="18" y="33" width="34" height="25" rx="6" fill="#e2e8f0" />
    <path d="M19 60 L51 60 L48 70 L22 70 Z" fill="#cbd5e1" />
    <rect x="14" y="33" width="5" height="14" rx="2" fill="#0f172a" />
    <rect x="51" y="33" width="5" height="14" rx="2" fill="#0f172a" />
    <rect x="18" y="67" width="8" height="4" rx="2" fill="#ef4444" />
    <rect x="44" y="67" width="8" height="4" rx="2" fill="#ef4444" />
    <rect x="21" y="13" width="8" height="3" rx="1.5" fill="#dbeafe" />
    <rect x="41" y="13" width="8" height="3" rx="1.5" fill="#dbeafe" />
  </svg>
</div>`
    });
  }, [heading]);

  return (
    <>
      <style jsx global>{`
        .hg-navigation-car {
          --hg-car-scale: 1;
          transform-origin: 50% 50%;
        }

        @media (max-width: 767px) {
          .hg-navigation-car {
            --hg-car-scale: 0.82;
          }
        }

        @media (max-width: 430px) {
          .hg-navigation-car {
            --hg-car-scale: 0.72;
          }
        }
        .hg-navigation-map .leaflet-tile-pane {
          filter: brightness(0.6) saturate(0.72) hue-rotate(165deg);
        }

        .hg-navigation-map .leaflet-control-attribution {
          background: rgba(3, 7, 18, 0.72) !important;
          color: #94a3b8 !important;
        }

        .hg-navigation-map .leaflet-control-attribution a {
          color: #67e8f9 !important;
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={position ? 17 : 11}
        zoomControl={false}
        className="hg-navigation-map"
        style={{ height: "100%", width: "100%", background: "#0b1730" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportSync />

        <NavigationFollow
          position={position}
          enabled={followVehicle}
          onUserMove={() => onFollowChange(false)}
        />

        {routePoints.length > 1 && (
          <>
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#06263a",
                weight: 14,
                opacity: 0.82,
              }}
            />

            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#22d3ee",
                weight: 8,
                opacity: 1,
              }}
            />
          </>
        )}

        {destination && (
          <>
            <CircleMarker
              center={destination}
              radius={16}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#14b8a6",
                fillOpacity: 0.25,
                weight: 2,
              }}
            />

            <CircleMarker
              center={destination}
              radius={7}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#14b8a6",
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}

        {position && (
          <Marker
            position={position}
            icon={carIcon}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>
    </>
  );
}
