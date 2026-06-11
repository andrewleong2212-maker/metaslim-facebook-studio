# Security

## 1. 安全目标

- 保护 API Key、访问令牌、用户身份、第三方内容和业务草稿。
- 防止跨 workspace 数据访问、审批绕过、伪造趋势和未经授权发布。
- 保持来源、版本、门禁、审批、成本与生产操作可审计。
- 在 provider 失效、密钥泄漏或预算异常时可快速停用集成。

## 2. 主要风险与控制

| 风险 | 控制 |
| --- | --- |
| API Key 进入前端或 Git | 服务端环境变量、`.gitignore`、secret scanning、提交前检查、定期轮换 |
| Supabase RLS 漏配 | 所有业务表默认拒绝、逐表 policy、跨 workspace 自动化测试、禁止浏览器 service role |
| IDOR/越权 | 服务端按 workspace membership 和角色检查每个对象，不信任客户端传入 workspace |
| 审批绕过 | 数据库约束加服务端状态机；Production Board 只能引用已批准的具体 version |
| Prompt injection | 第三方证据视为不可信数据，与系统指令隔离；限制工具能力；输出必须经过 gate 和人工审批 |
| AI 幻觉/不实健康声明 | 未过期证据映射、Quality Gate、Compliance Checker、Human Approval |
| 假趋势/假案例/假数字 | 资料充分性门禁、claim-to-evidence mapping、禁止以模型常识补齐 30 天内容 |
| 恶意 Facebook/来源 URL | URL parser、允许 `https`、域名/重定向检查、阻止内网与 metadata IP，防 SSRF |
| XSS | 输出编码、HTML sanitizer、CSP、禁止直接渲染第三方 HTML |
| 日志泄密 | Authorization/API Key 自动脱敏；不记录完整请求正文、个人资料或秘密 |
| 成本滥用 | 身份验证、rate limit、预算 reservation、硬限额、幂等、告警和 kill switch |
| 重复调用/重复发布 | idempotency key、唯一约束、状态机与人工确认 |
| 供应链攻击 | lockfile、依赖扫描、最小依赖、CI provenance 与定期更新 |
| Preview 泄露生产数据 | preview 独立数据库和密钥；禁止 production service role；访问控制 |
| 第三方版权/条款违规 | 最小化保存、优先 URL/元数据/人工摘要、来源条款与 rights notes |
| 敏感属性推断 | 禁止根据姓名、语言、地点推断种族、宗教、健康等敏感属性 |
| 不可撤销审计被篡改 | append-only audit、受限写入、哈希和定期导出/保留策略 |

## 3. API Key 保护

- `.env.example` 只列变量名和安全占位符；真实 `.env*` 不提交。
- 所有 API Key 只能放在服务器环境变量或受控 secret store，绝不能硬编码、提交 Git 或注入浏览器 bundle。
- OpenAI、Facebook App Secret、Supabase service role 仅存在于受控服务端 runtime secret store。
- 浏览器只可使用经设计允许公开的 Supabase URL 和 anon/publishable key；安全边界仍是 RLS。
- Netlify 环境变量按 local/preview/staging/production 分 scope，preview 不继承生产秘密。
- 密钥设置最小权限、独立环境、负责人、创建/轮换/撤销日期。
- 日志、错误响应、analytics、source map 和构建输出不得包含密钥。
- 泄漏响应：立即撤销、轮换、查审计、检查异常用量、修复暴露路径并记录事件。

## 4. 身份与授权

- 使用 Supabase Auth 时开启安全 session/cookie 配置、邮箱验证和适当 MFA（至少 Admin/Reviewer）。
- 角色权限由数据库 membership 与服务端授权函数决定。
- 高风险动作要求近期认证：密钥配置、预算硬限额修改、紧急审批覆盖、发布与成员管理。
- Reviewer 与最后编辑者职责分离为默认规则；Admin 紧急覆盖需原因与审计。

## 5. 数据保护

- 数据最小化：不收集完成工作不需要的个人资料。
- 传输使用 TLS；数据库和 Storage 使用平台静态加密能力。
- 第三方内容优先保存 canonical URL、元数据、人工摘要和 hash。
- 敏感正文若必须保存，需分类、访问限制、保留期限与删除流程。
- 备份必须加密、限制访问，并定期测试恢复；RPO/RTO 在 Phase 1 前确认。
- 支持 workspace 数据导出、删除与保留策略；删除不应破坏必要的安全审计，但需去标识化。

## 6. AI 与内容安全

- 系统 prompt、品牌规则和用户证据采用明确分隔与结构化 schema。
- provider 调用仅传必要字段；禁止传 API Key、密码、session、未授权个人数据。
- 模型输出永远视为 untrusted content；进行 schema validation、长度限制、sanitization 和门禁。
- AI 必须先完成内部质量检查；未通过 Quality、Duplicate、Compliance 或 Human Approval 的版本不能标记、导出或展示为最终文案。
- Codex/Claude 资料整理 Prompt 只在本地生成供人工使用，不配置其 API Key；贴回结果视为未验证资料。
- Compliance Checker 规则需版本化并定期由合格人员复核。
- 不允许模型自行改变 gate、approval、budget 或 production 状态。

## 7. 日志与错误

- 每个请求和后台任务使用 correlation ID。
- 应记录：actor、workspace、操作、结果、provider request ID、耗时、用量和安全事件。
- 不应记录：API Key、access token、Authorization header、cookie、密码、完整个人资料、完整敏感 prompt。
- 用户错误信息不得返回堆栈、SQL、内部 URL 或 provider secret details。
- 严重错误与预算异常告警给授权人员；Error Logs 页面只显示脱敏上下文。

## 8. 安全验证清单

- Secret scan 与依赖扫描通过。
- RLS 的 allow/deny、跨 workspace、inactive member 和 service job 测试通过。
- SSRF、XSS、CSRF、rate limit、IDOR 和 privilege escalation 测试通过。
- 新版本使旧 approval 失效，过期 evidence 阻止批准。
- Production Board 无法接受未批准 version。
- Cost hard limit 在并发请求下仍不可超越预留策略。
- provider mock 返回恶意文本、超时、429、5xx 和 malformed JSON 时系统安全失败。

## 9. 事件响应

1. Detect：告警、异常用量、用户报告或审计发现。
2. Contain：停用 provider、撤销密钥、冻结相关账号/发布操作。
3. Investigate：使用 correlation ID、audit 和 provider logs 确认影响范围。
4. Recover：轮换密钥、修复、恢复服务、复核内容和数据。
5. Learn：记录时间线、根因、影响、补救和负责人，不在报告中暴露新秘密。
