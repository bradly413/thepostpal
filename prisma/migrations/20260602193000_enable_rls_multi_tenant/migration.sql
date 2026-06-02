-- Strict multi-tenant row-level security for Posterboy Social.
-- The application must set these transaction-local GUCs before querying:
--   app.current_tenant_id
--   app.current_user_id
--   app.current_is_superadmin

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION public.current_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_is_superadmin', true), ''), 'false') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_organization(org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR org_id = public.current_tenant_id();
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_user(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "User" u
    WHERE u.id = user_id
      AND u."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_location(location_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "Location" l
    WHERE l.id = location_id
      AND l."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_scheduled_post(post_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "ScheduledPost" sp
    WHERE sp.id = post_id
      AND sp."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_draft(draft_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "Draft" d
    JOIN "Location" l ON l.id = d."locationId"
    WHERE d.id = draft_id
      AND l."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_campaign(campaign_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    WHERE c.id = campaign_id
      AND c."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_post_approval(post_approval_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "PostApproval" pa
    JOIN "Location" l ON l.id = pa."locationId"
    WHERE pa.id = post_approval_id
      AND l."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_post(post_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin() OR EXISTS (
    SELECT 1
    FROM "Post" p
    JOIN "Location" l ON l.id = p."locationId"
    WHERE p.id = post_id
      AND l."organizationId" = public.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_matches_dispatch_item(scheduled_post_id text, post_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_is_superadmin()
    OR (scheduled_post_id IS NOT NULL AND public.tenant_matches_scheduled_post(scheduled_post_id))
    OR (post_id IS NOT NULL AND public.tenant_matches_post(post_id));
$$;

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LocationMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationMembership" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRule" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PostApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostApproval" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BrandKit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandKit" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BrandVoiceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandVoiceProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SocialConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialConnection" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledPost" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PhotoAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhotoAsset" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeBaseEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeBaseEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Draft" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Approval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Approval" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DispatchItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DispatchItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CampaignLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignLocation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsSnapshot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_select ON "Organization";
DROP POLICY IF EXISTS organization_insert ON "Organization";
DROP POLICY IF EXISTS organization_update ON "Organization";
DROP POLICY IF EXISTS organization_delete ON "Organization";
CREATE POLICY organization_select ON "Organization" FOR SELECT USING (public.tenant_matches_organization(id));
CREATE POLICY organization_insert ON "Organization" FOR INSERT WITH CHECK (public.tenant_matches_organization(id));
CREATE POLICY organization_update ON "Organization" FOR UPDATE USING (public.tenant_matches_organization(id)) WITH CHECK (public.tenant_matches_organization(id));
CREATE POLICY organization_delete ON "Organization" FOR DELETE USING (public.tenant_matches_organization(id));

DROP POLICY IF EXISTS user_select ON "User";
DROP POLICY IF EXISTS user_insert ON "User";
DROP POLICY IF EXISTS user_update ON "User";
DROP POLICY IF EXISTS user_delete ON "User";
CREATE POLICY user_select ON "User" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY user_insert ON "User" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY user_update ON "User" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY user_delete ON "User" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS location_select ON "Location";
DROP POLICY IF EXISTS location_insert ON "Location";
DROP POLICY IF EXISTS location_update ON "Location";
DROP POLICY IF EXISTS location_delete ON "Location";
CREATE POLICY location_select ON "Location" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY location_insert ON "Location" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY location_update ON "Location" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY location_delete ON "Location" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS location_membership_select ON "LocationMembership";
DROP POLICY IF EXISTS location_membership_insert ON "LocationMembership";
DROP POLICY IF EXISTS location_membership_update ON "LocationMembership";
DROP POLICY IF EXISTS location_membership_delete ON "LocationMembership";
CREATE POLICY location_membership_select ON "LocationMembership" FOR SELECT USING (public.tenant_matches_location("locationId") AND public.tenant_matches_user("userId"));
CREATE POLICY location_membership_insert ON "LocationMembership" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId") AND public.tenant_matches_user("userId"));
CREATE POLICY location_membership_update ON "LocationMembership" FOR UPDATE USING (public.tenant_matches_location("locationId") AND public.tenant_matches_user("userId")) WITH CHECK (public.tenant_matches_location("locationId") AND public.tenant_matches_user("userId"));
CREATE POLICY location_membership_delete ON "LocationMembership" FOR DELETE USING (public.tenant_matches_location("locationId") AND public.tenant_matches_user("userId"));

DROP POLICY IF EXISTS approval_rule_select ON "ApprovalRule";
DROP POLICY IF EXISTS approval_rule_insert ON "ApprovalRule";
DROP POLICY IF EXISTS approval_rule_update ON "ApprovalRule";
DROP POLICY IF EXISTS approval_rule_delete ON "ApprovalRule";
CREATE POLICY approval_rule_select ON "ApprovalRule" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY approval_rule_insert ON "ApprovalRule" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY approval_rule_update ON "ApprovalRule" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY approval_rule_delete ON "ApprovalRule" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS post_approval_select ON "PostApproval";
DROP POLICY IF EXISTS post_approval_insert ON "PostApproval";
DROP POLICY IF EXISTS post_approval_update ON "PostApproval";
DROP POLICY IF EXISTS post_approval_delete ON "PostApproval";
CREATE POLICY post_approval_select ON "PostApproval" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY post_approval_insert ON "PostApproval" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId") AND public.tenant_matches_user("submittedByUserId") AND ("reviewedByUserId" IS NULL OR public.tenant_matches_user("reviewedByUserId")));
CREATE POLICY post_approval_update ON "PostApproval" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId") AND public.tenant_matches_user("submittedByUserId") AND ("reviewedByUserId" IS NULL OR public.tenant_matches_user("reviewedByUserId")));
CREATE POLICY post_approval_delete ON "PostApproval" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS approval_event_select ON "ApprovalEvent";
DROP POLICY IF EXISTS approval_event_insert ON "ApprovalEvent";
DROP POLICY IF EXISTS approval_event_update ON "ApprovalEvent";
DROP POLICY IF EXISTS approval_event_delete ON "ApprovalEvent";
CREATE POLICY approval_event_select ON "ApprovalEvent" FOR SELECT USING (public.tenant_matches_post_approval("postApprovalId"));
CREATE POLICY approval_event_insert ON "ApprovalEvent" FOR INSERT WITH CHECK (public.tenant_matches_post_approval("postApprovalId") AND public.tenant_matches_user("actorUserId"));
CREATE POLICY approval_event_update ON "ApprovalEvent" FOR UPDATE USING (public.tenant_matches_post_approval("postApprovalId")) WITH CHECK (public.tenant_matches_post_approval("postApprovalId") AND public.tenant_matches_user("actorUserId"));
CREATE POLICY approval_event_delete ON "ApprovalEvent" FOR DELETE USING (public.tenant_matches_post_approval("postApprovalId"));

DROP POLICY IF EXISTS brand_kit_select ON "BrandKit";
DROP POLICY IF EXISTS brand_kit_insert ON "BrandKit";
DROP POLICY IF EXISTS brand_kit_update ON "BrandKit";
DROP POLICY IF EXISTS brand_kit_delete ON "BrandKit";
CREATE POLICY brand_kit_select ON "BrandKit" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY brand_kit_insert ON "BrandKit" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY brand_kit_update ON "BrandKit" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY brand_kit_delete ON "BrandKit" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS brand_voice_profile_select ON "BrandVoiceProfile";
DROP POLICY IF EXISTS brand_voice_profile_insert ON "BrandVoiceProfile";
DROP POLICY IF EXISTS brand_voice_profile_update ON "BrandVoiceProfile";
DROP POLICY IF EXISTS brand_voice_profile_delete ON "BrandVoiceProfile";
CREATE POLICY brand_voice_profile_select ON "BrandVoiceProfile" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY brand_voice_profile_insert ON "BrandVoiceProfile" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY brand_voice_profile_update ON "BrandVoiceProfile" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY brand_voice_profile_delete ON "BrandVoiceProfile" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS social_connection_select ON "SocialConnection";
DROP POLICY IF EXISTS social_connection_insert ON "SocialConnection";
DROP POLICY IF EXISTS social_connection_update ON "SocialConnection";
DROP POLICY IF EXISTS social_connection_delete ON "SocialConnection";
CREATE POLICY social_connection_select ON "SocialConnection" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY social_connection_insert ON "SocialConnection" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY social_connection_update ON "SocialConnection" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY social_connection_delete ON "SocialConnection" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS scheduled_post_select ON "ScheduledPost";
DROP POLICY IF EXISTS scheduled_post_insert ON "ScheduledPost";
DROP POLICY IF EXISTS scheduled_post_update ON "ScheduledPost";
DROP POLICY IF EXISTS scheduled_post_delete ON "ScheduledPost";
CREATE POLICY scheduled_post_select ON "ScheduledPost" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY scheduled_post_insert ON "ScheduledPost" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY scheduled_post_update ON "ScheduledPost" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY scheduled_post_delete ON "ScheduledPost" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS photo_asset_select ON "PhotoAsset";
DROP POLICY IF EXISTS photo_asset_insert ON "PhotoAsset";
DROP POLICY IF EXISTS photo_asset_update ON "PhotoAsset";
DROP POLICY IF EXISTS photo_asset_delete ON "PhotoAsset";
CREATE POLICY photo_asset_select ON "PhotoAsset" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY photo_asset_insert ON "PhotoAsset" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY photo_asset_update ON "PhotoAsset" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY photo_asset_delete ON "PhotoAsset" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS calendar_event_select ON "CalendarEvent";
DROP POLICY IF EXISTS calendar_event_insert ON "CalendarEvent";
DROP POLICY IF EXISTS calendar_event_update ON "CalendarEvent";
DROP POLICY IF EXISTS calendar_event_delete ON "CalendarEvent";
CREATE POLICY calendar_event_select ON "CalendarEvent" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY calendar_event_insert ON "CalendarEvent" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY calendar_event_update ON "CalendarEvent" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY calendar_event_delete ON "CalendarEvent" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS knowledge_base_entry_select ON "KnowledgeBaseEntry";
DROP POLICY IF EXISTS knowledge_base_entry_insert ON "KnowledgeBaseEntry";
DROP POLICY IF EXISTS knowledge_base_entry_update ON "KnowledgeBaseEntry";
DROP POLICY IF EXISTS knowledge_base_entry_delete ON "KnowledgeBaseEntry";
CREATE POLICY knowledge_base_entry_select ON "KnowledgeBaseEntry" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY knowledge_base_entry_insert ON "KnowledgeBaseEntry" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY knowledge_base_entry_update ON "KnowledgeBaseEntry" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY knowledge_base_entry_delete ON "KnowledgeBaseEntry" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS template_select ON "Template";
DROP POLICY IF EXISTS template_insert ON "Template";
DROP POLICY IF EXISTS template_update ON "Template";
DROP POLICY IF EXISTS template_delete ON "Template";
CREATE POLICY template_select ON "Template" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY template_insert ON "Template" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY template_update ON "Template" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY template_delete ON "Template" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS draft_select ON "Draft";
DROP POLICY IF EXISTS draft_insert ON "Draft";
DROP POLICY IF EXISTS draft_update ON "Draft";
DROP POLICY IF EXISTS draft_delete ON "Draft";
CREATE POLICY draft_select ON "Draft" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY draft_insert ON "Draft" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY draft_update ON "Draft" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY draft_delete ON "Draft" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS post_select ON "Post";
DROP POLICY IF EXISTS post_insert ON "Post";
DROP POLICY IF EXISTS post_update ON "Post";
DROP POLICY IF EXISTS post_delete ON "Post";
CREATE POLICY post_select ON "Post" FOR SELECT USING (public.tenant_matches_location("locationId"));
CREATE POLICY post_insert ON "Post" FOR INSERT WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY post_update ON "Post" FOR UPDATE USING (public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_location("locationId"));
CREATE POLICY post_delete ON "Post" FOR DELETE USING (public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS issue_select ON "Issue";
DROP POLICY IF EXISTS issue_insert ON "Issue";
DROP POLICY IF EXISTS issue_update ON "Issue";
DROP POLICY IF EXISTS issue_delete ON "Issue";
CREATE POLICY issue_select ON "Issue" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY issue_insert ON "Issue" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY issue_update ON "Issue" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY issue_delete ON "Issue" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS approval_select ON "Approval";
DROP POLICY IF EXISTS approval_insert ON "Approval";
DROP POLICY IF EXISTS approval_update ON "Approval";
DROP POLICY IF EXISTS approval_delete ON "Approval";
CREATE POLICY approval_select ON "Approval" FOR SELECT USING (public.tenant_matches_draft("draftId"));
CREATE POLICY approval_insert ON "Approval" FOR INSERT WITH CHECK (public.tenant_matches_draft("draftId"));
CREATE POLICY approval_update ON "Approval" FOR UPDATE USING (public.tenant_matches_draft("draftId")) WITH CHECK (public.tenant_matches_draft("draftId"));
CREATE POLICY approval_delete ON "Approval" FOR DELETE USING (public.tenant_matches_draft("draftId"));

DROP POLICY IF EXISTS dispatch_item_select ON "DispatchItem";
DROP POLICY IF EXISTS dispatch_item_insert ON "DispatchItem";
DROP POLICY IF EXISTS dispatch_item_update ON "DispatchItem";
DROP POLICY IF EXISTS dispatch_item_delete ON "DispatchItem";
CREATE POLICY dispatch_item_select ON "DispatchItem" FOR SELECT USING (public.tenant_matches_dispatch_item("scheduledPostId", "postId"));
CREATE POLICY dispatch_item_insert ON "DispatchItem" FOR INSERT WITH CHECK (public.tenant_matches_dispatch_item("scheduledPostId", "postId"));
CREATE POLICY dispatch_item_update ON "DispatchItem" FOR UPDATE USING (public.tenant_matches_dispatch_item("scheduledPostId", "postId")) WITH CHECK (public.tenant_matches_dispatch_item("scheduledPostId", "postId"));
CREATE POLICY dispatch_item_delete ON "DispatchItem" FOR DELETE USING (public.tenant_matches_dispatch_item("scheduledPostId", "postId"));

DROP POLICY IF EXISTS campaign_select ON "Campaign";
DROP POLICY IF EXISTS campaign_insert ON "Campaign";
DROP POLICY IF EXISTS campaign_update ON "Campaign";
DROP POLICY IF EXISTS campaign_delete ON "Campaign";
CREATE POLICY campaign_select ON "Campaign" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY campaign_insert ON "Campaign" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY campaign_update ON "Campaign" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY campaign_delete ON "Campaign" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS campaign_location_select ON "CampaignLocation";
DROP POLICY IF EXISTS campaign_location_insert ON "CampaignLocation";
DROP POLICY IF EXISTS campaign_location_update ON "CampaignLocation";
DROP POLICY IF EXISTS campaign_location_delete ON "CampaignLocation";
CREATE POLICY campaign_location_select ON "CampaignLocation" FOR SELECT USING (public.tenant_matches_campaign("campaignId") AND public.tenant_matches_location("locationId"));
CREATE POLICY campaign_location_insert ON "CampaignLocation" FOR INSERT WITH CHECK (public.tenant_matches_campaign("campaignId") AND public.tenant_matches_location("locationId"));
CREATE POLICY campaign_location_update ON "CampaignLocation" FOR UPDATE USING (public.tenant_matches_campaign("campaignId") AND public.tenant_matches_location("locationId")) WITH CHECK (public.tenant_matches_campaign("campaignId") AND public.tenant_matches_location("locationId"));
CREATE POLICY campaign_location_delete ON "CampaignLocation" FOR DELETE USING (public.tenant_matches_campaign("campaignId") AND public.tenant_matches_location("locationId"));

DROP POLICY IF EXISTS media_asset_select ON "MediaAsset";
DROP POLICY IF EXISTS media_asset_insert ON "MediaAsset";
DROP POLICY IF EXISTS media_asset_update ON "MediaAsset";
DROP POLICY IF EXISTS media_asset_delete ON "MediaAsset";
CREATE POLICY media_asset_select ON "MediaAsset" FOR SELECT USING ("draftId" IS NOT NULL AND public.tenant_matches_draft("draftId"));
CREATE POLICY media_asset_insert ON "MediaAsset" FOR INSERT WITH CHECK ("draftId" IS NOT NULL AND public.tenant_matches_draft("draftId"));
CREATE POLICY media_asset_update ON "MediaAsset" FOR UPDATE USING ("draftId" IS NOT NULL AND public.tenant_matches_draft("draftId")) WITH CHECK ("draftId" IS NOT NULL AND public.tenant_matches_draft("draftId"));
CREATE POLICY media_asset_delete ON "MediaAsset" FOR DELETE USING ("draftId" IS NOT NULL AND public.tenant_matches_draft("draftId"));

DROP POLICY IF EXISTS analytics_snapshot_select ON "AnalyticsSnapshot";
DROP POLICY IF EXISTS analytics_snapshot_insert ON "AnalyticsSnapshot";
DROP POLICY IF EXISTS analytics_snapshot_update ON "AnalyticsSnapshot";
DROP POLICY IF EXISTS analytics_snapshot_delete ON "AnalyticsSnapshot";
CREATE POLICY analytics_snapshot_select ON "AnalyticsSnapshot" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY analytics_snapshot_insert ON "AnalyticsSnapshot" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY analytics_snapshot_update ON "AnalyticsSnapshot" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId") AND ("locationId" IS NULL OR public.tenant_matches_location("locationId")));
CREATE POLICY analytics_snapshot_delete ON "AnalyticsSnapshot" FOR DELETE USING (public.tenant_matches_organization("organizationId"));

DROP POLICY IF EXISTS subscription_select ON "Subscription";
DROP POLICY IF EXISTS subscription_insert ON "Subscription";
DROP POLICY IF EXISTS subscription_update ON "Subscription";
DROP POLICY IF EXISTS subscription_delete ON "Subscription";
CREATE POLICY subscription_select ON "Subscription" FOR SELECT USING (public.tenant_matches_organization("organizationId"));
CREATE POLICY subscription_insert ON "Subscription" FOR INSERT WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY subscription_update ON "Subscription" FOR UPDATE USING (public.tenant_matches_organization("organizationId")) WITH CHECK (public.tenant_matches_organization("organizationId"));
CREATE POLICY subscription_delete ON "Subscription" FOR DELETE USING (public.tenant_matches_organization("organizationId"));
