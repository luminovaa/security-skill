# security-skill

Two agent skills that turn a target into evidence-backed findings.

| Skill | Answers | Ships |
|---|---|---|
| [`cve-hunt`](skills/cve-hunt/SKILL.md) | "Does this version have known CVEs?" · "Is this code vulnerable?" | `cve.mjs`, `audit.mjs` |
| [`pentest`](skills/pentest/SKILL.md) | "Where can this app be broken into?" | `surface.mjs` |

Built for agents that run shell commands: every claim has a script behind it, every script runs offline-first, and nothing needs an API key.

[![ci](https://github.com/luminovaa/security-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/luminovaa/security-skill/actions/workflows/ci.yml)

---

## Why exactly two

The split is by **method**, not by topic. A skill costs a permanently loaded description on every turn, so a third one has to earn its place:

- `cve-hunt` matches a pinned version against advisories — or reads source and produces a new finding.
- `pentest` maps a surface, then tests identity, authorization, business logic, and exposure — the classes where real apps actually break.

They do not overlap: `pentest` points at `cve-hunt` instead of re-deriving CVE matching, and `cve-hunt` never tests a live login flow. A third skill earns existence only when it has a distinct trigger word, its own runnable artifact, and would bury the existing steps if merged (criteria in [Adding a skill](#adding-a-skill)).

---

## Install

Requires **Node 18+** (global `fetch`, `AbortSignal.timeout`).

The [`skills`](https://skills.sh) CLI is the package manager for this ecosystem: it clones the repo, finds every `SKILL.md`, and links each one into the agents on the machine.

### 1. Interactive — pick the agents and the skills

```bash
npx skills add luminovaa/security-skill
```

It detects the agents installed on the machine, then asks three things:

| Prompt | What you choose |
|---|---|
| **Scope** | project (`./.agents/skills/`) or global (`~/.agents/skills/`) |
| **Agents** | which agents to link — Claude Code, Codex, Cursor, Cline, Amp, and the rest it detected |
| **Skills** | `cve-hunt`, `pentest`, or both |

Each skill is copied once under `.agents/skills/<name>` (the universal location) and symlinked into every agent directory you selected, so one install serves all of them.

### 2. Non-interactive — scripted or CI

```bash
# both skills, global, every detected agent
npx skills add luminovaa/security-skill -g -y

# one skill only
npx skills add luminovaa/security-skill@cve-hunt -g -y

# project-local (writes ./.agents/skills, useful inside one repo)
npx skills add luminovaa/security-skill -y
```

`-g` = global instead of project, `-y` = skip the scope prompt. With no TTY the CLI falls back to **Claude Code + all skills**, which is why a CI log looks like a plain success with no questions.

Where things land:

| Mode | Files | Links |
|---|---|---|
| project | `./.agents/skills/<name>` | into each selected agent's project dir |
| global (`-g`) | `~/.agents/skills/<name>` | into each selected agent's user dir |

> Already installed here? This machine has `~/.agents/skills/cve-hunt` and `pentest` as junctions into a local clone. `npx skills add` expects a clean destination — use `install.ps1` here, and the CLI on any other machine.

### 3. From a clone — for editing the skills

`git pull` then updates the live install, because the skill folders are links into the clone:

```powershell
git clone git@github.com:luminovaa/security-skill.git
cd security-skill
pwsh ./install.ps1            # Windows: directory junctions, no admin needed
```

```bash
git clone git@github.com:luminovaa/security-skill.git
cd security-skill
./install.sh                  # macOS/Linux: symlinks
```

Both scripts refuse to overwrite a real folder at the destination and say what to move.

### 4. Manual

Copy `skills/<name>/` into your agent's skills directory. Nothing else is required — the scripts are the skill.

---

## Quick start

```bash
# fingerprint a web target: server, framework, build id, sensitive paths
node skills/cve-hunt/cve.mjs finger https://example.com

# is this exact version inside an advisory's range?
node skills/cve-hunt/cve.mjs check CVE-2025-29927 15.1.0 vercel:next.js
# → [verdict] AFFECTED at 15.1.0 (vercel:next.js >= 15.0.0 AND < 15.2.3)

# what advisories exist for a package at a version
node skills/cve-hunt/cve.mjs osv npm next 15.1.0

# scan a repo for vulnerability-class sinks
node skills/cve-hunt/audit.mjs ./src --class rce,sqli

# map a domain's public surface from certificate transparency
node skills/pentest/surface.mjs example.com --paths
```

Sample surface output — hosts grouped by IP, which is how co-hosted infrastructure becomes visible:

```
## 145.79.8.84  (4 host)
   307  -              admin.example.com [Next.js] -> /auth/sign-in
        /api/health 200
   401  kong/2.8.1     api.example.com {Supabase/Kong}
```

---

## Skill: cve-hunt

### Mode A — advisory match

For a target you cannot read, but can fingerprint.

1. **Pin the version** — headers, bundle path, `buildId`, `/api/version`, binary strings. A version without a source artifact is a guess.
2. **Collect candidates** — NVD keyword search to discover, CPE match for precision, OSV for packages, GitHub advisories for what NVD has not mirrored.
3. **Match the range** — every candidate becomes AFFECTED / NOT AFFECTED / UNKNOWN, with the advisory's range text as evidence.
4. **Confirm on the target** — one read-only observable that separates vulnerable from patched. Nothing destructive.
5. **Rank** — EPSS for exploitation probability, CISA KEV for active exploitation (best-effort; a blocked feed is reported as unverified, never as "no").

### Mode B — source audit

For a repository or package you can read.

1. Check existing advisories first; **incomplete fixes** are the highest-yield target.
2. Map the trust boundary: `audit.mjs` lists candidate sinks with a nearby-source hint.
3. Trace source → sink by hand and write the exact attacker input.
4. Pass **six gates**: reachable · attacker-controlled at the boundary · version-real · impact above current privilege · no runtime protection · reproducible.
5. Local PoC, then a disclosure report naming every line the fix must touch.

Sink classes covered: RCE, SQLi, SSRF, SSTI, XXE, deserialization, path traversal, prototype pollution, JWT, ReDoS — for JS/TS, Python, PHP, Ruby, Go, Rust.

### Commands

| Command | Purpose |
|---|---|
| `cve.mjs finger <url>` | headers, framework, build id, well-known paths |
| `cve.mjs nvd <keyword>` | discovery search |
| `cve.mjs cpe <cpe:2.3:…>` | precision search by vendor/product |
| `cve.mjs check <CVE> <version> [vendor:product]` | range verdict for your version |
| `cve.mjs osv <ecosystem> <pkg> [version]` | package advisories with `fixed:` lines |
| `cve.mjs gh <package>` | GitHub Advisory Database |
| `cve.mjs score <CVE…>` | EPSS + KEV |
| `audit.mjs <dir> [--class …] [--lang …] [--tests] [--json]` | source sink scan |

---

## Skill: pentest

An engagement loop, not a checklist.

1. **Scope** — target set, rate ceiling, and the separate list of state-changing tests. Probing and mutating stay apart.
2. **Map** — `surface.mjs` (CT-log hosts, per-host fingerprint, IP grouping), then `cve.mjs finger` per host, plus the identity model: what authorizes a request, and what each object's access check is.
3. **Rank by hazard** — two or three classes per surface, ordered by impact. Never "test everything".
4. **Probe one hypothesis at a time** — baseline request, then variant. A host that answers 401 to every path proves nothing per path.
5. **Verify and chain** — rerun from a clean session; confirm the impact exceeds what that role already has.
6. **Report** — id, class, endpoint, severity, precondition, baseline/probe evidence, fix.

Class playbooks live in [`PLAYBOOK.md`](skills/pentest/PLAYBOOK.md): identity and authorization, authentication, injection, SSRF, upload and path, business logic and payments, infrastructure exposure, rate and abuse — each with the probe, what it proves, and the false-positive shape to expect.

---

## Layout

```
skills/cve-hunt/    SKILL.md · SOURCES.md · SOURCE-AUDIT.md · cve.mjs · audit.mjs
skills/pentest/     SKILL.md · PLAYBOOK.md · surface.mjs
tests/smoke.mjs     offline checks (syntax, usage, fixture scan)
tests/fixtures/     deliberately vulnerable file the audit test scans
skills.sh.json      repo groupings shown on the skills.sh page
install.ps1         Windows junction installer
install.sh          symlink installer
```

`SKILL.md` is the entry point the agent loads; the other `.md` files are reference disclosed behind pointers, read only when a step reaches them.

---

## Tests

```bash
node tests/smoke.mjs            # offline: syntax, usage paths, fixture scan
node tests/smoke.mjs --online   # adds one live NVD call and one live fingerprint
```

CI runs the offline set only. Network assertions are flaky by nature — a test that fails because NVD is rate-limiting teaches nothing.

---

## How it decides

- **Product before CVE.** "Kong" also matches `kongreg8` and `hong_kong_tatler_society`. Vendor+product must match, or the advisory must name the product.
- **Baseline first.** Record the response to a nonexistent object before testing real ones; that is what stops catch-all redirects and 401-everything gateways from producing fake findings.
- **A candidate is not a finding.** Mode A needs a pinned version inside a range plus one observable; Mode B needs six gates and a PoC; `pentest` needs a baseline/probe pair.
- **Conditional vulnerabilities stay conditional.** "Affected" without its precondition is a false positive waiting to happen.
- **No CVE ≠ safe.** The answer is "no known CVE for this pinned version", then the stack's misconfiguration classes get their own checklist.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `403` from `services.nvd.nist.gov` | ~5 requests / 30 s without a key | wait 30 s, or use `cpe`/`osv` instead of repeated keyword searches |
| `[warn] KEV feed unavailable` | CISA blocks some cloud IPs | treat `kev=no` as unverified; that is what the warning means |
| `[fail] crt.sh tidak menjawab` | cert transparency rate limit | retry in a few minutes; the failure is explicit, not silent |
| `EPERM` / `operation not permitted` on `install.ps1` | PowerShell execution policy | `pwsh -ExecutionPolicy Bypass -File ./install.ps1` |
| `npx skills add` conflicts with an existing install | a linked folder already exists at the destination | `install.ps1` relinks; the CLI expects a clean destination |
| `node: command not found` | Node < 18 or not on PATH | install Node 18+; no dependencies to install |

---

## Adding a skill

A third skill has to pass all three, otherwise its content goes into an existing reference file:

1. A trigger word you actually type, that neither existing description covers.
2. Its own runnable artifact — not a section of an existing script.
3. Merging it would bury the existing steps rather than simply lengthen them.

Two skills with ~1000 lines of disclosed reference beats ten skills with 40 lines each.

---

## License

No license file yet. Ask before redistributing.