import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";
import PricingCards from "@/components/PricingCards";
import { getPublicTiers, getPremiumTiers } from "@/lib/pricing";
import { CORE } from "@/lib/posterboy-copy";

export const metadata = {
  title: "Pricing | posterboy",
  description: "Good, Better, Best — and Teams, House Account, BRC Custom for businesses that want more.",
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
          Low-friction plans for businesses that need to show up. Premium tiers for businesses that want the week handled.
        </p>
      </section>

      <section className="pb-section pb-reveal">
        <p className="pb-pricing-tier-label">Public plans</p>
        <h2 className="pb-display">Enough to get started</h2>
        <PricingCards tiers={getPublicTiers()} />
      </section>

      <section className="pb-section pb-reveal">
        <p className="pb-pricing-tier-label">Premium</p>
        <h2 className="pb-display">When software is not quite enough</h2>
        <p style={{ maxWidth: "48ch", marginTop: "0.75rem" }}>
          Higher ARPU, fewer dashboards. Teams, House Account, and BRC Custom for businesses that want help, not homework.
        </p>
        <PricingCards tiers={getPremiumTiers()} showTierLabel />
      </section>

      <section className="pb-section pb-section-narrow pb-reveal" style={{ textAlign: "center", paddingBottom: "5rem" }}>
        <h2>{CORE.weekDrafted}</h2>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/sign-in" className="pb-btn-primary" style={{ display: "inline-flex" }}>
            Try posterboy
          </Link>
        </p>
      </section>
      </main>
    </div>
  );
}
