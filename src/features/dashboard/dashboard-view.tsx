import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, DisconnectedNotice } from "@/components/ui/state-panels";
import { CostUsageCard, OperationalCard, SystemHealthCard } from "@/components/domain/metric-cards";
import { StatusBadge } from "@/components/ui/status-badge";

export function DashboardView(){return <>
  <PageHeader eyebrow="Operations Console" title="Dashboard" description="集中查看真实趋势证据、人工审批、来源健康、成本与制作进度。Production 模式不会显示 UI Preview 示例资料。" actions={<Button variant="secondary">查看设置<ArrowRight/></Button>}/>
  <DisconnectedNotice service="Facebook API"/>
  <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.7fr)]">
    <Card><CardHeader><div><h2 className="font-semibold">Latest Malaysia Trends</h2><p className="mt-1 text-xs text-slate-500">仅显示带真实来源、日期、Malaysia 地区和有效期的趋势</p></div><StatusBadge>0 个趋势</StatusBadge></CardHeader><CardContent><EmptyState title="还没有已验证的 Malaysia 趋势" description="从 Facebook Research 加入真实 URL 或手动证据,再完成 Manual Evidence Review。系统不会用假趋势填满这里。" action={<Button variant="secondary">前往 Facebook Research</Button>}/></CardContent></Card>
    <Card><CardHeader><div><h2 className="font-semibold">Pending Human Approval</h2><p className="mt-1 text-xs text-slate-500">必须通过全部内部质量门禁</p></div></CardHeader><CardContent><EmptyState compact title="没有待审批内容" description="通过 Quality Gate、Duplicate Guard 与 Compliance Checker 后才会进入队列。"/></CardContent></Card>
  </section>
  <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><SystemHealthCard/><CostUsageCard/><OperationalCard title="Production Status" description="Production Board 目前没有获批版本。"/><OperationalCard title="Recent Errors" status="0 个错误" description="尚未连接服务,因此没有外部调用错误。"/></section>
  <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
    <Card><CardHeader><h2 className="font-semibold">本周内容表现</h2><StatusBadge>资料不足</StatusBadge></CardHeader><CardContent><EmptyState compact title="还没有表现数据" description="Facebook Performance 尚未连接。系统不会展示假 Reach、Views、Leads 或 Sales。"/></CardContent></Card>
    <Card><CardHeader><h2 className="font-semibold">系统准备状态</h2></CardHeader><CardContent><div className="space-y-3">{[{Icon:CheckCircle,label:"UI 应用骨架",state:"已建立"},{Icon:WarningCircle,label:"真实数据服务",state:"需要设置"},{Icon:WarningCircle,label:"AI Provider",state:"尚未连接"}].map(({Icon,label,state})=><div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><Icon className="text-brand-600" size={20}/><span className="flex-1 text-sm font-medium">{label}</span><StatusBadge tone={state==="已建立"?"success":"warning"}>{state}</StatusBadge></div>)}</div></CardContent></Card>
  </section>
</>}
