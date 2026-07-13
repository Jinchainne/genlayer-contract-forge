import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRegisterCommand, type OccupancySnapshot } from './occupancy';

function extractFlags(command: string) {
  return command
    .split('\n')
    .slice(1)
    .map(line => line.trim().replace(/\\$/, '').trim())
    .filter(Boolean)
    .map(line => line.match(/^--([a-z-]+)\s+/)?.[1] ?? '');
}

test('buildRegisterCommand maps snapshot fields to register_snapshot parameters', () => {
  const snapshot: OccupancySnapshot = {
    title: 'Lobby snapshot',
    location: 'Main entrance',
    cameraName: 'Lobby Cam',
    region: 'Upper zone',
    count: 7,
    threshold: 5,
    avgScore: 0.875,
    alertLevel: 'ALERT',
    timestamp: '2026-07-13T06:22:00.000Z',
    labels: ['1. person 98%', '2. person 91%'],
  };

  const command = buildRegisterCommand(snapshot, '0xabc');

  assert.match(command, /^genlayer call 0xabc register_snapshot \\/m);
  assert.match(command, /--camera-name "Lobby Cam"/);
  assert.match(command, /--location "Main entrance"/);
  assert.match(command, /--title "Lobby snapshot"/);
  assert.match(command, /--people-count 7/);
  assert.match(command, /--threshold 5/);
  assert.match(command, /--avg-score 0\.88/);
  assert.match(command, /--alert-level "ALERT"/);
  assert.match(command, /--timestamp "2026-07-13T06:22:00.000Z"/);
  assert.match(command, /--labels "1\. person 98%, 2\. person 91%"/);
  assert.doesNotMatch(command, /--count\b/);
  assert.doesNotMatch(command, /--region\b/);
});

test('buildRegisterCommand emits the exact register_snapshot argument set', () => {
  const snapshot: OccupancySnapshot = {
    title: 'Floor snapshot',
    location: 'Warehouse gate',
    cameraName: 'Gate Cam 02',
    region: 'Lower zone',
    count: 3,
    threshold: 6,
    avgScore: 0.731,
    alertLevel: 'NORMAL',
    timestamp: '2026-07-13T07:00:00.000Z',
    labels: ['1. person 88%'],
  };

  const command = buildRegisterCommand(snapshot, '0xdef');
  const flags = extractFlags(command);

  assert.deepEqual(flags, [
    'camera-name',
    'location',
    'title',
    'people-count',
    'threshold',
    'avg-score',
    'alert-level',
    'timestamp',
    'labels',
  ]);
});
