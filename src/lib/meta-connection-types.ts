/** Client-safe Meta connection view (no access tokens). */
export interface MetaConnectionPublic {
  connected: boolean;
  pageName: string;
  pageId: string;
  igAccountId: string | null;
  locationId: string;
  connectedAt: string;
}

export interface MetaConnectionSecrets {
  pageId: string;
  pageToken: string;
  igAccountId: string | null;
  pageName: string;
}
