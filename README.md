# GenLayer Contract Forge

GenLayer Contract Forge is a production-style builder workspace for reviewing intelligent contracts, preparing deploy-ready packs, and running a real occupancy monitoring workflow that can feed evidence back into a GenLayer-friendly registry flow.

Live app: https://genlayer-contract-forge.vercel.app  
Occupancy module: https://genlayer-contract-forge.vercel.app/occupancy

## Overview

This repository ships two integrated builder tools:

1. **Contract Forge**  
   A review and packaging surface for GenLayer contracts. Paste or import contract code, analyze the public surface, inspect findings, compare versions, and export a submission or deploy pack.

2. **Occupancy AI Desk**  
   A real-time people counting workflow for webcam and enterprise camera feeds. It runs browser-side detection, draws live bounding boxes, tracks occupancy thresholds, and prepares a chain-ready packet for GenLayer logging.

The project is designed as a practical GenLayer-facing workspace rather than a static showcase.

## Why this project fits GenLayer

GenLayer becomes most useful when intelligent contract logic is connected to:

- real-world input,
- auditable decision paths,
- structured deployment notes,
- and operator-friendly interfaces.

This project focuses on those exact needs:

- **Contract Forge** helps a builder clean up a contract before shipping it.
- **Occupancy AI Desk** turns a real-world physical signal, people count from a camera, into a structured packet that can be registered through a GenLayer contract flow.

## Included modules

### Contract Forge

- Contract source editor with paste/import support
- Ready-made GenLayer contract presets
- Readiness scoring and review snapshot
- Findings list with fix hints
- Patch Studio for fast structural fixes
- Network-aware deploy commands for Localnet, Studionet, and Bradbury workflow
- On-chain analysis registry command generation with report hash
- Version comparison panel
- Draft vault / save state workflow
- Deploy kit with command references
- Submission pack and deploy pack export actions

### Occupancy AI Desk

- Browser webcam mode
- Live remote frame mode through a bridge URL
- LAN / RTSP / ONVIF integration path through a local bridge
- AI-ready public camera frame demos, including Vietnam traffic/webcam sources
- In-browser COCO-SSD people detection
- Live bounding boxes on top of the camera feed
- Adjustable bridge polling cadence for LAN cameras
- Auto snapshot cadence for continuous monitoring runs
- Session operations metrics: frame health, peak occupancy, alerts, and uptime
- Threshold-based occupancy status
- Snapshot packet generation
- GenLayer command builder for registry submission

## Tech stack

- Next.js App Router
- React 19
- Tailwind CSS
- Lucide React
- TensorFlow.js
- `@tensorflow-models/coco-ssd`

## Project structure

```text
app/
  components/
    top-nav.tsx
  api/
    camera-proxy/route.ts
  occupancy/
    page.tsx
  layout.tsx
  page.tsx

contracts/
  genlayer_contract_forge.py
  occupancy_registry.py

src/
  lib/
    analyzer.ts
    occupancy.ts
    newsroom.ts

scripts/
  verify-contract.mjs
```

## Quick start

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

### Contract verification

```bash
npm run verify:contract
```

## Contract Forge workflow

### 1. Start with source

Open the **Contract Forge** tab and either:

- paste your GenLayer contract into **Contract Source**,
- import a local file,
- or load one of the included presets.

### 2. Add builder context

Fill in:

- **Project Name**
- **Preset Note**

These values are reused in the exported pack so the review remains submission-friendly.

### 3. Analyze the contract

Click **Analyze contract** to generate:

- readiness score,
- verdict,
- contract class detection,
- public view / write detection,
- findings with fix suggestions,
- deploy notes,
- and a builder handoff summary.

### 4. Compare versions

Use **Compare versions** to see the delta between the current draft and the comparison sample. This helps when you are tightening a contract before submission or deployment.

### 5. Export builder outputs

Available exports include:

- deploy pack,
- submission pack,
- report text,
- chain references,
- and bundle-style handoff artifacts.

## Occupancy AI Desk workflow

Open the **Occupancy AI Desk** tab to run real-time people counting.

### Supported camera paths

#### 1. Webcam

Use the local camera attached to the user's browser.

Best for:

- demos,
- local testing,
- laptops,
- USB webcams.

#### 2. Live bridge

Use a browser-readable image URL that continuously updates.

Best for:

- simple remote feeds,
- public demo cameras,
- public Vietnam camera frames,
- vendor systems that already expose JPEG snapshots.

