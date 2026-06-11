import { createMaterialAction, deleteMaterialAction } from "@/app/actions/materials";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SupabaseSetupNotice, WorkspaceSetup } from "./data-state";

const types = ["pain_point","customer_question","customer_objection","customer_quote","case_study","educational_point","product_usp","trust_element","cta","trend","visual_hook","motion_hook"];
export async function MaterialsPanel() {
  if (!isSupabaseConfigured()) return <SupabaseSetupNotice/>;
  const context = await getWorkspaceContext(); if (!context?.membership) return <WorkspaceSetup/>;
  const workspaceId = context.membership.workspace_id;
  const { data } = await context.supabase.from("content_materials").select("id,material_type,title,content,risk_level").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
  return <Card className="mt-6"><CardHeader><h2 className="font-semibold">Content Materials CRUD</h2></CardHeader><CardContent><form action={createMaterialAction} className="grid gap-3 md:grid-cols-2"><input type="hidden" name="workspaceId" value={workspaceId}/><select name="materialType" className="field">{types.map((type) => <option key={type} value={type}>{type}</option>)}</select><select name="riskLevel" className="field"><option value="low">Low Risk</option><option value="medium">Medium Risk</option><option value="high">High Risk</option></select><input name="title" required className="field md:col-span-2" placeholder="标题"/><textarea name="content" required className="field min-h-24 py-3 md:col-span-2" placeholder="只输入真实、有权使用的资料"/><input name="sourceUrl" type="url" className="field md:col-span-2" placeholder="来源 URL（如适用）"/><button className="primary-button md:col-span-2">保存资料</button></form><div className="mt-5 divide-y divide-slate-100">{data?.length ? data.map((row) => <div key={row.id} className="flex gap-3 py-4"><div className="flex-1"><p className="font-medium">{row.title}</p><p className="mt-1 text-xs text-slate-500">{row.material_type} · {row.risk_level}</p><p className="mt-2 text-sm text-slate-600">{row.content}</p></div><form action={deleteMaterialAction}><input type="hidden" name="workspaceId" value={workspaceId}/><input type="hidden" name="id" value={row.id}/><button className="secondary-button">删除</button></form></div>) : <p className="py-5 text-sm text-slate-500">暂无真实内容资料。</p>}</div></CardContent></Card>;
}
