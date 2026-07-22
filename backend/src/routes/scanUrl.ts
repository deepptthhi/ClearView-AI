import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type { Request, Response } from "express";
import { chromium } from "playwright";
import { assertScannableUrl } from "../lib/urlGuard.js";
import { normalizeResults, type RawAxeResults } from "../lib/normalize.js";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8");

const NAV_TIMEOUT_MS = 30_000;

export async function scanUrlHandler(req: Request, res: Response) {
  const { url } = req.body ?? {};

  if (typeof url !== "string" || url.trim().length === 0) {
    return res.status(400).json({ error: "Request body must include a non-empty \"url\" string." });
  }

  let target: URL;
  try {
    target = assertScannableUrl(url.trim());
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL." });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (compatible; ClearViewA11yAuditor/1.0; +https://github.com/) Playwright",
    });
    const page = await context.newPage();

    await page.goto(target.toString(), {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });

    await page.addScriptTag({ content: AXE_SOURCE });

    const raw = await page.evaluate<RawAxeResults>(
      // @ts-expect-error axe is injected into the page's global scope above
      () => window.axe.run(document, { resultTypes: ["violations", "passes"] }),
    );

    const summary = normalizeResults(raw, target.toString());
    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while scanning the URL.";
    const isTimeout = message.toLowerCase().includes("timeout");
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "The page took too long to load. Some sites block automated browsers or rely on very slow scripts."
        : `Couldn't load or scan that page: ${message}`,
    });
  } finally {
    await browser?.close();
  }
}
