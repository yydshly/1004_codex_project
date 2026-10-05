# Mini Shop · 小型商店分析样本

这是本研究编写的 **15 个真实源码文件（12 个 TypeScript 业务模块、3 个 TSX 页面/布局/组件）**，用于让固定提交的 CodeFlow 解析器及渲染器产生实际结果；不是用户仓库、原项目内置样本或预先画好的关系图。源码查看器只以文本显示内容，不执行源码。

[查看文件树与源码](index.html) · [返回 CodeFlow 展示](../index.html) · [文件清单](manifest.json)

六个目录为 `src/utils`、`src/server/services`、`src/server/routes`、`src/ui`、`src/app`、`src/components`。33 个导出函数名称唯一，跨文件使用均有显式 import；主要业务实现包含金额转分、折扣、库存检查/扣减、配送报价、结算、内存订单、HTML 字符转义与真实 React JSX 展示。核心业务仅使用 Node 标准库 `node:crypto`，无需安装第三方依赖即可在 Node 中执行；TSX 另导入 `react`，相关 UI 依赖在 package.json 中声明，本研究没有安装或运行 React/Next 应用。

主文件图的箭头是“提供函数 → 使用函数”，例如 `utils/money.ts → server/services/pricing.ts → server/services/checkout.ts → server/services/orders.ts → server/routes/orders.ts → ui/app.ts`。源码 import 的方向相反。商品、库存、配送及 JSX 组件形成分支；跨目录依赖为 `ui → server/routes → server/services → utils`、`app → components → server/services` 加越层单向引用，无目录循环，便于观察 Flow。文件大小、函数数量与重复引用数有差异。

`manifest.json` 的 `path` 是分析中的仓库相对路径；`url` 相对 manifest 地址定位实际文本文件。仅清单内 15 个 `.ts` / `.tsx` 文件参与分析，说明文档和查看器不混入源码统计。它没有真实 Git 提交或贡献者数据，不应用于评估 Git 活跃度或准确率。

可在 Node.js 22.15+ 的独立进程中检查业务例子（不运行 CodeFlow）：

```powershell
node --experimental-strip-types --input-type=module -e "import('./sample-project/src/ui/app.ts').then(({ runMiniShopDemo }) => console.log(JSON.stringify(runMiniShopDemo().order, null, 2)))"
```

业务例子通过 10 项断言：总价 13500 分、折扣 500、配送 800、到货 2 天、订单确认、茶叶库存 18、杯子库存 7、收据、数量 0 错误和库存不足错误。全部 34 条相对 import 存在、目录依赖无环；3 个 TSX 用已有 vendor Babel 7.23.5 的 TypeScript/React presets 完成语法转换，未执行 UI。[样本验证](sample-validation.json) 记录检查范围与结果。

原生 CodeFlow 分析此输入报告 15 文件、33 函数、42 条静态连接；架构视图有 6 块、10 依赖、1 路由。Next.js 标记由页面/布局文件形态启发式识别，并不是部署证明。原生视图具体 QA 见总项目 [验证记录](../../verification.json)。Code 视图保留固定版本的已知着色标签残留问题；[源码查看器](index.html) 使用 textContent 显示未着色原文。

业务例子使用内存状态，进程结束即消失；每次下单会减少该进程中的库存。它没有 HTTP 服务、数据库、真实支付或生产部署。样本源码由本研究原创，按 MIT 许可提供；上游 CodeFlow 与 vendor 保留各自版权及许可。
