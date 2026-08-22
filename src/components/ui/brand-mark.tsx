/**
 * The TaskEngine mark: three squares cascading diagonally, largest to smallest —
 * work handed down the chain, level by level. Renders in `currentColor` so it
 * drops into the existing `bg-accent text-white` logo treatment used across the
 * app (sidebar, login, invite/reset pages) exactly like the Lucide icon it replaces.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.3" y="2.3" width="8.6" height="8.6" rx="2.3" fill="currentColor" />
      <rect x="11.6" y="8.9" width="6.1" height="6.1" rx="1.7" fill="currentColor" opacity="0.85" />
      <rect x="17.4" y="15.4" width="4.2" height="4.2" rx="1.15" fill="currentColor" opacity="0.65" />
    </svg>
  );
}
