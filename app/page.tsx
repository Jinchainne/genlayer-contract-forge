'use client';

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type ClipboardEvent, type ReactNode } from 'react';
import {
  ArrowRightLeft,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  ClipboardCopy,
  Code2,
  Copy,
  Download,
  FileInput,
  FlaskConical,
  GitCompare,
  Layers3,
  MoveRight,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import forgeDeployment from '../contracts/deployment.json';
import {
  analyzeGenLayerContract,
  compareGenLayerContracts,
  createDeployPack,
  createReleaseChecklist,
  createSubmissionPack,
  generateForgeBrief,
  type AnalysisResult,
  type DiffResult,
} from '../src/lib/analyzer';
import TopNav from './components/top-nav';

const STORAGE_KEY = 'genlayer-contract-forge:v2';

const primarySample = `# { "Depends": "py-genlayer:test" }
from genlayer import *

class ProvenanceRegistry(gl.Contract):
    def __init__(self):
        self._latest = ""
        self._total = 0

    @gl.public.write
    def register_event(self, payload: str, source_url: str) -> str:
        def evaluate():
            prompt = f"""
            You are validating whether a source-backed event is suitable for a GenLayer provenance record.
            payload={payload}
            source_url={source_url}
            Return only: approved=yes|no;reason=short reason
            """
            return gl.exec_prompt(prompt).strip()

        result = gl.eq_principle_strict_eq(evaluate)
        self._latest = result
        self._total += 1
        return result

    @gl.public.view
    def latest(self) -> str:
        return self._latest

    @gl.public.view
    def total(self) -> int:
        return self._total`;

const compareSample = `# { "Depends": "py-genlayer:test" }
from genlayer import *

class ProvenanceRegistry(gl.Contract):
    def __init__(self):
        self._latest = ""

    @gl.public.write
    def register_event(self, payload: str) -> str:
        self._latest = payload.strip()
        return self._latest

    @gl.public.view
    def latest(self) -> str:
        return self._latest`;

const presets = [
  {
    id: 'provenance',
    label: 'Provenance registry',
    title: 'ProvenanceRegistry',
    description: 'Track a source-backed event and keep the latest consensus result readable.',
    source: primarySample,
    compareSource: compareSample,
  },
  {
    id: 'policy-router',
    label: 'Policy router',
    title: 'PolicyRouter',
    description: 'Attach a policy to a target and expose a read path for audits.',
    source: `# { "Depends": "py-genlayer:test" }
from genlayer import *

class PolicyRouter(gl.Contract):
    def __init__(self):
        self._routes = {}

    @gl.public.write
    def attach_policy(self, policy_id: str, target: str) -> str:
        def evaluate():
            return f"attached:{policy_id}:{target}"

        result = gl.eq_principle_strict_eq(evaluate)
        self._routes[policy_id] = target
        return result

    @gl.public.view
    def resolve(self, policy_id: str) -> str:
        return self._routes.get(policy_id, "")`,
    compareSource: compareSample,
  },
  {
    id: 'signal-ledger',
    label: 'Signal ledger',
    title: 'SignalLedger',
    description: 'Store reviewed signal summaries with a visible audit trail.',
    source: `# { "Depends": "py-genlayer:test" }
from genlayer import *

class SignalLedger(gl.Contract):
    def __init__(self):
        self._signals = []

    @gl.public.write
    def record_signal(self, signal: str, score: str) -> str:
        def evaluate():
            return f"{signal}:{score}"

        result = gl.eq_principle_strict_eq(evaluate)
        self._signals.append(result)
        return result

    @gl.public.view
    def latest(self) -> str:
        return self._signals[-1] if self._signals else ""`,
    compareSource: compareSample,
  },
  {
    id: 'dispute-resolver',
    label: 'Dispute resolver',
    title: 'DisputeResolver',
    description: 'Package an evidence check and leave the result visible for review.',
    source: `# { "Depends": "py-genlayer:test" }
from genlayer import *

class DisputeResolver(gl.Contract):
    def __init__(self):
        self._decision = ""

    @gl.public.write
    def resolve(self, claim: str, evidence_url: str) -> str:
        def evaluate():
            prompt = f"""
            Review the claim and evidence.
            claim={claim}
            evidence_url={evidence_url}
            Return approved=yes|no;reason=short reason
            """
            return gl.exec_prompt(prompt).strip()

        result = gl.eq_principle_strict_eq(evaluate)
        self._decision = result
        return result

    @gl.public.view
    def decision(self) -> str:
        return self._decision`,
    compareSource: compareSample,
  },
] as const;

const fallbackAnalysis = analyzeGenLayerContract(primarySample, 'ProvenanceRegistry');
const fallbackDiff = compareGenLayerContracts(primarySample, compareSample, 'ProvenanceRegistry', 'LegacyRegistry');

type CopyStatus = 'idle' | 'copied';

type DraftProject = {
  id: string;
  title: string;
  source: string;
  compareSource: string;
  updatedAt: string;
};

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`relative isolate rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgba(0,0,0,0.06)] ${className}`}>{children}</section>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">{label}</p>
      <p className="mt-2 break-words text-xl font-black leading-tight text-black">{value}</p>
      {hint ? <p className="mt-2 text-sm text-black/55">{hint}</p> : null}
    </div>
  );
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

