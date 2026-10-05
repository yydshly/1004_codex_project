# Web 演示与部署

本仓库把多个研究网页汇集到同一个 GitHub Pages 站点。网站入口是项目索引，每个项目使用独立子路径。仓库采用 GitHub Actions 手动发布，提交推送后需要触发部署工作流。

## **研究网页入口**

- [项目研究总索引](https://yydshly.github.io/1004_codex_project/)
- [001 · TaskView Community 研究网页](https://yydshly.github.io/1004_codex_project/demos/001-taskview-community/)，整理 [Gimanh/taskview-community](https://github.com/Gimanh/taskview-community) 的能力、原理、场景、输入输出与 Agent 扩展价值。
- [002 · CodeFlow 研究网页](https://yydshly.github.io/1004_codex_project/demos/002-codeflow/#understanding)，以理解汇总图引导，说明能力、混合解析与关系推断、十种实际效果、输入输出、CLI / Card / JSON 扩展、使用场景，以及 Source Insight、Ix、GitNexus 的差异。页面包含锁定快照分析 15 个真实源码文件的原生运行器。

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

`demo_url` 非空时，索引中的演示入口优先使用该外部链接；为空时，有 `demo/index.html` 的项目在网站中使用静态演示入口。仓库 README 的“静态文件”链接用于查看演示文件，实际在线体验请进入已发布的 Pages 站点。

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

## 手动启用 GitHub Pages

准备发布时执行以下步骤：

1. 将研究记录与生成内容提交并推送到 GitHub。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。[发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. 在 **Actions** 中打开 `.github/workflows/pages.yml` 对应的工作流，选择 **Run workflow**。
4. 等工作流成功后，使用部署结果提供的站点链接检查页面。

工作流通过 `workflow_dispatch` 手动触发，上传 `site/` 作为静态站点。后续更新也需要重新运行该工作流。若尚未启用 Pages，仓库 README 和各项目文档仍可正常阅读。

## 发布前核对

- `python scripts/catalog.py check` 通过。
- 封面可加载；演示的 `index.html`、样式和资源完整。
- 静态文件中没有凭据、私人数据或只适用于本机的绝对路径。
- 引入的上游代码、图片与字体保留必要的署名和许可说明。
