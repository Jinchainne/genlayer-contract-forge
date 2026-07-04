export type FindingLevel = 'info' | 'warn' | 'error';

export type Finding = {
  level: FindingLevel;
  category: string;
  title: string;
  detail: string;
  fix: string;
};

export type ScoreBreakdown = {
  determinism: number;
  GenLayerSurface: number;
  tests: number;
  deployment: number;
  security: number;
};

export type AnalysisResult = {
  score: number;
  verdict: string;
  summary: string;
  breakdown: ScoreBreakdown;
  findings: Finding[];
  nextSteps: string[];
  skeleton: string;
  testPlan: string[];
  contractNames: string[];
  publicViews: string[];
  publicWrites: string[];
  blueprintTags: string[];
};

export type DiffResult = {
  scoreDelta: number;
  currentVerdict: string;
  previousVerdict: string;
  addedMethods: string[];
  removedMethods: string[];
  addedTags: string[];
  removedTags: string[];
  riskDelta: number;
  summary: string;
  report: string;
};

const ruleHit = (source: string, patterns: RegExp[]) => patterns.some(pattern => pattern.test(source));

function countMatches(source: string, patterns: RegExp[]) {
  return patterns.reduce((total, pattern) => {
    const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`));
    return total + (matches?.length || 0);
  }, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function section(title: string, body: string[]) {
  return [`## ${title}`, ...body.map(line => `- ${line}`)].join('\n');
}

function extractNames(source: string, pattern: RegExp) {
  return Array.from(source.matchAll(pattern)).map(match => match[1]).filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function analyzeGenLayerContract(source: string, title = 'Untitled Contract'): AnalysisResult {
  const text = String(source || '');
  const hasDepends = /Depends"\s*:\s*"py-genlayer:/.test(text);
  const hasContractClass = /class\s+\w+\s*\(\s*gl\.Contract\s*\)/.test(text);
  const hasPublicView = /@gl\.public\.view/.test(text);
  const hasPublicWrite = /@gl\.public\.write/.test(text);
  const hasExecPrompt = /gl\.exec_prompt\s*\(/.test(text);
  const hasEqBlock = /gl\.eq_principle|eq_principle/.test(text);
  const hasWeb = /gl\.(nondet\.)?web|requests|fetch\(|httpx|urllib/.test(text);
  const hasStorage = /\b(TreeMap|DynArray|u256|u128|i256|Address)\b/.test(text);
  const hasTestsHint = /pytest|direct_deploy|mock_llm|mock_web|gltest/.test(text);
  const hasDeployHint = /genlayer deploy|deployScript|Studionet|studio\.genlayer\.com/.test(text);
  const hasReadmeDocs = /README|docs\//.test(text);
  const contractNames = extractNames(text, /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*gl\.Contract\s*\)/g);
  const publicViews = parseMethodNames(text, '@gl.public.view');
  const publicWrites = parseMethodNames(text, '@gl.public.write');
  const antiPatterns = [
    /import\s+random/,
    /time\.sleep/,
    /datetime\.now/,
    /uuid\.uuid4/,
    /open\s*\(/,
    /os\.system/,
    /subprocess/,
    /eval\s*\(/,
    /exec\s*\(/,
  ];

  const findings: Finding[] = [];
  if (!hasDepends) findings.push({ level: 'error', category: 'GenLayer surface', title: 'Missing Depends marker', detail: 'GenLayer contracts should include the GenVM Depends header so the runtime understands the contract target.', fix: '# { "Depends": "py-genlayer:test" }' });
  if (!hasContractClass) findings.push({ level: 'error', category: 'GenLayer surface', title: 'No gl.Contract class', detail: 'The file does not look like a GenLayer intelligent contract class.', fix: 'Define a `class X(gl.Contract):` entry point.' });
  if (!hasPublicView) findings.push({ level: 'warn', category: 'Surface', title: 'No public view method', detail: 'A read method is useful for contract transparency and judge verification.', fix: 'Expose at least one `@gl.public.view` method.' });
  if (!hasPublicWrite) findings.push({ level: 'warn', category: 'Surface', title: 'No public write method', detail: 'Builder repos usually need at least one write path to show state transitions.', fix: 'Expose at least one `@gl.public.write` method.' });
  if (!hasEqBlock && hasExecPrompt) findings.push({ level: 'error', category: 'Determinism', title: 'LLM call without equivalence wrapper', detail: 'Non-deterministic reasoning should usually be wrapped in an equivalence-principle block.', fix: 'Wrap the prompt call in `gl.eq_principle_*` or the project’s approved equivalence helper.' });
  if (hasWeb && !hasEqBlock) findings.push({ level: 'error', category: 'Determinism', title: 'Web access without consensus guard', detail: 'Web retrieval is a GenLayer strength, but it should be handled inside the contract’s consensus pattern.', fix: 'Move web calls into the equivalence-principle path.' });
  if (countMatches(text, antiPatterns) > 0) findings.push({ level: 'error', category: 'Security', title: 'Forbidden or risky API usage detected', detail: 'The source contains operations that often break deterministic execution or contract safety.', fix: 'Replace side-effectful APIs with GenLayer-compatible equivalents.' });
  if (!hasStorage) findings.push({ level: 'warn', category: 'Storage', title: 'No explicit GenLayer storage type detected', detail: 'Using contract-native storage types usually improves portability and readability.', fix: 'Consider `TreeMap`, `DynArray`, `u256`, or related GenLayer-native types.' });
  if (!hasTestsHint) findings.push({ level: 'warn', category: 'Testing', title: 'No direct/integration test hint found', detail: 'GenLayer repos benefit from direct mode tests and consensus integration tests.', fix: 'Add direct tests and a deploy/integration path.' });
  if (!hasDeployHint) findings.push({ level: 'warn', category: 'Deployment', title: 'Deployment path not obvious', detail: 'A strong GenLayer tool should show how to reach Studionet or the chosen target network.', fix: 'Add a deploy script, network config, or Studio target note.' });
  if (!hasReadmeDocs) findings.push({ level: 'info', category: 'Docs', title: 'Documentation surface looks light', detail: 'A judge-friendly repo usually explains why the contract exists and how to verify it.', fix: 'Add a short README, example input, and verification steps.' });

  const breakdown: ScoreBreakdown = {
    determinism: clamp(100 - findings.filter(f => f.category === 'Determinism' && f.level === 'error').length * 28 - findings.filter(f => f.category === 'Determinism' && f.level === 'warn').length * 10, 0, 100),
    GenLayerSurface: clamp((hasDepends ? 20 : 0) + (hasContractClass ? 25 : 0) + (hasPublicView ? 15 : 0) + (hasPublicWrite ? 15 : 0) + (hasStorage ? 15 : 0) + (hasEqBlock ? 10 : 0), 0, 100),
    tests: clamp((hasTestsHint ? 60 : 0) + (hasDeployHint ? 20 : 0) + (hasReadmeDocs ? 20 : 0), 0, 100),
    deployment: clamp((hasDeployHint ? 60 : 0) + (hasDepends ? 15 : 0) + (hasContractClass ? 10 : 0) + (hasReadmeDocs ? 15 : 0), 0, 100),
    security: clamp(100 - countMatches(text, antiPatterns) * 18 - (hasEqBlock ? 0 : 12), 0, 100),
  };

  const score = Math.round((breakdown.determinism * 0.28 + breakdown.GenLayerSurface * 0.28 + breakdown.tests * 0.14 + breakdown.deployment * 0.15 + breakdown.security * 0.15));
  const verdict = score >= 85 ? 'Strong GenLayer candidate' : score >= 65 ? 'Promising with cleanup needed' : 'Needs structural work';
  const summary = `The contract \"${title}\" scores ${score}/100. It looks ${verdict.toLowerCase()} based on surface shape, determinism, testability, deployment clarity, and safety.`;

  const nextSteps: string[] = [];
  if (!hasDepends) nextSteps.push('Add the GenVM Depends header.');
  if (!hasContractClass) nextSteps.push('Wrap the logic in a `gl.Contract` class.');
  if (!hasPublicView) nextSteps.push('Expose a compact view method for judge inspection.');
  if (!hasPublicWrite) nextSteps.push('Expose at least one write path to show state changes.');
  if (!hasEqBlock) nextSteps.push('Move nondeterministic logic into an equivalence-principle block.');
  if (!hasTestsHint) nextSteps.push('Add direct mode tests with mocked web/LLM inputs.');
  if (!hasDeployHint) nextSteps.push('Document the deploy path to Studionet or the intended network.');
  if (!hasReadmeDocs) nextSteps.push('Add a judge-facing README section with purpose and verification steps.');

  const skeleton = [
    '# { "Depends": "py-genlayer:test" }',
    '',
    'from genlayer import *',
    '',
    `class ${title.replace(/[^A-Za-z0-9]+/g, '') || 'GenLayerContract'}(gl.Contract):`,
    '    def __init__(self):',
    '        self._latest = ""',
    '',
    '    @gl.public.write',
    '    def submit(self, payload: str) -> str:',
    '        def evaluate():',
    '            # Replace with your consensus-sensitive reasoning or web evidence flow.',
    '            return payload.strip()',
    '',
    '        result = gl.eq_principle_strict_eq(evaluate)',
    '        self._latest = result',
    '        return result',
    '',
    '    @gl.public.view',
    '    def latest(self) -> str:',
    '        return self._latest',
  ].join('\n');

  const testPlan = [
    'Lint the contract with `genvm-lint check contracts/<file>.py`.',
    'Add a direct test that deploys in memory and mocks any web/LLM dependency.',
    'Add at least one revert expectation for bad inputs or missing evidence.',
    'Run the contract in Studio or Studionet once before shipping.',
    'Confirm at least one public view method returns stable output.',
  ];

  if (hasExecPrompt || hasWeb) {
    nextSteps.push('Add a human-readable evidence policy explaining how web/LLM consensus is trusted.');
  }

  if (ruleHit(text, [/\bTreeMap\b/, /\bDynArray\b/])) {
    nextSteps.push('Paginate or summarize large storage collections in view methods.');
  }

  const blueprintTags = [
    hasExecPrompt ? 'LLM reasoning' : null,
    hasWeb ? 'web evidence' : null,
    hasStorage ? 'stateful registry' : null,
    hasPublicWrite && hasPublicView ? 'builder-friendly public API' : null,
    hasEqBlock ? 'consensus wrapper' : null,
    hasDeployHint ? 'deployment path' : null,
  ].filter(Boolean) as string[];

  return {
    score,
    verdict,
    summary,
    breakdown,
    findings,
    nextSteps: Array.from(new Set(nextSteps)),
    skeleton,
    testPlan,
    contractNames,
    publicViews,
    publicWrites,
    blueprintTags,
  };
}

export function generateForgeBrief(source: string, title: string) {
  const analysis = analyzeGenLayerContract(source, title);
  const report = [
    section('Contract Profile', [
      `Contract names: ${analysis.contractNames.length ? analysis.contractNames.join(', ') : 'none detected'}`,
      `Public views: ${analysis.publicViews.length ? analysis.publicViews.join(', ') : 'none detected'}`,
      `Public writes: ${analysis.publicWrites.length ? analysis.publicWrites.join(', ') : 'none detected'}`,
      `Blueprint tags: ${analysis.blueprintTags.length ? analysis.blueprintTags.join(', ') : 'none detected'}`,
    ]),
    section('Score', [`Verdict: ${analysis.verdict}`, `Score: ${analysis.score}/100`, analysis.summary]),
    section('Breakdown', Object.entries(analysis.breakdown).map(([key, value]) => `${key}: ${value}/100`)),
    section('Findings', analysis.findings.length ? analysis.findings.map(f => `[${f.level.toUpperCase()}] ${f.category} - ${f.title}: ${f.detail} Fix: ${f.fix}`) : ['No major issues detected.']),
    section('Next Steps', analysis.nextSteps.length ? analysis.nextSteps : ['No immediate changes required.']),
    section('Skeleton', [analysis.skeleton]),
    section('Test Plan', analysis.testPlan),
  ].join('\n\n');

  return { analysis, report };
}

export function createDeployPack(analysis: AnalysisResult, title: string, address?: string, tx?: string) {
  const deployCommand = [
    'genlayer network studionet',
    'genlayer deploy --contract contracts/genlayer_contract_forge.py --rpc https://studio.genlayer.com/api',
  ].join('\n');

  return [
    `# Deploy Pack: ${title}`,
    '',
    `Contract: ${analysis.contractNames[0] || 'ContractForgeRegistry'}`,
    `Score: ${analysis.score}/100`,
    `Verdict: ${analysis.verdict}`,
    `Address: ${address || 'pending'}`,
    `Tx: ${tx || 'pending'}`,
    '',
    '## Deploy',
    deployCommand,
    '',
    '## Read Methods',
    analysis.publicViews.length ? analysis.publicViews.join(', ') : 'project, stats, latest_record',
    '',
    '## Write Methods',
    analysis.publicWrites.length ? analysis.publicWrites.join(', ') : 'register_analysis',
    '',
    '## Judge Snapshot',
    analysis.findings.length ? analysis.findings.map(f => `- [${f.level}] ${f.title}`).join('\n') : '- No major findings',
  ].join('\n');
}

export function createSubmissionPack(analysis: AnalysisResult, title: string) {
  return [
    `# Submission Pack: ${title}`,
    '',
    `- Readiness score: ${analysis.score}/100`,
    `- Verdict: ${analysis.verdict}`,
    `- Contract classes: ${analysis.contractNames.length ? analysis.contractNames.join(', ') : 'none detected'}`,
    `- Public views: ${analysis.publicViews.length ? analysis.publicViews.join(', ') : 'none detected'}`,
    `- Public writes: ${analysis.publicWrites.length ? analysis.publicWrites.join(', ') : 'none detected'}`,
    `- Tags: ${analysis.blueprintTags.length ? analysis.blueprintTags.join(', ') : 'none detected'}`,
    '',
    '## One-line description',
    `GenLayer Contract Forge is a builder tool for preflighting intelligent contracts before deployment.`,
    '',
    '## Short notes',
    analysis.nextSteps.length ? analysis.nextSteps.map(step => `- ${step}`).join('\n') : '- No immediate changes required.',
  ].join('\n');
}

function parseMethodNames(source: string, annotation: '@gl.public.view' | '@gl.public.write') {
  const lines = source.split(/\r?\n/);
  return unique(lines.flatMap((line, index) => {
    if (!line.includes(annotation)) return [];
    const next = lines[index + 1] || '';
    const match = next.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    return match ? [match[1]] : [];
  }));
}

export function compareGenLayerContracts(currentSource: string, previousSource: string, currentTitle = 'Current Contract', previousTitle = 'Previous Contract'): DiffResult {
  const current = analyzeGenLayerContract(currentSource, currentTitle);
  const previous = analyzeGenLayerContract(previousSource, previousTitle);
  const currentMethods = unique([...current.publicViews, ...current.publicWrites]);
  const previousMethods = unique([...previous.publicViews, ...previous.publicWrites]);
  const addedMethods = currentMethods.filter(method => !previousMethods.includes(method));
  const removedMethods = previousMethods.filter(method => !currentMethods.includes(method));
  const addedTags = current.blueprintTags.filter(tag => !previous.blueprintTags.includes(tag));
  const removedTags = previous.blueprintTags.filter(tag => !current.blueprintTags.includes(tag));
  const riskDelta = current.findings.filter(f => f.level === 'error').length - previous.findings.filter(f => f.level === 'error').length;
  const scoreDelta = current.score - previous.score;
  const summary = `Score changed by ${scoreDelta >= 0 ? '+' : ''}${scoreDelta}. ${addedMethods.length ? `Added: ${addedMethods.join(', ')}.` : 'No new methods added.'} ${removedMethods.length ? `Removed: ${removedMethods.join(', ')}.` : 'No methods removed.'}`;

  const report = [
    section('Comparison', [
      `Current score: ${current.score}/100`,
      `Previous score: ${previous.score}/100`,
      `Score delta: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`,
      `Risk delta: ${riskDelta >= 0 ? '+' : ''}${riskDelta} error findings`,
    ]),
    section('Methods Added', addedMethods.length ? addedMethods : ['None']),
    section('Methods Removed', removedMethods.length ? removedMethods : ['None']),
    section('Tags Added', addedTags.length ? addedTags : ['None']),
    section('Tags Removed', removedTags.length ? removedTags : ['None']),
    section('Action', [
      scoreDelta >= 0 ? 'The current version looks safer or more complete.' : 'The current version regressed. Review the changed logic.',
      addedMethods.length ? 'Keep the new methods and add tests that cover them.' : 'If this was intentional, document why no new API surface was added.',
    ]),
  ].join('\n\n');

  return {
    scoreDelta,
    currentVerdict: current.verdict,
    previousVerdict: previous.verdict,
    addedMethods,
    removedMethods,
    addedTags,
    removedTags,
    riskDelta,
    summary,
    report,
  };
}
