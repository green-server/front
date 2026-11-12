import assert from "node:assert/strict";
import { test } from "node:test";
import { planetBlight, planetHealth } from "./orbit.ts";
import type { ServerSummary } from "./types.ts";

const server = (id: number, watts: number | null, over: Partial<ServerSummary> = {}): ServerSummary => ({
  id, name: `s${id}`, kind: "baremetal", ratePlan: "home_tiered", householdKwh: 300, powerSource: "measured",
  lastSeenAt: null, location: null, createdAt: "", online: true, latestWatts: watts, weekWatts: 100, isEstimated: false,
  monthlyKwh: 0, monthlyKrw: 0, monthlyCo2Kg: 0, ...over,
});

test("health is neutral when nothing tracked is online", () => {
  assert.equal(planetHealth([server(1, 100, { online: false })]), 0.5);
});

test("health keeps the old mapping", () => {
  assert.equal(planetHealth([server(1, 100)]), 0.5);
  assert.equal(planetHealth(undefined), 1);
});

test("blight grows with open recommendations and never reaches 1", () => {
  const activity = (open: number[]) => ({
    servers: open.map((n, i) => ({ serverId: i, serverName: "", total: n, open: n, applied: 0, openSavingKrw: 0 })),
    calls: [],
  });
  assert.equal(planetBlight(undefined), 0);
  assert.equal(planetBlight(activity([0, 0])), 0);
  const few = planetBlight(activity([2]));
  const many = planetBlight(activity([5, 5, 5]));
  assert.ok(few > 0 && few < many && many < 1);
  assert.ok(Math.abs(planetBlight(activity([8])) - (1 - Math.exp(-1))) < 1e-9);
});
