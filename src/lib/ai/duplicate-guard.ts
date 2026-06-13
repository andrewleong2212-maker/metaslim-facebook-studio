/**
 * Duplicate Guard — deterministic, no AI cost.
 * Normalization + n-gram Dice + token similarity + keyword overlap, max-pooled.
 * Thresholds: <0.70 safe, 0.70–0.84 similar, >=0.85 duplicate.
 */
export type DuplicateVerdict = "safe" | "similar" | "duplicate";

export interface HistoricalScript {
  script_id: string;
  topic: string | null;
  script_hook: string | null;
  first_second_text: string | null;
  cta: string | null;
  full_script: string | null;
  angle: string | null;
  created_at: string;
}

export interface DuplicateReport {
  verdict: DuplicateVerdict;
  similarity_score: number;
  matched_script_ids: string[];
  matched_sections: string[];
  explanation: string;
  recommended_change: string | null;
}

export const SIMILAR_THRESHOLD = 0.7;
export const DUPLICATE_THRESHOLD = 0.85;

export function normalizeText(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

function ngrams(t: string, n: number): Set<string> {
  const s = normalizeText(t);
  const out = new Set<string>();
  for (let i = 0; i <= s.length - n; i++) out.add(s.slice(i, i + n));
  return out;
}

function diceOf(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((g) => { if (b.has(g)) inter++; });
  return (2 * inter) / (a.size + b.size);
}

export function ngramSimilarity(a: string, b: string, n = 2): number {
  return diceOf(ngrams(a, n), ngrams(b, n));
}

/** Token-level similarity for mixed zh/en text (zh chars as tokens, en words as tokens). */
export function tokenSimilarity(a: string, b: string): number {
  const tok = (t: string) => new Set(t.toLowerCase().match(/[一-鿿]|[a-z0-9]+/g) ?? []);
  return diceOf(tok(a), tok(b));
}

/** Keyword overlap: proportion of significant tokens shared (Jaccard on long tokens). */
export function keywordOverlap(a: string, b: string): number {
  const kw = (t: string) => new Set((t.toLowerCase().match(/[一-鿿]{2,}|[a-z]{4,}/g) ?? []));
  const A = kw(a), B = kw(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((g) => { if (B.has(g)) inter++; });
  return inter / (A.size + B.size - inter);
}

function pairScore(a: string, b: string): number {
  return Math.max(ngramSimilarity(a, b), tokenSimilarity(a, b) * 0.95, keywordOverlap(a, b) * 0.9);
}

export interface CandidateContent {
  topic: string;
  script_hook: string;
  first_second_text: string;
  cta: string;
  full_script: string;
  angle: string;
}

export function checkDuplicates(candidate: CandidateContent, history: HistoricalScript[]): DuplicateReport {
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const d90 = now - 90 * 86400000;
  let best = 0;
  const matchedIds = new Set<string>();
  const matchedSections = new Set<string>();

  const consider = (section: string, score: number, id: string) => {
    if (score >= SIMILAR_THRESHOLD) { matchedIds.add(id); matchedSections.add(section); }
    if (score > best) best = score;
  };

  for (const h of history) {
    const t = new Date(h.created_at).getTime();
    if (h.topic && t >= d30) consider("topic", pairScore(candidate.topic, h.topic), h.script_id);
    if (h.script_hook && t >= d90) consider("hook", pairScore(candidate.script_hook, h.script_hook), h.script_id);
    if (h.angle && t >= d90) consider("angle", pairScore(candidate.angle, h.angle), h.script_id);
    if (h.cta) consider("cta", pairScore(candidate.cta, h.cta) * 0.85, h.script_id); // CTA repeats matter less alone
    if (h.first_second_text) consider("first_second_text", pairScore(candidate.first_second_text, h.first_second_text), h.script_id);
    if (h.full_script) consider("full_script", pairScore(candidate.full_script, h.full_script), h.script_id);
  }

  const score = Number(best.toFixed(3));
  const verdict: DuplicateVerdict = score >= DUPLICATE_THRESHOLD ? "duplicate" : score >= SIMILAR_THRESHOLD ? "similar" : "safe";
  return {
    verdict,
    similarity_score: score,
    matched_script_ids: [...matchedIds],
    matched_sections: [...matchedSections],
    explanation:
      verdict === "safe"
        ? "与最近30天Topic、90天Hook/Angle及历史CTA/Script比对，未发现高相似内容。"
        : `与历史内容相似度 ${score}（${[...matchedSections].join("、")}）。`,
    recommended_change:
      verdict === "safe" ? null : "必须更换Angle、Hook和生活场景，不可只换字。",
  };
}
