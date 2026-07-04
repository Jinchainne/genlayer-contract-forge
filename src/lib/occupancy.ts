export type OccupancyDetection = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

export type OccupancySnapshot = {
  title: string;
  location: string;
  cameraName: string;
  count: number;
  threshold: number;
  avgScore: number;
  alertLevel: 'NORMAL' | 'WATCH' | 'ALERT';
  timestamp: string;
  labels: string[];
};

export function occupancyStatus(count: number, threshold: number) {
  if (count > threshold) {
    return { level: 'ALERT' as const, label: 'Over capacity', tone: 'red' as const };
  }
  if (count === threshold) {
    return { level: 'WATCH' as const, label: 'At threshold', tone: 'amber' as const };
  }
  return { level: 'NORMAL' as const, label: 'Within limit', tone: 'green' as const };
}

export function buildOccupancyPacket(snapshot: OccupancySnapshot) {
  return [
    `# Occupancy Snapshot: ${snapshot.title}`,
    '',
    `Camera: ${snapshot.cameraName}`,
    `Location: ${snapshot.location}`,
    `Timestamp: ${snapshot.timestamp}`,
    `People count: ${snapshot.count}`,
    `Threshold: ${snapshot.threshold}`,
    `Alert level: ${snapshot.alertLevel}`,
    `Average score: ${snapshot.avgScore.toFixed(2)}`,
    '',
    '## Labels',
    snapshot.labels.length ? snapshot.labels.map(label => `- ${label}`).join('\n') : '- none',
    '',
    '## GenLayer Note',
    'Use this packet as a human-readable proof of occupancy state before writing to the on-chain registry.',
  ].join('\n');
}

export function buildRegisterCommand(snapshot: OccupancySnapshot, registryAddress = '<OCCUPANCY_REGISTRY_ADDRESS>') {
  return [
    `genlayer call ${registryAddress} register_snapshot \\`,
    `  --camera-name "${snapshot.cameraName.replace(/"/g, '\\"')}" \\`,
    `  --location "${snapshot.location.replace(/"/g, '\\"')}" \\`,
    `  --title "${snapshot.title.replace(/"/g, '\\"')}" \\`,
    `  --count ${snapshot.count} \\`,
    `  --threshold ${snapshot.threshold} \\`,
    `  --avg-score ${snapshot.avgScore.toFixed(2)} \\`,
    `  --alert-level "${snapshot.alertLevel}" \\`,
    `  --timestamp "${snapshot.timestamp}"`,
  ].join('\n');
}
