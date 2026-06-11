import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { QualityScoreCard } from "@/components/domain/quality-score-card";
import { ApprovalPanel } from "@/components/domain/approval-panel";
import { VersionHistoryPanel } from "@/components/domain/version-history-panel";

const short=["Script Hook","Visual Hook","Motion Hook","首秒字卡","Headline","Cover Text","CTA"];
const long=["Attention","Interest","Desire","Action","完整口播","Caption"];
export function ScriptStudioView(){return <><PageHeader eyebrow="Versioned Workspace" title="Script Studio" description="所有文案变动都应建立版本。Quality Gate、Compliance Checker、Duplicate Guard 与 Human Approval 未通过前,不可标记为最终文案。"/><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><Card><CardHeader><div><h2 className="font-semibold">马来西亚口语华文脚本</h2><p className="mt-1 text-xs text-slate-500">AIDA Copywriting Formula + AIDA Mindset</p></div><StatusBadge tone="warning">草稿未建立</StatusBadge></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2">{short.map(x=><FormField key={x} label={x}><input className="field" placeholder="等待真实素材与 AI 连接" disabled/></FormField>)}{long.map(x=><FormField key={x} label={x}><textarea className="field min-h-28 py-3" placeholder="尚无内容" disabled/></FormField>)}</div></CardContent></Card><div className="space-y-5"><QualityScoreCard/><ApprovalPanel/><VersionHistoryPanel/></div></div></>}
