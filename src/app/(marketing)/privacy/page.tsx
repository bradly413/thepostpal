import Link from "next/link";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Privacy | posterboy",
  description: "How posterboy handles your data during beta.",
};

export default function PrivacyPage() {
  return (
    <MarketingSubpageChrome>
      <section className="pb-section" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="pb-display">Privacy</h1>
        <p className="type-body" style={{ marginTop: "1.5em" }}>
          posterboy is in beta. Account and brand data are stored in your browser
          and on our servers only where you explicitly sign up. We do not sell your
          data.
        </p>
        <p className="type-body">
          Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p className="type-caption" style={{ marginTop: "2em" }}>
          <Link href="/">Back to home</Link>
        </p>
      </section>
    </MarketingSubpageChrome>
  );
}
