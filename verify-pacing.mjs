import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });

await page.getByRole("button", { name: "Begin" }).click();
await page.waitForSelector("text=Live Operations");

async function hire(role) {
  await page.selectOption("select", role);
  await page.getByRole("button", { name: "Find Candidates" }).click();
  await page.waitForTimeout(150);
  const buttons = await page.getByRole("button", { name: "Hire" }).all();
  await buttons[0].click();
  await page.waitForTimeout(100);
}

await page.getByRole("link", { name: "Employees" }).click();
for (const role of ["bartender", "server", "host"]) await hire(role);

await page.getByRole("link", { name: "Purchasing" }).click();
const qtyInputs = await page.locator('input[type="number"]').all();
for (const inp of qtyInputs) await inp.fill("400");
await page.getByRole("button", { name: "Place Order" }).click();

await page.getByRole("link", { name: "Menu & Pricing" }).click();
const checkboxes = await page.locator('input[type="checkbox"]').all();
for (const cb of checkboxes) await cb.check();

await page.getByRole("link", { name: "Live Operations" }).click();
await page.getByRole("button", { name: "Open Bar" }).click();

// Wait long enough (game-minutes == real-seconds) to observe several full visits, including some 30-90 min ones.
await page.waitForTimeout(170000);

const logText = await page.locator(".log-panel").first().innerText();
console.log("---FULL LOG (most recent first)---");
console.log(logText);

// Parse "H:MM AM/PM\nMessage" pairs into {minute, message} using a rough same-day clock parser.
const lines = logText.split("\n").filter(Boolean);
function toMinutes(clock) {
  const m = clock.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let [, h, min, ap] = m;
  h = parseInt(h, 10);
  min = parseInt(min, 10);
  if (ap.toUpperCase() === "PM" && h !== 12) h += 12;
  if (ap.toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

const entries = [];
for (let i = 0; i < lines.length; i += 2) {
  const minute = toMinutes(lines[i]);
  const message = lines[i + 1];
  if (minute !== null && message) entries.push({ minute, message });
}
// Log is newest-first; reverse to chronological, and unwrap 2pm-2am wraparound into a monotonic minute-of-day-since-open value.
entries.reverse();
let prev = null;
let dayOffset = 0;
for (const e of entries) {
  let adjusted = e.minute;
  if (adjusted < 14 * 60) adjusted += 24 * 60; // after-midnight times sort after 2pm
  adjusted -= 14 * 60; // minutes since open (2pm)
  if (prev !== null && adjusted < prev - 5) dayOffset += 24 * 60;
  adjusted += dayOffset;
  e.sinceOpen = adjusted;
  prev = adjusted;
}

const arrivals = new Map();
const durations = [];
for (const e of entries) {
  const enteredMatch = e.message.match(/^(\w+ \w+) entered\.$/);
  if (enteredMatch) arrivals.set(enteredMatch[1], e.sinceOpen);
  const leftMatch = e.message.match(/^(\w+ \w+) (?:finished up and left|left after)/);
  if (leftMatch && arrivals.has(leftMatch[1])) {
    durations.push(e.sinceOpen - arrivals.get(leftMatch[1]));
    arrivals.delete(leftMatch[1]);
  }
}

console.log("---COMPLETE VISIT DURATIONS (minutes)---", durations);
console.log(
  "---MIN/MAX/AVG---",
  durations.length ? Math.min(...durations) : null,
  durations.length ? Math.max(...durations) : null,
  durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : null,
);

console.log(
  "---MENTIONS CUSTOMER CHAT FLAVOR---",
  /chatted with|people-watched|struck up a conversation|relaxed and took in|laughed at something|scrolled through/i.test(logText),
);
console.log(
  "---MENTIONS STAFF IDLE FLAVOR---",
  /wiped down the bar|polished glassware|chatted with a regular|checked the taps|checked in on a table|tidied up an empty table|refilled the napkin/i.test(
    logText,
  ),
);
console.log("---PAGE ERRORS---", errors);

await browser.close();
