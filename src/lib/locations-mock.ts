export type LocationStatus = "active" | "inactive";

export type RetailerLocation = {
  id: string;
  code: string;
  name: string;
  address: string;
  landmark: string;
  lat: number;
  lng: number;
  status: LocationStatus;
};

export type DeviceStatus = "online" | "offline" | "maintenance";

export type DeviceLocation = {
  id: string;
  serialNumber: string;
  model: string;
  retailerId: string;
  retailerName: string;
  lat: number;
  lng: number;
  status: DeviceStatus;
};

export type SupportPersonnelStatus = "available" | "on-call" | "off-duty";

export type SupportPersonnelLocation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  lat: number;
  lng: number;
  status: SupportPersonnelStatus;
};

export type LocationTab = "retailers" | "devices" | "support";

export type LocationDataset = {
  retailers: RetailerLocation[];
  devices: DeviceLocation[];
  supportPersonnel: SupportPersonnelLocation[];
};

const STORAGE_KEY = "support-ticket-app:locations-mock";

const SEED_DATA: LocationDataset = {
  retailers: [
    {
      id: "ret-001",
      code: "ess-gl-tourism-rd",
      name: "eSariSari — Tourism Road",
      address: "Tourism Road, Poblacion, General Luna, Siargao Island",
      landmark: "Tourism Road, poblacion",
      lat: 9.7848,
      lng: 126.16,
      status: "active",
    },
    {
      id: "ret-002",
      code: "ess-gl-public-market",
      name: "eSariSari — Public Market",
      address: "Rizal Street, General Luna, Siargao Island",
      landmark: "Near General Luna public market",
      lat: 9.7892,
      lng: 126.1576,
      status: "active",
    },
    {
      id: "ret-003",
      code: "ess-gl-poblacion",
      name: "eSariSari — Poblacion",
      address: "Poblacion, General Luna, Siargao Island",
      landmark: "General Luna town proper",
      lat: 9.7875,
      lng: 126.1588,
      status: "inactive",
    },
  ],
  devices: [
    {
      id: "dev-001",
      serialNumber: "RTR-GL-88421",
      model: "UniFi U6-Lite",
      retailerId: "ret-001",
      retailerName: "eSariSari — Tourism Road",
      lat: 9.7851,
      lng: 126.1598,
      status: "online",
    },
    {
      id: "dev-002",
      serialNumber: "RTR-GL-88422",
      model: "UniFi U6-Lite",
      retailerId: "ret-001",
      retailerName: "eSariSari — Tourism Road",
      lat: 9.7846,
      lng: 126.1602,
      status: "online",
    },
    {
      id: "dev-003",
      serialNumber: "RTR-GL-90117",
      model: "MikroTik hAP ac²",
      retailerId: "ret-002",
      retailerName: "eSariSari — Public Market",
      lat: 9.7894,
      lng: 126.1579,
      status: "maintenance",
    },
    {
      id: "dev-004",
      serialNumber: "RTR-GL-90118",
      model: "MikroTik hAP ac²",
      retailerId: "ret-003",
      retailerName: "eSariSari — Poblacion",
      lat: 9.7878,
      lng: 126.1591,
      status: "offline",
    },
  ],
  supportPersonnel: [
    {
      id: "sup-001",
      name: "Mara Dela Cruz",
      email: "mara.delacruz@esarisari.net",
      phone: "+63 917 555 0101",
      territory: "General Luna — North",
      lat: 9.7918,
      lng: 126.1584,
      status: "available",
    },
    {
      id: "sup-002",
      name: "Jonas Navarro",
      email: "jonas.navarro@esarisari.net",
      phone: "+63 918 555 0102",
      territory: "General Luna — Poblacion",
      lat: 9.7879,
      lng: 126.1582,
      status: "on-call",
    },
    {
      id: "sup-003",
      name: "Lea Santos",
      email: "lea.santos@esarisari.net",
      phone: "+63 919 555 0103",
      territory: "General Luna — Coastal",
      lat: 9.793,
      lng: 126.1572,
      status: "off-duty",
    },
  ],
};

function cloneSeed(): LocationDataset {
  return structuredClone(SEED_DATA);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isLocationDataset(value: unknown): value is LocationDataset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocationDataset>;
  return (
    Array.isArray(candidate.retailers) &&
    Array.isArray(candidate.devices) &&
    Array.isArray(candidate.supportPersonnel)
  );
}

export function loadLocationDataset(): LocationDataset {
  if (!isBrowser()) return cloneSeed();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as unknown;
    if (!isLocationDataset(parsed)) return cloneSeed();
    return parsed;
  } catch {
    return cloneSeed();
  }
}

export function saveLocationDataset(data: LocationDataset) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetLocationDataset(): LocationDataset {
  const seed = cloneSeed();
  saveLocationDataset(seed);
  return seed;
}

export function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function retailerStatusClass(status: LocationStatus) {
  return status === "active"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-100 text-slate-600";
}

export function deviceStatusClass(status: DeviceStatus) {
  if (status === "online") return "bg-emerald-100 text-emerald-800";
  if (status === "maintenance") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

export function supportStatusClass(status: SupportPersonnelStatus) {
  if (status === "available") return "bg-emerald-100 text-emerald-800";
  if (status === "on-call") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-600";
}
