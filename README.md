# GenLayer Contract Forge

GenLayer Contract Forge is a standalone builder tool for reviewing, scoring, and shaping GenLayer intelligent contracts before they reach Studio or Studionet.

This repo is intentionally narrow. It is not a finance dashboard, a trading terminal, or a general AI playground. It focuses on one thing:

> helping builders decide whether a GenLayer contract is structurally ready to ship.

## What It Does

- Scores a contract on determinism, GenLayer surface quality, testability, deployment clarity, and security.
- Detects core GenLayer markers such as `Depends`, `gl.Contract`, `@gl.public.view`, and `@gl.public.write`.
- Flags anti-patterns that often break deterministic execution or reduce contract safety.
- Extracts a contract profile with detected classes, public views, public writes, and blueprint tags.
- Generates a judge-friendly report, a contract skeleton, and a practical test plan.

## Why It Exists

GenLayer repos are strongest when the contract, tests, deployment path, and explanation all line up. This tool helps builders preflight that story before they publish.

It was designed after reviewing common patterns from:

- GenLayer boilerplate and deployment workflows
- utility packages that simplify contract scaffolding
- Studio/bridge style developer tooling
- contract-first apps that turn a plain idea into a deployable artifact

## Main Workflow

1. Paste or write a GenLayer contract.
2. Run Forge Analysis.
3. Review the score, findings, and profile.
4. Copy the generated skeleton or test plan.
5. Fix the contract and run the analysis again.

## What The Score Means

- `85-100`: strong candidate
- `65-84`: promising, but cleanup is needed
- `0-64`: structural work is still needed

## Score Dimensions

- Determinism
- GenLayer surface
- Tests
- Deployment
- Security

## Output

The tool returns:

- readiness score
- verdict
- score breakdown
- findings
- contract profile
- next steps
- generated skeleton
- generated test plan

## Run Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Project Structure

```text
app/            Next.js UI and analysis API
public/         visual assets
src/lib/        GenLayer analysis engine
README.md       overview and usage
```

## What The Analyzer Checks

- `# { "Depends": "py-genlayer:..." }`
- `class X(gl.Contract)`
- `@gl.public.view`
- `@gl.public.write`
- `gl.eq_principle...`
- web or LLM calls outside a consensus wrapper
- risky APIs such as `random`, `eval`, `exec`, `os.system`, and `subprocess`
- hints for tests, deployment, and documentation

## Intended Audience

- GenLayer builders
- contract reviewers
- hackathon judges
- contributors who need a serious preflight check before deployment

## Notes

- This repository is GenLayer-only.
- It is separate from any trading or finance workspace.
- No secrets are required for the local analysis flow.
