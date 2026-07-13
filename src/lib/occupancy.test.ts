import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRegisterCommand, type OccupancySnapshot } from './occupancy';

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
