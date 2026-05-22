"use client";

import { useEffect, useState } from "react";
import {
  getLocations,
  getActiveLocationId,
  setActiveLocationId,
} from "@/lib/organization-store";

export default function LocationSwitcher() {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      setLocations(getLocations());
      setActiveId(getActiveLocationId());
    }
    load();
    window.addEventListener("org-updated", load);
    return () => window.removeEventListener("org-updated", load);
  }, []);

  if (locations.length <= 1) return null;

  return (
    <label className="pb-location-switcher">
      <span className="sr-only">Location</span>
      <select
        value={activeId ?? locations[0]?.id ?? ""}
        onChange={(e) => {
          setActiveLocationId(e.target.value);
          setActiveId(e.target.value);
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
