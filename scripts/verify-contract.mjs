import { execSync } from 'child_process';
import fs from 'fs';

const deployment = JSON.parse(fs.readFileSync(new URL('../contracts/deployment.json', import.meta.url), 'utf8'));
const address = deployment.address;

function call(method) {
  return execSync(`genlayer call ${address} ${method}`, { encoding: 'utf8' });
}

const project = call('project');
const stats = call('stats');
const latest = call('latest_record');

if (!project.includes('GenLayer Contract Forge')) throw new Error('project() verification failed');
if (!stats.includes('analyses=1')) throw new Error('stats() verification failed');
if (!latest.includes('forge-bootstrap-2026-07-04')) throw new Error('latest_record() verification failed');

console.log(`Contract verified: ${address}`);
