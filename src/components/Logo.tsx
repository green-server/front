// A slim leaf with one curved vein; the same shape as app/icon.svg.
const LEAF = "M7 0C10 7 12 11 12 17C12 24 8 29 4 32C7 24 8 18 7 10C6.5 19 4.5 25 2.5 29.5C1 26 0 22 0 18C0 10 3 4 7 0Z";

/** The mark alone, filled with `--logo-mark` so each surface picks its color. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 32" fill="var(--logo-mark, currentcolor)" role="img" aria-label="Green Server">
      <path d={LEAF} />
    </svg>
  );
}
