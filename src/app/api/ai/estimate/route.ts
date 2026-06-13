import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/context";
import { estimateCost } from "@/lib/ai/cost";
import { isOpenAiConfigured, modelForMode } from "@/lib/ai/openai-client";
import { generationInputSchema } from "@/lib/ai/schemas/input";
import { redactText } from "@/lib/security/redact";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await requireUser();
  let input;
  try {
    input = generationInputSchema.omit({ request_id: true }).parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "输入验证失败", detail: redactText(String(e)).slice(0, 400) }, { status: 400 });
  }
  if (!isOpenAiConfigured()) {
    return NextResponse.json({ configured: false, message: "OpenAI尚未配置" }, { status: 200 });
  }
  try {
    const model = modelForMode(input.generation_mode);
    // Estimate uses topic+instruction length as proxy; context adds margin server-side at run time.
    const est = estimateCost(model, input.generation_mode, JSON.stringify(input) + " ".repeat(3000));
    return NextResponse.json({
      configured: true,
      model,
      input_tokens: est.inputTokens,
      output_tokens: est.outputTokens,
      total_tokens: est.totalTokens,
      estimated_cost_cents: est.estimatedCostCents,
      cost_available: est.costAvailable,
      note: est.costAvailable ? null : "未配置模型价格 — 只显示Token估算，不编造费用",
    });
  } catch (e) {
    return NextResponse.json({ error: redactText(String(e)).slice(0, 200) }, { status: 500 });
  }
}
