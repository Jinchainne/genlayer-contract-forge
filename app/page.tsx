'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, FlaskConical, Layers3, RefreshCcw, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';

type Finding = {
  level: 'info' | 'warn' | 'error';
  category: string;
  title: string;
  detail: string;
  fix: string;
};

type Analysis = {
  score: number;
  verdict: string;
  summary: string;
  breakdown: Record<string, number>;
  findings: Finding[];
  nextSteps: string[];
  skeleton: string;
  testPlan: string[];
  contractNames: string[];
  publicViews: string[];
  publicWrites: string[];
  blueprintTags: string[];
  report: string;
};

const seedContract = `# { "Depends": "py-genlayer:test" }
from genlayer import *

class SimpleGenLayerDecision(gl.Contract):
    latest_result: str

    def __init__(self):
        self.latest_result = ""

    @gl.public.write
    def register_report(self, report_hash: str, source_url: str) -> str:
        def evaluate():
            prompt = f\"\"\"
            You are checking whether this report is relevant to the claim.
            report_hash={report_hash}
            source_url={source_url}
            Return only: approved=yes|no;reason=short reason
            \"\"\"
            return gl.exec_prompt(prompt).strip()

        result = gl.eq_principle_strict_eq(evaluate)
        self.latest_result = result
        return result

    @gl.public.view
    def latest(self) -> str:
        return self.latest_result`;

const badges = [
  'Depends marker',
  'gl.Contract shape',
  'Determinism checks',
  'Test plan generator',
  'Deployment readiness',
  'GenLayer-first docs',
];

