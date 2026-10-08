# 009 · DSPy 算法与源码笔记

[项目摘要](README.md) · [评分机制](scoring.md) · [应用与扩展](applications.md)

所有 DSPy 源码链接固定到 `a7e7edb8c6803d88aeb25c6a0412657c01835bc5`。本文区分任务执行、指标计算、配置搜索和实际训练，避免用“自训练”把几个不同过程混在一起。

## 优化对象和数据对象

| 对象 | 含义 | 不能混同的对象 |
| --- | --- | --- |
| 输入案例 | 一条工单、一个问题或一段日志 | 优化器生成的指令 |
| 标注或参考答案 | 评价预测时使用的目标输出 | 模型对自己结果的信心 |
| demo | 放进模型上下文的输入输出示例 | 模型权重中的训练记忆 |
| prediction | 某次执行产生的输出 | 一套可复用的程序配置 |
| trace | 模块调用的输入、输出及归属信息 | 所有模型内部计算或隐藏状态 |
| candidate program | 使用某组指令、示例或模型引用的程序 | 单个“优秀答案” |
| trainset、valset、testset | 支持候选构建、选择和独立验收的数据分工 | 可以反复用于调参的同一测试集 |

普通提示优化主要改变 `predictor.signature.instructions` 和 `predictor.demos`。训练路径还可能替换 `predictor.lm`。Signature 以 Pydantic 定义字段，`with_instructions()` 创建带新说明的 Signature。[Signature 源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/signatures/signature.py)。

## 一次模型调用与一次优化的实现机制

