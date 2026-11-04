/** Shared map settings (CARTO Voyager + General Luna default), aligned with eSariSari admin/portal. */
export const MAP_CENTER = { lat: 9.7883, lng: 126.1584 } as const;

export const MAP_DEFAULT_ZOOM = 15;

export const MAP_PIN_ZOOM = 17;

const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";

const cartoTileBase =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const MAP_TILE = {
  // Raster basemaps require ?key= since 2026-09-25 (carto.com/basemaps/apikey).
  url: cartoApiKey ? `${cartoTileBase}?key=${encodeURIComponent(cartoApiKey)}` : cartoTileBase,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;

export const MAP_MARKER_COLORS = {
  retailer: { stroke: "#0f766e", fill: "#14b8a6" },
  device: { stroke: "#1d4ed8", fill: "#3b82f6" },
  support: { stroke: "#b45309", fill: "#f59e0b" },
  selected: { stroke: "#7c3aed", fill: "#a855f7" },
} as const;

export async function importLeaflet() {
  const [leafletModule, markerIcon2x, markerIcon, markerShadow] = await Promise.all([
    import("leaflet"),
    import("leaflet/dist/images/marker-icon-2x.png"),
    import("leaflet/dist/images/marker-icon.png"),
    import("leaflet/dist/images/marker-shadow.png"),
    import("leaflet/dist/leaflet.css"),
  ]);

  const L = leafletModule.default;

  const resolveAsset = (asset: string | { src: string }) =>
    typeof asset === "string" ? asset : asset.src;

  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: resolveAsset(markerIcon2x.default),
    iconUrl: resolveAsset(markerIcon.default),
    shadowUrl: resolveAsset(markerShadow.default),
  });

  return L;
}

export function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
