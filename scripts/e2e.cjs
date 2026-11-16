/**
 * Full customer → owner journey through the real UI (Playwright).
 *   BASE_URL=http://localhost:3000 node scripts/e2e.cjs
 * Requires a running server in demo mode and Playwright installed.
 * Saves screenshots to docs/screenshots/.
 */
const { chromium, devices } = require("playwright");
const path = require("node:path");
const base = process.env.BASE_URL || "http://localhost:3000";
const out = (f) => path.join(__dirname, "..", "docs", "screenshots", f.replace(/\.png$/, ".jpg"));
const pw = process.env.DEMO_ADMIN_PASSWORD || "blanc-demo";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ── Customer on a phone ──
  const phone = await browser.newContext({ ...devices["iPhone 13"] });
  const c = await phone.newPage();
  c.on("pageerror", (e) => errors.push(e.message));
  console.log("Customer books on mobile");
  await c.goto(`${base}/book?treatment=express-microdermabrasion`);
  const loaded = () => c.locator('[role="grid"][aria-busy="false"]').waitFor();
  await loaded();
  // pick the first available day (may be next month)
  let day = c.locator('button[aria-label*="times available"]').first();
  let monthsAhead = 0;
  for (let i = 0; i < 2 && !(await day.count()); i++) {
    await c.getByRole("button", { name: "Next month" }).click();
    monthsAhead++;
    await loaded();
    day = c.locator('button[aria-label*="times available"]').first();
  }
  await day.waitFor();
  const dayLabel = await day.getAttribute("aria-label");
  await day.click();
  const slotBtn = c.locator('button[aria-pressed]').filter({ hasText: /am|pm/ }).first();
  await slotBtn.waitFor();
  const slotLabel = (await slotBtn.textContent()).trim();
  await slotBtn.click();
  await c.screenshot({ type: "jpeg", quality: 80, path: out("04-mobile-choose-time.png") });
  await c.getByRole("button", { name: "Continue" }).click();
  await c.fill("#fullName", "Test Client");
  await c.fill("#email", "test.client@example.com");
  await c.fill("#phone", "07700 900555");
  await c.fill("#notes", "Booked from the end-to-end test");
  await c.getByRole("button", { name: "Continue" }).click();
  await c.getByText("Deposit required").waitFor();
  assert(await c.getByText("£10.00").first().isVisible(), "review step shows the £10.00 fixed deposit");
  const submit = c.getByRole("button", { name: "Request booking" });
  assert(await submit.isDisabled(), "cannot submit before agreeing to policies");
  await c.locator('input[type="checkbox"]').check();
  await c.screenshot({ type: "jpeg", quality: 80, path: out("05-mobile-review.png") });
  await submit.click();
  await c.waitForURL(/\/booking\/.+new=1/);
  const ref = (await c.locator("text=/BLC-[A-Z2-9]{6}/").first().textContent()).match(/BLC-[A-Z2-9]{6}/)[0];
  assert(!!ref, `booking created with reference ${ref} (${dayLabel.split(",")[0]} ${slotLabel})`);
  assert(await c.getByText("Request received — deposit needed").isVisible(), "customer sees pending status");
  assert(await c.getByText("£10.00 by bank transfer").isVisible(), "customer sees deposit amount + bank transfer instructions");
  await c.screenshot({ type: "jpeg", quality: 80, path: out("06-mobile-deposit-instructions.png"), fullPage: true });
  const bookingUrl = c.url().replace("&new=1", "");

  // Same slot is no longer offered
  await c.goto(`${base}/book?treatment=express-microdermabrasion`);
  await loaded();
  for (let i = 0; i < monthsAhead; i++) { await c.getByRole("button", { name: "Next month" }).click(); await loaded(); }
  const sameMonth = c.locator(`button[aria-label^="${dayLabel.split(",")[0]}"]`);
  assert((await sameMonth.count()) === 1, "same day is shown in the calendar");
  {
    if (await sameMonth.isEnabled()) {
      await sameMonth.click();
      await c.locator("text=Loading times…").waitFor({ state: "detached" }).catch(() => {});
      await c.waitForTimeout(300);
      const labels = await c.locator('button[aria-pressed]').filter({ hasText: /am|pm/ }).allTextContents();
      assert(!labels.map((s) => s.trim()).includes(slotLabel), `${slotLabel} is no longer offered to other customers`);
    } else assert(true, "day fully booked now");
  }

  // ── Owner on desktop ──
  console.log("Owner confirms the deposit");
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const o = await desk.newPage();
  o.on("pageerror", (e) => errors.push(e.message));
  await o.goto(`${base}/admin`);
  await o.fill("#password", pw);
  await o.getByRole("button", { name: "Sign in" }).click();
  await o.waitForURL(`${base}/admin`);
  await o.screenshot({ type: "jpeg", quality: 80, path: out("10-admin-overview.png"), fullPage: true });
  await o.getByText("Test Client").first().click();
  await o.getByText("Deposit received?").waitFor();
  assert(await o.getByText(ref).first().isVisible(), "owner sees the booking reference to match in her bank");
  await o.screenshot({ type: "jpeg", quality: 80, path: out("11-admin-pending-booking.png"), fullPage: true });
  await o.getByRole("button", { name: "Deposit received — confirm booking" }).click();
  await o.getByText("Deposit recorded and booking confirmed").waitFor();
  assert(await o.getByText("Deposit recorded as received").first().isVisible(), "payment status is DEPOSIT RECEIVED");
  assert(await o.locator("text=Confirmed").first().isVisible(), "booking status is CONFIRMED");
  await o.screenshot({ type: "jpeg", quality: 80, path: out("12-admin-confirmed-booking.png"), fullPage: true });

  for (const [p, f] of [["/admin/calendar?view=week", "13-admin-calendar-week.png"], ["/admin/calendar?view=month", "14-admin-calendar-month.png"], ["/admin/payments", "15-admin-payments.png"], ["/admin/treatments", "16-admin-treatments.png"], ["/admin/availability", "18-admin-availability.png"], ["/admin/settings?tab=payment", "19-admin-settings-bank.png"]]) {
    await o.goto(base + p);
    await o.waitForTimeout(400);
    await o.screenshot({ type: "jpeg", quality: 80, path: out(f), fullPage: true });
  }
  await o.goto(`${base}/admin/treatments`);
  await o.getByText("Morpheus8 Face Only").click();
  await o.getByText("Price & deposit").waitFor();
  await o.screenshot({ type: "jpeg", quality: 80, path: out("17-admin-treatment-deposit.png"), fullPage: true });

  // Email preview
  await o.goto(`${base}/admin/notifications`);
  await o.getByText(`(${ref})`).first().waitFor();
  const subjects = await o.locator("a[href^='/admin/notifications/'] p.truncate.text-sm").allTextContents();
  assert(subjects.some((s) => s.includes("confirmed")), "confirmation email generated");
  assert(subjects.some((s) => s.includes(`deposit details (${ref})`)), "deposit instructions email generated");
  await o.getByText(`deposit details (${ref})`).click();
  await o.waitForTimeout(800);
  await o.screenshot({ type: "jpeg", quality: 80, path: out("20-email-deposit-instructions.png"), fullPage: true });

  // ── Customer sees confirmation ──
  await c.goto(bookingUrl);
  assert(await c.getByText("Your appointment is confirmed").isVisible(), "customer page now shows CONFIRMED");
  await c.screenshot({ type: "jpeg", quality: 80, path: out("07-mobile-confirmed.png"), fullPage: true });

  // Public pages
  const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await pub.newPage();
  for (const [u, f] of [["/", "01-home.png"], ["/treatments", "02-treatments.png"], ["/book?treatment=lets-glow-facial", "03-book-desktop.png"]]) {
    await p.goto(base + u);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo({ top: 0, behavior: "instant" }); });
    await p.waitForTimeout(1200);
    await p.screenshot({ type: "jpeg", quality: 80, path: out(f), fullPage: true });
  }
  const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  await m.goto(base + "/");
  await m.waitForTimeout(1000);
  await m.screenshot({ type: "jpeg", quality: 80, path: out("00-mobile-home.png") });

  assert(errors.length === 0, `no browser errors (${errors.join("; ")})`);
  await browser.close();
  console.log("\nEnd-to-end journey passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
