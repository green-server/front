import assert from "node:assert/strict";
import { test } from "node:test";
import { appendStream, callHasProblem, groupCalls, powerChange, recommendationPlan, appendMetric, axisTicks, formatKrw, isServerEstimated, reportItemEstimated, undoState } from "./format.js";

const metric = (seconds, isEstimated = false) => ({
  ts: new Date(seconds * 1000).toISOString(),
  cpuPct: 0,
  memPct: 0,
  watts: 100,
  isEstimated,
});
const call = (over) => ({
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
const item = { serverName: "a" };

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
  const undo = (exitCode, id = 2) => call({ id, undoOf: 1, exitCode, undoCommand: null });
  assert.equal(undoState(call({}), [undo(null)]), "running");
  assert.equal(undoState(call({}), [undo(0)]), "done");
  assert.equal(undoState(call({}), [undo(1)]), "failed");
  assert.equal(undoState(call({}), [undo(1), undo(0, 3)]), "done");
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
  const first = { seq: 1, kind: "command", text: "uptime" };
  const next = { seq: 2, kind: "output", text: "up" };
  assert.deepEqual(appendStream([first], first), [first]);
  assert.deepEqual(appendStream([first], next), [first, next]);
});

test("recommendationPlan always ends by measuring, whatever type the AI invented", () => {
  for (const type of ["night_stop", "made_up_by_ai"]) {
    const steps = recommendationPlan(type);
    assert.ok(steps.length >= 3);
    assert.match(steps.at(-1), /다시 재서/);
  }
});

test("groupCalls puts the newest consultation first and keeps run order inside", () => {
  const call = (id, consultationId) => ({ id, consultationId, command: "c", tier: "auto", decision: "auto", exitCode: 0, requestedAt: "", serverName: "s" });
  const groups = groupCalls([call(4, 2), call(3, 2), call(2, 1)]);
  assert.deepEqual(groups.map((group) => group.map((c) => c.id)), [[3, 4], [2]]);
});

test("callHasProblem flags refused and failed commands, not ones still running", () => {
  assert.equal(callHasProblem({ decision: "auto", exitCode: 0 }), false);
  assert.equal(callHasProblem({ decision: "auto", exitCode: null }), false);
  assert.equal(callHasProblem({ decision: "auto", exitCode: 1 }), true);
  assert.equal(callHasProblem({ decision: "blocked", exitCode: null }), true);
});

test("powerChange reports the drop and survives a zero baseline", () => {
  assert.equal(powerChange(160, 142), -11);
  assert.equal(powerChange(0, 5), null);
});
