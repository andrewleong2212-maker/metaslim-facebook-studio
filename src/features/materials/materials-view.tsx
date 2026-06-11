import { Plus } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-panels";

const types=["Pain Point","Customer Question","Customer Objection","Customer Quote","Case Study","Educational Point","Product USP","Trust Element","CTA","Trend","Visual Hook","Motion Hook"];
export function MaterialsView(){return <><PageHeader eyebrow="Evidence-backed Library" title="Content Materials" description="建立可追溯的内容素材。Case Study、Customer Quote 与数字必须有真实来源,不允许以 UI 示例冒充事实。" actions={<Button><Plus/>新增素材</Button>}/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{types.map(type=><Card key={type}><CardContent><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">{type.slice(0,1)}</span><span className="text-xs text-slate-400">0</span></div><h2 className="mt-4 font-semibold">{type}</h2><p className="mt-2 text-sm text-slate-500">尚未加入已验证素材。</p></CardContent></Card>)}</div><div className="mt-5"><EmptyState title="素材库目前为空" description="新增真实客户问题、教育重点、USP 或趋势证据后,才可用于 Content Generator。"/></div></>}
