import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { axisTicks, formatDateTime, formatNumber } from "@/lib/format";
import type { Metric } from "@/lib/types";

const ROWS = 16;
const LABEL = 6; // tick labels, right-aligned, then the axis character
const BLOCKS = "▁▂▃▄▅▆▇█";

const time = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" });

type Column = { watts: number; estimated: boolean } | null;

/**
 * Power over time in block characters: one column per time slice, measured slices in solid
 * eighth blocks, estimated ones in ░. The highest reading in a slice is the one drawn.
 */
export function PowerChart({ metrics, showDays, windowMs }: { metrics: Metric[]; showDays: boolean; windowMs: number }) {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [grid, setGrid] = useState({ cols: 60, ch: 8 });
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const ch = probe.current!.getBoundingClientRect().width / 10;
      setGrid({ ch, cols: Math.max(12, Math.floor(entry.contentRect.width / ch) - LABEL - 1) });
    });
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

  const { cols, ch } = grid;
  const last = metrics.length - 1;
  const index = picked === null ? last : Math.min(picked, last);
  const active = metrics[index];

  const times = metrics.map((m) => Date.parse(m.ts));
  // The axis always spans the whole range, so a new server's first points sit at the right edge.
  const start = Math.min(times[0], times[last] - windowMs);
  const span = times[last] - start || 1;
  const colOf = (ms: number) => Math.min(cols - 1, Math.floor(((ms - start) / span) * cols));
  const ticks = axisTicks(Math.max(...metrics.map((m) => m.watts)));
  const top = ticks.at(-1)!;

  const columns: Column[] = Array(cols).fill(null);
  metrics.forEach((m, i) => {
    const c = colOf(times[i]);
    const prev = columns[c];
    if (!prev || m.watts >= prev.watts) columns[c] = { watts: m.watts, estimated: m.isEstimated };
  });
  const peak = metrics.reduce((best, m) => (m.watts > best.watts ? m : best));
  const peakCol = colOf(Date.parse(peak.ts));
  const activeCol = picked === null ? -1 : colOf(times[index]);

  const tickAt = new Map(ticks.map((t) => [ROWS - Math.round((t / top) * ROWS), formatNumber(t)]));
  const lines: ReactNode[] = [];
  for (let row = 0; row < ROWS; row++) {
    const level = ROWS - 1 - row; // rows of value below this one
    const cells = columns.map((col, c) => {
      if (!col) return [" ", ""];
      const fill = Math.min(1, Math.max(0, (col.watts / top) * ROWS - level));
      if (fill <= 0) return [" ", c === activeCol ? "is-picked" : ""];
      const char = col.estimated ? "░" : BLOCKS[Math.max(0, Math.ceil(fill * 8) - 1)];
      return [char, `${col.estimated ? "is-estimated" : "is-measured"}${c === activeCol ? " is-picked" : ""}`];
    });
    lines.push(
      <div key={row}>
        <span className="chart-axis">{`${(tickAt.get(row) ?? "").padStart(LABEL)}${tickAt.has(row) ? "┤" : "│"}`}</span>
        {runs(cells)}
      </div>,
    );
  }
  const axis = [...Array(cols)].map((_, c) => (c === peakCol ? "▲" : "─")).join("");
  lines.push(
    <div key="axis" className="chart-axis">
      {`${"0".padStart(LABEL)}└${axis}`}
    </div>,
  );
  const labels = Array(cols).fill(" ");
  const timeTicks = (cols < 40 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((share) => start + span * share);
  timeTicks.forEach((tick, i) => {
    const text = (showDays ? day : time).format(tick);
    const at = Math.max(0, Math.min(cols - text.length, Math.round(colOf(tick) - (i / (timeTicks.length - 1)) * text.length)));
    [...text].forEach((char, k) => (labels[at + k] = char));
  });
  lines.push(
    <div key="time" className="chart-axis">
      {" ".repeat(LABEL + 1) + labels.join("")}
    </div>,
  );

  const onPointerMove = (event: PointerEvent<HTMLPreElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const target = start + ((event.clientX - left - (LABEL + 1) * ch) / (cols * ch)) * span;
    let nearest = 0;
    times.forEach((t, i) => {
      if (Math.abs(t - target) < Math.abs(times[nearest] - target)) nearest = i;
    });
    setPicked(nearest);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = Math.max(1, Math.round(metrics.length / cols));
    const next = { ArrowLeft: index - step, ArrowRight: index + step, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setPicked(Math.max(0, Math.min(last, next)));
  };

  const tag = active.isEstimated ? "추정" : "실측";
  return (
    <figure className="chart">
      <figcaption className="chart-head">
        {metrics.some((m) => !m.isEstimated) && <span className="is-measured">█ 실측</span>}
        {metrics.some((m) => m.isEstimated) && <span className="is-estimated">░ 추정</span>}
      </figcaption>
      <div ref={box} className="chart-box">
        <span ref={probe} className="chart-probe" aria-hidden="true">
          0000000000
        </span>
        <pre
          className="chart-grid"
          role="slider"
          tabIndex={0}
          aria-label="전력 그래프. 좌우 방향키로 시점을 고릅니다."
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={index}
          aria-valuetext={`${formatDateTime(active.ts)}, ${formatNumber(active.watts)}W, ${tag}`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setPicked(null)}
          onKeyDown={onKeyDown}
        >
          {lines}
        </pre>
      </div>
      <p className="chart-status" aria-hidden="true">
        <span className={active.isEstimated ? "is-estimated" : "is-measured"}>
          {formatNumber(active.watts)}W {tag}
        </span>
        {` · ${formatDateTime(active.ts)} · CPU ${formatNumber(active.cpuPct)}% · 메모리 ${formatNumber(active.memPct)}%`}
        <span className="chart-peak">▲ 최고 {formatNumber(peak.watts)}W</span>
      </p>
    </figure>
  );
}

/** Cells as [char, className] joined into one span per run of the same class. */
function runs(cells: string[][]) {
  const out: ReactNode[] = [];
  let text = "";
  let cls = "";
  const flush = () => {
    if (text) out.push(cls ? <span key={out.length} className={cls}>{text}</span> : text);
    text = "";
  };
  for (const [char, c] of cells) {
    if (c !== cls) {
      flush();
      cls = c;
    }
    text += char;
  }
  flush();
  return out;
}