function clampTagList(tags: string[]) {
  return tags.length ? tags : ['none'];
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function presetById(id: string) {
  return presets.find(preset => preset.id === id) || presets[0];
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [title, setTitle] = useState('ProvenanceRegistry');
  const [source, setSource] = useState(primarySample);
  const [compareSource, setCompareSource] = useState(compareSample);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => fallbackAnalysis);
  const [diff, setDiff] = useState<DiffResult>(() => fallbackDiff);
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyStatus>>({});
  const [drafts, setDrafts] = useState<DraftProject[]>([]);
  const [activeDraftId, setActiveDraftId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>(presets[0].id);
  const [lastSaved, setLastSaved] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { drafts?: DraftProject[]; activeDraftId?: string; selectedPreset?: string };
      if (Array.isArray(parsed.drafts)) setDrafts(parsed.drafts);
      if (parsed.activeDraftId) setActiveDraftId(parsed.activeDraftId);
      if (parsed.selectedPreset) {
        setSelectedPreset(parsed.selectedPreset);
      }
      const latest = parsed.drafts?.find(item => item.id === parsed.activeDraftId) || parsed.drafts?.[0];
      if (latest) {
        setTitle(latest.title);
        setSource(latest.source);
        setCompareSource(latest.compareSource);
        setAnalysis(analyzeGenLayerContract(latest.source, latest.title));
        setDiff(compareGenLayerContracts(latest.source, latest.compareSource, latest.title, 'Comparison'));
        setLastSaved(latest.updatedAt);
      }
    } catch {
      // ignore broken local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        drafts,
        activeDraftId,
        selectedPreset,
      }),
    );
  }, [drafts, activeDraftId, selectedPreset]);

  const deployPack = useMemo(() => createDeployPack(analysis, title, forgeDeployment.address, forgeDeployment.tx), [analysis, title]);
  const submissionPack = useMemo(() => createSubmissionPack(analysis, title), [analysis, title]);
  const releaseChecklist = useMemo(() => createReleaseChecklist(analysis, title, forgeDeployment.address, forgeDeployment.tx), [analysis, title]);
  const brief = useMemo(() => generateForgeBrief(source, title), [source, title]);
  const methodCount = analysis.publicViews.length + analysis.publicWrites.length;
  const findingCount = analysis.findings.length;
  const currentPreset = presetById(selectedPreset);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [key]: 'copied' }));
    window.setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [key]: 'idle' }));
    }, 1200);
  }

  async function pasteContractFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setSource(text);
      sourceInputRef.current?.focus();
    } catch {
      // Ignore clipboard permission failures and leave manual paste available.
    }
  }

  function clearContractSource() {
    setSource('');
    sourceInputRef.current?.focus();
  }

  function runAnalysis() {
    setBusy(true);
    try {
      const next = analyzeGenLayerContract(source, title);
      setAnalysis(next);
      setDiff(compareGenLayerContracts(source, compareSource, title, 'Comparison'));
    } finally {
      setBusy(false);
    }
  }

  function runCompare() {
    setDiff(compareGenLayerContracts(source, compareSource, title, 'Comparison'));
  }

  function loadPrimarySample() {
    setTitle('ProvenanceRegistry');
    setSource(primarySample);
    setCompareSource(compareSample);
    setSelectedPreset('provenance');
    setAnalysis(analyzeGenLayerContract(primarySample, 'ProvenanceRegistry'));
    setDiff(compareGenLayerContracts(primarySample, compareSample, 'ProvenanceRegistry', 'LegacyRegistry'));
  }

  function loadPreset(presetId: string) {
    const preset = presetById(presetId);
    setSelectedPreset(preset.id);
    setTitle(preset.title);
    setSource(preset.source);
    setCompareSource(preset.compareSource);
    setAnalysis(analyzeGenLayerContract(preset.source, preset.title));
    setDiff(compareGenLayerContracts(preset.source, preset.compareSource, preset.title, 'LegacyRegistry'));
  }

  function saveDraft() {
    const updatedAt = new Date().toISOString();
    const draft: DraftProject = {
      id: activeDraftId || makeId(),
      title,
      source,
      compareSource,
      updatedAt,
    };
    setActiveDraftId(draft.id);
    setLastSaved(updatedAt);
    setDrafts(prev => [draft, ...prev.filter(item => item.id !== draft.id)].slice(0, 8));
    setCopyStatus(prev => ({ ...prev, save: 'copied' }));
  }

  function loadDraft(draft: DraftProject) {
    setActiveDraftId(draft.id);
    setTitle(draft.title);
    setSource(draft.source);
    setCompareSource(draft.compareSource);
    setAnalysis(analyzeGenLayerContract(draft.source, draft.title));
    setDiff(compareGenLayerContracts(draft.source, draft.compareSource, draft.title, 'Comparison'));
    setLastSaved(draft.updatedAt);
  }

  function removeDraft(draftId: string) {
    setDrafts(prev => prev.filter(item => item.id !== draftId));
    if (activeDraftId === draftId) setActiveDraftId('');
  }

  function downloadText(filename: string, content: string, mime = 'text/markdown') {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportAll() {
    const payload = {
      title,
      analysis,
      diff,
      deployPack,
      submissionPack,
      report: brief.report,
      source,
      compareSource,
      generatedAt: new Date().toISOString(),
    };
    downloadText(`${title || 'genlayer-forge'}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setTitle(file.name.replace(/\.[^.]+$/, '') || 'ImportedContract');
      setSource(text);
      setAnalysis(analyzeGenLayerContract(text, file.name));
      setDiff(compareGenLayerContracts(text, compareSource, file.name, 'Comparison'));
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function pasteIntoTextField(
    event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentValue: string,
    setValue: (value: string) => void,
  ) {
    const pasted = event.clipboardData.getData('text');
    if (!pasted) return;

    event.preventDefault();

    const field = event.currentTarget;
    const selectionStart = field.selectionStart ?? currentValue.length;
    const selectionEnd = field.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${pasted}${currentValue.slice(selectionEnd)}`;
    setValue(nextValue);

    requestAnimationFrame(() => {
      const cursor = selectionStart + pasted.length;
      field.setSelectionRange(cursor, cursor);
    });
  }

  const scoreAccent = analysis.score >= 85 ? 'text-black' : analysis.score >= 65 ? 'text-black' : 'text-black';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#151b3a_0%,#0a0f1f_42%,#050810_100%)] pt-[238px] text-white lg:pt-[198px]">
      <TopNav />
      <div className="mx-auto max-w-[1800px] px-4 pb-4 lg:px-6">
        <div className="min-w-0">
          <header className="relative mb-4 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,20,39,0.96),rgba(8,10,18,0.98))] px-5 py-5 shadow-[0_26px_64px_rgba(0,0,0,0.42)]">
            <div className="pointer-events-none absolute inset-0 forge-grid opacity-[0.12]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                <img src="/genlayer-mark.svg" alt="GenLayer Studio logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">GenLayer Studio</p>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Contract Forge</h1>
                <p className="mt-1 max-w-2xl text-sm text-white/65">
                  A builder workspace for review, comparison, deployment packs, and judge-ready submission notes.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Readiness', value: `${analysis.score}/100` },
                { label: 'Verdict', value: analysis.verdict },
                { label: 'Methods', value: String(methodCount) },
                { label: 'Findings', value: String(findingCount) },
              ].map(item => (
                <div key={item.label} className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                  <p className="mt-1 text-lg font-black">{item.value}</p>
                </div>
              ))}
            </div>
            </div>
          </header>

          <div className="mb-4 rounded-[20px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(22,28,58,0.95),rgba(10,14,24,0.95))] px-5 py-4 text-sm text-white shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
          Real-time camera monitoring is now available in <a href="/occupancy" className="font-bold underline">Occupancy AI Desk</a>. It counts people live, draws boxes, and prepares a GenLayer snapshot packet.
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-red-600/20 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                  <FlaskConical size={14} /> Analyze
                </div>
                <h2 className="mt-3 text-2xl font-black">Current contract</h2>
                <p className="mt-1 text-sm text-black/60">
                  Paste a GenLayer contract and the tool will score it, extract the public surface, and build a deploy note.
                </p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-black px-4 py-3 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Score</p>
                <p className={`mt-1 text-4xl font-black ${scoreAccent}`}>{analysis.score}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2 md:grid-cols-[0.55fr_0.45fr]">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Project name</span>
                  <input
                    ref={titleInputRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onPaste={event => pasteIntoTextField(event, title, setTitle)}
                    className="rounded-[16px] border border-black/15 bg-white px-4 py-3 text-black caret-black outline-none transition placeholder:text-black/35 focus:border-red-600"
                    placeholder="ProvenanceRegistry"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Preset note</span>
                  <input
                    value={currentPreset.description}
                    readOnly
                    className="rounded-[16px] border border-black/15 bg-black/5 px-4 py-3 text-black/60 caret-black outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Preset</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Select a ready-made GenLayer pattern</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {presets.map(preset => {
                    const active = preset.id === selectedPreset;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => loadPreset(preset.id)}
                        className={`rounded-[18px] border px-4 py-3 text-left transition ${
                          active
                            ? 'border-red-600 bg-red-50 shadow-[0_12px_28px_rgba(220,38,38,0.12)]'
                            : 'border-black/15 bg-black/5 hover:border-black/25 hover:bg-black/10'
                        }`}
                      >
                        <p className="text-sm font-black text-black">{preset.label}</p>
                        <p className="mt-1 text-xs text-black/55">{preset.title}</p>
                      </button>
                    );
                  })}
                  <div className="rounded-[18px] border border-black/15 bg-black/5 px-4 py-3">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Updated</span>
                    <div className="mt-2 text-sm text-black/65">{lastSaved ? new Date(lastSaved).toLocaleString() : 'Not saved yet'}</div>
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Contract source</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={pasteContractFromClipboard}
                      className="rounded-full border border-black/15 bg-black/5 px-3 py-1 text-[11px] font-semibold text-black/70 transition hover:bg-black/10"
                    >
                      Paste from clipboard
                    </button>
                    <button
                      type="button"
                      onClick={clearContractSource}
                      className="rounded-full border border-black/15 bg-black/5 px-3 py-1 text-[11px] font-semibold text-black/70 transition hover:bg-black/10"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <textarea
                  ref={sourceInputRef}
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  onPaste={event => pasteIntoTextField(event, source, setSource)}
                  className="min-h-[360px] rounded-[20px] border border-black/15 bg-white p-4 font-mono text-[13px] leading-6 text-black caret-black outline-none transition placeholder:text-black/35 focus:border-red-600"
                  placeholder="# Paste a GenLayer contract here"
                  spellCheck={false}
                />
              </label>

              <div className="relative z-20 flex flex-wrap gap-3 pt-1">
                <ActionButton onClick={runAnalysis} disabled={busy} className="bg-black text-white hover:bg-black/90">
                  {busy ? <RefreshCcw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {busy ? 'Analyzing' : 'Analyze contract'}
                </ActionButton>
                <ActionButton onClick={runCompare} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <GitCompare size={16} /> Compare versions
                </ActionButton>
                <ActionButton onClick={loadPrimarySample} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <ClipboardCopy size={16} /> Load sample
                </ActionButton>
                <ActionButton onClick={() => fileInputRef.current?.click()} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <FileInput size={16} /> Import file
                </ActionButton>
                <ActionButton onClick={saveDraft} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <ShieldCheck size={16} /> {copyStatus.save === 'copied' ? 'Draft saved' : 'Save draft'}
                </ActionButton>
                <ActionButton onClick={() => copyText('deploy', deployPack)} className="border border-red-600/20 bg-red-600 text-white hover:bg-red-700">
                  <Copy size={16} /> {copyStatus.deploy === 'copied' ? 'Deploy pack copied' : 'Copy deploy pack'}
                </ActionButton>
                <ActionButton onClick={() => copyText('submission', submissionPack)} className="border border-red-600/20 bg-red-50 text-red-700 hover:bg-red-100">
                  <Download size={16} /> {copyStatus.submission === 'copied' ? 'Submission copied' : 'Copy submission pack'}
                </ActionButton>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Readiness snapshot</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Verdict" value={analysis.verdict} hint="GenLayer review status" />
                <Metric label="Methods" value={String(methodCount)} hint="Public reads and writes" />
                <Metric label="Contract classes" value={analysis.contractNames[0] || 'none'} hint="Detected entry point" />
                <Metric label="Blueprint tags" value={String(analysis.blueprintTags.length)} hint="Build-oriented signals" />
              </div>
              <p className="mt-4 rounded-[16px] border border-black/10 bg-black/5 p-4 text-sm text-black/75">
                {analysis.summary}
              </p>
              <div className="mt-4 grid gap-3">
                {Object.entries(analysis.breakdown).map(([key, value]) => (
                  <div key={key} className="rounded-[16px] border border-black/10 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">{key}</p>
                      <p className="text-sm font-bold text-black">{value}/100</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-black/10">
                      <div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.max(4, value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <TriangleAlert size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Findings</h3>
              </div>
              <div className="mt-4 space-y-3">
                {analysis.findings.length ? (
                  analysis.findings.map(finding => (
                    <div key={`${finding.category}-${finding.title}`} className="rounded-[18px] border border-black/10 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                            finding.level === 'error'
                              ? 'bg-red-600 text-white'
                              : finding.level === 'warn'
                                ? 'bg-black text-white'
                                : 'bg-black/10 text-black'
                          }`}
                        >
                          {finding.level}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/45">{finding.category}</span>
                      </div>
                      <p className="mt-3 font-bold">{finding.title}</p>
                      <p className="mt-2 text-sm text-black/70">{finding.detail}</p>
                      <p className="mt-2 text-sm text-red-700">Fix: {finding.fix}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-black/65">
                    No findings yet. Run analysis to populate the review.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Compare mode</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Score delta" value={`${diff.scoreDelta >= 0 ? '+' : ''}${diff.scoreDelta}`} hint="Current vs previous" />
                <Metric label="Risk delta" value={`${diff.riskDelta >= 0 ? '+' : ''}${diff.riskDelta}`} hint="Error findings change" />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Comparison source</p>
                  <textarea
                    value={compareSource}
                    onChange={e => setCompareSource(e.target.value)}
                    className="mt-3 min-h-[220px] w-full rounded-[16px] border border-black/15 bg-white p-3 font-mono text-[12px] outline-none focus:border-red-600"
                    spellCheck={false}
                  />
                </div>
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Diff report</p>
                  <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">
                    {diff.report}
                  </pre>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton onClick={() => copyText('compare', diff.report)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Copy size={16} /> {copyStatus.compare === 'copied' ? 'Diff copied' : 'Copy diff report'}
                </ActionButton>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Layers3 size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Draft vault</h3>
              </div>
              <div className="mt-4 space-y-3">
                {drafts.length ? (
                  drafts.map(draft => (
                    <div
                      key={draft.id}
                      className={`rounded-[18px] border px-4 py-3 ${
                        draft.id === activeDraftId ? 'border-red-600 bg-red-50' : 'border-black/10 bg-black/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button onClick={() => loadDraft(draft)} className="text-left">
                          <p className="font-bold">{draft.title}</p>
                          <p className="mt-1 text-xs text-black/55">{new Date(draft.updatedAt).toLocaleString()}</p>
                        </button>
                        <button
                          onClick={() => removeDraft(draft.id)}
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-black/60 hover:bg-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-black/65">
                    No saved drafts yet. Save one to keep working across sessions.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>

        <section className="mt-4 grid items-start gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel>
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Recommended use case</h3>
            </div>
            <p className="mt-4 rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-black/75">
              {releaseChecklist.summary}
            </p>
            <div className="mt-4 space-y-3">
              {releaseChecklist.items.map(item => (
                <div key={item} className="rounded-[18px] border border-black/10 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-black text-white">
                      ✓
                    </span>
                    <p className="text-sm text-black/75">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Release checklist</h3>
            </div>
            <div className="mt-4 rounded-[18px] border border-black/10 bg-black px-4 py-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Deploy command</p>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-white/90">{releaseChecklist.command}</pre>
            </div>
            <div className="mt-4 grid gap-3">
              {analysis.testPlan.map(step => (
                <div key={step} className="rounded-[18px] border border-black/10 bg-white p-4 text-sm text-black/75">
                  {step}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-black/70">
              Use this tab as a GenLayer handoff surface: review the score, fix the findings, deploy to Studionet, then paste the submission pack into the hackathon form.
            </div>
          </Panel>
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel>
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Practical modules</h3>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                {
                  title: 'Provenance registry',
                  detail: 'Log a source-backed event, preserve the latest result, and expose a stable read path for review.',
                },
                {
                  title: 'Policy router',
                  detail: 'Attach policies to targets and keep the mapping visible through a public view.',
                },
                {
                  title: 'Automation guard',
                  detail: 'Wrap LLM reasoning in the consensus path and keep writes deterministic.',
                },
                {
                  title: 'Submission pack',
                  detail: 'Turn a contract into a judge-friendly summary with notes, tags, and next steps.',
                },
              ].map(item => (
                <div key={item.title} className="rounded-[18px] border border-black/10 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={16} className="text-red-700" />
                    <p className="font-bold">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-black/70">{item.detail}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel>
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Deploy kit</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Network" value={String(forgeDeployment.network || 'studionet')} />
                <Metric label="Contract" value={String(forgeDeployment.contract || 'ContractForgeRegistry')} />
                <Metric label="Address" value={String(forgeDeployment.address || 'pending')} hint="Studionet deployment" />
                <Metric label="Tx hash" value={String(forgeDeployment.tx || 'pending')} hint="Deployment transaction" />
              </div>
              <div className="mt-4 rounded-[18px] border border-black/10 bg-black px-4 py-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Command</p>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-white/90">{`genlayer network studionet
genlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api`}</pre>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => copyText('command', `genlayer network studionet\ngenlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api`)}
                  className="border border-black/15 bg-white text-black hover:bg-black/5"
                >
                  <ClipboardCopy size={16} /> {copyStatus.command === 'copied' ? 'Command copied' : 'Copy deploy command'}
                </ActionButton>
                <ActionButton onClick={() => copyText('address', `${forgeDeployment.address || 'pending'}\n${forgeDeployment.tx || 'pending'}`)} className="bg-red-600 text-white hover:bg-red-700">
                  <ArrowUpRight size={16} /> Copy chain refs
                </ActionButton>
                <ActionButton onClick={() => downloadText(`${title || 'contract'}-report.md`, brief.report)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Download size={16} /> Download report
                </ActionButton>
                <ActionButton onClick={() => downloadText(`${title || 'contract'}-deploy-pack.md`, deployPack)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Download size={16} /> Download deploy pack
                </ActionButton>
                <ActionButton onClick={() => downloadText(`${title || 'contract'}-submission-pack.md`, submissionPack)} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Download size={16} /> Download submission pack
                </ActionButton>
                <ActionButton onClick={exportAll} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Download size={16} /> Export bundle
                </ActionButton>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <MoveRight size={18} className="text-red-700" />
                <h3 className="text-xl font-black">Judge-ready notes</h3>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Submission pack</p>
                  <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">{submissionPack}</pre>
                </div>
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Deploy pack</p>
                  <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">{deployPack}</pre>
                </div>
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Forge brief</p>
                  <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-black/80">{brief.report}</pre>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <section className="mt-4 grid items-start gap-4 xl:grid-cols-3">
          <Panel>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Contract profile</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Detected classes</p>
                <p className="mt-2 text-sm text-black/80">{analysis.contractNames.length ? analysis.contractNames.join(', ') : 'none detected'}</p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Public views</p>
                <p className="mt-2 text-sm text-black/80">{analysis.publicViews.length ? analysis.publicViews.join(', ') : 'none detected'}</p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-black/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Public writes</p>
                <p className="mt-2 text-sm text-black/80">{analysis.publicWrites.length ? analysis.publicWrites.join(', ') : 'none detected'}</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Blueprint tags</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {clampTagList(analysis.blueprintTags).map(tag => (
                <span key={tag} className="rounded-full border border-black/10 bg-black px-3 py-1.5 text-xs font-semibold text-white">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-black/65">
              The analyzer is tuned for GenLayer builders: it checks deterministic structure, public surface quality, tests, deployment readiness, and security signals.
            </p>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <MoveRight size={18} className="text-red-700" />
              <h3 className="text-xl font-black">Next steps</h3>
            </div>
            <div className="mt-4 space-y-2">
              {analysis.nextSteps.length ? (
                analysis.nextSteps.map(step => (
                  <div key={step} className="rounded-[18px] border border-black/10 bg-white p-3 text-sm text-black/75">
                    {step}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 text-sm text-black/65">
                  No immediate changes required.
                </div>
              )}
            </div>
          </Panel>
        </section>

          <footer className="pb-5 pt-4 text-center text-xs text-white/45">
            Built for GenLayer Studio, with on-chain registry support and judge-ready output packs.
          </footer>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".py,.txt,.md" className="hidden" onChange={handleImport} />
    </main>
  );
}
