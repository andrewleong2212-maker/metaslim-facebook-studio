import { createWorkspaceAction } from "@/app/actions/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SupabaseSetupNotice() {
  return <Card className="mt-6 border-amber-200 bg-amber-50"><CardContent><h2 className="font-semibold text-amber-900">Supabase 需要设置</h2><p className="mt-2 text-sm text-amber-800">目前没有连接远端项目。配置服务器环境变量并执行 Migration 后，真实 CRUD 才会启用。</p></CardContent></Card>;
}

export function WorkspaceSetup() {
  return <Card className="mt-6"><CardHeader><h2 className="font-semibold">建立 MetaSlim AI Workspace</h2></CardHeader><CardContent><form action={createWorkspaceAction} className="grid gap-4 sm:grid-cols-2"><label><span className="label">名称</span><input name="name" defaultValue="MetaSlim AI" className="field" required/></label><label><span className="label">Slug</span><input name="slug" defaultValue="metaslim-ai" className="field" pattern="[a-z0-9-]{3,50}" required/></label><button className="primary-button sm:col-span-2">建立 Workspace</button></form></CardContent></Card>;
}
