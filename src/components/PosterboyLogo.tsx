import Link from "next/link";

type Props = {
  href?: string | null;
  className?: string;
  size?: "nav" | "header" | "footer";
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

const SIZE_CLASS = {
  nav: "pb-brand-logo--nav",
  header: "pb-brand-logo--header",
  footer: "pb-brand-logo--footer",
} as const;

/**
 * Canonical wordmark — lowercase posterboy, Instrument Serif (brand guidelines).
 */
export default function PosterboyLogo({
  href = "/",
  className = "",
  size = "nav",
  onClick,
}: Props) {
  const wordmark = (
    <span className={`pb-brand-logo ${SIZE_CLASS[size]} ${className}`.trim()}>
      poster<em className="pb-brand-logo-boy">boy</em><span className="pb-brand-logo-tm">™</span>
    </span>
  );

  if (href == null) {
    return wordmark;
  }

  if (onClick) {
    return (
      <a href={href} onClick={onClick} className="pb-brand-logo-link">
        {wordmark}
      </a>
    );
  }

  return (
    <Link href={href} className="pb-brand-logo-link">
      {wordmark}
    </Link>
  );
}
