import assert from "node:assert/strict";
import { test } from "node:test";
import { DEAD_BRANCHES, FRUIT_SLOTS, LEAF_CLUSTERS, LITTER, MAX_LABELS, layoutFruits, treeState } from "./tree.ts";
import type { ServerSummary } from "./types.ts";

const server = (id: number, watts: number | null, over: Partial<ServerSummary> = {}): ServerSummary => ({
  id, name: `s${id}`, kind: "baremetal", ratePlan: "home_tiered", householdKwh: 300, powerSource: "measured",
  lastSeenAt: null, location: null, createdAt: "", online: true, latestWatts: watts, weekWatts: 100, isEstimated: false,
  monthlyKwh: 0, monthlyKrw: 0, monthlyCo2Kg: 0, ...over,
});

test("a clear fleet grows a full green tree", () => {
  assert.deepEqual(treeState(1, 0), { leaves: LEAF_CLUSTERS.length, autumn: 0, falling: 0, deadBranches: 0, litter: 0 });
  // At the average the leaves are still green.
  assert.equal(treeState(0.5, 0).autumn, 0);
});

test("drawing more than the average turns and drops leaves", () => {
  const warm = treeState(0.25, 0);
  assert.equal(warm.autumn, 0.5);
  assert.equal(warm.falling, 0.5);
  assert.ok(warm.leaves < LEAF_CLUSTERS.length);
  assert.equal(treeState(0, 0).leaves, Math.round(LEAF_CLUSTERS.length * 0.34));
});

test("open recommendations bare branches and litter the ground", () => {
  const some = treeState(1, 0.5);
  assert.equal(some.deadBranches, Math.round(DEAD_BRANCHES.length / 2));
  assert.equal(some.litter, LITTER.length / 2);
  assert.ok(treeState(1, 0.9).deadBranches > some.deadBranches);
});

test("the worst case is nearly bare, never dead", () => {
  const worst = treeState(0, 1);
  assert.ok(worst.leaves >= 3 && worst.leaves <= 5);
  assert.equal(worst.deadBranches, DEAD_BRANCHES.length);
});

test("fruits take slots in id order and grow with draw", () => {
  const { fruits } = layoutFruits([server(3, 50), server(1, 100), server(2, 10, { online: false })]);
  assert.deepEqual(fruits.map((f) => [f.id, f.slot]), [[1, 0], [2, 1], [3, 2]]);
  assert.equal(fruits[0].radius, 14);
  assert.equal(fruits[1].radius, 7); // offline
  assert.ok(fruits[2].radius > 7 && fruits[2].radius < 14);
});

test("only the highest-draw fruits are labelled and the rest are counted", () => {
  const list = Array.from({ length: 15 }, (_, i) => server(i + 1, i * 10));
  const { fruits, more } = layoutFruits(list);
  assert.equal(fruits.length, FRUIT_SLOTS.length);
  const labelled = fruits.filter((f) => f.labelled).map((f) => f.id);
  assert.equal(labelled.length, MAX_LABELS);
  assert.deepEqual(labelled, [5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(more, 15 - MAX_LABELS);
});
