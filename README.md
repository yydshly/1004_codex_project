# GitHub 项目研究集

这里汇总近期发现的优秀 GitHub 项目，记录它们解决的问题、核心设计、运行方式与实践结论。每个子项目都有独立的研究文档、截图和实验目录；本页负责摘要介绍、顺序索引和图片预览。

[研究指南](docs/research-guide.md) · [子项目目录](projects/README.md) · [Web 演示与部署](docs/deployment.md) · [本地站点入口](site/index.html)

## 项目索引

子项目使用至少三位的固定编号，按 `001`、`002`、`003` 的顺序展示。编号分配后保留，归档不会改变其他项目的顺序。索引由 [projects.json](projects.json) 统一维护。

<!-- PROJECT_INDEX:START -->

目前尚未录入研究项目。首个项目将从 **001** 开始，按编号升序展示。

<!-- PROJECT_INDEX:END -->

## 图片预览

每个子项目可提供真实截图作为封面，并配上简短说明；更多图片和研究内容放在该项目的 README 中。封面添加后会同步到这里和 Web 索引页。

<!-- PROJECT_GALLERY:START -->

录入子项目并添加真实截图后，这里会按编号展示项目摘要与图片。

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

仓库已准备手动发布工作流。启用方式和路径约定见 [部署说明](docs/deployment.md)。当前初始化阶段尚未收录研究项目或发布站点。

## 研究约定

- 记录研究时使用的上游版本或提交，便于重复验证。
- 将自己的观察和复现结论写入研究文档，引用上游资料时注明来源。
- 子项目实际截图保存在各自 `assets/` 目录，并使用相对路径引用。
- 上游源码、依赖、许可证和运行步骤由子项目分别管理；详细规则见 [研究指南](docs/research-guide.md)。
