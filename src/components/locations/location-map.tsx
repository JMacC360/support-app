"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import {
  importLeaflet,
  MAP_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MARKER_COLORS,
  MAP_PIN_ZOOM,
  MAP_TILE,
} from "@/lib/map-config";

export type LocationMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  kind: "retailer" | "device" | "support";
};

type LocationMapProps = {
  markers: LocationMapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

export function LocationMap({
  markers,
  selectedId,
  onSelect,
  className = "min-h-[360px] w-full",
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await importLeaflet();
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [MAP_CENTER.lat, MAP_CENTER.lng],
        MAP_DEFAULT_ZOOM
      );

      L.tileLayer(MAP_TILE.url, {
        attribution: MAP_TILE.attribution,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      requestAnimationFrame(() => map.invalidateSize());
      window.setTimeout(() => map.invalidateSize(), 250);
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const map = mapRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;

      const L = await importLeaflet();
      if (cancelled) return;

      layer.clearLayers();

      markers.forEach((marker) => {
        const isSelected = marker.id === selectedId;
        const palette = isSelected
          ? MAP_MARKER_COLORS.selected
          : MAP_MARKER_COLORS[marker.kind];

        const circle = L.circleMarker([marker.lat, marker.lng], {
          radius: isSelected ? 11 : 9,
          color: palette.stroke,
          fillColor: palette.fill,
          fillOpacity: 0.92,
          weight: isSelected ? 3 : 2,
        });

        circle.bindPopup(
          `<strong>${marker.label}</strong>${marker.sublabel ? `<br><span>${marker.sublabel}</span>` : ""}`
        );

        if (onSelect) {
          circle.on("click", () => onSelect(marker.id));
        }

        circle.addTo(layer);
      });

      if (markers.length > 0) {
        const points = markers.map((marker) => [marker.lat, marker.lng] as [number, number]);
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds.pad(0.22), { maxZoom: MAP_PIN_ZOOM });
      } else {
        map.setView([MAP_CENTER.lat, MAP_CENTER.lng], MAP_DEFAULT_ZOOM);
      }

      requestAnimationFrame(() => map.invalidateSize());
    }

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [markers, onSelect, selectedId]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden border border-slate-200 bg-slate-100 ${className}`}
      role="application"
      aria-label="Location management map"
    />
  );
}
