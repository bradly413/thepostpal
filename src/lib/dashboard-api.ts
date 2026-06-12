"use client";

import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import type { TenantVerticalState, VerticalOption } from "@/lib/compliance/client-types";
import type { DraftStatus, SocialPlatform } from "@/lib/posterboy-types";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";

export interface DashboardApiErrorShape {
  error?: string;
}

export class DashboardApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
  }
}

export interface DashboardLocationRecord {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: string;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  brandFontStack?: string | null;
  brandVoiceJson?: {
    tone?: string[];
    audience?: string;
    services?: string;
    offers?: string;
    recurringThemes?: string[];
  } | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  membershipRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardPostRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  copy: string;
  platforms: SocialPlatform[];
  scheduledFor: string | null;
  status: DraftStatus;
  templateId?: string | null;
  pillar?: string | null;
  note?: string | null;
  reviewerNotes?: string | null;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  mediaType?: "image" | "video" | null;
  createdAt: string;
  updatedAt: string;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await parseJson<DashboardApiErrorShape>(response);
    throw new DashboardApiError(response.status, payload?.error || `Request failed (${response.status})`);
  }

  const payload = await parseJson<T>(response);
  if (!payload) {
    throw new DashboardApiError(500, "Empty response from dashboard API");
  }
  return payload;
}

// ── GET de-duplication / short-lived cache ──────────────────
// Every data-scoped dashboard page resolves the active location, and the home
// snapshot, LocationSwitcher, and a post-resolution refresh all read it too —
// so a single load used to fire dozens of identical /api/locations (and
// /api/issues) requests. An effect-dependency guard stopped the runaway
// cascade; this layer removes the residual duplication so each GET resolves
// once per load regardless of how many components ask.
//
// Two mechanisms, both keyed by request URL:
//   1. In-flight coalescing — concurrent callers share one Promise (collapses
//      the mount burst).
//   2. Short TTL — a just-resolved value is reused briefly (collapses the
//      post-event refresh that fires after the first fetch settles).
// Mutations call invalidateCachedGet() so reads never serve stale data.
const CACHED_GET_TTL_MS = 5_000;

interface CachedGetEntry {
  at: number;
  value: unknown;
}

const cachedGetInflight = new Map<string, Promise<unknown>>();
const cachedGetStore = new Map<string, CachedGetEntry>();

async function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cachedGetStore.get(key);
  if (hit && Date.now() - hit.at < CACHED_GET_TTL_MS) {
    return hit.value as T;
  }

  const existing = cachedGetInflight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = fetcher()
    .then((value) => {
      cachedGetStore.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      cachedGetInflight.delete(key);
    });

  cachedGetInflight.set(key, pending);
  return pending;
}

// Drop cached/in-flight GETs whose key starts with `prefix` (or all when
// omitted). Call after a mutation so the next read fetches fresh data.
function invalidateCachedGet(prefix?: string): void {
  if (!prefix) {
    cachedGetStore.clear();
    cachedGetInflight.clear();
    return;
  }
  for (const key of cachedGetStore.keys()) {
    if (key.startsWith(prefix)) cachedGetStore.delete(key);
  }
  for (const key of cachedGetInflight.keys()) {
    if (key.startsWith(prefix)) cachedGetInflight.delete(key);
  }
}

export interface DashboardMeRecord {
  plan: string;
  role: string;
  organizationId: string;
  isSuperadmin: boolean;
  locationCount: number;
  organization: {
    id: string;
    name: string;
    businessType: string;
    website: string | null;
    locationCount: number;
    plan: string;
    createdAt: string;
  };
}

export interface DashboardIssueRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  title: string;
  weekStart: string;
  weekEnd: string;
  status: "open" | "in_review" | "closed";
  stats: {
    total: number;
    approved: number;
    scheduled: number;
    needsReview: number;
  };
}

export async function fetchDashboardMe(): Promise<DashboardMeRecord> {
  return apiRequest<DashboardMeRecord>("/api/me");
}

export async function fetchDashboardLocations(): Promise<DashboardLocationRecord[]> {
  return cachedGet("/api/locations", async () => {
    const data = await apiRequest<{ locations: DashboardLocationRecord[] }>("/api/locations");
    return data.locations;
  });
}

