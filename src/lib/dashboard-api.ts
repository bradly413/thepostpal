"use client";

import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
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

export async function fetchDashboardLocations(): Promise<DashboardLocationRecord[]> {
  const data = await apiRequest<{ locations: DashboardLocationRecord[] }>("/api/locations");
  return data.locations;
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
}

export async function createDashboardPost(input: {
  locationId: string;
  copy: string;
  platforms: SocialPlatform[];
  scheduledFor?: string | null;
  status?: DraftStatus;
  templateId?: string | null;
  pillar?: string | null;
}): Promise<DashboardPostRecord> {
  const data = await apiRequest<{ post: DashboardPostRecord }>("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  }>,
): Promise<DashboardPostRecord> {
  const data = await apiRequest<{ post: DashboardPostRecord }>(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.post;
}

export async function submitDashboardPost(id: string): Promise<void> {
  await apiRequest(`/api/posts/${id}/submit-for-approval`, {
    method: "POST",
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
  return apiRequest<DashboardBrandBookResponse>("/api/brand-book", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function isDashboardAccessError(error: unknown): error is DashboardApiError {
  return error instanceof DashboardApiError && (error.status === 403 || error.status === 404);
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
