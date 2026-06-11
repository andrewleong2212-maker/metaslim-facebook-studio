# MetaSlim AI Facebook Trend & Content Studio - Product Specification

## 1. 产品目标

MetaSlim AI Facebook Trend & Content Studio 是固定服务 **MetaSlim AI**、固定面向 **Malaysia** 市场的“趋势证据、内容生成、人工审核、生产排程”工作台，不提供多品牌或其他国家市场选择。系统帮助团队收集可追溯的趋势线索和 Facebook Page URL，按 Malaysia 地点、语言、时效与合规要求整理证据，再使用 AI 生成马来西亚口语华文的 AIDA 文案候选。

产品不承诺、也不实现“读取全马 Facebook Organic Trending API”。Facebook 没有提供可直接获取全马自然流量热门内容的通用官方 API。趋势必须来自获准的数据来源、用户提交的 Facebook URL、人工证据与合规的公开信息，并标明来源、采集时间、有效期和可信度。所有 AI 输出必须经过质量门禁与人工批准，才能进入 Production Board；本阶段不自动发布至 Facebook。

## 2. 成功标准

- 每个趋势主题至少绑定一个未过期、可审阅的证据来源。
- 不使用假趋势数据；无法验证的线索明确标记为 `unverified`，不得冒充趋势事实。
- 每份 AI 草稿记录模型、提示词版本、来源快照、生成成本与质量检查结果。
- 任何内容进入生产前必须通过 AI Output Quality Gate、Compliance Checker、Duplicate Guard 和 Human Approval。
- 最终内容固定使用马来西亚口语华文；English 和 Bahasa Melayu 只可作为趋势研究辅助来源，不作为最终文案输出语言。
- 资料不足时必须要求补充证据，不能直接生成或补齐 30 天内容计划。
- 不使用假趋势、假案例或假数字；无法验证的案例、成效、统计和事实不得进入最终文案。
- 成本、错误、来源过期和版本变更可追踪。

## 3. 用户角色

| 角色 | 权限 |
| --- | --- |
| Admin | 管理成员、权限、品牌规则、集成配置、预算和审计记录 |
| Researcher | 收集趋势线索、Facebook URL、证据与地点信息，执行人工证据审核 |
| Writer | 建立 brief、生成/编辑 AIDA 文案、查看质量与合规结果 |
| Reviewer | 审核证据与内容，批准、退回或要求修订 |
| Producer | 管理 Production Board、负责人、截止时间与发布结果记录 |
| Viewer | 只读访问已授权项目与报表 |

关键权限必须由服务端与数据库 Row Level Security 执行，不能只依赖 UI。

## 4. 完整用户流程

1. 用户登录并进入所属 workspace。
2. Admin 设置 MetaSlim AI 的目标受众、Malaysia Language 规则、禁用词、合规规则、Malaysia 地点与月度预算；系统没有品牌选择器。
3. Researcher 建立 Trend Candidate，选择 Malaysia Trend Location（全国、州属、联邦直辖区或城市）。
4. Researcher 从允许的来源登记证据；Facebook 内容通过 Facebook URL Library 保存 Facebook Page URL、备注和人工观察。系统可产生供 Codex 或 Claude 使用的“资料整理 Prompt”，让人工整理有权访问的页面资料，但不自动连接 Codex/Claude、不绕过 Facebook 权限，也不声称取得平台级 organic trend 数据。
5. 系统保存证据元数据、来源快照/摘要、采集时间与 Source Expiry；过期来源自动失效并阻止用于新文案。
6. Researcher 执行 Manual Evidence Review，标记可信度、相关性、地域性与审核结论。
7. Reviewer 将趋势状态设为 verified、rejected 或 needs_more_evidence。
8. Writer 从已验证且未过期的趋势建立 Content Brief，选择受众、Malaysia 地点、目标、CTA、渠道，并运用 AIDA Copywriting Formula 与 AIDA Mindset。
9. 系统估算 AI 调用成本；Cost Control 检查用户、workspace 与月度预算。
10. 用户确认后才请求 AI 生成草稿。每次生成建立不可覆盖的新 Version History。
11. AI 必须先执行内部质量检查；AI Output Quality Gate 检查结构、证据引用、语言、事实主张、CTA、长度、可读性与 MetaSlim AI 规则。未通过时只能返回修订状态和原因，不能把该版本作为最终文案交给用户。
12. Duplicate Guard 对历史内容做精确与语义重复检查。
13. Compliance Checker 检查误导性健康/疗效陈述、敏感属性、平台政策、禁用词及缺失免责声明。
14. 未通过项目进入修订队列；用户可编辑或重新生成，但不得绕过记录。
15. Reviewer 执行 Human Approval，可 approve、reject 或 request_changes，并留下原因。只有内部质量检查通过且获人工批准的版本，才可标记为“最终文案”交给用户或进入生产。
16. 只有已批准版本可加入 Production Board，设定负责人、截止时间、素材状态与发布状态。
17. Producer 人工发布或在未来获批准的发布集成中执行；记录最终 URL、时间与结果。
18. 系统持续监控来源过期、预算、错误和审计事件；过期证据不追溯删除已发布内容，但触发复查提醒。

