# GenLayer Contract Forge

GenLayer Contract Forge is a dual-workflow builder suite for **contract review and deployment operations** plus **real-world occupancy monitoring**.

It ships two connected products inside one repo:

- **Contract Forge**: a GenLayer contract preflight workspace for analysis, patching, comparison, deploy preparation, and on-chain registry handoff
- **Occupancy AI Desk**: a camera-driven people counting desk that turns live operational signals into structured, chain-ready GenLayer evidence packets

Live production:

- App: https://genlayer-contract-forge.vercel.app
- Occupancy module: https://genlayer-contract-forge.vercel.app/occupancy

## Why this exists

Most builder tools stop at one of two extremes:

- a static contract analyzer with no operational path
- or a live app demo with no serious chain workflow

This project is built to close that gap.

**Contract Forge** helps a builder move from source code to a cleaner GenLayer contract with clearer deploy notes, test scaffolds, and registry-ready metadata.

**Occupancy AI Desk** helps an operator move from a live camera signal to a structured occupancy event that can be reviewed, archived, and registered through a GenLayer contract flow.

The result is a repo that speaks to both sides of real deployment:

- builders shipping intelligent contracts
- teams operating real-world systems backed by those contracts

## Product surfaces

### 1. Contract Forge

Contract Forge is the builder-facing workspace.

Core capabilities:

- paste or import GenLayer contract source
- load working presets
- analyze public views, public writes, classes, findings, and readiness
- compare current source against a baseline
- generate deploy pack, submission pack, direct test scaffold, and README snippet
- apply structural fixes through Patch Studio
- choose target workflow by network
- prepare an on-chain `register_analysis` call for the deployed registry contract

This module is meant to feel like a serious pre-deployment desk rather than a toy analyzer.

### 2. Occupancy AI Desk

Occupancy AI Desk is the operator-facing workflow.

Core capabilities:

- run live detection from a local webcam
- connect to enterprise camera infrastructure through a browser-safe bridge URL
- detect and count people in real time
- draw live boxes over the active frame
- support region filtering and stricter public-camera filtering
- track frame cadence, session uptime, peak occupancy, and alert events
- save snapshots manually or on cadence
- generate a GenLayer packet and chain-ready register command

This module is designed for practical camera-backed monitoring, not just screenshots.

## GenLayer fit

This project is aligned with GenLayer because it focuses on three things GenLayer systems need in practice:

1. **structured decision surfaces**
2. **human-auditable operational evidence**
3. **a clean bridge between off-chain reality and on-chain state**

Contract Forge addresses the builder side of that equation.

Occupancy AI Desk addresses the operational side.

Together they form a credible workflow for:

- intelligent contract preparation
- event evidence generation
- operational review
- GenLayer registry handoff

## Architecture

### Frontend

- Next.js App Router
- React 19
- Tailwind CSS
- Lucide icons

### Detection stack

- TensorFlow.js
- `@tensorflow-models/coco-ssd`

### Server routes

- `app/api/analyze/route.ts`
- `app/api/camera-proxy/route.ts`

### Contracts

- `contracts/genlayer_contract_forge.py`
- `contracts/occupancy_registry.py`

### Shared helpers

- `src/lib/analyzer.ts`
- `src/lib/occupancy.ts`

## Repository structure

```text
app/
  api/
    analyze/route.ts
    camera-proxy/route.ts
  components/
    top-nav.tsx
  occupancy/
    page.tsx
  globals.css
  layout.tsx
  page.tsx

contracts/
  genlayer_contract_forge.py
  occupancy_registry.py
  deployment.json
  occupancy_deployment.json
  README.md

public/
  genlayer-banner.png
  genlayer-mark.svg

scripts/
  verify-contract.mjs

src/
  lib/
    analyzer.ts
    newsroom.ts
    occupancy.ts
```

## Feature summary

### Contract Forge

- contract source editor
- import and preset workflow
- readiness scoring
- findings and fix suggestions
- public method and class extraction
- baseline comparison
- draft vault
- Patch Studio
- practical template gallery for operational GenLayer flows
- direct test scaffold generation
- README snippet generation
- deploy pack and submission pack export
- target network selection
- on-chain analysis registry command generation
- deploy runbook generation

### Occupancy AI Desk

- local webcam mode
- live bridge mode
- LAN / RTSP / ONVIF operational path through a bridge
- MJPEG bridge profile for browser-safe stream delivery
- public camera demos, including Vietnam sources
- person-only filtering
- detection mode control
- alert threshold control
- frame polling cadence control
- auto snapshot cadence
- session metrics and alert metrics
- line-based entry / exit counting
- upper / lower zone rules with separate limits
- GenLayer packet generation
- on-chain occupancy register command generation

## Requirements

- Node.js 20+
- npm 10+

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 3. Create a production build locally

```bash
npm run build
npm run start
```

### 4. Verify the deployed contract integration

```bash
npm run verify:contract
```

## Contract Forge workflow

### Step 1. Load or paste a contract

Use one of the following entry points:

- paste contract source into the editor
- import a local `.py` file
- load one of the included presets

### Step 2. Run analysis

Click **Analyze contract** to generate:

- readiness score
- verdict
- detected contract classes
- public view / write surface
- findings with remediation hints
- deploy-oriented summary notes

### Step 3. Use Patch Studio

Patch Studio is the fastest path to improve builder readiness.

Available actions include:

- add missing Depends header
- add a public view scaffold
- add a public write scaffold
- load a hardened skeleton
- apply a quick fix pack
- generate a direct test scaffold
- generate a README snippet

