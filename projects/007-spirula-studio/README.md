# 007 · Spirula Studio · 实拍三维重建与高斯原理

![Spirula Studio：输入输出、高斯原理、重建流程、GPU 实现、应用与同类工具](assets/spirula-studio-overview.png)

**完整摘要：**Spirula Studio 把同一静态物体或场景的多角度照片、绕拍视频，重建成可自由切换视角的三维高斯场景，并能提取带纹理网格、渲染图片与漫游视频。独立 C++ 桌面程序与 CLI 整合抽帧、AI 掩膜、SfM 相机求解、曝光校正、3DGS 训练、清理编辑和导出。核心是先恢复“照片从哪里拍”，再反复渲染、比较照片、通过梯度调整当前场景的高斯参数；高斯是带位置、大小、方向、透明度与颜色的软椭球，数量与分布会随细节需求变化。量化训练、融合 GPU 核函数和显存复用帮助扩大训练规模；Vulkan/CUDA 提供 GPU 计算，Vulkan覆盖 NVIDIA、AMD、Intel、Apple。网格提取从高斯建立空间占据场，经 Delaunay 四面体化、marching tetrahedra 与表面清理生成三角面，再上色或烘焙纹理。直接价值是把实拍素材变成能保存、展示、编辑与复用的三维资产，适合商品、文物、空间导览、内容制作和重建研究。扩展成完整产品还要加入采集引导、质量检查、交互与资产管理；逼真外观不自动证明尺寸准确、表面完整或达到 CAD/制造标准。**资料与源码研究完成，原版运行待验证。**

