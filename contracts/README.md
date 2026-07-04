# Contracts

This folder contains the GenLayer registry contract used by the Forge workspace.

## Contract

- File: `contracts/genlayer_contract_forge.py`
- Contract name: `ContractForgeRegistry`
- Purpose: store forge readiness summaries, profile metadata, and deployable analysis snapshots
- Network: `studionet`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Deployment tx: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`

The registry already contains a bootstrap analysis record, so the chain state is not empty.

## Deploy

```bash
genlayer network studionet
genlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api
```

## Verify

```bash
npm run verify:contract
```

## Read Methods

- `project`
- `stats`
- `latest_record`

## Write Method

- `register_analysis`

## Occupancy Registry

- File: `contracts/occupancy_registry.py`
- Contract name: `OccupancyRegistry`
- Purpose: store live camera occupancy snapshots and expose the latest count, alert level, and timestamp
- Network: `studionet`
- Address: `0xf5b52dc0cB82B410448EA0D9cCB5041d82c71621`
- Deployment tx: `0xfeca3c0dfd4f8f6093086251e90da0cb6863df948c646e3d3999f1ef51b5038d`

The registry has already been bootstrapped with a sample snapshot record.
