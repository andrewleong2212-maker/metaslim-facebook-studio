import { expect, test } from "@playwright/test";

test("dashboard exposes honest disconnected states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Facebook API 尚未连接")).toBeVisible();
  await expect(page.getByText("还没有已验证的 Malaysia 趋势")).toBeVisible();
});

test("research form validates URL and creates a local prompt", async ({ page }) => {
  await page.goto("/facebook-research");
  await page.getByPlaceholder("https://www.facebook.com/...").fill("https://www.facebook.com/metaslim");
  await page.getByRole("button", { name: /生成 Codex/ }).click();
  await expect(page.getByText(/不要推断全马 Organic Trending/)).toBeVisible();
});
