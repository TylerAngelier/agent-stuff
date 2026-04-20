#!/usr/bin/env node

import { connect } from "./cdp.js";

const DEBUG = process.env.DEBUG === "1";
const log = DEBUG ? (...args) => console.error("[debug]", ...args) : () => {};

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const newTab = args.includes("--new");
const noWait = args.includes("--no-wait");

if (!url) {
  console.log("Usage: nav.js <url> [--new] [--no-wait]");
  console.log("\nOptions:");
  console.log("  --new      Open in a new tab");
  console.log("  --no-wait  Return immediately without waiting for load");
  console.log("\nExamples:");
  console.log("  nav.js https://example.com           # Navigate and wait for load");
  console.log("  nav.js https://example.com --new     # Open new tab and wait");
  console.log("  nav.js https://example.com --no-wait # Fire and forget");
  process.exit(1);
}

// Global timeout
const globalTimeout = setTimeout(() => {
  console.error("✗ Global timeout exceeded (45s)");
  process.exit(1);
}, 45000);

try {
  log("connecting...");
  const cdp = await connect(5000);

  log("getting pages...");
  let targetId;

  if (newTab) {
    log("creating new tab...");
    const { targetId: newTargetId } = await cdp.send("Target.createTarget", {
      url: "about:blank",
    });
    targetId = newTargetId;
  } else {
    const pages = await cdp.getPages();
    const page = pages.at(-1);
    if (!page) {
      console.error("✗ No active tab found");
      process.exit(1);
    }
    targetId = page.targetId;
  }

  log("attaching to page...");
  const sessionId = await cdp.attachToPage(targetId);

  // Set up load listener BEFORE navigating to avoid race conditions
  let loadPromise = null;
  if (!noWait) {
    await cdp.send("Page.enable", {}, sessionId);
    loadPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cdp.off("Page.loadEventFired", handler);
        reject(new Error("Page load timeout (30s)"));
      }, 30000);

      const handler = (params, sid) => {
        if (sid === sessionId) {
          clearTimeout(timer);
          cdp.off("Page.loadEventFired", handler);
          resolve();
        }
      };
      cdp.on("Page.loadEventFired", handler);
    });
  }

  log("navigating...");
  await cdp.navigate(sessionId, url);

  if (loadPromise) {
    log("waiting for page load...");
    await loadPromise;
  }

  console.log(newTab ? "✓ Opened:" : "✓ Navigated to:", url);

  log("closing...");
  cdp.close();
  log("done");
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
} finally {
  clearTimeout(globalTimeout);
  setTimeout(() => process.exit(0), 100);
}
