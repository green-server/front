import assert from "node:assert/strict";
import { test } from "node:test";
import { subsolar } from "./sun.ts";

test("subsolar follows the seasons and the clock", () => {
  const june = subsolar(new Date("2026-06-21T12:00:00Z"));
  assert.ok(Math.abs(june.lat - 23.44) < 0.5 && Math.abs(june.lon) < 0.01);
  const december = subsolar(new Date("2026-12-21T00:00:00Z"));
  assert.ok(Math.abs(december.lat + 23.44) < 0.5 && Math.abs(Math.abs(december.lon) - 180) < 0.01);
  // 03:00 UTC is noon in Korea (135°E meridian).
  assert.ok(Math.abs(subsolar(new Date("2026-03-20T03:00:00Z")).lon - 135) < 0.01);
});
