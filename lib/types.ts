// Copied from plan/docs/api.md. That document is the source of truth.

export type User = { id: number; email: string; name: string; createdAt: string };
export type ServerInput = {
  name: string;
  kind: "baremetal" | "home_pc" | "cloud_vm";
  ratePlan: "home_tiered" | "cloud_hourly";
  hourlyKrw?: number | null;
  householdKwh?: number;
};
export type Server = ServerInput & {
  id: number;
  powerSource: "measured" | "estimated";
  lastSeenAt: string | null;
  createdAt: string;
};
export type ServerSummary = Server & {
  online: boolean;
  latestWatts: number | null;
  isEstimated: boolean | null;
  monthlyKwh: number;
  monthlyKrw: number;
};
export type Metric = { ts: string; cpuPct: number; memPct: number; watts: number; isEstimated: boolean };
export type ProcessSample = { ts: string; pid: number; name: string; cpuPct: number; watts: number };
export type Recommendation = {
  id: number;
  serverId: number;
  consultationId: number | null;
  source: "rule" | "ai";
  type: "idle" | "empty_game_server" | "oversized" | "night_stop" | "runaway_process" | string;
  detail: string;
  estSavingKrw: number;
  status: "open" | "applied" | "dismissed";
  createdAt: string;
  appliedAt: string | null;
};
export type Consultation = {
  id: number;
  serverId: number;
  requestedAt: string;
  authMode: "subscription" | "api_key";
  model: string;
  status: "requested" | "running" | "done" | "failed";
  summary: string | null;
  level: ServerLevel | null;
  feedback: string[];
  fixes: string[];
};
export type ServerLevel = "good" | "fair" | "warning" | "critical";
export type ToolCall = {
  id: number;
  consultationId: number;
  recommendationId: number | null;
  command: string;
  tier: "auto" | "approve" | "deny";
  decision: "auto" | "pending" | "approved" | "denied" | "blocked";
  approvedAt: string | null;
  exitCode: number | null;
  undoCommand: string | null;
  undoOf: number | null;
};
export type SavingsReport = {
  items: {
    recommendationId: number;
    serverName: string;
    source: "rule" | "ai";
    type: string;
    appliedAt: string;
    beforeWatts: number;
    afterWatts: number;
    savedKwhMonth: number;
    savedKrwMonth: number;
  }[];
  bySource: { source: "rule" | "ai"; total: number; applied: number; savedKrwMonth: number }[];
};

export type ApiErrorBody = { error: { code: string; message: string } };

export type WebEvent =
  | { type: "metric"; serverId: number; metric: Metric }
  | { type: "agent_status"; serverId: number; online: boolean }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "consultation"; consultation: Consultation };
