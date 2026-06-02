import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";
import { CORE } from "@/lib/posterboy-copy";

export default function MarketingFooter() {
  return (
    <footer className="pb-footer">
      <div className="pb-footer-inner">
        <div>
          <PosterboyLogo href="/" size="footer" className="pb-footer-logo" />
          <p className="pb-footer-tagline">{CORE.altTagline}</p>
        </div>
        <div className="pb-footer-columns">
          <div>
            <p className="pb-footer-heading">Product</p>
            <Link href="/#product">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/tools/what-to-post">What should I post?</Link>
          </div>
          <div>
            <p className="pb-footer-heading">Industries</p>
            <Link href="/for/realtors">Brokers</Link>
            <Link href="/for/restaurants">Restaurants</Link>
            <Link href="/for/multi-location">Multi-location</Link>
          </div>
          <div>
            <p className="pb-footer-heading">Plans</p>
            <Link href="/pricing#solo">Solo</Link>
            <Link href="/pricing#command">Command</Link>
            <Link href="/pricing#brc-custom">BRC Custom</Link>
          </div>
        </div>
      </div>
      <p className="pb-footer-legal">
        posterboy™ — {CORE.magazine}
      </p>
    </footer>
  );
}
