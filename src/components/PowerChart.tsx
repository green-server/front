import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { axisTicks, formatDateTime, formatNumber, splitRuns } from "@/lib/format";
import type { Metric } from "@/lib/types";

const MARGIN = { top: 12, right: 12, bottom: 26, left: 46 };

const time = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" });

export function PowerChart({ metrics, showDays, windowMs }: { metrics: Metric[]; showDays: boolean; windowMs: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

  const HEIGHT = Math.round(Math.min(460, Math.max(260, width * 0.44)));
  const last = metrics.length - 1;
  const index = picked === null ? last : Math.min(picked, last);
  const active = metrics[index];

  const times = metrics.map((m) => Date.parse(m.ts));
  // The axis always spans the whole range, so a new server's first points sit at the right edge
  // instead of five ticks that all read the same minute.
  const start = Math.min(times[0], times[last] - windowMs);
  const span = times[last] - start || 1;
  const ticks = axisTicks(Math.max(...metrics.map((m) => m.watts)));
  const top = ticks.at(-1)!;

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (ms: number) => MARGIN.left + ((ms - start) / span) * plotWidth;
  const y = (watts: number) => MARGIN.top + plotHeight - (watts / top) * plotHeight;

  const peak = metrics.reduce((best, m) => (m.watts > best.watts ? m : best));
  const peakX = x(Date.parse(peak.ts));
  const runs = splitRuns(metrics);
  const timeTicks = (width < 480 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((share) => start + span * share);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const target = start + ((event.clientX - left - MARGIN.left) / plotWidth) * span;
    let nearest = 0;
    times.forEach((t, i) => {
      if (Math.abs(t - target) < Math.abs(times[nearest] - target)) nearest = i;
    });
    setPicked(nearest);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = Math.max(1, Math.round(metrics.length / 60));
    const next = { ArrowLeft: index - step, ArrowRight: index + step, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setPicked(Math.max(0, Math.min(last, next)));
  };

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-legend">
          {runs.some((run) => !run.estimated) && <LegendEntry label="실측" />}
          {runs.some((run) => run.estimated) && <LegendEntry label="추정" dashed />}
        </span>
      </figcaption>
      <div ref={box} className="chart-box">
        {picked !== null && (
          <div
            className="chart-tip"
            aria-hidden="true"
            style={x(times[index]) > width / 2 ? { right: width - x(times[index]) + 12 } : { left: x(times[index]) + 12 }}
          >
            <strong>
              {formatNumber(active.watts)}W <span>{active.isEstimated ? "추정" : "실측"}</span>
            </strong>
            <span>{formatDateTime(active.ts)}</span>
            <span>
              CPU {formatNumber(active.cpuPct)}% · 메모리 {formatNumber(active.memPct)}%
            </span>
          </div>
        )}
        <svg
          width={width}
          height={HEIGHT}
          role="slider"
          tabIndex={0}
          aria-label="전력 그래프. 좌우 방향키로 시점을 고릅니다."
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={index}
          aria-valuetext={`${formatDateTime(active.ts)}, ${formatNumber(active.watts)}W, ${active.isEstimated ? "추정" : "실측"}`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setPicked(null)}
          onKeyDown={onKeyDown}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text className="chart-label" x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end">
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {timeTicks.map((tick, i) => (
            <text
              key={tick}
              className="chart-label"
              x={x(tick)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === timeTicks.length - 1 ? "end" : "middle"}
            >
              {(showDays ? day : time).format(tick)}
            </text>
          ))}
          {runs.map((run) =>
            run.points.length === 1 ? (
              <circle key={run.points[0].ts} className="chart-point" r={3} cx={x(Date.parse(run.points[0].ts))} cy={y(run.points[0].watts)} />
            ) : (
              <g key={run.points[0].ts}>
                <polyline
                  className={run.estimated ? "chart-line chart-line-estimated" : "chart-line"}
                  points={run.points.map((m) => `${x(Date.parse(m.ts))},${y(m.watts)}`).join(" ")}
                />
              </g>
            ),
          )}
          <text
            className="chart-peak"
            x={Math.max(MARGIN.left + 4, Math.min(peakX, width - MARGIN.right - 4))}
            y={Math.max(y(peak.watts) - 8, 12)}
            textAnchor={peakX > width * 0.8 ? "end" : peakX < width * 0.2 ? "start" : "middle"}
          >
            최고 {formatNumber(peak.watts)}W
          </text>
          {picked !== null && <line className="chart-cursor" x1={x(times[index])} x2={x(times[index])} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />}
          <circle className="chart-marker" r={4} cx={x(times[index])} cy={y(active.watts)} />
        </svg>
      </div>
    </figure>
  );
}

function LegendEntry({ label, dashed }: { label: string; dashed?: boolean }) {
  return (
    <span>
      <svg width="24" height="8" aria-hidden="true">
        <line className={dashed ? "chart-line chart-line-estimated" : "chart-line"} x1="0" x2="24" y1="4" y2="4" />
      </svg>
      {label}
    </span>
  );
}
