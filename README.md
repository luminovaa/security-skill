# security-skills

Two agent skills for offensive security work, packaged as a skills repo:

| Skill | Purpose |
|---|---|
| [`cve-hunt`](skills/cve-hunt/SKILL.md) | Match known CVEs to a pinned version, or audit source code for a new CVE-worthy bug |
| [`pentest`](skills/pentest/SKILL.md) | Map a target's surface, test authz/logic/injection classes, produce an evidence-backed finding list |

They are deliberately non-overlapping: `cve-hunt` owns version→advisory and source→finding, `pentest` owns identity, authorization, business logic, and exposure. `pentest` points at `cve-hunt` instead of re-deriving it.

Both ship runnable tooling — no API keys, no install step for the scripts themselves:

```bash
node skills/cve-hunt/cve.mjs finger https://example.com
node skills/cve-hunt/cve.mjs check CVE-2025-29927 15.1.0 vercel:next.js
node skills/cve-hunt/audit.mjs ./src --class rce,sqli
node skills/pentest/surface.mjs example.com --paths
```

Node 18+ (needs global `fetch` and `AbortSignal.timeout`).

## Install

Published (after pushing to GitHub):

```bash
npx skills add <owner>/security-skills -g -y
```

From a local clone — links the skill folders instead of copying, so `git pull` updates the live install:

```powershell
pwsh ./install.ps1            # Windows: directory junctions
```
```bash
./install.sh                  # macOS/Linux: symlinks
```

Either way the skills land in `~/.agents/skills/<name>` and stay single-source: edit in the repo, never in the skills folder.

## Layout

```
skills/<name>/SKILL.md      frontmatter + engagement steps
skills/<name>/*.md          reference disclosed from SKILL.md
skills/<name>/*.mjs         runnable lookup / scan helpers
tests/smoke.mjs             offline checks (syntax, fixture scan, usage paths)
.github/workflows/ci.yml    runs the smoke tests
```

## Tests

```bash
node tests/smoke.mjs          # offline; no network
node tests/smoke.mjs --online # adds one live NVD + one live crt.sh call
```

## Ground

Methodology follows the public research harnesses noted inside each skill: `ByamB4/find-cve-agent` (per-class skills, grep patterns, false-positive gates), `projectdiscovery/nuclei-templates`, `nomi-sec/PoC-in-GitHub`, `ARPSyndicate/cve-scores`. Data sources are NVD 2.0, OSV, GitHub Advisory Database, EPSS, CISA KEV (best-effort).

## Boundaries

- Read-only by default. State-changing probes are a separate, stated decision — `pentest` keeps that list apart.
- A candidate is not a finding: `cve-hunt` requires a pinned version inside an advisory range plus one observable; `pentest` requires a baseline/probe pair.
- No exploitation against a live target beyond the minimal discriminating request.