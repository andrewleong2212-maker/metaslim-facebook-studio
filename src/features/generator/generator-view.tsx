"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockKey, MagicWand } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-panels";
import { QualityScoreCard } from "@/components/domain/quality-score-card";

const schema=z.object({goal:z.string().min(1),temperature:z.string(),length:z.string(),mode:z.string(),formula:z.string(),hook:z.string(),cta:z.string().min(1),trend:z.string()});
type Values=z.infer<typeof schema>;
const fields=[
  ["Campaign Goal","goal",["教育市场","建立信任","引导咨询","重新互动"]], ["Audience Temperature","temperature",["Cold","Warm","Hot"]], ["Script Length","length",["30 秒","60 秒","90 秒"]], ["Generation Mode","mode",["单篇内容","内容角度建议","30 天计划(资料不足时阻止)"]], ["Copywriting Formula","formula",["AIDA","AIDA - Evidence First"]], ["Hook Type","hook",["Customer Question","Pain Point","Myth Busting","Visual Hook"]], ["趋势选择","trend",["没有已验证趋势"]]
] as const;
export function GeneratorView(){const {register,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema)});return <><PageHeader eyebrow="AIDA Mindset" title="Content Generator" description="以真实证据、马来西亚口语华文和 AIDA Mindset 建立内容 brief。AI 尚未连接,因此不会产生假文案或假 API 响应。"/><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><Card><CardHeader><h2 className="font-semibold">Generation Brief</h2></CardHeader><CardContent><form className="grid gap-4 md:grid-cols-2">{fields.map(([label,name,options])=><FormField key={name} label={label} error={errors[name]?.message}><select {...register(name)} className="field">{options.map(x=><option key={x}>{x}</option>)}</select></FormField>)}<FormField label="CTA Keyword" error={errors.cta?.message}><input {...register("cta")} className="field" placeholder="例如:了解、咨询、开始"/></FormField><div className="md:col-span-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><strong>资料充分性规则:</strong>没有足够的真实来源、日期、Malaysia 地区、有效期与独立角度时,不能生成 30 天内容。</div><Button type="button" className="md:col-span-2" disabled><LockKey/>AI 尚未连接</Button></form></CardContent></Card><div className="space-y-5"><QualityScoreCard/><Card><CardContent><EmptyState compact title="等待可用 AI Provider" description="连接前只能建立 UI brief,不会生成内容。" action={<Button variant="muted" disabled><MagicWand/>暂不可用</Button>}/></CardContent></Card></div></div></>}
