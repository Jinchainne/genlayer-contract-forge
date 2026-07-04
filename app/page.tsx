'use client';

import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  ArrowRightLeft,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  ClipboardCopy,
  Code2,
  Copy,
  Download,
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
  createSubmissionPack,
  generateForgeBrief,
  type AnalysisResult,
  type DiffResult,
} from '../src/lib/analyzer';

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

const fallbackAnalysis = analyzeGenLayerContract(primarySample, 'ProvenanceRegistry');
const fallbackDiff = compareGenLayerContracts(primarySample, compareSample, 'ProvenanceRegistry', 'LegacyRegistry');

type CopyStatus = 'idle' | 'copied';

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgba(0,0,0,0.06)] ${className}`}>{children}</section>;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">{label}</p>
      <p className="mt-2 text-2xl font-black text-black">{value}</p>
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

export default function Page() {
  const [title, setTitle] = useState('ProvenanceRegistry');
  const [source, setSource] = useState(primarySample);
  const [compareSource, setCompareSource] = useState(compareSample);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => fallbackAnalysis);
  const [diff, setDiff] = useState<DiffResult>(() => fallbackDiff);
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyStatus>>({});

  const deployPack = useMemo(
    () => createDeployPack(analysis, title, forgeDeployment.address, forgeDeployment.tx),
    [analysis, title],
  );

  const submissionPack = useMemo(() => createSubmissionPack(analysis, title), [analysis, title]);

  const brief = useMemo(() => generateForgeBrief(source, title), [source, title]);

  const methodCount = analysis.publicViews.length + analysis.publicWrites.length;
  const findingCount = analysis.findings.length;

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [key]: 'copied' }));
    window.setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [key]: 'idle' }));
    }, 1200);
  }

  function loadPrimarySample() {
    setTitle('ProvenanceRegistry');
    setSource(primarySample);
    setCompareSource(compareSample);
    const next = analyzeGenLayerContract(primarySample, 'ProvenanceRegistry');
    setAnalysis(next);
    setDiff(compareGenLayerContracts(primarySample, compareSample, 'ProvenanceRegistry', 'LegacyRegistry'));
  }

  function loadAutomationSample() {
    const automation = `# { "Depends": "py-genlayer:test" }
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
    def route(self, policy_id: str) -> str:
        return self._routes.get(policy_id, "")`;

    setTitle('PolicyRouter');
    setSource(automation);
    setCompareSource(compareSample);
    const next = analyzeGenLayerContract(automation, 'PolicyRouter');
    setAnalysis(next);
    setDiff(compareGenLayerContracts(automation, compareSample, 'PolicyRouter', 'LegacyRegistry'));
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
    const next = compareGenLayerContracts(source, compareSource, title, 'Comparison');
    setDiff(next);
  }

  const scoreAccent =
    analysis.score >= 85 ? 'text-black' : analysis.score >= 65 ? 'text-black' : 'text-black';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_56%,#f2f2f2_100%)] text-black">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        <header className="mb-4 rounded-[24px] border border-black/10 bg-white px-5 py-4 shadow-[0_14px_36px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-black/10 bg-black">
                <img src="/genlayer-mark.svg" alt="GenLayer mark" className="h-10 w-10" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/50">GenLayer Studio</p>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Contract Forge</h1>
                <p className="mt-1 text-sm text-black/60">
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
                <div key={item.label} className="rounded-[18px] border border-black/10 bg-[#111] px-4 py-3 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">{item.label}</p>
                  <p className="mt-1 text-lg font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
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
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="rounded-[16px] border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-red-600"
                    placeholder="ProvenanceRegistry"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Comparison label</span>
                  <input
                    value="Legacy comparison"
                    readOnly
                    className="rounded-[16px] border border-black/15 bg-black/5 px-4 py-3 text-black/60 outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">Contract source</span>
                <textarea
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="min-h-[360px] rounded-[20px] border border-black/15 bg-white p-4 font-mono text-[13px] leading-6 outline-none transition focus:border-red-600"
                  spellCheck={false}
                />
              </label>

              <div className="flex flex-wrap gap-3">
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
                <ActionButton onClick={loadAutomationSample} className="border border-black/15 bg-white text-black hover:bg-black/5">
                  <Bot size={16} /> Load automation sample
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">Current source</p>
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
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel>
            <div className="flex items-center gap-2">
              <Layers3 size={18} className="text-red-700" />
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
                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-white/90">
{`genlayer network studionet
genlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api`}
                </pre>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => copyText('command', `genlayer network studionet\ngenlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api`)}
                  className="border border-black/15 bg-white text-black hover:bg-black/5"
                >
                  <ClipboardCopy size={16} /> {copyStatus.command === 'copied' ? 'Command copied' : 'Copy deploy command'}
                </ActionButton>
                <ActionButton
                  onClick={() => copyText('address', `${forgeDeployment.address || 'pending'}\n${forgeDeployment.tx || 'pending'}`)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <ArrowUpRight size={16} /> Copy chain refs
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

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
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

        <footer className="pb-5 pt-4 text-center text-xs text-black/45">
          Built for GenLayer Studio, with on-chain registry support and judge-ready output packs.
        </footer>
      </div>
    </main>
  );
}
