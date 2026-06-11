# Implementation Plan

## 原则

- 三个 Phase 都以真实、获准的数据为前提；开发测试可使用明确标记的 fixture，但不能展示为真实趋势。
- 外部服务统一经服务端 adapter 调用，任何密钥不得进入浏览器或仓库。
- 每个 Phase 必须包含安全、RLS、成本、错误处理和审计测试。
- 正式发布路径始终保留 Human Approval。

## Phase 1 - Foundation and Evidence Workflow

### 目标

建立安全的数据与工作流基础，先让团队能录入、验证、过期管理和审批证据与内容草稿；不连接真实第三方 API，不开发自动发布。

### 范围

- 初始化 TypeScript 项目、lint、format、unit/integration test 和 migration 流程。
- 建立 Supabase 本地/测试配置设计、数据库 schema、RLS policies 和 seed fixture 规范。
- 实现 workspace、角色、固定 MetaSlim AI 规则、马来西亚口语华文规则和仅限 Malaysia 的 Trend Location 模型；不建立品牌或国家选择器。
- 实现 Trend Candidate、Evidence Inbox、Manual Evidence Review、Source Expiry。
- 实现 Facebook URL Library，只保存 Facebook Page URL、元数据和人工备注；加入不调用外部 API 的 Codex/Claude 资料整理 Prompt Builder，不绕过平台限制。
- 实现 Content Brief、AIDA Copywriting Formula、AIDA Mindset、资料充分性检查、手工草稿和 Version History。
- 实现规则式 AI Output Quality Gate、Compliance Checker 与 Duplicate Guard，不调用 OpenAI。
- 实现 Human Approval 与 Production Board 基础状态流。
- 阻止资料不足时生成 30 天内容；禁止以假趋势、假案例、假数字或重复改写补足数量。
- AI/规则引擎必须先完成内部质量检查；失败版本不能作为最终文案交给用户。
- 实现 Cost Control 数据结构、Error Logging、Audit Log 和 correlation ID。
- 用本地 fixture 测试，但 UI/文档必须清楚标记 fixture，绝不作为真实趋势。

### 验收标准

- 未审核或过期证据无法支持新草稿批准。
- 每个 Malaysia 趋势证据均具有真实来源、观察日期、Malaysia 地区和有效期。
- 未通过三项门禁或未获人工批准的版本无法进入 Production Board。
- 最终文案只能是内部质量检查通过且获 Human Approval 的具体版本。
- 新版本自动使旧批准失效。
- workspace 之间的数据在 RLS 测试中完全隔离。
- 日志和错误记录不含秘密或敏感全文。

### 最终 Phase 1 边界

- 包含：固定 MetaSlim AI、固定 Malaysia、马来西亚口语华文、用户与角色、真实证据录入、Facebook Page URL Library、Codex/Claude 人工资料整理 Prompt、Manual Evidence Review、Source Expiry、Trend Location、Content Sufficiency、AIDA Formula/Mindset、手工草稿、Version History、Quality/Compliance/Duplicate 规则门禁、Human Approval、Production Board、Cost Control、Error/Audit Logging、数据库/RLS 和测试基础。
- 不包含：真实 Facebook/Google Trends/OpenAI/Supabase/Netlify 连接、自动抓取、自动发布、其他品牌、其他国家、英文/BM 最终文案、UI 完整实现、以任何假数据展示真实趋势。
- Phase 1 可以建立最小验证界面或测试 harness 来验证工作流，但本次 STEP 1 只完成规格文件，不开始开发 UI。

## Phase 2 - Controlled Integrations and AI Assistance

### 目标

在完成法律、权限、预算和供应商审查后，逐个启用受控集成；先 staging，再 production。

### 范围

- 连接 Supabase development/staging，完成 Auth、RLS、Storage 与迁移发布流程。
- 连接 OpenAI 服务端 adapter：结构化 AIDA 输出、超时、重试、幂等、成本核算和输出 schema 校验。
- 将 OpenAI 结果送入 Quality Gate、Duplicate Guard、Compliance Checker；不得自动批准。
- 建立经过批准的 Google Trends 数据接入方式；若无合规稳定 API，则提供人工 CSV/URL 导入和来源记录。
- Facebook 仅接入经 App Review 和用户授权允许的 Page/Post 能力；Facebook URL Library 保持独立。
- 实现 Netlify preview/staging，使用隔离环境变量和非生产数据库。
- 完成 Dashboard、审核队列、Version History diff、Source Expiry 告警和 Cost Control 报表。
- 加入 provider health、rate-limit、circuit breaker、dead-letter/retry queue 设计。

### 验收标准

- 浏览器网络和 bundle 中没有服务端密钥。
- 所有 AI 调用都有调用者、用途、模型、token、费用、来源和版本记录。
- provider 失败不会导致重复扣费式重试或重复版本。
- 人工批准在任何集成路径中都不能被绕过。
- staging 安全测试、RLS 测试与预算硬限制通过。

## Phase 3 - Production Operations and Optimization

### 目标

在真实团队试点后强化生产可靠性、运营效率和分析能力；自动发布仍需单独批准。

### 范围

- Production Board 高级排程、素材检查、阻塞管理与发布结果记录。
- 若业务与 Meta 权限均批准，增加“人工确认后发布到获授权 Page”的独立功能；保持 kill switch 与审计。
- 规则版本化、合规来源复核提醒、来源重新验证与已发布内容回顾流程。
- 语义 Duplicate Guard（可使用受控 embeddings）、质量基准集与人工反馈闭环。
- 成本按 workspace、功能、模型和内容类型优化；支持配额预测。
- 可观测性、SLO、备份恢复演练、事件响应和密钥轮换演练。
- 数据导出、删除、保留和隐私请求流程。

### 验收标准

- 生产发布、撤回、密钥轮换和 provider 中断均有演练记录。
- 质量评估使用经人工标注的马来西亚口语华文基准集。
- 预算超限时系统可靠停止新的付费调用，不影响历史数据访问。
- 自动化操作都有明确人工责任人和可撤销路径。

## 工作流依赖

1. 数据与 RLS 先于 UI。
2. Evidence、Expiry 与 Manual Review 先于 AI generation。
3. Version History 先于审批。
4. Quality、Duplicate、Compliance 三项门禁先于 Production Board。
5. Cost Control 与 Error Logging 先于真实 provider。
6. Staging 通过后才允许 production credentials。

## 测试策略

- Unit：AIDA parser、语言规则、expiry、状态机、成本计算、脱敏和重复检测。
- Integration：RLS、migration、审批失效、门禁组合、provider adapter 错误与幂等。
- Security：跨 workspace 越权、IDOR、XSS、SSRF、恶意 URL、日志泄密、secret scanning。
- Contract：OpenAI/Facebook/趋势来源 adapter schema，使用 mock server，不调用真实 API。
- E2E：证据录入到 Production Board 的完整 happy path 与拒绝路径。
- Quality benchmark：人工标注的 zh-MY/BM/English 内容集，不能使用虚构趋势作为产品证据。

## 开始 Phase 1 前的决定

- 前端框架与包管理器。
- Malaysia 健康/减重内容的法务审核人和规则来源。
- 数据保留期限、备份 RPO/RTO、Supabase 数据区域。
- 内容审批的职责分离规则与 Admin 紧急覆盖政策。
- 第一批获准趋势来源及其 expiry policy。
- 支持 30 天内容所需的最低证据量与角度覆盖标准。
