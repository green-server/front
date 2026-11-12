import { formatKrw, formatNumber } from "@/lib/format";

type Props = {
  value: number | null;
  estimated: boolean;
  unit?: "W" | "kWh" | "kWh/월";
  size?: "sm" | "xl";
};

/**
 * The only way a power number reaches the screen. The tag is the product rule; the solid or
 * dashed rule under the digits repeats it in a form that survives without colour.
 */
export function Power({ value, estimated, unit = "W", size = "sm" }: Props) {
  if (value === null) return <span className="no-reading">측정값 없음</span>;
  const text = formatNumber(value);
  const tag = estimated ? "추정" : "실측";
  return (
    <span className={`power power-${size} ${estimated ? "is-estimated" : "is-measured"}`}>
      {/* Read whole, with the tag, instead of value then tag as separate pieces. */}
      <span className="sr-only">{`${text}${unit} ${tag}`}</span>
      <span className="power-value" aria-hidden="true">
        {text}
        {unit}
      </span>
      <span className="power-tag" aria-hidden="true">
        {tag}
      </span>
    </span>
  );
}

/** A won amount at display size. */
export function Krw({ value }: { value: number }) {
  return <span className="figure">{formatKrw(value)}</span>;
}
