import Link from "next/link";
import CheckoutQueryToast from "@/components/billing/CheckoutQueryToast";
import PosterboyLogo from "@/components/PosterboyLogo";
import PricingCards from "@/components/PricingCards";
import { getPublicTiers, getPremiumTiers } from "@/lib/pricing";
import { CORE } from "@/lib/posterboy-copy";

export const metadata = {
  title: "Pricing",
  description:
    "Solo and Command — premium social publishing for operators and multi-location brands. BRC Custom for done-with-you brand systems.",
};

export default function PricingPage() {
  return (
    <div className="pb-marketing">
      <header className="pb-marketing-nav">
        <div className="pb-marketing-nav-inner">
          <PosterboyLogo href="/" size="header" className="pb-logo" />
          <nav className="pb-marketing-links">
            <Link href="/#product">Product</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in" className="pb-nav-sign-in">Sign in</Link>
          </nav>
        </div>
      </header>
      <main>
      <section className="pb-hero pb-reveal" style={{ paddingBottom: "2rem" }}>
        <h1 className="pb-hero-in">Pricing</h1>
        <p className="pb-hero-sub pb-hero-in">
          Two self-serve tiers for premium operators and multi-location brands. BRC Custom when you want the system built with you.
        </p>
      </section>

      <section className="pb-section pb-reveal">
        <p className="pb-pricing-tier-label">Self-serve</p>
        <h2 className="pb-display">Solo and Command</h2>
        <PricingCards tiers={getPublicTiers()} />
      </section>

      <section className="pb-section pb-reveal">
        <p className="pb-pricing-tier-label">Services</p>
        <h2 className="pb-display">When software is not quite enough</h2>
        <p style={{ maxWidth: "48ch", marginTop: "0.75rem" }}>
          BRC Custom for brand books, portals, and quarterly content through Bradly Robert Creative.
        </p>
        <PricingCards tiers={getPremiumTiers()} showTierLabel />
      </section>

      <section className="pb-section pb-section-narrow pb-reveal" style={{ textAlign: "center", paddingBottom: "5rem" }}>
        <h2>{CORE.weekDrafted}</h2>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/sign-in?mode=signup&next=%2Fonboarding%2Fclassic&plan=solo" className="pb-btn-primary" style={{ display: "inline-flex" }}>
            Try posterboy
          </Link>
        </p>
      </section>
      </main>
      <CheckoutQueryToast />
    </div>
  );
}
