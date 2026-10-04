# 子项目研究指南

本仓库用于集中研究多个 GitHub 项目。根 README 提供摘要、按编号排序的索引和项目图片；详细分析写在各子项目目录中。

## 新增一个研究项目

在仓库根目录执行（需要 Python 3.10 或更高版本）：

```powershell
python scripts/catalog.py add --slug example-project --name "项目名称" --repo "https://github.com/owner/repository" --summary "一句话说明研究对象和研究目的"
python scripts/catalog.py sync
python scripts/catalog.py check
```

`add` 从已登记项目的最大编号继续分配，首次为 `001`，并生成以下目录。`example-project` 是命令示例，请替换为实际项目的英文短名。

```text
projects/001-example-project/
├── README.md       # 项目摘要、结论、复现入口
├── notes.md        # 研究过程与证据
├── assets/         # 封面、截图、示意图
└── demo/           # 可直接发布的静态网页
```

编号一经登记就固定，永不回收；所有展示按 `number` 升序排列。暂时停止研究的项目应保留记录并更新状态，不要删除登记记录或给其他项目使用旧编号。目录名为至少三位补零的编号加短名，例如 `001-example-project`。

## 维护登记信息

`projects.json` 是索引的唯一登记源，顶层格式为 `{"version": 1, "projects": []}`。新增项目优先使用 `add`；调整摘要、状态、标签、图片或演示链接时编辑对应记录，再执行 `sync` 和 `check`。

| 字段 | 填写规则 |
| --- | --- |
| `number` | 固定的正整数编号，不重复、不重排 |
| `slug` | 用于目录名的英文短名，与已创建目录保持一致 |
| `name` | 项目展示名称 |
| `summary` | 简洁说明项目用途与研究重点 |
| `repository` | 上游 GitHub 仓库链接 |
| `status` | `待研究`、`研究中`、`已复现`、`已完成`、`已归档`，新增默认 `待研究` |
| `tags` | 主题标签数组，例如 `["可视化", "前端"]` |
| `cover` | 相对子项目目录的图片路径，例如 `assets/cover.png`；暂缺图片时填 `""` |
| `demo_url` | 已部署演示的外部链接；暂缺时填 `""` |

封面必须放在对应项目的 `assets/` 内。添加图片后，在项目 README 中说明图片展示的内容；在 `cover` 中登记封面即可同步到根 README 和网站项目卡片。

新增时可用 `--status "研究中"` 指定状态，并通过重复的 `--tag "标签"` 添加多个标签。

`sync` 更新根 README 的 `PROJECT_INDEX`、`PROJECT_GALLERY` 标记区，生成 `site/index.html`、`site/covers/` 和 `site/demos/`。不要手改这些生成内容；自制网页放在项目的 `demo/` 中，根 README 标记区之外的介绍可以直接编辑。`check` 检查登记信息、项目文件、排序和生成内容的一致性；失败时先修正报告的问题，再同步。

## 建议研究顺序

1. 记录上游仓库、所研究的版本或提交，以及原始许可。
2. 明确研究问题：解决什么问题、关键实现在哪里、准备验证什么。
3. 按上游说明复现，记录环境、命令、结果和遇到的问题。
4. 在 `notes.md` 留下代码位置、观察结果、截图和可追溯链接。
5. 将结论、适用场景、局限与复现入口整理到项目 README。
6. 有演示时按[部署指南](deployment.md)整理，再运行 `sync` 和 `check`。

优先记录研究材料与必要的改动说明；需要引入上游源码、依赖或素材时，保留原作者署名、版权声明和许可文件，并遵守其授权条件。本仓库的文档组织不改变上游项目的许可。
