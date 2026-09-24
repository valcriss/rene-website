#!/usr/bin/env node
// Performance budget for the client bundle (issue #53). Run after `vite build` against
// dist/client/assets: every hashed chunk whose filename starts with a budgeted prefix must stay
// under its gzip size limit, or the script exits non-zero (wired into CI, see .github/workflows/ci.yml).
//
// Budgets cover only chunks that can load on a public, SEO-relevant page (home, event detail,
// contact, legal notice) — backoffice-only chunks (event editor, admin pages, moderation) are not
// a Core Web Vitals concern for anonymous visitors and are intentionally left unbudgeted here.
// Limits are set with headroom over the current build (see docs/seo-performance.md) so this
// catches real regressions rather than nagging on normal, small fluctuations.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssets = path.resolve(__dirname, "../dist/client/assets");

const JS_BUDGETS_KB = {
  "index-": 60,
  "vue-i18n-": 55,
  "leaflet-src-": 55,
  "free-solid-svg-icons-": 35,
  "pinia-": 5,
  "Header-": 4,
  "HomePage-": 12,
  "EventDetailView-": 28,
  "EventDetailPage-": 3
};

const CSS_BUDGET_KB = 20;

const toKb = (bytes) => bytes / 1024;

const main = () => {
  let files;
  try {
    files = readdirSync(distAssets);
  } catch {
    console.error(`Bundle size check: could not read ${distAssets} — run "vite build" first.`);
    process.exit(1);
    return;
  }

  const failures = [];
  const checked = [];

  for (const file of files) {
    const filePath = path.join(distAssets, file);
    const gzipKb = toKb(gzipSync(readFileSync(filePath)).length);

    if (file.endsWith(".css")) {
      checked.push(`${file}: ${gzipKb.toFixed(1)} KB gzip (budget ${CSS_BUDGET_KB} KB)`);
      if (gzipKb > CSS_BUDGET_KB) {
        failures.push(`${file}: ${gzipKb.toFixed(1)} KB gzip > ${CSS_BUDGET_KB} KB budget`);
      }
      continue;
    }

    const prefix = Object.keys(JS_BUDGETS_KB).find((candidate) => file.startsWith(candidate));
    if (!prefix) {
      continue;
    }

    const budget = JS_BUDGETS_KB[prefix];
    checked.push(`${file}: ${gzipKb.toFixed(1)} KB gzip (budget ${budget} KB)`);
    if (gzipKb > budget) {
      failures.push(`${file}: ${gzipKb.toFixed(1)} KB gzip > ${budget} KB budget (${prefix}*)`);
    }
  }

  console.log(`Bundle size budget check — ${checked.length} chunk(s) checked:`);
  for (const line of checked) {
    console.log(`  - ${line}`);
  }

  if (failures.length > 0) {
    console.error("\nBundle size budget exceeded:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
    return;
  }

  console.log("\nAll budgeted chunks are within limits.");
};

main();
