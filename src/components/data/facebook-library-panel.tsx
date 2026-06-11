import { createFacebookUrlAction, deleteFacebookUrlAction } from "@/app/actions/facebook-urls";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SupabaseSetupNotice, WorkspaceSetup } from "./data-state";

export async function FacebookLibraryPanel() {
  if (!isSupabaseConfigured()) return <SupabaseSetupNotice/>;
  const context = await getWorkspaceContext();
  if (!context?.membership) return <WorkspaceSetup/>;
  const workspaceId = context.membership.workspace_id;
  const { data } = await context.supabase.from("facebook_url_library").select("id,normalized_url,url_type,title,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
  return <Card className="mt-6"><CardHeader><div><h2 className="font-semibold">Facebook URL Library</h2><p className="mt-1 text-xs text-slate-500">真实数据库记录。URL 会在服务器标准化并由唯一索引防止重复。</p></div></CardHeader><CardContent><form action={createFacebookUrlAction} className="grid gap-3 md:grid-cols-2"><input type="hidden" name="workspaceId" value={workspaceId}/><input name="url" type="url" required placeholder="https://www.facebook.com/..." className="field md:col-span-2"/><select name="urlType" className="field" defaultValue="page"><option value="page">Page</option><option value="post">Post</option><option value="video">Video</option><option value="reel">Reel</option><option value="ad_library">Ad Library</option><option value="other">Other</option></select><input name="title" placeholder="资料标题" className="field"/><textarea name="notes" placeholder="研究备注" className="field min-h-20 py-3 md:col-span-2"/><button className="primary-button md:col-span-2">保存真实 URL</button></form><div className="mt-6 divide-y divide-slate-100">{data?.length ? data.map((row) => <div key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{row.title || row.url_type}</p><a className="block truncate text-sm text-brand-600" href={row.normalized_url} target="_blank" rel="noreferrer">{row.normalized_url}</a></div><form action={deleteFacebookUrlAction}><input type="hidden" name="workspaceId" value={workspaceId}/><input type="hidden" name="id" value={row.id}/><button className="secondary-button">删除</button></form></div>) : <p className="py-5 text-sm text-slate-500">目前没有 URL。系统不会自动加入 Facebook 数据。</p>}</div></CardContent></Card>;
}
