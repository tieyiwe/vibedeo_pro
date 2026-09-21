/** Minimal inline icon set — keeps the bundle free of an icon dependency. */

type Props = { className?: string };

const base = "h-[18px] w-[18px]";

export function SparkIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill="currentColor" />
    </svg>
  );
}

export function GridIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function UsersIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 010 5.8M17.5 14.8c2 .6 3.3 2.3 3.3 4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BoltIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M13.5 2.5L4.8 13.2c-.4.5 0 1.3.7 1.3H10l-.6 7 8.8-10.7c.4-.5 0-1.3-.7-1.3h-4.5l.5-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DownloadIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3.5v11m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v1.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LinkIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M10 13.8a4 4 0 006 .5l2.5-2.6a4 4 0 00-5.7-5.6L11.5 7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 10.2a4 4 0 00-6-.5L5.5 12.3a4 4 0 005.7 5.6l1.3-1.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0114.5 5v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 6.5l.8 12a2 2 0 002 1.9h5.4a2 2 0 002-1.9l.8-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ImageIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 17l4.6-4.3a2 2 0 012.8.1L20 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CreditIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M9.2 10.2c0-1.2 1.2-2 2.8-2s2.8.6 2.8 1.8c0 2.6-5.6 1.2-5.6 3.9 0 1.2 1.3 1.9 2.9 1.9s2.8-.8 2.8-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SpinnerIcon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
