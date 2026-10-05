# GitHub 项目研究集

这里汇总近期发现的优秀 GitHub 项目，记录它们解决的问题、核心设计、运行方式与实践结论。每个子项目都有独立的研究文档、截图和实验目录；本页负责摘要介绍、顺序索引和图片预览。

[研究指南](docs/research-guide.md) · [子项目目录](projects/README.md) · [Web 演示与部署](docs/deployment.md) · [本地站点入口](site/index.html)

## 项目索引

子项目使用至少三位的固定编号，按 `001`、`002`、`003` 的顺序展示。编号分配后保留，归档不会改变其他项目的顺序。索引由 [projects.json](projects.json) 统一维护。

<!-- PROJECT_INDEX:START -->

| 编号 | 子项目 | 摘要 | 状态 | 标签 | 原仓库 | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | [TaskView Community](projects/001-taskview-community/README.md) | 可自托管的项目与任务管理平台，提供看板、子任务、依赖图、权限与工时报表。底层采用 Vue、Express 和 PostgreSQL，通过 API、MCP、Webhook 连接人和外部 Agent；可复用为任务入口与进度管理层，自动执行和验收需另行构建。 | 已完成 | 任务管理、MCP、Agent 接入 | [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community) | [Demo](https://yydshly.github.io/1004_codex_project/demos/001-taskview-community/) |
| 002 | [CodeFlow · 代码结构可视化与轻量分析](projects/002-codeflow/README.md) | 无需后端的代码结构浏览与轻量静态分析工具：输入 GitHub 仓库、PR 或本地源码，另支持 Markdown 笔记；经 Babel/Acorn、Tree-sitter 与正则抽取定义和引用，推断文件关系，输出十种交互视图、源码卡片、指标、潜在影响与可导出报告。可通过 CLI 监听、Card 指标历史和无界面 JSON 接入外部流程。研究页以汇总图引导，包含真实源码原生演示及 Source Insight、Ix、GitNexus 对比；静态线索需经源码和测试核实。 | 已完成 | 代码结构、静态分析、工具对比 | [braedonsaunders/codeflow](https://github.com/braedonsaunders/codeflow) | [Demo](https://yydshly.github.io/1004_codex_project/demos/002-codeflow/) |
| 006 | [Claude Code Best Practice · 能力与工作流研究](projects/006-claude-code-best-practice/README.md) | Claude Code 的社区学习资料、配置模板与工作流参考实现：通过项目记忆、Commands / Skills、Subagents、Hooks 与 MCP 组织重复任务和多步骤开发。完整模块总图覆盖 47 项功能主题，按知识与上下文、执行与协作、配置权限与扩展、会话体验、审查与持续工作、外部系统、本库示例和资料导航整理为 8 组 63 个条目，每项说明技术机制与使用入口。适用于代码研究与审查、复杂功能开发、团队交接、资料维护和外部工具接入；价值是沉淀知识、复用流程、减少重复说明与遗漏、明确交接和验收依据。实际推理和工具执行由 Claude Code 与外部服务提供，收益需结合适配、维护和执行成本验证。 | 已完成 | Claude Code、工作流编排、上下文工程 | [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | [Demo](https://yydshly.github.io/1004_codex_project/demos/006-claude-code-best-practice/) |
| 007 | [Spirula Studio · 实拍三维重建与高斯原理](projects/007-spirula-studio/README.md) | 把同一静态对象的多角度照片、绕拍视频，经抽帧、掩膜、SfM 相机求解和逐场景高斯优化，变成可自由观察、保存和编辑的三维高斯资产，并提取带纹理网格、渲染图片与漫游视频。独立 C++ 桌面与 CLI 整合重建、批处理、编辑和导出；Vulkan/CUDA、训练量化与 GPU 内存优化支撑计算。中文总图和源码研究解释高斯、可微渲染、密度控制与占据场网格提取，覆盖商品/文物展示、空间导览、内容制作及采集管理、跨机调度、质量验收等扩展，并对比 Splat.js、QuerySplat、LichtFeld、SuperSplat、TRELLIS.2、Forge3D 的职责。实拍资产可复用，外观逼真不保证测量或制造精度；资料与源码已审校，Spirula 本机运行与性能待验证。 | 研究中 | 实拍三维重建、3D Gaussian Splatting、输入输出与工具对比 | [harry7557558/spirula-studio](https://github.com/harry7557558/spirula-studio) | [静态文件](site/demos/007-spirula-studio/index.html) |

<!-- PROJECT_INDEX:END -->

## 图片预览

每个子项目以理解汇总图或真实运行截图作为引导图，配上能力、原理、输入输出和使用场景摘要；图的性质与验证范围在研究文档中说明。引导图会同步到这里和 Web 索引页。

<!-- PROJECT_GALLERY:START -->

### **001 · TaskView Community**

**项目摘要**

可自托管的项目与任务管理平台，提供看板、子任务、依赖图、权限与工时报表。底层采用 Vue、Express 和 PostgreSQL，通过 API、MCP、Webhook 连接人和外部 Agent；可复用为任务入口与进度管理层，自动执行和验收需另行构建。

[研究记录](projects/001-taskview-community/README.md) · [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community)

![TaskView Community 研究引导图](projects/001-taskview-community/assets/taskview-overview.png)

### **002 · CodeFlow · 代码结构可视化与轻量分析**

**项目摘要**

无需后端的代码结构浏览与轻量静态分析工具：输入 GitHub 仓库、PR 或本地源码，另支持 Markdown 笔记；经 Babel/Acorn、Tree-sitter 与正则抽取定义和引用，推断文件关系，输出十种交互视图、源码卡片、指标、潜在影响与可导出报告。可通过 CLI 监听、Card 指标历史和无界面 JSON 接入外部流程。研究页以汇总图引导，包含真实源码原生演示及 Source Insight、Ix、GitNexus 对比；静态线索需经源码和测试核实。

[研究记录](projects/002-codeflow/README.md) · [braedonsaunders/codeflow](https://github.com/braedonsaunders/codeflow)

![CodeFlow · 代码结构可视化与轻量分析 研究引导图](projects/002-codeflow/assets/codeflow-understanding.png)

### **006 · Claude Code Best Practice · 能力与工作流研究**

**项目摘要**

Claude Code 的社区学习资料、配置模板与工作流参考实现：通过项目记忆、Commands / Skills、Subagents、Hooks 与 MCP 组织重复任务和多步骤开发。完整模块总图覆盖 47 项功能主题，按知识与上下文、执行与协作、配置权限与扩展、会话体验、审查与持续工作、外部系统、本库示例和资料导航整理为 8 组 63 个条目，每项说明技术机制与使用入口。适用于代码研究与审查、复杂功能开发、团队交接、资料维护和外部工具接入；价值是沉淀知识、复用流程、减少重复说明与遗漏、明确交接和验收依据。实际推理和工具执行由 Claude Code 与外部服务提供，收益需结合适配、维护和执行成本验证。

[研究记录](projects/006-claude-code-best-practice/README.md) · [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)

![Claude Code Best Practice · 能力与工作流研究 研究引导图](projects/006-claude-code-best-practice/assets/module-map.png)

### **007 · Spirula Studio · 实拍三维重建与高斯原理**

**项目摘要**

把同一静态对象的多角度照片、绕拍视频，经抽帧、掩膜、SfM 相机求解和逐场景高斯优化，变成可自由观察、保存和编辑的三维高斯资产，并提取带纹理网格、渲染图片与漫游视频。独立 C++ 桌面与 CLI 整合重建、批处理、编辑和导出；Vulkan/CUDA、训练量化与 GPU 内存优化支撑计算。中文总图和源码研究解释高斯、可微渲染、密度控制与占据场网格提取，覆盖商品/文物展示、空间导览、内容制作及采集管理、跨机调度、质量验收等扩展，并对比 Splat.js、QuerySplat、LichtFeld、SuperSplat、TRELLIS.2、Forge3D 的职责。实拍资产可复用，外观逼真不保证测量或制造精度；资料与源码已审校，Spirula 本机运行与性能待验证。

[研究记录](projects/007-spirula-studio/README.md) · [harry7557558/spirula-studio](https://github.com/harry7557558/spirula-studio)

![Spirula Studio · 实拍三维重建与高斯原理 研究引导图](projects/007-spirula-studio/assets/spirula-studio-overview.png)

<!-- PROJECT_GALLERY:END -->

## 添加一个研究项目

需要 Python 3.10 或更高版本，无需安装额外 Python 依赖。在仓库根目录执行以下命令，将示例参数替换为实际项目的信息：

```sh
python scripts/catalog.py add --slug your-project --name "项目名称" --repo "https://github.com/owner/repo" --summary "这个项目解决什么问题，为什么值得研究"
```

命令自动分配下一个编号、创建 `projects/NNN-slug/` 研究目录并同步索引。随后编辑项目 README 和笔记，放入截图，按需补充静态 Web 演示。

修改 [projects.json](projects.json) 中的摘要、状态、标签或封面后，运行：

```sh
python scripts/catalog.py sync
python scripts/catalog.py check
```

`sync` 更新本页生成区块和 `site/` 目录；`check` 检查编号、元数据、文件路径及生成结果是否一致。生成区块中的内容应通过项目清单更新。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `projects.json` | 项目清单、固定编号、摘要和展示信息 |
| `projects/NNN-slug/` | 各子项目的研究说明、笔记、图片和实验 |
| `templates/project/` | 新子项目的文档模板 |
| `assets/images/` | 总项目库共用的图片 |
| `docs/` | 研究约定和 Web 部署说明 |
| `scripts/catalog.py` | 新建项目、同步索引和校验 |
| `site/` | 生成的静态索引及多个子项目 Web 演示 |
| `.github/workflows/` | 仓库检查及手动 Pages 发布流程 |

## Web 演示

每个子项目可在自己的 `demo/` 目录中放置静态页面。同步时，这些页面会汇总到 `site/demos/NNN-slug/`，通过一个 GitHub Pages 站点访问多个演示。

仓库已准备手动发布工作流。启用方式和路径约定见 [部署说明](docs/deployment.md)。各项目研究网页汇总到同一个 GitHub Pages 站点，使用手动工作流发布与更新。

## 研究约定

- 记录研究时使用的上游版本或提交，便于重复验证。
- 将自己的观察和复现结论写入研究文档，引用上游资料时注明来源。
- 子项目实际截图保存在各自 `assets/` 目录，并使用相对路径引用。
- 上游源码、依赖、许可证和运行步骤由子项目分别管理；详细规则见 [研究指南](docs/research-guide.md)。
