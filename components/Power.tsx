import { formatNumber } from "@/lib/format";

type Props = {
  value: number | null;
  estimated: boolean;
  unit?: "W" | "kWh" | "kWh/월";
  size?: "sm" | "md" | "xl";
};

/**
 * The only way a power number reaches the screen. The tag is the product rule; the solid or
 * dashed rule under the digits repeats it in a form that survives without colour.
 */
export function Power({ value, estimated, unit = "W", size = "sm" }: Props) {
  if (value === null) return <span className="no-reading">측정값 없음</span>;
  return (
    <span className={`power power-${size} ${estimated ? "is-estimated" : "is-measured"}`}>
      <span className="power-value">
        {formatNumber(value)}
        <span className="power-unit">{unit}</span>
      </span>
      <span className="power-tag">{estimated ? "추정" : "실측"}</span>
    </span>
  );
}
