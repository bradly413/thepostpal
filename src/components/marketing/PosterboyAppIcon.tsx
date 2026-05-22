"use client";

type PosterboyAppIconProps = {
  size?: number;
  className?: string;
};

/** Red paper-plane send icon (inline SVG for animation control). */
export default function PosterboyAppIcon({ size, className }: PosterboyAppIconProps) {
  return (
    <svg
      width={size ?? "100%"}
      height={size ?? "100%"}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="posterboy"
      role="img"
      style={{ display: "block" }}
    >
      {/* Outer plane shape: tip → left wing → fold → bottom tail → close */}
      <path
        d="M810 75L65 435L395 540L480 935L810 75Z"
        stroke="#EC2016"
        strokeWidth="44"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Fold crease: fold point → tip */}
      <path
        d="M395 540L810 75"
        stroke="#EC2016"
        strokeWidth="44"
        strokeLinecap="round"
      />
      {/* Fold crease: fold point → bottom tail */}
      <path
        d="M395 540L480 935"
        stroke="#EC2016"
        strokeWidth="44"
        strokeLinecap="round"
      />
    </svg>
  );
}
