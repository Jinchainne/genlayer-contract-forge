# GenLayer Contract Forge

GenLayer Contract Forge is a GenLayer-only builder workspace for two real workflows:

- `Contract Forge` for reviewing, comparing, and packaging GenLayer contracts before deployment.
- `Occupancy AI Desk` for counting people from a webcam, a local bridge, or an internal AI camera feed and turning the result into a GenLayer-ready occupancy packet.

The repo is intentionally focused on GenLayer. It is not a generic dashboard or a trading shell.

## What this tool does

### Contract Forge

- Scores a GenLayer contract for determinism, public surface quality, testing readiness, deployment clarity, and security signals.
- Detects contract classes, public reads, public writes, and blueprint tags.
- Compares revisions and highlights meaningful changes.
- Generates deploy packs, submission packs, and release checklists.
- Saves drafts locally for iterative builder workflows.

### Occupancy AI Desk

- Counts people live from a webcam or from a live camera bridge URL.
- Draws bounding boxes around detected people in real time.
- Supports saved camera stations and quick switching.
- Supports counting across the full frame or only the upper or lower half.
- Generates a GenLayer occupancy packet and register command.
- Keeps recent snapshots in local storage.
- Includes public demo cameras for smoke tests and UI validation.

## Internal AI camera setup

This is the part to use for a real office, store, warehouse, or branch camera.

Browsers do not read RTSP directly. For internal AI cameras, the recommended setup is:

1. Keep the camera on your internal LAN.
2. Expose a small bridge service that returns a browser-readable live frame.
3. Point `Occupancy AI Desk` at that live frame URL.
4. Use the built-in `Test connection` button before starting detection.

### Supported internal camera patterns

- Webcam on the same machine running the browser.
- RTSP camera exposed through a local bridge.
- ONVIF camera exposed through a local bridge.
- Vendor AI camera or NVR that provides a live frame or snapshot endpoint.

### Recommended bridge contract

The bridge should:

- return one current frame as a JPEG or PNG
- stay on the same LAN as the camera when possible
- keep authentication inside the network
- avoid exposing raw camera credentials to the browser
- refresh often enough to support near real-time occupancy checks

### Example bridge flow

If your camera system already exposes a live frame or current-image URL, use it directly:

```text
https://camera-lan.local/snapshot.jpg
```

If your camera only exposes RTSP or ONVIF, place a small helper in front of it that converts the stream into a browser-readable live frame URL.

Typical patterns:

- NVR live frame endpoint
- Home Assistant camera image endpoint
- Frigate / Shinobi / Agent DVR live frame endpoint
- A custom internal gateway that polls RTSP and serves `/camera.jpg`

### How to connect it in the app

1. Open `/occupancy`.
2. Select `Live bridge` or `LAN / RTSP / ONVIF`.
3. Paste the bridge URL into `Live camera URL`.
4. Click `Test connection`.
5. Click `Start source`.
6. Save the station if you want to reuse that camera later.

### Practical note

If you need enterprise usage, treat the bridge as the integration point and keep the camera itself private on the LAN. That gives you a stable browser-facing endpoint without making the camera directly public.

## Requirements

- Node.js 18 or newer
- npm
- A browser with webcam permission if you want to test `Webcam` mode

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Then open the local URL printed by Next.js.

## Build

```bash
npm run build
```

## Verify the GenLayer contract pack

```bash
npm run verify:contract
```

## How to use Contract Forge

1. Open `/`.
2. Paste or import a GenLayer contract.
3. Review the readiness score and findings.
4. Check the contract profile and public surface.
5. Compare a newer draft against a previous version if needed.
6. Copy the deploy pack or submission pack.
7. Save a draft when you want to return later.

### What the output means

- `Readiness` is a practical preflight score.
- `Verdict` is the short shipping judgment.
- `Findings` lists issues that deserve attention before review.
- `Recommended use case` maps the contract to a likely GenLayer workflow.
- `Release checklist` turns the review into a deployment plan.

## How to use Occupancy AI Desk

1. Open `/occupancy`.
2. Choose a source mode:
   - `Webcam` for the local machine camera
   - `Live bridge` for a browser-readable camera frame
   - `LAN / RTSP / ONVIF` for camera systems behind a bridge
3. Enter a camera label and location.
4. Set the counting threshold.
5. Pick `Full frame`, `Upper zone`, or `Lower zone`.
6. Test the connection if you are using a bridge.
7. Start the source.
8. Save the snapshot or copy the GenLayer packet when you need a handoff artifact.

## Output packs

### Deploy pack

Contains:

- contract name
- readiness score
- verdict
- deployment command
- registry address and transaction references
- read and write methods

### Submission pack

Contains:

- readiness score
- verdict
- contract classes
- public views
- public writes
- blueprint tags
- release checklist notes

### Occupancy packet

Contains:

- camera label
- location
- timestamp
- people count
- threshold
- alert level
- average score
- detected labels

## GenLayer deployment references

This repo ships with deployment metadata for both surfaces.

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
public/         brand assets and screenshots
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

- Keep secrets out of the repository.
- Keep internal camera credentials on the LAN-side bridge, not in the browser.
- For business use, prefer a stable live frame endpoint over direct stream access.
- The UI is designed as a working product surface, not a landing page.