[返回总索引](../../README.md) · [详细研究与来源](notes.md) · [图文导览](demo/index.html) · [本次交付验证](verification.md) · [上游仓库](https://github.com/harry7557558/spirula-studio)

本图以原生 HTML 和矢量示意编排，浏览器导出高清 PNG，文字与结构源可编辑。它是资料与源码研究图，非 Spirula 运行截图或重建质量证明。此前鞋子视频实测属于 **Splat.js**，见[历史实验](https://yydshly.github.io/0908_codex_project/demos/008-splat-js/video-test.html#result)；本次没有在 Spirula 中复训，也没有测得其耗时、显存峰值或几何误差。

| 项目 | 信息 |
| --- | --- |
| 固定编号 / 目录 | 007 / 007-spirula-studio |
| 研究日期 | 2026-10-05，Asia/Shanghai |
| 上游快照 | [7801c3ca78ccddc6a448e540be94d6141fab90eb](https://github.com/harry7557558/spirula-studio/tree/7801c3ca78ccddc6a448e540be94d6141fab90eb)，2026-10-05 查询 |
| 上游代码许可 | [GPL-3.0](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/LICENSE)；模型权重、第三方依赖和拍摄素材分别适用其许可 |
| 本次产物 | 中文研究、原生 HTML/矢量信息图与高清 PNG、构图需求记录、静态图文导览 |
| 原版验证状态 | 资料与源码研究完成，原版运行待验证；未进行训练、mesh 提取或性能测试 |

## 输入、输出与直接价值

| 环节 | 用户提供或得到什么 | 为什么有用 |
| --- | --- | --- |
| 原始输入 | 同一静态物体/空间的多角度照片、清晰绕拍视频；支持鱼眼与 360° 相机流程 | 使用真实采集外观，保留具体对象与环境的细节 |
| 已有重建输入 | COLMAP、Nerfstudio、Metashape 格式的照片、相机及可选点云；可引入掩膜、深度、法线 | 复用已有重建数据，减少重复前处理；点云是典型初始化来源，也可采用其他初始化 |
| 三维高斯场景 | 可交互的新视角外观、3DGS PLY 与训练保存数据 | 商品细节展示、空间浏览、数字留档与后续高斯编辑 |
| 三角网格 | PLY、OBJ、glTF、GLB、STL；按格式选择无色、顶点色或纹理 | 接入支持网格的内容制作、游戏或可视化流程；颜色/纹理支持随格式而异 |
| 内容输出 | 图片、相机路径与视频；查看 RGB、深度、法线等通道 | 制作镜头，检查表面问题，比较高斯与提取网格 |

3DGS PLY、普通点云 PLY 和三角网格 PLY 的字段结构不同，扩展名相同不代表能互相直接导入。标准流程需要多个有效视角。只有一张图时，背面与内部缺少实拍约束；单图生成式三维属于另一条路线。遮挡、薄结构、反光、透明物、低纹理和运动也会影响实拍重建。[数据格式](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/datasets.md)、[网格导出](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/MeshExport.h)

## 每一步在解决什么

1. **准备观察。** 视频解码/抽帧选出清晰且视角有变化的图像；掩膜限定物体或排除不希望重建的区域。SAM、LoMa、深度/法线模型属于可选辅助，相关权重需要另行获取。
2. **SfM 求相机与稀疏空间。** 检测/匹配共同特征，通过三角化与 bundle adjustment 求相机姿态、内参和空间点，告诉训练器每张照片对应的观察位置。这不是简单拼图。
3. **初始化高斯。** 高斯带中心、尺度、旋转、透明度和颜色，典型情况下从稀疏点开始；有相机姿态但没有点云时也可随机初始化。SH 球谐函数使颜色可随观察方向变化。
4. **可微优化。** 高斯投到相机、按深度排序并透明度混合，形成训练图；与实拍图计算 L1/SSIM 等误差，再反向传播求梯度，用优化器更新参数。训练的是当前场景，通用 AI 模型与逐场景优化应分开理解。
5. **控制细节与几何。** 依据误差贡献重新定位无效高斯、沿长轴拆分需要更多细节的高斯，并加入受尺度/透明度约束的扰动。数量受预算控制；正则项及可选深度/法线监督帮助减少不稳定表面。
6. **编辑和交付。** 查看结果、选择清理、撤销、整体放置/对齐、手工掩膜，再保存高斯、提取网格或输出相机镜头。本地 GUI Batch 已能串联数据集创建、训练和 meshing。[架构](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/architecture.md)、[训练参数](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/config/TrainConfig.h)

**高斯为什么能表达形状？**“软椭球”是数学权重/密度函数的椭球形影响范围：离中心越远，影响越弱。颜色和透明度是另外存储的渲染参数；它不是实体烟雾，也不是一个会生成内容的神经模型。大量高斯共同拟合照片里的轮廓、遮挡和颜色，投影叠加形成画面。它们没有天然连接成连续网格，也不自动拥有碰撞体、骨骼或工程尺寸。

**梯度做什么？**梯度告诉优化器：位置、透明度、颜色或尺度微调，会怎样改变照片误差。重复“渲染 → 比较 → 求梯度 → 更新”，场景逐渐贴近观测；观测不充分的区域仍可能错误。bilateral grid 与 PPISP 校正逐图像曝光/白平衡，帮助减少拍摄差异对拟合的干扰。[训练调度](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/app/TrainerCore.cpp)

## 高斯如何变成网格

先建立**空间占据场**，给三维位置一个“在实体里还是在可见空域”的数值。静态项合成附近高斯的局部密度；有相机时，渲染/透射率信息帮助区分表面前方空域与后方内部，再与静态项合成以保护表面。

每个保留高斯采样中心与三条主轴正负方向，共 7 点；Delaunay 将点连接成四面体。以默认占据阈值 0.5，用 marching tetrahedra 提取穿过四面体边的表面，并二分细化交点。随后合并短边、清理碎片/退化面、处理局部洞和可见性，给顶点上色或展开 UV 烘焙纹理。**网格来自估计场的等值面，主路径不是 TSDF 融合。**[管线](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/Meshing.h)、[占据场](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/Meshing.cu)

导出 STL 或完成流形检查，不足以证明可直接制造。尺寸、壁厚、孔洞、表面完整性、材料和加工约束仍需专项检验；实拍颜色烘焙也不自动等于可正确重新打光的完整 PBR 材质。

## GPU、显存、硬件与大场景

| 实现 | 已确认机制或官方披露 | 用户意义与边界 |
| --- | --- | --- |
| C++ 桌面与 CLI | 统一 TrainerCore / Engine；核心无需 Python/PyTorch 或单独安装 COLMAP | 环境更集中；可选 AI 权重、驱动和某些视频解码路径仍要准备 |
| Vulkan / CUDA | 共享 Slang 数学；Vulkan编译到 SPIR-V，CUDA使用对应实现；训练/meshing覆盖相同能力 | Vulkan官方推荐，四厂 GPU、Windows/Linux/macOS；CUDA为 NVIDIA、Windows/Linux路径，速度取决于设备与驱动 |
| 量化训练 | 压缩 SH 参数和 Adam 状态，SH 梯度保持 fp32；读取解码、更新后重新编码 | 减少训练显存，不只是缩小输出文件；精度和容量要按数据验证 |
| 融合与布局 | 融合 projection-backward/optimizer，压紧可见投影、改善合并访存、复用阶段 scratch | 降低中间存储与内存访问，收益随场景变化 |
| 分区与场景功能 | 分块训练再合并；支持 360°/鱼眼、天空背景、线性色彩、尺度/方向元数据 | 处理更大、更复杂数据；覆盖、接缝、公制尺度仍需核验 |

作者宣称 **8 GB 显存可训练 1000 万个 SH3 高斯**；本次未复现。它不代表所有 8 GB GPU、任意分辨率与数据量都能达到相同容量，也不表示网格阶段没有其他内存瓶颈。[后端](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/backends.md)、[量化布局](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/sh-quant-layout.md)、[场景分区](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/scene-partition.md)

## 同类工具在哪个环节工作

以下按职责比较，不是相同数据、硬件与指标的性能排名。当前资料已核对；历史实测和本次原版状态分别标注。

| 工具 | 输入与核心方法 | 产物 / 分工 | 与 Spirula 的关系 |
| --- | --- | --- | --- |
| [Spirula Studio](https://github.com/harry7557558/spirula-studio) | 多视图实拍 → SfM → 逐场景可微高斯优化 | 高斯、提取网格、编辑和渲染 | 实拍重建前后环节集成到桌面/CLI |
| [Splat.js](https://github.com/arrival-space/splat.js) | 照片/视频；浏览器 SfM 与 WebGPU 高斯训练 | 交互高斯、PLY/SOG | 同属实拍 3DGS；鞋子历史实测在此完成 |
| [QuerySplat](https://github.com/inspatio/querysplat) | 预训练 VGGT-Omega 与几何/外观 query 多视图预测高斯，可选 TTO | 网络预测的高斯场景 | 预训练前馈预测与逐场景训练的主要路径不同 |
| [LichtFeld Studio](https://github.com/MrNeRF/LichtFeld-Studio) | COLMAP数据，原生 CUDA/NVIDIA 训练与编辑；Python/MCP接入 | 高斯与可自动化编辑流程 | 训练/编辑有重叠，硬件覆盖和集成不同 |
| [SuperSplat](https://github.com/playcanvas/supersplat) | 导入已生成高斯，选择、清理、压缩与发布 | 高斯内容、网页展示 | 主要承接高斯生成后的编辑/发布 |
| [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) | 预训练模型根据单张图与学习先验生成 | 带 PBR 材质的网格/GLB | 隐藏结构来自推断，与实拍观测重建不同 |
| [Forge3D](https://github.com/milos-agathon/forge3d) | Rust/wgpu + Python；准备好的DEM、COPC LiDAR、3DGS PLY | 地理/三维融合渲染，互相遮挡与阴影 | 渲染层，可消费现成高斯；不是照片重建或高斯训练器 |

[逐项官方来源与固定版本](notes.md#6-同类工具与历史记录的边界)。Forge3D 的融合路径要求数据对齐；现成高斯里可能残留原拍摄光照，不能据“融合阴影”推断所有高斯已成为标准可重打光材质。

## 应用与值得扩展的产品

| 场景 | 现有能力的价值 | 成为完整产品还要补什么 |
| --- | --- | --- |
| 商品、艺术品、文物展示 | 实拍外观、自由视角、细节近看、可保存资产 | 拍摄引导、细节热点、移动端加载、来源与版本记录 |
| 房间、展厅、房源、街区 | 空间重建、360°、分区与漫游 | 路线/讲解/地图、尺度核验、跨房间拼接、覆盖质量检测 |
| 内容制作和数字留档 | 模型比较、图片/视频镜头、mesh接入其他工具 | 资产库、验收门槛、纹理/颜色管理和发布流程 |
| 三维重建研究 | 参数、损失、深度法线、量化、双GPU后端、网格提取 | 同设备同数据横评、独立视角与几何误差基准 |
| 完整业务工作流 | 原库已有本地 Batch：数据集 → 多次训练 → mesh | 扩展的是采集管理、跨机器/云调度、资产版本/验收和业务编排 |

图中“采集管理、跨机调度与资产版本”的扩展卡指更完整工作流；**原库已经有本地批处理队列**。语义检索、动态人体、自动骨骼、换装、碰撞、测量和制造精度则需要额外算法、数据与验证，上表不把它们认作现成功能。

## 新手怎样开始

1. 从[官方 Releases](https://github.com/harry7557558/spirula-studio/releases)选择对应系统的程序，确认 GPU/驱动；官方优先推荐 Vulkan。CLI先运行 spirula --help，以实际下载版本的参数为准。
2. 先选静止、纹理清晰、反光少的小物体/场景。相邻视角充分重叠，改变高度补顶部和侧面，尽量保持形状、光照、焦距稳定，避免模糊和运动。未拍到的鞋底/背面不会凭空获得可靠观测。
3. 将照片目录、视频或已有重建数据拖入 GUI，先检查抽帧、相机与稀疏结构，必要时补掩膜；先用适中分辨率和高斯预算完成小样，保存配置与素材来源。
4. 分别验收外观与几何：看独立视角、漂浮点、重复轮廓、背面与遮挡；需要mesh再检查洞、薄面、法线、颜色和兼容。需要实际尺寸时用可靠尺度来源并做外部核验。
5. 保存高斯、检查点与导出结果后再加工。此静态导览解释流程，不提供在线上传训练/GPU服务。[GUI/CLI](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/app/README.md)

## 图片、来源与下一轮验证

[高清汇总图 PNG](assets/spirula-studio-overview.png) · [可编辑 HTML / 内嵌 SVG 源](assets/spirula-studio-overview.html) · [构图需求记录：原 imagegen 提示词](assets/spirula-studio-overview-prompt.txt) · [详细研究与证据](notes.md)。原图像生成服务连续两次网络失败，未得到可交付图像；保留提示词用于记录构图需求，最终汇总图由原生 HTML/矢量示意和浏览器导出完成。

下一轮应在 Spirula 里用有来源记录的同一组照片/视频完成数据集、训练、mesh和渲染，记录版本/硬件/驱动、配置、注册视角、阶段耗时、显存峰值、独立视角误差、网格问题与复载结果。历史 Splat.js 鞋子实验可作对照素材，不能替代这些测量。
