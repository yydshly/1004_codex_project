# Web 演示与部署

本仓库把多个研究网页汇集到同一个 GitHub Pages 站点。网站入口是项目索引，每个项目使用独立子路径。提交到 `main` 且修改项目、登记表、目录脚本、站点或部署工作流时，GitHub Actions 自动生成、测试、校验并发布；同时保留手动发布入口。

## **研究网页入口**

- [项目研究总索引](https://yydshly.github.io/1004_codex_project/)
- [001 · TaskView Community 研究网页](https://yydshly.github.io/1004_codex_project/demos/001-taskview-community/)，整理 [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community) 的能力、原理、场景、输入输出与 Agent 扩展价值。
- [002 · CodeFlow 研究网页](https://yydshly.github.io/1004_codex_project/demos/002-codeflow/#understanding)，以理解汇总图引导，说明能力、混合解析与关系推断、十种实际效果、输入输出、CLI / Card / JSON 扩展、使用场景，以及 Source Insight、Ix、GitNexus 的差异。页面包含锁定快照分析 15 个真实源码文件的原生运行器。
- [003 · 自然氛围与可探索造景理解导览](https://yydshly.github.io/1004_codex_project/demos/003-cozy-nature-worlds/research/README.html)，以指定总览图展示 Cozy Country 与原创一隅原型的效果对照，完整说明能力、原理、场景、价值与边界；关联[可交互原型](https://yydshly.github.io/1004_codex_project/demos/003-cozy-nature-worlds/)、[扩展计划](https://yydshly.github.io/1004_codex_project/demos/003-cozy-nature-worlds/research/expansion-plan.html)及十份研究文档。当前功能底座已交付，视觉提升、37 个条目、六种组合笔刷和三个模板仍为规划，暂停深入实现。
- [004 · 场景与模型风格图谱](https://yydshly.github.io/1004_codex_project/demos/004-scene-style-atlas/)，以[完整理解总览](https://yydshly.github.io/1004_codex_project/demos/004-scene-style-atlas/understanding/)串起原游戏官方画面、三轮原创实时样板、体感原理、使用价值和产品扩展；保留 V1/V2 完整存档及人物专项记录。人物研究暂停，故事、行动和游戏系统仍为候选。
- [005 · 水流与鸭子互动研究](https://yydshly.github.io/1004_codex_project/demos/005-water-duck-loops/)，使用九模块总览图，说明水鸭循环、四版原创原型、系列扩展与证据边界；[V4 蓄水救援](https://yydshly.github.io/1004_codex_project/demos/005-water-duck-loops/prototypes/reservoir/)及前三版均可从研究主页进入。
- [006 · Claude Code Best Practice 研究网页](https://yydshly.github.io/1004_codex_project/demos/006-claude-code-best-practice/)，以[完整模块总图](https://yydshly.github.io/1004_codex_project/demos/006-claude-code-best-practice/module-map.html)引导，覆盖 47 项功能主题、8 组 63 个条目，说明资料与模板的能力、技术机制、使用入口、开发与审查场景，以及知识沉淀、流程复用和验收价值。网页包含机制选择、执行链路说明和原创审查模板；交互不调用 Claude Code 或外部服务。
- [007 · Spirula Studio 实拍三维重建研究](https://yydshly.github.io/1004_codex_project/demos/007-spirula-studio/)，以完整理解图解释多视图实拍、相机求解、高斯优化、占据场网格提取、工具分工和资产复用；是静态图文档案，Spirula 原版本机训练及性能待验证。
- [008 · Forge3D 真实数据融合与三维场景渲染](https://yydshly.github.io/1004_codex_project/demos/008-forge3d/)，使用本次生成的理解引导图，汇总高程、点云、影像与已有 3DGS 的分工，公共数据和无人机外部重建两条路线、统一配准与融合渲染原理、应用价值、精度与覆盖边界、授权及后期验证步骤。此页是静态研究导览，概念效果图不作为 Forge3D 实测截图；原版渲染与性能仍待验证。

这里部署的是原创研究网页、理解汇总图和 CodeFlow 固定版本的浏览器运行资源。CodeFlow 原生示例实际解析公开原创 Mini Shop 源码；历史三层影响交互另行标为教学示意。网页不提供生产分析后端，也未部署 Ix、GitNexus、Source Insight；TaskView 及其他服务的数据库、MCP 和 Agent 执行环境需要另行部署。

## 静态演示

将最终可发布的 HTML、CSS、JavaScript 和资源放入 `projects/NNN-slug/demo/`。目录必须有 `index.html`，同步工具才会把演示复制到 `site/demos/NNN-slug/`。

`site/demos/` 和 `site/covers/` 是生成目录，每次同步会按登记信息重新生成。演示源码与静态产物以项目目录为准；`.gitkeep` 不发布，其他隐藏文件或目录、环境文件、依赖缓存及符号链接不能作为演示内容。

```text
projects/001-example-project/demo/
├── index.html
├── styles.css
└── assets/
```

需要构建的前端项目先按自己的构建命令生成静态产物，再把产物放入 `demo/`。不要把仅供开发服务器运行的源码作为最终发布内容。GitHub Pages 托管静态文件；需要 Node.js、Python、数据库等后端服务的应用应另行部署，并把公开访问地址登记为 `demo_url`。[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

`demo_url` 非空时，目录优先使用该在线地址，支持本项目的研究子页面或锚点；为空时，有 `demo/index.html` 的项目自动关联本项目 Pages 在线地址。总 README、图片预览与网站的“研究网页”都直接打开实际网页。HTML 源码仍可从项目 `demo/` 查看，并明确标为源码。

同站的网页入口会检查项目编号、目录和静态文件是否对应。002 从理解汇总锚点开始，003 从 `research/README.html` 开始，004 的目录阅读入口指向 `understanding/`，其工作台与实时样板保留在根页面；005、007、008 均有独立研究主页。003 原型由浏览器执行，无需单独部署业务后端；它的本地存档按站点地址隔离，本地与线上之间可通过 JSON 导出和导入迁移。具体入口以[总 README](../README.md#项目索引)的生成索引为准。

## 子路径与本地预览

本仓库默认 Pages 地址将是 `https://yydshly.github.io/1004_codex_project/`，项目演示地址形如 `https://yydshly.github.io/1004_codex_project/demos/001-example-project/`。项目站点默认位于仓库名子路径下。[GitHub Pages 站点类型](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

演示内部使用相对资源路径，例如 `./styles.css`、`./assets/logo.png`。以 `/assets/` 开头的路径会指向域名根目录；使用前端框架时，配置其资源基路径以匹配实际演示路径。需要浏览器端路由时，优先使用哈希路由，避免刷新子页面后找不到静态文件。

在仓库根目录同步并预览：

```powershell
python scripts/catalog.py sync
python scripts/catalog.py check
python -m http.server 8000 --directory site
```

打开 `http://localhost:8000/` 检查索引、图片和演示入口。发布前还要确认演示中的资源路径适用于上述 Pages 子路径。

## 自动发布与手动发布

准备发布时执行以下步骤：

1. 将研究记录与生成内容提交并推送到 GitHub。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。[发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. 推送相关修改到 `main` 自动触发；也可在 **Actions** 中打开 `.github/workflows/pages.yml` 对应的工作流，选择 **Run workflow**。
4. 等工作流成功后，使用部署结果提供的站点链接检查页面。

工作流支持 `push` 自动触发和 `workflow_dispatch` 手动触发，上传经过生成、测试和校验的 `site/`。后续项目与目录更新会自动发布。若尚未启用 Pages，仓库 README 和各项目文档仍可正常阅读。

## 发布前核对

- `python scripts/catalog.py check` 通过。
- 封面可加载；演示的 `index.html`、样式和资源完整。
- 静态文件中没有凭据、私人数据或只适用于本机的绝对路径。
- 引入的上游代码、图片与字体保留必要的署名和许可说明。
