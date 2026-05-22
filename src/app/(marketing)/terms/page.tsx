import Link from "next/link";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Terms | posterboy",
  description: "Terms of use for posterboy beta.",
};

export default function TermsPage() {
  return (
    <MarketingSubpageChrome>
      <section className="pb-section" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="pb-display">Terms of use</h1>
        <p className="type-body" style={{ marginTop: "1.5em" }}>
          By using posterboy during beta, you agree to use the product for lawful
          business purposes and to connect only social accounts you are authorized
          to manage.
        </p>
        <p className="type-body">
          Features, pricing, and availability may change during beta. Contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with questions.
        </p>
        <p className="type-caption" style={{ marginTop: "2em" }}>
          <Link href="/">Back to home</Link>
        </p>
      </section>
    </MarketingSubpageChrome>
  );
}
