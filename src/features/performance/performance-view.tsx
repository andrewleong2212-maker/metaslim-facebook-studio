import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, DisconnectedNotice } from "@/components/ui/state-panels";
import { StatusBadge } from "@/components/ui/status-badge";

const metrics=["Reach","3-second Views","Average Watch Time","Completion Rate","Messenger","WhatsApp","Leads","Sales","Ad Spend"];
export function PerformanceView(){return <><PageHeader eyebrow="Measurement" title="Facebook Performance" description="未来用于记录经授权或人工导入的 Facebook 内容表现。当前不会创建假数字、假图表或假 API 响应。"/><DisconnectedNotice service="Facebook Performance API"/><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{metrics.map(x=><Card key={x}><CardContent><div className="flex items-center justify-between"><p className="text-sm font-semibold">{x}</p><StatusBadge>无资料</StatusBadge></div><p className="mt-5 text-2xl font-bold text-slate-300">—</p><p className="mt-2 text-xs text-slate-500">尚未连接或导入</p></CardContent></Card>)}</div><div className="mt-5"><EmptyState title="还没有 Facebook 表现数据" description="连接经授权的数据来源或建立安全的人工导入流程后,这里才会显示真实 Reach、Watch Time、Leads、Sales 与 Ad Spend。"/></div></>}