### Step 4. Compare against a baseline

Use **Compare versions** to measure score delta and risk delta against another draft or a saved baseline.

This is useful when hardening a contract before review, deployment, or submission.

### Step 5. Prepare the deploy lane

Use the **Studio lane** and **Deploy kit** panels to:

- choose a target workflow network
- inspect deploy commands
- export deploy and submission packs
- generate a registry-ready `register_analysis` call

### Step 6. Register the result on-chain

The app generates a report hash and a chain-ready call for the deployed registry.

That gives a builder a clean handoff from analysis into a persistent GenLayer record.

## Occupancy AI Desk workflow

### Supported input modes

#### Webcam

Use the browser camera on the active device.

Best for:

- local testing
- demos
- small kiosk setups
- laptop and USB camera workflows

#### Live bridge

Use a browser-readable frame URL that continuously updates.

Best for:

- public demo sources
- remote JPEG snapshot endpoints
- light operational camera monitoring

#### LAN / RTSP / ONVIF

Use this path for internal company cameras that the browser cannot consume directly.

Best for:

- office lobbies
- retail entries
- warehouse gates
- NVR-backed camera systems
- vendor-managed IP cameras

## Internal camera setup

This is the recommended pattern for real deployments.

### Important reality check

Browsers do **not** reliably consume raw RTSP or ONVIF streams directly.

That means a production camera workflow usually looks like this:

1. camera or NVR runs inside the private network
2. a local bridge or gateway reads the source
3. the bridge exposes a browser-readable endpoint
4. Occupancy AI Desk polls that endpoint continuously
5. the app runs people detection and produces GenLayer evidence artifacts

### What the app expects

The app expects a URL that returns a fresh frame over HTTP or HTTPS, for example:

```text
http://192.168.1.20:8080/camera.jpg
http://localhost:8080/frame
https://camera-bridge.company.local/lobby/latest.jpg
```

That URL is proxied through:

```text
/api/camera-proxy?url=...
```

### Recommended bridge patterns

#### 1. RTSP to frame bridge

A lightweight local service reads an RTSP stream and exposes the latest frame as JPEG or PNG.

#### 2. ONVIF snapshot bridge

A gateway authenticates to the camera and re-serves a normalized snapshot endpoint.

#### 3. NVR channel gateway

A small service pulls a selected channel from the recorder and exposes a clean per-camera HTTP endpoint.

#### 4. Vendor cloud relay

A backend worker calls the vendor API and publishes the latest safe frame for the app.

#### 5. WebRTC gateway handoff

If your camera infrastructure already terminates in a browser-safe WebRTC gateway, expose a companion snapshot or MJPEG surface for the current app, or place a thin relay in front of it. This repo focuses on the operator desk and registry flow, while the gateway remains the transport layer.

### Minimal bridge contract

Any language is fine. The bridge only needs to expose something like:

```text
GET /camera.jpg
```

and return:

- `image/jpeg`, `image/png`, or another browser-readable image type
- a fresh frame on each request

### Practical enterprise guidance

- keep the bridge inside the same LAN as the camera or NVR
- do not expose raw camera credentials in the browser
- keep camera auth and proprietary session logic inside the bridge
- use the app as the operator desk, not as the low-level camera transport layer

## Occupancy operating model

Once the bridge is in place, the desk can be used as a lightweight real operations console:

1. connect a webcam or camera bridge
2. choose a region and detection mode
3. set the threshold
4. tune polling cadence
5. monitor count, peak occupancy, and alert events
6. save snapshots manually or automatically
7. export the packet or copy the register command for GenLayer

Suitable real-world use cases:

- office occupancy logging
- event attendance snapshots
- queue pressure monitoring
- branch operations evidence capture
- retail footfall snapshots
- warehouse entry monitoring

## Chain references

### Contract Forge registry

- Network: `studionet`
- Contract: `ContractForgeRegistry`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Transaction: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`
- RPC: `https://studio.genlayer.com/api`

### Occupancy registry

- Network: `studionet`
- Contract: `OccupancyRegistry`
- Address: `0xf5b52dc0cB82B410448EA0D9cCB5041d82c71621`
- Transaction: `0xfeca3c0dfd4f8f6093086251e90da0cb6863df948c646e3d3999f1ef51b5038d`
- RPC: `https://studio.genlayer.com/api`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run verify:contract
```

## Deployment

### GitHub

The primary branch is deployed through Vercel and is suitable for a simple web delivery model.

### Vercel

Typical production deploy:

```bash
vercel --prod
```

### GenLayer

The app does not deploy contracts automatically from the browser.

Instead, it prepares the exact artifacts and command surfaces needed for a builder or operator to:

- review
- patch
- verify
- deploy
- and register outputs on-chain

## Security and operational notes

- Occupancy detection currently runs client-side for a lightweight operational workflow
- raw RTSP and ONVIF should stay behind a trusted bridge
- production teams should still apply their own access control, retention policy, and network restrictions
- public webcam sources are included for demos and smoke tests, not for private production monitoring

## Community

- Website: https://genlayer.com/
- Docs: https://docs.genlayer.com/
- GitHub: https://github.com/genlayerlabs
- Discord: https://discord.com/invite/8Jm4v89VAu
- Telegram: https://t.me/genlayer
- X: https://x.com/genlayer

## Final note

This repository is intentionally built as a serious builder tool, not a marketing shell.

Its goal is to make GenLayer workflows more legible and more operational:

- cleaner contract shipping
- better deploy handoff
- clearer evidence packets
- and a stronger bridge between real-world events and chain-side registration
