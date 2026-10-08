# 009 · DSPy 评分来源与计算机制

[项目摘要](README.md) · [算法笔记](notes.md) · [应用与扩展](applications.md)

**分数来自 metric，不是优化器自行判定的真理。** metric 可以是普通 Python 函数，也可以调用检验工具或评判模型。优化器负责利用评价信号搜索，评价标准是否可靠需要开发者验证。

## 一条案例如何变成一个分数

普通 `Evaluate` 路径先执行 `program(**example.inputs())`，再调用 `metric(example, prediction)`。案例分数求平均后乘 100，作为汇总得分；逐例结果也保留在 EvaluationResult 中。[评估源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/evaluate/evaluate.py#L174)。

例如分类任务可以这样定义指标：

```python
def metric(example, prediction, trace=None):
    return float(example.label == prediction.label)
```

它只检查标签是否等于参考标签。若 100 个案例中有 80 个正确，平均分为 0.8，汇总为 80。**这是算术示例，未运行 DSPy 或模型。** 对连续分数，汇总值也不应直接称为“准确率”；如果自定义奖励不在 0 到 1 之间，乘 100 后更不能当成百分比。

同一指标在不同优化器中可能接收 trace 或模块信息。例如 Bootstrap 可用阈值将连续质量分转换为是否保留轨迹的决定，GEPA 还接受反馈。函数签名应与所用优化器对应。

## 常见评分方法实际测量什么

| 方法 | 评分来源 | 测量的属性 | 局限 |
| --- | --- | --- | --- |
| 标签或字段精确比较 | 标注答案与规则 | 输出是否满足指定目标 | 标注可能有错，规则不覆盖所有语义 |
| Exact Match | 规范化字符串与参考答案 | 文本是否匹配 | 等价表达可能被判不同 |
| token F1 | 预测与参考的词项重叠 | 文本覆盖和重叠程度 | 不理解真实因果与事实；分词影响结果 |
| SemanticF1 | 评判模型对预测与参考的比较 | 语义上的精确率和召回率 | 依赖参考答案，也依赖评判模型的判断 |
| CompleteAndGrounded | 评判模型比较参考答案与检索材料 | 完整度和材料支持度 | 材料有错时，支持度高也可能不真实 |
| 自定义执行检验 | 测试、解析器、约束或工具 | 程序是否满足可检查条件 | 检验覆盖不足会遗漏错误 |
| 业务或环境结果 | 实际反馈与实验结果 | 指定业务目标是否达成 | 可能延迟、有噪声，且受外部条件影响 |

最后两项是可以接入的指标设计方式，不表示 DSPy 自带每个领域的验收器或仿真环境。

## Exact Match 与 token F1

内置文本比较会先规范化，包括 Unicode NFD、大小写、标点、英文冠词与空白等处理；Exact Match 随后比较是否相同。token F1 对规范化字符串按空白切分，以 Counter 交集计算重叠次数。[文本指标实现](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/evaluate/metrics.py#L87)。

设重叠词项数为 O，预测词项数为 P，参考词项数为 R，则：

```text
precision = O / P
recall    = O / R
F1        = 2 × precision × recall / (precision + recall)
```

零重叠等边界由实现处理。这个 F1 是词项重叠计算，没有调用模型理解意思。当前实现没有内置中文语义分词，因此不能把默认空白分词当成可靠的中文任务指标。[F1 实现](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/evaluate/metrics.py#L144)。

## SemanticF1 与 CompleteAndGrounded

SemanticF1 把问题、参考回答和系统回答交给 ChainOfThought 评判模块，让模型估计语义 precision 和 recall，限制在 0 到 1，再算 F1。`decompositional=True` 先让评判模块枚举关键观点、分析重叠，然后报告覆盖程度。这与上述 token F1 的计算来源不同。[SemanticF1 源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/evaluate/auto_evaluation.py#L42)。

CompleteAndGrounded 分别让模型评价对参考答案的完整度 C、对检索上下文的支持度 G，然后使用 `2 × C × G / (C + G)` 组合。它衡量给定材料的支持情况，不负责在材料之外独立验证现实事实。[组合指标源码](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/evaluate/auto_evaluation.py#L102)。

本次快照中，这两个模块返回 `Prediction(score=...)`；提供 trace 时可能将 score 转成阈值判定。虽然 Evaluate 没有在求和处显式提取 `.score`，但 `Prediction` 实现了 `__float__`、加法和反向加法，因此不能仅凭 Evaluate 一层代码就断言它不支持带 score 的 Prediction。[Prediction 的数值运算](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/primitives/prediction.py#L53)。实际项目仍应对照安装版本验证接口。

## GEPA 为什么还需要文字反馈

GEPA 的 metric 必须能接收五个位置参数：`gold, pred, trace, pred_name, pred_trace`。可以返回数值，也可以返回 `dspy.Prediction(score=..., feedback=...)`；Flex 的特定路径还可使用 `program_trace`。[GEPA 指标约定与校验](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/gepa/gepa.py#L33)。

以日志摘要为例，数值可能是 0.6；文字反馈则指出“报告引用了日志不存在的时间戳，同时遗漏了已记录的一次断连”。分数让优化器比较候选，反馈给反思模型提供修改方向。这是说明反馈用途的例子，不是实测结果。

没有文字反馈时，GEPA 可以生成简单的分数反馈。自然语言反馈不是所有优化器的共同必需项。若任务只提供最终正确与否，把失败全部归因于某个模块也可能有误；模块级反馈需要对应证据。[DSPy GEPA Adapter](https://github.com/stanfordnlp/dspy/blob/a7e7edb8c6803d88aeb25c6a0412657c01835bc5/dspy/teleprompt/gepa/gepa_utils.py)。

## 没有标准答案时怎么办

可以使用格式可解析性、证据引用可核对性、工具执行结果或人工标注的少量验收案例；也可以让评判模型按明确标准评价。需要先决定要测量的属性，再写 metric，而不是先拿到一个分数，再解释它代表质量。

例如日志报告的候选指标可以组合“结构正确、关键事件覆盖、结论有证据”。权重必须按实际用途制定，各部分先统一量纲。对于“引用不存在”等不可接受的错误，可以直接判失败，而不允许其他高分补偿。该方案是本项目的设计建议，不是内置 DSPy 指标。

## 怎样避免高分却没有改善

- 按独立案例来源划分训练、验证和测试；仿真日志宜按整次运行或场景划分，避免相邻片段泄漏。
- 保留固定基线和独立测试集，优化结束后再验收。
- 对评判模型分数抽样人工复核，特别检查错误事实、遗漏和伪造引用。
- 记录分项指标、失败案例、模型版本、提示配置、随机性和成本。
- 将“更符合该 metric”与“更符合实际使用目标”分别判断。

这些是后续实验的验收原则；本项目尚无已测得的质量提升。
