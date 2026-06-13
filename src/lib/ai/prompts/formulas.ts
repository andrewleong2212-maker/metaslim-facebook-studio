export interface FormulaSectionDef { key: string; label: string; guidance: string }
export interface FormulaDef { id: string; label: string; sections: FormulaSectionDef[] }

export const FORMULA_DEFS: Record<string, FormulaDef> = {
  aida: {
    id: "aida", label: "AIDA",
    sections: [
      { key: "attention", label: "Attention", guidance: "输出Script Hook、Visual Hook、Motion Hook、First-second Text。目标：点名目标顾客/痛点/冲突/打破认知/结果暗示/好奇。" },
      { key: "interest", label: "Interest", guidance: "输出Real-life Situation、Customer Emotion、Pain Escalation、Audience Lock。不过早介绍MetaSlim、不只讲大道理、必须有生活场景、让顾客觉得「你在讲我」。" },
      { key: "desire", label: "Desire", guidance: "输出Problem Reframe、Result Promise、MetaSlim Solution、Trust Element、Offer Reframing。解释过去方法为什么失败、不把问题归咎于不自律、结果具体但不夸张、MetaSlim必须是系统方案、Trust Element只放最相关的1至3项。" },
      { key: "action", label: "Action", guidance: "输出CTA、CTA Keyword、Customer Benefit、Reason to Act。CTA必须说明：顾客要做什么、发什么Keyword、会得到什么、为什么现在行动。" },
    ],
  },
  pas: {
    id: "pas", label: "PAS",
    sections: [
      { key: "problem", label: "Problem", guidance: "直接点出顾客正在经历的问题。" },
      { key: "agitate", label: "Agitate", guidance: "用真实生活场景放大问题的代价与情绪。" },
      { key: "solution", label: "Solution", guidance: "给出正确方向并自然桥接MetaSlim系统方案。" },
      { key: "cta", label: "CTA", guidance: "单一清楚CTA + Keyword。" },
    ],
  },
  hook_pain_reframe_solution_cta: {
    id: "hook_pain_reframe_solution_cta", label: "Hook-Pain-Reframe-Solution-CTA",
    sections: [
      { key: "hook", label: "Hook", guidance: "直接开场。" },
      { key: "pain_scene", label: "Pain Scene", guidance: "具体生活场景。" },
      { key: "escalation", label: "Escalation", guidance: "痛点升级。" },
      { key: "reframe", label: "Reframe", guidance: "翻转认知：问题不是顾客不自律。" },
      { key: "solution", label: "Solution", guidance: "正确方法。" },
      { key: "bridge", label: "MetaSlim Bridge", guidance: "自然桥接。" },
      { key: "cta", label: "CTA", guidance: "单一CTA + Keyword。" },
    ],
  },
  storytelling: {
    id: "storytelling", label: "Storytelling",
    sections: [
      { key: "character", label: "Character", guidance: "不虚构具体身份，用典型顾客画像。" },
      { key: "situation", label: "Situation", guidance: "生活情境。" },
      { key: "conflict", label: "Conflict", guidance: "挣扎与反复。" },
      { key: "realisation", label: "Realisation", guidance: "转折认知。" },
      { key: "change", label: "Change", guidance: "改变过程，不承诺结果。" },
      { key: "lesson", label: "Lesson", guidance: "核心领悟。" },
      { key: "bridge", label: "MetaSlim Bridge", guidance: "自然桥接。" },
      { key: "cta", label: "CTA", guidance: "单一CTA + Keyword。" },
    ],
  },
  educational: {
    id: "educational", label: "Educational",
    sections: [
      { key: "misconception", label: "Misconception", guidance: "常见迷思。" },
      { key: "why", label: "Why", guidance: "为什么是错的。" },
      { key: "impact", label: "Impact", guidance: "继续错下去的代价。" },
      { key: "correct_approach", label: "Correct Approach", guidance: "正确做法。" },
      { key: "bridge", label: "MetaSlim Bridge", guidance: "自然桥接。" },
      { key: "cta", label: "CTA", guidance: "单一CTA + Keyword。" },
    ],
  },
  direct_response: {
    id: "direct_response", label: "Direct Response",
    sections: [
      { key: "desired_result", label: "Desired Result", guidance: "顾客想要的结果（不保证）。" },
      { key: "offer", label: "Offer", guidance: "清楚的Offer。" },
      { key: "proof", label: "Proof", guidance: "只用提供的Verified Evidence；没有就不写Proof声明。" },
      { key: "what_customer_gets", label: "What Customer Gets", guidance: "具体得到什么。" },
      { key: "objection", label: "Objection", guidance: "处理最大异议。" },
      { key: "urgency", label: "Urgency", guidance: "真实的行动理由，不制造假紧迫。" },
      { key: "cta", label: "CTA", guidance: "单一CTA + Keyword。" },
    ],
  },
  webinar_lead: {
    id: "webinar_lead", label: "Webinar Lead",
    sections: [
      { key: "problem", label: "Problem", guidance: "顾客问题。" },
      { key: "knowledge_gap", label: "Knowledge Gap", guidance: "他们缺的认知。" },
      { key: "webinar_promise", label: "Webinar Promise", guidance: "Webinar会讲什么。" },
      { key: "learning_outcome", label: "Learning Outcome", guidance: "学完能做到什么。" },
      { key: "trust", label: "Trust", guidance: "只用真实Trust Element。" },
      { key: "cta", label: "Registration CTA", guidance: "报名CTA + Keyword。" },
    ],
  },
  soft_sell: {
    id: "soft_sell", label: "Soft Sell",
    sections: [
      { key: "relatable_situation", label: "Relatable Situation", guidance: "高共鸣场景。" },
      { key: "helpful_insight", label: "Helpful Insight", guidance: "真正有用的洞察。" },
      { key: "gentle_reframe", label: "Gentle Reframe", guidance: "温和翻转。" },
      { key: "bridge", label: "Low-pressure Bridge", guidance: "低压力桥接。" },
      { key: "cta", label: "Soft CTA", guidance: "软性CTA。" },
    ],
  },
};

export function formulaPromptBlock(formulaId: string): string {
  if (formulaId === "ai_recommended") {
    const list = Object.values(FORMULA_DEFS).map((f) => f.id).join(", ");
    return `Formula：由你根据Campaign Goal、Audience Temperature与题材推荐最合适的一个（可选：${list}）。必须在generation_metadata输出recommended_formula、recommendation_reason、alternative_formula，并把实际使用的写入formula_used。按所选Formula的结构输出formula_sections。`;
  }
  const def = FORMULA_DEFS[formulaId];
  if (!def) throw new Error(`Unknown formula: ${formulaId}`);
  const sections = def.sections.map((s, i) => `${i + 1}. [${s.key}] ${s.label}：${s.guidance}`).join("\n");
  return `Formula：${def.label}。formula_sections必须按以下顺序、使用这些section_key：\n${sections}\n\ngeneration_metadata.formula_used="${def.id}"，recommended_formula/recommendation_reason/alternative_formula设为null。`;
}
