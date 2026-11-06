import assert from "node:assert/strict";
import { test } from "node:test";
import { appendStream, recommendationPlan, appendMetric, axisTicks, formatKrw, isServerEstimated, reportItemEstimated, splitRuns, undoState } from "./format.ts";
import type { Metric, SavingsReport, ToolCall } from "./types.ts";

const metric = (seconds: number, isEstimated = false): Metric => ({
  ts: new Date(seconds * 1000).toISOString(),
  cpuPct: 0,
  memPct: 0,
  watts: 100,
  isEstimated,
});
const call = (over: Partial<ToolCall>): ToolCall => ({
  id: 1,
  consultationId: 1,
  recommendationId: null,
  command: "systemctl stop x",
  tier: "approve",
  decision: "approved",
  approvedAt: null,
  exitCode: 0,
  undoCommand: "systemctl start x",
  undoOf: null,
  ...over,
});
const item = { serverName: "a" } as SavingsReport["items"][number];

test("formatKrw uses the won sign and thousands separators", () => {
  assert.equal(formatKrw(12345), "₩12,345");
});

test("a live reading outranks powerSource", () => {
  assert.equal(isServerEstimated({ isEstimated: true, powerSource: "measured" }), true);
  assert.equal(isServerEstimated({ isEstimated: null, powerSource: "estimated" }), true);
  assert.equal(isServerEstimated({ isEstimated: null, powerSource: "measured" }), false);
});

test("a report item only reads 실측 when every matching server is measured", () => {
  assert.equal(reportItemEstimated(item, [{ name: "a", powerSource: "measured" }]), false);
  assert.equal(reportItemEstimated(item, []), true);
  assert.equal(
    reportItemEstimated(item, [
      { name: "a", powerSource: "measured" },
      { name: "a", powerSource: "estimated" },
    ]),
    true,
  );
});

test("undo is offered only for a successful action with an undo command", () => {
  assert.equal(undoState(call({}), []), "ready");
  assert.equal(undoState(call({ exitCode: 1 }), []), "unavailable");
  assert.equal(undoState(call({ exitCode: null }), []), "unavailable");
  assert.equal(undoState(call({ undoCommand: null }), []), "unavailable");
  assert.equal(undoState(call({ decision: "denied" }), []), "unavailable");
  assert.equal(undoState(call({ undoOf: 9 }), []), "unavailable");
});

test("undo tracks the latest attempt, and a failed one can be retried", () => {
  const undo = (exitCode: number | null, id = 2) => call({ id, undoOf: 1, exitCode, undoCommand: null });
  assert.equal(undoState(call({}), [undo(null)]), "running");
  assert.equal(undoState(call({}), [undo(0)]), "done");
  assert.equal(undoState(call({}), [undo(1)]), "failed");
  assert.equal(undoState(call({}), [undo(1), undo(0, 3)]), "done");
});

test("splitRuns separates provenance and shares the boundary point", () => {
  const runs = splitRuns([metric(0), metric(10), metric(20, true), metric(30, true)]);
  assert.deepEqual(runs.map((r) => [r.estimated, r.points.length]), [[false, 2], [true, 3]]);
});

test("splitRuns breaks the line across an outage", () => {
  const runs = splitRuns([metric(0), metric(10), metric(20), metric(30), metric(500), metric(510)]);
  assert.deepEqual(runs.map((r) => r.points.length), [4, 2]);
});

test("appendMetric drops duplicates and points outside the window", () => {
  const start = [metric(0), metric(50)];
  assert.equal(appendMetric(start, metric(50), 60_000), start);
  assert.deepEqual(appendMetric(start, metric(100), 60_000).map((m) => m.ts), [metric(50).ts, metric(100).ts]);
});

test("axisTicks reaches the maximum on round steps", () => {
  assert.deepEqual(axisTicks(137), [0, 50, 100, 150]);
  assert.deepEqual(axisTicks(0), [0, 1]);
});

test("appendStream ignores an entry the first fetch already returned", () => {
  const first = { seq: 1, kind: "command" as const, text: "uptime" };
  const next = { seq: 2, kind: "output" as const, text: "up" };
  assert.deepEqual(appendStream([first], first), [first]);
  assert.deepEqual(appendStream([first], next), [first, next]);
});

test("recommendationPlan always ends by measuring, whatever type the AI invented", () => {
  for (const type of ["night_stop", "made_up_by_ai"]) {
    const steps = recommendationPlan(type);
    assert.ok(steps.length >= 3);
    assert.match(steps.at(-1)!, /다시 재서/);
  }
});
