# MetaSlim AI Facebook Trend & Content Studio

固定服务 MetaSlim AI、固定面向 Malaysia 市场的趋势证据与 Facebook 内容生产工作台。它将真实来源、人工证据审核、马来西亚口语华文 AIDA 文案、质量与合规门禁、人工批准、版本历史和 Production Board 串成可审计流程；不提供多品牌或其他国家市场选择。

## 当前状态

**STEP 1：规划与基础规格** 已完成。**STEP 2：基础项目与 UI 骨架** 已建立：

- Next.js App Router、strict TypeScript、Tailwind CSS、可复用 UI components、React Hook Form、Zod、Vitest、Playwright 与 Netlify 配置。
- Dashboard、Facebook Research、Malaysia Trend Radar、Content Materials、Content Generator、Script Studio、Production Board、Facebook Performance、Weekly AI Review、Settings 共 10 个页面。
- Desktop sidebar、Mobile bottom navigation、Loading/Empty/Error 与真实 disconnected states。
- 不连接 Facebook、Google Trends、OpenAI 或 Supabase；Netlify 仅完成构建配置。
- 不包含真实 API Key。
- 不使用假趋势数据。
- 不使用假案例、假数字，也不在资料不足时直接生成 30 天内容。
- 不声称能够读取全马 Facebook Organic Trending API。
- 不包含真实后台、数据库或 AI 功能。

## 本地运行

```bash
npm install
npm run dev
```

验证命令：`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`。

## 核心原则

1. Evidence first：趋势与事实主张必须有可追溯、未过期的来源。
2. Human in control：AI 不能批准或发布内容。
3. Malaysia fixed：最终输出固定为 `zh-MY` 马来西亚口语华文；English/Bahasa Melayu 只作趋势研究辅助来源。
4. Secure by default：密钥仅在服务端，RLS、最小权限、审计和脱敏为基础要求。
5. Cost visible：每次 AI 操作先估算、后记录并受预算限制。
6. No fabricated trends：未验证线索明确标示，不以模拟数据冒充真实趋势。

## 必需模块

AI Output Quality Gate、Human Approval、Version History、Source Expiry、Manual Evidence Review、Facebook URL Library、Facebook Page URL 的 Codex/Claude 资料整理 Prompt、马来西亚口语华文规则、Trend Location、Cost Control、Error Logging、AIDA Copywriting Formula 与 AIDA Mindset、Duplicate Guard、Compliance Checker、Production Board、资料充分性检查和最终文案交付门禁。

## 文档导航

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md)：目标、用户流程、页面、正式需求、外部服务与限制
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)：Phase 1-3、验收标准和依赖
- [ARCHITECTURE.md](ARCHITECTURE.md)：系统边界、目录、组件与数据流
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)：数据表、字段、关系、状态和 RLS 原则
- [SECURITY.md](SECURITY.md)：威胁、安全控制、密钥与日志规范
- [.env.example](.env.example)：无秘密的环境变量名称模板

## 建议技术方向

规划基线为 TypeScript Web 应用、Netlify 部署层、Supabase Auth/Postgres/Storage、服务端 AI/provider adapters。具体前端框架在 Phase 1 开始前通过小型技术验证确认；目录以 provider abstraction 为核心，避免业务逻辑直接依赖任何 API。

## 开发前置条件

- 确认品牌语言、法定声明与禁止表达。
- 确认允许使用的趋势来源、数据保留期和证据版权政策。
- 确认 Supabase 区域、Netlify 计划、OpenAI 预算和 Facebook App 权限范围。
- 为 development、preview、production 建立完全隔离的配置。

详见各规格文件。本步骤完成后停止，不继续开发 UI。
