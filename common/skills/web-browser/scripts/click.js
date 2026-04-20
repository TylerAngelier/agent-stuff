#!/usr/bin/env node

/**
 * Click an element on the page using CDP Input.dispatchMouseEvent.
 *
 * The element is located by CSS selector. If it's outside the viewport,
 * it will be scrolled into view before clicking.
 *
 * Usage:
 *   click.js <selector>              # Click element matching selector
 *   click.js <selector> --scroll     # Force scroll into view even if partially visible
 *   click.js <selector> --json       # Output result as JSON
 */

import { connect } from "./cdp.js";

const DEBUG = process.env.DEBUG === "1";
const log = DEBUG ? (...args) => console.error("[debug]", ...args) : () => {};

const args = process.argv.slice(2);
const selector = args.find((a) => !a.startsWith("--"));
const jsonOutput = args.includes("--json");
const forceScroll = args.includes("--scroll");

if (!selector) {
  console.log("Usage: click.js <selector> [--scroll] [--json]");
  console.log("\nOptions:");
  console.log("  --scroll   Force scroll into view before clicking");
  console.log("  --json     Output result as JSON");
  console.log("\nExamples:");
  console.log('  click.js "#submit-btn"');
  console.log('  click.js "a[href*=\'login\']"');
  console.log('  click.js ".cta-button" --scroll');
  process.exit(1);
}

// Global timeout
const globalTimeout = setTimeout(() => {
  console.error("✗ Global timeout exceeded (15s)");
  process.exit(1);
}, 15000);

try {
  log("connecting...");
  const cdp = await connect(5000);

  log("getting pages...");
  const pages = await cdp.getPages();
  const page = pages.at(-1);

  if (!page) {
    console.error("✗ No active tab found");
    process.exit(1);
  }

  log("attaching to page...");
  const sessionId = await cdp.attachToPage(page.targetId);

  // Get element bounding rect and visibility info
  log("locating element:", selector);
  const box = await cdp.evaluate(
    sessionId,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { error: "Element not found: " + ${JSON.stringify(selector)} };

      // Check if element or ancestor is hidden via display:none or visibility:hidden
      let check = el;
      while (check && check !== document.body) {
        const style = getComputedStyle(check);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return { error: "Element is hidden (display:none, visibility:hidden, or opacity:0)" };
        }
        check = check.parentElement;
      }

      const rect = el.getBoundingClientRect();
      const vpWidth = window.innerWidth;
      const vpHeight = window.innerHeight;

      const inViewport = (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < vpHeight &&
        rect.bottom > 0 &&
        rect.left < vpWidth &&
        rect.right > 0
      );

      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        width: rect.width,
        height: rect.height,
        inViewport,
        viewportWidth: vpWidth,
        viewportHeight: vpHeight,
      };
    })()`
  );

  if (box.error) {
    console.error("✗", box.error);
    process.exit(1);
  }

  // If element is outside viewport (or --scroll requested), scroll it into view
  if (!box.inViewport || forceScroll) {
    log("scrolling element into view...");
    await cdp.evaluate(
      sessionId,
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center', inline: 'center' })`
    );
    // Wait for scroll to settle
    await new Promise((r) => setTimeout(r, 300));

    // Re-read position after scroll
    const newBox = await cdp.evaluate(
      sessionId,
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const rect = el.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`
    );
    box.x = newBox.x;
    box.y = newBox.y;
  }

  // Dispatch mouse events via CDP (produces trusted events)
  log("clicking at:", box.x, box.y);
  await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 },
    sessionId
  );
  await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 },
    sessionId
  );

  const result = {
    selector,
    clicked: true,
    coordinates: { x: Math.round(box.x), y: Math.round(box.y) },
    elementSize: { width: Math.round(box.width), height: Math.round(box.height) },
    scrolled: !box.inViewport || forceScroll,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✓ Clicked ${selector} at (${Math.round(box.x)}, ${Math.round(box.y)})${result.scrolled ? " (scrolled into view)" : ""}`);
  }

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
