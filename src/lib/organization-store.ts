import type {
  Organization,
  Location,
  BrandIntakeData,
  BrandVoiceProfile,
  BrandKit,
} from "./posterboy-types";

const ORG_KEY = "posterboy-organization";
const LOCATIONS_KEY = "posterboy-locations";
const ACTIVE_LOCATION_KEY = "posterboy-active-location";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getOrganization(): Organization | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveOrganization(org: Organization): void {
  localStorage.setItem(ORG_KEY, JSON.stringify(org));
  window.dispatchEvent(new Event("org-updated"));
}

export function getLocations(): Location[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getLocation(id: string): Location | undefined {
  return getLocations().find((l) => l.id === id);
}

export function saveLocations(locations: Location[]): void {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  window.dispatchEvent(new Event("org-updated"));
}

export function getActiveLocationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_LOCATION_KEY);
}

export function setActiveLocationId(id: string): void {
  localStorage.setItem(ACTIVE_LOCATION_KEY, id);
  window.dispatchEvent(new Event("org-updated"));
}

export function getActiveLocation(): Location | null {
  const id = getActiveLocationId();
  if (id) {
    const loc = getLocation(id);
    if (loc) return loc;
  }
  const locations = getLocations();
  return locations[0] ?? null;
}

export function createFromBrandIntake(data: BrandIntakeData): {
  organization: Organization;
  location: Location;
} {
  const orgId = generateId();
  const locationId = generateId();

  const brandVoice: BrandVoiceProfile = {
    tone: data.tonePreferences,
    bannedPhrases: data.bannedPhrases,
    preferredPhrases: data.preferredPhrases,
    audience: data.audience,
    services: data.services,
    offers: data.recurringOffers,
    recurringThemes: data.seasonalMoments
      ? data.seasonalMoments.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };

  const brandKit: BrandKit = {};

  const organization: Organization = {
    id: orgId,
    name: data.businessName,
    businessType: data.businessType,
    website: data.website,
    locationCount: data.locationCount,
    createdAt: new Date().toISOString(),
  };

  const location: Location = {
    id: locationId,
    organizationId: orgId,
    name: data.businessName,
    brandKit,
    brandVoice,
    socialChannels: data.platforms,
  };

  saveOrganization(organization);
  saveLocations([location]);
  setActiveLocationId(locationId);

  return { organization, location };
}

export function seedDemoOrganization(): void {
  if (getOrganization()) return;

  createFromBrandIntake({
    businessName: "Riverside Bakery",
    businessType: "bakery",
    locationCount: 1,
    website: "riversidebakery.example",
    services: "Sourdough, pastries, Saturday cooking classes",
    audience: "Neighborhood regulars and weekend visitors",
    tonePreferences: ["warm", "dry", "understated"],
    bannedPhrases: ["artisanal journey", "foodie", "yummy"],
    preferredPhrases: ["fresh from the oven", "while they last"],
    recurringOffers: "Two loaves per household on sourdough days",
    seasonalMoments: "Fourth of July, Thanksgiving pies, winter stews",
    platforms: ["instagram", "facebook"],
    goals: ["foot_traffic", "events", "look_alive"],
  });
}

export function addLocation(name: string, organizationId: string): Location {
  const locations = getLocations();
  const location: Location = {
    id: generateId(),
    organizationId,
    name,
    brandKit: {},
    brandVoice: {
      tone: [],
      bannedPhrases: [],
      preferredPhrases: [],
      audience: "",
      services: "",
      offers: "",
      recurringThemes: [],
    },
    socialChannels: ["instagram", "facebook"],
  };
  locations.push(location);
  saveLocations(locations);
  return location;
}

export function updateLocationBrandVoice(
  locationId: string,
  voice: Partial<BrandVoiceProfile>,
): void {
  const locations = getLocations();
  const idx = locations.findIndex((l) => l.id === locationId);
  if (idx === -1) return;
  locations[idx] = {
    ...locations[idx],
    brandVoice: { ...locations[idx].brandVoice, ...voice },
  };
  saveLocations(locations);
}
