"use client";

import { Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocationMap, type LocationMapMarker } from "@/components/locations/location-map";
import { LocationMapPicker } from "@/components/locations/location-map-picker";
import { SidebarSelect } from "@/components/sidebar-select";
import { Button } from "@/components/ui/button";
import {
  deviceStatusClass,
  formatCoordinates,
  loadLocationDataset,
  resetLocationDataset,
  retailerStatusClass,
  saveLocationDataset,
  supportStatusClass,
  type DeviceLocation,
  type DeviceStatus,
  type LocationDataset,
  type LocationStatus,
  type LocationTab,
  type RetailerLocation,
  type SupportPersonnelLocation,
  type SupportPersonnelStatus,
} from "@/lib/locations-mock";

const TABS: { key: LocationTab; label: string }[] = [
  { key: "retailers", label: "Retailers" },
  { key: "devices", label: "Devices (routers)" },
  { key: "support", label: "Support personnel" },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LocationsManagementView() {
  const [dataset, setDataset] = useState<LocationDataset>(() => loadLocationDataset());
  const [activeTab, setActiveTab] = useState<LocationTab>("retailers");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRetailer, setDraftRetailer] = useState<RetailerLocation | null>(null);
  const [draftDevice, setDraftDevice] = useState<DeviceLocation | null>(null);
  const [draftSupport, setDraftSupport] = useState<SupportPersonnelLocation | null>(null);

  useEffect(() => {
    saveLocationDataset(dataset);
  }, [dataset]);

  const retailers = dataset.retailers;
  const devices = dataset.devices;
  const supportPersonnel = dataset.supportPersonnel;

  const filteredRetailers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return retailers.filter((item) => {
      if (!q) return true;
      return [item.name, item.code, item.address, item.landmark]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [retailers, searchTerm]);

  const filteredDevices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return devices.filter((item) => {
      if (!q) return true;
      return [item.serialNumber, item.model, item.retailerName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [devices, searchTerm]);

  const filteredSupport = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return supportPersonnel.filter((item) => {
      if (!q) return true;
      return [item.name, item.email, item.phone, item.territory]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [supportPersonnel, searchTerm]);

  const mapMarkers = useMemo((): LocationMapMarker[] => {
    if (activeTab === "retailers") {
      return filteredRetailers.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        label: item.name,
        sublabel: item.landmark,
        kind: "retailer",
      }));
    }
    if (activeTab === "devices") {
      return filteredDevices.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        label: item.serialNumber,
        sublabel: `${item.model} · ${item.retailerName}`,
        kind: "device",
      }));
    }
    return filteredSupport.map((item) => ({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      label: item.name,
      sublabel: item.territory,
      kind: "support",
    }));
  }, [activeTab, filteredDevices, filteredRetailers, filteredSupport]);

  const resetDrafts = useCallback(() => {
    setDraftRetailer(null);
    setDraftDevice(null);
    setDraftSupport(null);
    setIsEditing(false);
    setSelectedId(null);
  }, []);

  const startCreateRetailer = () => {
    setSelectedId(null);
    setIsEditing(true);
    setDraftRetailer({
      id: createId("ret"),
      code: "",
      name: "",
      address: "",
      landmark: "",
      lat: 9.7883,
      lng: 126.1584,
      status: "active",
    });
  };

  const startCreateDevice = () => {
    const retailer = retailers[0];
    setSelectedId(null);
    setIsEditing(true);
    setDraftDevice({
      id: createId("dev"),
      serialNumber: "",
      model: "UniFi U6-Lite",
      retailerId: retailer?.id ?? "",
      retailerName: retailer?.name ?? "",
      lat: retailer?.lat ?? 9.7883,
      lng: retailer?.lng ?? 126.1584,
      status: "online",
    });
  };

  const startCreateSupport = () => {
    setSelectedId(null);
    setIsEditing(true);
    setDraftSupport({
      id: createId("sup"),
      name: "",
      email: "",
      phone: "",
      territory: "General Luna",
      lat: 9.7883,
      lng: 126.1584,
      status: "available",
    });
  };

  const saveRetailer = () => {
    if (!draftRetailer || !draftRetailer.code.trim() || !draftRetailer.name.trim()) return;
    setDataset((prev) => {
      const exists = prev.retailers.some((item) => item.id === draftRetailer.id);
      const retailersNext = exists
        ? prev.retailers.map((item) => (item.id === draftRetailer.id ? draftRetailer : item))
        : [...prev.retailers, draftRetailer];
      return { ...prev, retailers: retailersNext };
    });
    setSelectedId(draftRetailer.id);
    setIsEditing(false);
    setDraftRetailer(null);
  };

  const saveDevice = () => {
    if (!draftDevice || !draftDevice.serialNumber.trim()) return;
    const retailer = retailers.find((item) => item.id === draftDevice.retailerId);
    const nextDevice = {
      ...draftDevice,
      retailerName: retailer?.name ?? draftDevice.retailerName,
    };
    setDataset((prev) => {
      const exists = prev.devices.some((item) => item.id === nextDevice.id);
      const devicesNext = exists
        ? prev.devices.map((item) => (item.id === nextDevice.id ? nextDevice : item))
        : [...prev.devices, nextDevice];
      return { ...prev, devices: devicesNext };
    });
    setSelectedId(nextDevice.id);
    setIsEditing(false);
    setDraftDevice(null);
  };

  const saveSupport = () => {
    if (!draftSupport || !draftSupport.name.trim() || !draftSupport.email.trim()) return;
    setDataset((prev) => {
      const exists = prev.supportPersonnel.some((item) => item.id === draftSupport.id);
      const supportNext = exists
        ? prev.supportPersonnel.map((item) =>
            item.id === draftSupport.id ? draftSupport : item
          )
        : [...prev.supportPersonnel, draftSupport];
      return { ...prev, supportPersonnel: supportNext };
    });
    setSelectedId(draftSupport.id);
    setIsEditing(false);
    setDraftSupport(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (activeTab === "retailers") {
      setDataset((prev) => ({
        ...prev,
        retailers: prev.retailers.filter((item) => item.id !== selectedId),
        devices: prev.devices.filter((item) => item.retailerId !== selectedId),
      }));
    } else if (activeTab === "devices") {
      setDataset((prev) => ({
        ...prev,
        devices: prev.devices.filter((item) => item.id !== selectedId),
      }));
    } else {
      setDataset((prev) => ({
        ...prev,
        supportPersonnel: prev.supportPersonnel.filter((item) => item.id !== selectedId),
      }));
    }
    resetDrafts();
  };

  const handleResetMockData = () => {
    const seed = resetLocationDataset();
    setDataset(seed);
    resetDrafts();
    setSearchTerm("");
  };

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px] space-y-4">
        <header className="border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Location management
              </h2>
              <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-slate-600">
                Super admin workspace for retailer sites, captive portal routers, and support
                personnel. Mock data is stored in this browser only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleResetMockData}>
                Reset mock data
              </Button>
              {activeTab === "retailers" ? (
                <Button onClick={startCreateRetailer}>Add retailer</Button>
              ) : null}
              {activeTab === "devices" ? (
                <Button onClick={startCreateDevice}>Add device</Button>
              ) : null}
              {activeTab === "support" ? (
                <Button onClick={startCreateSupport}>Add personnel</Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  resetDrafts();
                  setSearchTerm("");
                }}
                className={`border px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <LocationMap
              markers={mapMarkers}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setIsEditing(false);
                setDraftRetailer(null);
                setDraftDevice(null);
                setDraftSupport(null);
              }}
              className="min-h-[420px] w-full"
            />

            <div className="relative border border-slate-200 bg-white">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, code, serial, email…"
                className="w-full border-0 bg-transparent py-3 pl-10 pr-3 text-sm text-slate-800 outline-none"
              />
            </div>

            <div className="overflow-hidden border border-slate-200 bg-white">
              {activeTab === "retailers" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Retailer</th>
                      <th className="px-4 py-3">Coordinates</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRetailers.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                          selectedId === item.id ? "bg-violet-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setIsEditing(true);
                          setDraftRetailer({ ...item });
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.code}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {formatCoordinates(item.lat, item.lng)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${retailerStatusClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {activeTab === "devices" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Device</th>
                      <th className="px-4 py-3">Retailer</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                          selectedId === item.id ? "bg-violet-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setIsEditing(true);
                          setDraftDevice({ ...item });
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.serialNumber}</p>
                          <p className="text-xs text-slate-500">{item.model}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.retailerName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${deviceStatusClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {activeTab === "support" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Personnel</th>
                      <th className="px-4 py-3">Territory</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupport.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                          selectedId === item.id ? "bg-violet-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setIsEditing(true);
                          setDraftSupport({ ...item });
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.territory}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${supportStatusClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>

          <aside className="border border-slate-200 bg-white p-4">
            {!isEditing ? (
              <p className="text-sm text-slate-500">
                Select a row or use Add to edit coordinates on the map.
              </p>
            ) : null}

            {isEditing && draftRetailer ? (
              <RetailerForm
                value={draftRetailer}
                onChange={setDraftRetailer}
                onSave={saveRetailer}
                onCancel={resetDrafts}
                onDelete={selectedId ? deleteSelected : undefined}
              />
            ) : null}

            {isEditing && draftDevice ? (
              <DeviceForm
                value={draftDevice}
                retailers={retailers}
                onChange={setDraftDevice}
                onSave={saveDevice}
                onCancel={resetDrafts}
                onDelete={selectedId ? deleteSelected : undefined}
              />
            ) : null}

            {isEditing && draftSupport ? (
              <SupportForm
                value={draftSupport}
                onChange={setDraftSupport}
                onSave={saveSupport}
                onCancel={resetDrafts}
                onDelete={selectedId ? deleteSelected : undefined}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}

type FormShellProps = {
  title: string;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
};

function FormShell({ title, onSave, onCancel, onDelete, children }: FormShellProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave}>Save</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button
            variant="outline"
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 size-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function RetailerForm({
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  value: RetailerLocation;
  onChange: (value: RetailerLocation) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <FormShell title="Retailer location" onSave={onSave} onCancel={onCancel} onDelete={onDelete}>
      <Field label="Code">
        <input
          className={inputClass}
          value={value.code}
          onChange={(event) => onChange({ ...value, code: event.target.value })}
        />
      </Field>
      <Field label="Name">
        <input
          className={inputClass}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Address">
        <input
          className={inputClass}
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
        />
      </Field>
      <Field label="Landmark">
        <input
          className={inputClass}
          value={value.landmark}
          onChange={(event) => onChange({ ...value, landmark: event.target.value })}
        />
      </Field>
      <Field label="Status">
        <SidebarSelect
          ariaLabel="Retailer status"
          value={value.status}
          onChange={(next) => onChange({ ...value, status: next as LocationStatus })}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </Field>
      <CoordinateFields
        lat={value.lat}
        lng={value.lng}
        onChange={(lat, lng) => onChange({ ...value, lat, lng })}
      />
    </FormShell>
  );
}

function DeviceForm({
  value,
  retailers,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  value: DeviceLocation;
  retailers: RetailerLocation[];
  onChange: (value: DeviceLocation) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <FormShell title="Device (router)" onSave={onSave} onCancel={onCancel} onDelete={onDelete}>
      <Field label="Serial number">
        <input
          className={inputClass}
          value={value.serialNumber}
          onChange={(event) => onChange({ ...value, serialNumber: event.target.value })}
        />
      </Field>
      <Field label="Model">
        <input
          className={inputClass}
          value={value.model}
          onChange={(event) => onChange({ ...value, model: event.target.value })}
        />
      </Field>
      <Field label="Retailer">
        <SidebarSelect
          ariaLabel="Retailer"
          value={value.retailerId}
          onChange={(retailerId) => {
            const retailer = retailers.find((item) => item.id === retailerId);
            onChange({
              ...value,
              retailerId,
              retailerName: retailer?.name ?? value.retailerName,
              lat: retailer?.lat ?? value.lat,
              lng: retailer?.lng ?? value.lng,
            });
          }}
          options={retailers.map((retailer) => ({
            value: retailer.id,
            label: retailer.name,
          }))}
        />
      </Field>
      <Field label="Status">
        <SidebarSelect
          ariaLabel="Device status"
          value={value.status}
          onChange={(next) => onChange({ ...value, status: next as DeviceStatus })}
          options={[
            { value: "online", label: "Online" },
            { value: "offline", label: "Offline" },
            { value: "maintenance", label: "Maintenance" },
          ]}
        />
      </Field>
      <CoordinateFields
        lat={value.lat}
        lng={value.lng}
        onChange={(lat, lng) => onChange({ ...value, lat, lng })}
      />
    </FormShell>
  );
}

function SupportForm({
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  value: SupportPersonnelLocation;
  onChange: (value: SupportPersonnelLocation) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <FormShell title="Support personnel" onSave={onSave} onCancel={onCancel} onDelete={onDelete}>
      <Field label="Name">
        <input
          className={inputClass}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          className={inputClass}
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          className={inputClass}
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </Field>
      <Field label="Territory">
        <input
          className={inputClass}
          value={value.territory}
          onChange={(event) => onChange({ ...value, territory: event.target.value })}
        />
      </Field>
      <Field label="Status">
        <SidebarSelect
          ariaLabel="Support status"
          value={value.status}
          onChange={(next) => onChange({ ...value, status: next as SupportPersonnelStatus })}
          options={[
            { value: "available", label: "Available" },
            { value: "on-call", label: "On call" },
            { value: "off-duty", label: "Off duty" },
          ]}
        />
      </Field>
      <CoordinateFields
        lat={value.lat}
        lng={value.lng}
        onChange={(lat, lng) => onChange({ ...value, lat, lng })}
      />
    </FormShell>
  );
}

function CoordinateFields({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Click the map or drag the pin to set latitude and longitude.
      </p>
      <LocationMapPicker
        latitude={String(lat)}
        longitude={String(lng)}
        onCoordinatesChange={onChange}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            className={inputClass}
            value={lat}
            onChange={(event) => onChange(Number(event.target.value), lng)}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            className={inputClass}
            value={lng}
            onChange={(event) => onChange(lat, Number(event.target.value))}
          />
        </Field>
      </div>
    </div>
  );
}
