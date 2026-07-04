# GenLayer Contract Forge

GenLayer Contract Forge is a practical builder workspace for GenLayer projects.

It helps you review a contract, compare revisions, generate submission notes, prepare a deployment pack, keep a draft vault across sessions, import source files, and export a shareable bundle.

The app is intentionally focused on GenLayer only. It is not a trading dashboard, not a generic AI demo, and not a finance tool.

## What It Does

- Analyzes a GenLayer contract for deterministic structure, public surface quality, testing readiness, deployment clarity, and safety signals.
- Extracts a contract profile with detected classes, public views, public writes, and blueprint tags.
- Produces a judge-friendly report, a starter skeleton, and a test plan.
- Compares two contract versions and highlights score, method, and risk changes.
- Generates a deployment pack and a submission pack you can paste into a repo, PR, or hackathon form.
- Saves drafts locally so you can reopen work across sessions.
- Imports `.py`, `.txt`, or `.md` source files directly into the workspace.
- Exports the whole workspace as markdown or JSON for sharing with teammates and reviewers.
- Keeps the deployed Studionet registry details visible in the UI.
- Includes a live occupancy desk that counts people from a webcam feed and prepares an on-chain snapshot packet.

## Why It Exists

GenLayer repos are stronger when the contract, tests, deployment path, and explanation all line up.

This tool is meant to help builders move from a rough idea to a reviewable GenLayer artifact with less guessing and more structure.

## Main Workflow

1. Paste a contract into the editor.
2. Run analysis.
3. Review the score, findings, profile, and next steps.
4. Compare against a previous version if needed.
5. Save the draft if you want to return later.
6. Copy the deploy pack, submission pack, or full bundle.
7. Ship the cleaned contract or hand it to reviewers.

## Core Features

### Contract analysis

- Detects `Depends` markers
- Detects `gl.Contract`
- Detects `@gl.public.view` and `@gl.public.write`
- Flags risky APIs and non-deterministic patterns
- Scores the contract across five practical dimensions

### Compare mode

- Compares methods between two versions
- Compares blueprint tags
- Shows score delta and risk delta
- Helps reviewers spot regressions quickly

### Deploy pack

- Includes the contract name
- Includes the readiness score
- Includes the deployed registry address and transaction
- Includes the deploy command for Studionet
- Lists read and write methods for chain verification

### Submission pack

- Summarizes readiness in a paste-ready block
- Lists contract classes, public views, public writes, and tags
- Includes a short one-line description
- Adds follow-up notes for builders and judges

### Draft vault

- Stores the current workspace in local storage
- Lets you reopen old drafts with one click
- Keeps recent versions visible for quick handoff

### Import and export

- Import contract source from a local file
- Download the analysis report as markdown
- Download the deploy pack and submission pack separately
- Export the whole workspace as a JSON bundle

### Occupancy AI Desk

- Counts people from a live webcam feed
- Draws bounding boxes around detected people
- Keeps a snapshot history in local storage
- Builds a GenLayer command for writing occupancy state to the registry
- Supports webcam input plus bridge URLs for LAN, RTSP, ONVIF, and vendor camera snapshots

## On-Chain Registry

The Forge workspace includes a deployed GenLayer registry contract on Studionet:

- Contract: `ContractForgeRegistry`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Deployment tx: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`

The registry is already bootstrapped with an initial analysis record.

## Run Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Contract verification:

```bash
npm run verify:contract
```

## Project Structure

```text
app/            Next.js UI and analysis API
contracts/      GenLayer registry contract and deployment metadata
public/         visual assets
src/lib/        analysis engine
scripts/        verification helpers
```

## Analyzer Coverage

- GenLayer contract markers
- public read/write surface
- consensus wrapper usage
- risky API usage
- deployment readiness
- docs and test hints
- multi-version comparison
- file import/export support
- local draft persistence
- live camera occupancy monitoring

## Intended Audience

- GenLayer builders
- contract reviewers
- hackathon teams
- judges who need a fast but serious preflight view

## Notes

- This repository is GenLayer-only.
- The UI is optimized for clarity and shipping, with a white, black, and red theme.
- No secrets are required for the local analysis flow.
