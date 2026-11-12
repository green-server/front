import assert from "node:assert/strict";
import { test } from "node:test";
import { DEAD_COUNT, FRUIT_SLOTS, LEAF_COUNT, LITTER_COUNT, MAX_LABELS, TREE_ART, TREE_MASK, cellPart, layoutFruits, treeState } from "./tree.ts";
import type { ServerSummary } from "./types.ts";

const server = (id: number, watts: number | null, over: Partial<ServerSummary> = {}): ServerSummary => ({
  id, name: `s${id}`, kind: "baremetal", ratePlan: "home_tiered", householdKwh: 300, powerSource: "measured",
  lastSeenAt: null, location: null, createdAt: "", online: true, latestWatts: watts, weekWatts: 100, isEstimated: false,
  monthlyKwh: 0, monthlyKrw: 0, monthlyCo2Kg: 0, ...over,
});

test("a clear fleet grows a full green tree", () => {
  assert.deepEqual(treeState(1, 0), { leaves: LEAF_COUNT, autumn: 0, falling: 0, deadBranches: 0, litter: 0 });
  // At the average the leaves are still green.
  assert.equal(treeState(0.5, 0).autumn, 0);
});

test("drawing more than the average turns and drops leaves", () => {
  const warm = treeState(0.25, 0);
  assert.equal(warm.autumn, 0.5);
  assert.equal(warm.falling, 0.5);
  assert.ok(warm.leaves < LEAF_COUNT);
  assert.equal(treeState(0, 0).leaves, Math.round(LEAF_COUNT * 0.34));
});

test("open recommendations bare branches and litter the ground", () => {
  const some = treeState(1, 0.5);
  assert.equal(some.deadBranches, Math.round(DEAD_COUNT / 2));
  assert.equal(some.litter, LITTER_COUNT / 2);
  assert.ok(treeState(1, 0.9).deadBranches > some.deadBranches);
});

test("the worst case is nearly bare, never dead", () => {
  const worst = treeState(0, 1);
  assert.ok(worst.leaves >= 3 && worst.leaves <= 5);
  assert.equal(worst.deadBranches, DEAD_COUNT);
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

test("the drawing and its mask line up cell for cell", () => {
  assert.equal(TREE_ART.length, 24);
  assert.equal(TREE_MASK.length, 24);
  TREE_ART.forEach((line, row) => {
    assert.equal(line.length, 48, `art row ${row}`);
    assert.equal(TREE_MASK[row].length, 48, `mask row ${row}`);
    [...line].forEach((ch, col) => assert.equal(ch === " ", TREE_MASK[row][col] === " ", `cell ${col},${row}`));
  });
});

test("every leaf cluster, dead branch and litter patch is drawn somewhere", () => {
  const seen = new Set(TREE_MASK.flatMap((line) => [...line].map(cellPart).filter((p) => p !== null).map((p) => `${p.kind}${p.n}`)));
  for (let n = 0; n < LEAF_COUNT; n++) assert.ok(seen.has(`leaf${n}`), `leaf ${n}`);
  for (let n = 0; n < DEAD_COUNT; n++) assert.ok(seen.has(`dead${n}`), `dead ${n}`);
  for (let n = 0; n < LITTER_COUNT; n++) assert.ok(seen.has(`litter${n}`), `litter ${n}`);
  assert.ok(seen.has("trunk0"));
});

test("fruits hang on leaves", () => {
  for (const [col, row] of FRUIT_SLOTS) assert.equal(cellPart(TREE_MASK[row][col])?.kind, "leaf", `slot ${col},${row}`);
});