## 5. 页面与功能

| 页面 | 核心功能 |
| --- | --- |
| Sign In | 登录、登出、密码重置或未来 SSO；不暴露服务端密钥 |
| Dashboard | 待审核趋势、过期来源、草稿门禁状态、Production Board 摘要、预算和错误摘要 |
| Trend Explorer | 浏览真实来源的候选趋势；按 Location、状态、日期、来源和可信度筛选 |
| Trend Detail | 趋势说明、地点、证据、审核历史、关联内容；禁止无证据标记为 verified |
| Evidence Inbox | 新证据录入、批量整理、来源类型、采集时间、有效期和证据状态 |
| Manual Evidence Review | 查看原始链接/允许保存的摘要、地域相关性、可信度、接受/拒绝与审核备注 |
| Facebook URL Library | 保存 Facebook URL、页面/帖子标识、用户备注、标签、地点、检查时间、可访问状态与关联趋势 |
| Research Prompt Builder | 根据 Facebook Page URL 与研究目标生成 Codex/Claude 资料整理 Prompt；不传送资料、不调用模型、不把 Prompt 输出视为已验证证据 |
| Content Briefs | 定义目标、受众、地点、主语言/辅助语言、CTA、AIDA 参数、来源和限制 |
| AI Studio | 生成候选稿、成本预估、提示词版本、AIDA 分段、人工编辑；不得直接发布 |
| Quality Gate | 展示每项规则、分数、失败原因、证据一致性和修订建议 |
| Compliance Review | 展示政策规则、风险级别、命中片段、免责声明需求和人工裁决 |
| Duplicate Review | 显示精确/近似重复、相似内容、阈值与人工覆盖理由 |
| Approval Queue | Human Approval 队列、差异比较、批准/退回/拒绝和评论 |
| Version History | 查看任一内容版本、生成参数、来源快照、差异、作者和恢复为新版本 |
| Production Board | Kanban/List：approved、scheduled、in_production、published、blocked；负责人、日期、素材与最终 URL |
| Source Expiry | 即将过期/已过期证据、受影响趋势/内容、重新验证与替换来源 |
| Cost Control | 用量、估算/实际成本、模型分布、预算阈值、硬限制和告警 |
| Error Logs | 可筛选错误、correlation ID、服务、严重度、重试状态；敏感内容必须脱敏 |
| Settings - MetaSlim AI | 固定品牌的语调、产品事实、禁用声明、CTA、免责声明与 AIDA 模板；不提供品牌切换 |
| Settings - Language | 马来西亚口语华文输出规则、用词表与 `zh-MY` locale；English/BM 仅标记研究来源语言 |
| Settings - Locations | Malaysia 州属、联邦直辖区、城市与默认 Trend Location；不支持其他国家市场 |
| Settings - Team & Roles | 成员、角色、workspace 邀请和最小权限 |
| Settings - Integrations | 仅显示连接状态与配置说明；密钥只写入服务端环境变量 |
| Audit Log | 登录、配置、证据、审批、版本、预算和敏感操作的不可变审计轨迹 |

## 6. 正式功能需求

### 6.1 AI Output Quality Gate

