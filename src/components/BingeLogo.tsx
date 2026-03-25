interface BingeLogoProps {
  size?: number;
  variant?: "full" | "icon";
  className?: string;
}

export default function BingeLogo({ size = 32, variant = "full", className }: BingeLogoProps) {
  if (variant === "icon") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Binge"
      >
        <rect width="40" height="40" rx="10" fill="#2563EB" />
        {/* Geometric B: spine + two D-shaped bumps */}
        <rect x="8" y="5" width="7" height="30" fill="white" />
        {/* Top bump */}
        <path d="M15 5H25A8 8 0 0 1 25 21H15V5Z" fill="white" />
        {/* Bottom bump — slightly wider */}
        <path d="M15 23H27A8 8 0 0 1 27 39H15V23Z" fill="white" />
      </svg>
    );
  }

  return (
    <svg
      width={size * 3.75}
      height={size}
      viewBox="0 0 150 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Binge"
    >
      {/* Icon badge */}
      <rect width="40" height="40" rx="10" fill="#2563EB" />
      <rect x="8" y="5" width="7" height="30" fill="white" />
      <path d="M15 5H25A8 8 0 0 1 25 21H15V5Z" fill="white" />
      <path d="M15 23H27A8 8 0 0 1 27 39H15V23Z" fill="white" />

      {/* Wordmark: "inge" — uses loaded Geist font via CSS variable */}
      <text
        x="52"
        y="31"
        fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="-1"
        fill="white"
      >
        inge
      </text>
    </svg>
  );
}
