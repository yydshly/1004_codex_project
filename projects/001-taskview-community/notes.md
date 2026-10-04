# 001 · TaskView Community — 研究笔记

[项目摘要](README.md) · [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community)

## **结论与研究范围**

TaskView 提供任务管理的完整应用链路，研究价值集中在数据模型、权限、接口和事件集成。普通项目的实际工作由成员完成；外部 Agent 可以通过 MCP / API 参与，但自主调度、工具执行和结果验收需要另建执行层。本次发布的是理解整理网页，不是 TaskView 产品实例。

## **研究记录**

| 项目 | 记录 |
| --- | --- |
| 研究日期 | 2026-10-04，Asia/Shanghai |
| 上游版本 / 提交 SHA | `46b3d1e6d4a0672e577d84e49906c1c78f22a74f` |
| 研究方式 | 静态源码、仓库文档与官方安装说明审阅 |
| 本机环境 | Windows / PowerShell；未安装或运行 TaskView 服务 |
| 核心问题 | 产品边界、架构、普通项目工作流、外部 Agent 接入与后续价值 |
| 结果状态 | 研究完成；部署、接口和执行闭环尚未复现 |

## **实现梳理与证据**

主链路是“界面操作 → HTTP API → 鉴权与权限 → 业务层 → 数据持久化”。任务变化产生业务事件，通知、Webhook、周期任务等执行后续动作。成员仍负责具体工作，例如编写代码或测试；点击完成改变任务记录和后续业务状态。`statusId` 与 `complete` 是独立字段，接入方应核对它们的语义并明确映射，不能将移动看板列直接当作执行验收成功。

以下链接固定到本次检查提交，避免主分支后续变更改变证据。

