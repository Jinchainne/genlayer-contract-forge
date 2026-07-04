# GenLayer Contract Forge

GenLayer Contract Forge is a practical two-surface workspace for building, reviewing, and operating GenLayer-ready tools.

- `Contract Forge` helps you inspect a contract, compare revisions, generate release notes, and prepare a judge-ready submission pack.
- `Occupancy AI Desk` turns a webcam or camera bridge into a live GenLayer occupancy workflow with snapshots, bounding boxes, and on-chain handoff packets.

The repo is intentionally GenLayer-only. It is not a trading dashboard or a generic demo shell.

## What it does

### Contract Forge

- Scores a GenLayer contract for determinism, public surface quality, testing readiness, deployment clarity, and security signals.
- Detects contract classes, public reads, public writes, and blueprint tags.
- Suggests the most likely GenLayer use case for the contract.
- Generates a release checklist before deployment.
- Produces compare notes, deploy packs, submission packs, and a full report bundle.
- Lets you import source files, save drafts locally, and export your workspace.

### Occupancy AI Desk

- Counts people from a webcam feed or a camera bridge URL.
- Draws bounding boxes around detected people in real time.
- Supports multiple saved camera stations with quick switching.
- Lets you count across the full frame or focus on the upper or lower half of the view.
- Includes curated public webcam presets for demo and smoke testing.
- Builds a GenLayer occupancy packet and register command.
- Keeps snapshot history in local storage.
- Provides a bridge guide for webcam, LAN, RTSP, ONVIF, and vendor camera snapshots.

## Screenshots

Add screenshots under:

```text
docs/screenshots/
```

Suggested files:

```text
docs/screenshots/contract-forge.png
docs/screenshots/occupancy-desk.png
docs/screenshots/camera-bridge.png
```

## Requirements

- Node.js 18 or newer
- npm
- A modern browser with webcam permission if you want to use `Occupancy AI Desk`

## Install

```bash
npm install
```

## Run locally

Start the app:

```bash
npm run dev
```

Then open the local URL shown by Next.js.

## Build

Create a production build:

```bash
npm run build
```

## Verify GenLayer contract

Run the repository contract check:

```bash
npm run verify:contract
```

## How to use the tool

### 1. Contract Forge

Open `/` and paste a GenLayer contract into the editor.

Typical workflow:

1. Choose a preset or import a `.py`, `.txt`, or `.md` file.
2. Read the score and findings.
3. Review the contract profile, public surface, and next steps.
4. Use compare mode if you want to check a previous version.
5. Copy the deploy pack or submission pack.
6. Save a draft if you want to return later.

What the outputs mean:

- `Readiness` shows a practical score for deployment and review.
- `Verdict` gives a short judgment about shipping readiness.
- `Findings` lists the main issues to fix before a judge sees the repo.
- `Recommended use case` tells you how the contract maps to a GenLayer workflow.
- `Release checklist` turns the analysis into an action list.

### 2. Occupancy AI Desk

Open `/occupancy` and choose the source mode:

- `Webcam` for the local device camera.
- `Snapshot bridge` for a camera bridge URL that returns a current JPEG frame.
- `LAN / RTSP / ONVIF` for a home or office camera exposed through a bridge.

How to use it:

1. Enter a camera label and location.
2. Select the source mode.
3. If using a bridge, paste the snapshot URL.
4. Choose a zone focus if you only want the upper or lower half of the frame.
5. Save the current settings as a station if you want to reuse them later.
6. Click `Test connection` to confirm the bridge is reachable.
7. Click `Start source` to begin detection.
8. Save snapshots or copy the GenLayer packet when you need a handoff artifact.

### Camera bridge note

Browsers do not consume raw RTSP streams directly. For RTSP, ONVIF, or vendor cloud cameras, expose a small local bridge that serves a browser-readable snapshot URL.

The bridge should:

- return one current frame at a time
- stay on the same LAN as the camera when possible
- keep auth simple
- avoid exposing camera credentials to the browser

## Output packs

### Deploy pack

The deploy pack contains:

- contract name
- readiness score
- verdict
- deploy command for Studionet
- registry address and transaction references
- read and write methods

### Submission pack

The submission pack contains:

- readiness score
- verdict
- contract classes
- public views
- public writes
- blueprint tags
- release checklist notes

### Occupancy packet

The occupancy packet contains:

- camera label
- location
- timestamp
- people count
- threshold
- alert level
- average score
- detected labels

## GenLayer deployment references

This repo includes GenLayer deployment metadata for the Forge workspace and the occupancy registry.

### Forge registry

- Contract: `ContractForgeRegistry`
- Network: `studionet`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Deployment tx: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`

### Occupancy registry

- Contract: `OccupancyRegistry`
- Network: `studionet`
- Address: `0xf5b52dc0cB82B410448EA0D9cCB5041d82c71621`
- Deployment tx: `0xfeca3c0dfd4f8f6093086251e90da0cb6863df948c646e3d3999f1ef51b5038d`

## Project structure

```text
app/            Next.js app routes and UI
contracts/      GenLayer contracts and deployment metadata
public/         visual assets
src/lib/        contract analysis and occupancy helpers
scripts/        verification helpers
```

## Scripts

```json
{
  "dev": "next dev",
  "build": "next build --webpack",
  "start": "next start",
  "lint": "next lint",
  "verify:contract": "node scripts/verify-contract.mjs"
}
```

## Notes for builders

- The UI uses a black, white, and red system for clarity and scanability.
- The code is meant to support real handoff workflows, not just screenshots.
- Keep secrets out of the repo and use environment variables for runtime credentials.
- For camera bridges, prefer an internal network endpoint or a local helper that does not expose raw camera access to the browser.

## License

No license file is included yet. Add one if you plan to open the repo publicly.
