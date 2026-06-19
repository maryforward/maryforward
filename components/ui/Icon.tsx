import type { ReactNode } from "react";

/**
 * Gentle, calm line icons — thin strokes, rounded caps. Inherit `currentColor`
 * so callers can tint them (teal for structure, coral for warmth). Safe to use
 * inside React Server Components.
 */
export type IconName =
  | "quote"
  | "compass"
  | "trials"
  | "dna"
  | "shield"
  | "alert"
  | "review"
  | "share"
  | "heart"
  | "check"
  | "arrow"
  | "book"
  | "lock"
  | "calendar"
  | "video"
  | "chat"
  | "map"
  | "info"
  | "bolt"
  | "scale"
  | "microscope"
  | "report"
  | "gear"
  | "gift"
  | "pulse"
  | "grid"
  | "leaf";

const paths: Record<IconName, ReactNode> = {
  quote: (
    <>
      <path d="M7 7h4v6c0 2-1.5 3.5-4 4" />
      <path d="M15 7h4v6c0 2-1.5 3.5-4 4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
    </>
  ),
  trials: (
    <>
      <path d="M9 3v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9.5V3" />
      <path d="M8 3h8M8.5 14h7" />
    </>
  ),
  dna: (
    <>
      <path d="M7 3c0 5 10 7 10 12M17 3c0 5-10 7-10 12M7 21c0-1 10-3 10-6M17 21c0-1-10-3-10-6" />
      <path d="M8.5 6h7M8.5 18h7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z" />
      <path d="m9.5 12 2 2 3.5-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 3 19h18z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  review: (
    <>
      <path d="M4 5h16v11H8l-4 3z" />
      <path d="m9 10 2 2 4-4" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.6 12 20 12 20z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
      <path d="M18 6H8M8 10h7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="m15 10 6-3v10l-6-3z" />
    </>
  ),
  chat: (
    <>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z" />
      <path d="M8.5 10h7M8.5 12.5h4" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s6-5.4 6-10a6 6 0 0 0-12 0c0 4.6 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.5" />
    </>
  ),
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M5 8h14M5 8l-2.5 5a3 3 0 0 0 5 0zM19 8l-2.5 5a3 3 0 0 0 5 0z" />
      <path d="M12 4 6 6M12 4l6 2" />
    </>
  ),
  microscope: (
    <>
      <path d="M6 20h12M9 17a6 6 0 0 0 9-5" />
      <path d="M11 4h2l1 8h-4z" />
      <path d="M12 4 11 3M8 17h4" />
    </>
  ),
  report: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M4 13h16M12 9v11M12 9C9 9 7.5 4 12 6c4.5-2 3 5 0 3z" />
    </>
  ),
  pulse: <path d="M3 12h4l2.5-6 4 13 2.5-7H21" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 6-13 14-14 0 8-5 14-13 14a6 6 0 0 1-1 0z" />
      <path d="M8 16c2.5-3 5-5 8-6" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/** Soft coral dot used before a calm kicker/badge. */
export function KickerDot() {
  return <span className="me-2 inline-block h-2 w-2 rounded-full bg-[#D96C5F]" aria-hidden="true" />;
}

/** A list with gentle teal line-icon markers instead of bullets. */
export function IconList({
  items,
  icon = "check",
  className = "",
}: {
  items: ReactNode[];
  icon?: IconName;
  className?: string;
}) {
  return (
    <ul className={`mt-3 space-y-2.5 text-sm text-slate-300 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-[#0F766E]">
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A card heading with a leading teal line icon. */
export function CardHeading({
  icon,
  children,
  className = "text-lg font-semibold",
}: {
  icon: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`flex items-center gap-2.5 ${className}`}>
      <span className="shrink-0 text-[#0F766E]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span>{children}</span>
    </h3>
  );
}
