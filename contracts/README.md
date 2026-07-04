# Contracts

This folder contains the GenLayer contract deployed for the Forge tool.

## Contract

- `contracts/genlayer_contract_forge.py`
- Contract name: `ContractForgeRegistry`
- Purpose: store forge readiness summaries, profile metadata, and deployable analysis snapshots.
- Network: `studionet`
- Address: `0x3Fd8285D7188aE2A81e740c36D0cf7B23eE42Ed0`
- Deployment tx: `0x1c08c17d36fa3b55ac900d901407c56635bad56d24c894acf86735af6a12134b`

## Deploy

```bash
genlayer network studionet
genlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api
```

## Read Methods

- `project`
- `stats`
- `latest_record`

## Write Method

- `register_analysis`
