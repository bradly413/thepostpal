import LegalDocument, { LegalSection } from "@/components/marketing/LegalDocument";
import { CONTACT_EMAIL } from "@/lib/site";

/* Data Deletion Instructions — required by Meta app review as a public URL
   (Meta accepts either a deletion callback or an instructions page; this is
   the instructions page). Everything stated here must match what the product
   actually does: self-serve deletion lives in Settings → Account. */

export const metadata = {
  title: "Data Deletion",
  description:
    "How to delete your posterboy account and data, including data connected through Facebook and Instagram.",
  alternates: { canonical: "/data-deletion" },
};

export default function DataDeletionPage() {
  return (
    <LegalDocument title="Data Deletion Instructions" updated="July 21, 2026">
      <LegalSection title="Delete your account and data yourself">
        <p>
          Sign in, then go to Settings → Account → Danger zone and confirm deletion. This
          permanently removes your organization, users, posts, media library, brand profiles, and
          any connected social account tokens. Deletion is immediate and cannot be undone.
        </p>
      </LegalSection>
      <LegalSection title="Disconnect Facebook or Instagram only">
        <p>
          To remove posterboy&apos;s access without deleting your account, disconnect the account
          in Settings, or remove the posterboy app from your Facebook or Instagram settings under
          Business Integrations. Disconnecting invalidates our stored access tokens; we no longer
          have access to publish or read from those accounts.
        </p>
      </LegalSection>
      <LegalSection title="Request deletion by email">
        <p>
          If you cannot sign in, email {CONTACT_EMAIL} from the address on your account with the
          subject &quot;Data deletion request&quot;. We verify the request and complete the
          deletion, then confirm by reply. Requests are handled within 30 days, and usually much
          faster.
        </p>
      </LegalSection>
      <LegalSection title="What we retain">
        <p>
          After deletion we retain only what the law requires or what exists in routine encrypted
          backups, which expire on a rolling schedule. See the Privacy Policy for details on what
          we collect while your account is active.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
