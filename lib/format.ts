import type { Consultation, Metric, Recommendation, SavingsReport, Server, ServerLevel, ServerSummary, StreamEntry, ToolCall } from "./types";

const krw = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });
const decimal = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatKrw = (value: number) => krw.format(value);
export const formatNumber = (value: number) => decimal.format(value);
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const KIND_LABEL: Record<Server["kind"], string> = {
  baremetal: "베어메탈",
  home_pc: "집 PC",
  cloud_vm: "클라우드 VM",
};
export const RATE_PLAN_LABEL: Record<Server["ratePlan"], string> = {
  home_tiered: "가정용 누진 요금",
  cloud_hourly: "클라우드 시간당 요금",
};
export const SOURCE_LABEL: Record<Recommendation["source"], string> = { rule: "규칙", ai: "AI" };

export const SERVER_LEVELS: { value: ServerLevel; label: string }[] = [
  { value: "good", label: "양호" },
  { value: "fair", label: "보통" },
  { value: "warning", label: "주의" },
  { value: "critical", label: "심각" },
];

export const MODELS = [
  { value: "claude-sonnet-5-5", label: "Sonnet 5.5" },
  { value: "claude-opus-5-5", label: "Opus 5.5" },
  { value: "claude-fable-5-1", label: "Fable 5.1" },
  { value: "claude-haiku-5-5", label: "Haiku 5.5" },
];

export const CONSULTATION_STATUS: Record<Consultation["status"], string> = {
  requested: "요청됨",
  running: "진행 중",
  done: "완료",
  failed: "실패",
};
export const AUTH_MODE_LABEL: Record<Consultation["authMode"], string> = {
  subscription: "구독",
  api_key: "API 키",
};
export const TIER_LABEL: Record<ToolCall["tier"], string> = {
  auto: "자동 허용",
  approve: "조치",
  deny: "항상 금지",
};

const RECOMMENDATION_TYPE_LABEL: Record<string, string> = {
  idle: "유휴 상태",
  empty_game_server: "접속자 없는 게임 서버",
  oversized: "사양 과잉",
  night_stop: "야간 중지",
  runaway_process: "폭주 프로세스",
};
/** The AI may invent a type; its snake_case code means nothing to the reader. */
export const recommendationTypeLabel = (type: string) => RECOMMENDATION_TYPE_LABEL[type] ?? "기타 제안";

const RECOMMENDATION_PLAN: Record<string, string[]> = {
  idle: ["돌고 있는 서비스와 프로세스를 확인합니다.", "쓰지 않는 서비스를 찾아 멈춥니다."],
  empty_game_server: ["게임 서버 상태와 접속자 수를 확인합니다.", "접속자가 없을 때 멈추도록 설정을 바꿉니다."],
  oversized: ["실제 사용량과 서버 사양을 비교합니다.", "줄여도 되는 자원을 찾아 설정을 낮춥니다."],
  night_stop: ["새벽 시간대 사용 기록을 확인합니다.", "그 시간에 서비스를 멈추도록 예약합니다."],
  runaway_process: ["전력을 많이 쓰는 프로세스의 정체를 확인합니다.", "필요 없다면 종료하고, 필요하다면 사용량을 제한합니다."],
};

/** The AI writes the commands at run time, so this says what it will do, not how exactly. */
export const recommendationPlan = (type: string) => [
  ...(RECOMMENDATION_PLAN[type] ?? ["추천 내용을 지금 서버 상태와 대조합니다.", "필요한 조치를 실행합니다."]),
  "전력을 다시 재서 절약 효과를 확인합니다.",
];

/** A live reading decides first; powerSource covers servers with no reading yet. */
export const isServerEstimated = (server: Pick<ServerSummary, "isEstimated" | "powerSource">) =>
  server.isEstimated ?? server.powerSource === "estimated";

/**
 * SavingsReport items carry only serverName, so the source is looked up by name.
 * Anything that cannot be proven measured (deleted server, duplicate name) reads 추정.
 */
export function reportItemEstimated(item: SavingsReport["items"][number], servers: Pick<Server, "name" | "powerSource">[]) {
  const matches = servers.filter((server) => server.name === item.serverName);
  return matches.length === 0 || matches.some((server) => server.powerSource === "estimated");
}

export function appendMetric(metrics: Metric[], metric: Metric, windowMs: number) {
  const latest = metrics.at(-1);
  if (latest && Date.parse(latest.ts) >= Date.parse(metric.ts)) return metrics;
  const cutoff = Date.parse(metric.ts) - windowMs;
  return [...metrics.filter((m) => Date.parse(m.ts) >= cutoff), metric];
}

export function upsertById<T extends { id: number }>(items: T[], item: T) {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];
}

/** A live entry can race the page's first fetch, which may already hold it. */
export function appendStream(entries: StreamEntry[], entry: StreamEntry) {
  return entries.some((existing) => existing.seq === entry.seq) ? entries : [...entries, entry];
}

export function outcome(call: Pick<ToolCall, "decision" | "exitCode">) {
  if (call.decision === "denied") return "거부됨";
  if (call.decision === "blocked") return "차단됨";
  if (call.decision === "pending") return "허용 대기";
  const decided = call.decision === "approved" ? "허용됨" : "자동 실행";
  if (call.exitCode === null) return `${decided}, 실행 중`;
  return `${decided}, 종료 코드 ${call.exitCode}`;
}

export type UndoState = "unavailable" | "ready" | "running" | "done" | "failed";

/** An action can be undone when it ran successfully, recorded an undo command, and has no live undo. */
export function undoState(call: ToolCall, calls: ToolCall[]): UndoState {
  if (call.undoOf !== null || call.undoCommand === null || call.exitCode !== 0) return "unavailable";
  if (call.decision !== "approved" && call.decision !== "auto") return "unavailable";
  const attempts = calls.filter((other) => other.undoOf === call.id);
  const last = attempts.at(-1);
  if (!last) return "ready";
  if (last.exitCode === null) return "running";
  return last.exitCode === 0 ? "done" : "failed";
}

/**
 * Consecutive points sharing a provenance form one run, so the chart can draw 실측 and 추정
 * differently. A silence longer than five normal intervals breaks the line: an outage must
 * not look like a steady reading.
 */
export function splitRuns(metrics: Metric[]): { estimated: boolean; points: Metric[] }[] {
  const times = metrics.map((m) => Date.parse(m.ts));
  const steps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
  const maxGap = (steps[Math.floor(steps.length / 2)] ?? 0) * 5;

  const runs: { estimated: boolean; points: Metric[] }[] = [];
  metrics.forEach((metric, i) => {
    const run = runs.at(-1);
    const gap = i > 0 ? times[i] - times[i - 1] : 0;
    if (!run || gap > maxGap) {
      runs.push({ estimated: metric.isEstimated, points: [metric] });
    } else if (run.estimated !== metric.isEstimated) {
      // Share the boundary point so the line stays continuous across the change.
      runs.push({ estimated: metric.isEstimated, points: [metrics[i - 1], metric] });
    } else {
      run.points.push(metric);
    }
  });
  return runs;
}

/** Round axis maximum and its ticks, with zero as the baseline. */
export function axisTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((n) => n * magnitude).find((n) => n >= rough)!;
  const ticks = [0];
  while (ticks.at(-1)! < max) ticks.push(ticks.length * step);
  return ticks;
}
