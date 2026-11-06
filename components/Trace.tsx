import { axisTicks, splitRuns } from "@/lib/format";
import type { Metric } from "@/lib/types";

const W = 600;
const H = 100;

/** The last hour as a bare phosphor line. The number beside it is the reading; this is only its shape. */
export function Trace({ metrics }: { metrics: Metric[] }) {
  if (metrics.length < 2) return <span className="trace" aria-hidden="true" />;
  const start = Date.parse(metrics[0].ts);
  const span = Date.parse(metrics.at(-1)!.ts) - start || 1;
  const top = axisTicks(Math.max(...metrics.map((m) => m.watts))).at(-1)!;
  const x = (m: Metric) => ((Date.parse(m.ts) - start) / span) * W;
  const y = (m: Metric) => H - (m.watts / top) * (H - 4) - 2;

  return (
    <svg className="trace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {splitRuns(metrics).map((run) => {
        const line = run.points.map((m) => `${x(m)},${y(m)}`).join(" ");
        return (
          <g key={run.points[0].ts}>
            <polygon className="chart-area" points={`${x(run.points[0])},${H} ${line} ${x(run.points.at(-1)!)},${H}`} />
            <polyline className={run.estimated ? "chart-line chart-line-estimated" : "chart-line"} points={line} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}
