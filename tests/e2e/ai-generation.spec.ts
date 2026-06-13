import { expect, test } from "@playwright/test";

/**
 * STEP 4 E2E — AI generation flow.
 * Login-dependent tests need real Supabase staging credentials and are skipped
 * unless E2E_EMAIL/E2E_PASSWORD are set. Real OpenAI calls only when
 * RUN_OPENAI_SMOKE_TEST=true (never in CI/PR).
 */
const HAS_AUTH = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const RUN_SMOKE = process.env.RUN_OPENAI_SMOKE_TEST === "true";

test("content generator page renders without secrets in client bundle", async ({ page }) => {
  const responses: string[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/_next/static/") && url.endsWith(".js")) {
      try { responses.push(await res.text()); } catch { /* ignore */ }
    }
  });
  await page.goto("/content-generator");
  await expect(page.getByRole("heading", { name: "Content Generator" })).toBeVisible();
  const bundle = responses.join("");
  expect(bundle).not.toContain("OPENAI_API_KEY=");
  expect(bundle).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  expect(bundle).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(bundle).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
});

test("generator shows honest unconfigured state without OpenAI env", async ({ page }) => {
  test.skip(Boolean(process.env.OPENAI_API_KEY), "OpenAI configured — unconfigured-state test not applicable");
  await page.goto("/content-generator");
  await expect(page.getByText(/OpenAI尚未配置|尚未加入Workspace|登录/).first()).toBeVisible();
});

test.describe("authenticated AI flow", () => {
  test.skip(!HAS_AUTH, "E2E_EMAIL/E2E_PASSWORD not set — staging-only tests");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
    await page.getByLabel(/password|密码/i).fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: /登录|login/i }).click();
    await page.waitForURL("/");
  });

  test("select AIDA, generate 3 hooks, land as AI Draft with panels", async ({ page }) => {
    test.skip(!RUN_SMOKE, "RUN_OPENAI_SMOKE_TEST!=true — no real API spend in CI");
    await page.goto("/content-generator");
    await page.locator("select").nth(4).selectOption("aida");
    await page.getByPlaceholder("例如：SLIM").fill("SLIM");
    await page.getByPlaceholder(/外食族晚餐/).fill("E2E真实冒烟测试：上班族嘴馋");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.getByText(/AI Draft已保存/)).toBeVisible({ timeout: 300000 });
    await page.goto("/script-studio");
    await expect(page.getByText("最新AI Draft")).toBeVisible();
    await expect(page.getByText("Hook方案（3组）")).toBeVisible();
    await expect(page.getByText("Quality Gate")).toBeVisible();
    await expect(page.getByText("Compliance")).toBeVisible();
    await expect(page.getByText("Duplicate Guard")).toBeVisible();
  });

  test("regenerate creates a new version", async ({ page }) => {
    test.skip(!RUN_SMOKE, "RUN_OPENAI_SMOKE_TEST!=true");
    await page.goto("/script-studio");
    const before = await page.getByText(/^v\d+/).first().textContent();
    await page.getByRole("button", { name: "Hook" }).click();
    await expect(page.getByText(/已建立新Version/)).toBeVisible({ timeout: 300000 });
    await page.reload();
    const after = await page.getByText(/^v\d+/).first().textContent();
    expect(after).not.toBe(before);
  });
});
