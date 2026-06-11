import { z } from "zod";

const uuid = z.string().uuid();
const requiredText = z.string().trim().min(1).max(5000);

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export const workspaceSchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9-]{3,50}$/) });
export const facebookUrlSchema = z.object({ workspaceId: uuid, url: z.string().url().max(2048), urlType: z.enum(["page", "post", "video", "reel", "ad_library", "other"]), title: z.string().trim().max(200).optional(), notes: z.string().trim().max(2000).optional() });
export const deleteRecordSchema = z.object({ workspaceId: uuid, id: uuid });
export const evidenceSchema = z.object({ workspaceId: uuid, sourceUrl: z.string().url().max(2048), summary: requiredText, region: z.string().trim().min(2).max(100), observedAt: z.coerce.date(), expiresAt: z.coerce.date() }).refine((v) => v.expiresAt > v.observedAt, { message: "有效期必须晚于观察日期", path: ["expiresAt"] });
export const evidenceReviewSchema = z.object({ workspaceId: uuid, evidenceId: uuid, decision: z.enum(["verified", "rejected", "needs_more_evidence"]), credibilityRating: z.coerce.number().int().min(1).max(5), locationRelevance: z.coerce.number().int().min(1).max(5), notes: requiredText });
export const materialSchema = z.object({ workspaceId: uuid, materialType: z.enum(["pain_point","customer_question","customer_objection","customer_quote","case_study","educational_point","product_usp","trust_element","cta","trend","visual_hook","motion_hook"]), title: z.string().trim().min(1).max(200), content: requiredText, sourceUrl: z.string().url().max(2048).or(z.literal("")).optional(), riskLevel: z.enum(["low", "medium", "high"]) });
export const scriptSchema = z.object({ workspaceId: uuid, title: z.string().trim().min(1).max(200), fullScript: requiredText, scriptHook: z.string().trim().max(1000).optional(), attention: z.string().trim().max(2000).optional(), interest: z.string().trim().max(2000).optional(), desire: z.string().trim().max(2000).optional(), action: z.string().trim().max(2000).optional(), riskLevel: z.enum(["low", "medium", "high"]), complianceStatus: z.enum(["pending", "passed", "failed", "review_required"]), qualityStatus: z.enum(["pending", "passed", "failed", "review_required"]) });
export const versionSchema = scriptSchema.omit({ title: true }).extend({ scriptId: uuid, parentVersionId: uuid.optional(), origin: z.enum(["manual", "restored"]) });
export const approvalSchema = z.object({ workspaceId: uuid, scriptId: uuid, contentVersionId: uuid, decision: z.enum(["approved", "rejected", "changes_requested"]), reason: requiredText });
export const scriptStatusSchema = z.object({ workspaceId: uuid, scriptId: uuid, status: z.enum(["draft", "needs_review", "approved", "filming", "editing", "ready", "published", "archived"]) });
export const settingsSchema = z.object({ workspaceId: uuid, dailyRequestLimit: z.coerce.number().int().min(0), monthlyRequestLimit: z.coerce.number().int().min(0), perRequestCostLimitCents: z.coerce.number().int().min(0), dailyCostLimitCents: z.coerce.number().int().min(0), monthlyCostLimitCents: z.coerce.number().int().min(0), trendExpiryDays: z.coerce.number().int().min(1).max(365) });
