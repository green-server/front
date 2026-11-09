// Same shapes as public/green-server-mark.svg.
const LEAF = "M168 450c-5-66 27-100 102-100h136c45 0 58-7 78-42 68-121 111-136 228-150 47-6 86-19 121-31-1 178-85 306-320 306 53-85 114-152 198-190-105 33-151 83-192 142-25 39-58 49-112 49H299c-14 0-25 6-30 16Z";
const RACKS = "M220 450h444a52 52 0 0 1 52 52v30a52 52 0 0 1-52 52H220a52 52 0 0 1-52-52v-30a52 52 0 0 1 52-52Zm54 52a14 14 0 0 0 0 28h132a14 14 0 0 0 0-28Zm350-5a19 19 0 1 0 0 38 19 19 0 0 0 0-38ZM220 598h444a52 52 0 0 1 52 52v30a52 52 0 0 1-52 52H220a52 52 0 0 1-52-52v-30a52 52 0 0 1 52-52Zm54 52a14 14 0 0 0 0 28h132a14 14 0 0 0 0-28Zm350-5a19 19 0 1 0 0 38 19 19 0 0 0 0-38ZM220 746h444a52 52 0 0 1 52 52v30a52 52 0 0 1-52 52H220a52 52 0 0 1-52-52v-30a52 52 0 0 1 52-52Zm54 52a14 14 0 0 0 0 28h132a14 14 0 0 0 0-28Zm350-5a19 19 0 1 0 0 38 19 19 0 0 0 0-38Z";

/** The mark alone, filled with `--logo-mark` so each surface picks its color. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="167 127 666 753" fill="var(--logo-mark, currentcolor)" role="img" aria-label="Green Server">
      <path d={LEAF} />
      <path fillRule="evenodd" d={RACKS} />
    </svg>
  );
}
