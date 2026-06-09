/** Daily insight point from Meta Graph API. */
export interface InsightDayPoint {
  date: string;
  value: number;
}

export interface MetaInsightsTimeSeries {
  impressions: InsightDayPoint[];
  reach: InsightDayPoint[];
  engagement: InsightDayPoint[];
  followers: InsightDayPoint[];
}

export interface MetaTopPost {
  id: string;
  platform: "facebook" | "instagram";
  message: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  permalink?: string;
}

export interface MetaInsightsSummary {
  pageName: string;
  pageFollowers: number;
  igUsername?: string;
  igFollowers?: number;
  igMediaCount?: number;
  totals: {
    impressions: number;
    reach: number;
    engagement: number;
  };
}

export interface DashboardMetaInsights {
  summary: MetaInsightsSummary;
  series: MetaInsightsTimeSeries;
  topPosts: MetaTopPost[];
  fetchedAt: string;
}