function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition ${className}`}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`forge-panel rounded-[24px] p-5 ${className}`}>{children}</div>;
}

export default function Page() {
  const [title, setTitle] = useState('GenLayer Contract Forge');
  const [source, setSource] = useState(seedContract);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);

  const scoreTone = useMemo(() => {
    if (!analysis) return 'text-slate-200';
    if (analysis.score >= 85) return 'text-emerald-300';
    if (analysis.score >= 65) return 'text-amber-300';
    return 'text-rose-300';
  }, [analysis]);

  async function runAnalysis() {
    setBusy(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, source }),
      });
      setAnalysis(await res.json());
    } finally {
      setBusy(false);
    }
  }

  async function copySkeleton() {
    if (!analysis?.skeleton) return;
    await navigator.clipboard.writeText(analysis.skeleton);
  }

  return (
    <main className="min-h-screen forge-grid text-[15px] text-forge-text">
      <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-forge-line bg-[rgba(8,13,22,0.88)] p-5 shadow-glow lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-white/95">
              <img src="/genlayer-mark.svg" alt="GenLayer mark" className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">GenLayer Contract Forge</h1>
              <p className="text-sm text-forge-muted">A deep contract analysis tool for builders shipping intelligent contracts on GenLayer.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map(b => (
              <div key={b} className="rounded-2xl border border-forge-line bg-forge-panel px-3 py-2 text-center text-xs text-forge-muted">
                {b}
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                  <FlaskConical size={14} /> Contract input
                </div>
                <h2 className="text-3xl font-black">Paste a GenLayer contract and get a builder-grade review.</h2>
                <p className="mt-2 max-w-3xl text-sm text-forge-muted">
                  The tool scores determinism, GenLayer surface quality, tests, deployment clarity, and security. It also produces a skeleton and an actionable test path.
                </p>
              </div>
              <div className="rounded-2xl border border-forge-line bg-forge-panel2 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Readiness</p>
                <p className={`text-4xl font-black ${scoreTone}`}>{analysis ? `${analysis.score}` : '—'}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="forge-label">Title</div>
                <input value={title} onChange={e => setTitle(e.target.value)} className="forge-input" placeholder="GenLayer Contract Title" />
              </div>
              <div>
                <div className="forge-label">Contract Source</div>
                <textarea
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="forge-input min-h-[380px] resize-y font-mono text-[13px] leading-6"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={runAnalysis} disabled={busy} className="bg-gradient-to-r from-cyan-500 to-emerald-400 text-[#071017]">
                  {busy ? <RefreshCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {busy ? 'Analyzing...' : 'Forge Analysis'}
                </Button>
                <Button onClick={() => setSource(seedContract)} className="border border-forge-line bg-forge-panel2 text-forge-text">
                  <RefreshCcw size={16} /> Load sample
                </Button>
                <Button onClick={copySkeleton} className="border border-forge-line bg-forge-panel2 text-forge-text">
                  <Copy size={16} /> Copy skeleton
                </Button>
              </div>
            </div>
          </Panel>

          <div className="grid gap-5">
            <Panel>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-300" size={18} />
                <h3 className="text-xl font-black">Forge summary</h3>
              </div>
              <p className="mt-3 text-sm text-forge-muted">
                {analysis?.summary || 'Run the analyzer to get a readiness score and the first pass on contract quality.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {analysis ? Object.entries(analysis.breakdown).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-forge-line bg-forge-panel2 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">{key}</p>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                  </div>
                )) : (
                  <div className="col-span-2 rounded-2xl border border-forge-line bg-forge-panel2 p-4 text-sm text-forge-muted">
                    Scores will appear here after analysis.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Sparkles className="text-cyan-300" size={18} />
                <h3 className="text-xl font-black">Contract profile</h3>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-forge-line bg-forge-panel2 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Contract names</p>
                  <p className="mt-2 text-sm text-white">{analysis?.contractNames?.length ? analysis.contractNames.join(', ') : 'No contract class detected yet.'}</p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-forge-panel2 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Public views</p>
                  <p className="mt-2 text-sm text-white">{analysis?.publicViews?.length ? analysis.publicViews.join(', ') : 'No public view methods detected yet.'}</p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-forge-panel2 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Public writes</p>
                  <p className="mt-2 text-sm text-white">{analysis?.publicWrites?.length ? analysis.publicWrites.join(', ') : 'No public write methods detected yet.'}</p>
                </div>
                <div className="rounded-2xl border border-forge-line bg-forge-panel2 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Blueprint tags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis?.blueprintTags?.length ? analysis.blueprintTags.map(tag => (
                      <span key={tag} className="rounded-full border border-forge-line bg-black/30 px-3 py-1 text-xs text-cyan-200">
                        {tag}
                      </span>
                    )) : <span className="text-sm text-forge-muted">No tags yet.</span>}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-300" size={18} />
                <h3 className="text-xl font-black">Findings</h3>
              </div>
              <div className="mt-4 space-y-3">
                {analysis?.findings?.length ? analysis.findings.map((finding, index) => (
                  <div key={`${finding.title}-${index}`} className="rounded-2xl border border-forge-line bg-forge-panel2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                        finding.level === 'error' ? 'bg-rose-500/15 text-rose-300' : finding.level === 'warn' ? 'bg-amber-500/15 text-amber-300' : 'bg-cyan-500/15 text-cyan-300'
                      }`}>{finding.level}</span>
                      <span className="text-xs uppercase tracking-[0.2em] text-forge-muted">{finding.category}</span>
                    </div>
                    <h4 className="mt-3 font-bold text-white">{finding.title}</h4>
                    <p className="mt-2 text-sm text-forge-muted">{finding.detail}</p>
                    <p className="mt-2 text-sm text-emerald-300">Fix: {finding.fix}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-forge-line bg-forge-panel2 p-4 text-sm text-forge-muted">
                    No findings yet. Analyze a contract to populate the review.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <WandSparkles className="text-cyan-300" size={18} />
                <h3 className="text-xl font-black">Next steps</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-forge-muted">
                {analysis?.nextSteps?.length ? analysis.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`} className="rounded-2xl border border-forge-line bg-forge-panel2 px-4 py-3">{step}</li>
                )) : <li className="rounded-2xl border border-forge-line bg-forge-panel2 px-4 py-3">Write or paste a contract to generate a next-step plan.</li>}
              </ul>
            </Panel>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel>
            <div className="flex items-center gap-2">
              <Layers3 className="text-cyan-300" size={18} />
              <h3 className="text-xl font-black">Contract skeleton</h3>
            </div>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-forge-line bg-black/35 p-4 text-[12px] leading-6 text-slate-200 whitespace-pre-wrap">{analysis?.skeleton || 'The generated skeleton appears here after analysis.'}</pre>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-300" size={18} />
              <h3 className="text-xl font-black">Test plan</h3>
            </div>
            <div className="mt-4 space-y-3">
              {(analysis?.testPlan || ['The generated test plan appears here after analysis.']).map((step, index) => (
                <div key={`${step}-${index}`} className="rounded-2xl border border-forge-line bg-forge-panel2 px-4 py-3 text-sm text-forge-muted">
                  {step}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-forge-line bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-forge-muted">Full report</p>
              <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-slate-300">
                {analysis?.report || 'A longer judge-ready report will be generated here after analysis.'}
              </pre>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
