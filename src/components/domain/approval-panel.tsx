import { UserFocus } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export function ApprovalPanel() { return <Card><CardContent><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><UserFocus size={20}/></span><div className="flex-1"><div className="flex items-center justify-between"><h3 className="font-semibold">Human Approval</h3><StatusBadge>等待草稿</StatusBadge></div><p className="mt-2 text-sm leading-6 text-slate-500">只有通过质量、重复与合规门禁的具体版本,才可提交人工批准。</p><Button className="mt-4 w-full" variant="muted" disabled>尚无可审核版本</Button></div></div></CardContent></Card>; }
