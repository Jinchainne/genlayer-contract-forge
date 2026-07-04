'use client';

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Globe,
  Link2,
  Play,
  Plus,
  ShieldCheck,
  Square,
  Trash2,
  MapPinned,
  Users,
} from 'lucide-react';
import occupancyDeployment from '../../contracts/occupancy_deployment.json';
import { buildBridgeGuide, buildOccupancyPacket, buildRegisterCommand, occupancyStatus, type OccupancyDetection, type OccupancySnapshot } from '../../src/lib/occupancy';
import TopNav from '../components/top-nav';

type SavedSnapshot = OccupancySnapshot & { id: string };
type CameraMode = 'webcam' | 'snapshot' | 'bridge';
type ConnectionState = 'idle' | 'testing' | 'ready' | 'error';
type RegionMode = 'full' | 'upper' | 'lower';
type StationProfile = {
  id: string;
  label: string;
  mode: CameraMode;
  sourceUrl: string;
  location: string;
  threshold: number;
  region: RegionMode;
};

const STORAGE_KEY = 'genlayer-occupancy-desk:v1';
const DEFAULT_STATION_ID = 'default-station';
const PUBLIC_CAMERAS = [
  {
    id: 'washington-monument',
    name: 'Washington Monument',
    location: 'Washington, DC',
    sourceUrl: 'https://www.earthcam.com/cams/includes/image.php?logo=0&playbutton=1&s=1&img=NGjLGGtpwbufJGuATXQhWQ%3D%3D&202607040700',
    pageUrl: 'https://www.earthcam.com/usa/dc/washingtonmonument/',
  },
  {
    id: 'abbey-road',
    name: 'Abbey Road',
    location: 'London, England',
    sourceUrl: 'https://www.earthcam.com/cams/includes/image.php?logo=0&playbutton=1&s=1&img=qNvv42vqjNEKe80k0mCm0w%3D%3D&202607040700',
    pageUrl: 'https://www.earthcam.com/world/england/london/abbeyroad/',
  },
  {
    id: 'bourbon-street',
    name: 'Bourbon Street',
    location: 'New Orleans, Louisiana',
    sourceUrl: 'https://www.earthcam.com/cams/includes/image.php?logo=0&playbutton=1&s=1&img=N8RUAQGBH7drZ4LlKEGtVw%3D%3D&202607040700',
    pageUrl: 'https://www.earthcam.com/usa/louisiana/neworleans/bourbonstreet/',
  },
  {
    id: 'san-francisco',
    name: 'San Francisco Bay',
    location: 'San Francisco, California',
    sourceUrl: 'https://www.earthcam.com/cams/includes/image.php?logo=0&playbutton=1&s=1&img=qvXEewsDItjfme6%2BYcScww%3D%3D&202607040700',
    pageUrl: 'https://www.earthcam.com/cams/california/sanfrancisco/',
  },
  {
    id: 'niagara-falls',
    name: 'Niagara Falls',
    location: 'Ontario, Canada',
    sourceUrl: 'https://www.earthcam.com/cams/includes/image.php?logo=0&playbutton=1&s=1&img=EwPAynde%2BEMWfS37IbkAKA%3D%3D&202607040700',
    pageUrl: 'https://www.earthcam.com/canada/niagarafalls/',
  },
] as const;

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,27,0.94),rgba(6,10,18,0.98))] p-5 shadow-[0_20px_54px_rgba(0,0,0,0.34)] ${className}`}>{children}</section>;
}

function ActionButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-white/60">{hint}</p> : null}
    </div>
  );
}

function regionLabel(region: RegionMode) {
  if (region === 'upper') return 'Upper zone';
  if (region === 'lower') return 'Lower zone';
  return 'Full frame';
}

function isDetectionInRegion(box: [number, number, number, number], region: RegionMode, frameHeight: number) {
  if (region === 'full') return true;
  const centerY = box[1] + box[3] / 2;
  if (region === 'upper') return centerY <= frameHeight / 2;
  return centerY >= frameHeight / 2;
}

export default function OccupancyPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<null | {
    detect: (video: HTMLVideoElement | HTMLImageElement, maxBoxes?: number, score?: number) => Promise<OccupancyDetection[]>;
  }>(null);
  const activeRef = useRef(false);
  const loopRef = useRef<number | null>(null);
  const loopKindRef = useRef<'raf' | 'timeout' | null>(null);

  const [loadingModel, setLoadingModel] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [cameraMode, setCameraMode] = useState<CameraMode>('webcam');
  const [threshold, setThreshold] = useState(4);
  const [sourceLabel, setSourceLabel] = useState('Lobby Camera');
  const [location, setLocation] = useState('Main entrance');
  const [sourceUrl, setSourceUrl] = useState('');
  const [regionMode, setRegionMode] = useState<RegionMode>('full');
  const [stations, setStations] = useState<StationProfile[]>([]);
  const [selectedStationId, setSelectedStationId] = useState(DEFAULT_STATION_ID);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionNote, setConnectionNote] = useState('Use your webcam or paste an HTTP bridge URL for a LAN / AI camera.');
  const [count, setCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [detections, setDetections] = useState<OccupancyDetection[]>([]);
  const [history, setHistory] = useState<SavedSnapshot[]>([]);
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});
  const [lastPacket, setLastPacket] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        history?: SavedSnapshot[];
        cameraMode?: CameraMode;
        sourceUrl?: string;
        sourceLabel?: string;
        location?: string;
        threshold?: number;
        regionMode?: RegionMode;
        stations?: StationProfile[];
        selectedStationId?: string;
      };
      if (Array.isArray(parsed.history)) setHistory(parsed.history);
      if (parsed.cameraMode) setCameraMode(parsed.cameraMode);
      if (parsed.sourceUrl) setSourceUrl(parsed.sourceUrl);
      if (parsed.sourceLabel) setSourceLabel(parsed.sourceLabel);
      if (parsed.location) setLocation(parsed.location);
      if (typeof parsed.threshold === 'number') setThreshold(parsed.threshold);
      if (parsed.regionMode) setRegionMode(parsed.regionMode);
      if (Array.isArray(parsed.stations)) setStations(parsed.stations);
      if (parsed.selectedStationId) setSelectedStationId(parsed.selectedStationId);
    } catch {
      // ignore broken local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        history,
        cameraMode,
        sourceUrl,
        sourceLabel,
        location,
        threshold,
        regionMode,
        stations,
        selectedStationId,
      }),
    );
  }, [history, cameraMode, sourceUrl, sourceLabel, location, threshold, regionMode, stations, selectedStationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      try {
        const tf = await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
        await tf.setBackend('webgl');
        await tf.ready();
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!cancelled) {
          modelRef.current = loaded as typeof modelRef.current;
          setLoadingModel(false);
          setStatus('Model ready');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingModel(false);
          setError(err instanceof Error ? err.message : 'Failed to load model');
          setStatus('Model failed');
        }
      }
    }

    loadModel();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeRef.current = cameraOn;
  }, [cameraOn]);

  useEffect(() => {
    if (stations.length > 0) return;
    setStations([
      {
        id: DEFAULT_STATION_ID,
        label: sourceLabel,
        mode: cameraMode,
        sourceUrl,
        location,
        threshold,
        region: regionMode,
      },
    ]);
    setSelectedStationId(DEFAULT_STATION_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stations.length) return;
    const current = stations.find(station => station.id === selectedStationId) || stations[0];
    if (!current) return;
    if (current.id !== selectedStationId) setSelectedStationId(current.id);
  }, [stations, selectedStationId]);

  useEffect(() => {
    return () => {
      stopSource();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot = useMemo(() => {
    const timestamp = new Date().toISOString();
    const alert = occupancyStatus(count, threshold);
    return {
      title: 'Occupancy Snapshot',
      location,
      cameraName: sourceLabel,
      region: regionLabel(regionMode),
      count,
      threshold,
      avgScore,
      alertLevel: alert.level,
      timestamp,
      labels: detections.map((d, index) => `${index + 1}. ${d.class} ${Math.round(d.score * 100)}%`).slice(0, 8),
    } satisfies OccupancySnapshot;
  }, [avgScore, count, detections, location, regionMode, sourceLabel, threshold]);

  const packet = useMemo(() => buildOccupancyPacket(snapshot), [snapshot]);
  const command = useMemo(() => buildRegisterCommand(snapshot, occupancyDeployment.address), [snapshot]);
  const bridgeGuide = useMemo(() => buildBridgeGuide(sourceLabel, sourceUrl), [sourceLabel, sourceUrl]);
  const occupancy = occupancyStatus(count, threshold);

  function proxyCameraUrl(url: string) {
    return `/api/camera-proxy?url=${encodeURIComponent(url)}`;
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopyState(prev => ({ ...prev, [key]: true }));
    window.setTimeout(() => setCopyState(prev => ({ ...prev, [key]: false })), 1200);
  }

  async function pasteLiveCameraUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setSourceUrl(text.trim());
    } catch {
      // Ignore clipboard permission failures and keep manual entry available.
    }
  }

  function makeStationProfile(id = selectedStationId || crypto.randomUUID()): StationProfile {
    return {
      id,
      label: sourceLabel.trim() || 'Camera station',
      mode: cameraMode,
      sourceUrl: sourceUrl.trim(),
      location: location.trim() || 'Unspecified location',
      threshold,
      region: regionMode,
    };
  }

  function applyStation(station: StationProfile) {
    stopSource();
    setSelectedStationId(station.id);
    setSourceLabel(station.label);
    setCameraMode(station.mode);
    setSourceUrl(station.sourceUrl);
    setLocation(station.location);
    setThreshold(station.threshold);
    setRegionMode(station.region);
    setConnectionState('idle');
    setConnectionNote(
      station.mode === 'webcam'
        ? 'Use the local webcam on this device.'
        : 'Paste the live camera bridge URL from your gateway.',
    );
  }

  function usePublicCamera(camera: (typeof PUBLIC_CAMERAS)[number]) {
    const station: StationProfile = {
      id: camera.id,
      label: camera.name,
      mode: 'snapshot',
      sourceUrl: camera.sourceUrl,
      location: camera.location,
      threshold: 4,
      region: 'full',
    };
    applyStation(station);
    setStations(prev => [station, ...prev.filter(item => item.id !== station.id)].slice(0, 12));
  }

  function saveStation() {
    const station = makeStationProfile();
    setSelectedStationId(station.id);
    setStations(prev => [station, ...prev.filter(item => item.id !== station.id)].slice(0, 12));
  }

  function createStationFromCurrent() {
    const station = makeStationProfile(crypto.randomUUID());
    setSelectedStationId(station.id);
    setStations(prev => [station, ...prev].slice(0, 12));
  }

  function removeStation(id: string) {
    setStations(prev => prev.filter(item => item.id !== id));
    if (selectedStationId === id) {
      setSelectedStationId(DEFAULT_STATION_ID);
    }
  }

  function scheduleNextLoop() {
    if (!activeRef.current) return;
    if (cameraMode === 'webcam') {
      loopKindRef.current = 'raf';
      loopRef.current = window.requestAnimationFrame(detectLoop);
      return;
    }
    loopKindRef.current = 'timeout';
    loopRef.current = window.setTimeout(detectLoop, 350);
  }

  function frameUrl(url: string) {
    return `${proxyCameraUrl(url)}&_ts=${Date.now()}`;
  }

  async function loadRemoteFrame(url: string) {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load the camera frame. Check the bridge URL and CORS settings.'));
      img.src = frameUrl(url);
    });
  }

  async function testRemoteSource() {
    if (!sourceUrl.trim()) {
      setConnectionState('error');
      setConnectionNote('Paste a live camera URL first.');
      return;
    }
    setConnectionState('testing');
    setStatus('Testing source');
    try {
      await loadRemoteFrame(sourceUrl.trim());
      setConnectionState('ready');
      setConnectionNote('Camera bridge is reachable.');
      setStatus('Source ready');
    } catch (err) {
      setConnectionState('error');
      setConnectionNote(err instanceof Error ? err.message : 'Bridge connection failed.');
      setStatus('Source error');
    }
  }

  async function startSource() {
    setError('');
    try {
      stopSource();
      if (cameraMode === 'webcam') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setConnectionState('ready');
        setConnectionNote('Webcam connected.');
        setStatus('Camera on');
      } else {
        if (!sourceUrl.trim()) {
          throw new Error('Add a live camera URL before starting.');
        }
        await loadRemoteFrame(sourceUrl.trim());
        setConnectionState('ready');
        setConnectionNote('Remote camera bridge connected.');
        setStatus('Feed on');
      }
      setCameraOn(true);
      activeRef.current = true;
      void detectLoop();
    } catch (err) {
      setConnectionState('error');
      setConnectionNote(err instanceof Error ? err.message : 'Camera connection failed.');
      setError(err instanceof Error ? err.message : 'Camera connection failed');
      setStatus('Camera off');
    }
  }

  function stopSource() {
    activeRef.current = false;
    setCameraOn(false);
    setConnectionState('idle');
    if (loopRef.current) {
      if (loopKindRef.current === 'timeout') {
        window.clearTimeout(loopRef.current);
      } else {
        window.cancelAnimationFrame(loopRef.current);
      }
      loopRef.current = null;
      loopKindRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (remoteImageRef.current) {
      remoteImageRef.current.removeAttribute('src');
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setStatus('Stopped');
  }

  async function detectLoop() {
    try {
      if (!activeRef.current || !canvasRef.current || !modelRef.current) {
        scheduleNextLoop();
        return;
      }

      let input: HTMLVideoElement | HTMLImageElement | null = null;
      let width = 0;
      let height = 0;

      if (cameraMode === 'webcam') {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          scheduleNextLoop();
          return;
        }
        input = video;
        width = video.videoWidth;
        height = video.videoHeight;
      } else {
        const url = sourceUrl.trim();
        if (!url) {
          setStatus('No source URL');
          scheduleNextLoop();
          return;
        }
        const displayFrame = remoteImageRef.current;
        if (!displayFrame) {
          scheduleNextLoop();
          return;
        }
        displayFrame.src = frameUrl(url);
        await displayFrame.decode();
        if (!activeRef.current) return;
        input = displayFrame;
        width = displayFrame.naturalWidth || displayFrame.width;
        height = displayFrame.naturalHeight || displayFrame.height;
      }

      if (!input || !width || !height) {
        scheduleNextLoop();
        return;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      const results = await modelRef.current.detect(input, 20, 0.45);
      const next = results.filter(result => {
        if (result.class !== 'person' || result.score < 0.45) return false;
        return isDetectionInRegion(result.bbox, regionMode, height);
      });
      const nextAvg =
        results.length > 0
          ? results.reduce((total, item) => total + item.score, 0) / results.length
          : 0;

      setDetections(results);
      setCount(next.length);
      setAvgScore(nextAvg);

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.lineWidth = 3;
        ctx.font = '18px Segoe UI, Arial, sans-serif';
        if (regionMode !== 'full') {
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.setLineDash([14, 10]);
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        results.forEach((result, index) => {
          const [x, y, width, height] = result.bbox;
          const isPerson = result.class === 'person';
          ctx.strokeStyle = isPerson ? '#d61f2c' : 'rgba(0,0,0,0.35)';
          ctx.fillStyle = isPerson ? '#d61f2c' : 'rgba(0,0,0,0.55)';
          ctx.strokeRect(x, y, width, height);
          ctx.fillRect(x, Math.max(0, y - 26), Math.min(width, 260), 22);
          ctx.fillStyle = '#fff';
          ctx.fillText(`${index + 1}. ${result.class} ${Math.round(result.score * 100)}%`, x + 8, Math.max(16, y - 9));
        });
      }

      setStatus(next.length > threshold ? 'Alert' : next.length === threshold ? 'Watch' : 'Live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection error');
      setStatus('Detection error');
    }

    scheduleNextLoop();
  }

  function saveSnapshot() {
    const timestamp = new Date().toISOString();
    const record: SavedSnapshot & { id: string } = {
      id: crypto.randomUUID(),
      ...snapshot,
      timestamp,
    };
    setHistory(prev => [record, ...prev].slice(0, 12));
    setLastPacket(packet);
  }

  function exportPacket() {
    const blob = new Blob([packet], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'occupancy-packet.md';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const alertTone = occupancy.level === 'ALERT' ? 'bg-red-600 text-white' : occupancy.level === 'WATCH' ? 'bg-slate-950 text-white' : 'bg-white/5 text-white';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#11173a_0%,#090d1a_44%,#050810_100%)] pt-[238px] text-white lg:pt-[198px]">
      <TopNav />
      <div className="mx-auto max-w-[1800px] px-4 pb-4 lg:px-6">
        <div className="min-w-0">
        <header className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,16,30,0.96),rgba(7,10,18,0.98))] px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">GenLayer Studio</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Occupancy AI Desk</h1>
              <p className="mt-1 max-w-3xl text-sm text-white/60">
                Count people live from a webcam feed, draw bounding boxes around bodies, and package each snapshot for GenLayer logging.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-[#111] px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Model</p>
                <p className="mt-1 text-lg font-black">{loadingModel ? 'Loading' : 'Ready'}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#111] px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">People</p>
                <p className="mt-1 text-lg font-black">{count}</p>
              </div>
              <div className={`rounded-[18px] border border-white/10 px-4 py-3 ${alertTone}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">State</p>
                <p className="mt-1 text-lg font-black">{occupancy.label}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-red-600/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                  <Camera size={14} /> Live camera
                </div>
                <h2 className="mt-3 text-2xl font-black">People tracking</h2>
                <p className="mt-1 text-sm text-white/60">
                  Bounding boxes update in real time using a browser model. It counts people only and keeps the experience local.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Status</p>
                <p className="mt-1 text-lg font-black">{status}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Camera label</span>
                  <input
                    value={sourceLabel}
                    onChange={e => setSourceLabel(e.target.value)}
                    className="rounded-[16px] border border-white/15 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-red-600"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Location</span>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="rounded-[16px] border border-white/15 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-red-600"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Zone focus</span>
                  <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-white/10 bg-white/5 p-2">
                    {(['full', 'upper', 'lower'] as const).map(option => {
                      const active = regionMode === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRegionMode(option)}
                          className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                            active ? 'bg-red-600 text-white' : 'bg-slate-950/80 text-white hover:bg-white/5'
                          }`}
                        >
                          {option === 'full' ? 'Full frame' : option === 'upper' ? 'Upper half' : 'Lower half'}
                        </button>
                      );
                    })}
                  </div>
                </label>
                <div className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Active zone</span>
                  <div className="rounded-[16px] border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold">{regionLabel(regionMode)}</div>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPinned size={16} className="text-red-700" />
                    <h3 className="text-base font-black">Camera stations</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton onClick={createStationFromCurrent} className="border border-white/15 bg-slate-950/80 px-3 py-2 text-xs text-white hover:bg-white/5">
                      <Plus size={14} /> New station
                    </ActionButton>
                    <ActionButton onClick={saveStation} className="border border-red-600/20 bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700">
                      <ShieldCheck size={14} /> Save station
                    </ActionButton>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {stations.length ? (
                    stations.map(station => {
                      const active = station.id === selectedStationId;
                      return (
                        <div
                          key={station.id}
                          className={`rounded-[18px] border p-4 ${active ? 'border-red-600 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => applyStation(station)}
                              className="text-left"
                            >
                              <p className="font-bold">{station.label}</p>
                              <p className="mt-1 text-xs text-white/55">
                                {station.mode === 'webcam' ? 'Webcam' : station.mode === 'snapshot' ? 'Snapshot bridge' : 'LAN / RTSP / ONVIF'} · {station.location} · {regionLabel(station.region)}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStation(station.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white/70">
                              Threshold {station.threshold}
                            </span>
                            <span className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white/70">
                              {station.sourceUrl ? 'Bridge connected' : 'No bridge URL'}
                            </span>
                            {active ? <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">Active</span> : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                      No saved stations yet. Save one to reuse the same camera, zone, and threshold later.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-red-700" />
                  <h3 className="text-base font-black">Public demo cameras</h3>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  Curated public webcams for demos and smoke tests. They load through the same proxy the app uses for bridge URLs.
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {PUBLIC_CAMERAS.map(camera => (
                    <div key={camera.id} className="overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
                      <div className="relative aspect-video bg-slate-950">
                        <img
                          src={proxyCameraUrl(camera.sourceUrl)}
                          alt={camera.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                          <p className="text-sm font-black">{camera.name}</p>
                          <p className="text-xs text-white/75">{camera.location}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <a
                          href={camera.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-white/60 underline decoration-black/30 underline-offset-4 hover:text-white"
                        >
                          Open source page
                        </a>
                        <ActionButton
                          onClick={() => usePublicCamera(camera)}
                          className="border border-red-600/20 bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700"
                        >
                          <Play size={14} /> Use demo
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(10,18,35,0.96),rgba(6,10,18,0.98))] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan-300" />
                  <h3 className="text-base font-black">Enterprise camera setup</h3>
                </div>
                <p className="mt-2 text-sm text-white/65">
                  Use this flow for office, store, warehouse, or branch cameras. The app should receive a browser-readable live frame URL, not a raw RTSP stream.
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {[
                    {
                      title: '1. Keep camera private',
                      text: 'Place the camera, NVR, or AI gateway on your LAN and keep credentials off the public internet.',
                    },
                    {
                      title: '2. Expose a live frame bridge',
                      text: 'Return a current JPEG/PNG frame from your bridge, or use an existing NVR snapshot endpoint.',
                    },
                    {
                      title: '3. Paste the live URL',
                      text: 'Put that bridge URL in Live camera URL. This can be a local helper, gateway, or vendor endpoint.',
                    },
                    {
                      title: '4. Test and start',
                      text: 'Press Test connection first, then Start source. Save the station when it works.',
                    },
                  ].map(step => (
                    <div key={step.title} className="rounded-[16px] border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-black text-white">{step.title}</p>
                      <p className="mt-1 text-sm text-white/60">{step.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Webcam', 'RTSP bridge', 'ONVIF bridge', 'NVR snapshot', 'Vendor gateway'].map(label => (
                    <span key={label} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white/70">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'webcam' as const, label: 'Webcam', icon: Camera },
                    { id: 'snapshot' as const, label: 'Live bridge', icon: Link2 },
                    { id: 'bridge' as const, label: 'LAN / RTSP / ONVIF', icon: Globe },
                  ].map(option => {
                    const active = cameraMode === option.id;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          stopSource();
                          setCameraMode(option.id);
                          setConnectionState('idle');
                          setConnectionNote(
                            option.id === 'webcam'
                              ? 'Use the local webcam on this device.'
                              : 'Paste the live camera bridge URL from your gateway.',
                          );
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          active ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-slate-950/80 text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={15} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-white/60">
                  {cameraMode === 'webcam'
                    ? 'Runs directly from the browser on this machine.'
                    : 'For RTSP, ONVIF, or vendor cloud cameras, point this field at a bridge that exposes a browser-readable live frame endpoint.'}
                </p>
              </div>

              {cameraMode !== 'webcam' ? (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <label className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Live camera URL</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={pasteLiveCameraUrl}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                        >
                          Paste
                        </button>
                        <button
                          type="button"
                          onClick={() => setSourceUrl('')}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <input
                      value={sourceUrl}
                      onChange={e => setSourceUrl(e.target.value)}
                      placeholder="https://bridge.local/live-frame"
                      className="rounded-[16px] border border-white/15 bg-slate-950/80 px-4 py-3 text-white caret-white outline-none transition placeholder:text-white/30 focus:border-red-600"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Connection</span>
                    <div
                      className={`rounded-[16px] border px-4 py-3 text-sm font-bold ${
                        connectionState === 'ready'
                          ? 'border-green-600/20 bg-green-500/10 text-green-700'
                          : connectionState === 'error'
                            ? 'border-red-600/20 bg-red-500/10 text-red-700'
                            : 'border-white/15 bg-white/5 text-white/70'
                      }`}
                    >
                      {connectionState === 'ready' ? 'Connected' : connectionState === 'testing' ? 'Testing' : connectionState === 'error' ? 'Needs attention' : 'Idle'}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[18px] border border-white/10 bg-slate-950/80 p-3 text-sm text-white/70">
                <span className="font-semibold text-white">Best fit for home cameras:</span> RTSP or ONVIF through a local bridge that serves a live frame URL. The app polls that frame continuously and runs people detection on it.
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Alert threshold</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    className="h-2 w-full appearance-none rounded-full bg-white/10 accent-red-600"
                  />
                </label>
                <div className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Limit</span>
                  <div className="rounded-[16px] border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold">{threshold} people</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-950">
                {cameraMode === 'webcam' ? (
                  <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
                ) : (
                  <img
                    ref={remoteImageRef}
                    crossOrigin="anonymous"
                    alt="Remote camera stream"
                    className="aspect-video w-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                {!cameraOn ? (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/85 text-white">
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">Camera idle</p>
                      <p className="mt-2 text-xl font-black">
                        {cameraMode === 'webcam' ? 'Start the webcam to track people' : 'Connect the camera bridge to start tracking'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={startSource} disabled={cameraOn || loadingModel} className="bg-slate-950 text-white hover:bg-slate-950/90">
                  <Play size={16} /> {loadingModel ? 'Loading model' : cameraMode === 'webcam' ? 'Start webcam' : 'Start source'}
                </ActionButton>
                <ActionButton onClick={stopSource} disabled={!cameraOn} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                  <Square size={16} /> Stop source
                </ActionButton>
                <ActionButton onClick={saveSnapshot} className="border border-red-600/20 bg-red-600 text-white hover:bg-red-700">
                  <ShieldCheck size={16} /> Save snapshot
                </ActionButton>
                {cameraMode !== 'webcam' ? (
                  <ActionButton onClick={testRemoteSource} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                    <CheckCircle2 size={16} /> Test connection
                  </ActionButton>
                ) : null}
                <ActionButton onClick={() => copyText('command', command)} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                  <ClipboardCopy size={16} /> {copyState.command ? 'Command copied' : 'Copy GenLayer command'}
                </ActionButton>
                <ActionButton onClick={() => copyText('packet', packet)} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                  <Download size={16} /> {copyState.packet ? 'Packet copied' : 'Copy packet'}
                </ActionButton>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                {connectionNote}
              </div>

              <div className="rounded-[18px] border border-white/10 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-red-700" />
                  <h3 className="text-base font-black">Bridge guide</h3>
                </div>
                <pre className="mt-3 max-h-[180px] overflow-auto whitespace-pre-wrap rounded-[14px] bg-white/5 p-3 text-[12px] leading-6 text-white/75">{bridgeGuide}</pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton onClick={() => copyText('bridge-guide', bridgeGuide)} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                    <ClipboardCopy size={16} /> {copyState['bridge-guide'] ? 'Guide copied' : 'Copy guide'}
                  </ActionButton>
                </div>
              </div>

              {error ? <p className="rounded-[16px] border border-red-600/20 bg-red-500/10 p-4 text-sm text-red-700">{error}</p> : null}
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Occupancy snapshot</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="People count" value={String(count)} hint="Detected bodies" />
                <Metric label="Average score" value={`${Math.round(avgScore * 100)}%`} hint="Model confidence" />
                <Metric label="Alert level" value={occupancy.level} hint="Threshold state" />
                <Metric label="Camera" value={sourceLabel} hint={location} />
                <Metric label="Zone" value={regionLabel(regionMode)} hint="Counting region" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Registry" value={occupancyDeployment.contract} hint={occupancyDeployment.address} />
                <Metric label="Chain tx" value={occupancyDeployment.tx.slice(0, 12)} hint="Bootstrap record" />
              </div>
              <p className="mt-4 rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                {count === 0
                  ? 'No people detected in the current frame.'
                  : `${count} person${count > 1 ? 's' : ''} currently visible. ${occupancy.label}.`}
              </p>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-red-700" />
                <h3 className="text-xl font-black">GenLayer packet</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Packet</p>
                  <pre className="mt-3 max-h-[240px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-white/80">{packet}</pre>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">On-chain command</p>
                  <pre className="mt-3 max-h-[180px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-white/80">{command}</pre>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={exportPacket} className="border border-white/15 bg-slate-950/80 text-white hover:bg-white/5">
                    <Download size={16} /> Download packet
                  </ActionButton>
                  <ActionButton onClick={() => copyText('register', command)} className="bg-red-600 text-white hover:bg-red-700">
                    <ArrowUpRight size={16} /> {copyState.register ? 'Command copied' : 'Copy register call'}
                  </ActionButton>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Recent snapshots</h3>
              </div>
              <div className="mt-4 space-y-2">
                {history.length ? (
                  history.map(item => (
                    <div key={item.id} className="rounded-[18px] border border-white/10 bg-slate-950/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.title}</p>
                          <p className="mt-1 text-xs text-white/55">{new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-bold ${item.alertLevel === 'ALERT' ? 'bg-red-600 text-white' : 'bg-white/5 text-white'}`}>
                          {item.count} people
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                    No saved snapshots yet.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}

