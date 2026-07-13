import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (err) => errors.push("PAGEERROR: " + String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("CONSOLE: " + msg.text());
});

const shotDir = "C:/Users/Chris/AppData/Local/Temp/claude/c--Users-Chris-OneDrive-Desktop-Hold-ABar/81dbaf4e-731b-4331-8d24-06d2ea022feb/scratchpad/shots";

async function safeNav(label, selector) {
  try {
    await page.click(selector, { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shotDir}/nav-${label}.png`, fullPage: true });
    console.log(`OK: ${label}`);
  } catch (err) {
    console.log(`FAILED: ${label} -> ${err.message.split("\n")[0]}`);
  }
}

await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

await page.waitForSelector("text=Flip the Sign to OPEN");
await page.fill("#bar-name", "The Verified Room");
await page.click("button:has-text('Flip the Sign to OPEN')");
await page.waitForSelector("text=Live Operations", { timeout: 15000 });
console.log("Game started");

await page.click("a:has-text('Settings')");
await page.waitForSelector("text=Debug");
const skipBtn = page.locator("button:has-text('Skip to Near Closing')");
if (await skipBtn.count()) {
  await skipBtn.click();
  await page.waitForTimeout(2000);
}
console.log("Skipped ahead; ledger should now have real entries");

await safeNav("overview", "a:has-text('Overview')");
await safeNav("financials", "a:has-text('Financials')");
await safeNav("reports", "a:has-text('Reports')");
await safeNav("reputation", "a:has-text('Reputation')");

// Hover the financials cash chart to confirm the tooltip renders without re-hanging the page.
await page.click("a:has-text('Financials')");
const chart = page.locator("svg").first();
if (await chart.count()) {
  const box = await chart.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shotDir}/financials-tooltip.png` });
  }
}
await safeNav("back-to-overview", "a:has-text('Overview')");

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
