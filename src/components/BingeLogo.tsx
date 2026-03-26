interface BingeLogoProps {
  size?: number;
  variant?: "full" | "icon";
  className?: string;
}

export default function BingeLogo({ size = 32, variant = "full", className }: BingeLogoProps) {
  // App icon: blue rounded square with geometric "b" mark
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
        {/* Geometric lowercase b: vertical stem + circle bowl */}
        <rect x="11" y="8" width="5" height="24" rx="2.5" fill="white" />
        <circle cx="22" cy="23" r="9" stroke="white" strokeWidth="5" fill="none" />
      </svg>
    );
  }

  // Full: icon + "binge" wordmark
  const h = size;
  const w = size * 3.6;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 144 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Binge"
    >
      {/* Icon */}
      <rect width="40" height="40" rx="10" fill="#2563EB" />
      <rect x="11" y="8" width="5" height="24" rx="2.5" fill="white" />
      <circle cx="22" cy="23" r="9" stroke="white" strokeWidth="5" fill="none" />

      {/* Wordmark: "inge" — the icon IS the "b" */}
      <text
        x="52"
        y="30"
        fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fontSize="24"
        letterSpacing="-0.5"
        fill="white"
      >
        inge
      </text>
    </svg>
  );
}
