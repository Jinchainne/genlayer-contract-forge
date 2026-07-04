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
  ShieldCheck,
  Square,
  Users,
} from 'lucide-react';
import occupancyDeployment from '../../contracts/occupancy_deployment.json';
import { buildOccupancyPacket, buildRegisterCommand, occupancyStatus, type OccupancyDetection, type OccupancySnapshot } from '../../src/lib/occupancy';
import TopNav from '../components/top-nav';

type SavedSnapshot = OccupancySnapshot & { id: string };
type CameraMode = 'webcam' | 'snapshot' | 'bridge';
type ConnectionState = 'idle' | 'testing' | 'ready' | 'error';

const STORAGE_KEY = 'genlayer-occupancy-desk:v1';

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgba(0,0,0,0.06)] ${className}`}>{children}</section>;
}

function ActionButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">{label}</p>
      <p className="mt-2 text-2xl font-black text-black">{value}</p>
      {hint ? <p className="mt-2 text-sm text-black/55">{hint}</p> : null}
    </div>
  );
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
  const remoteFrameRef = useRef(0);

  const [loadingModel, setLoadingModel] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [cameraMode, setCameraMode] = useState<CameraMode>('webcam');
  const [threshold, setThreshold] = useState(4);
  const [sourceLabel, setSourceLabel] = useState('Lobby Camera');
  const [location, setLocation] = useState('Main entrance');
  const [sourceUrl, setSourceUrl] = useState('');
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
      const parsed = JSON.parse(raw) as { history?: SavedSnapshot[]; cameraMode?: CameraMode; sourceUrl?: string; sourceLabel?: string; location?: string; threshold?: number };
      if (Array.isArray(parsed.history)) setHistory(parsed.history);
      if (parsed.cameraMode) setCameraMode(parsed.cameraMode);
      if (parsed.sourceUrl) setSourceUrl(parsed.sourceUrl);
      if (parsed.sourceLabel) setSourceLabel(parsed.sourceLabel);
      if (parsed.location) setLocation(parsed.location);
      if (typeof parsed.threshold === 'number') setThreshold(parsed.threshold);
    } catch {
      // ignore broken local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ history, cameraMode, sourceUrl, sourceLabel, location, threshold }));
  }, [history, cameraMode, sourceUrl, sourceLabel, location, threshold]);

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
      count,
      threshold,
      avgScore,
      alertLevel: alert.level,
      timestamp,
      labels: detections.map((d, index) => `${index + 1}. ${d.class} ${Math.round(d.score * 100)}%`).slice(0, 8),
    } satisfies OccupancySnapshot;
  }, [avgScore, count, detections, location, sourceLabel, threshold]);

  const packet = useMemo(() => buildOccupancyPacket(snapshot), [snapshot]);
  const command = useMemo(() => buildRegisterCommand(snapshot, occupancyDeployment.address), [snapshot]);
  const occupancy = occupancyStatus(count, threshold);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopyState(prev => ({ ...prev, [key]: true }));
    window.setTimeout(() => setCopyState(prev => ({ ...prev, [key]: false })), 1200);
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
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}_ts=${Date.now()}`;
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
      setConnectionNote('Paste a snapshot or bridge URL first.');
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
          throw new Error('Add a snapshot or bridge URL before starting.');
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
      const next = results.filter(result => result.class === 'person' && result.score >= 0.45);
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

  const alertTone = occupancy.level === 'ALERT' ? 'bg-red-600 text-white' : occupancy.level === 'WATCH' ? 'bg-black text-white' : 'bg-black/5 text-black';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_56%,#f2f2f2_100%)] text-black">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        <TopNav />
        <header className="mb-4 rounded-[24px] border border-black/10 bg-white px-5 py-4 shadow-[0_14px_36px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/50">GenLayer Studio</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Occupancy AI Desk</h1>
              <p className="mt-1 max-w-3xl text-sm text-black/60">
                Count people live from a webcam feed, draw bounding boxes around bodies, and package each snapshot for GenLayer logging.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[18px] border border-black/10 bg-[#111] px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Model</p>
                <p className="mt-1 text-lg font-black">{loadingModel ? 'Loading' : 'Ready'}</p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-[#111] px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">People</p>
                <p className="mt-1 text-lg font-black">{count}</p>
              </div>
              <div className={`rounded-[18px] border border-black/10 px-4 py-3 ${alertTone}`}>
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
                <div className="inline-flex items-center gap-2 rounded-full border border-red-600/20 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                  <Camera size={14} /> Live camera
                </div>
                <h2 className="mt-3 text-2xl font-black">People tracking</h2>
                <p className="mt-1 text-sm text-black/60">
                  Bounding boxes update in real time using a browser model. It counts people only and keeps the experience local.
                </p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-black px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Status</p>
                <p className="mt-1 text-lg font-black">{status}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Camera label</span>
                  <input
                    value={sourceLabel}
                    onChange={e => setSourceLabel(e.target.value)}
                    className="rounded-[16px] border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-red-600"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Location</span>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="rounded-[16px] border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-red-600"
                  />
                </label>
              </div>

              <div className="rounded-[18px] border border-black/10 bg-black/5 p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'webcam' as const, label: 'Webcam', icon: Camera },
                    { id: 'snapshot' as const, label: 'Snapshot bridge', icon: Link2 },
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
                              : 'Paste the HTTP snapshot or bridge URL from your camera gateway.',
                          );
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          active ? 'border-red-600 bg-red-600 text-white' : 'border-black/10 bg-white text-black hover:bg-black/5'
                        }`}
                      >
                        <Icon size={15} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-black/60">
                  {cameraMode === 'webcam'
                    ? 'Runs directly from the browser on this machine.'
                    : 'For RTSP, ONVIF, or vendor cloud cameras, point this field at a bridge that exposes a browser-readable JPEG snapshot endpoint.'}
                </p>
              </div>

              {cameraMode !== 'webcam' ? (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Bridge URL</span>
                    <input
                      value={sourceUrl}
                      onChange={e => setSourceUrl(e.target.value)}
                      placeholder="https://bridge.local/camera.jpg"
                      className="rounded-[16px] border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-red-600"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Connection</span>
                    <div
                      className={`rounded-[16px] border px-4 py-3 text-sm font-bold ${
                        connectionState === 'ready'
                          ? 'border-green-600/20 bg-green-50 text-green-700'
                          : connectionState === 'error'
                            ? 'border-red-600/20 bg-red-50 text-red-700'
                            : 'border-black/15 bg-black/5 text-black/70'
                      }`}
                    >
                      {connectionState === 'ready' ? 'Connected' : connectionState === 'testing' ? 'Testing' : connectionState === 'error' ? 'Needs attention' : 'Idle'}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[18px] border border-black/10 bg-white p-3 text-sm text-black/70">
                <span className="font-semibold text-black">Best fit for home cameras:</span> RTSP or ONVIF through a local bridge that serves a JPEG snapshot URL. The app connects to that URL, shows the live frame, and runs people detection on it.
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Alert threshold</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    className="h-2 w-full appearance-none rounded-full bg-black/10 accent-red-600"
                  />
                </label>
                <div className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Limit</span>
                  <div className="rounded-[16px] border border-black/15 bg-black/5 px-4 py-3 text-sm font-bold">{threshold} people</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-black/10 bg-black">
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
                  <div className="absolute inset-0 grid place-items-center bg-black/85 text-white">
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
                <ActionButton onClick={startSource} disabled={cameraOn || loadingModel} className="bg-black text-white hover:bg-black/90">
                  <Play size={16} /> {loadingModel ? 'Loading model' : cameraMode === 'webcam' ? 'Start webcam' : 'Start source'}
                </ActionButton>
                <ActionButton onClick={stopSource} disabled={!cameraOn} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Square size={16} /> Stop source
                </ActionButton>
                <ActionButton onClick={saveSnapshot} className="border border-red-600/20 bg-red-600 text-white hover:bg-red-700">
                  <ShieldCheck size={16} /> Save snapshot
                </ActionButton>
                {cameraMode !== 'webcam' ? (
                  <ActionButton onClick={testRemoteSource} className="border border-black/15 bg-white text-black hover:bg-black/5">
                    <CheckCircle2 size={16} /> Test connection
                  </ActionButton>
                ) : null}
                <ActionButton onClick={() => copyText('command', command)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <ClipboardCopy size={16} /> {copyState.command ? 'Command copied' : 'Copy GenLayer command'}
                </ActionButton>
                <ActionButton onClick={() => copyText('packet', packet)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Download size={16} /> {copyState.packet ? 'Packet copied' : 'Copy packet'}
                </ActionButton>
              </div>

              <div className="rounded-[16px] border border-black/10 bg-black/5 p-4 text-sm text-black/70">
                {connectionNote}
              </div>

              {error ? <p className="rounded-[16px] border border-red-600/20 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
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
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Registry" value={occupancyDeployment.contract} hint={occupancyDeployment.address} />
                <Metric label="Chain tx" value={occupancyDeployment.tx.slice(0, 12)} hint="Bootstrap record" />
              </div>
              <p className="mt-4 rounded-[16px] border border-black/10 bg-black/5 p-4 text-sm text-black/75">
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
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Packet</p>
                  <pre className="mt-3 max-h-[240px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">{packet}</pre>
                </div>
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">On-chain command</p>
                  <pre className="mt-3 max-h-[180px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">{command}</pre>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={exportPacket} className="border border-black/15 bg-white text-black hover:bg-black/5">
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
                    <div key={item.id} className="rounded-[18px] border border-black/10 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.title}</p>
                          <p className="mt-1 text-xs text-black/55">{new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-bold ${item.alertLevel === 'ALERT' ? 'bg-red-600 text-white' : 'bg-black/5 text-black'}`}>
                          {item.count} people
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-black/65">
                    No saved snapshots yet.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
