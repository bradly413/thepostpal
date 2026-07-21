import LegalDocument, { LegalSection } from "@/components/marketing/LegalDocument";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description: "How posterboy handles your data, cookies, and Meta integrations.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" updated="May 18, 2026">
      <p className="type-body" style={{ lineHeight: 1.65 }}>
        posterboy Social (&ldquo;posterboy,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) helps small
        businesses create and publish social content. This policy explains what we collect, why we
        collect it, and how you can control your data.
      </p>

      <LegalSection title="1. Who this applies to">
        <p>
          This policy covers visitors to {SITE_DOMAIN}, beta users who create an account, and
          business owners who connect Facebook Pages or Instagram Business accounts through our
          product.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>
          <strong>Account information:</strong> name, email address, workspace name, and password
          (stored as a salted hash — we never store plaintext passwords).
        </p>
        <p>
          <strong>Brand &amp; content data:</strong> onboarding answers, brand books, captions,
          templates, photos you upload, and scheduled posts you create in the dashboard.
        </p>
        <p>
          <strong>Connected social accounts:</strong> when you authorize Meta (Facebook/Instagram),
          we receive Page and Instagram Business account identifiers, display names, and access
          tokens required to publish on your behalf. We do not receive your personal Facebook
          password.
        </p>
        <p>
          <strong>Usage &amp; technical data:</strong> IP address, browser type, session cookies,
          and basic request logs used for security, rate limiting, and debugging.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use your information">
        <p>We use your data to:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
          <li>Authenticate you and keep your workspace secure</li>
          <li>Generate brand guidelines and draft social content</li>
          <li>Publish or schedule posts to Facebook and Instagram when you ask us to</li>
          <li>Store media you upload (e.g., to secure cloud storage) so Meta can fetch public URLs</li>
          <li>Improve reliability during beta and respond to support requests</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="4. Meta / Facebook / Instagram">
        <p>
          posterboy uses the Meta Graph API only after you explicitly connect your accounts in
          Settings. Scopes we request include publishing and reading engagement data needed to
          operate posting features (e.g., <code>pages_manage_posts</code>,{" "}
          <code>instagram_content_publish</code>).
        </p>
        <p>
          We store Page and Instagram Business tokens securely on our servers, scoped to your
          workspace and location. You can disconnect at any time in Settings, which removes stored
          tokens for that location.
        </p>
        <p>
          Meta&apos;s own policies also apply to data processed on their platform. See{" "}
          <a href="https://www.facebook.com/privacy/policy/" rel="noopener noreferrer">
            Meta&apos;s Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies &amp; local storage">
        <p>
          <strong>Session cookie:</strong> we set an HTTP-only <code>session</code> cookie when you
          sign in so you stay authenticated.
        </p>
        <p>
          <strong>OAuth state cookies:</strong> short-lived cookies used during Meta connect to
          prevent CSRF attacks.
        </p>
        <p>
          <strong>Browser local storage:</strong> we cache brand books, onboarding answers, and your
          active location selection locally so the dashboard loads quickly. You can clear this by
          signing out or removing site data in your browser.
        </p>
        <p>We do not use third-party advertising cookies.</p>
      </LegalSection>

      <LegalSection title="6. Data retention &amp; deletion">
        <p>
          We retain workspace data while your account is active. You may delete your account in
          Settings → Account → Danger zone, which removes your organization data from our database
          and clears your login credentials.
        </p>
        <p>
          Backups and logs may persist for a limited period for security and legal compliance before
          automatic purging.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We use HTTPS, tenant-scoped database access (row-level security), rate limiting on
          sensitive APIs, and hashed passwords. No system is perfectly secure — report concerns to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights &amp; contact">
        <p>
          Depending on your location, you may have rights to access, correct, or delete personal
          data. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will respond
          within a reasonable time.
        </p>
        <p>
          This policy may change during beta. Material updates will be reflected on this page with
          a new &ldquo;Last updated&rdquo; date.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
