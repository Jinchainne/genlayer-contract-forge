export type OccupancyDetection = {
  class: string;
  score: number;
  bbox: [number, number, number, number];
};

export type OccupancySnapshot = {
  title: string;
  location: string;
  cameraName: string;
  region?: string;
  count: number;
  threshold: number;
  avgScore: number;
  alertLevel: 'NORMAL' | 'WATCH' | 'ALERT';
  timestamp: string;
  labels: string[];
  entryCount?: number;
  exitCount?: number;
  upperZoneCount?: number;
  lowerZoneCount?: number;
  upperZoneStatus?: 'NORMAL' | 'WATCH' | 'ALERT';
  lowerZoneStatus?: 'NORMAL' | 'WATCH' | 'ALERT';
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
    snapshot.region ? `Region: ${snapshot.region}` : null,
    `Location: ${snapshot.location}`,
    `Timestamp: ${snapshot.timestamp}`,
    `People count: ${snapshot.count}`,
    `Threshold: ${snapshot.threshold}`,
    `Alert level: ${snapshot.alertLevel}`,
    `Average score: ${snapshot.avgScore.toFixed(2)}`,
    snapshot.entryCount !== undefined ? `Entries: ${snapshot.entryCount}` : null,
    snapshot.exitCount !== undefined ? `Exits: ${snapshot.exitCount}` : null,
    snapshot.upperZoneCount !== undefined ? `Upper zone count: ${snapshot.upperZoneCount}` : null,
    snapshot.upperZoneStatus ? `Upper zone status: ${snapshot.upperZoneStatus}` : null,
    snapshot.lowerZoneCount !== undefined ? `Lower zone count: ${snapshot.lowerZoneCount}` : null,
    snapshot.lowerZoneStatus ? `Lower zone status: ${snapshot.lowerZoneStatus}` : null,
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
    `  --people-count ${snapshot.count} \\`,
    `  --threshold ${snapshot.threshold} \\`,
    `  --avg-score ${snapshot.avgScore.toFixed(2)} \\`,
    `  --alert-level "${snapshot.alertLevel}" \\`,
    `  --timestamp "${snapshot.timestamp}" \\`,
    `  --labels "${snapshot.labels.join(', ').replace(/"/g, '\\"')}"`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildBridgeGuide(sourceName: string, sourceUrl: string) {
  return [
    '# Occupancy Camera Bridge',
    '',
    `Source: ${sourceName}`,
    `Live Frame URL: ${sourceUrl || '<camera-bridge-url>'}`,
    '',
    '## Recommended setup',
    '- For webcam: use the browser directly.',
    '- For RTSP / ONVIF / vendor cloud cameras: expose a local live frame endpoint through a small bridge.',
    '- Keep the bridge on the same LAN as the camera for lower latency and simpler auth.',
    '',
    '## Expected behavior',
    '- The bridge should return a single current frame.',
    '- The app will poll that frame continuously, draw boxes, and create a GenLayer snapshot packet.',
    '- If you need people-only or zone-only counting, crop or segment the frame in the bridge before sending it to the app.',
    '- Use the packet or register command as the handoff artifact.',
    '',
    '## Enterprise notes',
    '- Browser apps do not read raw RTSP or ONVIF directly. Use a LAN bridge, NVR snapshot endpoint, or gateway that exposes JPEG/PNG/MJPEG/WebRTC.',
    '- For office or retail deployments, keep the bridge on the same network as the camera to reduce latency and avoid public exposure.',
    '- Polling a live frame endpoint is suitable for continuous occupancy monitoring when full browser video transport is unavailable.',
  ].join('\n');
}
