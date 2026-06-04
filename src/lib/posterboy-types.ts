export type DraftStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "published"
  | "skipped"
  | "needs_revision"
  | "failed";

export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "tiktok";

export type BusinessGoal =
  | "leads"
  | "foot_traffic"
  | "trust"
  | "recruiting"
  | "announcements"
  | "events"
  | "look_alive";

export interface BrandVoiceProfile {
  tone: string[];
  bannedPhrases: string[];
  preferredPhrases: string[];
  audience: string;
  services: string;
  offers: string;
  recurringThemes: string[];
}

export interface BrandKit {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Organization {
  id: string;
  name: string;
  businessType: string;
  website?: string;
  locationCount: number;
  plan?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  brandKit: BrandKit;
  brandVoice: BrandVoiceProfile;
  socialChannels: SocialPlatform[];
}

export interface Draft {
  id: string;
  locationId: string;
  issueId?: string;
  copy: string;
  platforms: SocialPlatform[];
  scheduledDate?: string;
  scheduledTime?: string;
  status: DraftStatus;
  channel?: string;
  note?: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  organizationId: string;
  locationId?: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  status: "open" | "in_review" | "closed";
  draftIds: string[];
}

export interface Approval {
  id: string;
  draftId: string;
  status: DraftStatus;
  reviewer?: string;
  notes?: string;
  timestamp: string;
}

export interface BrandIntakeData {
  businessName: string;
  businessType: string;
  locationCount: number;
  website: string;
  services: string;
  audience: string;
  tonePreferences: string[];
  bannedPhrases: string[];
  preferredPhrases: string[];
  recurringOffers: string;
  seasonalMoments: string;
  platforms: SocialPlatform[];
  goals: BusinessGoal[];
}
