"use client";

import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { useActiveLocation } from "@/lib/use-active-location";

interface LocationSwitcherProps {
  value?: string | null;
  onChange?: (locationId: string) => void;
}

export default function LocationSwitcher({ value, onChange }: LocationSwitcherProps) {
  const features = usePlanFeatures();
  const { locationId, locations, setLocationId, loading, error } = useActiveLocation();

  const activeId = value ?? locationId;

  if (!features.multiLocation) return null;

  if (loading) {
    return (
      <div className="pb-location-switcher">
        <div className="h-10 w-[180px] animate-pulse rounded-full border border-black/10 bg-black/[0.04]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-[#8f6a64]">{error}</div>;
  }

  if (locations.length <= 1) return null;

  return (
    <label className="pb-location-switcher">
      <span className="sr-only">Location</span>
      <select
        value={activeId ?? locations[0]?.id ?? ""}
        onChange={(e) => {
          setLocationId(e.target.value);
          onChange?.(e.target.value);
        }}
        className="pb-location-select"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </label>
  );
}
