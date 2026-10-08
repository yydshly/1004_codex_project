# 009 · DSPy 理解整理与验证记录

[项目摘要](README.md) · [算法笔记](notes.md) · [评分机制](scoring.md) · [应用与扩展](applications.md)

## 本次整理依据

| 项目 | 记录 |
| --- | --- |
| 日期 | 2026-10-08，Asia/Shanghai |
| 本地环境 | Windows，PowerShell，Python 3.10.11 |
| 上游仓库 | `stanfordnlp/dspy` |
| 固定提交 | `a7e7edb8c6803d88aeb25c6a0412657c01835bc5` |
| 快照版本 | `pyproject.toml` 标注 3.4.0 |
| 第三方算法依赖 | 快照固定 `gepa[dspy]==0.1.4`；MIPROv2 使用 Optuna TPE |
| 许可 | 上游 LICENSE 为 MIT |
| 方法 | 对照官方文档、固定源码和讨论内容，整理概念、算法及评分接口 |

## 证据与判断的区分

任务调用链、导出的优化相关类、MIPROv2 的 TPE 选择、Evaluate 的聚合方式和 Prediction 的数值运算属于源码依据。仿真分工、指标设计与扩展计划属于本项目的工程建议，未做效果验证。

未安装或运行 DSPy，未调用语言模型，未进行提示优化、微调、强化学习或仿真求解。文中的 100 个案例、80 分和反馈文本均为解释机制的例子。

## 文件与目录检查

本次交付检查结果如下：

- `python scripts/catalog.py sync`：已同步 9 个项目，更新根索引和站点索引。
- `python scripts/catalog.py check`：通过；编号、链接、图片与生成内容一致。
- `python -B -m unittest discover -s scripts -p 'test_*.py' -v`：17 项测试全部通过。
- `node projects/003-cozy-nature-worlds/build-research.mjs --check`：10 份既有文档对应的网页一致，无过期文件。
- `git diff --check`：通过。
- 新项目文档的本地链接、行尾空白与五段目录摘要一致性：通过。
- 文档中的 32 个固定 GitHub 源文件链接：全部可访问；这只验证链接与源文件可读取，不等于完成运行测试。

初次整理新增五份文档并登记目录；后续补充静态网页、总览图与生成提示、网页构建器，更新目录摘要和封面，并增加 CI 中的网页一致性检查。工作区既有内容和 006 项目的占位文件未改动。浏览器检查输出单独放在 `output/009-dspy/`，不纳入提交。

目录校验只证明登记和生成内容一致，目录测试只检查研究库脚本行为；它们不能证明 DSPy 的效果或模型能力。

## 网页与总览图交付

| 内容 | 产物或结果 |
| --- | --- |
| 网页结构 | 11 节正文，另有定位摘要；涵盖理解修正、能力、机制、算法、评分、8 类场景、2 个例子、个人价值、扩展、验证路线与来源 |
| 算法卡片 | 从 notes.md 生成 14 个优化相关类；GRPO 单独作为实验路径说明 |
| 阅读交互 | 按优化对象筛选、详细机制展开、例子切换、章节导航、总览图放大与下载 |
| 网页源 | `web/index.html`、`web/styles.css`、`web/app.js` |
| 构建与静态产物 | `build-research.mjs` → `demo/`；目录工具同步到 `site/demos/009-dspy/` |
| 总览图 | `assets/dspy-overview.png`，1672 × 941 PNG；中文信息图，非 DSPy 运行截图 |
| 图像生成方式 | 内置 imagegen；完整生成提示保存于 `assets/image-prompt.txt`，原始输出保留在工具生成目录 |
| 本地预览 | `http://127.0.0.1:8749/demos/009-dspy/`；以后可按 README 的命令重新启动 |
| 发布方式 | 适用既有 GitHub Pages 子路径的静态文件；发布入口为 `https://yydshly.github.io/1004_codex_project/demos/009-dspy/`，实际发布验证单独记录 |

本次网页验证：

- `node projects/009-dspy/build-research.mjs --check`：14 张算法卡片、总览图与 5 个静态文件一致。
- `python scripts/catalog.py check`：9 个项目登记与生成内容一致。
- 目录测试 17 项通过，既有 003 网页检查通过，`git diff --check` 通过。
- Chromium 浏览器：1440、820、390、320 像素宽度下无全页横向溢出。
- 算法筛选：权重类别显示 BootstrapFinetune 和 BetterTogether；恢复全部显示 14 个类。
- 两个例子切换、左右键切换标签、机制展开、章节锚点、图片放大与 Escape 关闭均通过。
- 页面资源无 HTTP 错误、无 JavaScript 页面异常。禁用 JavaScript 后，算法内容与两个例子仍可阅读。
- 截图人工检查覆盖桌面、手机、算法与个人价值部分；浏览器结果保存在 `output/009-dspy/browser-results.json`。
- 静态检查：34 个 HTML ID 唯一，76 个链接与资源中的本地目标和锚点有效；原图、演示、站点演示和目录封面四份图片哈希一致，五段目录摘要一致。

网页只有阅读交互，不调用模型或外部执行工具。上述检查验证展示与交互，不构成模型质量或成本实验。

## 资料入口

- [固定源码快照](https://github.com/stanfordnlp/dspy/tree/a7e7edb8c6803d88aeb25c6a0412657c01835bc5)
- [版本与依赖](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/pyproject.toml)
- [MIT 许可](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/LICENSE)
- [官方文档](https://dspy.ai/current/)，内容会随 current 更新

各具体算法和指标的源码链接放在对应段落，便于按结论回查。
