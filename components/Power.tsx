import { formatKrw, formatNumber } from "@/lib/format";

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
  const [whole, fraction] = formatNumber(value).split(".");
  return (
    <span className={`power power-${size} ${estimated ? "is-estimated" : "is-measured"}`}>
      <span className="power-value">
        <Digits text={whole} rolling={size !== "sm"} />
        {/* Doto's period reads as a plus sign at display sizes: 160+8 is a wrong number. */}
        {fraction && <span className="power-point">.</span>}
        {fraction && <Digits text={fraction} rolling={size !== "sm"} />}
        <span className="power-unit">{unit}</span>
      </span>
      <span className="power-tag">{estimated ? "추정" : "실측"}</span>
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

/** A won amount at display size. Doto's own ₩ is oversized, so that one glyph is set apart. */
export function Krw({ value }: { value: number }) {
  return (
    <span className="figure figure-dot">
      <span className="dot-won">₩</span>
      <Digits text={formatKrw(value).replace("₩", "")} rolling />
    </span>
  );
}
