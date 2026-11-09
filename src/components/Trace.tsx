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
  const runs = splitRuns(metrics);
  const lastRun = runs.at(-1)!;
  const latest = metrics.at(-1)!;

  return (
    <span className="trace" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {runs.map((run) => {
          const line = run.points.map((m) => `${x(m)},${y(m)}`).join(" ");
          return (
            <g key={run.points[0].ts}>
              <polygon className="chart-area" points={`${x(run.points[0])},${H} ${line} ${x(run.points.at(-1)!)},${H}`} />
              <polyline className={run.estimated ? "chart-line chart-line-estimated" : "chart-line"} points={line} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      {/* Keyed by sample: each reading sends one pulse down the line and lights the tip. */}
      <svg key={latest.ts} className="trace-current" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline points={lastRun.points.map((m) => `${x(m)},${y(m)}`).join(" ")} vectorEffect="non-scaling-stroke" />
      </svg>
      <i key={`tip-${latest.ts}`} className="trace-tip" style={{ bottom: `${100 - y(latest)}%` }} />
    </span>
  );
}
