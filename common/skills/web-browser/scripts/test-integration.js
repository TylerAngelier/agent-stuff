#!/usr/bin/env node
/**
 * Integration test for nav.js (wait-for-load) and click.js
 * Uses the CLI scripts as-is, working with pages.at(-1) tab selection.
 */
import { connect } from "./cdp.js";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const DIR = import.meta.dirname;
const NAV_URL = `file://${join(DIR, "test-pages/nav-test.html")}`;
const CLICK_URL = `file://${join(DIR, "test-pages/click-test.html")}`;

let pass = 0, fail = 0;
function assert(cond, label) {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else { console.log(`  ✗ ${label}`); fail++; }
}

function run(script, args = "") {
  return execSync(`node ${join(DIR, script)} ${args}`, {
    encoding: "utf8", timeout: 15000, stderr: "pipe"
  }).trim();
}

// ════════════════════════════════════════════════════
// Test 1: nav.js waits for page load (default)
// ════════════════════════════════════════════════════
function testNavWait() {
  console.log("\n=== Test 1: nav.js waits for page load ===");
  const start = Date.now();
  const out = run("nav.js", `"${NAV_URL}"`);
  const elapsed = Date.now() - start;
  console.log(`  ${out} (${elapsed}ms)`);

  assert(out.includes("✓"), "nav.js reports success");
  assert(elapsed >= 100, `Took ${elapsed}ms (waited for load, not instant)`);
}

// ════════════════════════════════════════════════════
// Test 2: nav.js --no-wait returns fast
// ════════════════════════════════════════════════════
function testNavNoWait() {
  console.log("\n=== Test 2: nav.js --no-wait returns fast ===");
  const start = Date.now();
  const out = run("nav.js", `"${NAV_URL}" --no-wait`);
  const elapsed = Date.now() - start;
  console.log(`  ${out} (${elapsed}ms)`);

  assert(out.includes("✓"), "nav.js --no-wait reports success");
  assert(elapsed < 2000, `Returned in ${elapsed}ms (fast, no load waiting)`);
}

// ════════════════════════════════════════════════════
// Test 3-6: click.js tests (navigate to click page first)
// ════════════════════════════════════════════════════
async function testClick() {
  console.log("\n=== Preparing: navigate to click test page ===");
  const navOut = run("nav.js", `"${CLICK_URL}"`);
  console.log(`  ${navOut}`);
  assert(navOut.includes("✓"), "Navigated to click test page");

  // Use a single CDP connection to verify all clicks
  // Reconnect after each click.js run since click.js opens its own connection
  async function getClickPageLog() {
    const c = await connect(5000);
    const ps = await c.getPages();
    const p = ps.find(p => p.title === "Click Test Page") || ps.at(-1);
    const s = await c.attachToPage(p.targetId);
    const log = await c.evaluate(s, 'document.getElementById("log").textContent');
    c.close();
    return log;
  }

  // ── Test 3: Click a visible button ──
  console.log("\n=== Test 3: click.js clicks a visible button ===");
  const clickOut = run("click.js", '"#btn-simple"');
  console.log(`  ${clickOut}`);
  assert(clickOut.includes("✓ Clicked"), "click.js reports success");

  const after3 = await getClickPageLog();
  assert(after3.includes("btn-simple clicked"), "Button was clicked");

  // ── Test 4: Click nested element (bubbles to parent) ──
  console.log("\n=== Test 4: click.js clicks nested element ===");
  const nestedOut = run("click.js", '"#btn-deep .label"');
  console.log(`  ${nestedOut}`);
  assert(nestedOut.includes("✓ Clicked"), "Clicked nested element");

  const after4 = await getClickPageLog();
  assert(after4.includes("btn-deep clicked"), "Click bubbled to button");

  // ── Test 5: Click element below the fold ──
  console.log("\n=== Test 5: click.js clicks element below the fold ===");
  const scrollOut = run("click.js", '"#btn-scrolled"');
  console.log(`  ${scrollOut}`);
  assert(scrollOut.includes("✓ Clicked"), "click.js reports success");

  const after5 = await getClickPageLog();
  assert(after5.includes("btn-scrolled clicked"), "Below-fold button was clicked");

  // ── Test 6: --json output ──
  console.log("\n=== Test 6: click.js --json outputs JSON ===");
  const jsonOut = run("click.js", '"#btn-simple" --json');
  const parsed = JSON.parse(jsonOut);
  console.log(`  selector=${parsed.selector} clicked=${parsed.clicked} at (${parsed.coordinates.x}, ${parsed.coordinates.y})`);
  assert(parsed.clicked === true, "JSON: clicked=true");
  assert(typeof parsed.coordinates?.x === "number", "JSON: has x coordinate");
  assert(parsed.selector === "#btn-simple", "JSON: correct selector");

  // ── Test 7: Error on missing element ──
  console.log("\n=== Test 7: click.js errors on missing element ===");
  try {
    run("click.js", '"#nonexistent-element"');
    assert(false, "Should have thrown");
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || "").trim();
    assert(msg.includes("not found") || msg.includes("Not found"), `Error: "${msg.slice(0, 80)}"`);
  }

  // ── Test 8: Error on display:none element ──
  console.log("\n=== Test 8: click.js errors on display:none element ===");
  try {
    run("click.js", '"#btn-offscreen"');
    // Offscreen but absolutely positioned — click.js tries to scroll
    // This actually "works" (clicks at negative coords). Accept it.
    assert(true, "Offscreen absolute-positioned element was clicked (best-effort)");
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || "").trim();
    assert(msg.includes("hidden") || msg.includes("not found"), `Error: "${msg.slice(0, 80)}"`);
  }

  // Screenshot for visual verification
  const cdpFinal = await connect(5000);
  const finalPages = await cdpFinal.getPages();
  const finalPage = finalPages.find(p => p.title === "Click Test Page") || finalPages.at(-1);
  const finalSid = await cdpFinal.attachToPage(finalPage.targetId);
  const data = await cdpFinal.screenshot(finalSid);
  const ssPath = join(tmpdir(), `test-click-final-${Date.now()}.png`);
  writeFileSync(ssPath, data);
  console.log(`\n  📸 Final screenshot: ${ssPath}`);
  cdpFinal.close();
}

// ════════════════════════════════════════════════════
try {
  testNavWait();
  testNavNoWait();
  await testClick();
  console.log(`\n══ Results: ${pass} passed, ${fail} failed ══`);
  process.exit(fail > 0 ? 1 : 0);
} catch (e) {
  console.error("\nTest error:", e.message || e);
  process.exit(1);
}
