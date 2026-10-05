# 002 · CodeFlow · 研究笔记

[项目介绍](README.md) · [证据清单](sources.json) · [公开网页](https://yydshly.github.io/1004_codex_project/demos/002-codeflow/#understanding) · [本地展示页](demo/index.html) · [原生运行器](demo/runtime/index.html) · [样本源码](demo/fixtures/index.html)

公开网页为发布目标地址，部署状态与当前内容以发布验证为准。

**研究结论：CodeFlow 的核心是轻量代码结构分析与交互浏览。** 输入 GitHub 仓库/PR、本地文件夹/文件、ZIP 或 Markdown 后，混合解析与名称/导入归属规则构造文件关系；独立管线提取 import、组件和路由架构。输出包括文件关联、函数信息、目录/行数指标、潜在影响与规则提示，以及十种原生视图和可导出报告。

十种效果主要是关系投影和聚合、目录与规模展示、独立架构三类。图便于讲解结构与核对局部路径，但换布局不新增事实；Source Insight、Ix、GitNexus 的实质差异还包括符号粒度、持久化、更新与任务查询。CLI 的网页服务/目录监听、Headless JSON、Card / GitHub Action 和导出产物提供接入与二次处理入口；新增语言规则或视图需要修改源码，未验证稳定插件 SDK。

本研究只实跑固定 CodeFlow 快照与 15 文件/33 函数/42 静态连接样本；另三工具是官方材料比对。静态边、影响候选和分数都需要源码与测试核对，不能证明业务正确性、运行性能、可利用性或四工具优劣。

[![CodeFlow 理解汇总：原理、效果、输入输出、工具区别与场景](assets/codeflow-understanding.png)](demo/assets/codeflow-understanding.svg)

[可交互的汇总图与文字版](demo/index.html#understanding) · [完整摘要与接入说明](README.md)

## 范围和方法

- 整理日期：2026-10-05，Asia/Shanghai；沿用 2026-10-04 核查的源码快照 `b0e82d127fc4990f571ebc6da6c5d9af2591aaa1`，本轮只读复核关键代码与固定提交文档，不称为最新版本。
- 问题：能输入什么、得到什么；图上的边如何形成；指标和影响范围能证明什么；与 Source Insight、Ix、GitNexus 有何重叠和实质差异；展示是否支持具体任务。
- 方法：交叉阅读 README、`index.html`、CLI、Card 文档及 VM 装载器；2026-10-05 另核查 Source Insight v4 官方功能/命令行、Ix 与 GitNexus 的公开 main 文档及工具实现。
- 验证边界：CodeFlow 有固定提交原生浏览器运行器与真实 Mini Shop 源码，十视图实际结果见浏览器 QA；Source Insight、Ix、GitNexus 仅材料核查，未安装、运行或注册 MCP；没有四工具准确率、生产性能和收益实测。此前教学截图与新原生运行证据分开。

## 输入与运行形态

网页可接 GitHub 仓库/PR、本地文件夹或文件、ZIP 和 Markdown 笔记。完整下载后，`index.html` 加已检入的 `vendor/` 构成浏览器运行资源；GitHub 入口仍需要网络。React 管 UI，D3 管图，分析逻辑集中于单页源码。[固定提交 README](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/README.md)

CLI 是 Node HTTP 服务，绑定 loopback，提供文件列表/内容和 SSE 事件，通过文件监听让网页更新；它不会因此成为持久图数据库。Card 读取同一 `index.html` 分析区块，在 Node VM 中计算并产生 SVG/历史；`card/analyze.js` 则只输出带完整分析与 snapshot 的 JSON，不生成卡片、提交或评论。[CLI](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/cli/codeflow.mjs) · [Card 文档](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/card/README.md)

**环境差异**：`card/lib/analyzer.js` 把 `TreeSitter`、`Babel`、`acorn` 设为 `undefined`。复用源码不意味着复用浏览器可用的全部解析器，也不能据文档的“same analyzer”断言输出完全一致。[VM 装载器](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/card/lib/analyzer.js)

## 解析与主图：事实和解释

| 位置 | 源码观察 | 解释边界 |
| --- | --- | --- |
| [Parser grammars](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L998) | Python 配置为 `coverage: calls`；许多其他 WASM 配置仅为 `available` | 文件存在不代表正常分析路径采用该 grammar |
| [extract](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L1885) / [JS AST](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L1954) | JS/TS 用 Babel 转 JSX/类型，再以 Acorn 解析 AST；后备逻辑处理失败 | 不应概括为“所有语言都是正则”或“JS/TS 正常用 Tree-sitter” |
| [findCalls](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L3234) / [Python](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L3277) | Python CST 中匹配候选函数名的 identifier，排除部分定义/参数名后计数 | 包含引用，不能解读为实际执行次数或纯调用表达式数 |
| [定义解析](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L5215) | 优先同文件，其次唯一名称，再按显式导入缩小同名候选 | 这是名称和来源规则，不是完整类型/数据流分析 |
| [跨文件边](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L5270) | `source` 为定义文件，`target` 为引用文件；未能确定归属时可能标记 `possiblyCalled` 而不连边 | 主图由函数使用归属推断；图边的 count 是静态检测量 |

另有独立架构管线：[extractArchitectureImports](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L4240) 提取 import/from、字符串动态 import、require；[buildImportBasedDependencies](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L4819) 解析文件并连接架构块。组件、路由和 synthetic role 规则也影响架构结果，不能把它等同于主图或真实业务因果。

## 影响与健康分规则

`calcBlast` 将定义文件指向引用文件的边作为下游关系。从选中文件的直接依赖者做 BFS，收录深度 1–3；`transitive` 集合包含直接依赖者，不应将它和 direct 数量简单相加。[calcBlast](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L5574)

加权影响分为直接依赖数，加上深度 2、3 的每个候选分别贡献 `1/2`、`1/3`。风险等级另由直接依赖数和被跨文件使用的函数数触发：8 个直接依赖或 5 个函数为 critical；4/3 为 high；2/1 为 medium。它不是故障概率模型。

`calcHealth` 从 100 分扣除以下项目，四舍五入并截断至非负；90/80/70/60 为 A/B/C/D，其余 F。这里记录的是浏览器函数规则，不以 Card 文档的 A+ 等宣传样例替换它。[calcHealth](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L5660)

| 项目 | 扣分规则 |
| --- | --- |
| 疑似死函数百分比 | 最多 20 分 |
| 标题含 Circular 的问题数 | 每项 5，最多 20 |
| 标题含 Large 的问题数 | 每项 3，最多 15 |
| 连接数 / 文件数超过 3 的部分 | 每单位 2，最多 15 |
| high 安全提示数 | 每项 5，最多 20 |

该分数是项目自定规则，不是完整复杂度度量或安全认证。对两个仓库的排除项、解析覆盖和入口不同，分数也不宜直接排名。

## 覆盖、历史和隐私

- `repoMax=750` 限制 GitHub API 分析文件数；超出后提示使用 ZIP 完整分析。这是该入口的样本上限，不是整个工具所有入口均限 750。[限制定义](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L789) · [应用样本上限](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L10527)
- 单文件大于 `2*1024*1024` 字节跳过内容；超限、网络失败、排除项和无法解析可能导致关系与指标不全。[单文件上限](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L995)
- GitHub 扫描对每个代码文件取最多 10 条 commit 作为 churn；ownership 方法取最多 50 条并按作者计数，不是真正逐行 blame，也不是完整提交历史。API 限制时可能没有历史信息。[提交接口](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L3664) · [扫描调用](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L10546)
- IndexedDB 的 recent analysis 是摘要缓存：`compactAnalysisForCache` 删除文件 content 和各类 code snippet。它仍保存分析元数据，不能从“去源码”推断完全不持久化任何数据。[缓存](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L9128)
- 浏览器本地分析、GitHub API 和 CI runner 是不同的数据路径。原项目 README 主张无自有后端收集；本研究未做网络抓包与完整安全审计，不将此变为已实测保证。

## 从“效果图”回到“分析任务”的判断

我们的理解是：源码解析和索引负责获取事实，关系模型负责组织事实，图查询与规则负责形成候选结论，UI/MCP/CLI 负责交付。广义上可称为代码知识图谱，但这个名称本身不代表完整类型系统、业务理解、运行证据或准确率。CodeFlow 的近期摘要也不能等同于完整持久符号数据库。

同一节点与边换布局，只改变可读性；聚合到目录、面积显示 LOC，会改变观察角度；另抽取 import/角色、增加符号关系或控制/数据依赖，则改变信息和分析内容。这个分层比“都是图”更能判断增量价值，也是此次网页总图的表达重点。

| 展示类别 | 原生视图 | 信息与容易误读点 |
| --- | --- | --- |
| 文件关系及源码 | Graph、Code、3D、Matrix、Bundle | 主文件关联的不同呈现；Code 增加源码卡片；3D 与圆周布局不新增调用事实 |
| 目录聚合后的关系 | Flow | 聚合文件边到目录，并按净额合并双向关系，不能读成实际执行流量 |
| 按目录组织的文件关系 | Cluster | 保留文件节点，按目录中心布置，不是发现业务社区 |
| 目录与规模 | Tree、Treemap | Tree 是目录分组而非调用树；Treemap 面积是行数而非复杂度、耗时或重要性 |
| 独立架构提取 | Block Diagram | 另从 import、组件、路由及角色规则归纳块；不是完整运行架构 |

依据：[Treemap/Matrix](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L12731)、[Tree/Flow](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L12876)、[目录簇](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L13003)、[独立架构依赖](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L4819)。固定版本 Matrix 最多前 40 文件、Tree 前 80、Cluster 前 100，Flow 最多 15 目录；显示范围不必等于已分析范围。

全仓库大图容易拥挤，在代码定位中未必优于源码跳转或关系列表。围绕一个问题裁剪的图更容易核对：例如“谁使用金额计算”“哪个循环依赖需要打断”“这个修改的候选影响路径在哪里”。这属于我们的任务判断，没有做可用性或工时对照试验。

## Source Insight、Ix、GitNexus 的重叠与区别

Source Insight 的符号数据库、定义/引用导航、调用树和继承图说明这些能力并不是新近图谱库的发明；其关系窗跟随符号，在阅读和编辑时提供上下文。[官方功能](https://www.sourceinsight.com/feature-details/) 命令行还能调用内建、自定义或宏命令，同步项目文件，所以不能称它“只能手动操作”。[v4 命令行](https://www.sourceinsight.com/doc/v4/userguide/Manual/Concepts/Command_Line_Options.htm)

Ix 以 Tree-sitter 提取实体，经引用规则与 patch 写入 ArangoDB / Scala memory-layer；CLI、MCP 与可视化复用持久图。增量摄取使用 mtime/hash 并处理删除，`context` 按目标和预算给 Agent 输出结构证据。其 Scala 后端源码不在公开仓库；Pro 项目记忆和云语义搜索各有边界。我们曾参考既有 Ix 研究，本轮公开核查入口为 [原理](https://github.com/ix-infrastructure/Ix#how-it-works)、[MCP](https://github.com/ix-infrastructure/Ix/blob/main/ix-cli/src/mcp/server.ts) 与 [摄取](https://github.com/ix-infrastructure/Ix/blob/main/ix-cli/src/cli/commands/ingest.ts)。

不能把 CodeFlow 称作没有监听、没有缓存或没有自动化，也不能把 Ix 称作只可用 CLI、完全开源离线或会自动学习业务。更准确的比较是“当前分析与指标历史”对“持久实体图与目标查询”；这并不证明某一方更准确。

根据能力推断：CodeFlow 适合快速熟悉项目、评审、重构候选和可视化汇报；Ix 适合持续反复查询一个仓库与 Agent 结构上下文。采用前都需用自身语言、同名/动态模式验证误连、漏连、更新效果和实际任务收益。

GitNexus 的 CLI/MCP/HTTP 使用本地 LadybugDB 索引，默认关系管线加入符号、跨文件关系、社区和候选流程。[架构](https://github.com/abhigyanpatwari/GitNexus/blob/main/ARCHITECTURE.md) `context/impact/detect_changes` 将查询组织成符号上下文、潜在影响和 Git 改动检查。当前可选 `--pdg` 还能查询控制/数据依赖与污点线索；这些查询有语言、索引选项、范围和返回限额，未在本研究运行。[工具定义与边界](https://github.com/abhigyanpatwari/GitNexus/blob/main/gitnexus/src/mcp/tools.ts) 候选流程沿静态关系遍历并受深度/分支预算限制，不能当运行轨迹。[流程实现](https://github.com/abhigyanpatwari/GitNexus/blob/main/gitnexus/src/core/ingestion/process-processor.ts)

四工具对照见 [README](README.md#四种工具的区别与场景)。实质差异至少有：解析与消歧方式、实体/关系粒度、图的保存和更新、查询返回的任务证据、接入方式、运行成本。展示形式只占其中一层。MCP 能让 Agent 调用，不会自动修正错边、补足动态行为或保证修改正确；数据库持久化也不会自己赋予业务语义。

### 如何判断实际价值

| 实际问题 | 合适的交付 | 验收方法 |
| --- | --- | --- |
| 接手陌生代码库 | 入口、模块概要、局部依赖与源码链接 | 能沿入口找到实现，并核对关系 |
| 修改金额计算 | 调用者/使用者、影响候选、变更差异 | 人工预期清单对照，补充业务测试 |
| 排查循环与耦合 | 少量相关节点、边来源、循环路径 | 核对 import/引用，验证重构后行为 |
| 让 Agent 连续改代码 | 可查询符号上下文、索引更新时间、来源位置 | 比较漏读、误改、测试通过率与耗时 |
| 调查线上耗时或故障 | 静态关系仅作定位线索 | profiler、日志、实际 trace 与复现测试 |

表中均为我们从能力推导的任务建议，不是经过四工具实测的结论。当前 15 文件/33 函数/42 静态边只说明 CodeFlow 原生管线在样本上的运行结果；不能据此比较其他工具，也不能把图边数量当作准确率。

未来如做对照，需要同一版本、同一输入和人工标注的预期关系；分别记录支持语言、误连/漏连、歧义/动态覆盖、修改/删除后的更新，以及能否正确完成真实任务。随后用运行证据判断业务行为，避免把“图更丰富”直接算成“分析更有效”。

## 研究产物与后续验证

本子项目包含研究说明、原理 SVG/PNG、展示页、原生运行器和原创源码样本。新运行器沿用锁定提交的 `index.html` 与 vendor，在浏览器读取 manifest 指向的实际源文件，再调用上游分析/渲染管线；不是手工造节点或预制图。运行资源保留 CodeFlow MIT 和各 vendor 许可，来源与接入改动见 [UPSTREAM.md](demo/runtime/UPSTREAM.md) 和 [upstream.json](demo/runtime/upstream.json)。原生视图包括 `graph`、`code`、`graph3d`、`treemap`、`matrix`、`dendro`、`sankey`、`disjoint`、`bundle`、`architecture`，依据 [视图选择器](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L14568)。着色/布局选项不算额外一种原生视图。

### Mini Shop 真实样本

[manifest](demo/fixtures/manifest.json) 只纳入 15 个实际源码文件：12 个 `.ts` 业务模块和 3 个 `.tsx` 页面、布局、组件；`path` 为含 `src/` 的仓库相对路径，`url` 相对 manifest 定位文本文件。六目录为 `src/utils`、`src/server/services`、`src/server/routes`、`src/ui`、`src/app`、`src/components`，33 个导出函数名称唯一；源码大小为 438–1519 字节。各模块有实际 import 和函数使用，包含金额计算、折扣、库存、配送、结算、订单、服务路由、HTML 转义与 React JSX 展示。`node:crypto` 和 `react` 为外部导入，不是样本内文件连边。

主链从提供者到使用者是 `utils/money → server/services/pricing → server/services/checkout → server/services/orders → server/routes/orders → ui/app`，另有商品、库存、配送与 JSX 组件分支。目录 import 形成有向无环图，避免原生 Flow 遇到循环；选 pricing 可以观察影响层级，选 money 时越层直接引用会缩短 BFS 距离，不能拿业务链长度替代最短图距离。[源码查看器](demo/fixtures/index.html) 通过 fetch 读实际文本，用 textContent 显示，不执行源码或注入 HTML。

2026-10-05 在 Node.js 22.15.0 中用 `--experimental-strip-types` 执行样本核心业务，10 项断言通过：总价 13500 分、折扣 500、配送 800、到货 2 天、订单确认、茶叶库存 18、杯子库存 7、收据含确认文本、数量 0 错误和库存不足错误。另只读校验 15 文件、6 目录、33 个唯一导出函数、34 条相对 import 完整和目录 DAG；本地 vendor Babel 7.23.5 以 TypeScript/React presets 成功转换全部 3 个 TSX。记录见 [sample-validation.json](demo/fixtures/sample-validation.json)。这是样本业务与输入结构检查，不是 CodeFlow 引用解析准确率；没有执行或部署 React/Next 页面，未产生真实 Git 历史。

本轮原生浏览器已报告 15 文件、33 函数、42 条静态连接；架构视图实际生成 6 个块、10 条依赖与 1 个路由。架构显示的 Next.js 是根据页面/布局等文件形态启发式推断，不表示该样本已成为运行或部署的 Next.js 应用。Code 卡片通过桥接器将分析前 fetch 的原始文本恢复到 `data.files`，以适配 HTTP 样本没有本地 directory handle 的情况；没有构造替代代码或修改渲染器。上述数量说明原生管线已处理样本，不能据此宣称所有图边与计数正确。

**已知上游缺陷**：原生 Code 中可见 `class="syn-str">` 等着色标签碎片。固定提交 [L11236–L11240](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/index.html#L11236) 先为字符串/数字插入 span，再替换 JS 关键词，关键词 `class` 也命中这些标签属性，污染插入的 HTML。核对原始快照与运行器确认 `highlightSyntax` 未改动；为保留真实上游效果，本轮没有修补原生着色器。源码文件本身未被此显示处理改写，查看器以 textContent 呈现原文。[原文入口](demo/fixtures/index.html)

### 历史教学检查与新运行检查

此前使用内置浏览器检查模拟教学页：默认三层范围排除第四层、直接范围只列直接使用者、改变源节点、末端节点、重置、场景标签与键盘导航、窄屏/桌面布局，共 13 项通过。对应旧截图和结果见 [verification.json](verification.json)，不能作为新增原生视图截图或准确率证据。本轮原生十视图运行、交互、截图及发现的限制在同一记录中单独列出。

后续可用已有 Mini Shop 或构造含歧义/动态模式的小仓库，分别验证浏览器与 Node 后备路径、同名消歧、回调与动态关系、CLI 修改/删除更新、750 文件样本与超限文件。真实 tracing、生产数据和准确率 A/B 是独立验收环节；未进行 Ix 实验，不能推断两工具谁更准确。

原作者为 Braedon Saunders；上游 [MIT 许可](https://github.com/braedonsaunders/codeflow/blob/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1/LICENSE) 不因本研究重新组织而改变，运行器保留上游版权与依赖许可。Mini Shop 是本研究原创源码，许可位于 [fixtures/LICENSE](demo/fixtures/LICENSE)；原理封面仍为原创说明图。
