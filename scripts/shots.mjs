import { chromium } from "playwright";

const OUT = process.env.OUT || ".";
const base = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(base, { waitUntil: "networkidle" });
await pause(900);
await shot("01-login");

await page.getByRole("button", { name: /Explore the demo/i }).click();
await pause(1500);
await shot("02-home-light");

// Add expense sheet
await page.getByLabel("Add expense").click();
await pause(800);
await shot("03-add-expense");
await page.keyboard.press("Escape");
await pause(500);

// Settle sheet (first "you owe" settle button)
const settleBtn = page.getByRole("button", { name: "Settle up" }).first();
if (await settleBtn.count()) {
  await settleBtn.click();
  await pause(900);
  await shot("04-settle");
  await page.keyboard.press("Escape");
  await pause(400);
}

await page.goto(`${base}/groups/g_goa`, { waitUntil: "networkidle" });
await pause(900);
await shot("05-group-detail");

await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
await pause(1100);
await shot("06-analytics");

await page.goto(`${base}/account`, { waitUntil: "networkidle" });
await pause(700);
await shot("07-account");

// Dark mode home
await page.evaluate(() => localStorage.setItem("tally-theme", "dark"));
await page.goto(base, { waitUntil: "networkidle" });
await pause(1200);
await shot("08-home-dark");

// Desktop (still dark, still logged in)
await page.setViewportSize({ width: 1320, height: 900 });
await page.goto(base, { waitUntil: "networkidle" });
await pause(1000);
await shot("09-desktop-dark");

await page.evaluate(() => localStorage.setItem("tally-theme", "light"));
await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
await pause(1100);
await shot("10-desktop-analytics");

await browser.close();
console.log("done");
