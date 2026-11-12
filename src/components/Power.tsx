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
  const [whole, fraction] = text.split(".");
  const tag = estimated ? "추정" : "실측";
  return (
    <span className={`power power-${size} ${estimated ? "is-estimated" : "is-measured"}`}>
      {/* Per-digit spans make screen readers spell the number out, so they get it whole. */}
      <span className="sr-only">{`${text}${unit} ${tag}`}</span>
      <span className="power-value" aria-hidden="true">
        <Digits text={whole} rolling={size !== "sm"} />
        {fraction && "."}
        {fraction && <Digits text={fraction} rolling={size !== "sm"} />}
        <span className="power-unit">{unit}</span>
      </span>
      <span className="power-tag" aria-hidden="true">
        {tag}
      </span>
    </span>
  );
}

/** A digit remounts when it changes, so only the wheels that moved turn, like a meter's register. */
function Digits({ text, rolling }: { text: string; rolling: boolean }) {
  if (!rolling) return text;
  return [...text].map((digit, index) => (
    <span key={`${text.length - index}-${digit}`} className="digit">
      {digit}
    </span>
  ));
}

/** A won amount at display size. */
export function Krw({ value }: { value: number }) {
  return (
    <span className="figure">
      <span className="sr-only">{formatKrw(value)}</span>
      <span aria-hidden="true">
        <Digits text={formatKrw(value)} rolling />
      </span>
    </span>
  );
}
