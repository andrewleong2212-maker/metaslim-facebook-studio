import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-panels";
import { StatusBadge } from "@/components/ui/status-badge";

const reviews=["Best Hook","Best Formula","Best Angle","High Views Low Leads","Low Views High Leads","Next Week Recommendations"];
export function WeeklyReviewView(){return <><PageHeader eyebrow="Evidence-led Learning" title="Weekly AI Review" description="基于真实内容表现寻找有效 Hook、Formula 与 Angle。当前没有足够数据,AI 不会自行推测结论。"/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{reviews.map(x=><Card key={x}><CardContent><div className="flex items-center justify-between"><h2 className="font-semibold">{x}</h2><StatusBadge>资料不足</StatusBadge></div><EmptyState compact title="没有足够数据" description="需要真实表现数据与足够样本后才能分析。"/></CardContent></Card>)}</div></>}
