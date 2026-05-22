import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";

type Props = {
  /** Short line under logo on review screen */
  subtitle?: string;
  showSignIn?: boolean;
};

/**
 * posterboy-branded header for onboarding wizard, build, and review phases.
 */
export default function OnboardingHeader({
  subtitle,
  showSignIn = true,
}: Props) {
  return (
    <header className="flex items-center justify-between px-6 sm:px-10 py-5 shrink-0 border-b border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        <PosterboyLogo href="/" size="header" className="text-text shrink-0" />
        {subtitle ? (
          <div className="hidden sm:block border-l border-border pl-3 min-w-0">
            <p className="text-sm font-medium text-text truncate">{subtitle}</p>
          </div>
        ) : null}
      </div>
      {showSignIn ? (
        <div className="flex items-center gap-2 text-[13px] shrink-0">
          <span className="text-text-secondary hidden sm:inline">Already have an account?</span>
          <Link
            href="/sign-in?next=%2Fonboarding"
            className="font-medium text-text underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      ) : null}
    </header>
  );
}
