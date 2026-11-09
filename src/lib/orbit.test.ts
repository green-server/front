import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutSatellites, planetHealth, weekChangePct, MAX_LABELS } from "./orbit.ts";
import type { ServerSummary } from "./types.ts";

const server = (id: number, watts: number | null, over: Partial<ServerSummary> = {}): ServerSummary => ({
  id, name: `s${id}`, kind: "baremetal", ratePlan: "home_tiered", householdKwh: 300, powerSource: "measured",
  lastSeenAt: null, createdAt: "", online: true, latestWatts: watts, weekWatts: 100, isEstimated: false,
  monthlyKwh: 0, monthlyKrw: 0, monthlyCo2Kg: 0, ...over,
});

test("satellites are evenly spaced in id order", () => {
  const sats = layoutSatellites([server(3, 10), server(1, 10), server(2, 10), server(4, 10)]);
  assert.deepEqual(sats.map((s) => s.id), [1, 2, 3, 4]);
  assert.ok(Math.abs(sats[1].angle - sats[0].angle - Math.PI / 2) < 1e-9);
});

test("only the highest-draw servers get labels", () => {
  const list = Array.from({ length: 12 }, (_, i) => server(i + 1, i * 10));
  const labelled = layoutSatellites(list).filter((s) => s.labelled).map((s) => s.id);
  assert.equal(labelled.length, MAX_LABELS);
  assert.deepEqual(labelled, [5, 6, 7, 8, 9, 10, 11, 12]);
});

test("size grows with draw and offline servers are smallest", () => {
  const [a, b, c] = layoutSatellites([server(1, 10), server(2, 100), server(3, 50, { online: false })]);
  assert.ok(b.size > a.size);
  assert.equal(c.size, 0.6);
});

test("week change compares online draw with the 7-day average", () => {
  assert.equal(weekChangePct([server(1, 88), server(2, 88)]), -12);
  assert.equal(weekChangePct([server(1, 50, { weekWatts: null })]), null);
});

test("health keeps the old mapping", () => {
  assert.equal(planetHealth([server(1, 100)]), 0.5);
  assert.equal(planetHealth(undefined), 1);
});
