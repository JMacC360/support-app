"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import {
  importLeaflet,
  MAP_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_PIN_ZOOM,
  MAP_TILE,
  parseCoordinate,
} from "@/lib/map-config";

type LocationMapPickerProps = {
  latitude: string;
  longitude: string;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
};

export function LocationMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
  className = "h-56 w-full",
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await importLeaflet();
      if (cancelled || !containerRef.current) return;

      const lat = parseCoordinate(latitude);
      const lng = parseCoordinate(longitude);
      const center = lat !== null && lng !== null ? { lat, lng } : MAP_CENTER;
      const zoom = lat !== null && lng !== null ? MAP_PIN_ZOOM : MAP_DEFAULT_ZOOM;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [center.lat, center.lng],
        zoom
      );

      L.tileLayer(MAP_TILE.url, {
        attribution: MAP_TILE.attribution,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      map.on("click", (event) => {
        syncingRef.current = true;
        onCoordinatesChange(event.latlng.lat, event.latlng.lng);
        window.setTimeout(() => {
          syncingRef.current = false;
        }, 0);
      });

      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
      window.setTimeout(() => map.invalidateSize(), 250);
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, onCoordinatesChange]);

  useEffect(() => {
    let cancelled = false;

    async function syncMarker() {
      const map = mapRef.current;
      if (!map || syncingRef.current) return;

      const lat = parseCoordinate(latitude);
      const lng = parseCoordinate(longitude);
      const L = await importLeaflet();
      if (cancelled || !mapRef.current) return;

      if (lat === null || lng === null) {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
          markerRef.current = null;
        }
        return;
      }

      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLatLng();
          if (!position) return;
          syncingRef.current = true;
          onCoordinatesChange(position.lat, position.lng);
          window.setTimeout(() => {
            syncingRef.current = false;
          }, 0);
        });
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }

      map.setView([lat, lng], Math.max(map.getZoom(), MAP_PIN_ZOOM));
    }

    void syncMarker();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, onCoordinatesChange]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden border border-slate-200 bg-slate-100 ${className}`}
      role="application"
      aria-label="Pick location on map"
    />
  );
}
