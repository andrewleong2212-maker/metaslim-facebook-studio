/** Compliance Checker — deterministic pattern screen. High risk can never be approved. */
export type ComplianceLevel = "safe" | "needs_revision" | "high_risk";

export interface ComplianceFlag {
  rule: string;
  original_phrase: string;
  risk_reason: string;
  safe_rewrite: string;
}

export interface ComplianceReport {
  level: ComplianceLevel;
  risk_score: number; // 0-100
  flagged_items: ComplianceFlag[];
  can_be_approved: boolean;
}

interface Rule { id: string; re: RegExp; weight: number; reason: string; rewrite: string }

const RULES: Rule[] = [
  { id: "guaranteed_kg", re: /保证(瘦|减)\s*\d+\s*(kg|公斤|斤)|包(瘦|减)\d+/iu, weight: 40, reason: "保证瘦多少公斤", rewrite: "改为描述方法与支持，不承诺具体减重数字" },
  { id: "guaranteed_time", re: /(\d+)\s*(天|个?月|星期|周)\s*(内)?(必|保证|一定)(瘦|减)/u, weight: 40, reason: "保证时间内见效", rewrite: "移除时间承诺，改讲个性化进度" },
  { id: "works_for_all", re: /(所有人|人人|每个人)(都)?(有效|适用|能瘦)/u, weight: 30, reason: "声称所有人有效", rewrite: "改为「适合什么人」的限定描述" },
  { id: "absolute_refund", re: /无效(全额)?退款|不瘦包退/u, weight: 25, reason: "绝对退款承诺", rewrite: "移除，退款条款由官方页面说明" },
  { id: "disease_treatment", re: /(治疗|治好|根治|医治)(糖尿病|高血压|脂肪肝|甲状腺|疾病|三高)/u, weight: 45, reason: "暗示治疗疾病", rewrite: "删除疾病治疗暗示；最多讲健康生活方式支持" },
  { id: "rx_misleading", re: /(处方|药物)(级|般)(效果|功效)|代替药物/u, weight: 40, reason: "处方药误导", rewrite: "删除药物类比" },
  { id: "extreme_diet", re: /(一天一餐|不吃(饭|东西)|断食\d+天|只喝水)/u, weight: 35, reason: "极端节食/危险建议", rewrite: "改为均衡饮食安排" },
  { id: "body_shaming", re: /(肥婆|胖得(像|跟)|没人要|嫁不出|丢脸)/u, weight: 35, reason: "身材羞辱", rewrite: "改用顾客自身感受描述（卡重、不自在）" },
  { id: "fear_excess", re: /(再不减|不瘦)(就|你就)(完了|没救|等死|来不及)/u, weight: 30, reason: "过度恐吓", rewrite: "改为正向行动理由" },
  { id: "fake_beforeafter", re: /(before\s*\/?\s*after|前后对比)(图|照)/iu, weight: 20, reason: "Before/After合规风险", rewrite: "移除对比图引用，除非有真实授权案例" },
  { id: "fake_cert", re: /(国际|美国|FDA|卫生部)(认证|批准)/u, weight: 35, reason: "认证声明需真实证据", rewrite: "没有Verified Evidence时删除认证声明" },
  { id: "fake_stats", re: /\d{2,}%\s*(的人|顾客|学员)(都)?(瘦|成功|有效)/u, weight: 30, reason: "统计数字需真实来源", rewrite: "没有Verified Evidence时删除统计" },
  { id: "only_in_my", re: /全马(唯一|第一|最强)/u, weight: 25, reason: "「全马唯一」类夸张声明", rewrite: "改为可验证的具体差异点" },
  { id: "wrong_mechanism", re: /(燃烧|溶解|融化)脂肪(细胞)?|排出(宿便|毒素)减重/u, weight: 25, reason: "错误医学机制", rewrite: "改为饮食与习惯调整的真实机制" },
  { id: "meta_personal", re: /(你这么胖|你的肥胖|像你这种身材)/u, weight: 30, reason: "Meta广告个人属性风险", rewrite: "改为第三人称场景描述" },
  { id: "fake_trend", re: /(最近(很红|爆红|流行)|全马都在(讨论|疯))/u, weight: 25, reason: "趋势声明需Verified Evidence支持", rewrite: "没有趋势证据时删除趋势声明" },
];

export function checkCompliance(text: string, opts?: { hasVerifiedTrendEvidence?: boolean; hasVerifiedProof?: boolean }): ComplianceReport {
  const flagged: ComplianceFlag[] = [];
  let score = 0;
  for (const rule of RULES) {
    if (rule.id === "fake_trend" && opts?.hasVerifiedTrendEvidence) continue;
    if ((rule.id === "fake_cert" || rule.id === "fake_stats") && opts?.hasVerifiedProof) continue;
    const m = text.match(rule.re);
    if (m) {
      flagged.push({ rule: rule.id, original_phrase: m[0].slice(0, 60), risk_reason: rule.reason, safe_rewrite: rule.rewrite });
      score += rule.weight;
    }
  }
  const risk = Math.min(100, score);
  const level: ComplianceLevel = risk >= 40 ? "high_risk" : risk > 0 ? "needs_revision" : "safe";
  return { level, risk_score: risk, flagged_items: flagged, can_be_approved: level !== "high_risk" };
}
