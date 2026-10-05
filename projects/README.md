# 子项目目录

每个研究项目使用 `NNN-slug` 形式的独立目录，例如 `001-your-project`。至少三位的编号代表收录顺序，分配后保持稳定；英文 slug 用于目录和 Web 演示路径。

在仓库根目录运行以下命令新增项目；已收录项目请查看[总索引](../README.md#项目索引)：

```sh
python scripts/catalog.py add --slug your-project --name "项目名称" --repo "https://github.com/owner/repo" --summary "研究摘要"
```

研究没有公开源码的产品时，将 `--repo` 换成 `--source "https://example.com/product"`，登记真实的产品或作者来源。两种来源参数只能选择一种。

每个子项目的文档从 [项目模板](../templates/project/README.md) 生成，通常包含以下内容：

| 路径 | 内容 |
| --- | --- |
| `README.md` | 研究摘要、上游来源、运行步骤、截图和结论 |
| `notes.md` | 研究过程和实验记录 |
| `assets/` | 项目封面、截图和文档图片 |
| `demo/` | 可选的静态 Web 演示，准备好后加入 |

项目清单保存在 [projects.json](../projects.json)。状态可使用：`待研究`、`研究中`、`已复现`、`已完成`、`已归档`。

新增或更新项目后执行 `python scripts/catalog.py sync` 和 `python scripts/catalog.py check`，让根 README、站点及演示目录与清单保持一致。

参阅 [研究指南](../docs/research-guide.md) 和 [Web 部署说明](../docs/deployment.md)。