- 所有 AI 输出必须检查，不能设为 optional 或默认跳过。
- 最低检查：AIDA 结构、来源覆盖、未经支持的事实、语言规则、品牌语调、长度、CTA、敏感词、免责声明和格式。
- 规则失败必须给出机器可读代码和用户可理解原因。
- 自动检查不是最终事实判定；低置信度或高风险内容转人工审核。

### 6.2 Human Approval

- 发布候选版本必须由具备 Reviewer 权限、且原则上不是最后编辑者的人批准。
- 审批记录不可覆盖；每个新版本都使旧批准失效。
- 紧急覆盖必须限制为 Admin，填写理由并写入审计日志。

### 6.3 Version History

- 草稿每次生成、编辑、恢复和批准均创建版本。
- 版本保存内容、差异所需数据、来源版本、提示词版本、模型参数、操作者与时间。
- 恢复旧版本应创建新版本，不篡改历史。

### 6.4 Source Expiry

- 每条 evidence 必须有 `collected_at` 与 `expires_at`；有效期按来源策略决定。
- 过期证据不能用于新的 AI 生成或批准。
- 已批准内容若核心证据过期，标记 `review_required`，由人工决定是否撤回或更新。

### 6.5 Manual Evidence Review

- 必须记录 reviewer、结论、可信度、地域相关性、备注和时间。
- 只保存有权存储的数据；受版权或平台限制的内容优先保存 URL、元数据和人工摘要。

### 6.6 Facebook URL Library

- 接受用户输入或获准流程收集的 Facebook Page URL，去重并验证 URL 格式。
- 记录可访问性与最后检查时间，但不绕过登录、权限、robots、平台条款或反自动化机制。
- URL 的存在不等于内容为趋势；必须结合证据审核。
- 可为选定 Page URL 产生 Codex/Claude 资料整理 Prompt，要求输出来源 URL、观察日期、Malaysia 地区、证据摘要和待人工核实项目。该 Prompt 只供人工复制使用，不连接 Codex/Claude API，返回资料仍须 Manual Evidence Review。

### 6.7 马来西亚口语华文规则

- 最终文案固定输出自然、易懂的马来西亚口语华文，locale 为 `zh-MY`，默认简体中文。
- Bahasa Melayu 与 English 只作为趋势研究辅助来源语言；不得生成英文、马来文或混合语最终文案。必要的产品名、法定原文和常用专有名词可保留原文。
- 避免生硬直译、未经授权的族群刻板印象、敏感属性推断和不自然的语言切换。
- 产品名、法定声明和专有名词遵循 MetaSlim AI 词库；语言检查结果进入 Quality Gate。

### 6.8 Trend Location

- 趋势必须绑定地点层级与时区 `Asia/Kuala_Lumpur`。
- 只支持 Malaysia 全国、州属、联邦直辖区和城市；不允许选择其他国家或无边界的自定义市场。未知地点必须明确标示并阻止趋势验证。
- 不得把局部或来源不明的信号描述为“全马趋势”。

### 6.9 Cost Control

- AI 请求前估算 token/成本；请求后保存实际用量。
- 支持 workspace 月度预算、用户限额、单次上限、告警阈值、硬停止和 Admin 覆盖。
- 重试、embedding、质量复检都计入成本。

### 6.10 Error Logging

- 记录服务、操作、严重度、错误码、correlation ID、重试次数与时间。
- 不记录 API Key、Authorization header、完整提示词中的个人资料或不必要的正文。
- 用户看到可操作信息，技术详情仅授权角色可见。

### 6.11 AIDA 文案 Formula

- AI 输出必须结构化为 Attention、Interest、Desire、Action。
- 每段可配置长度、语调和目标；Action 必须含合规 CTA。
- 允许最终呈现为自然段，但内部保留 AIDA 结构供检查。
- AIDA Mindset 是必需的写作判断框架：先从受众当下关注点取得注意，再以真实证据建立兴趣，以可验证价值和同理心形成期待，最后给出清晰、低压力、合规的行动指引。不得为了“Desire”制造恐惧、羞辱身材、虚构案例、保证疗效或捏造数字。

### 6.12 资料充分性与最终文案交付

