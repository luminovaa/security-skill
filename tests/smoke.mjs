#!/usr/bin/env node
// Offline smoke tests for both skills. `--online` adds one NVD and one crt.sh call.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const online = process.argv.includes("--online");
const node = process.execPath;
let failed = 0;

const run = (args, expectCode = 0) => {
  try {
    const out = execFileSync(node, args, { cwd: root, encoding: "utf8", timeout: 90_000, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail.slice(0, 300)}`}`);
  if (!ok) failed++;
};

// 1. syntax
for (const f of ["skills/cve-hunt/cve.mjs", "skills/cve-hunt/audit.mjs", "skills/pentest/surface.mjs"]) {
  const r = run(["--check", f]);
  check(`syntax ${f}`, r.code === 0, r.out);
}

// 2. usage paths exit non-zero where they should
{
  const r = run(["skills/cve-hunt/cve.mjs"]);
  check("cve.mjs without args prints usage", /usage:/.test(r.out), r.out);
  const s = run(["skills/pentest/surface.mjs"]);
  check("surface.mjs without args exits 1", s.code === 1 && /usage:/.test(s.out), s.out);
}

// 3. audit finds the fixture's four sink classes
{
  const r = run(["skills/cve-hunt/audit.mjs", "tests/fixtures/sinks", "--json"]);
  let hits = [];
  try { hits = JSON.parse(r.out); } catch {}
  const classes = new Set(hits.map((h) => h.cls));
  check("audit parses fixture", Array.isArray(hits) && hits.length >= 4, r.out.slice(0, 200));
  check("audit finds rce", classes.has("rce"), [...classes].join(","));
  check("audit finds sqli", classes.has("sqli"), [...classes].join(","));
  check("audit finds path", classes.has("path"), [...classes].join(","));
  const tainted = hits.filter((h) => h.taint).length;
  check("audit flags nearby input source", tainted >= 3, `tainted=${tainted}`);
}

// 4. audit ignores fixtures unless --tests
{
  const r = run(["skills/cve-hunt/audit.mjs", "skills"]);
  check("audit skips nothing unexpected on a clean tree", !/FAIL/.test(r.out) && /\[audit\]/.test(r.out), r.out);
}

if (online) {
  const nvd = run(["skills/cve-hunt/cve.mjs", "check", "CVE-2025-29927", "15.1.0", "vercel:next.js"]);
  check("online: NVD marks 15.1.0 affected", /AFFECTED/.test(nvd.out), nvd.out);
  const fp = run(["skills/cve-hunt/cve.mjs", "finger", "https://example.com"]);
  check("online: finger returns a fingerprint", /\[url\]/.test(fp.out), fp.out);
}

console.log(failed ? `\n${failed} failed` : "\nall good");
process.exit(failed ? 1 : 0);