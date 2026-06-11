import { Plus } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

const filters=[["时间范围",["最近 7 天","最近 30 天","自定义"]],["地区",["Malaysia 全国","Kuala Lumpur","Selangor","Johor"]],["来源语言",["全部研究语言","中文","English","Bahasa Melayu"]],["Evidence Status",["全部","未验证","待审核","已验证"]],["Freshness Status",["全部","有效","即将过期","已过期"]],["Lead Intent",["全部","低","中","高"]],["Trend Score",["全部","需要证据","已人工评分"]]] as const;
export function TrendRadarView(){return <><PageHeader eyebrow="Verified Signals Only" title="Malaysia Trend Radar" description="只管理具有真实来源、观察日期、Malaysia 地区和有效期的趋势证据。英文与马来文只作为研究辅助来源。" actions={<Button><Plus/>加入真实趋势</Button>}/><FilterBar>{filters.map(([label,items])=><FormField key={label} label={label}><select className="field min-w-40">{items.map(x=><option key={x}>{x}</option>)}</select></FormField>)}</FilterBar><DataTable columns={["趋势","来源","日期","地区","有效期","Evidence","Intent","Score"]} emptyTitle="没有可显示的真实趋势" emptyDescription="请先从 Facebook Research 加入真实 URL,补充来源日期与 Malaysia 地区,再完成 Manual Evidence Review。系统不会生成假趋势数据。"/></>}