| 文件证据 | 支持的结论 |
| --- | --- |
| [web/package.json](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/web/package.json) | Vue / TypeScript 前端及相关依赖；平台不是只有静态展示 |
| [TasksRoutes.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/tv-modules/tasks/TasksRoutes.ts)、[TasksManager.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/tv-modules/tasks/TasksManager.ts) | 路由、权限检查、任务业务操作与更新事件 |
| [TypeScript 任务客户端](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-api/src/api/tasks.ts) | Axios 封装 HTTP 查询、创建和修改等调用；客户端不执行任务描述中的实际工作 |
| [app-user-middleware.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/middlewares/app-user-middleware.ts) | `tvk_` / `tvo_` 凭据识别与范围上下文；身份和授权由 API 层约束 |
| [tasks.schema.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-db-schemas/src/schemas/tasks.schema.ts) | `parentId`、`statusId`、`complete` 等任务结构与状态字段 |
| [graph.schema.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-db-schemas/src/schemas/graph.schema.ts)、[useLayout.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/web/src/components/features/graph/composables/useLayout.ts) | 依赖关系保存为边，图由 Vue Flow / Dagre 展示与布局 |
| [EventBus.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/core/EventBus.ts)、[JobQueue.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/core/JobQueue.ts) | 业务事件分发，pg-boss / PostgreSQL 后台作业；不构成自主 Agent 执行器 |
| [RecurrenceDispatcher.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/tv-modules/recurrence/RecurrenceDispatcher.ts) | 重复任务的后续实例生成属于业务自动化 |
| [MCP 文档](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/docs/3.integrations/2.mcp.md) | stdio / HTTP 接入、授权范围与外部 AI 工具调用 |
| [MCP index.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-mcp/src/index.ts)、[server.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-mcp/src/server.ts)、[http.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/taskview-packages/taskview-mcp/src/http.ts) | MCP 工具和 stdio / 共享 HTTP 服务入口，连接外部客户端与 TaskView API |
| [WebhooksDispatcher.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/tv-modules/webhooks/WebhooksDispatcher.ts) | 业务事件可向外部系统发送签名 Webhook |
| [IntegrationsManager.ts](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/api/src/tv-modules/integrations/IntegrationsManager.ts) | 代码仓库 Issue 同步与任务完成 / 重开状态回写；不能泛化为所有字段、PR、CI 全量双向同步 |
| [LICENSE.md](https://github.com/Gimanh/taskview-community/blob/46b3d1e6d4a0672e577d84e49906c1c78f22a74f/LICENSE.md) | 内部使用许可及外部客户、第三方实例访问限制 |

## **入口、出口与执行责任**

| 接口方向 | 数据与责任 |
| --- | --- |
| UI 输入 | 项目、任务描述、分配、状态、日期、工时等用户操作 |
| HTTP API / TypeScript 输入 | 查询和变更的结构化请求；后端统一检查身份与权限 |
| stdio / HTTP MCP 输入 | AI 客户端产生的工具调用；MCP 转为 API 操作 |
| OAuth 授权输入 | 用户同意和访问范围；文档描述 OAuth 2.1，动态客户端注册默认关闭 |
| 数据输出 | 任务、状态、历史、统计、关系边及其界面视图 |
| 事件输出 | 通知、签名 Webhook、对应 Issue 状态回写等业务效果 |
| 实际执行产物 | 代码、文档、测试结果由人或外部 Agent 生成，可将结果摘要、状态与外部链接写回 |

模型中有外部来源链接字段；本次不据此声称任意产物上传、对象存储或自动验收已经实现。MCP 和 HTTP API 是任务工具入口，不包含运行任意代码的通用工作环境。

## **人工与 Agent 使用场景**

内部网站项目可以由负责人拆分任务、成员执行、审核人检查并完成任务，平台保留可追踪记录。代码仓库 Issue 汇总、工时记录和重复事项也符合现有能力。对外客户登录实例则另受许可约束。

本地 AI 助手适合在用户指令下查询待办、拆分任务和更新状态；后台 Agent 适合由调度器分派受控工作。以“补充登录测试”为例，外部执行层要获得仓库、工作目录与测试工具，执行后返回提交链接和测试报告，再由验收流程决定是否完成。TaskView 的职责是记录与协调这个过程。

## **接入前提与建议验证**

stdio 路线需要本地支持 MCP 的客户端、可启动的 MCP 进程，以及可访问的 TaskView API 和授权。HTTP 路线需要共享 MCP 服务、客户端网络连通、按文档配置的 OAuth / Token 和范围。直接 API / TypeScript 路线无需 MCP，但仍遵守 API 鉴权与权限。本地执行端可以连接远程部署的平台。

Webhook 接收服务属于我们拟议的桥接层：验证签名、筛选触发条件，再交给外部调度器。领取租约、去重记录、重试和产物验收需明确由哪个外部服务负责，不可只凭收到“任务创建”事件就当作执行完成。

本次没有部署实验。网页和总览图用于表达研究结论，不能作为 TaskView 产品运行截图或接口测试证据。后续按[官方安装步骤](https://taskview.tech/docs/getting-started/installation)部署，先验证只读 MCP 能读取授权项目，再验证测试写入和权限拒绝。完成单任务执行、结果回写与人工验收后，再测试 Webhook 触发、重复事件、失败重试和恢复。

## **发现、价值与限制**

| 证据类别 | 本次结论 |
| --- | --- |
| 已有功能 / 源码依据 | 任务管理、看板、子任务、依赖关系、权限、事件、队列、API / MCP / Webhook |
| 架构判断 | 完整管理平台可作为 Agent 管理层参考；后台队列处理业务副作用，不等于任务内容执行 |
| 拟议扩展 | 任务领取 / 租约、重复派发抑制、隔离执行、重试与预算、产物存储、验收和人工审核 |
| 尚未验证 | 部署稳定性、并发性能、接口兼容性、MCP 实际授权效果、执行闭环、升级与故障恢复 |

外部接入可以形成“创建任务 → 外部服务领取 / 接收事件 → Agent 执行 → 回写结果 → 验收”。本地 stdio、后台 HTTP MCP 或直接 API 是接口路线；Agent 运行时、工具、调度规则与验收机制要另外实现。Webhook 桥接触发是设计建议，不是原库内置的 Agent 调度器。

研究价值需按目标判断：若关注人机共用任务模型、权限和集成，可以继续研究；若关注自主规划、多 Agent 协同执行、恢复和验收，应优先研究执行层项目。原库可减少管理层重复建设，但不能替代执行层。我们后续可先借鉴模块边界与数据结构，再决定是否承担自托管维护成本；接口支持不代表已经满足特定自动化系统的可靠性要求。

Source-Available 许可允许个人及组织内部使用，包括内部员工与承包商；向外部客户或第三方开放实例，即使免费，也需要另行商业许可。研究网页只是原创整理，公开网页不等于向外部提供 TaskView 服务。产品化与托管决策要再次核对固定提交及后续版本的原许可。

## **后续事项**

- [x] 回答核心研究问题，区分现有功能与扩展建议。
- [x] 将结论整理到项目 README。
- [x] 制作研究网页与可下载的 SVG / PNG 总览图，并同步总索引。
- [ ] 完成基础部署与只读 MCP 复现。
- [ ] 在测试项目验证写入与授权限制。
- [ ] 再评估是否实现外部 Agent 桥接、领取与验收。

## **网页产物验证**

扩写后的研究网页已完成以下本地浏览器检查；公开部署通过 GitHub Pages 工作流进行，最终远端验证在发布后记录。这些检查不构成上游 TaskView 的部署复现：

- 在 1440、768、390、320 像素宽度检查三个场景，页面无横向溢出，图片完整加载。
- 普通项目、本地 Agent、后台 Agent 的切换与键盘方向键操作正常，未发现页面脚本错误。
- 生成站点内的图片下载、样式、脚本和返回索引链接检查通过。
- 总览 SVG 文本未超出画布，已导出 1940 × 1600 PNG；完成桌面、手机截图与视觉检查。
- `python scripts/catalog.py check` 通过，登记信息、图片与生成内容一致。

## **参考资料与发布入口**

- [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community)
- [Gimanh/taskview-community 固定研究提交](https://github.com/Gimanh/taskview-community/tree/46b3d1e6d4a0672e577d84e49906c1c78f22a74f)
- [研究网页发布入口](https://yydshly.github.io/1004_codex_project/demos/001-taskview-community/)，发布与远端验证由主流程记录。
- [研究网页](demo/index.html) · [总览图 PNG](assets/taskview-overview.png) · [可缩放 SVG](assets/taskview-overview.svg)
- 本记录未复制上游实现代码；引用和接入不改变其 Source-Available License 范围。
