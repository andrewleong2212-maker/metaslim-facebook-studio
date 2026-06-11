"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BracketsCurly, Copy, LinkSimple, MagicWand } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { DisconnectedNotice, EmptyState } from "@/components/ui/state-panels";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

const schema=z.object({url:z.string().url("请输入完整 https URL").refine(v=>v.startsWith("https://"),"只接受 https URL"),bio:z.string().max(500),copy1:z.string().max(1200),copy2:z.string().max(1200),copy3:z.string().max(1200),cta:z.string().max(160)});
type Values=z.infer<typeof schema>;
export function ResearchForm(){const [prompt,setPrompt]=useState(""); const {register,handleSubmit,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema),defaultValues:{url:"",bio:"",copy1:"",copy2:"",copy3:"",cta:""}}); const onSubmit=(v:Values)=>setPrompt(`请整理以下 Facebook 公开资料,结果必须列出来源 URL、观察日期、Malaysia 地区、证据有效期建议与待人工核实项目。\n\nURL: ${v.url}\nBio: ${v.bio||"未提供"}\n文案样本: ${[v.copy1,v.copy2,v.copy3].filter(Boolean).join(" | ")||"未提供"}\nCTA: ${v.cta||"未提供"}\n\n不要推断全马 Organic Trending,不要制造数字、案例或趋势结论。`);
return <><PageHeader eyebrow="Evidence Intake" title="Facebook Research" description="整理 Facebook Page / Post / Video / Reel / Ad Library URL,并产生供 Codex 或 Claude 人工使用的研究 Prompt。不会自动传送或抓取资料。"/><DisconnectedNotice service="Facebook API"/>
<div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card><CardHeader><div><h2 className="font-semibold">资料输入</h2><p className="mt-1 text-xs text-slate-500">所有结果仍须 Manual Evidence Review</p></div><StatusBadge tone="warning">手动流程</StatusBadge></CardHeader><CardContent><form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><FormField label="Facebook URL" error={errors.url?.message} hint="支持 Page / Post / Video / Reel / Ad Library URL"><div className="relative"><LinkSimple className="absolute left-3.5 top-3.5 text-slate-400"/><input {...register("url")} className="field pl-10" placeholder="https://www.facebook.com/..."/></div></FormField><FormField label="Bio(手动补充)"><textarea {...register("bio")} className="field min-h-24 py-3" placeholder="贴上有权使用的页面简介"/></FormField><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(n=><FormField key={n} label={`文案 ${n}`}><textarea {...register(`copy${n}` as "copy1")} className="field min-h-28 py-3" placeholder="手动贴上文案"/></FormField>)}</div><FormField label="CTA"><input {...register("cta")} className="field" placeholder="例如:发送 WhatsApp 了解更多"/></FormField><div className="flex flex-wrap gap-2"><Button type="submit"><MagicWand/>生成 Codex / Claude 研究 Prompt</Button><Button type="button" variant="secondary"><BracketsCurly/>导入 JSON(暂不可用)</Button></div></form></CardContent></Card>
<Card><CardHeader><h2 className="font-semibold">Research Prompt</h2><StatusBadge tone={prompt?"info":"neutral"}>{prompt?"已生成":"等待输入"}</StatusBadge></CardHeader><CardContent>{prompt?<><pre className="max-h-[540px] whitespace-pre-wrap rounded-2xl bg-brand-950 p-5 text-sm leading-6 text-brand-50">{prompt}</pre><Button className="mt-4 w-full" variant="secondary" onClick={()=>navigator.clipboard.writeText(prompt)}><Copy/>复制 Prompt</Button></>:<EmptyState title="还没有 Prompt" description="填写真实 Facebook URL 后生成。Prompt 仅供人工复制到 Codex 或 Claude,不会调用任何 API。"/>}</CardContent></Card></div>
<section className="mt-5"><h2 className="mb-3 font-semibold">Facebook URL Library 预览</h2><DataTable columns={["URL","类型","Malaysia 地区","Evidence Status","Freshness"]} emptyTitle="URL Library 还是空的" emptyDescription="目前没有保存任何 Facebook URL。提交表单不会写入数据库,因为 Supabase 尚未连接。"/></section></>}