- 生成前检查时间范围、Malaysia 地区、未过期真实来源、内容角度和证据覆盖。
- 若资料不足以支持 30 个不同且不重复的内容角度，系统必须阻止生成 30 天内容，并列出缺少的来源、日期、地区或主题；不得以模型常识、假案例、假数字或改写重复内容补齐数量。
- AI 生成后必须先完成内部 Quality Gate、Duplicate Guard 和 Compliance Checker。失败版本不得显示或导出为“最终文案”。
- 最终交付还需要 Human Approval；草稿、失败版本和待审核版本必须清楚标示状态。

### 6.13 Duplicate Guard

- 检查同 workspace 内 URL、标题、正文哈希、n-gram/相似度与未来的 embeddings。
- 相似度阈值可配置；命中后阻止批准，除非 Reviewer 记录合理覆盖原因。
- Phase 1 可先使用规范化哈希与文本相似度，不调用外部 embedding API。

### 6.14 Compliance Checker

- 检查 Meta 广告/内容政策相关风险、Malaysia 适用法规和品牌规则，尤其是健康、减重、疗效、前后对比和误导性保证。
- 工具只提供风险辅助，不构成法律意见；高风险内容必须人工裁决。
- 规则必须有版本、生效日期、来源链接和最后复核时间。

### 6.15 Production Board

- 只有通过门禁并获 Human Approval 的内容版本可进入。
- 管理状态、负责人、截止时间、素材、阻塞原因、计划发布时间与最终发布 URL。
- 本规格阶段不自动发布，避免把生产排程等同于平台发布权限。

## 7. 外部 API 与服务

| 服务 | 预期用途 | 当前阶段 |
| --- | --- | --- |
| Facebook Graph API | 未来读取用户授权管理的 Page/Post 元数据或发布能力；范围取决于权限与 App Review | 仅设计，不连接 |
| Facebook URL | 用户提交的公开/有权访问 URL 证据库 | 仅设计，不抓取 |
| Google Trends | 趋势信号参考；官方通用实时 API 能力有限，需评估合规数据供应商或人工导入 | 仅设计，不连接 |
| OpenAI API | 未来生成、结构化检查与可能的 embeddings | 仅设计，不连接 |
| Supabase | Auth、Postgres、RLS、Storage、Edge Functions/后台任务 | 仅设计，不连接 |
| Netlify | Web 部署、Functions、环境变量与预览环境 | 仅设计，不连接 |
| Error/observability service | 未来可选 Sentry/OpenTelemetry 目标；必须脱敏 | 仅接口设计 |

## 8. 技术限制

### Facebook

- 没有可读取“全马 Facebook Organic Trending”的通用官方 API。
- Graph API 只允许在明确权限、访问令牌、对象可见性和 App Review 范围内访问。
- 访问令牌会过期或被撤销；权限与 API 版本会变化。
- 不得通过绕过登录、批量爬取或规避平台限制获取内容。
- Page 发布需相应 Page 权限与审查；个人 profile 和任意 public post 的读取能力受限。

### Google Trends

- 公开产品的数据是抽样、归一化的相对兴趣值，不等于绝对搜索量。
- 地理、低流量词、实时窗口和历史窗口的粒度不同，结果可能被抑制或变化。
- 非官方库/抓取方式可能不稳定、受限流且有条款风险，不能作为生产 SLA 基础。
- 若没有经批准的 API/供应商，采用人工导入并保存来源与时间，不伪造趋势值。

### OpenAI

- 输出可能出现幻觉、不稳定格式、政策误判或语言偏差，不能替代人工审核。
- 模型、价格、速率限制和可用性会变化；必须由服务端适配层隔离。
- API Key 只能在服务端；需要请求限额、超时、重试、幂等和成本记录。
- 不发送不必要的个人资料、凭证或未获授权的完整第三方内容。

### Supabase

- 浏览器中的 anon/publishable key 不是秘密，安全性依赖正确的 RLS；service role key 绝不能进入浏览器。
- RLS 漏配会导致跨 workspace 数据泄漏；所有业务表必须默认拒绝并逐表测试策略。
- 数据库连接、Storage、Edge Functions 与套餐均有限额；后台任务需考虑超时和重试。
- 数据库迁移必须版本化；开发、预览和生产环境必须隔离。

### Netlify

- 浏览器 bundle 中的环境变量和 `PUBLIC_`/构建注入值可被用户读取。
- Functions 有运行时间、请求体、并发、冷启动和区域限制，不适合无限时后台任务。
- Deploy Preview 不能复用生产秘密或生产数据库权限。
- 构建日志与函数日志可能泄露敏感信息，必须脱敏并限制访问。

