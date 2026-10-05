# 006 · Claude Code Best Practice — 研究证据与验证记录

[项目摘要](README.md) · [网页源码](demo/index.html) · [上游仓库](https://github.com/shanraisshan/claude-code-best-practice)

## 研究范围

| 项目 | 记录 |
| --- | --- |
| 核查日期 | 2026-10-05，Asia/Shanghai |
| 固定上游提交 | `870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82` |
| 提交时间 | 2026-10-05 05:17:36 UTC；提交内容为文档更新标记刷新 |
| 上游许可 | MIT，Copyright (c) 2025-2026 Shayan Rais |
| 本机环境 | Windows、Python 3.10、Node.js v22.15.0；浏览器验证使用 Playwright 与 Chromium |
| 研究目标 | 汇总仓库能力，区分能力来源，解释底层机制、使用场景和工程价值 |
| 验证范围 | 固定版本文档与源码阅读、原创研究网页的交互和布局验证 |

本次没有执行上游天气、RPI、跨模型教程、MCP 服务或音频脚本。网页交互解释这些机制，未向 Claude、天气 API 或 MCP 服务发起任务；页面截图属于本地原创研究页。

## 仓库能力的三个层次

1. 仓库保存 Markdown 指令、YAML / JSON 配置、参考模板和 Python 事件脚本，展示如何组织任务。
2. Claude Code 运行时负责加载上下文、调用模型、委派子任务、执行工具，以及处理权限和生命周期事件。
3. 外部服务或项目工具执行实际操作，例如 Open-Meteo 查询、浏览器交互、构建、测试和文件写入。

这三个层次来自仓库定义与官方文档的交叉核对。README 引用其他框架或 Claude Code 特性，不能单独证明本库已实现或安装对应能力。

## 固定文件中的实现证据

| 文件 | 直接观察 | 本页对应解释 |
| --- | --- | --- |
| `CLAUDE.md` | 作者定位为参考实现，列出天气、技能、Hooks 与项目配置结构 | 资料与模板层 |
| `.claude/commands/weather-orchestrator.md` | 先问单位，调用天气子代理，检查温度与单位，再调用 SVG 技能；调用时指定 haiku | 六步天气交接 |
| `.claude/agents/weather-agent.md` | 配置 `skills: weather-fetcher`，正文明确要求 `Skill(weather-fetcher)`；要求保存读数记忆 | 技能预加载与显式调用分别解释 |
| `.claude/skills/weather-fetcher/SKILL.md` | 使用 WebFetch 获取 Open-Meteo 数据；固定迪拜坐标，读取 `current.temperature_2m` | 外部工具获取数据 |
| `.claude/skills/weather-svg-creator/SKILL.md` | 使用已有温度与 reference.md 模板，写入固定 SVG 和摘要路径 | 输出技能复用已有数据 |
| `.claude/hooks/scripts/hooks.py` | 从 stdin 读事件 JSON，读取配置，记录日志，选择音效并播放，最后成功退出 | 事件通知与观察机制 |
| `.mcp.json` | 配置 Playwright、Context7、DeepWiki 的外部包启动命令 | 工具连接能力及依赖 |
| `development-workflows/rpi/` | 研究、规划、实施命令与多个角色定义；包含测试和用户阶段验收要求 | 复杂功能的流程模板 |
| `.claude/commands/workflows/development-workflows.md` | 调研外部仓库，比较流程与组件，更新本库 README | 资料维护示例 |
| `development-workflows/cross-model-workflow/cross-model-workflow.md` | 两个终端分别规划、审查、实施、验证的教程 | 跨模型协作方法 |

编排文档与 agent 正文存在版本差异：文档描述 fetcher 仅预加载，当前 agent 明确要求显式 Skill 调用。网页采用当前实际文件的流程；没有把说明里的执行合同当作程序级强制保证。

此外，天气 agent 的字段使用 `allowedTools`，官方子代理文档列出的常用字段为 `tools` / `disallowedTools`。本研究未在 Claude Code 中验证该字段是否生效，因此不承诺示例具备已实测的工具隔离。研究 agent 的文字只读要求与其写入工具配置也应分别判断。

## 原理核对

- Agent loop：模型收集上下文、选择行动，工具执行后把结果反馈给模型，循环验证与调整。
- 项目指令：`CLAUDE.md` 提供项目知识；文字进入上下文，不等同于强制执行配置。
- Skills：一般按描述发现、使用时加载完整内容，也可由子代理预加载；属于推理时知识与流程注入。
- Commands：当前官方机制已并入 Skills，旧目录仍兼容。网页按职责区分任务入口与可复用做法。
- Subagents：独立上下文与角色配置，主会话接收结果；文件并行冲突需要另外处理。
- Hooks / MCP：运行时按事件触发脚本、连接外部工具。可阻断的 Hooks 能承担程序检查，本库声音脚本主要承担日志与通知。

场景收益属于基于上述能力的研究判断，没有进行生产效率或错误率实验。网页分别列出可能收益、验收依据和引入成本。

## 本轮补充：从理解到选用

- 四步执行链路：用同一审查请求展示原始任务、相关上下文、实际工具执行与结果反馈；代码框是简化教学示意，不是运行日志。
- 六类需求选用器：重复步骤、持续项目约定、可委派子任务、事件处理、外部工具连接、一次性小任务；每项列出成本并能跳转到对应机制。
- 最小审查模板：`CLAUDE.example.md`、`.claude/skills/review-change/SKILL.md`、`DELIVERY-CHECKLIST.md` 与使用说明；网页提供单文件和 ZIP 下载。文件为本地原创教学内容，未打包上游代码与第三方依赖，也未在 Claude Code 中执行。
- 输入输出与价值验证：核对修改范围、发现依据、实际检查及未验证项；建议在同类任务中观察返工、产物质量与总成本，没有预设提升比例。
- 常见误解：普通研究报告不会因读取仓库而全部进入上下文；角色提示与运行时机制分别承担知识和执行职责；跨工具迁移需要核对目录、字段、触发与权限。

当前官方文档确认 Commands 已并入 Skills，旧命令目录仍兼容。Skill 的 `allowed-tools` 提供该技能运行期间的免确认工具授权，不是独占工具白名单；本示例不配置它。上游 `.claude/settings.json` 为声音与日志 Hooks 设置 `async: true`；异步 Hook 无法阻止已经继续的工具执行，不能把声音通知当作阻断检查。

补充核查依据：[Skills 与兼容命令](https://code.claude.com/docs/en/skills)、[工具预授权](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)、[异步 Hooks](https://code.claude.com/docs/en/hooks#run-hooks-in-the-background)、[上游事件配置](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/settings.json)、[运行框架分析](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/reports/why-harness-is-important.md)。

## 网页实现与验证

### 完整模块总图

针对“一张图看清所有模块、技术细节和如何用”的需求，重新对照固定提交的 README Concepts 与 Hot 索引及递归文件树。两处索引合计 47 项（含 AI Terms），总图逐项覆盖，无缺项或新增功能；扩展加入 7 类实际示例、配置样例与资料入口，形成 8 组、63 个条目。

分组为：知识与上下文、执行与协作、配置权限与扩展、会话交互、审查持续工作、外部系统、实际示例、资料生态。颜色标注官方运行时、本库文件、外部项目与参考资料，保留三层能力来源与我们的研究交付路线。图中记录技术机制、使用入口和来源，未将引用的外部功能视作本库自动实现。

另核查根 `.claude/` 的 10 个命令、11 个代理、7 个 Skill；RPI 的 8 个角色、PKT 三种入口、团队教程生成的迪拜时间流程、3 个演示代理与3 个演示 Skill、维护命令及 `.codex` 参考文件。源码、模板和教程的存在不等于本机已经成功执行。

产物包括：`assets/module-map.json` 原创内容、`scripts/build_module_map.py` 生成器、同图 SVG 与 4400 × 3800 PNG、覆盖记录，以及 `demo/module-map.html` 缩放查看页。生成器检查 47 项唯一覆盖与面板高度；浏览器检查 SVG 文字没有超出面板或画布，63 个来源链接均写入。

查看页验证通过：八组定位、放大／缩小／100%／适合窗口、返回研究页、PNG 和 SVG 下载；1440、768、390、360 像素宽度均无工具栏横向溢出或脚本异常。下载返回内容与源文件字节一致。主研究页原有交互与五种宽度检查也通过，新增缩略图和入口正常。

官方原理对照延续前文来源，并补查 [Dynamic Workflows](https://code.claude.com/docs/en/workflows)、[Agent View](https://code.claude.com/docs/en/agent-view)、[会话通信](https://code.claude.com/docs/en/cross-session-messaging)、[Goal](https://code.claude.com/docs/en/goal)、[Scheduled Tasks](https://code.claude.com/docs/en/scheduled-tasks)、[Routines](https://code.claude.com/docs/en/routines)、[Advisor](https://code.claude.com/docs/en/advisor)、[Ultrareview](https://code.claude.com/docs/en/ultrareview) 和 [Channels](https://code.claude.com/docs/en/channels)。新版调度任务在部分情况下可恢复；图中未照抄旧示例“只保存在内存且完全不能恢复”的表述。

静态网页使用 HTML、CSS 和原生 JavaScript；没有第三方前端依赖、远程字体、账号、模型请求或后端业务服务。`demo/` 是源目录，`site/demos/006-claude-code-best-practice/` 是研究集同步产物。

本地预览：在工作区根目录执行以下命令。

```powershell
python scripts/catalog.py sync
python scripts/catalog.py check
python -m http.server 8766 --bind 127.0.0.1 --directory .
```

地址：`http://127.0.0.1:8766/site/demos/006-claude-code-best-practice/`。

浏览器检查结果：

| 检查 | 实际结果 |
| --- | --- |
| 能力机制切换 | 六个面板内容、来源链接与选中状态正确 |
| 执行循环 | 五步说明与选中状态正确 |
| 天气流程 | 六步切换、前后按钮、边界禁用与进度正确 |
| 场景比较 | 四个场景的做法、收益、验收和成本正确 |
| 请求到执行 | 四步说明、示意内容、选中状态与 aria 关联通过 |
| 机制选用 | 六种推荐内容、成本与机制跳转通过 |
| 文件下载 | 三个单文件及 ZIP 返回正常；真实下载建议文件名正确 |
| ZIP 内容 | 四个条目校验通过，Skill 建议路径正确，各条目与源文件字节一致；站点 ZIP 与源包一致 |
| 展开内容 | 三份模板预览与四个常见问题均能展开与阅读 |
| 键盘 | 能力、场景与执行链路 tabs 的方向键、Home、End 和 aria 关联通过 |
| 资源与脚本 | 无本地资源请求失败、页面脚本异常或控制台错误 |
| 来源 | 仓库来源链接包含固定 SHA；相应文件已在该提交树中确认存在 |
| 响应布局 | 1440、1024、768、390、360 像素宽度均无横向溢出或正文裁切 |
| 总索引 | 006 入口、封面加载、手机返回研究集和再次进入页面通过 |
| 章节定位 | 桌面与手机的新增章节跳转和高亮通过，源目录访问也能正确返回总索引 |
| 索引同步 | `catalog.py check` 通过；全部项目编号、登记路径和生成内容一致 |

视觉检查发现窄屏最初缺少可见的返回研究集入口，已补到页面顶部，并重新验证跳转。本轮进一步发现手机锚点的 scroll-padding 与 scroll-margin 叠加，高亮判定仍采用较小固定阈值；已按实际锚点偏移补足阈值，并重新验证桌面和手机跳转。截图与封面：

- `assets/overview.png`：原创三层能力关系补充图；总索引封面与网页首张引导图现采用完整模块总图 `assets/module-map.png`。
- `assets/page-desktop.png`：1440 × 1100 的首页视口。
- `assets/page-mobile.png`：390 × 844 的手机首页视口。
- `assets/practice-desktop.png`：1440 × 1100 的选用指南视口。
- `assets/practice-mobile.png`：390 × 844 的选用指南视口。

没有新建专项单元测试；交互验证使用本地忽略目录 `.cache/` 中的浏览器脚本，不会进入发布目录。交互检查针对研究网页与静态产物，不代表 Claude Code 工作流实测。远端交付采用本仓库的 GitHub Pages 发布流程。

## 固定来源与官方说明

- [上游固定提交](https://github.com/shanraisshan/claude-code-best-practice/tree/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82)
- [仓库定位](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/CLAUDE.md)
- [天气命令](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/commands/weather-orchestrator.md)
- [天气子代理](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/agents/weather-agent.md)
- [数据获取技能](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/skills/weather-fetcher/SKILL.md)
- [SVG 输出技能](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/skills/weather-svg-creator/SKILL.md)
- [事件脚本](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/hooks/scripts/hooks.py)
- [MCP 配置](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.mcp.json)
- [RPI 流程](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/development-workflows/rpi/rpi-workflow.md)
- [资料维护命令](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/.claude/commands/workflows/development-workflows.md)
- [跨模型教程](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/development-workflows/cross-model-workflow/cross-model-workflow.md)
- [MIT 许可](https://github.com/shanraisshan/claude-code-best-practice/blob/870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82/LICENSE)
- [官方执行循环](https://code.claude.com/docs/en/how-claude-code-works)
- [官方 Skills](https://code.claude.com/docs/en/skills)
- [官方 Subagents](https://code.claude.com/docs/en/sub-agents)
- [官方项目指令与记忆](https://code.claude.com/docs/en/memory)
- [官方扩展机制比较](https://code.claude.com/docs/en/features-overview)

## 远端交付摘要与引导图

项目摘要按能力、模块、使用场景与意义说明：社区资料、配置模板与参考实现用于沉淀知识、复用流程、组织分工和验收；实际推理和工具执行来自 Claude Code 及外部服务。README 增加八组模块与使用入口表。项目封面、README 与网页首张引导图统一使用完整模块总图，三层能力关系图作为后续原理补充。

完整总图覆盖 47 项功能主题、8 组 63 个条目，每项含机制、用法与来源；查看器支持分组定位、缩放、来源跳转与 PNG / SVG 下载。发布链接使用仓库 Pages 子路径，全部资源使用相对路径。远端提交只包含 006 研究与相应索引和部署说明。
