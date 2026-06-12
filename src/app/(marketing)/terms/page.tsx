import LegalDocument, { LegalSection } from "@/components/marketing/LegalDocument";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of use for posterboy Social closed beta.",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" updated="May 18, 2026">
      <p className="type-body" style={{ lineHeight: 1.65 }}>
        These Terms govern your use of posterboy Social at {SITE_DOMAIN} during our closed beta. By
        creating an account or using the service, you agree to these Terms and our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <LegalSection title="1. Beta service">
        <p>
          posterboy is provided as a beta product. Features, pricing, uptime, and availability may
          change without notice. We may add, modify, or remove functionality as we learn from beta
          testers.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility &amp; accounts">
        <p>
          You must be at least 18 years old and authorized to act on behalf of the business you
          represent. You are responsible for safeguarding your login credentials and for all activity
          under your account.
        </p>
      </LegalSection>

      <LegalSection title="3. Connected social accounts">
        <p>
          You may only connect Facebook Pages and Instagram Business accounts you are authorized to
          manage. By connecting Meta accounts, you grant posterboy permission to publish and
          schedule content on your behalf when you use in-product publish or schedule actions.
        </p>
        <p>
          You remain responsible for complying with Meta&apos;s Platform Terms, Community Standards,
          and Instagram/Facebook policies. posterboy is not affiliated with Meta.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain ownership of content you upload or create (photos, captions, brand assets). You
          grant posterboy a limited license to host, process, transform, and transmit that content
          solely to operate the service — including uploading media to secure storage and sending
          public URLs to Meta for publishing.
        </p>
        <p>
          You agree not to post unlawful, infringing, deceptive, or harmful content. We may suspend
          access if we reasonably believe you are violating these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
          <li>Reverse engineer, scrape, or abuse our APIs</li>
          <li>Attempt to access another customer&apos;s workspace or tokens</li>
          <li>Use posterboy to send spam or misleading promotions</li>
          <li>Circumvent rate limits or security controls</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. AI-generated output">
        <p>
          Brand books, captions, and image prompts may be generated with AI. You are responsible for
          reviewing content before publishing. AI output may be inaccurate or inappropriate for your
          brand — treat suggestions as drafts, not final copy.
        </p>
      </LegalSection>

      <LegalSection title="7. Fees">
        <p>
          Closed beta access may be free or offered at promotional pricing. Paid plans, if offered,
          will be described separately before you are charged.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers &amp; limitation of liability">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, POSTERBOY IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR
          CONSEQUENTIAL DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL ARISING FROM YOUR USE OF THE
          SERVICE OR THIRD-PARTY PLATFORMS (INCLUDING META).
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          You may stop using posterboy at any time and delete your account in Settings. We may
          suspend or terminate access for violations of these Terms or to protect the service and
          other users.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