在普通调用路径中，Python 的 `forward()` 组织模块，`Predict` 取得 Signature、demos 和输入，Adapter 将它们组成请求，LM 客户端调用外部模型，再由 Adapter 解析输出。启用轨迹记录时，Predict 把 `(predictor, inputs, prediction)` 加入轨迹，供后续优化器分析或构造示例。[Predict 源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/predict/predict.py#L248) · [Adapter 源码目录](https://github.com/stanfordnlp/dspy/tree/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/adapters)。

优化发生在这条执行链的外部。优化器构造不同配置，重复执行任务，读取 metric，再决定保留和如何修改；不同算法的候选提案、抽样和选择方法不同。`Teleprompter` 是共同接口，具体算法在子类里。[共同接口](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/teleprompt.py)。

这类提示搜索通常不需要获得模型梯度，也没有对 API 模型做反向传播。它优化的是模型周围的程序参数。实际权重学习需要另一条训练链路。

## 优化相关类与算法的完整映射

快照的 [teleprompt 导出列表](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/__init__.py)包含下表 14 个优化相关类，另导出 `bootstrap_trace_data` 函数。`BootstrapRS` 是 RandomSearch 的别名，不另算一种算法。

| 类 | 主要算法或机制 | 改变的对象与使用阶段 | 固定快照源码 |
| --- | --- | --- | --- |
| LabeledFewShot | 从标注案例选取或抽样 k 个示例；没有评分搜索 | 编译时设置 demos | [vanilla.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/vanilla.py) |
| BootstrapFewShot | 教师执行训练案例，metric 筛选成功轨迹，转换为示例 | 编译时构造模块 demos | [bootstrap.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/bootstrap.py) |
| BootstrapFewShotWithRandomSearch | 基线加多组随机顺序与示例数量，逐组 Bootstrap 后评价择优 | 编译时搜索 demos；别名 BootstrapRS | [random_search.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/random_search.py) |
| BootstrapFewShotWithOptuna | 先构造示例池，再以 Optuna 搜索各模块的示例索引 | 此快照每个模块选择一个 demo | [teleprompt_optuna.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/teleprompt_optuna.py) |
| MIPROv2 | 模型提出指令候选，TPE 搜索指令与示例集合的组合 | 编译时同时优化 instructions 与 demos | [mipro_optimizer_v2.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/mipro_optimizer_v2.py) |
| COPRO | 逐模块候选搜索，利用历史文本与分数继续提出候选，近似坐标上升 | 指令与最后一个输出字段的前缀 | [copro_optimizer.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/copro_optimizer.py) |
| SIMBA | 随机小批次、多次轨迹、候选抽样；添示例或归纳规则，再评分 | instructions 与 demos；不做数值梯度更新 | [simba.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/simba.py) |
| GEPA | 反思反馈驱动的候选演化，保留不同案例上表现好的候选并可选合并 | 默认指令；实验性 Flex 路径可优化模块源码 | [gepa.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/gepa/gepa.py) |
| KNNFewShot | 输入向量检索邻近训练案例，再局部 Bootstrap | 推理时动态准备 demos | [knn_fewshot.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/knn_fewshot.py) |
| InferRules | Bootstrap 后让模型从示例中归纳自然语言规则，评价多个候选 | 在 instructions 中追加规则；不是形式逻辑求解器 | [infer_rules.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/infer_rules.py) |
| AvatarOptimizer | 区分高低分工具轨迹，比较差异，用反馈改写指令并迭代 | 工具调用程序的指令 | [avatar_optimizer.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/avatar_optimizer.py) |
| BootstrapFinetune | 收集轨迹作为监督微调数据，调用训练后端 | 模型权重学习；程序保存新 LM 引用 | [bootstrap_finetune.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/bootstrap_finetune.py) |
| BetterTogether | 按策略顺序组合提示优化与权重训练，评价各阶段 | 默认 `p -> w -> p`；属于优化流程编排 | [bettertogether.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/bettertogether.py) |
| Ensemble | 包装多个程序，推理时全部或抽样运行，以 reduce_fn 合并 | 推理时集成；未指定 reduce_fn 则返回输出集合 | [ensemble.py](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/ensemble.py) |

KNN 的底层当前使用向量点积 `np.dot` 和排序。只有向量已经归一化等条件满足时，才能把它解释为余弦相似度。[KNN 检索源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/predict/knn.py#L51)。Ensemble 的默认行为也不能直接说成“自动多数投票”，多数投票是可以提供的合并函数。

## Bootstrap 为什么能够生成可用示例

教师可以是另一个模型，也可以是学生程序的副本。它在训练案例上完成一次任务，metric 判定最终结果是否通过。通过后，算法把轨迹中的模块输入输出转换为 `dspy.Example(augmented=True, ...)`，再分配给对应学生模块作为提示示例；还可以补入已有标注示例。[轨迹筛选与构造](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/bootstrap.py#L200)。

所以这里的“训练”通常是把示例放入上下文。最终答案正确只能提供一种较弱的监督信号，不能保证轨迹里每个中间步骤都正确，更不能证明它们是最优解。

## MIPROv2 的搜索具体发生在哪里

源码的三个主要步骤是 `_bootstrap_fewshot_examples()`、`_propose_instructions()`、`_optimize_prompt_parameters()`：先建立示例候选，再结合程序、数据摘要和示例提出指令，最后搜索组合。[MIPROv2 主流程](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/mipro_optimizer_v2.py#L231)。

搜索时显式创建 `optuna.samplers.TPESampler(seed=seed, multivariate=True)`，最大化 metric；每个模块的指令索引与示例集合索引通过 `trial.suggest_categorical()` 选择。小批次评价控制预算，周期性完整验证比较候选。[搜索器](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/mipro_optimizer_v2.py#L658) · [离散选择](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/mipro_optimizer_v2.py#L766)。

TPE 根据历史结果分别估计较好与较差配置的密度，倾向于选择更可能属于好结果区域的配置。这里搜索的是离散候选组合，不能把它描述成对提示词做梯度下降，也不能说固定使用高斯过程。[Optuna TPE 官方说明](https://optuna.readthedocs.io/en/stable/reference/samplers/generated/optuna.samplers.TPESampler.html)。

## SIMBA 的随机小批次机制

SIMBA 从候选池抽样，在一批案例上运行多条轨迹，优先处理最高分和最低分差距较大的案例桶。它随机选择策略：加入较好轨迹作为示例，或比较好坏轨迹，让语言模型生成针对模块的规则，并追加到指令。候选经同批案例评价后进入候选池。[批次与候选逻辑](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/simba.py#L213) · [修改策略](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/simba_utils.py)。

源码最终比较初始程序和各轮胜出程序时使用完整 trainset。因此它的最终训练集分数还需要独立测试集检验。名称和小批次方式带有随机梯度优化的类比，但实现没有沿着语言模型的数值梯度更新提示。[最终评价](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/simba.py#L347)。

## GEPA 的反思演化机制

DSPy 将程序的可优化模块指令映射成候选组件，通过 Adapter 重建程序、执行并提供轨迹与反馈；候选演化主要委托外部 `gepa` 引擎。当前依赖固定为 `gepa[dspy]==0.1.4`。[DSPy GEPA 适配](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/gepa/gepa_utils.py) · [依赖版本](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/pyproject.toml)。

默认过程可归纳为以下几步：

1. 评价初始候选，记录不同验证案例上哪些候选表现最好。
2. 从保留的候选中选择父程序和待修改模块，在训练小批次上运行。
3. 反思模型看到输入、输出与反馈，提出新指令。
4. 在同一小批次比较新旧候选；默认接受规则要求子候选总分严格更高，再进行更完整验证。
5. 将通过的候选加入池，继续搜索；结束时取聚合验证分最高的候选。

它会保留在不同案例上有优势的候选，而不只是每轮修改当前总分最高者。可选 merge 从不同候选分支继承组件改动，不是把两段提示简单拼接或平均模型权重。[GEPA 引擎](https://github.com/gepa-ai/gepa/blob/v0.1.4/src/gepa/core/engine.py) · [接受规则](https://github.com/gepa-ai/gepa/blob/v0.1.4/src/gepa/strategies/acceptance.py) · [合并机制](https://github.com/gepa-ai/gepa/blob/v0.1.4/src/gepa/proposer/merge.py)。

数值分数用于比较，文字反馈帮助生成更有针对性的修改。GEPA 支持只返回数值分数，此时生成简单分数反馈；有细节的自然语言反馈通常能提供更多改进信息。接口和反馈归因见[评分文档](scoring.md)。当前源码仍带实验性标记，应固定版本。

## 真正的权重训练在哪里

BootstrapFinetune 收集轨迹，使用 Adapter 形成训练消息，再调用 `lm.finetune()`；完成后替换学生模块的模型引用。`multitask` 控制是否跨模块共用训练任务，`exclude_demos` 影响是否保留示例。实际损失函数、优化器、梯度更新和服务能力由训练后端决定，不能说 DSPy 一律内置 AdamW 或某一种网络训练法。[微调调用与数据准备](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/bootstrap_finetune.py#L155)。

快照另有实验性 [GRPO 实现](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/grpo.py)。它收集多次 rollout，按模块调用组织轨迹和奖励，通过 `job.step(..., train_data_format=GRPO_CHAT)` 交给 provider 的强化学习任务。完整优势计算、损失与梯度更新并非都实现在这个文件里。GRPO 不在上述通用导出列表内，不能据此假设任意安装版本都可直接 `dspy.GRPO` 或支持任意仿真动作空间。

## 仍需验证的事项

- 提示优化对我们具体任务的提升幅度，以及验证集之外的泛化表现。
- 评判模型与人工核验的一致性，以及指标是否被候选利用。
- API 调用、提示长度、并发、缓存和优化预算的总成本。
- 微调与实验性 RL 在指定 provider、模型和当前版本下的实际可用性。
- Flex 的代码优化对具体模块的作用范围；它不意味着自动优化任意外部仿真器。

本次没有进行模型实验，不把算法论文或官方案例中的改善当作本项目已取得的结果。

## 参考资料

- [研究来源](https://github.com/stanfordnlp/dspy)
- 具体源码链接已放在对应算法与机制段落；[固定快照目录](https://github.com/stanfordnlp/dspy/tree/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt)可用于继续阅读。
