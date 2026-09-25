#!/usr/bin/env node
// Local/pre-release SEO & accessibility audit (issue #58) — run manually (`npm run lighthouse -w
// frontend`) before a release, per docs/seo-release-checklist.md. Deliberately NOT wired into
// required CI: Performance scores are timing/CPU-dependent and noisy on a shared runner, which is
// exactly the "seuil arbitraire instable" the issue asks to avoid. The actual CI-blocking
// regression gate for markup correctness is the deterministic test suite
// (frontend/tests/seoRegression.test.ts), which asserts the same essential elements (title,
// description, canonical, Open Graph, JSON-LD, a single H1) without any browser or timing
// involved. This script complements it with real browser-rendered Lighthouse scores for the
// categories that ARE structural rather than timing-based (SEO, Accessibility, Best Practices) —
// Performance is measured and printed, never asserted on.
//
// Starts the backend in its normal dev mode (in-memory repository, no database or secrets
// required — same mode `npm run dev -w backend` uses) so this needs no infrastructure beyond
// Node and a local Chrome/Chromium install.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
// backend/src/static.ts serves this directory unconditionally (even in dev mode, where the actual
// page markup instead comes live from source via Vite's SSR middleware) — it must exist or the
// very first request throws.
const clientDistIndex = path.join(repoRoot, "frontend/dist/client/index.html");

// Structural categories only — no numeric Performance budget here (see header comment). Set with
// headroom over a clean baseline; a drop below these on pages that shouldn't have regressed is a
// real markup/accessibility defect, not runner noise.
const CATEGORY_BUDGETS = {
  seo: 0.95,
  accessibility: 0.9,
  "best-practices": 0.9
};

const PAGES_TO_AUDIT = ["/", "/agenda/ce-week-end"];

const waitForServer = (child) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for the backend dev server to start.")), 60_000);
    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[backend] ${text}`);
      if (text.includes("API listening on")) {
        clearTimeout(timeout);
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (chunk) => process.stderr.write(`[backend] ${chunk}`));
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Backend dev server exited early (code ${code}).`));
    });
  });

const startBackend = () =>
  // Plain ts-node (not `npm run dev`'s ts-node-dev watcher) — a one-shot audit needs no file
  // watcher, and this keeps the process tree this script has to manage down to one child.
  spawn("npx", ["ts-node", "--transpile-only", "src/index.ts"], {
    cwd: path.join(repoRoot, "backend"),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "development" },
    detached: true
  });

const stopBackend = (child) => {
  if (child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone — nothing to clean up.
    }
  }
};

const auditPage = async (chrome, pathname) => {
  const runnerResult = await lighthouse(
    `${BASE_URL}${pathname}`,
    { port: chrome.port, output: "json", logLevel: "error" },
    { extends: "lighthouse:default", settings: { onlyCategories: ["seo", "accessibility", "best-practices", "performance"] } }
  );

  const { categories } = runnerResult.lhr;
  return Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.score]));
};

const main = async () => {
  if (!existsSync(clientDistIndex)) {
    console.error(`Lighthouse audit: could not find ${clientDistIndex} — run "npm run build -w frontend" first.`);
    process.exitCode = 1;
    return;
  }

  const backend = startBackend();
  let chrome;
  const failures = [];

  try {
    await waitForServer(backend);

    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] });

    for (const pathname of PAGES_TO_AUDIT) {
      console.log(`\nAuditing ${pathname}...`);
      const scores = await auditPage(chrome, pathname);

      for (const [category, score] of Object.entries(scores)) {
        const percent = Math.round(score * 100);
        const budget = CATEGORY_BUDGETS[category];
        const budgetLabel = budget ? ` (budget ${Math.round(budget * 100)})` : " (measured only, no budget)";
        console.log(`  - ${category}: ${percent}${budgetLabel}`);

        if (budget && score < budget) {
          failures.push(`${pathname} — ${category}: ${percent} < ${Math.round(budget * 100)}`);
        }
      }
    }
  } finally {
    if (chrome) {
      await chrome.kill();
    }
    stopBackend(backend);
  }

  if (failures.length > 0) {
    console.error("\nLighthouse budget exceeded:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nAll budgeted Lighthouse categories are within limits.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
