"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PosterboyLogo from "@/components/PosterboyLogo";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingNav() {
  const pathname = usePathname();

  return (
    <header className="pb-marketing-nav">
      <div className="pb-marketing-nav-inner">
        <PosterboyLogo href="/" size="header" className="pb-logo" />
        <nav className="pb-marketing-links" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "pb-nav-active" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/sign-in" className="pb-nav-sign-in">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