export async function createDashboardLocation(input: {
  name: string;
  slug?: string;
}): Promise<DashboardLocationRecord> {
  const data = await apiRequest<{ location: DashboardLocationRecord }>("/api/locations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateCachedGet("/api/locations");
  return data.location;
}

export async function fetchDashboardIssues(
  locationId?: string | null,
): Promise<DashboardIssueRecord[]> {
  const search = locationId
    ? `/api/issues?locationId=${encodeURIComponent(locationId)}`
    : "/api/issues";
  return cachedGet(search, async () => {
    const data = await apiRequest<{ issues: DashboardIssueRecord[] }>(search);
    return data.issues;
  });
}

export async function fetchDashboardPosts(locationId?: string | null): Promise<DashboardPostRecord[]> {
  const search = locationId
    ? `/api/posts?locationId=${encodeURIComponent(locationId)}`
    : "/api/posts?location=all";
  const data = await apiRequest<{ posts: DashboardPostRecord[] }>(search);
  return data.posts;
}

export async function fetchDashboardPost(id: string): Promise<DashboardPostRecord> {
  const data = await apiRequest<{ post: DashboardPostRecord }>(`/api/posts/${id}`);
  return data.post;
}

export async function deleteDashboardPost(id: string): Promise<void> {
  await apiRequest(`/api/posts/${id}`, { method: "DELETE" });
  invalidateCachedGet("/api/posts");
}

export async function createDashboardPost(input: {
  locationId: string;
  copy: string;
  platforms: SocialPlatform[];
  scheduledFor?: string | null;
  status?: DraftStatus;
  templateId?: string | null;
  pillar?: string | null;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  mediaType?: "image" | "video" | null;
}): Promise<DashboardPostRecord> {
  const data = await apiRequest<{ post: DashboardPostRecord }>("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateCachedGet("/api/posts");
  return data.post;
}

export async function updateDashboardPost(
  id: string,
  input: Partial<{
    copy: string;
    platforms: SocialPlatform[];
    scheduledFor: string | null;
    status: DraftStatus;
    templateId: string | null;
    pillar: string | null;
    note: string | null;
    reviewerNotes: string | null;
    mediaUrl: string | null;
    mediaUrls: string[] | null;
    mediaType: "image" | "video" | null;
  }>,
): Promise<DashboardPostRecord> {
  const data = await apiRequest<{ post: DashboardPostRecord }>(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  invalidateCachedGet("/api/posts");
  return data.post;
}

export async function submitDashboardPost(id: string): Promise<void> {
  await apiRequest(`/api/posts/${id}/submit-for-approval`, {
    method: "POST",
  });
  invalidateCachedGet("/api/posts");
}

// ── Compliance vertical (tenant-scoped) ───────────────────

export async function fetchDashboardVerticalOptions(): Promise<VerticalOption[]> {
  const data = await apiRequest<{ verticals: VerticalOption[] }>("/api/verticals");
  return data.verticals;
}

export async function fetchDashboardVerticalState(): Promise<TenantVerticalState> {
  return apiRequest<TenantVerticalState>("/api/me/vertical");
}

export async function updateDashboardVertical(slug: string): Promise<TenantVerticalState> {
  return apiRequest<TenantVerticalState>("/api/me/vertical", {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
}

// ── Meta (Facebook / Instagram bundle per location) ─────────

export async function fetchDashboardMetaConnection(
  locationId: string,
): Promise<MetaConnectionPublic | null> {
  const data = await apiRequest<{ connection: MetaConnectionPublic | null }>(
    `/api/social-connections/meta?locationId=${encodeURIComponent(locationId)}`,
  );
  return data.connection;
}

export async function disconnectDashboardMetaConnection(
  locationId: string,
): Promise<void> {
  await apiRequest(
    `/api/social-connections/meta?locationId=${encodeURIComponent(locationId)}`,
    { method: "DELETE" },
  );
}

export async function fetchDashboardMetaInsights(
  locationId: string,
): Promise<import("@/lib/meta-insights-types").DashboardMetaInsights> {
  const data = await apiRequest<{
    insights: import("@/lib/meta-insights-types").DashboardMetaInsights;
  }>(`/api/meta/insights?locationId=${encodeURIComponent(locationId)}`);
  return data.insights;
}

// ── Photos ──────────────────────────────────────────────────

export interface DashboardPhotoRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  url: string;
  mimeType?: string | null;
  alt?: string | null;
  createdAt: string;
}

export async function fetchDashboardPhotos(locationId: string): Promise<DashboardPhotoRecord[]> {
  const data = await apiRequest<{ photos: DashboardPhotoRecord[] }>(
    `/api/photos?locationId=${encodeURIComponent(locationId)}`,
  );
  return data.photos;
}

export async function createDashboardPhoto(input: {
  locationId: string;
  url: string;
  mimeType?: string | null;
  alt?: string | null;
}): Promise<DashboardPhotoRecord> {
  const data = await apiRequest<{ photo: DashboardPhotoRecord }>("/api/photos", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.photo;
}

export async function deleteDashboardPhoto(id: string): Promise<void> {
  await apiRequest(`/api/photos/${id}`, { method: "DELETE" });
}

// ── Calendar events ─────────────────────────────────────────

export interface DashboardCalendarEventRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
}

export async function fetchDashboardCalendar(
  locationId: string,
): Promise<DashboardCalendarEventRecord[]> {
  const data = await apiRequest<{ events: DashboardCalendarEventRecord[] }>(
    `/api/calendar?locationId=${encodeURIComponent(locationId)}`,
  );
  return data.events;
}

export async function createDashboardCalendarEvent(input: {
  locationId: string;
  title: string;
  description?: string | null;
  type?: string | null;
  startsAt: string;
  endsAt?: string | null;
}): Promise<DashboardCalendarEventRecord> {
  const data = await apiRequest<{ event: DashboardCalendarEventRecord }>("/api/calendar", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.event;
}

export async function updateDashboardCalendarEvent(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    type: string | null;
    startsAt: string;
    endsAt: string | null;
  }>,
): Promise<DashboardCalendarEventRecord> {
  const data = await apiRequest<{ event: DashboardCalendarEventRecord }>(`/api/calendar/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.event;
}

export async function deleteDashboardCalendarEvent(id: string): Promise<void> {
  await apiRequest(`/api/calendar/${id}`, { method: "DELETE" });
}

export interface DashboardBrandBookResponse {
  hasBrandBook: boolean;
  locationId: string | null;
  brandBook: BrandBook | null;
  onboardingAnswers?: OnboardingAnswers | null;
}

export async function fetchDashboardBrandBook(
  locationId?: string | null,
): Promise<DashboardBrandBookResponse> {
  const search = locationId
    ? `?locationId=${encodeURIComponent(locationId)}`
    : "";
  return apiRequest<DashboardBrandBookResponse>(`/api/brand-book${search}`);
}

export async function saveDashboardBrandBook(input: {
  locationId: string;
  brandBook: BrandBook;
  onboardingAnswers?: OnboardingAnswers;
}): Promise<DashboardBrandBookResponse> {
  const result = await apiRequest<DashboardBrandBookResponse>("/api/brand-book", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  // Brand book lives on the location's brandVoiceJson — drop cached locations
  // so the next read reflects the saved voice.
  invalidateCachedGet("/api/locations");
  return result;
}

export interface GenerateDashboardBrandBookResult {
  brandBook: BrandBook;
  voice: "structured" | "fallback";
}

export async function generateDashboardBrandBook(
  answers: OnboardingAnswers,
): Promise<GenerateDashboardBrandBookResult> {
  return apiRequest<GenerateDashboardBrandBookResult>("/api/brand-book/generate", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export interface GenerateDashboardImageResult {
  success: boolean;
  image: string;
  imageUrl: string;
  text?: string;
}

export async function generateDashboardImage(
  basePrompt: string,
  options?: { locationId?: string; referenceImage?: string | null },
): Promise<GenerateDashboardImageResult> {
  return apiRequest<GenerateDashboardImageResult>("/api/images/generate", {
    method: "POST",
    body: JSON.stringify({
      basePrompt,
      locationId: options?.locationId,
      referenceImage: options?.referenceImage ?? null,
    }),
  });
}

export function isDashboardAccessError(error: unknown): error is DashboardApiError {
  return error instanceof DashboardApiError && (error.status === 403 || error.status === 404);
}

// ── Meta Ads (Marketing API) ──────────────────────────────────

export interface DashboardMetaAdAccountRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  adAccountId: string;
  name: string;
  currency: string;
}

export interface MetaAdsLaunchPayload {
  locationId: string;
  adAccountId: string;
  campaignName: string;
  objective: string;
  dailyBudgetCents: number;
  startTime: string;
  endTime?: string;
  geoCountries: string[];
  ageMin: number;
  ageMax: number;
  message: string;
  link: string;
  callToAction: string;
  imageUrl: string;
}

export async function fetchDashboardMetaAdAccounts(
  locationId: string,
): Promise<DashboardMetaAdAccountRecord[]> {
  const data = await apiRequest<{ accounts: DashboardMetaAdAccountRecord[] }>(
    `/api/meta/ad-accounts?locationId=${encodeURIComponent(locationId)}`,
  );
  return data.accounts;
}

export async function fetchDashboardMetaAdsAuthUrl(
  locationId: string,
): Promise<string> {
  const data = await apiRequest<{ url: string }>(
    `/api/meta/ads/auth?locationId=${encodeURIComponent(locationId)}`,
  );
  return data.url;
}

export async function launchDashboardMetaAd(
  payload: MetaAdsLaunchPayload,
): Promise<{ message: string; campaignId: string; adId: string; status: string }> {
  return apiRequest("/api/meta/ads/launch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchDashboardMetaAdInsights(
  locationId: string,
  adAccountId: string,
  datePreset = "last_7d",
): Promise<{ insights: { data?: unknown[] } }> {
  const q = new URLSearchParams({
    locationId,
    adAccountId,
    date_preset: datePreset,
  });
  return apiRequest(`/api/meta/ads/insights?${q.toString()}`);
}

export function formatDashboardApiMessage(error: unknown, fallback: string): string {
  if (error instanceof DashboardApiError) {
    if (error.status === 403) {
      return "That location is protected for another user or role.";
    }
    if (error.status === 404) {
      return "That record no longer exists in this workspace.";
    }
    return error.message || fallback;
  }
  return fallback;
}
