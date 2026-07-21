import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";
import { CONTACT_EMAIL } from "@/lib/site";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#teams", label: "For teams" },
  { href: "/pricing", label: "Pricing" },
] as const;

export default function MarketingSubpageChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-marketing">
      <header className="pb-marketing-nav">
        <div className="pb-marketing-nav-inner">
          <PosterboyLogo href="/" size="header" className="pb-logo" />
          <nav className="pb-marketing-links">
            {LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/sign-in" className="pb-nav-sign-in">
              Sign in
            </Link>
            <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary">
              Start free trial
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer
        className="pb-marketing-subfooter"
        style={{
          padding: "clamp(32px, 5vh, 56px) var(--px)",
          borderTop: "1px solid var(--newsprint)",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary">
          Start free trial
        </Link>
        <span className="type-caption" style={{ color: "var(--quiet-sage)" }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "inherit" }}>
            {CONTACT_EMAIL}
          </a>
          {" · "}
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