#### 3. LAN / RTSP / ONVIF

Use this when the original camera feed is not directly browser-readable.

Examples:

- RTSP camera
- ONVIF camera
- NVR / DVR channel
- vendor cloud camera
- office or warehouse IP camera

In this mode, the app does not connect to raw RTSP directly from the browser. Instead, place a small local bridge between the camera and the app.

## Internal camera setup for real deployments

This is the practical enterprise path.

### What the app expects

The browser should receive a URL that returns a fresh frame repeatedly over HTTP or HTTPS, for example:

```text
http://192.168.1.20:8080/camera.jpg
http://localhost:8080/frame
https://camera-bridge.company.local/lobby/latest.jpg
```

That URL is then proxied through:

```text
/api/camera-proxy?url=...
```

The UI polls the live frame, runs people detection in the browser, and updates:

- people count,
- confidence,
- alert state,
- live overlays,
- and the GenLayer packet.

### Recommended enterprise pattern

Use one of these bridge designs:

1. **RTSP to JPEG frame bridge**  
   A small local service reads the RTSP stream and exposes the latest frame via HTTP.

2. **ONVIF snapshot bridge**  
   A service authenticates to the ONVIF camera and republishes the latest snapshot to a browser-safe URL.

3. **NVR gateway bridge**  
   A small service pulls a selected NVR channel snapshot and exposes a normalized HTTP endpoint.

4. **Vendor cloud gateway**  
   A backend service calls the vendor API, fetches the latest frame, and re-serves it to the app.

### Why the bridge is needed

Browsers do not reliably consume raw RTSP streams, and many enterprise camera systems require:

- authentication,
- LAN access,
- proprietary session handling,
- or snapshot normalization.

The bridge solves that and makes the feed usable inside a secure web app.

### Minimal bridge contract

Your bridge can be built in any language. It only needs to expose a route like:

```text
GET /camera.jpg
```

and return:

- `image/jpeg`, `image/png`, or another browser-readable image type,
- with a fresh frame on each request.

### Typical deployment examples

#### Office lobby

- Camera: Hikvision / Dahua / Uniview / Axis
- Network: internal LAN
- Bridge: local Node, Python, or Go service
- App input: `http://bridge.local/lobby.jpg`

#### Retail store people counting

- Camera: RTSP ceiling camera
- Bridge: small edge device on-site
- App input: `http://store-edge:8080/front-door.jpg`

#### Warehouse gate monitoring

- Camera: ONVIF IP camera
- Bridge: LAN relay with access control
- App input: `http://warehouse-bridge/gate-a.jpg`

## Practical operator loop

1. Connect a webcam or internal camera bridge.
2. Run live people detection in Occupancy AI Desk.
3. Watch threshold and occupancy state in real time.
4. Save a snapshot packet when an event matters.
5. Use the generated command or packet as the operator handoff into a GenLayer logging flow.

This makes the module usable for:

- office occupancy logging,
- event attendance monitoring,
- store traffic snapshots,
- queue threshold alerts,
- warehouse gate monitoring,
- branch operations evidence capture.

## Deployed chain references

### Contract Forge registry

- Network: `studionet`
- Contract: `ContractForgeRegistry`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Transaction: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`

### Occupancy registry

- Network: `studionet`
- Contract: `OccupancyRegistry`
- Address: `0xf5b52dc0cB82B410448EA0D9cCB5041d82c71621`
- Transaction: `0xfeca3c0dfd4f8f6093086251e90da0cb6863df948c646e3d3999f1ef51b5038d`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run verify:contract
```

## Production notes

- Occupancy detection currently runs in the browser for a lightweight deployment path.
- For larger enterprise rollouts, keep the camera bridge inside the private network and expose only the normalized frame endpoint to trusted users.
- The included camera proxy route helps fetch remote images safely into the app, but production teams should still apply their own authentication, network controls, and retention policy.

## Community links

- Website: https://genlayer.com/
- Docs: https://docs.genlayer.com/
- GitHub: https://github.com/genlayerlabs
- Discord: https://discord.com/invite/8Jm4v89VAu
- Telegram: https://t.me/genlayer
- X: https://x.com/genlayer

## Builder notes

This repository is intentionally shaped like a serious submission-ready builder tool:

- the UI is organized as an operator workspace,
- the contract flow exports practical artifacts,
- the occupancy flow is designed for real camera input,
- and the output is aimed at teams who need an actual GenLayer-facing workflow, not just a visual demo.
