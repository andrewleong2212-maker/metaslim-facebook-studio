import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/state-panels";
import { StatusBadge } from "@/components/ui/status-badge";

const stages=["AI Draft","Needs Review","Approved","Filming","Editing","Ready","Published","Archived"];
export function ProductionBoardView(){return <><PageHeader eyebrow="Human-approved Versions Only" title="Production Board" description="只有通过内部质量门禁并获 Human Approval 的具体版本,才可进入后续制作阶段。当前不会自动发布 Facebook。"/><div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="grid min-w-[1880px] grid-cols-8 gap-4">{stages.map((stage,i)=><section key={stage} className="rounded-2xl bg-brand-50/50 p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-ink">{stage}</h2><StatusBadge tone={i===2?"success":"neutral"}>0</StatusBadge></div><EmptyState compact title="没有内容" description={i===0?"AI 尚未连接":"等待上一个阶段完成"}/></section>)}</div></div></>}
