# Architecture

## 1. 架构目标

- 外部 provider 可替换，业务层不直接依赖 Facebook、Google Trends、OpenAI、Supabase 或 Netlify SDK。
- 浏览器永远不持有服务端密钥。
- 所有写操作带 workspace、actor、correlation ID 和审计记录。
- 证据、版本、门禁、审批和生产状态形成可追溯链。
- Phase 1 可在不连接真实 API 的情况下完成领域逻辑与测试。

## 2. 逻辑组件

```text
Browser UI
  -> Web application / server endpoints
      -> Auth & authorization
      -> Domain services
          -> Trend & Evidence service
          -> Content, Sufficiency & Version service
          -> Quality/Compliance/Duplicate gates
          -> Approval service
          -> Production service
          -> Cost & Audit service
      -> Provider adapters (server only)
          -> Facebook adapter (future authorized capability only)
          -> Trends adapter
          -> OpenAI adapter
          -> Supabase repositories/storage
      -> Background jobs
          -> source expiry
          -> retry/error processing
          -> notifications
```

Phase 1 的 provider adapters 使用 disabled/mock contract implementation；mock 数据只用于自动测试并明确标记为 fixture。

## 3. 核心数据流

### 趋势证据

`source -> evidence record -> manual review -> verified trend -> source expiry monitoring`

趋势状态不能仅由热度数值决定。来源、地点、时间、可信度和人工结论必须共同存在。

### 内容生产

`verified Malaysia trend -> sufficiency check -> content brief -> cost check -> AI/manual draft -> internal quality checks -> version -> quality gate -> duplicate guard -> compliance checker -> human approval -> final copy -> production board`

任一内容变化都会产生新 version，并使旧审批失效。资料不足时流程在生成前停止，尤其不能补造 30 天内容。Production Board 引用具体 approved version，而不是可变的 content item。

### 错误与成本

每次 provider 调用先创建 usage reservation，产生 correlation ID；成功后写实际 usage，失败后写脱敏 error event 并释放/调整预留。重试使用 idempotency key。

## 4. 建议项目目录

```text
/
├─ README.md
├─ PRODUCT_SPEC.md
├─ IMPLEMENTATION_PLAN.md
├─ ARCHITECTURE.md
├─ DATABASE_SCHEMA.md
├─ SECURITY.md
├─ .env.example
├─ package.json
├─ netlify.toml
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/                 # routes/layouts/server endpoints
│     │  ├─ features/
│     │  │  ├─ auth/
│     │  │  ├─ trends/
│     │  │  ├─ evidence/
│     │  │  ├─ facebook-library/
│     │  │  ├─ research-prompt-builder/
│     │  │  ├─ content-studio/
│     │  │  ├─ quality-gate/
│     │  │  ├─ compliance/
│     │  │  ├─ approvals/
│     │  │  ├─ production-board/
│     │  │  ├─ costs/
│     │  │  └─ settings/
│     │  ├─ components/
│     │  ├─ lib/
│     │  └─ styles/
│     └─ tests/
├─ packages/
│  ├─ domain/                    # entities, status machines, policies
│  ├─ database/                  # typed repositories and generated types
│  ├─ providers/                 # server-only provider interfaces/adapters
│  │  ├─ facebook/
│  │  ├─ trends/
│  │  ├─ openai/
│  │  └─ disabled/
│  ├─ quality/                   # quality, duplicate, compliance rules
│  ├─ language-my/               # zh-MY colloquial output; BM/English source analysis only
│  ├─ observability/             # logging, redaction, correlation IDs
│  ├─ security/                  # authorization, validation, rate limits
│  └─ config/                    # validated server/public configuration
├─ supabase/
│  ├─ migrations/
│  ├─ policies/
│  ├─ functions/
│  └─ tests/
├─ netlify/
│  └─ functions/                 # only if framework endpoints are insufficient
├─ tests/
│  ├─ contract/
│  ├─ integration/
│  ├─ e2e/
│  ├─ security/
│  └─ fixtures/                  # explicitly non-production test fixtures
├─ docs/
│  ├─ decisions/                 # ADRs
│  ├─ compliance/
│  ├─ runbooks/
│  └─ api/
└─ scripts/                      # migrations, checks, local tooling
```

## 5. 边界与接口

### Provider interfaces

- `TrendProvider.search(query, location, window)` 返回来源、时间窗、地点、原始引用和 provider metadata；不得只返回“热门”结论。
- `FacebookProvider` 只暴露已授权能力；URL Library 不依赖 provider。
- `ResearchPromptBuilder` 本地生成供 Codex/Claude 人工使用的资料整理 Prompt，不调用两者的 API，结果必须重新进入证据审核。
- `AIProvider.generateAida(request)` 返回结构化 AIDA、usage、model、request ID 和 safety metadata。
- 每个 adapter 实现 timeout、rate limit translation、retry policy 和错误归一化。

### Domain services

- 服务端状态机验证状态迁移，客户端不能直接把记录设为 approved/published。
- `ContentSufficiencyPolicy` 在生成前验证真实来源、日期、Malaysia 地区、有效期和角度数量；不满足时返回缺口，不生成 30 天内容。
- Gate 结果不可由普通用户直接编辑；人工裁决另存 review/override 记录。
- 审批引用 `content_version_id` 与完整 gate run 集合。

## 6. 部署环境

| 环境 | 数据 | 密钥 | 用途 |
| --- | --- | --- | --- |
| local | 本地/隔离测试数据 | 本地 `.env.local`，不提交 | 开发与 contract mock |
| preview | 独立非生产项目 | Netlify preview scoped secrets | PR 验证，不连生产数据 |
| staging | 脱敏/测试数据 | staging secrets | 真实 provider 的受控测试 |
| production | 生产数据 | production-only secrets | 经批准的正式使用 |

## 7. 关键架构决定待确认

- 前端框架需在 Phase 1 技术验证后记录 ADR。
- 定时任务可由 Supabase Cron/Edge Functions 或外部调度执行；不得依赖短生命周期函数做长任务。
- 语义重复检测在 Phase 3 前不需要外部 embeddings；Phase 1 使用本地算法。
- Facebook 发布能力与趋势收集严格分离，避免权限范围被误解。
