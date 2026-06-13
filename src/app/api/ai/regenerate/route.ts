import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/context";
import { runGeneration } from "@/lib/ai/engine";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";
import { generationInputSchema } from "@/lib/ai/schemas/input";
import { redactText } from "@/lib/security/redact";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REGEN_TARGETS = ["all","hook","interest","desire","cta","change_formula","change_angle","more_conversational","more_direct","shorten","extend"] as const;

const regenSchema = z.object({
  workspace_id: z.string().uuid(),
  script_id: z.string().uuid(),
  target: z.enum(REGEN_TARGETS),
  new_formula: z.string().optional(),
  request_id: z.string().min(8).max(80),
});

const TARGET_INSTRUCTION: Record<(typeof REGEN_TARGETS)[number], string> = {
  all: "整体重新生成，方向必须与上一版有真实差异。",
  hook: "只针对Hook重做：3组全新Hook，方向必须与上一版完全不同。其余部分保持同等质量重写以配合新Hook。",
  interest: "重点重写Interest/Pain场景段，加强生活场景与共鸣。",
  desire: "重点重写Desire/Solution段，强化Reframe与系统方案桥接。",
  cta: "重点重写CTA段：更清楚的行动指令与Keyword理由。",
  change_formula: "改用指定的新Formula重新组织全文。",
  change_angle: "更换切入Angle：新的核心问题视角，不可与上一版相同。",
  more_conversational: "改写得更口语、更像马来西亚华人日常讲话。",
  more_direct: "改写得更直接，删掉铺垫，每句都推进。",
  shorten: "压缩脚本长度约30%，保留核心信息与CTA。",
  extend: "扩展脚本，加深场景与说服层次，但仍只讲一个核心问题。",
};

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!isOpenAiConfigured()) return NextResponse.json({ error: "OpenAI尚未配置" }, { status: 503 });

  let body;
  try {
    body = regenSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "输入验证失败", detail: redactText(String(e)).slice(0, 300) }, { status: 400 });
  }

  // Load the script's latest AI run to reuse its input snapshot
  const { data: lastRun } = await supabase
    .from("ai_generation_runs")
    .select("input_snapshot")
    .eq("workspace_id", body.workspace_id)
    .eq("script_id", body.script_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastRun) return NextResponse.json({ error: "找不到该Script的AI生成记录" }, { status: 404 });

  let input;
  try {
    const snapshot = lastRun.input_snapshot as Record<string, unknown>;
    input = generationInputSchema.parse({
      ...snapshot,
      request_id: body.request_id,
      formula: body.target === "change_formula" && body.new_formula ? body.new_formula : snapshot.formula,
      additional_instruction: [snapshot.additional_instruction, `【Regeneration指令】${TARGET_INSTRUCTION[body.target]}`].filter(Boolean).join("\n"),
    });
  } catch (e) {
    return NextResponse.json({ error: "历史输入快照无效", detail: redactText(String(e)).slice(0, 300) }, { status: 422 });
  }

  const result = await runGeneration(input, { db: supabase, userId: user.id, targetScriptId: body.script_id });
  const status = result.status === "succeeded" ? 200 : result.status === "blocked" ? 429 : 502;
  return NextResponse.json(result, { status });
}