## 9. 规格审查：矛盾、遗漏与不可实现项

| 项目 | 结论与处理 |
| --- | --- |
| “全马 Facebook Organic Trending API” | 不可实现为通用能力；改为多来源证据、Facebook URL Library 和人工验证，且不得声称覆盖全马 |
| Google Trends 实时 API | 官方通用能力与稳定性不足；在供应商确认前仅设计人工导入/合规来源适配器 |
| 自动发布 | 当前没有明确 Page、权限、App Review 与审批责任；Phase 1/2 不实现，仅保留 Production Board |
| Compliance Checker | 不能保证法律合规；定位为版本化风险检查加 Human Approval |
| AI 事实正确性 | 无法只靠模型保证；必须绑定未过期证据并由 Quality Gate 和人工审核控制 |
| 内容语言 | 已固定为 `zh-MY` 马来西亚口语华文；English/BM 仅作研究来源。仍需 MetaSlim AI 确认目标族群、专有词和禁用表达 |
| 数据保留 | 尚缺法定/业务保留期限、删除流程、DSAR 与备份恢复目标，Phase 1 前需确认 |
| 发布责任 | 尚缺谁拥有最终发布权限及紧急撤回流程，需在 Phase 2 前定义 |
| 趋势评分 | 尚无可信权重与最低证据数量；先使用透明规则和人工结论，不制造综合分数 |

## 10. 非目标

- 本阶段不开发 UI、不连接真实 API、不设置生产密钥。
- 不抓取全马 Facebook、不伪造趋势、不自动声称趋势真实性。
- 不让 AI 自动批准或自动发布内容。
- 不把合规检查结果描述为法律意见。
- 不提供多品牌、其他国家市场或英文/马来文最终内容模式。
- 不在资料不足时生成 30 天内容，不使用假案例或假数字凑足内容量。

## 11. 正式需求追踪

| # | 正式需求 | 规格结论 |
| --- | --- | --- |
| 1 | 产品固定为 MetaSlim AI | 已固定；没有多品牌选择 |
| 2 | 市场固定为 Malaysia | 已固定；Location 仅允许 Malaysia 层级 |
| 3 | 默认输出马来西亚口语华文 | 已固定为 `zh-MY` 马来西亚口语华文 |
| 4 | 英文和马来文只作研究辅助 | 已限制为研究来源语言，不是最终输出选项 |
| 5 | Facebook Page URL 与 Codex/Claude Prompt | Facebook URL Library 与 Research Prompt Builder 为正式需求 |
| 6 | 不声称全马 Facebook Organic Trending API | 明确列为不可实现的通用能力与非目标 |
| 7 | 趋势含真实来源、日期、地区、有效期 | Evidence 与 Source Expiry 的强制字段和验证条件 |
| 8 | AI Output Quality Gate | 强制门禁 |
| 9 | Human Approval | 强制门禁 |
| 10 | Version History | append-only 版本历史 |
| 11 | Source Expiry | 过期阻止新生成与批准 |
| 12 | Manual Evidence Review | 未经人工审核不得成为 verified evidence |
| 13 | Facebook URL Library | 正式模块 |
| 14 | Trend Location | 仅限 Malaysia 地点 |
| 15 | Cost Control | 估算、记录、预算、硬停止 |
| 16 | Error Logging | correlation ID 与脱敏日志 |
| 17 | AIDA Formula 与 Mindset | 均为强制写作和检查框架 |
| 18 | Duplicate Guard | 批准前强制检查 |
| 19 | Compliance Checker | 批准前强制检查，不替代法律意见 |
| 20 | Production Board | 只接收获批具体版本 |
| 21 | 资料不足不能生成 30 天内容 | Content Sufficiency Policy 强制阻止 |
| 22 | API Key 仅在服务器环境变量 | 所有秘密只放服务器环境变量或 secret store，禁止进入浏览器和代码库 |
| 23 | 禁止假趋势、假案例、假数字 | 明确禁止，不能用于补足内容量 |
| 24 | AI 内部质量检查后才交付 | 三项内部门禁通过并获 Human Approval 后才标记最终文案 |
