export type NewsSeverity = 'info' | 'warn' | 'risk';

export type NewsCheck = {
  label: string;
  state: 'pass' | 'warn' | 'fail';
  note: string;
};

export type NewsStoryInput = {
  headline: string;
  article: string;
  sources: string[];
  category: string;
  region: string;
  publishedAt?: string;
};

export type NewsStoryAnalysis = {
  score: number;
  verdict: string;
  summary: string;
  sourceCount: number;
  wordCount: number;
  quoteCount: number;
  namedEntities: string[];
  flags: string[];
  checks: NewsCheck[];
  publishPacket: string;
  onChainCommand: string;
  report: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function trimLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function extractEntities(text: string) {
  const matches = text.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
  return unique(matches).slice(0, 12);
}

function buildChecks(input: NewsStoryInput): NewsCheck[] {
  const sources = unique(trimLines(input.sources.join('\n')));
  const article = input.article.trim();
  const wordCount = article ? article.split(/\s+/).filter(Boolean).length : 0;
  const quoteCount = (article.match(/["“”]/g) || []).length;
  const hasSignalSource = sources.some(source => /^https?:\/\//i.test(source));
  const hasMultipleSources = sources.length >= 2;
  const hasNamedEntities = extractEntities(article).length > 0;
  const cautiousLanguage = /\b(allegedly|reportedly|unconfirmed|rumor|anonymous)\b/i.test(article);

  return [
    {
      label: 'Source count',
      state: hasMultipleSources ? 'pass' : 'warn',
      note: hasMultipleSources ? 'Multiple sources improve publish confidence.' : 'Add at least one more source before publishing.',
    },
    {
      label: 'Link quality',
      state: hasSignalSource ? 'pass' : 'warn',
      note: hasSignalSource ? 'Source list includes verified links.' : 'At least one source should be a verifiable URL.',
    },
    {
      label: 'Story depth',
      state: wordCount >= 120 ? 'pass' : 'warn',
      note: wordCount >= 120 ? 'Enough context for editorial review.' : 'Expand the article before pushing to the wire.',
    },
    {
      label: 'Attribution',
      state: quoteCount > 0 ? 'pass' : 'warn',
      note: quoteCount > 0 ? 'Quotes detected for attribution and context.' : 'Direct quotes help readers verify claims.',
    },
    {
      label: 'Entity coverage',
      state: hasNamedEntities ? 'pass' : 'warn',
      note: hasNamedEntities ? 'People, places, or orgs were detected.' : 'Add named entities to anchor the story.',
    },
    {
      label: 'Language risk',
      state: cautiousLanguage && !hasMultipleSources ? 'fail' : 'pass',
      note: cautiousLanguage && !hasMultipleSources ? 'Cautious language with weak sourcing is risky.' : 'Language looks acceptable for the available sources.',
    },
  ];
}

export function analyzeNewsStory(input: NewsStoryInput): NewsStoryAnalysis {
  const headline = input.headline.trim();
  const article = input.article.trim();
  const sources = unique(trimLines(input.sources.join('\n')));
  const sourceCount = sources.length;
  const wordCount = article ? article.split(/\s+/).filter(Boolean).length : 0;
  const quoteCount = (article.match(/["“”]/g) || []).length;
  const namedEntities = extractEntities(`${headline}\n${article}`);
  const checks = buildChecks(input);

  let score = 45;
  score += Math.min(20, sourceCount * 8);
  score += Math.min(15, wordCount >= 200 ? 15 : Math.floor(wordCount / 20));
  score += Math.min(10, quoteCount >= 4 ? 10 : quoteCount * 2);
  score += Math.min(10, namedEntities.length * 2);
  if (!/\b(allegedly|reportedly|unconfirmed|rumor|anonymous)\b/i.test(article)) score += 5;
  if (sourceCount < 2) score -= 10;
  if (wordCount < 80) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 85 ? 'Ready to publish' : score >= 70 ? 'Editorial review needed' : score >= 55 ? 'Needs stronger sourcing' : 'Hold for fact-checking';

  const flags = [
    sourceCount < 2 ? 'Add more sources' : null,
    wordCount < 80 ? 'Story is too thin' : null,
    quoteCount === 0 ? 'No direct quotes found' : null,
    namedEntities.length === 0 ? 'No named entities detected' : null,
  ].filter(Boolean) as string[];

  const summary = `The story "${headline || 'Untitled story'}" scores ${score}/100 with ${sourceCount} sources and ${wordCount} words. ${verdict}.`;

  const publishPacket = [
    `# News Publish Packet: ${headline || 'Untitled story'}`,
    '',
    `Category: ${input.category || 'General'}`,
    `Region: ${input.region || 'Global'}`,
    `Verdict: ${verdict}`,
    `Score: ${score}/100`,
    `Sources: ${sourceCount}`,
    '',
    '## Sources',
    sources.length ? sources.map(source => `- ${source}`).join('\n') : '- none',
    '',
    '## Headline',
    headline || 'Untitled story',
    '',
    '## Lead',
    article.slice(0, 280) || 'No article body provided yet.',
    '',
    '## On-chain Note',
    'Register the editorial snapshot on GenLayer so reviewers can verify provenance, confidence, and the final decision.',
  ].join('\n');

  const onChainCommand = [
    'genlayer call <NEWSROOM_REGISTRY_ADDRESS> register_story',
    `  --headline "${headline.replace(/"/g, '\\"') || 'Untitled story'}"`,
    `  --category "${(input.category || 'General').replace(/"/g, '\\"')}"`,
    `  --region "${(input.region || 'Global').replace(/"/g, '\\"')}"`,
    `  --verdict "${verdict.replace(/"/g, '\\"')}"`,
    `  --score ${score}`,
    `  --source-count ${sourceCount}`,
  ].join('\n');

  const report = [
    `Headline: ${headline || 'Untitled story'}`,
    `Category: ${input.category || 'General'}`,
    `Region: ${input.region || 'Global'}`,
    `Score: ${score}/100`,
    `Verdict: ${verdict}`,
    `Sources: ${sourceCount}`,
    `Words: ${wordCount}`,
    `Quotes: ${quoteCount}`,
    `Entities: ${namedEntities.length ? namedEntities.join(', ') : 'none detected'}`,
    '',
    'Checks:',
    ...checks.map(check => `- [${check.state}] ${check.label}: ${check.note}`),
    '',
    'Flags:',
    flags.length ? flags.map(flag => `- ${flag}`).join('\n') : '- none',
  ].join('\n');

  return {
    score,
    verdict,
    summary,
    sourceCount,
    wordCount,
    quoteCount,
    namedEntities,
    flags,
    checks,
    publishPacket,
    onChainCommand,
    report,
  };
}
