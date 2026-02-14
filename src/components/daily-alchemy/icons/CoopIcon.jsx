/**
 * CoopIcon - Two people connected icon for co-op mode.
 * Accepts className for sizing/color (like Lucide icons).
 */
export function CoopIcon({ className = 'w-5 h-5', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Left person */}
      <circle cx="7" cy="6" r="2.5" />
      <path d="M3.5 14.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />

      {/* Right person */}
      <circle cx="17" cy="13" r="2.5" />
      <path d="M13.5 21.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />

      {/* Connector curves */}
      <path d="M14 4.5a4 4 0 0 1 3.5 3.5" />
      <path d="M10 19.5a4 4 0 0 1-3.5-3.5" />
    </svg>
  );
}

export default CoopIcon;
