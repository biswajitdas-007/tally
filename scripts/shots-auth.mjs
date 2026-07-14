import { chromium } from "playwright";

const OUT = process.env.OUT || ".";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console.error] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/auth-01-login-mobile.png` });

await page.setViewportSize({ width: 1320, height: 900 });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/auth-02-login-desktop.png` });

console.log("CONSOLE ERRORS:", errors.length ? "\n" + errors.join("\n") : "none");
await browser.close();
