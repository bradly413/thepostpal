"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  getOrganization,
  getLocations,
  addLocation,
  setActiveLocationId,
} from "@/lib/organization-store";
import { ensureDashboardData } from "@/lib/dashboard-data-init";
import { getDraftsForLocation } from "@/lib/drafts-store";
import { GROWTH, HOUSE_ACCOUNT } from "@/lib/posterboy-copy";
import type { Location, Organization } from "@/lib/posterboy-types";

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    ensureDashboardData();
    setOrg(getOrganization());
    setLocations(getLocations());
    const refresh = () => {
      setOrg(getOrganization());
      setLocations(getLocations());
    };
    window.addEventListener("org-updated", refresh);
    return () => window.removeEventListener("org-updated", refresh);
  }, []);

  function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !newName.trim()) return;
    addLocation(newName.trim(), org.id);
    setNewName("");
    setLocations(getLocations());
  }

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Organization</h1>
          <p>{HOUSE_ACCOUNT.headline}</p>
          <p className="text-sm opacity-70 mt-1">{HOUSE_ACCOUNT.localEnough}</p>
        </div>
        <LocationSwitcher />
      </div>

      {org && (
        <div className="pb-draft-card mb-6" style={{ gridTemplateColumns: "1fr" }}>
          <p className="text-xs uppercase tracking-widest opacity-50">Organization</p>
          <p className="text-lg font-serif mt-1" style={{ fontFamily: "var(--font-instrument-serif)" }}>{org.name}</p>
          <p className="text-sm opacity-60">{org.businessType} · {locations.length} location{locations.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      <h2 className="text-sm uppercase tracking-widest opacity-50 mb-3">Locations</h2>
      <div className="pb-draft-list mb-8">
        {locations.map((loc) => {
          const draftCount = getDraftsForLocation(loc.id).length;
          return (
            <article key={loc.id} className="pb-draft-card">
              <div className="flex-1">
                <p className="font-medium">{loc.name}</p>
                <p className="text-sm opacity-60">{draftCount} drafts</p>
              </div>
              <button
                type="button"
                className="pb-btn-secondary text-sm"
                onClick={() => setActiveLocationId(loc.id)}
              >
                Switch
              </button>
            </article>
          );
        })}
      </div>

      <form onSubmit={handleAddLocation} className="flex gap-2 mb-8 max-w-md">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New location name"
          className="flex-1 border border-black/15 px-3 py-2 bg-transparent text-sm"
        />
        <button type="submit" className="pb-btn-primary text-sm">Add location</button>
      </form>

      <section className="pb-proof-card">
        <h3 className="pb-display">Command</h3>
        <p className="mt-2">{GROWTH.oneBrandManyLocations} {GROWTH.noFreelancingCaption}</p>
        <Link href="/pricing#command" className="pb-btn-secondary inline-flex mt-4 text-sm">
          View Command pricing
        </Link>
      </section>
    </div>
  );
}
